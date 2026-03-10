import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"

const WS_CONNECTION_STATE_STORAGE_KEY = "pulcipAutomationWsConnectionState"
const DEFAULT_TOAST_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#e2e8f0",
  border: "1px solid rgba(148, 163, 184, 0.2)",
}
const readStoredWsConnectionState = () => {
  if (typeof window === "undefined") {
    return { status: "idle", message: "Henüz bağlantı kurulmadı.", url: "" }
  }
  try {
    const raw = localStorage.getItem(WS_CONNECTION_STATE_STORAGE_KEY)
    if (!raw) return { status: "idle", message: "Henüz bağlantı kurulmadı.", url: "" }
    const parsed = JSON.parse(raw)
    const status = String(parsed?.status ?? "").trim()
    const message = String(parsed?.message ?? "").trim()
    const url = String(parsed?.url ?? "").trim()
    if (!["idle", "success", "error"].includes(status)) {
      return { status: "idle", message: "Henüz bağlantı kurulmadı.", url: "" }
    }
    return {
      status,
      message: message || "Henüz bağlantı kurulmadı.",
      url,
    }
  } catch {
    return { status: "idle", message: "Henüz bağlantı kurulmadı.", url: "" }
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
  const [automations, setAutomations] = useState([])
  const [automationForm, setAutomationForm] = useState({ title: "", backend: "" })
  const [editingId, setEditingId] = useState("")
  const [editingDraft, setEditingDraft] = useState({ title: "", backend: "" })
  const [selectedAutomationId, setSelectedAutomationId] = useState("")
  const [runLog, setRunLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [confirmRunId, setConfirmRunId] = useState("")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [resultPopup, setResultPopup] = useState({
    isOpen: false,
    title: "",
    backend: "",
    value: "",
  })
  const [wsUrl, setWsUrl] = useState("")
  const [savedWsUrl, setSavedWsUrl] = useState("")
  const [wsTestStatus, setWsTestStatus] = useState(() => readStoredWsConnectionState().status)
  const [wsTestMessage, setWsTestMessage] = useState(() => readStoredWsConnectionState().message)
  const [lastTestedWsUrl, setLastTestedWsUrl] = useState(() => readStoredWsConnectionState().url)
  const [isWsTesting, setIsWsTesting] = useState(false)
  const wsSocketRef = useRef(null)
  const hasAutoConnectedRef = useRef(false)
  const toastStyle = DEFAULT_TOAST_STYLE

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

  const persistWsConnectionState = useCallback((url, status, message) => {
    try {
      localStorage.setItem(
        WS_CONNECTION_STATE_STORAGE_KEY,
        JSON.stringify({
          url: String(url ?? "").trim(),
          status: String(status ?? "").trim() || "idle",
          message: String(message ?? "").trim() || "Henüz bağlantı kurulmadı.",
        }),
      )
    } catch {
      // Local storage unavailable.
    }
  }, [])

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

  const normalizeAutomation = useCallback((entry) => {
    const id = String(entry?.id ?? "").trim()
    const title = String(entry?.title ?? "").trim()
    const backend = String(entry?.backend ?? "").trim()
    if (!id || !title || !backend) return null
    return { id, title, backend }
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadAutomationData = async () => {
      try {
        const [automationsRes, configRes] = await Promise.all([
          apiFetchAutomation("/api/automations", { signal: controller.signal }),
          apiFetchAutomation("/api/automation/config", { signal: controller.signal }),
        ])
        if (!automationsRes.ok) {
          const apiError = await readApiError(automationsRes)
          throw new Error(apiError || "Otomasyonlar alinamadi.")
        }
        if (!configRes.ok) {
          const apiError = await readApiError(configRes)
          throw new Error(apiError || "Websocket ayarlari alinamadi.")
        }

        const automationsPayload = await automationsRes.json()
        const configPayload = await configRes.json()
        if (!isMounted) return

        const normalizedAutomations = Array.isArray(automationsPayload)
          ? automationsPayload.map(normalizeAutomation).filter(Boolean)
          : []
        setAutomations(normalizedAutomations)

        const configWsUrl = String(configPayload?.wsUrl ?? "").trim()
        setWsUrl(configWsUrl)
        setSavedWsUrl(configWsUrl)
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Otomasyon verileri alinamadi.", {
          style: toastStyle,
          position: "top-right",
        })
      }
    }

    loadAutomationData()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [apiFetchAutomation, normalizeAutomation, readApiError, toastStyle])

  const isValidWsUrl = useCallback((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === "ws:" || parsed.protocol === "wss:"
    } catch {
      return false
    }
  }, [])

  const saveWsUrl = async () => {
    const normalized = wsUrl.trim()
    if (!normalized) {
      toast.error("Websocket adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }
    if (!isValidWsUrl(normalized)) {
      toast.error("Gecerli bir ws/wss adresi girin.", { style: toastStyle, position: "top-right" })
      return
    }

    try {
      const res = await apiFetchAutomation("/api/automation/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wsUrl: normalized }),
      })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Kaydedilemedi.")
      }

      const payload = await res.json()
      const persistedWsUrl = String(payload?.wsUrl ?? normalized).trim()
      setWsUrl(persistedWsUrl)
      setSavedWsUrl(persistedWsUrl)

      if (persistedWsUrl !== lastTestedWsUrl) {
        setLastTestedWsUrl("")
        setWsTestStatus("idle")
        const message = "Kaydedildi. Baglanti kur butonunu kullan."
        setWsTestMessage(message)
        persistWsConnectionState("", "idle", message)
      } else if (wsTestStatus === "success") {
        const message = "Kaydedildi. Son baglanti sonucu: baglanti basarili."
        setWsTestMessage(message)
        persistWsConnectionState(persistedWsUrl, "success", message)
      } else if (wsTestStatus === "error") {
        const message = "Kaydedildi. Son baglanti sonucu: baglanti basarisiz."
        setWsTestMessage(message)
        persistWsConnectionState(persistedWsUrl, "error", message)
      } else {
        persistWsConnectionState("", "idle", wsTestMessage)
      }

      toast.success("Websocket adresi kaydedildi", { style: toastStyle, position: "top-right" })
    } catch (error) {
      toast.error(error?.message || "Kaydedilemedi.", { style: toastStyle, position: "top-right" })
    }
  }
  const buildSocketIoWsUrl = useCallback((normalizedUrl, extraQuery = {}) => {
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
  }, [])

  const testSocketIoConnection = useCallback((socketIoUrl) =>
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
    }), [])

  const connectSocketIo = useCallback((options = {}) => {
    const normalized = String(options?.targetUrl ?? wsUrl).trim()
    const silent = Boolean(options?.silent)
    if (!normalized) {
      if (!silent) {
        toast.error("Websocket adresi girin.", { style: toastStyle, position: "top-right" })
      }
      return
    }
    if (!isValidWsUrl(normalized)) {
      if (!silent) {
        toast.error("Geçerli bir ws/wss adresi girin.", { style: toastStyle, position: "top-right" })
      }
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
      const message = "Socket.IO bağlantı adresi oluşturulamadı."
      setWsTestMessage(message)
      setLastTestedWsUrl(normalized)
      persistWsConnectionState(normalized, "error", message)
      if (!silent) {
        toast.error("Socket.IO adresi geçersiz.", { style: toastStyle, position: "top-right" })
      }
      return
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      setIsWsTesting(false)
      setWsTestStatus(status)
      setWsTestMessage(message)
      setLastTestedWsUrl(normalized)
      persistWsConnectionState(normalized, status, message)
      if (status === "success") {
        if (!silent) {
          toast.success("Websocket bağlantısı başarılı", { style: toastStyle, position: "top-right" })
        }
      } else {
        if (!silent) {
          toast.error("Websocket bağlantısı başarısız", { style: toastStyle, position: "top-right" })
        }
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
  }, [
    buildSocketIoWsUrl,
    isValidWsUrl,
    persistWsConnectionState,
    testSocketIoConnection,
    toastStyle,
    wsUrl,
  ])

  useEffect(() => {
    if (hasAutoConnectedRef.current) return
    const normalized = savedWsUrl.trim()
    if (!normalized) return
    hasAutoConnectedRef.current = true
    const timeoutId = window.setTimeout(() => {
      connectSocketIo({ targetUrl: normalized, silent: true })
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [savedWsUrl, connectSocketIo])

  const wsStatusMeta = (() => {
    const normalizedCurrentWsUrl = wsUrl.trim()
    const isCurrentUrlTested = normalizedCurrentWsUrl && normalizedCurrentWsUrl === lastTestedWsUrl

    if (!normalizedCurrentWsUrl) {
      return {
        dot: "bg-slate-400",
        badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
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
    if (wsTestStatus === "idle") {
      return {
        dot: "bg-slate-400",
        badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
        label: "Bağlantı kurulmadı",
      }
    }
    if (!isCurrentUrlTested) {
      return {
        dot: "bg-slate-400",
        badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
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
      setLastTestedWsUrl("")
      setWsTestStatus("idle")
      const message = "Bu adres için bağlantı kurulmadı."
      setWsTestMessage(message)
      persistWsConnectionState("", "idle", message)
    }
  }

  const createAutomation = useCallback(async (title, backend) => {
    const res = await apiFetchAutomation("/api/automations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, backend }),
    })
    if (!res.ok) {
      const apiError = await readApiError(res)
      throw new Error(apiError || "Otomasyon eklenemedi.")
    }
    const payload = await res.json()
    const normalized = normalizeAutomation(payload)
    if (!normalized) {
      throw new Error("Sunucudan gecersiz otomasyon cevabi dondu.")
    }
    return normalized
  }, [apiFetchAutomation, normalizeAutomation, readApiError])

  const updateAutomation = useCallback(async (id, title, backend) => {
    const res = await apiFetchAutomation(`/api/automations/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, backend }),
    })
    if (!res.ok) {
      const apiError = await readApiError(res)
      throw new Error(apiError || "Otomasyon guncellenemedi.")
    }
    const payload = await res.json()
    const normalized = normalizeAutomation(payload)
    if (!normalized) {
      throw new Error("Sunucudan gecersiz otomasyon cevabi dondu.")
    }
    return normalized
  }, [apiFetchAutomation, normalizeAutomation, readApiError])

  const removeAutomation = useCallback(async (id) => {
    const res = await apiFetchAutomation(`/api/automations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const apiError = await readApiError(res)
      throw new Error(apiError || "Otomasyon silinemedi.")
    }
  }, [apiFetchAutomation, readApiError])

  const runAutomation = (selected) => {
    if (!selected) return
    const backend = String(selected.backend ?? "").trim()
    if (!backend) {
      toast.error("Backend map bos olamaz.", { style: toastStyle, position: "top-right" })
      return
    }

    const baseWsUrl = String(savedWsUrl || wsUrl).trim()
    if (!baseWsUrl || !isValidWsUrl(baseWsUrl)) {
      toast.error("Once websocket adresini kaydedip baglanti kurun.", {
        style: toastStyle,
        position: "top-right",
      })
      return
    }

    const triggerUrl = buildSocketIoWsUrl(baseWsUrl, { backend })
    if (!triggerUrl) {
      toast.error("Otomasyon istegi icin websocket adresi olusturulamadi.", {
        style: toastStyle,
        position: "top-right",
      })
      return
    }

    const now = new Date()
    const time = now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setResultPopup((prev) => ({ ...prev, isOpen: false }))
    setIsRunning(true)
    toast("Otomasyon tetikleme istegi gonderildi", { style: toastStyle, position: "top-right" })
    setRunLog((prev) => [
      {
        id: `log-${Date.now()}`,
        time,
        status: "running",
        message: `${selected.title} tetikleniyor... backend=${backend}`,
      },
      ...prev,
    ])

    let settled = false
    let hasConnected = false
    let hasResult = false
    let socket = null
    let timeoutId = null

    const appendRunLog = (status, message) => {
      const entryTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setRunLog((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          time: entryTime,
          status,
          message,
        },
        ...prev,
      ])
    }

    const formatValue = (value) => {
      if (typeof value === "string") return value
      if (value === null || value === undefined) return ""
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }

    const resetTimeout = (ms = 20000) => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        if (hasResult) {
          complete("success", `${selected.title} tamamlandi.`)
          return
        }
        complete("error", `${selected.title} icin sonuc yaniti alinmadi (zaman asimi).`)
      }, ms)
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

    const complete = (status, message) => {
      if (settled) return
      settled = true
      if (timeoutId) window.clearTimeout(timeoutId)
      const doneTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setRunLog((prev) => [
        {
          id: `log-${Date.now()}-done`,
          time: doneTime,
          status,
          message,
        },
        ...prev,
      ])
      if (status === "success") {
        toast.success("Otomasyon tetiklendi", { style: toastStyle, position: "top-right" })
      } else {
        toast.error("Otomasyon tetiklenemedi", { style: toastStyle, position: "top-right" })
      }
      setIsRunning(false)
      try {
        socket?.close()
      } catch {
        // Ignore close errors.
      }
    }

    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      complete("error", `${selected.title} icin websocket baglantisi baslatilamadi.`)
      return
    }

    resetTimeout(15000)

    socket.addEventListener("message", (event) => {
      if (settled) return
      const payload = typeof event.data === "string" ? event.data : ""
      if (!payload) return

      const packets = payload.includes("\u001e")
        ? payload.split("\u001e").filter(Boolean)
        : [payload]

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
            complete("error", `${selected.title} icin Socket.IO connect paketi gonderilemedi.`)
          }
          continue
        }

        if (packet.startsWith("40")) {
          hasConnected = true
          resetTimeout(300000)
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            complete("success", `${selected.title} tamamlandi.`)
          } else {
            complete("error", `${selected.title} tamamlanmadan baglanti kapandi (sonuc yok).`)
          }
          return
        }

        if (packet.startsWith("44")) {
          complete("error", `${selected.title} tetiklenemedi. backend=${backend}`)
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue

        const eventName = eventPacket.event.toLowerCase()

        if (eventName === "script-triggered" || eventName === "script-started") {
          resetTimeout(300000)
          continue
        }

        if (eventName === "script-log") {
          resetTimeout(300000)
          continue
        }

        if (eventName === "sonuc") {
          const firstArg = eventPacket.args[0]
          const resultBackend = String(firstArg?.backend ?? backend).trim() || backend
          const rawValueText = formatValue(firstArg?.value)
          const valueText = rawValueText.slice(0, 500) || "-"
          appendRunLog("success", `${resultBackend} => ${valueText}`)
          setResultPopup({
            isOpen: true,
            title: selected.title,
            backend: resultBackend,
            value: rawValueText || "-",
          })
          hasResult = true
          complete("success", `${selected.title} tamamlandi.`)
          return
        }

        resetTimeout(300000)
      }
    })

    socket.addEventListener("error", () => {
      complete("error", `${selected.title} icin websocket baglanti hatasi olustu.`)
    })

    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        complete("success", `${selected.title} tamamlandi.`)
        return
      }
      if (hasConnected) {
        complete("error", `${selected.title} baglantisi acildi ancak sonuc gelmedi.`)
        return
      }
      complete("error", `${selected.title} icin websocket baglantisi kapandi.`)
    })
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

  const confirmModalContent = isConfirmOpen ? (
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

  const resultModalContent = resultPopup.isOpen ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/20 text-emerald-200">
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M7.629 13.314 4.486 10.17l-1.172 1.172 4.315 4.315L16.686 6.6l-1.172-1.172z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Islem Basarili
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {resultPopup.title || "Otomasyon"} tamamlandi.
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Sonuc: <span className="text-emerald-100">{resultPopup.backend || "-"}</span>
            </p>
          </div>
        </div>

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
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
            {resultPopup.value || "-"}
          </pre>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() =>
              setResultPopup((prev) => ({
                ...prev,
                isOpen: false,
              }))
            }
          >
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
                {selectedAutomation?.backend
                  ? `Backend map: ${selectedAutomation.backend}`
                  : "Backend map yok"}
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
                  id="automation-backend"
                  type="text"
                  placeholder="Backend map (orn: knife-crown)"
                  value={automationForm.backend}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, backend: event.target.value }))
                  }
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const title = automationForm.title.trim()
                    const backend = automationForm.backend.trim()
                    if (!title || !backend) return
                    try {
                      const created = await createAutomation(title, backend)
                      setAutomations((prev) => [created, ...prev])
                      setAutomationForm({ title: "", backend: "" })
                      toast.success("Otomasyon eklendi", { style: toastStyle, position: "top-right" })
                    } catch (error) {
                      toast.error(error?.message || "Otomasyon eklenemedi.", {
                        style: toastStyle,
                        position: "top-right",
                      })
                    }
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
                      backend: selected?.backend ?? "",
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
                  value={editingDraft.backend}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, backend: event.target.value }))
                  }
                  placeholder="Backend map (orn: knife-crown)"
                  className={fieldClass}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const title = editingDraft.title.trim()
                      const backend = editingDraft.backend.trim()
                      if (!editingId || !title || !backend) return
                      try {
                        const updated = await updateAutomation(editingId, title, backend)
                        setAutomations((prev) =>
                          prev.map((entry) => (entry.id === editingId ? updated : entry)),
                        )
                        toast.success("Otomasyon guncellendi", {
                          style: toastStyle,
                          position: "top-right",
                        })
                      } catch (error) {
                        toast.error(error?.message || "Otomasyon guncellenemedi.", {
                          style: toastStyle,
                          position: "top-right",
                        })
                      }
                    }}
                    className={primaryButtonClass}
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingId) return
                      try {
                        await removeAutomation(editingId)
                        setAutomations((prev) => prev.filter((entry) => entry.id !== editingId))
                        setEditingId("")
                        setEditingDraft({ title: "", backend: "" })
                        if (selectedAutomationId === editingId) setSelectedAutomationId("")
                        toast("Otomasyon silindi", { style: toastStyle, position: "top-right" })
                      } catch (error) {
                        toast.error(error?.message || "Otomasyon silinemedi.", {
                          style: toastStyle,
                          position: "top-right",
                        })
                      }
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

      {typeof document !== "undefined" && confirmModalContent
        ? createPortal(confirmModalContent, document.body)
        : null}
      {typeof document !== "undefined" && resultModalContent
        ? createPortal(resultModalContent, document.body)
        : null}
    </>
  )
}

