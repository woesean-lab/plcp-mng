import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"

const WS_CONNECTION_STATE_STORAGE_KEY = "pulcipAutomationWsConnectionState"
const MAX_RUN_LOG_ENTRIES = 300
const CMD_VISIBLE_ROWS = 15
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
  const [backendOptions, setBackendOptions] = useState([])
  const [backendListStatus, setBackendListStatus] = useState("idle")
  const [backendListMessage, setBackendListMessage] = useState(
    "Baglanti kuruldugunda backend map listesi alinacak.",
  )
  const [selectedBackendKey, setSelectedBackendKey] = useState("")
  const [runLog, setRunLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [confirmRunBackendKey, setConfirmRunBackendKey] = useState("")
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

  const selectedBackendOption = useMemo(
    () => backendOptions.find((item) => item.key === selectedBackendKey) ?? null,
    [backendOptions, selectedBackendKey],
  )

  const lastSuccess = useMemo(
    () => runLog.find((entry) => entry.status === "success") ?? null,
    [runLog],
  )
  const visibleRunLogEntries = useMemo(
    () => runLog.slice(0, CMD_VISIBLE_ROWS),
    [runLog],
  )
  const emptyRunLogRows = useMemo(
    () => Math.max(0, CMD_VISIBLE_ROWS - visibleRunLogEntries.length),
    [visibleRunLogEntries.length],
  )

  const backendSelectOptions = useMemo(() => {
    const seen = new Set()
    const merged = []

    const pushOption = (key, label) => {
      const normalizedKey = String(key ?? "").trim()
      if (!normalizedKey || seen.has(normalizedKey)) return
      seen.add(normalizedKey)
      merged.push({
        key: normalizedKey,
        label: String(label ?? normalizedKey).trim() || normalizedKey,
      })
    }

    backendOptions.forEach((item) => pushOption(item?.key, item?.label))

    return merged
  }, [backendOptions])

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

  const normalizeBackendOption = useCallback((entry) => {
    if (typeof entry === "string") {
      const key = entry.trim()
      if (!key) return null
      return { key, label: key }
    }
    const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? "").trim()
    if (!key) return null
    const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
    return { key, label }
  }, [])

  const normalizeRunLogEntry = useCallback((entry) => {
    const id = String(entry?.id ?? "").trim()
    const time = String(entry?.time ?? "").trim()
    const status = String(entry?.status ?? "").trim()
    const message = String(entry?.message ?? "").trim()
    if (!id || !time || !status || !message) return null
    return { id, time, status, message }
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

  const prependRunLogEntry = useCallback((entry) => {
    const normalized = normalizeRunLogEntry(entry)
    if (!normalized) return
    setRunLog((prev) => [normalized, ...prev].slice(0, MAX_RUN_LOG_ENTRIES))
    void persistRunLogEntry(normalized)
  }, [normalizeRunLogEntry, persistRunLogEntry])

  const clearRunLogs = useCallback(async () => {
    try {
      const res = await apiFetchAutomation("/api/automation/logs", {
        method: "DELETE",
      })
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
      try {
        const [configRes, logsRes] = await Promise.all([
          apiFetchAutomation("/api/automation/config", {
            signal: controller.signal,
          }),
          apiFetchAutomation("/api/automation/logs", {
            signal: controller.signal,
          }),
        ])
        if (!configRes.ok) {
          const apiError = await readApiError(configRes)
          throw new Error(apiError || "Websocket ayarlari alinamadi.")
        }

        const configPayload = await configRes.json()
        let logsPayload = []
        if (logsRes.ok) {
          logsPayload = await logsRes.json()
        } else {
          logsPayload = []
        }
        if (!isMounted) return

        const configWsUrl = String(configPayload?.wsUrl ?? "").trim()
        setWsUrl(configWsUrl)
        setSavedWsUrl(configWsUrl)
        const configBackendOptions = Array.isArray(configPayload?.backendOptions)
          ? configPayload.backendOptions.map(normalizeBackendOption).filter(Boolean)
          : Array.isArray(configPayload?.backendMaps)
            ? configPayload.backendMaps.map(normalizeBackendOption).filter(Boolean)
            : []
        setBackendOptions(configBackendOptions)
        if (configBackendOptions.length > 0) {
          setBackendListStatus("success")
          setBackendListMessage(`${configBackendOptions.length} backend map hazir.`)
        } else {
          setBackendListStatus("idle")
          setBackendListMessage("Baglanti kuruldugunda backend map listesi alinacak.")
        }

        const normalizedLogs = Array.isArray(logsPayload)
          ? logsPayload.map(normalizeRunLogEntry).filter(Boolean).slice(0, MAX_RUN_LOG_ENTRIES)
          : []
        setRunLog(normalizedLogs)
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
  }, [apiFetchAutomation, normalizeBackendOption, normalizeRunLogEntry, readApiError, toastStyle])

  useEffect(() => {
    if (backendSelectOptions.length === 0) return
    if (selectedBackendKey && backendSelectOptions.some((item) => item.key === selectedBackendKey)) {
      return
    }
    setSelectedBackendKey(backendSelectOptions[0].key)
  }, [backendSelectOptions, selectedBackendKey])

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

  const extractBackendItems = useCallback((payload) => {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.items)) return payload.items
      if (Array.isArray(payload.backends)) return payload.backends
      if (Array.isArray(payload.data)) return payload.data
      return Object.entries(payload).map(([key, value]) => ({
        key,
        label: String(value?.label ?? key).trim() || key,
      }))
    }
    return []
  }, [])

  const fetchBackendMapsFromSocketIo = useCallback((socketIoUrl) =>
    new Promise((resolve) => {
      let settled = false
      let socket = null
      let timeoutId = null
      let requestSent = false
      let hasConnected = false

      const finish = (result) => {
        if (settled) return
        settled = true
        if (timeoutId) window.clearTimeout(timeoutId)
        try {
          socket?.close()
        } catch {
          // Ignore close errors.
        }
        resolve(result)
      }

      try {
        socket = new WebSocket(socketIoUrl)
      } catch {
        finish({ ok: false, reason: "invalid_url", items: [] })
        return
      }

      timeoutId = window.setTimeout(() => {
        finish({ ok: false, reason: "timeout", items: [] })
      }, 7000)

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
              finish({ ok: false, reason: "socketio_connect_send_failed", items: [] })
            }
            continue
          }

          if (packet.startsWith("40")) {
            hasConnected = true
            if (!requestSent) {
              requestSent = true
              try {
                socket.send('42["backend-map-list:get"]')
              } catch {
                finish({ ok: false, reason: "request_send_failed", items: [] })
              }
            }
            continue
          }

          if (packet.startsWith("44")) {
            finish({ ok: false, reason: "request_rejected", items: [] })
            return
          }

          const eventPacket = parseSocketIoEventPacket(packet)
          if (!eventPacket) continue

          const eventName = eventPacket.event.toLowerCase()
          if (
            eventName !== "backend-map-list" &&
            eventName !== "backend-map-list:result" &&
            eventName !== "backends:list" &&
            eventName !== "backends-list"
          ) {
            continue
          }

          const itemsRaw = extractBackendItems(eventPacket.args[0])
          const normalized = itemsRaw.map(normalizeBackendOption).filter(Boolean)
          finish({ ok: true, reason: "received", items: normalized })
          return
        }
      })

      socket.addEventListener("error", () => {
        finish({ ok: false, reason: "socket_error", items: [] })
      })

      socket.addEventListener("close", () => {
        if (settled) return
        finish({
          ok: false,
          reason: hasConnected ? "closed_before_list" : "closed",
          items: [],
        })
      })
    }), [extractBackendItems, normalizeBackendOption])

  const persistBackendOptions = useCallback(async (options) => {
    const normalized = Array.isArray(options)
      ? options.map(normalizeBackendOption).filter(Boolean)
      : []
    try {
      const res = await apiFetchAutomation("/api/automation/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ backendOptions: normalized }),
      })
      if (!res.ok) {
        // Ignore API-level errors; keep local UI responsive.
      }
    } catch {
      // Ignore persistence errors; keep local UI responsive.
    }
  }, [apiFetchAutomation, normalizeBackendOption])

  const refreshBackendMaps = useCallback(async (options = {}) => {
    const normalized = String(options?.targetUrl ?? savedWsUrl ?? wsUrl).trim()
    const silent = Boolean(options?.silent)

    if (!normalized || !isValidWsUrl(normalized)) {
      setBackendListStatus("error")
      setBackendListMessage("Backend map icin gecerli websocket adresi gerekli.")
      if (!silent) {
        toast.error("Backend map listesi alinamadi: websocket adresi gecersiz.", {
          style: toastStyle,
          position: "top-right",
        })
      }
      return false
    }

    const socketIoUrl = buildSocketIoWsUrl(normalized)
    if (!socketIoUrl) {
      setBackendListStatus("error")
      setBackendListMessage("Backend map icin Socket.IO adresi olusturulamadi.")
      if (!silent) {
        toast.error("Backend map listesi alinamadi: Socket.IO adresi gecersiz.", {
          style: toastStyle,
          position: "top-right",
        })
      }
      return false
    }

    setBackendListStatus("loading")
    setBackendListMessage("Backend map listesi aliniyor...")

    const result = await fetchBackendMapsFromSocketIo(socketIoUrl)
    if (!result.ok) {
      setBackendListStatus("error")
      setBackendListMessage("Backend map listesi alinamadi.")
      if (!silent) {
        toast.error("Backend map listesi alinamadi.", { style: toastStyle, position: "top-right" })
      }
      return false
    }

    const normalizedItems = Array.isArray(result.items) ? result.items : []
    if (normalizedItems.length === 0) {
      setBackendListStatus("error")
      setBackendListMessage("Sunucu backend map listesi bos dondu.")
      if (!silent) {
        toast.error("Backend map listesi bos dondu.", { style: toastStyle, position: "top-right" })
      }
      return false
    }

    setBackendOptions(normalizedItems)
    void persistBackendOptions(normalizedItems)
    setBackendListStatus("success")
    setBackendListMessage(`${normalizedItems.length} backend map alindi.`)
    if (!silent) {
      toast.success("Backend map listesi guncellendi.", { style: toastStyle, position: "top-right" })
    }
    return true
  }, [
    buildSocketIoWsUrl,
    fetchBackendMapsFromSocketIo,
    isValidWsUrl,
    persistBackendOptions,
    savedWsUrl,
    toastStyle,
    wsUrl,
  ])

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
        await refreshBackendMaps({ targetUrl: normalized, silent: true })
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
    refreshBackendMaps,
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
        label: "Baglanti yok",
      }
    }
    if (wsTestStatus === "success") {
      return {
        dot: "bg-emerald-400",
        badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-100",
        label: "Baglanildi",
      }
    }
    if (wsTestStatus === "testing") {
      return {
        dot: "bg-amber-300",
        badge: "border-amber-300/50 bg-amber-500/15 text-amber-100",
        label: "Baglaniyor",
      }
    }
    if (wsTestStatus === "idle") {
      return {
        dot: "bg-slate-400",
        badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
        label: "Baglanilmadi",
      }
    }
    if (!isCurrentUrlTested) {
      return {
        dot: "bg-slate-400",
        badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
        label: "Baglanilmadi",
      }
    }
    return {
      dot: "bg-rose-400",
      badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
      label: "Baglanti hatasi",
    }
  })()

  const backendStatusMeta = (() => {
    if (backendListStatus === "success") {
      return {
        badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-100",
        label: "Map hazir",
      }
    }
    if (backendListStatus === "loading") {
      return {
        badge: "border-amber-300/50 bg-amber-500/15 text-amber-100",
        label: "Map aliniyor",
      }
    }
    if (backendListStatus === "error") {
      return {
        badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
        label: "Map hatasi",
      }
    }
    return {
      badge: "border-slate-300/40 bg-slate-500/10 text-slate-200",
      label: "Map bekleniyor",
    }
  })()

  const handleWsUrlChange = (event) => {
    const nextValue = event.target.value
    setWsUrl(nextValue)
    setBackendListStatus("idle")
    setBackendListMessage("Bu adres icin backend map listesi alinmadi.")
    setBackendOptions([])
    if (nextValue.trim() !== lastTestedWsUrl) {
      setLastTestedWsUrl("")
      setWsTestStatus("idle")
      const message = "Bu adres için bağlantı kurulmadı."
      setWsTestMessage(message)
      persistWsConnectionState("", "idle", message)
    }
  }

  const runAutomation = (selectedOption) => {
    if (!selectedOption) return
    const backend = String(selectedOption.key ?? "").trim()
    const selectedName =
      String(selectedOption.label ?? "").trim() || String(selectedOption.key ?? "").trim() || "Otomasyon"
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
    prependRunLogEntry({
      id: `log-${Date.now()}`,
      time,
      status: "running",
      message: `${selectedName} tetikleniyor... backend=${backend}`,
    })

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
      prependRunLogEntry({
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: entryTime,
        status,
        message,
      })
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
          complete("success", `${selectedName} tamamlandi.`)
          return
        }
        complete("error", `${selectedName} icin sonuc yaniti alinmadi (zaman asimi).`)
      }, ms)
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      if (timeoutId) window.clearTimeout(timeoutId)
      const doneTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      prependRunLogEntry({
        id: `log-${Date.now()}-done`,
        time: doneTime,
        status,
        message,
      })
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
      complete("error", `${selectedName} icin websocket baglantisi baslatilamadi.`)
      return
    }

    resetTimeout(15000)

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
            complete("error", `${selectedName} icin Socket.IO connect paketi gonderilemedi.`)
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
            complete("success", `${selectedName} tamamlandi.`)
          } else {
            complete("error", `${selectedName} tamamlanmadan baglanti kapandi (sonuc yok).`)
          }
          return
        }

        if (packet.startsWith("44")) {
          complete("error", `${selectedName} tetiklenemedi. backend=${backend}`)
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
            title: selectedName,
            backend: resultBackend,
            value: rawValueText || "-",
          })
          hasResult = true
          complete("success", `${selectedName} tamamlandi.`)
          return
        }

        resetTimeout(300000)
      }
    })

    socket.addEventListener("error", () => {
      complete("error", `${selectedName} icin websocket baglanti hatasi olustu.`)
    })

    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        complete("success", `${selectedName} tamamlandi.`)
        return
      }
      if (hasConnected) {
        complete("error", `${selectedName} baglantisi acildi ancak sonuc gelmedi.`)
        return
      }
      complete("error", `${selectedName} icin websocket baglantisi kapandi.`)
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
  const wsActionButtonBaseClass =
    "w-full min-w-0 rounded-lg px-1.5 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.04em] transition sm:text-[10px]"
  const wsActionPrimaryButtonClass =
    `${wsActionButtonBaseClass} border border-emerald-300/60 bg-emerald-500/15 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60`
  const wsActionSecondaryButtonClass =
    `${wsActionButtonBaseClass} border border-white/15 bg-white/[0.06] text-slate-200 hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60`

  const confirmModalContent = isConfirmOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Onay</p>
        <p className="mt-2 text-base font-semibold text-white">Backend map calistirilsin mi?</p>
        <p className="mt-2 text-sm text-slate-300">
          {backendOptions.find((item) => item.key === confirmRunBackendKey)?.label ??
            confirmRunBackendKey}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              const selected = backendOptions.find((item) => item.key === confirmRunBackendKey)
              setIsConfirmOpen(false)
              setConfirmRunBackendKey("")
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
              setConfirmRunBackendKey("")
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
                Stok çek
              </span>
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Stok çek
              </h1>
              <p className="max-w-2xl text-sm text-slate-200/80">
                Stok cek sec, calistir ve ciktilari tek alanda takip et.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Toplam: {backendOptions.length}
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
                value={selectedBackendKey}
                onChange={(event) => setSelectedBackendKey(event.target.value)}
                className={fieldClass}
              >
                <option value="">Backend map sec</option>
                {backendOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedBackendKey || isRunning}
                onClick={() => {
                  if (!selectedBackendKey || isRunning) return
                  setConfirmRunBackendKey(selectedBackendKey)
                  setIsConfirmOpen(true)
                }}
                className={`min-w-[130px] ${primaryButtonClass}`}
              >
                {isRunning ? "Calisiyor..." : "Calistir"}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Secili Backend Map</p>
              <p className="mt-1 truncate text-sm text-slate-100">
                {selectedBackendOption?.label ?? "Secim yok"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {selectedBackendOption?.key
                  ? `Backend key: ${selectedBackendOption.key}`
                  : "Backend key yok"}
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
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {runLog.length} satir
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void clearRunLogs()
                    }}
                    disabled={runLog.length === 0}
                    className="rounded border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Loglari temizle
                  </button>
                </div>
              </div>

              <div className="no-scrollbar h-[384px] overflow-auto px-3 py-3 font-mono text-[12px] leading-6">
                <div className="space-y-0.5">
                  {visibleRunLogEntries.map((entry) => (
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
                  {Array.from({ length: emptyRunLogRows }).map((_, index) => (
                    <div key={`empty-row-${index}`} className="flex items-start gap-2 text-slate-600/80">
                      <span className="flex-none text-slate-600">C:\plcp\automation&gt;</span>
                      {isRunning && index === 0 ? (
                        <span className="inline-block h-4 w-2 animate-pulse bg-slate-500/80" />
                      ) : (
                        <span
                          className={`min-w-0 ${
                            runLog.length === 0 && index === 0 ? "text-slate-500" : "opacity-0"
                          }`}
                        >
                          {runLog.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Websocket
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Proxy adresini kaydet, baglan ve backend mapleri cek.
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${wsStatusMeta.badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${wsStatusMeta.dot}`} />
                  {wsStatusMeta.label}
                </span>
              </div>

              <div className="mt-2.5 space-y-2">
                <label
                  htmlFor="ws-url"
                  className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Sunucu adresi
                </label>
                <input
                  id="ws-url"
                  type="text"
                  placeholder="wss://ornek.com/ws"
                  value={wsUrl}
                  onChange={handleWsUrlChange}
                  className={`${fieldClass} !bg-ink-950/80 !px-3 !py-2 !text-xs`}
                />
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                <button type="button" onClick={saveWsUrl} className={wsActionSecondaryButtonClass}>
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={connectSocketIo}
                  disabled={isWsTesting}
                  className={wsActionPrimaryButtonClass}
                >
                  {isWsTesting ? "Baglaniyor..." : "Baglan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void refreshBackendMaps({ silent: false })
                  }}
                  disabled={backendListStatus === "loading" || wsTestStatus !== "success"}
                  className={wsActionSecondaryButtonClass}
                >
                  {backendListStatus === "loading" ? "Map aliniyor..." : "Mapleri cek"}
                </button>
              </div>

              <div className="mt-2.5 border-t border-white/10 pt-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Kayitli adres
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-slate-200">{savedWsUrl || "-"}</p>
                <p className="mt-2 text-[10px] text-slate-300">{wsTestMessage}</p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">{backendListMessage}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${backendStatusMeta.badge}`}
                  >
                    {backendStatusMeta.label}
                  </span>
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






