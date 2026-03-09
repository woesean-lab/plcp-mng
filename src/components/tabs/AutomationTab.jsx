import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"

const WS_URL_STORAGE_KEY = "pulcipAutomationWsUrl"
const readStoredWsUrl = () => {
  if (typeof window === "undefined") return ""
  try {
    return String(localStorage.getItem(WS_URL_STORAGE_KEY) ?? "").trim()
  } catch {
    return ""
  }
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-52" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-24 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
          <SkeletonBlock className="h-7 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-40" />
          <SkeletonBlock className="mt-4 h-56 w-full" />
        </div>
        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AutomationTab({ panelClass, isLoading = false }) {
  const [automations, setAutomations] = useState([
    { id: "auto-1", title: "Siparis onay otomasyonu", template: "/templates/order-confirm" },
    { id: "auto-2", title: "Stok kontrol zinciri", template: "/templates/stock-check" },
    { id: "auto-3", title: "Problem eskalasyonu", template: "/templates/problem-escalation" },
  ])
  const [automationForm, setAutomationForm] = useState({ title: "", template: "" })
  const [editingId, setEditingId] = useState("")
  const [editingDraft, setEditingDraft] = useState({ title: "", template: "" })
  const [selectedAutomationId, setSelectedAutomationId] = useState("")
  const [runLog, setRunLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [templateWarning, setTemplateWarning] = useState("")
  const [confirmRunId, setConfirmRunId] = useState("")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [wsUrl, setWsUrl] = useState(() => readStoredWsUrl())
  const [savedWsUrl, setSavedWsUrl] = useState(() => readStoredWsUrl())
  const [wsTestStatus, setWsTestStatus] = useState("idle")
  const [wsTestMessage, setWsTestMessage] = useState("Henüz bağlantı kurulmadı.")
  const [lastTestedWsUrl, setLastTestedWsUrl] = useState("")
  const [isWsTesting, setIsWsTesting] = useState(false)
  const wsSocketRef = useRef(null)
  const toastStyle = {
    background: "rgba(15, 23, 42, 0.92)",
    color: "#e2e8f0",
    border: "1px solid rgba(148, 163, 184, 0.2)",
  }

  const selectedAutomation = useMemo(
    () => automations.find((item) => item.id === selectedAutomationId) ?? null,
    [automations, selectedAutomationId],
  )

  const lastSuccess = useMemo(
    () => runLog.find((entry) => entry.status === "success") ?? null,
    [runLog],
  )

  useEffect(() => {
    return () => {
      if (wsSocketRef.current) {
        wsSocketRef.current.close()
        wsSocketRef.current = null
      }
    }
  }, [])

  const isValidWsUrl = (value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === "ws:" || parsed.protocol === "wss:"
    } catch {
      return false
    }
  }

  const saveWsUrl = () => {
    const normalized = wsUrl.trim()
    if (!normalized) {
      toast.error("Websocket adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }
    if (!isValidWsUrl(normalized)) {
      toast.error("Geçerli bir ws/wss adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }
    try {
      localStorage.setItem(WS_URL_STORAGE_KEY, normalized)
      setSavedWsUrl(normalized)
      if (normalized !== lastTestedWsUrl) {
        setWsTestStatus("idle")
        setWsTestMessage("Kaydedildi. Bağlantı kur butonunu kullan.")
      } else if (wsTestStatus === "success") {
        setWsTestMessage("Kaydedildi. Son bağlantı sonucu: bağlantı başarılı.")
      } else if (wsTestStatus === "error") {
        setWsTestMessage("Kaydedildi. Son bağlantı sonucu: bağlantı başarısız.")
      }
      toast.success("Websocket adresi kaydedildi", { style: toastStyle, position: "top-right" })
    } catch {
      toast.error("Kaydedilemedi.", { style: toastStyle, position: "top-right" })
    }
  }

  const buildSocketIoWsUrl = (normalizedUrl) => {
    try {
      const socketIoUrl = new URL(normalizedUrl)
      if (!/\/socket\.io\/?$/i.test(socketIoUrl.pathname)) {
        socketIoUrl.pathname = "/socket.io/"
      } else if (!socketIoUrl.pathname.endsWith("/")) {
        socketIoUrl.pathname = `${socketIoUrl.pathname}/`
      }
      socketIoUrl.searchParams.set("EIO", "4")
      socketIoUrl.searchParams.set("transport", "websocket")
      return socketIoUrl.toString()
    } catch {
      return ""
    }
  }

  const testSocketIoConnection = (socketIoUrl) =>
    new Promise((resolve) => {
      let settled = false
      let socket = null
      let timeoutId = null
      let handshakeTimeoutId = null

      const finish = (ok, reason) => {
        if (settled) return
        settled = true
        if (timeoutId) window.clearTimeout(timeoutId)
        if (handshakeTimeoutId) window.clearTimeout(handshakeTimeoutId)
        if (wsSocketRef.current === socket) {
          wsSocketRef.current = null
        }
        try {
          socket?.close()
        } catch {
          // Ignore close errors.
        }
        resolve({ ok, reason })
      }

      try {
        socket = new WebSocket(socketIoUrl)
      } catch {
        finish(false, "invalid_url")
        return
      }

      wsSocketRef.current = socket

      timeoutId = window.setTimeout(() => {
        finish(false, "timeout")
      }, 6000)

      socket.addEventListener("open", () => {
        handshakeTimeoutId = window.setTimeout(() => {
          finish(false, "socketio_handshake_timeout")
        }, 1800)
      })

      socket.addEventListener("message", (event) => {
        if (settled) return
        const payload = typeof event.data === "string" ? event.data : ""
        if (payload.startsWith("0{") || payload.includes("\"sid\"")) {
          finish(true, "socketio_open")
        }
      })

      socket.addEventListener("error", () => {
        finish(false, "error")
      })

      socket.addEventListener("close", () => {
        if (settled) return
        finish(false, "closed")
      })
    })

  const connectSocketIo = () => {
    const normalized = wsUrl.trim()
    if (!normalized) {
      toast.error("Websocket adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }
    if (!isValidWsUrl(normalized)) {
      toast.error("Geçerli bir ws/wss adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }

    if (wsSocketRef.current) {
      wsSocketRef.current.close()
      wsSocketRef.current = null
    }

    let settled = false
    setIsWsTesting(true)
    setWsTestStatus("testing")
    setWsTestMessage("Socket.IO bağlantısı kuruluyor...")
    const socketIoUrl = buildSocketIoWsUrl(normalized)
    if (!socketIoUrl) {
      setIsWsTesting(false)
      setWsTestStatus("error")
      setWsTestMessage("Socket.IO bağlantı adresi oluşturulamadı.")
      toast.error("Socket.IO adresi geçersiz.", { style: toastStyle, position: "top-right" })
      return
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      setIsWsTesting(false)
      setWsTestStatus(status)
      setWsTestMessage(message)
      setLastTestedWsUrl(normalized)
      if (status === "success") {
        toast.success("Websocket bağlantısı başarılı", { style: toastStyle, position: "top-right" })
      } else {
        toast.error("Websocket bağlantısı başarısız", { style: toastStyle, position: "top-right" })
      }
    }

    void (async () => {
      const result = await testSocketIoConnection(socketIoUrl)
      if (result.ok) {
        complete("success", "Bağlantı başarılı (Socket.IO).")
        return
      }

      complete(
        "error",
        "Socket.IO bağlantısı kurulamadı. /socket.io ve CORS ayarlarını kontrol edin.",
      )
    })()
  }

  const wsStatusMeta = (() => {
    const normalizedCurrentWsUrl = wsUrl.trim()
    const isCurrentUrlTested = normalizedCurrentWsUrl && normalizedCurrentWsUrl === lastTestedWsUrl

    if (!normalizedCurrentWsUrl) {
      return {
        dot: "bg-rose-400",
        badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
        label: "Bağlantı yok",
      }
    }
    if (wsTestStatus === "success") {
      return {
        dot: "bg-emerald-400",
        badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-100",
        label: "Bağlantı başarılı",
      }
    }
    if (wsTestStatus === "testing") {
      return {
        dot: "bg-amber-300",
        badge: "border-amber-300/50 bg-amber-500/15 text-amber-100",
        label: "Bağlantı kuruluyor",
      }
    }
    if (!isCurrentUrlTested) {
      return {
        dot: "bg-rose-400",
        badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
        label: "Bağlantı kurulmadı",
      }
    }
    return {
      dot: "bg-rose-400",
      badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
      label: "Bağlantı başarısız",
    }
  })()

  const handleWsUrlChange = (event) => {
    const nextValue = event.target.value
    setWsUrl(nextValue)
    if (nextValue.trim() !== lastTestedWsUrl) {
      setWsTestStatus("idle")
      setWsTestMessage("Bu adres için bağlantı kurulmadı.")
    }
  }

  const runAutomation = (selected) => {
    if (!selected) return
    const now = new Date()
    const time = now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setIsRunning(true)
    toast("Otomasyon baslatildi", { style: toastStyle, position: "top-right" })
    setRunLog((prev) => [
      {
        id: `log-${Date.now()}`,
        time,
        status: "running",
        message: `${selected.title} calisiyor...`,
      },
      ...prev,
    ])
    window.setTimeout(() => {
      const doneTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setRunLog((prev) => [
        {
          id: `log-${Date.now()}-done`,
          time: doneTime,
          status: "success",
          message: `${selected.title} tamamlandi.`,
        },
        ...prev,
      ])
      toast.success("Otomasyon tamamlandi", { style: toastStyle, position: "top-right" })
      setIsRunning(false)
    }, 1200)
  }

  if (isLoading) {
    return <AutomationSkeleton panelClass={panelClass} />
  }

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 hover:border-white/20"
  const primaryButtonClass =
    "rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const secondaryButtonClass =
    "rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/20 hover:bg-white/10"

  const modalContent = isConfirmOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Onay</p>
        <p className="mt-2 text-base font-semibold text-white">Otomasyon calistirilsin mi?</p>
        <p className="mt-2 text-sm text-slate-300">
          {automations.find((item) => item.id === confirmRunId)?.title ?? ""}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              const selected = automations.find((item) => item.id === confirmRunId)
              setIsConfirmOpen(false)
              setConfirmRunId("")
              if (!selected) return
              runAutomation(selected)
            }}
          >
            Evet
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              setIsConfirmOpen(false)
              setConfirmRunId("")
            }}
          >
            Iptal
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
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                Otomasyon
              </span>
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Otomasyon
              </h1>
              <p className="max-w-2xl text-sm text-slate-200/80">
                Otomasyon sec, calistir ve ciktilari tek alanda takip et.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Toplam: {automations.length}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Son: {lastSuccess?.time ?? "--:--"}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                  isRunning
                    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                    : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {isRunning ? "Calisiyor" : "Hazir"}
              </span>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Calistir</p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Son: {lastSuccess?.time ?? "--:--"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedAutomationId}
                onChange={(event) => setSelectedAutomationId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Otomasyon sec</option>
                {automations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedAutomationId || isRunning}
                onClick={() => {
                  if (!selectedAutomationId || isRunning) return
                  setConfirmRunId(selectedAutomationId)
                  setIsConfirmOpen(true)
                }}
                className={`min-w-[130px] ${primaryButtonClass}`}
              >
                {isRunning ? "Calisiyor..." : "Calistir"}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Secili Otomasyon</p>
              <p className="mt-1 truncate text-sm text-slate-100">
                {selectedAutomation?.title ?? "Secim yok"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {selectedAutomation?.template ?? "/templates/..."}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/80 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 bg-ink-900/70 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  automation.cmd
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  {runLog.length} satir
                </span>
              </div>

              <div className="max-h-[320px] overflow-auto px-3 py-3 font-mono text-[12px] leading-6">
                {runLog.length === 0 ? (
                  <div className="space-y-1 text-slate-500">
                    <div>C:\plcp\automation&gt; bekleniyor...</div>
                    <div>C:\plcp\automation&gt; log yok</div>
                    <div className="flex items-center gap-1">
                      <span>C:\plcp\automation&gt;</span>
                      <span className="inline-block h-4 w-2 animate-pulse bg-slate-500/80" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {runLog.slice(0, 20).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 text-slate-200">
                        <span className="flex-none text-slate-500">C:\plcp\automation&gt;</span>
                        <span
                          className={`flex-none ${
                            entry.status === "success" ? "text-emerald-300" : "text-amber-300"
                          }`}
                        >
                          [{entry.time}]
                        </span>
                        <span
                          className={`flex-none ${
                            entry.status === "success" ? "text-emerald-300" : "text-amber-300"
                          }`}
                        >
                          {entry.status === "success" ? "OK" : "RUN"}
                        </span>
                        <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
                      </div>
                    ))}
                    {isRunning ? (
                      <div className="mt-1 flex items-center gap-1 text-slate-400">
                        <span>C:\plcp\automation&gt;</span>
                        <span className="inline-block h-4 w-2 animate-pulse bg-slate-400/80" />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Websocket</p>
                <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${wsStatusMeta.badge}`}>
                  <span className={`h-2 w-2 rounded-full ${wsStatusMeta.dot}`} />
                  {wsStatusMeta.label}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                <input
                  id="ws-url"
                  type="text"
                  placeholder="wss://ornek.com/ws"
                  value={wsUrl}
                  onChange={handleWsUrlChange}
                  className={fieldClass}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={saveWsUrl} className={`w-full ${secondaryButtonClass}`}>
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={connectSocketIo}
                    disabled={isWsTesting}
                    className={`w-full ${primaryButtonClass}`}
                  >
                    {isWsTesting ? "Bağlantı kuruluyor..." : "Bağlantı kur"}
                  </button>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <p className="break-all">
                    Kayıtlı: <span className="text-slate-100">{savedWsUrl || "-"}</span>
                  </p>
                  <p className="mt-1 text-slate-400">{wsTestMessage}</p>
                </div>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Yeni Ekle</p>
              <div className="mt-3 space-y-3">
                <input
                  id="automation-title"
                  type="text"
                  placeholder="Otomasyon basligi"
                  value={automationForm.title}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className={fieldClass}
                />
                <input
                  id="automation-template"
                  type="text"
                  placeholder="/templates/..."
                  value={automationForm.template}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, template: event.target.value }))
                  }
                  className={fieldClass}
                />
                {templateWarning ? (
                  <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {templateWarning}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    const title = automationForm.title.trim()
                    const template = automationForm.template.trim()
                    if (!title || !template) return
                    if (!template.startsWith("/templates/")) {
                      setTemplateWarning("Template yolu /templates/ ile baslamali.")
                      toast.error("Template yolu /templates/ ile baslamali.", {
                        style: toastStyle,
                        position: "top-right",
                      })
                      return
                    }
                    setTemplateWarning("")
                    setAutomations((prev) => [{ id: `auto-${Date.now()}`, title, template }, ...prev])
                    setAutomationForm({ title: "", template: "" })
                    toast.success("Otomasyon eklendi", { style: toastStyle, position: "top-right" })
                  }}
                  className={`w-full ${primaryButtonClass}`}
                >
                  Ekle
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Duzenle / Sil</p>
              <div className="mt-3 space-y-3">
                <select
                  value={editingId}
                  onChange={(event) => {
                    const value = event.target.value
                    setEditingId(value)
                    const selected = automations.find((entry) => entry.id === value)
                    setEditingDraft({
                      title: selected?.title ?? "",
                      template: selected?.template ?? "",
                    })
                  }}
                  className={fieldClass}
                >
                  <option value="">Otomasyon sec</option>
                  {automations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingDraft.title}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Otomasyon basligi"
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={editingDraft.template}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, template: event.target.value }))
                  }
                  placeholder="/templates/..."
                  className={fieldClass}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      const title = editingDraft.title.trim()
                      const template = editingDraft.template.trim()
                      if (!editingId || !title || !template) return
                      setAutomations((prev) =>
                        prev.map((entry) =>
                          entry.id === editingId ? { ...entry, title, template } : entry,
                        ),
                      )
                      toast.success("Otomasyon guncellendi", {
                        style: toastStyle,
                        position: "top-right",
                      })
                    }}
                    className={primaryButtonClass}
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingId) return
                      setAutomations((prev) => prev.filter((entry) => entry.id !== editingId))
                      setEditingId("")
                      setEditingDraft({ title: "", template: "" })
                      if (selectedAutomationId === editingId) setSelectedAutomationId("")
                      toast("Otomasyon silindi", { style: toastStyle, position: "top-right" })
                    }}
                    className="rounded-lg border border-rose-300/60 bg-rose-500/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  )
}
