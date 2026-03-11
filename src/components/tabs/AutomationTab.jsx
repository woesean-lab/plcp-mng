import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"

const MAX_RUN_LOG_ENTRIES = 300
const CMD_VISIBLE_ROWS = 15
const DEFAULT_TOAST_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#e2e8f0",
  border: "1px solid rgba(148, 163, 184, 0.2)",
}

const splitEnginePackets = (payload) => {
  if (!payload) return []
  return payload.includes("\u001e") ? payload.split("\u001e").filter(Boolean) : [payload]
}

const parseSocketIoEventPacket = (packet) => {
  if (!packet.startsWith("42")) return null
  let dataPart = packet.slice(2)
  if (dataPart.startsWith("/")) {
    const namespaceSeparator = dataPart.indexOf(",")
    if (namespaceSeparator < 0) return null
    dataPart = dataPart.slice(namespaceSeparator + 1)
  }
  if (!dataPart) return null
  try {
    const parsed = JSON.parse(dataPart)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return {
      event: String(parsed[0] ?? "").trim() || "message",
      args: parsed.slice(1),
    }
  } catch {
    return null
  }
}

const buildSocketIoWsUrl = (normalizedUrl, extraQuery = {}) => {
  try {
    const socketIoUrl = new URL(normalizedUrl)
    if (!/\/socket\.io\/?$/i.test(socketIoUrl.pathname)) {
      socketIoUrl.pathname = "/socket.io/"
    } else if (!socketIoUrl.pathname.endsWith("/")) {
      socketIoUrl.pathname = `${socketIoUrl.pathname}/`
    }
    Object.entries(extraQuery).forEach(([key, value]) => {
      const normalizedValue = String(value ?? "").trim()
      if (normalizedValue) {
        socketIoUrl.searchParams.set(key, normalizedValue)
      } else {
        socketIoUrl.searchParams.delete(key)
      }
    })
    socketIoUrl.searchParams.set("EIO", "4")
    socketIoUrl.searchParams.set("transport", "websocket")
    return socketIoUrl.toString()
  } catch {
    return ""
  }
}

const normalizeBackendOption = (entry) => {
  if (typeof entry === "string") {
    const key = entry.trim()
    if (!key) return null
    return { key, label: key }
  }
  if (!entry || typeof entry !== "object") return null
  const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? "").trim()
  if (!key) return null
  const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
  return { key, label }
}

const normalizeTargetEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const url = String(entry?.url ?? "").trim()
  const backend = String(entry?.backend ?? "").trim()
  if (!id || !url || !backend) return null
  return {
    id,
    url,
    backend,
    createdAt: String(entry?.createdAt ?? "").trim(),
    updatedAt: String(entry?.updatedAt ?? "").trim(),
  }
}

const normalizeRunLogEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const statusRaw = String(entry?.status ?? "").trim().toLowerCase()
  const status = statusRaw === "success" || statusRaw === "error" ? statusRaw : "running"
  const message = String(entry?.message ?? "").trim()
  if (!id || !time || !message) return null
  return { id, time, status, message }
}

const formatLogTime = () =>
  new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-3 h-8 w-56" />
        <SkeletonBlock className="mt-2 h-4 w-3/4" />
      </header>
      <section className={`${panelClass} bg-ink-900/60`}>
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="mt-3 h-10 w-full" />
        <SkeletonBlock className="mt-3 h-10 w-full" />
        <SkeletonBlock className="mt-4 h-40 w-full" />
      </section>
      <section className={`${panelClass} bg-ink-900/60`}>
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="mt-3 h-[340px] w-full" />
      </section>
    </div>
  )
}

export default function AutomationTab({ panelClass, isLoading = false }) {
  const toastStyle = DEFAULT_TOAST_STYLE
  const [savedWsUrl, setSavedWsUrl] = useState("")
  const [backendOptions, setBackendOptions] = useState([])
  const [targets, setTargets] = useState([])
  const [selectedTargetId, setSelectedTargetId] = useState("")
  const [draftUrl, setDraftUrl] = useState("")
  const [draftBackend, setDraftBackend] = useState("")
  const [runLog, setRunLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [resultPopup, setResultPopup] = useState({
    isOpen: false,
    title: "",
    backend: "",
    value: "",
  })

  const apiFetchAutomation = useCallback(async (input, init = {}) => {
    const headers = new Headers(init.headers || {})
    if (typeof window !== "undefined") {
      try {
        const token = String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim()
        if (token) {
          headers.set("Authorization", `Bearer ${token}`)
        }
      } catch {
        // Ignore localStorage read errors.
      }
    }
    return fetch(input, { ...init, headers })
  }, [])

  const readApiError = useCallback(async (res) => {
    try {
      const payload = await res.json()
      return String(payload?.error || payload?.message || "").trim()
    } catch {
      return ""
    }
  }, [])

  const persistRunLogEntry = useCallback(async (entry) => {
    try {
      const res = await apiFetchAutomation("/api/automation/logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        // Ignore API-level errors; keep local UI responsive.
      }
    } catch {
      // Ignore persistence errors; keep local UI responsive.
    }
  }, [apiFetchAutomation])

  const appendRunLog = useCallback((status, message, options = {}) => {
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: formatLogTime(),
      status: status === "success" || status === "error" ? status : "running",
      message: normalizedMessage,
    }
    setRunLog((prev) => [entry, ...prev].slice(0, MAX_RUN_LOG_ENTRIES))
    if (options?.persist !== false) {
      void persistRunLogEntry(entry)
    }
  }, [persistRunLogEntry])

  const clearRunLogs = useCallback(async () => {
    try {
      const res = await apiFetchAutomation("/api/automation/logs", { method: "DELETE" })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Loglar temizlenemedi.")
      }
      setRunLog([])
      toast.success("Loglar temizlendi", { style: toastStyle, position: "top-right" })
    } catch (error) {
      toast.error(error?.message || "Loglar temizlenemedi.", {
        style: toastStyle,
        position: "top-right",
      })
    }
  }, [apiFetchAutomation, readApiError, toastStyle])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadAutomationData = async () => {
      setIsBootstrapping(true)
      try {
        const [configRes, logsRes, targetsRes] = await Promise.all([
          apiFetchAutomation("/api/automation/config", { signal: controller.signal }),
          apiFetchAutomation("/api/automation/logs", { signal: controller.signal }),
          apiFetchAutomation("/api/automation/targets", { signal: controller.signal }),
        ])

        if (!configRes.ok) {
          const apiError = await readApiError(configRes)
          throw new Error(apiError || "Otomasyon ayarlari alinamadi.")
        }

        const configPayload = await configRes.json()
        const logsPayload = logsRes.ok ? await logsRes.json() : []
        const targetsPayload = targetsRes.ok ? await targetsRes.json() : []
        if (!isMounted) return

        const wsUrl = String(configPayload?.wsUrl ?? "").trim()
        const normalizedBackends = Array.isArray(configPayload?.backendOptions)
          ? configPayload.backendOptions.map(normalizeBackendOption).filter(Boolean)
          : Array.isArray(configPayload?.backendMaps)
            ? configPayload.backendMaps.map(normalizeBackendOption).filter(Boolean)
            : []
        const normalizedLogs = Array.isArray(logsPayload)
          ? logsPayload.map(normalizeRunLogEntry).filter(Boolean).slice(0, MAX_RUN_LOG_ENTRIES)
          : []
        const normalizedTargets = Array.isArray(targetsPayload)
          ? targetsPayload.map(normalizeTargetEntry).filter(Boolean)
          : []

        setSavedWsUrl(wsUrl)
        setBackendOptions(normalizedBackends)
        setRunLog(normalizedLogs)
        setTargets(normalizedTargets)
        setSelectedTargetId((prev) => {
          if (prev && normalizedTargets.some((item) => item.id === prev)) return prev
          return normalizedTargets[0]?.id ?? ""
        })
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Otomasyon verileri alinamadi.", {
          style: toastStyle,
          position: "top-right",
        })
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    loadAutomationData()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [apiFetchAutomation, readApiError, toastStyle])

  useEffect(() => {
    if (!draftBackend || !backendOptions.some((item) => item.key === draftBackend)) {
      setDraftBackend(backendOptions[0]?.key ?? "")
    }
  }, [backendOptions, draftBackend])

  useEffect(() => {
    if (!selectedTargetId || !targets.some((item) => item.id === selectedTargetId)) {
      setSelectedTargetId(targets[0]?.id ?? "")
    }
  }, [targets, selectedTargetId])

  const selectedTarget = useMemo(
    () => targets.find((item) => item.id === selectedTargetId) ?? null,
    [targets, selectedTargetId],
  )

  const selectedBackendLabel = useMemo(() => {
    const backendKey = String(selectedTarget?.backend ?? "").trim()
    if (!backendKey) return ""
    return backendOptions.find((item) => item.key === backendKey)?.label || backendKey
  }, [selectedTarget, backendOptions])

  const lastSuccess = useMemo(
    () => runLog.find((entry) => entry.status === "success") ?? null,
    [runLog],
  )

  const visibleRunLogEntries = useMemo(() => runLog.slice(0, CMD_VISIBLE_ROWS), [runLog])
  const emptyRunLogRows = useMemo(
    () => Math.max(0, CMD_VISIBLE_ROWS - visibleRunLogEntries.length),
    [visibleRunLogEntries.length],
  )

  const saveTarget = async () => {
    const url = String(draftUrl ?? "").trim()
    const backend = String(draftBackend ?? "").trim()
    if (!url || !backend) {
      toast.error("URL ve backend map zorunlu.", { style: toastStyle, position: "top-right" })
      return
    }

    try {
      const res = await apiFetchAutomation("/api/automation/targets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, backend }),
      })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Kayit eklenemedi.")
      }

      const payload = await res.json()
      const created = normalizeTargetEntry(payload)
      if (!created) throw new Error("Kayit formati gecersiz.")

      setTargets((prev) => {
        const next = [...prev.filter((item) => item.id !== created.id), created]
        return next.sort((a, b) => {
          const aTime = Date.parse(a.createdAt || "") || 0
          const bTime = Date.parse(b.createdAt || "") || 0
          return aTime - bTime
        })
      })
      setSelectedTargetId(created.id)
      setDraftUrl("")
      toast.success("Kayit eklendi.", { style: toastStyle, position: "top-right" })
    } catch (error) {
      toast.error(error?.message || "Kayit eklenemedi.", { style: toastStyle, position: "top-right" })
    }
  }

  const deleteTarget = async (targetId) => {
    const normalizedId = String(targetId ?? "").trim()
    if (!normalizedId) return
    try {
      const res = await apiFetchAutomation(`/api/automation/targets/${normalizedId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Kayit silinemedi.")
      }
      setTargets((prev) => prev.filter((item) => item.id !== normalizedId))
      toast.success("Kayit silindi.", { style: toastStyle, position: "top-right" })
    } catch (error) {
      toast.error(error?.message || "Kayit silinemedi.", { style: toastStyle, position: "top-right" })
    }
  }

  const runSelectedTarget = useCallback(() => {
    if (isRunning) return
    const target = selectedTarget
    if (!target) {
      toast.error("Calistirmak icin bir satir secin.", { style: toastStyle, position: "top-right" })
      return
    }

    const socketBaseUrl = String(savedWsUrl ?? "").trim()
    if (!socketBaseUrl) {
      toast.error("Socket sunucusu ayari bulunamadi.", { style: toastStyle, position: "top-right" })
      return
    }

    const triggerUrl = buildSocketIoWsUrl(socketBaseUrl, {
      backend: target.backend,
      url: target.url,
    })
    if (!triggerUrl) {
      toast.error("Socket.IO adresi olusturulamadi.", { style: toastStyle, position: "top-right" })
      return
    }

    const backendLabel = backendOptions.find((item) => item.key === target.backend)?.label || target.backend
    setResultPopup((prev) => ({ ...prev, isOpen: false }))
    setIsRunning(true)
    appendRunLog("running", `${backendLabel} tetikleniyor... url=${target.url}`)

    let socket = null
    let settled = false
    let hasConnected = false
    let hasResult = false
    let timeoutId = null

    const clearRunTimeout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      clearRunTimeout()
      appendRunLog(status, message)
      setIsRunning(false)
      try {
        socket?.close()
      } catch {
        // Ignore close errors.
      }
    }

    const resetRunTimeout = (ms = 300000) => {
      clearRunTimeout()
      timeoutId = window.setTimeout(() => {
        if (hasResult) {
          complete("success", `${backendLabel} tamamlandi.`)
          return
        }
        complete("error", `${backendLabel} icin sonuc alinmadi (zaman asimi).`)
      }, ms)
    }

    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      complete("error", `${backendLabel} icin websocket baglantisi baslatilamadi.`)
      return
    }

    resetRunTimeout(15000)

    socket.addEventListener("message", (event) => {
      if (settled) return
      const payload = typeof event.data === "string" ? event.data : ""
      if (!payload) return

      const packets = splitEnginePackets(payload)
      for (const packet of packets) {
        if (settled) return
        if (packet === "2") {
          try {
            socket.send("3")
          } catch {
            // Ignore pong send errors.
          }
          continue
        }
        if (packet.startsWith("0{")) {
          try {
            socket.send("40")
          } catch {
            complete("error", `${backendLabel} icin Socket.IO connect paketi gonderilemedi.`)
          }
          continue
        }
        if (packet.startsWith("40")) {
          hasConnected = true
          resetRunTimeout(300000)
          continue
        }
        if (packet.startsWith("41")) {
          complete(hasResult ? "success" : "error", hasResult ? `${backendLabel} tamamlandi.` : `${backendLabel} sonuc gelmeden baglanti kapandi.`)
          return
        }
        if (packet.startsWith("44")) {
          complete("error", `${backendLabel} tetiklenemedi. backend=${target.backend}`)
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue
        const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
        const firstArg = eventPacket.args[0]

        if (eventName === "script-triggered" || eventName === "script-started") {
          appendRunLog("running", `${target.backend} script baslatildi.`)
          resetRunTimeout(300000)
          continue
        }
        if (eventName === "script-log") {
          const stream = String(firstArg?.stream ?? "").trim().toLowerCase()
          const message = String(firstArg?.message ?? "").trim()
          if (message) {
            message
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .forEach((line) => appendRunLog(stream === "stderr" ? "error" : "running", line))
          }
          resetRunTimeout(300000)
          continue
        }
        if (eventName === "script-exit") {
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode)) {
            appendRunLog(exitCode === 0 ? "success" : "error", `Script cikti. Kod: ${exitCode}`)
          }
          if (!hasResult) {
            complete("error", `${backendLabel} cikti ama sonuc gelmedi.`)
            return
          }
          resetRunTimeout(5000)
          continue
        }
        if (eventName === "sonuc") {
          const resultBackend = String(firstArg?.backend ?? target.backend).trim() || target.backend
          let rawValue = ""
          if (typeof firstArg?.value === "string") {
            rawValue = firstArg.value
          } else if (firstArg?.value !== null && firstArg?.value !== undefined) {
            try {
              rawValue = JSON.stringify(firstArg.value)
            } catch {
              rawValue = String(firstArg.value)
            }
          }
          const valueText = String(rawValue ?? "").trim()
          appendRunLog("success", `${resultBackend} => ${valueText || "-"}`)
          setResultPopup({
            isOpen: true,
            title: backendLabel,
            backend: resultBackend,
            value: rawValue || "-",
          })
          hasResult = true
          complete("success", `${backendLabel} tamamlandi.`)
          return
        }

        resetRunTimeout(300000)
      }
    })

    socket.addEventListener("error", () => {
      complete("error", `${backendLabel} icin websocket baglanti hatasi olustu.`)
    })
    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        complete("success", `${backendLabel} tamamlandi.`)
        return
      }
      if (hasConnected) {
        complete("error", `${backendLabel} baglandi ama sonuc donmedi.`)
        return
      }
      complete("error", `${backendLabel} icin websocket baglantisi kapandi.`)
    })
  }, [appendRunLog, backendOptions, isRunning, savedWsUrl, selectedTarget, toastStyle])

  if (isLoading || isBootstrapping) {
    return <AutomationSkeleton panelClass={panelClass} />
  }

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
  const primaryButtonClass =
    "rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"

  const resultModalContent = resultPopup.isOpen ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Islem Basarili</p>
        <p className="mt-1 text-base font-semibold text-white">{resultPopup.title || "Otomasyon"} tamamlandi.</p>
        <p className="mt-1 text-xs text-slate-300">Sonuc: <span className="text-emerald-100">{resultPopup.backend || "-"}</span></p>
        <div
          className="mt-4 cursor-copy rounded-xl border border-white/10 bg-black/25 p-3"
          title="Sonucu kopyalamak icin tikla"
          onClick={async () => {
            const valueToCopy = String(resultPopup.value || "-")
            try {
              await navigator.clipboard.writeText(valueToCopy)
              toast.success("Sonuc kopyalandi", { style: toastStyle, position: "top-right" })
            } catch {
              toast.error("Sonuc kopyalanamadi", { style: toastStyle, position: "top-right" })
            }
          }}
        >
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{resultPopup.value || "-"}</pre>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className={primaryButtonClass} onClick={() => setResultPopup((prev) => ({ ...prev, isOpen: false }))}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5 sm:space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">Stok cek</span>
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Otomasyon</h1>
              <p className="max-w-2xl text-sm text-slate-200/80">URL ve backend map kaydi ekle, satir sec ve calistir. Sonuclar CMD ekraninda akar.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">Kayit: {targets.length}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">Son: {lastSuccess?.time ?? "--:--"}</span>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${isRunning ? "border-amber-300/60 bg-amber-500/15 text-amber-100" : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"}`}>
                {isRunning ? "Calisiyor" : "Hazir"}
              </span>
            </div>
          </div>
        </header>

        <section className={`${panelClass} bg-ink-900/60`}>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)_auto]">
            <input type="text" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://ornek.com/urun" className={fieldClass} />
            <select value={draftBackend} onChange={(event) => setDraftBackend(event.target.value)} disabled={backendOptions.length === 0} className={fieldClass}>
              <option value="">Backend map sec</option>
              {backendOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <button type="button" onClick={saveTarget} disabled={!draftUrl.trim() || !draftBackend.trim()} className={primaryButtonClass}>Kaydet</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Socket sunucusu: <span className="font-mono text-slate-200">{savedWsUrl || "-"}</span></p>

          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/70 p-2">
            {targets.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-500">Kayitli URL + backend map yok.</p>
            ) : (
              <div className="space-y-1.5">
                {targets.map((item) => {
                  const selected = item.id === selectedTargetId
                  const backendLabel = backendOptions.find((opt) => opt.key === item.backend)?.label || item.backend
                  return (
                    <div key={item.id} className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${selected ? "border-emerald-300/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
                      <button type="button" onClick={() => setSelectedTargetId(item.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-semibold text-slate-100">{backendLabel}</p>
                        <p className="truncate font-mono text-[11px] text-slate-400">{item.url}</p>
                      </button>
                      <button type="button" onClick={() => { void deleteTarget(item.id) }} className="rounded border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/20" title="Kaydi sil">
                        Sil
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">Secili satir: {selectedBackendLabel || "-"}{selectedTarget?.url ? ` | ${selectedTarget.url}` : ""}</p>
            <button type="button" onClick={runSelectedTarget} disabled={!selectedTarget || isRunning} className={primaryButtonClass}>
              {isRunning ? "Calisiyor..." : "Calistir"}
            </button>
          </div>
        </section>

        <section className={`${panelClass} bg-ink-900/60`}>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/80 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 bg-ink-900/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">automation.cmd</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{runLog.length} satir</span>
                <button type="button" onClick={() => { void clearRunLogs() }} disabled={runLog.length === 0} className="rounded border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50">
                  Loglari temizle
                </button>
              </div>
            </div>
            <div className="no-scrollbar h-[336px] overflow-auto px-3 py-3 font-mono text-[12px] leading-6">
              <div className="space-y-0.5">
                {visibleRunLogEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-slate-200">
                    <span className="flex-none text-slate-500">C:\plcp\automation&gt;</span>
                    <span className={`flex-none ${entry.status === "success" ? "text-emerald-300" : entry.status === "error" ? "text-rose-300" : "text-amber-300"}`}>[{entry.time}]</span>
                    <span className={`flex-none ${entry.status === "success" ? "text-emerald-300" : entry.status === "error" ? "text-rose-300" : "text-amber-300"}`}>{entry.status === "success" ? "OK" : entry.status === "error" ? "ERR" : "RUN"}</span>
                    <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
                  </div>
                ))}
                {Array.from({ length: emptyRunLogRows }).map((_, index) => (
                  <div key={`empty-row-${index}`} className="flex items-start gap-2 text-slate-700">
                    <span className="flex-none text-slate-600">C:\plcp\automation&gt;</span>
                    <span className="flex-none text-slate-700">[--:--]</span>
                    <span className="flex-none text-slate-700">--</span>
                    <span className={`truncate text-slate-700 ${runLog.length === 0 && index === 0 ? "text-slate-500" : "opacity-0"}`}>
                      {runLog.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {typeof document !== "undefined" && resultModalContent ? createPortal(resultModalContent, document.body) : null}
    </>
  )
}
