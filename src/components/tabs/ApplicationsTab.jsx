import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
} from "../../utils/socketIoClient"

const CMD_VISIBLE_ROWS = 14
const MAX_LOG_ENTRIES = 300
const MASKED_BACKEND_TEXT = "******"

const normalizeBackendKind = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

const isApplicationBackendKind = (value) => {
  const normalized = normalizeBackendKind(value)
  return normalized === "uygulama" || normalized === "servis"
}

const formatLogTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

const normalizeEventMessage = (value) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const normalizePromptOptions = (value) => {
  const raw = Array.isArray(value) ? value : []
  return raw
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const optionValue = String(entry.value ?? entry.key ?? "").trim()
        const optionLabel = String(entry.label ?? entry.name ?? optionValue).trim() || optionValue
        if (!optionValue) return null
        return { value: optionValue, label: optionLabel }
      }
      const normalized = String(entry ?? "").trim()
      if (!normalized) return null
      return { value: normalized, label: normalized }
    })
    .filter(Boolean)
}

const normalizeInputType = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "choice" || normalized === "confirm" || normalized === "text") return normalized
  return "text"
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ApplicationsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-3 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-full" />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/65 lg:col-span-2">
          <SkeletonBlock className="m-3 h-8 w-[220px] rounded-lg" />
          <SkeletonBlock className="m-3 mt-0 h-10 w-auto rounded-lg" />
          <SkeletonBlock className="m-3 mt-0 h-[320px] w-auto rounded-xl" />
        </section>

        <section className={`${panelClass} bg-ink-900/60 lg:col-span-1`}>
          <SkeletonBlock className="h-4 w-36 rounded-full" />
          <SkeletonBlock className="mt-4 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-20 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-3 h-10 w-24 rounded-lg" />
        </section>
      </div>
    </div>
  )
}

export default function ApplicationsTab({
  panelClass = "",
  isLoading = false,
  backendOptions = [],
  automationWsUrl = "",
  activeUsername = "",
  canManageApplications = false,
  canRunApplications = false,
  canViewApplicationLogs = false,
  canClearApplicationLogs = false,
  canViewApplicationBackendMap = false,
}) {
  const [appNameDraft, setAppNameDraft] = useState("")
  const [appAboutDraft, setAppAboutDraft] = useState("")
  const [backendDraft, setBackendDraft] = useState("")
  const [applications, setApplications] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState("")
  const [editingApplicationId, setEditingApplicationId] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [connectionState, setConnectionState] = useState("idle")
  const [runLogsByApplication, setRunLogsByApplication] = useState({})
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(true)
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [pendingUserInput, setPendingUserInput] = useState(null)
  const [pendingUserInputValue, setPendingUserInputValue] = useState("")
  const activeSocketRef = useRef(null)
  const activeRunApplicationIdRef = useRef("")
  const completeActiveRunRef = useRef(null)
  const canAccessApplications =
    canManageApplications || canRunApplications || canViewApplicationLogs || canClearApplicationLogs

  const getBackendLabelForDisplay = useCallback(
    (value) => {
      const normalized = String(value ?? "").trim()
      if (!normalized) return MASKED_BACKEND_TEXT
      return canViewApplicationBackendMap ? normalized : MASKED_BACKEND_TEXT
    },
    [canViewApplicationBackendMap],
  )

  const normalizeApplicationEntry = useCallback((entry) => {
    const id = String(entry?.id ?? "").trim()
    const name = String(entry?.name ?? "").trim()
    const about = String(entry?.about ?? "").trim()
    const backendKey = String(entry?.backendKey ?? "").trim()
    if (!id || !name || !about || !backendKey) return null
    const backendLabel = String(entry?.backendLabel ?? backendKey).trim() || backendKey
    const createdAtRaw = Date.parse(String(entry?.createdAt ?? "").trim())
    const createdAtMs = Number.isFinite(createdAtRaw) ? createdAtRaw : 0
    return { id, name, about, backendKey, backendLabel, createdAtMs, isActive: Boolean(entry?.isActive) }
  }, [])

  const normalizeApplicationLogEntry = useCallback((entry) => {
    const id = String(entry?.id ?? "").trim()
    const time = String(entry?.time ?? "").trim()
    const status = String(entry?.status ?? "").trim()
    const message = String(entry?.message ?? "").trim()
    if (!id || !time || !status || !message) return null
    return { id, time, status, message }
  }, [])

  const applicationBackendOptions = useMemo(() => {
    const raw = Array.isArray(backendOptions) ? backendOptions : []
    const seen = new Set()
    return raw
      .map((entry) => {
        const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? "").trim()
        if (!key || seen.has(key)) return null
        seen.add(key)
        const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
        const kind = normalizeBackendKind(entry?.kind ?? entry?.group ?? entry?.type)
        return { key, label, kind }
      })
      .filter(Boolean)
      .filter((entry) => isApplicationBackendKind(entry.kind))
  }, [backendOptions])

  const backendMaskTokens = useMemo(() => {
    const tokenSet = new Set()
    applicationBackendOptions.forEach((entry) => {
      const label = String(entry?.label ?? "").trim()
      const key = String(entry?.key ?? "").trim()
      if (label) tokenSet.add(label)
      if (key) tokenSet.add(key)
    })
    applications.forEach((entry) => {
      const backendLabel = String(entry?.backendLabel ?? "").trim()
      const backendKey = String(entry?.backendKey ?? "").trim()
      if (backendLabel) tokenSet.add(backendLabel)
      if (backendKey) tokenSet.add(backendKey)
    })
    return Array.from(tokenSet).sort((a, b) => b.length - a.length)
  }, [applicationBackendOptions, applications])

  const sanitizeLogMessage = useCallback(
    (value) => {
      const message = String(value ?? "")
      if (!message || canViewApplicationBackendMap) return message
      return backendMaskTokens.reduce(
        (acc, token) => (token ? acc.split(token).join(MASKED_BACKEND_TEXT) : acc),
        message,
      )
    },
    [backendMaskTokens, canViewApplicationBackendMap],
  )

  useEffect(() => {
    if (applicationBackendOptions.length === 0) {
      setBackendDraft("")
      return
    }
    if (!backendDraft || !applicationBackendOptions.some((entry) => entry.key === backendDraft)) {
      setBackendDraft(applicationBackendOptions[0].key)
    }
  }, [applicationBackendOptions, backendDraft])

  const closeActiveSocket = useCallback(() => {
    const socket = activeSocketRef.current
    if (socket) {
      try {
        socket.close()
      } catch {
        // Ignore close errors.
      }
    }
    activeSocketRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      closeActiveSocket()
    }
  }, [closeActiveSocket])

  const apiFetchApplications = useCallback(async (input, init = {}) => {
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

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadApplications = async () => {
      if (!canAccessApplications) {
        setApplications([])
        setRunLogsByApplication({})
        setIsApplicationsLoading(false)
        return
      }

      setIsApplicationsLoading(true)
      try {
        const res = await apiFetchApplications("/api/applications", {
          signal: controller.signal,
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis listesi alinamadi.")
        }
        const payload = await res.json()
        if (!isMounted) return
        const normalized = Array.isArray(payload)
          ? payload.map(normalizeApplicationEntry).filter(Boolean)
          : []
        setApplications(normalized)
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Servis listesi alinamadi.")
      } finally {
        if (isMounted) setIsApplicationsLoading(false)
      }
    }

    void loadApplications()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [apiFetchApplications, canAccessApplications, normalizeApplicationEntry, readApiError])

  const runDropdownApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const timeDiff = Number(a?.createdAtMs ?? 0) - Number(b?.createdAtMs ?? 0)
      if (timeDiff !== 0) return timeDiff
      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "tr")
    })
  }, [applications])

  useEffect(() => {
    if (runDropdownApplications.length === 0) {
      setSelectedApplicationId("")
      return
    }
    if (!selectedApplicationId || !runDropdownApplications.some((entry) => entry.id === selectedApplicationId)) {
      setSelectedApplicationId(runDropdownApplications[0].id)
    }
  }, [runDropdownApplications, selectedApplicationId])

  const selectedApplication = useMemo(
    () => applications.find((entry) => entry.id === selectedApplicationId) || null,
    [applications, selectedApplicationId],
  )

  const normalizeUserInputPrompt = useCallback(
    (payload, backend) => {
      const inputType = normalizeInputType(payload?.inputType)
      const message =
        String(payload?.message ?? "").trim() ||
        (inputType === "choice"
          ? "Bir secim yapin."
          : inputType === "confirm"
            ? "Onay verin."
            : "Metin girin.")
      const options = normalizePromptOptions(payload?.options)
      const normalizedBackend = String(backend ?? "").trim()
      const step = String(payload?.step ?? "").trim()
      const placeholder = String(payload?.placeholder ?? "").trim()
      if (!normalizedBackend) return null
      if (inputType === "choice" && options.length === 0) return null
      return {
        backend: normalizedBackend,
        step,
        inputType,
        message,
        options,
        placeholder,
      }
    },
    [],
  )

  useEffect(() => {
    const appId = String(selectedApplicationId ?? "").trim()
    if (!appId || !canViewApplicationLogs) {
      setIsLogsLoading(false)
      return
    }

    let isMounted = true
    const controller = new AbortController()

    const loadLogs = async () => {
      setIsLogsLoading(true)
      try {
        const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(appId)}/logs`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis Konsolu loglari alinamadi.")
        }
        const payload = await res.json()
        if (!isMounted) return
        const normalized = Array.isArray(payload)
          ? payload.map(normalizeApplicationLogEntry).filter(Boolean)
          : []
        setRunLogsByApplication((prev) => ({ ...prev, [appId]: normalized }))
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Servis Konsolu loglari alinamadi.")
      } finally {
        if (isMounted) setIsLogsLoading(false)
      }
    }

    void loadLogs()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [
    apiFetchApplications,
    canViewApplicationLogs,
    normalizeApplicationLogEntry,
    readApiError,
    selectedApplicationId,
  ])

  const appendLog = useCallback((appId, status, message) => {
    const normalizedAppId = String(appId ?? "").trim()
    if (!normalizedAppId) return
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return
    const nextEntry = {
      id: `app-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: formatLogTime(),
      status: String(status ?? "").trim() || "running",
      message: normalizedMessage,
    }
    setRunLogsByApplication((prev) => {
      const currentLogs = Array.isArray(prev[normalizedAppId]) ? prev[normalizedAppId] : []
      return {
        ...prev,
        [normalizedAppId]: [nextEntry, ...currentLogs].slice(0, MAX_LOG_ENTRIES),
      }
    })
    return nextEntry
  }, [])

  const persistLog = useCallback(
    async (appId, status, message) => {
      const normalizedAppId = String(appId ?? "").trim()
      if (!normalizedAppId) return
      const entry = appendLog(normalizedAppId, status, message)
      if (!entry) return

      try {
        const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(normalizedAppId)}/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        })
        if (!res.ok) {
          // Do not block UI for log persistence errors.
        }
      } catch {
        // Do not block UI for log persistence errors.
      }
    },
    [apiFetchApplications, appendLog],
  )

  const handleSave = async () => {
    if (!canManageApplications) {
      toast.error("Servis yonetme yetkiniz yok.")
      return
    }
    const name = String(appNameDraft ?? "").trim()
    const about = String(appAboutDraft ?? "").trim()
    const backendKey = String(backendDraft ?? "").trim()
    if (!name) {
      toast.error("Servis adi girin.")
      return
    }
    if (!about) {
      toast.error("Servis hakkinda alani bos olamaz.")
      return
    }
    if (!backendKey) {
      toast.error("Backend map secin.")
      return
    }
    const backendLabel =
      String(applicationBackendOptions.find((entry) => entry.key === backendKey)?.label ?? "").trim() ||
      backendKey
    try {
      const payload = { name, about, backendKey, backendLabel }
      if (editingApplicationId) {
        const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(editingApplicationId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis guncellenemedi.")
        }
        const saved = normalizeApplicationEntry(await res.json())
        if (!saved) throw new Error("Guncellenen servis verisi gecersiz.")
        setApplications((prev) => prev.map((entry) => (entry.id === saved.id ? saved : entry)))
        setSelectedApplicationId(saved.id)
        void persistLog(
          saved.id,
          "success",
          `Servis guncellendi: ${saved.name} (${getBackendLabelForDisplay(saved.backendLabel)})`,
        )
        toast.success("Servis guncellendi.")
      } else {
        const res = await apiFetchApplications("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, isActive: true }),
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis kaydedilemedi.")
        }
        const saved = normalizeApplicationEntry(await res.json())
        if (!saved) throw new Error("Kaydedilen servis verisi gecersiz.")
        setApplications((prev) => [saved, ...prev])
        setSelectedApplicationId(saved.id)
        void persistLog(
          saved.id,
          "success",
          `Servis kaydedildi: ${saved.name} (${getBackendLabelForDisplay(saved.backendLabel)})`,
        )
        toast.success("Servis kaydedildi.")
      }
    } catch (error) {
      toast.error(error?.message || "Servis kaydedilemedi.")
      return
    }

    setEditingApplicationId("")
    setDeleteConfirmId("")
    setAppNameDraft("")
    setAppAboutDraft("")
  }

  const handleEditStart = (entry) => {
    if (!entry || !entry.id) return
    setEditingApplicationId(entry.id)
    setDeleteConfirmId("")
    setAppNameDraft(String(entry.name ?? ""))
    setAppAboutDraft(String(entry.about ?? ""))
    setBackendDraft(String(entry.backendKey ?? ""))
  }

  const handleEditCancel = () => {
    setEditingApplicationId("")
    setAppNameDraft("")
    setAppAboutDraft("")
    if (applicationBackendOptions.length > 0) {
      setBackendDraft(applicationBackendOptions[0].key)
    } else {
      setBackendDraft("")
    }
  }

  const handleToggleActive = async (appId) => {
    if (!canManageApplications) {
      toast.error("Servis yonetme yetkiniz yok.")
      return
    }
    const target = applications.find((entry) => entry.id === appId)
    if (!target) return

    try {
      const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(appId)}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !target.isActive }),
      })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Servis durumu guncellenemedi.")
      }
      const saved = normalizeApplicationEntry(await res.json())
      if (!saved) throw new Error("Guncellenen durum verisi gecersiz.")
      setApplications((prev) => prev.map((entry) => (entry.id === saved.id ? saved : entry)))
      void persistLog(
        saved.id,
        "running",
        `${saved.name} ${saved.isActive ? "aktif edildi" : "kapatildi"}.`,
      )
      toast.success(saved.isActive ? "Servis aktif edildi." : "Servis kapatildi.")
    } catch (error) {
      toast.error(error?.message || "Servis durumu guncellenemedi.")
    }
  }

  const handleDelete = async (appId) => {
    if (!canManageApplications) {
      toast.error("Servis yonetme yetkiniz yok.")
      return
    }
    if (!appId) return
    if (deleteConfirmId !== appId) {
      setDeleteConfirmId(appId)
      toast("Silmek icin tekrar tikla.", { position: "top-right" })
      return
    }
    try {
      const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(appId)}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 404) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Servis silinemedi.")
      }
      setApplications((prev) => prev.filter((entry) => entry.id !== appId))
      if (editingApplicationId === appId) {
        handleEditCancel()
      }
      setRunLogsByApplication((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, appId)) return prev
        const next = { ...prev }
        delete next[appId]
        return next
      })
      setDeleteConfirmId("")
      toast.success("Servis silindi.")
    } catch (error) {
      toast.error(error?.message || "Servis silinemedi.")
    }
  }

  const handleRun = () => {
    if (!canRunApplications) {
      toast.error("Servis calistirma yetkiniz yok.")
      return
    }
    if (!selectedApplication) {
      toast.error("Calistirmak icin servis secin.")
      return
    }
    if (!selectedApplication.isActive) {
      toast.error("Secilen servis kapali. Once aktif edin.")
      return
    }
    if (isRunning) return

    const wsBaseUrl = String(automationWsUrl ?? "").trim()
    if (!wsBaseUrl) {
      toast.error("Websocket adresi bulunamadi. Admin panelinden kaydedin.")
      return
    }

    const backendKey = String(selectedApplication.backendKey ?? "").trim()
    if (!backendKey) {
      toast.error("Servis backend map anahtari bulunamadi.")
      return
    }

    const triggerUrl = buildSocketIoWsUrl(wsBaseUrl, { backend: backendKey })
    if (!triggerUrl) {
      toast.error("Socket.IO adresi olusturulamadi.")
      return
    }

    closeActiveSocket()
    setPendingUserInput(null)
    setPendingUserInputValue("")
    setConnectionState("connecting")
    setIsRunning(true)
    activeRunApplicationIdRef.current = selectedApplication.id

    const backendDisplay = getBackendLabelForDisplay(selectedApplication.backendLabel)
    const serviceLabel = selectedApplication.name
    const starterUsername = String(activeUsername ?? "").trim() || "bilinmeyen-kullanici"
    const runToastId = toast.loading(`${serviceLabel} calisiyor...`, { position: "top-right" })

    void persistLog(selectedApplication.id, "running", `Calistiran: ${starterUsername}`)
    void persistLog(selectedApplication.id, "running", `Calistiriliyor: ${serviceLabel}`)
    void persistLog(selectedApplication.id, "running", `Backend map: ${backendDisplay}`)

    let settled = false
    let hasConnected = false
    let hasResult = false

    const completeRun = (status, message) => {
      if (settled) return
      settled = true
      completeActiveRunRef.current = null
      if (message) {
        void persistLog(selectedApplication.id, status, message)
      }
      if (status === "success") {
        toast.success(message || `${serviceLabel} tamamlandi.`, { id: runToastId, position: "top-right" })
      } else if (status === "error") {
        toast.error(message || `${serviceLabel} tamamlanamadi.`, { id: runToastId, position: "top-right" })
      } else {
        toast.dismiss(runToastId)
      }
      setIsRunning(false)
      setPendingUserInput(null)
      setPendingUserInputValue("")
      if (status === "error") {
        setConnectionState("error")
      } else if (hasConnected) {
        setConnectionState("connected")
      } else {
        setConnectionState("idle")
      }
      activeRunApplicationIdRef.current = ""
      closeActiveSocket()
    }
    completeActiveRunRef.current = completeRun

    let socket
    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      completeRun("error", `${serviceLabel} icin websocket baglantisi baslatilamadi.`)
      return
    }
    activeSocketRef.current = socket

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
            completeRun("error", `${serviceLabel} icin Socket.IO baglantisi baslatilamadi.`)
          }
          continue
        }

        if (packet.startsWith("40")) {
          if (!hasConnected) {
            void persistLog(selectedApplication.id, "running", `${serviceLabel} baglandi.`)
          }
          hasConnected = true
          setConnectionState("connected")
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            completeRun("success", `${serviceLabel} tamamlandi.`)
          } else {
            completeRun("error", `${serviceLabel} baglantisi sonuc alinmadan kapandi.`)
          }
          return
        }

        if (packet.startsWith("44")) {
          completeRun("error", `${serviceLabel} tetiklenemedi. backend=${backendDisplay}`)
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue
        const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
        const firstArg = eventPacket.args[0]

        if (eventName === "script-triggered" || eventName === "script-started") {
          void persistLog(selectedApplication.id, "running", `${backendDisplay} script baslatildi.`)
          continue
        }

        if (eventName === "durum") {
          const lines = normalizeEventMessage(firstArg?.message ?? firstArg)
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
          if (lines.length === 0) {
            void persistLog(selectedApplication.id, "running", `${backendDisplay} => -`)
          } else {
            lines.forEach((line) => {
              void persistLog(selectedApplication.id, "running", `${backendDisplay} => ${line}`)
            })
          }
          continue
        }

        if (eventName === "script-log") {
          const stream = String(firstArg?.stream ?? "").trim().toLowerCase()
          const lines = String(firstArg?.message ?? "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
          lines.forEach((line) => {
            void persistLog(
              selectedApplication.id,
              stream === "stderr" ? "error" : "running",
              line,
            )
          })
          continue
        }

        if (eventName === "kullanici-girdisi-gerekli") {
          const promptBackend = String(firstArg?.backend ?? backendKey).trim() || backendKey
          const prompt = normalizeUserInputPrompt(firstArg, promptBackend)
          if (prompt) {
            setPendingUserInput(prompt)
            setPendingUserInputValue("")
            const promptMessage = String(prompt.message ?? "").trim() || "Kullanici girdisi gerekli."
            void persistLog(selectedApplication.id, "running", `${backendDisplay} => ${promptMessage}`)
          }
          continue
        }

        if (eventName === "sonuc") {
          const valueText = normalizeEventMessage(firstArg?.value ?? firstArg).trim()
          void persistLog(selectedApplication.id, "success", `${backendDisplay} => ${valueText || "-"}`)
          hasResult = true
          completeRun("success", `${serviceLabel} tamamlandi.`)
          return
        }

        if (eventName === "script-exit") {
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode)) {
            void persistLog(
              selectedApplication.id,
              exitCode === 0 ? "success" : "error",
              `Script cikti. Kod: ${exitCode}`,
            )
          }
          if (!hasResult) {
            completeRun("error", `${serviceLabel} cikti ancak sonuc alinmadi.`)
            return
          }
        }
      }
    })

    socket.addEventListener("error", () => {
      completeRun("error", `${serviceLabel} icin websocket baglanti hatasi olustu.`)
    })

    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        completeRun("success", `${serviceLabel} tamamlandi.`)
        return
      }
      if (hasConnected) {
        completeRun("error", `${serviceLabel} baglantisi acildi ancak sonuc gelmedi.`)
        return
      }
      completeRun("error", `${serviceLabel} icin websocket baglantisi kapandi.`)
    })
  }

  const handleCancelRun = useCallback(() => {
    if (!isRunning) return
    if (typeof completeActiveRunRef.current === "function") {
      completeActiveRunRef.current("error", "Islem kullanici tarafindan iptal edildi.")
      return
    }
    closeActiveSocket()
    setPendingUserInput(null)
    setPendingUserInputValue("")
    setIsRunning(false)
    setConnectionState("idle")
    activeRunApplicationIdRef.current = ""
    toast("Islem iptal edildi.", { position: "top-right" })
  }, [closeActiveSocket, isRunning])

  const handleUserInputSubmit = useCallback(
    (forcedValue = "") => {
      if (!pendingUserInput || !isRunning) return
      const socket = activeSocketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast.error("Websocket baglantisi acik degil.")
        return
      }
      const runningAppId = String(activeRunApplicationIdRef.current ?? "").trim()
      const runningApp =
        applications.find((entry) => entry.id === runningAppId) ||
        applications.find((entry) => entry.id === String(selectedApplicationId ?? "").trim()) ||
        null
      const backend = String(
        pendingUserInput.backend || runningApp?.backendKey || selectedApplication?.backendKey || "",
      ).trim()
      if (!backend) {
        toast.error("Backend bilgisi bulunamadi.")
        return
      }

      const inputType = normalizeInputType(pendingUserInput.inputType)
      const normalizedForced = String(forcedValue ?? "").trim()
      let valueToSend = normalizedForced

      if (!valueToSend) {
        if (inputType === "text") {
          valueToSend = String(pendingUserInputValue ?? "").trim()
        } else if (inputType === "choice") {
          valueToSend = String(pendingUserInputValue ?? "").trim()
        }
      }

      if (!valueToSend) {
        toast.error("Cevap girin.")
        return
      }

      try {
        socket.send(
          `42${JSON.stringify([
            "kullanici-girdisi",
            {
              backend,
              value: valueToSend,
            },
          ])}`,
        )
        const runAppId = String(activeRunApplicationIdRef.current || selectedApplicationId || "").trim()
        if (runAppId) {
          void persistLog(runAppId, "running", `> ${valueToSend}`)
        }
        setPendingUserInput(null)
        setPendingUserInputValue("")
      } catch {
        toast.error("Kullanici girdisi gonderilemedi.")
      }
    },
    [
      applications,
      isRunning,
      pendingUserInput,
      pendingUserInputValue,
      persistLog,
      selectedApplication?.backendKey,
      selectedApplicationId,
    ],
  )

  const handleClearLogs = async () => {
    if (!canClearApplicationLogs) {
      toast.error("Log temizleme yetkiniz yok.")
      return
    }
    const targetAppId = String(selectedApplicationId ?? "").trim()
    if (!targetAppId) return
    setRunLogsByApplication((prev) => ({
      ...prev,
      [targetAppId]: [],
    }))
    try {
      const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(targetAppId)}/logs`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const apiError = await readApiError(res)
        throw new Error(apiError || "Servis Konsolu loglari temizlenemedi.")
      }
      toast.success("Servis Konsolu loglari temizlendi.")
    } catch (error) {
      toast.error(error?.message || "Servis Konsolu loglari temizlenemedi.")
    }
  }

  const hasApplications = applications.length > 0
  const runLogs = useMemo(() => {
    if (!canViewApplicationLogs) return []
    const targetAppId = String(selectedApplicationId ?? "").trim()
    if (!targetAppId) return []
    const logs = runLogsByApplication[targetAppId]
    return Array.isArray(logs) ? logs : []
  }, [canViewApplicationLogs, runLogsByApplication, selectedApplicationId])
  const visibleLogs = runLogs.slice(0, CMD_VISIBLE_ROWS)
  const emptyRows = Math.max(0, CMD_VISIBLE_ROWS - visibleLogs.length)
  const isTabLoading = isLoading || isApplicationsLoading
  const hasWsUrl = String(automationWsUrl ?? "").trim().length > 0
  const connectionLabel = hasWsUrl
    ? connectionState === "connecting"
      ? "Baglaniliyor"
      : connectionState === "error"
        ? "Baglanti hatasi"
        : "Baglanildi"
    : "Baglanti yok"
  const connectionBadgeClass = !hasWsUrl
    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
    : connectionState === "connecting"
      ? "border-sky-300/60 bg-sky-500/15 text-sky-100"
      : connectionState === "error"
        ? "border-rose-300/60 bg-rose-500/15 text-rose-100"
        : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"

  if (isTabLoading) {
    return <ApplicationsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Servisler
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Servisler</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Servis ekle, servis sec ve calistir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Kayit: {applications.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Map: {applicationBackendOptions.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Durum: {connectionLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="order-2 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/65 lg:order-1 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-300/80" />
              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
              <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Servis Konsolu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
                {canViewApplicationLogs
                  ? isLogsLoading
                    ? "yukleniyor..."
                    : `${runLogs.length} satir`
                  : "log yetkisi yok"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${connectionBadgeClass}`}
              >
                {connectionLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-2 border-b border-white/10 bg-ink-900/45 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
            <select
              value={selectedApplicationId}
              onChange={(event) => setSelectedApplicationId(event.target.value)}
              disabled={!hasApplications || isRunning}
              className="h-9 w-full appearance-none rounded-md border border-white/10 bg-ink-900 px-3 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{hasApplications ? "Servis sec" : "Kayitli servis yok"}</option>
              {runDropdownApplications.map((entry) => (
                <option key={`run-app-${entry.id}`} value={entry.id}>
                  {entry.isActive ? entry.name : `${entry.name} (Kapali)`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={isRunning ? handleCancelRun : handleRun}
              disabled={
                isRunning
                  ? false
                  : !canRunApplications || !selectedApplication || !selectedApplication.isActive || !hasWsUrl
              }
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isRunning
                  ? "border-rose-300/60 bg-rose-500/15 text-rose-50 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                  : "border-emerald-300/60 bg-emerald-500/15 text-emerald-50 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25"
              }`}
            >
              {isRunning ? "Islemi Iptal Et" : "Calistir"}
            </button>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={!canClearApplicationLogs || !canViewApplicationLogs || runLogs.length === 0}
                className="inline-flex h-9 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Log temizle
              </button>
            </div>
          </div>

          <div className="border-b border-white/10 bg-ink-900/30 px-3 py-2 text-[10px] text-slate-400">
            {selectedApplication ? (
              <>
                <p className="text-[11px] font-semibold text-slate-200">
                  {selectedApplication.name} ({getBackendLabelForDisplay(selectedApplication.backendLabel)})
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedApplication.about || "Servis aciklamasi yok."}
                </p>
              </>
            ) : (
              "Calistirmak icin servis secin."
            )}
            {!hasWsUrl && (
              <p className="mt-2 rounded-md border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
                Websocket adresi yok. Admin panelinden kaydedin.
              </p>
            )}
          </div>

          <div className="no-scrollbar h-[320px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
            {!canViewApplicationLogs ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                Servis Konsolu log goruntuleme yetkiniz yok.
              </div>
            ) : isLogsLoading ? (
              <div className="flex h-full items-center justify-center text-slate-500">Loglar yukleniyor...</div>
            ) : (
              <div className="space-y-0.5">
                {pendingUserInput && isRunning && (
                  <div className="mb-2 rounded-md border border-white/10 bg-white/5 px-2 py-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-slate-300 sm:flex-nowrap">
                      <span className="flex-none text-emerald-300">[INPUT]</span>
                      <span className="hidden flex-none text-slate-500 sm:inline">C:\plcp\applications&gt;</span>
                      <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                      <span className="min-w-0 break-words text-slate-200">
                        {pendingUserInput.message}
                      </span>
                    </div>
                    {pendingUserInput.step && (
                      <p className="mt-1 text-[10px] text-slate-500">Step: {pendingUserInput.step}</p>
                    )}
                    <div className="mt-2">
                      {pendingUserInput.inputType === "choice" && (
                        <div className="flex flex-wrap gap-1.5">
                          {pendingUserInput.options.map((option) => (
                            <button
                              key={`choice-${option.value}`}
                              type="button"
                              onClick={() => handleUserInputSubmit(option.value)}
                              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:border-white/30 hover:bg-white/10"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {pendingUserInput.inputType === "confirm" && (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUserInputSubmit("evet")}
                            className="rounded-md border border-emerald-300/50 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/25"
                          >
                            Evet
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUserInputSubmit("hayir")}
                            className="rounded-md border border-rose-300/50 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/25"
                          >
                            Hayir
                          </button>
                        </div>
                      )}
                      {pendingUserInput.inputType === "text" && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={pendingUserInputValue}
                            onChange={(event) => setPendingUserInputValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                handleUserInputSubmit()
                              }
                            }}
                            placeholder={pendingUserInput.placeholder || "Cevap girin ve Enter"}
                            className="h-8 min-w-0 flex-1 rounded-md border border-white/15 bg-ink-900/70 px-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleUserInputSubmit()}
                            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:border-white/30 hover:bg-white/10"
                          >
                            Gonder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {visibleLogs.map((entry) => (
                  <div key={entry.id} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap">
                    <span className="hidden flex-none text-slate-500 sm:inline">C:\plcp\applications&gt;</span>
                    <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                    <span
                      className={`flex-none ${
                        entry.status === "success"
                          ? "text-emerald-300"
                          : entry.status === "error"
                            ? "text-rose-300"
                            : "text-amber-300"
                      }`}
                    >
                      [{entry.time}]
                    </span>
                    <span
                      className={`flex-none ${
                        entry.status === "success"
                          ? "text-emerald-300"
                          : entry.status === "error"
                            ? "text-rose-300"
                            : "text-amber-300"
                      }`}
                    >
                      {entry.status === "success" ? "OK" : entry.status === "error" ? "ERR" : "RUN"}
                    </span>
                    <span className="min-w-0 break-words text-slate-100">
                      {sanitizeLogMessage(entry.message)}
                    </span>
                  </div>
                ))}
                {Array.from({ length: emptyRows }).map((_, index) => (
                  <div key={`applications-log-placeholder-${index}`} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap">
                    <span className="hidden flex-none text-slate-600 sm:inline">C:\plcp\applications&gt;</span>
                    <span className="flex-none text-slate-600 sm:hidden">&gt;</span>
                    <span className="flex-none text-slate-700">[--:--]</span>
                    <span className="flex-none text-slate-700">--</span>
                    <span
                      className={`truncate text-slate-700 ${
                        runLogs.length === 0 && index === 0 ? "text-slate-500" : "opacity-0"
                      }`}
                    >
                      {runLogs.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`order-1 self-start ${panelClass} bg-ink-900/60 lg:order-2 lg:col-span-1`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300/85">Servis Yonet</p>
              <p className="text-xs text-slate-400">Kisa kayit ve hizli yonetim.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              {applications.length} kayit
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/55 p-3">
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Servis adi</label>
                <input
                  type="text"
                  value={appNameDraft}
                  onChange={(event) => setAppNameDraft(event.target.value)}
                  placeholder="Orn: Telegram bot runner"
                  disabled={!canManageApplications}
                  className="h-9 w-full rounded-md border border-white/10 bg-ink-900 px-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Backend map</label>
                <select
                  value={backendDraft}
                  onChange={(event) => setBackendDraft(event.target.value)}
                  disabled={applicationBackendOptions.length === 0 || !canManageApplications}
                  className="h-9 w-full appearance-none rounded-md border border-white/10 bg-ink-900 px-2.5 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {applicationBackendOptions.length === 0 ? "Servis backend map yok" : "Backend sec"}
                  </option>
                  {applicationBackendOptions.map((entry) => (
                  <option key={`application-backend-${entry.key}`} value={entry.key}>
                      {getBackendLabelForDisplay(entry.label)}
                  </option>
                ))}
              </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Servis hakkinda</label>
                <textarea
                  rows={2}
                  value={appAboutDraft}
                  onChange={(event) => setAppAboutDraft(event.target.value)}
                  placeholder="Kisa aciklama yaz."
                  disabled={!canManageApplications}
                  className="w-full resize-none rounded-md border border-white/10 bg-ink-900 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-slate-300">
                <span>Map</span>
                <span>
                  {applicationBackendOptions.length === 0
                    ? "kind=servis map yok"
                    : `${applicationBackendOptions.length} map hazir`}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={applicationBackendOptions.length === 0 || !canManageApplications}
                  className="flex-1 rounded-md border border-emerald-300/60 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-50 transition hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingApplicationId ? "Guncelle" : "Kaydet"}
                </button>
                {canManageApplications && editingApplicationId && (
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                  >
                    Iptal
                  </button>
                )}
              </div>
            </div>
          </div>

          {!canManageApplications && (
            <p className="mt-2 text-[11px] text-amber-200/80">Servis yonetme yetkiniz yok.</p>
          )}

          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/55 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Kayitli servisler
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                {applications.length}
              </span>
            </div>

            <div className="no-scrollbar mt-2 max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
              {applications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-2.5 py-5 text-center text-[11px] text-slate-500">
                  Henuz servis kaydi yok.
                </p>
              ) : (
                applications.map((entry) => {
                  return (
                    <div
                      key={`manage-app-${entry.id}`}
                      className="rounded-lg border border-white/10 bg-ink-900/70"
                    >
                      <div className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-100">{entry.name}</span>
                          <span className="block truncate text-[10px] text-slate-400">
                            {getBackendLabelForDisplay(entry.backendLabel)}
                          </span>
                        </span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                            entry.isActive
                              ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                              : "border-slate-300/40 bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {entry.isActive ? "Aktif" : "Kapali"}
                        </span>
                      </div>

                      {canManageApplications && (
                        <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(entry.id)}
                            className={`rounded-md border px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                              entry.isActive
                                ? "border-amber-300/60 bg-amber-500/15 text-amber-100 hover:border-amber-200 hover:bg-amber-500/25"
                                : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100 hover:border-emerald-200 hover:bg-emerald-500/25"
                            }`}
                          >
                            {entry.isActive ? "Kapat" : "Aktif"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditStart(entry)}
                            className="rounded-md border border-sky-300/60 bg-sky-500/15 px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100 transition hover:border-sky-200 hover:bg-sky-500/25"
                          >
                            Duzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className={`rounded-md border px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                              deleteConfirmId === entry.id
                                ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                : "border-rose-300/60 bg-rose-500/10 text-rose-100 hover:border-rose-200 hover:bg-rose-500/20"
                            }`}
                          >
                            {deleteConfirmId === entry.id ? "Onayla" : "Sil"}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

          </div>
        </section>
      </div>
    </div>
  )
}
