import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY, PERMISSION_GROUPS } from "../../constants/appConstants"

const WS_CONNECTION_STATE_STORAGE_KEY = "pulcipAutomationWsConnectionState"
const DEFAULT_WS_MESSAGE = "Henuz baglanti kurulmadI."
const DEFAULT_TOAST_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#e2e8f0",
  border: "1px solid rgba(148, 163, 184, 0.2)",
}

const readStoredWsConnectionState = () => {
  if (typeof window === "undefined") {
    return { status: "idle", message: DEFAULT_WS_MESSAGE, url: "" }
  }
  try {
    const raw = localStorage.getItem(WS_CONNECTION_STATE_STORAGE_KEY)
    if (!raw) return { status: "idle", message: DEFAULT_WS_MESSAGE, url: "" }
    const parsed = JSON.parse(raw)
    const status = String(parsed?.status ?? "").trim()
    const message = String(parsed?.message ?? "").trim()
    const url = String(parsed?.url ?? "").trim()
    if (!["idle", "success", "error"].includes(status)) {
      return { status: "idle", message: DEFAULT_WS_MESSAGE, url: "" }
    }
    return {
      status,
      message: message || DEFAULT_WS_MESSAGE,
      url,
    }
  } catch {
    return { status: "idle", message: DEFAULT_WS_MESSAGE, url: "" }
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

function AdminSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-56 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export default function AdminTab({
  isLoading,
  panelClass,
  canManageRoles,
  canManageUsers,
  activeUser,
  roles,
  users,
  roleDraft,
  setRoleDraft,
  userDraft,
  setUserDraft,
  confirmRoleDelete,
  confirmUserDelete,
  handleRoleEditStart,
  handleRoleEditCancel,
  toggleRolePermission,
  handleRoleSave,
  handleRoleDeleteWithConfirm,
  handleUserEditStart,
  handleUserEditCancel,
  handleUserSave,
  handleUserDeleteWithConfirm,
}) {
  const isRoleEditing = Boolean(roleDraft?.id)
  const isUserEditing = Boolean(userDraft?.id)
  const toastStyle = DEFAULT_TOAST_STYLE
  const [wsUrl, setWsUrl] = useState("")
  const [savedWsUrl, setSavedWsUrl] = useState("")
  const [wsTestStatus, setWsTestStatus] = useState(() => readStoredWsConnectionState().status)
  const [wsTestMessage, setWsTestMessage] = useState(() => readStoredWsConnectionState().message)
  const [lastTestedWsUrl, setLastTestedWsUrl] = useState(() => readStoredWsConnectionState().url)
  const [isWsTesting, setIsWsTesting] = useState(false)
  const [backendListStatus, setBackendListStatus] = useState("idle")
  const [backendListMessage, setBackendListMessage] = useState(
    "Baglanti kuruldugunda backend map listesi alinacak.",
  )
  const wsSocketRef = useRef(null)
  const hasAutoConnectedRef = useRef(false)

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
          message: String(message ?? "").trim() || DEFAULT_WS_MESSAGE,
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

  const normalizeBackendKind = useCallback(
    (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    [],
  )

  const normalizeBackendOption = useCallback((entry) => {
    if (typeof entry === "string") {
      const key = entry.trim()
      if (!key) return null
      return { key, label: key, kind: "" }
    }
    const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? "").trim()
    if (!key) return null
    const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
    const kind = normalizeBackendKind(entry?.kind ?? entry?.group ?? entry?.type)
    return { key, label, kind }
  }, [normalizeBackendKind])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadConfig = async () => {
      try {
        const res = await apiFetchAutomation("/api/automation/config", {
          signal: controller.signal,
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Websocket ayarlari alinamadi.")
        }
        const payload = await res.json()
        if (!isMounted) return

        const configWsUrl = String(payload?.wsUrl ?? "").trim()
        setWsUrl(configWsUrl)
        setSavedWsUrl(configWsUrl)

        const backendOptions = Array.isArray(payload?.backendOptions)
          ? payload.backendOptions.map(normalizeBackendOption).filter(Boolean)
          : Array.isArray(payload?.backendMaps)
            ? payload.backendMaps.map(normalizeBackendOption).filter(Boolean)
            : []

        if (backendOptions.length > 0) {
          setBackendListStatus("success")
          setBackendListMessage(`${backendOptions.length} backend map hazir.`)
        } else {
          setBackendListStatus("idle")
          setBackendListMessage("Baglanti kuruldugunda backend map listesi alinacak.")
        }
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Websocket ayarlari alinamadi.", {
          style: toastStyle,
          position: "top-right",
        })
      }
    }

    loadConfig()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [apiFetchAutomation, normalizeBackendOption, readApiError, toastStyle])

  const isValidWsUrl = useCallback((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === "ws:" || parsed.protocol === "wss:"
    } catch {
      return false
    }
  }, [])

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
        label: String(value?.label ?? value?.name ?? value ?? key).trim() || key,
        kind: normalizeBackendKind(value?.kind ?? value?.group ?? value?.type),
      }))
    }
    return []
  }, [normalizeBackendKind])

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
        toast.error("Gecerli bir ws/wss adresi girin.", { style: toastStyle, position: "top-right" })
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
    setWsTestMessage("Socket.IO baglantisi kuruluyor...")
    const socketIoUrl = buildSocketIoWsUrl(normalized)
    if (!socketIoUrl) {
      setIsWsTesting(false)
      setWsTestStatus("error")
      const message = "Socket.IO baglanti adresi olusturulamadi."
      setWsTestMessage(message)
      setLastTestedWsUrl(normalized)
      persistWsConnectionState(normalized, "error", message)
      if (!silent) {
        toast.error("Socket.IO adresi gecersiz.", { style: toastStyle, position: "top-right" })
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
          toast.success("Websocket baglantisi basarili", { style: toastStyle, position: "top-right" })
        }
      } else if (!silent) {
        toast.error("Websocket baglantisi basarisiz", { style: toastStyle, position: "top-right" })
      }
    }

    void (async () => {
      const result = await testSocketIoConnection(socketIoUrl)
      if (result.ok) {
        await refreshBackendMaps({ targetUrl: normalized, silent: true })
        complete("success", "Baglanti basarili (Socket.IO).")
        return
      }

      complete(
        "error",
        "Socket.IO baglantisi kurulamadi. /socket.io ve CORS ayarlarini kontrol edin.",
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

  const saveWsUrl = useCallback(async () => {
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
  }, [
    apiFetchAutomation,
    isValidWsUrl,
    lastTestedWsUrl,
    persistWsConnectionState,
    readApiError,
    toastStyle,
    wsTestMessage,
    wsTestStatus,
    wsUrl,
  ])

  const handleWsUrlChange = useCallback((event) => {
    const nextValue = event.target.value
    setWsUrl(nextValue)
    setBackendListStatus("idle")
    setBackendListMessage("Bu adres icin backend map listesi alinmadi.")
    if (nextValue.trim() !== lastTestedWsUrl) {
      setLastTestedWsUrl("")
      setWsTestStatus("idle")
      const message = "Bu adres icin baglanti kurulmadI."
      setWsTestMessage(message)
      persistWsConnectionState("", "idle", message)
    }
  }, [lastTestedWsUrl, persistWsConnectionState])

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
  const wsFieldClass =
    "w-full rounded-lg border border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 hover:border-white/20"
  const wsActionButtonBaseClass =
    "w-full min-w-0 rounded-lg px-1.5 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.04em] transition sm:text-[10px]"
  const wsActionPrimaryButtonClass =
    `${wsActionButtonBaseClass} border border-emerald-300/60 bg-emerald-500/15 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60`
  const wsActionSecondaryButtonClass =
    `${wsActionButtonBaseClass} border border-white/15 bg-white/[0.06] text-slate-200 hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60`

  if (isLoading) {
    return <AdminSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Kullanici ve Rol Yonetimi
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Rolleri tanimla, yetkileri tikla ve kullanicilara ata.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageRoles && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Roller: {roles.length}
              </span>
            )}
            {canManageUsers && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Kullanicilar: {users.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canManageRoles && (
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  {isRoleEditing ? "Rol duzenle" : "Yeni rol"}
                </p>
                <p className="text-sm text-slate-400">Rol adi ve yetkiler.</p>
              </div>
              {isRoleEditing && (
                <button
                  type="button"
                  onClick={handleRoleEditCancel}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                >
                  Iptal
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="role-name">
                  Rol adi
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={roleDraft.name}
                  onChange={(e) => setRoleDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Orn: Destek"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-xl border border-white/10 bg-ink-900/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {group.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const isActive = roleDraft.permissions.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                              isActive
                                ? "border-accent-300 bg-accent-500/20 text-accent-50"
                                : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300/60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleRolePermission(item.id)}
                              className="h-3.5 w-3.5 rounded border-white/30 bg-transparent text-accent-400 focus:ring-accent-400/50"
                            />
                            {item.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRoleSave}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                {isRoleEditing ? "Rol guncelle" : "Rol ekle"}
              </button>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Roller</p>
            <div className="mt-4 space-y-3">
              {roles.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Rol bulunamadi.
                </div>
              )}
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{role.name}</p>
                    <p className="text-xs text-slate-400">{role.permissions.length} yetki</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleEditStart(role)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleDeleteWithConfirm(role.id)}
                      className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                        confirmRoleDelete === role.id
                          ? "border-rose-300 bg-rose-500/25 text-rose-50"
                          : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {confirmRoleDelete === role.id ? "Emin misin?" : "Sil"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {canManageUsers && (
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  {isUserEditing ? "Kullanici duzenle" : "Yeni kullanici"}
                </p>
                <p className="text-sm text-slate-400">Kullanici adi, sifre ve rol.</p>
              </div>
              {isUserEditing && (
                <button
                  type="button"
                  onClick={handleUserEditCancel}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                >
                  Iptal
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-name">
                  Kullanici adi
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={userDraft.username}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Orn: ayse"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-password">
                  Sifre {isUserEditing ? "(bos birakilirsa degismez)" : ""}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={userDraft.password}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={isUserEditing ? "Yeni sifre" : "Sifre"}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-role">
                  Rol
                </label>
                <select
                  id="user-role"
                  value={userDraft.roleId}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, roleId: e.target.value }))}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                >
                  <option value="">Rol secin</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleUserSave}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                {isUserEditing ? "Kullanici guncelle" : "Kullanici ekle"}
              </button>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kullanicilar</p>
            <div className="mt-4 space-y-3">
              {users.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Kullanici bulunamadi.
                </div>
              )}
              {users.map((user) => {
                const isCurrent = activeUser?.id === user.id
                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{user.username}</p>
                      <p className="text-xs text-slate-400">
                        {user.role?.name || "Rol yok"}
                        {isCurrent ? " · aktif" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUserEditStart(user)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                      >
                        Duzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUserDeleteWithConfirm(user.id)}
                        disabled={isCurrent}
                        className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          confirmUserDelete === user.id
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {confirmUserDelete === user.id ? "Emin misin?" : "Sil"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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
                htmlFor="admin-ws-url"
                className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500"
              >
                Sunucu adresi
              </label>
              <input
                id="admin-ws-url"
                type="text"
                placeholder="wss://ornek.com/ws"
                value={wsUrl}
                onChange={handleWsUrlChange}
                className={`${wsFieldClass} !bg-ink-950/80 !px-3 !py-2 !text-xs`}
              />
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={() => { void saveWsUrl() }} className={wsActionSecondaryButtonClass}>
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => { connectSocketIo() }}
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
        </div>
        )}
      </div>
    </div>
  )
}
