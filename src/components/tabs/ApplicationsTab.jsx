import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
} from "../../utils/socketIoClient"

const MAX_LOG_ENTRIES = 300
const MASKED_BACKEND_TEXT = "******"
const HISTORY_CONSOLE_TAB_ID = "__history__"

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

const getStatusMeta = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (normalized === "success") {
    return {
      label: "Tamamlandi",
      badgeClass: "border-emerald-300/45 bg-emerald-500/12 text-emerald-100",
      dotClass: "bg-emerald-300",
      surfaceClass: "border-emerald-400/10 bg-emerald-500/[0.05]",
    }
  }
  if (normalized === "error") {
    return {
      label: "Hata",
      badgeClass: "border-rose-300/45 bg-rose-500/12 text-rose-100",
      dotClass: "bg-rose-300",
      surfaceClass: "border-rose-400/10 bg-rose-500/[0.05]",
    }
  }
  if (normalized === "connecting") {
    return {
      label: "Baglaniyor",
      badgeClass: "border-sky-300/45 bg-sky-500/12 text-sky-100",
      dotClass: "bg-sky-300",
      surfaceClass: "border-sky-400/10 bg-sky-500/[0.05]",
    }
  }
  return {
    label: "Canli",
    badgeClass: "border-amber-300/45 bg-amber-500/12 text-amber-100",
    dotClass: "bg-amber-300",
    surfaceClass: "border-white/10 bg-white/[0.03]",
  }
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ApplicationsSkeleton({ panelClass }) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/90 via-ink-800/75 to-ink-900/90 p-5 shadow-card">
        <SkeletonBlock className="h-3 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-10 w-64 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-3/4 rounded-full" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-24 w-full rounded-xl" />
          <SkeletonBlock className="h-24 w-full rounded-xl" />
          <SkeletonBlock className="h-24 w-full rounded-xl" />
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="mt-4 h-16 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-16 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-16 w-full rounded-xl" />
          </section>

          <section className={`${panelClass} bg-ink-900/55`}>
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-24 w-full rounded-lg" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-lg" />
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section className={`${panelClass} bg-ink-900/55`}>
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 shadow-card">
            <SkeletonBlock className="m-4 h-12 w-auto rounded-xl" />
            <SkeletonBlock className="mx-4 h-16 w-auto rounded-xl" />
            <SkeletonBlock className="m-4 h-[420px] w-auto rounded-xl" />
          </section>
        </div>
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
  const [runSessions, setRunSessions] = useState([])
  const [activeConsoleTabId, setActiveConsoleTabId] = useState(HISTORY_CONSOLE_TAB_ID)
  const [runLogsByApplication, setRunLogsByApplication] = useState({})
  const [runLogsByTab, setRunLogsByTab] = useState({})
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(true)
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [pendingUserInputByRunId, setPendingUserInputByRunId] = useState({})
  const [pendingUserInputValueByRunId, setPendingUserInputValueByRunId] = useState({})
  const runSocketRefs = useRef({})
  const runCompleteRefs = useRef({})
  const runSerialRef = useRef(0)
  const runSessionsRef = useRef([])
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

  const closeRunSocket = useCallback((runId) => {
    const normalizedRunId = String(runId ?? "").trim()
    if (!normalizedRunId) return
    const socket = runSocketRefs.current[normalizedRunId]
    if (socket) {
      try {
        socket.close()
      } catch {
        // Ignore close errors.
      }
    }
    delete runSocketRefs.current[normalizedRunId]
  }, [])

  const closeAllRunSockets = useCallback(() => {
    Object.keys(runSocketRefs.current).forEach((runId) => {
      closeRunSocket(runId)
    })
    runCompleteRefs.current = {}
  }, [closeRunSocket])

  useEffect(() => {
    runSessionsRef.current = runSessions
  }, [runSessions])

  const updateRunSession = useCallback((runId, updater) => {
    const normalizedRunId = String(runId ?? "").trim()
    if (!normalizedRunId) return
    setRunSessions((prev) =>
      prev.map((entry) => {
        if (entry.id !== normalizedRunId) return entry
        const nextPatch = typeof updater === "function" ? updater(entry) : updater
        if (!nextPatch || typeof nextPatch !== "object") return entry
        return { ...entry, ...nextPatch }
      }),
    )
  }, [])

  const clearRunPromptState = useCallback((runId) => {
    const normalizedRunId = String(runId ?? "").trim()
    if (!normalizedRunId) return
    setPendingUserInputByRunId((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, normalizedRunId)) return prev
      const next = { ...prev }
      delete next[normalizedRunId]
      return next
    })
    setPendingUserInputValueByRunId((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, normalizedRunId)) return prev
      const next = { ...prev }
      delete next[normalizedRunId]
      return next
    })
  }, [])

  const sendSocketIoEvent = useCallback((socket, eventName, payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    const normalizedEventName = String(eventName ?? "").trim()
    if (!normalizedEventName) return false
    try {
      socket.send(`42${JSON.stringify([normalizedEventName, payload ?? {}])}`)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    return () => {
      closeAllRunSockets()
    }
  }, [closeAllRunSockets])

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

  const activeRunSession = useMemo(() => {
    if (activeConsoleTabId === HISTORY_CONSOLE_TAB_ID) return null
    return runSessions.find((entry) => entry.id === activeConsoleTabId) || null
  }, [activeConsoleTabId, runSessions])

  useEffect(() => {
    if (activeConsoleTabId === HISTORY_CONSOLE_TAB_ID) return
    if (runSessions.some((entry) => entry.id === activeConsoleTabId)) return
    setActiveConsoleTabId(HISTORY_CONSOLE_TAB_ID)
  }, [activeConsoleTabId, runSessions])

  const activeRunId = String(activeRunSession?.id ?? "").trim()
  const isRunLive = useCallback((status) => {
    const normalized = String(status ?? "").trim().toLowerCase()
    return normalized === "running" || normalized === "connecting"
  }, [])

  const runningRunCount = useMemo(
    () => runSessions.filter((entry) => isRunLive(entry.status)).length,
    [isRunLive, runSessions],
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

  const appendRunTabLog = useCallback((runId, status, message) => {
    const normalizedRunId = String(runId ?? "").trim()
    if (!normalizedRunId) return null
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return null
    const nextEntry = {
      id: `run-tab-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: formatLogTime(),
      status: String(status ?? "").trim() || "running",
      message: normalizedMessage,
    }
    setRunLogsByTab((prev) => {
      const current = Array.isArray(prev[normalizedRunId]) ? prev[normalizedRunId] : []
      return {
        ...prev,
        [normalizedRunId]: [nextEntry, ...current].slice(0, MAX_LOG_ENTRIES),
      }
    })
    return nextEntry
  }, [])

  const persistRunLog = useCallback(
    (runId, appId, status, message) => {
      const normalizedRunId = String(runId ?? "").trim()
      const normalizedAppId = String(appId ?? "").trim()
      if (!normalizedRunId || !normalizedAppId) return
      const normalizedMessage = String(message ?? "").trim()
      if (!normalizedMessage) return
      appendRunTabLog(normalizedRunId, status, normalizedMessage)
      const runEntry = runSessionsRef.current.find((entry) => entry.id === normalizedRunId) || null
      const runPrefix = runEntry ? `[${runEntry.label}] ` : ""
      void persistLog(normalizedAppId, status, `${runPrefix}${normalizedMessage}`)
    },
    [appendRunTabLog, persistLog],
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

  const handleCloseRunTab = useCallback(
    (runId) => {
      const normalizedRunId = String(runId ?? "").trim()
      if (!normalizedRunId) return
      const runEntry = runSessionsRef.current.find((entry) => entry.id === normalizedRunId) || null
      if (runEntry && isRunLive(runEntry.status)) {
        toast.error("Calisan sekme kapatilamaz. Once islemi iptal edin.")
        return
      }
      setRunSessions((prev) => prev.filter((entry) => entry.id !== normalizedRunId))
      runSessionsRef.current = runSessionsRef.current.filter((entry) => entry.id !== normalizedRunId)
      clearRunPromptState(normalizedRunId)
      if (activeConsoleTabId === normalizedRunId) {
        setActiveConsoleTabId(HISTORY_CONSOLE_TAB_ID)
      }
    },
    [activeConsoleTabId, clearRunPromptState, isRunLive],
  )

  const handleRun = useCallback(() => {
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

    runSerialRef.current += 1
    const runSerial = runSerialRef.current
    const runId = `service-run-${Date.now()}-${runSerial}`
    const runLabel = `${selectedApplication.name} #${runSerial}`
    const backendDisplay = getBackendLabelForDisplay(selectedApplication.backendLabel)
    const serviceLabel = selectedApplication.name
    const starterUsername = String(activeUsername ?? "").trim() || "bilinmeyen-kullanici"
    const runStartedAt = Date.now()
    const runToastId = toast.loading(`${runLabel} calisiyor...`, { position: "top-right" })
    const runEntry = {
      id: runId,
      label: runLabel,
      serial: runSerial,
      applicationId: selectedApplication.id,
      applicationName: selectedApplication.name,
      applicationAbout: selectedApplication.about,
      backendKey,
      backendLabel: selectedApplication.backendLabel,
      status: "connecting",
      connectionState: "connecting",
      startedAtMs: runStartedAt,
      endedAtMs: 0,
    }

    setRunSessions((prev) => [runEntry, ...prev])
    runSessionsRef.current = [runEntry, ...runSessionsRef.current]
    setActiveConsoleTabId(runId)
    setPendingUserInputByRunId((prev) => ({ ...prev, [runId]: null }))
    setPendingUserInputValueByRunId((prev) => ({ ...prev, [runId]: "" }))

    void persistRunLog(runId, selectedApplication.id, "running", `Calistiran: ${starterUsername}`)
    void persistRunLog(runId, selectedApplication.id, "running", `Calistiriliyor: ${serviceLabel}`)
    void persistRunLog(runId, selectedApplication.id, "running", `Backend map: ${backendDisplay}`)

    let settled = false
    let hasConnected = false
    let hasResult = false
    let hasSocketErrorSignal = false

    const completeRun = (status, message) => {
      if (settled) return
      settled = true
      delete runCompleteRefs.current[runId]

      const normalizedStatus = String(status ?? "").trim() || "error"
      if (message) {
        void persistRunLog(runId, selectedApplication.id, normalizedStatus, message)
      }

      if (normalizedStatus === "success") {
        toast.success(message || `${serviceLabel}: Servis hatasiz bitirildi.`, {
          id: runToastId,
          position: "top-right",
        })
      } else if (normalizedStatus === "error") {
        toast.error(message || `${serviceLabel} tamamlanamadi.`, { id: runToastId, position: "top-right" })
      } else {
        toast.dismiss(runToastId)
      }

      updateRunSession(runId, {
        status: normalizedStatus,
        connectionState: normalizedStatus === "error" ? "error" : hasConnected ? "connected" : "idle",
        endedAtMs: Date.now(),
      })
      clearRunPromptState(runId)
      closeRunSocket(runId)
    }

    runCompleteRefs.current[runId] = completeRun

    let socket
    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      completeRun("error", `${serviceLabel} icin websocket baglantisi baslatilamadi.`)
      return
    }
    runSocketRefs.current[runId] = socket

    socket.addEventListener("message", (event) => {
      if (settled) return
      const payload = typeof event.data === "string" ? event.data : ""
      if (!payload) return
      const packets = splitEnginePackets(payload)

      for (const packet of packets) {
        if (settled) return

        if (hasSocketErrorSignal) {
          hasSocketErrorSignal = false
          updateRunSession(runId, { status: "running", connectionState: "connected" })
          void persistRunLog(
            runId,
            selectedApplication.id,
            "running",
            `${serviceLabel} websocket baglantisi toparlandi, islem devam ediyor.`,
          )
        }

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
            void persistRunLog(runId, selectedApplication.id, "running", `${serviceLabel} baglandi.`)
          }
          hasConnected = true
          updateRunSession(runId, { status: "running", connectionState: "connected" })
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            completeRun("success", `${serviceLabel}: Servis hatasiz bitirildi.`)
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
          void persistRunLog(runId, selectedApplication.id, "running", `${backendDisplay} script baslatildi.`)
          continue
        }

        if (eventName === "durum") {
          const lines = normalizeEventMessage(firstArg?.message ?? firstArg)
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
          if (lines.length === 0) {
            void persistRunLog(runId, selectedApplication.id, "running", `${backendDisplay} => -`)
          } else {
            lines.forEach((line) => {
              void persistRunLog(runId, selectedApplication.id, "running", `${backendDisplay} => ${line}`)
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
            void persistRunLog(runId, selectedApplication.id, stream === "stderr" ? "error" : "running", line)
          })
          continue
        }

        if (eventName === "kullanici-girdisi-gerekli") {
          const promptBackend = String(firstArg?.backend ?? backendKey).trim() || backendKey
          const prompt = normalizeUserInputPrompt(firstArg, promptBackend)
          if (prompt) {
            setPendingUserInputByRunId((prev) => ({ ...prev, [runId]: prompt }))
            setPendingUserInputValueByRunId((prev) => ({ ...prev, [runId]: "" }))
            const promptMessage = String(prompt.message ?? "").trim() || "Kullanici girdisi gerekli."
            void persistRunLog(runId, selectedApplication.id, "running", `${backendDisplay} => ${promptMessage}`)
          }
          continue
        }

        if (eventName === "sonuc") {
          const valueText = normalizeEventMessage(firstArg?.value ?? firstArg).trim()
          void persistRunLog(runId, selectedApplication.id, "success", `${backendDisplay} => ${valueText || "-"}`)
          hasResult = true
          completeRun("success", `${serviceLabel}: Servis hatasiz bitirildi.`)
          return
        }

        if (eventName === "script-exit") {
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode)) {
            void persistRunLog(
              runId,
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
      if (settled) return
      if (hasSocketErrorSignal) return
      hasSocketErrorSignal = true
      updateRunSession(runId, { status: "running", connectionState: "connecting" })
      void persistRunLog(
        runId,
        selectedApplication.id,
        "running",
        `${serviceLabel} websocket baglanti hatasi algiladi, baglanti takip ediliyor...`,
      )
    })

    socket.addEventListener("close", () => {
      if (settled) return
      if (hasResult) {
        completeRun("success", `${serviceLabel}: Servis hatasiz bitirildi.`)
        return
      }
      if (hasConnected) {
        completeRun(
          "error",
          hasSocketErrorSignal
            ? `${serviceLabel} icin websocket baglanti hatasi olustu ve baglanti kapandi.`
            : `${serviceLabel} baglantisi acildi ancak sonuc gelmedi.`,
        )
        return
      }
      completeRun("error", `${serviceLabel} icin websocket baglantisi kapandi.`)
    })
  }, [
    activeUsername,
    automationWsUrl,
    canRunApplications,
    clearRunPromptState,
    closeRunSocket,
    getBackendLabelForDisplay,
    normalizeUserInputPrompt,
    persistRunLog,
    selectedApplication,
    updateRunSession,
  ])

  const handleCancelRun = useCallback(
    (runIdOverride = "") => {
      const targetRunId = String(runIdOverride || activeRunId).trim()
      if (!targetRunId) return
      const runEntry = runSessionsRef.current.find((entry) => entry.id === targetRunId) || null
      if (!runEntry || !isRunLive(runEntry.status)) return

      const socket = runSocketRefs.current[targetRunId] || null
      const pendingPrompt = pendingUserInputByRunId[targetRunId]
      const backend = String(runEntry.backendKey ?? "").trim()
      const step = String(pendingPrompt?.step ?? "").trim()

      if (backend) {
        const cancelPayload = {
          backend,
          step,
          reason: "user-cancelled",
        }
        const cancelSent = sendSocketIoEvent(socket, "islem-iptal", cancelPayload)
        if (!cancelSent) {
          sendSocketIoEvent(socket, "kullanici-girdisi", {
            backend,
            step,
            value: "iptal",
            reason: "user-cancelled",
          })
        } else {
          void persistRunLog(
            targetRunId,
            runEntry.applicationId,
            "running",
            `${getBackendLabelForDisplay(runEntry.backendLabel)} => iptal eventi gonderildi.`,
          )
        }
      }

      const completeRun = runCompleteRefs.current[targetRunId]
      if (typeof completeRun === "function") {
        completeRun("error", "Islem kullanici tarafindan iptal edildi.")
        return
      }

      closeRunSocket(targetRunId)
      updateRunSession(targetRunId, {
        status: "error",
        connectionState: "error",
        endedAtMs: Date.now(),
      })
      clearRunPromptState(targetRunId)
      toast("Islem iptal edildi.", { position: "top-right" })
    },
    [
      activeRunId,
      clearRunPromptState,
      closeRunSocket,
      getBackendLabelForDisplay,
      isRunLive,
      pendingUserInputByRunId,
      persistRunLog,
      sendSocketIoEvent,
      updateRunSession,
    ],
  )

  const handleUserInputSubmit = useCallback(
    (forcedValue = "", runIdOverride = "") => {
      const targetRunId = String(runIdOverride || activeRunId).trim()
      if (!targetRunId) return
      const runEntry = runSessionsRef.current.find((entry) => entry.id === targetRunId) || null
      if (!runEntry || !isRunLive(runEntry.status)) return

      const pendingUserInput = pendingUserInputByRunId[targetRunId]
      if (!pendingUserInput) return

      const socket = runSocketRefs.current[targetRunId] || null
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast.error("Websocket baglantisi acik degil.")
        return
      }

      const backend = String(pendingUserInput.backend || runEntry.backendKey || "").trim()
      if (!backend) {
        toast.error("Backend bilgisi bulunamadi.")
        return
      }

      const inputType = normalizeInputType(pendingUserInput.inputType)
      const normalizedForced = String(forcedValue ?? "").trim()
      let valueToSend = normalizedForced

      if (!valueToSend) {
        if (inputType === "text" || inputType === "choice") {
          valueToSend = String(pendingUserInputValueByRunId[targetRunId] ?? "").trim()
        }
      }

      if (!valueToSend) {
        toast.error("Cevap girin.")
        return
      }

      try {
        const sent = sendSocketIoEvent(socket, "kullanici-girdisi", {
          backend,
          value: valueToSend,
        })
        if (!sent) {
          throw new Error("Kullanici girdisi gonderilemedi.")
        }
        void persistRunLog(targetRunId, runEntry.applicationId, "running", `> ${valueToSend}`)
        clearRunPromptState(targetRunId)
      } catch {
        toast.error("Kullanici girdisi gonderilemedi.")
      }
    },
    [
      activeRunId,
      clearRunPromptState,
      isRunLive,
      pendingUserInputByRunId,
      pendingUserInputValueByRunId,
      persistRunLog,
      sendSocketIoEvent,
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
  const historyLogs = useMemo(() => {
    if (!canViewApplicationLogs) return []
    const targetAppId = String(selectedApplicationId ?? "").trim()
    if (!targetAppId) return []
    const logs = runLogsByApplication[targetAppId]
    return Array.isArray(logs) ? logs : []
  }, [canViewApplicationLogs, runLogsByApplication, selectedApplicationId])
  const activeRunLogs = useMemo(() => {
    if (!activeRunSession) return []
    const logs = runLogsByTab[activeRunSession.id]
    return Array.isArray(logs) ? logs : []
  }, [activeRunSession, runLogsByTab])
  const consoleLogs = activeRunSession ? activeRunLogs : historyLogs
  const activeRunPrompt = activeRunSession ? pendingUserInputByRunId[activeRunSession.id] || null : null
  const activeRunPromptValue = activeRunSession
    ? String(pendingUserInputValueByRunId[activeRunSession.id] ?? "")
    : ""
  const isActiveRunLive = activeRunSession ? isRunLive(activeRunSession.status) : false
  const canCancelActiveRun = Boolean(activeRunSession && isActiveRunLive)
  const isTabLoading = isLoading || isApplicationsLoading
  const hasWsUrl = String(automationWsUrl ?? "").trim().length > 0
  const activeConnectionState = String(activeRunSession?.connectionState ?? "").trim().toLowerCase()
  const connectionLabel = !hasWsUrl
    ? "Baglanti yok"
    : activeRunSession
      ? activeConnectionState === "connecting"
        ? "Baglaniliyor"
        : activeConnectionState === "error"
          ? "Baglanti hatasi"
          : activeRunSession.status === "success"
            ? "Tamamlandi"
            : isActiveRunLive
              ? "Baglanildi"
              : "Hazir"
      : runningRunCount > 0
        ? `${runningRunCount} calisiyor`
        : "Hazir"
  const connectionBadgeClass = !hasWsUrl
    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
    : activeRunSession && activeConnectionState === "error"
      ? "border-rose-300/60 bg-rose-500/15 text-rose-100"
      : activeRunSession && activeConnectionState === "connecting"
        ? "border-sky-300/60 bg-sky-500/15 text-sky-100"
        : runningRunCount > 0
          ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
          : "border-white/20 bg-white/10 text-slate-200"
  const activeServiceCount = useMemo(
    () => applications.filter((entry) => Boolean(entry?.isActive)).length,
    [applications],
  )
  const inactiveServiceCount = Math.max(0, applications.length - activeServiceCount)
  const consoleLineLabel = canViewApplicationLogs
    ? !activeRunSession && isLogsLoading
      ? "yukleniyor..."
      : `${consoleLogs.length} satir`
    : "log yetkisi yok"
  const focusedApplicationId = String(activeRunSession?.applicationId ?? selectedApplicationId ?? "").trim()
  const activeContextName = activeRunSession?.label || selectedApplication?.name || "Servis secilmedi"
  const activeContextBackend = activeRunSession
    ? getBackendLabelForDisplay(activeRunSession.backendLabel)
    : selectedApplication
      ? getBackendLabelForDisplay(selectedApplication.backendLabel)
      : "-"
  const activeContextAbout =
    activeRunSession?.applicationAbout ||
    selectedApplication?.about ||
    "Calistirmak veya gecmis loglari izlemek icin bir servis sec."
  const activeContextStateText = activeRunSession
    ? activeRunSession.status === "success"
      ? "Son oturum basariyla tamamlandi."
      : activeRunSession.status === "error"
        ? "Son oturum hata ile kapandi."
        : activeConnectionState === "connecting"
          ? "Websocket baglantisi kuruluyor."
          : "Canli log akisi devam ediyor."
    : selectedApplication
      ? selectedApplication.isActive
        ? "Secili servis aktif ve calistirmaya hazir."
        : "Secili servis kayitli ancak su an kapali."
      : "Henuz secili bir servis yok."
  const activeContextBadgeClass = activeRunSession
    ? getStatusMeta(activeRunSession.status).badgeClass
    : selectedApplication
      ? selectedApplication.isActive
        ? "border-emerald-300/45 bg-emerald-500/12 text-emerald-100"
        : "border-slate-300/45 bg-slate-500/10 text-slate-300"
      : "border-white/15 bg-white/5 text-slate-300"
  const activeContextBadgeLabel = activeRunSession
    ? getStatusMeta(activeRunSession.status).label
    : selectedApplication
      ? selectedApplication.isActive
        ? "Aktif"
        : "Kapali"
      : "Bos"
  const canRunSelectedApplication = Boolean(
    canRunApplications && selectedApplication && selectedApplication.isActive && hasWsUrl,
  )
  const inputClassName =
    "h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
  const textAreaClassName =
    "w-full resize-none rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
  const heroSection = (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/92 via-ink-800/78 to-ink-900/92 shadow-card">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-32 w-32 bg-white/[0.03]" />
        <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
        <div className="absolute inset-y-0 right-[28%] hidden w-px bg-white/5 xl:block" />
      </div>

      <div className="relative z-10 grid gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-200">
              Service Workspace
            </span>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Servis Konsolu
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Canli calistirma, kalici log akisi ve servis yonetimini tek bir sade operasyon
                yuzeyinde toplar.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Kayitli servis
              </p>
              <p className="mt-3 font-display text-3xl text-white">{applications.length}</p>
              <p className="mt-2 text-xs text-slate-400">Yonetim panelindeki toplam servis sayisi.</p>
            </div>

            <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/[0.06] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                Aktif servis
              </p>
              <p className="mt-3 font-display text-3xl text-white">{activeServiceCount}</p>
              <p className="mt-2 text-xs text-slate-400">
                {inactiveServiceCount} servis beklemede veya kapali.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Canli oturum
              </p>
              <p className="mt-3 font-display text-3xl text-white">{runningRunCount}</p>
              <p className="mt-2 text-xs text-slate-400">
                {applicationBackendOptions.length} backend map hazir.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-ink-900/45 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Odak servis
              </p>
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${activeContextBadgeClass}`}
              >
                {activeContextBadgeLabel}
              </span>
            </div>
            <p className="mt-3 font-display text-lg text-white">{activeContextName}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-accent-200">
              {activeContextBackend}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">{activeContextStateText}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-900/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Kontrol durumu
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${connectionBadgeClass}`}
              >
                {connectionLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Log: {canViewApplicationLogs ? "Acik" : "Kapali"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Yonetim: {canManageApplications ? "Acik" : "Kapali"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {hasWsUrl
                ? "Websocket adresi tanimli. Servisler canli olarak tetiklenebilir."
                : "Websocket adresi eksik. Calistirma islemi icin admin panelinde adres kaydedilmeli."}
            </p>
          </div>
        </div>
      </div>
    </section>
  )

  const librarySection = (
    <section className={`${panelClass} bg-ink-900/60`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Servis kutuphanesi
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Kayitli servisleri sec, durumlarini izle ve hizli yonet.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
          {applications.length}
        </span>
      </div>

      <div className="no-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {!hasApplications ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-8 text-center text-xs text-slate-500">
            Henuz servis kaydi yok.
          </div>
        ) : (
          runDropdownApplications.map((entry) => {
            const isSelected = focusedApplicationId === entry.id
            const isEditing = editingApplicationId === entry.id
            return (
              <div
                key={`library-app-${entry.id}`}
                className={`rounded-xl border transition ${
                  isSelected
                    ? "border-accent-400/50 bg-accent-500/[0.08]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedApplicationId(entry.id)}
                  className="w-full px-3 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{entry.name}</p>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {getBackendLabelForDisplay(entry.backendLabel)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                          entry.isActive
                            ? "border-emerald-300/45 bg-emerald-500/12 text-emerald-100"
                            : "border-slate-300/45 bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        {entry.isActive ? "Aktif" : "Kapali"}
                      </span>
                      {isEditing && (
                        <span className="rounded-full border border-sky-300/45 bg-sky-500/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                          Duzenleniyor
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {entry.about || "Servis aciklamasi yok."}
                  </p>
                </button>

                {canManageApplications && (
                  <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(entry.id)}
                      className={`rounded-lg border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                        entry.isActive
                          ? "border-amber-300/45 bg-amber-500/12 text-amber-100 hover:border-amber-200 hover:bg-amber-500/20"
                          : "border-emerald-300/45 bg-emerald-500/12 text-emerald-100 hover:border-emerald-200 hover:bg-emerald-500/20"
                      }`}
                    >
                      {entry.isActive ? "Kapat" : "Aktif"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditStart(entry)}
                      className="rounded-lg border border-sky-300/45 bg-sky-500/12 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100 transition hover:border-sky-200 hover:bg-sky-500/20"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className={`rounded-lg border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                        deleteConfirmId === entry.id
                          ? "border-rose-300 bg-rose-500/25 text-rose-50"
                          : "border-rose-300/45 bg-rose-500/12 text-rose-100 hover:border-rose-200 hover:bg-rose-500/20"
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
    </section>
  )

  const editorSection = (
    <section className={`${panelClass} bg-ink-900/55`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Servis editoru
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Yeni servis ekle veya secili kaydi duzenle.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
          {editingApplicationId ? "Duzenle" : "Yeni"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">Servis adi</label>
          <input
            type="text"
            value={appNameDraft}
            onChange={(event) => setAppNameDraft(event.target.value)}
            placeholder="Orn: Telegram bot runner"
            disabled={!canManageApplications}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">Backend map</label>
          <select
            value={backendDraft}
            onChange={(event) => setBackendDraft(event.target.value)}
            disabled={applicationBackendOptions.length === 0 || !canManageApplications}
            className={inputClassName}
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
            rows={4}
            value={appAboutDraft}
            onChange={(event) => setAppAboutDraft(event.target.value)}
            placeholder="Kisa aciklama yaz."
            disabled={!canManageApplications}
            className={textAreaClassName}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-300">
          <span>Map durumu</span>
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
            className="flex-1 rounded-lg border border-emerald-300/45 bg-emerald-500/12 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingApplicationId ? "Guncelle" : "Kaydet"}
          </button>
          {canManageApplications && editingApplicationId && (
            <button
              type="button"
              onClick={handleEditCancel}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/[0.09]"
            >
              Iptal
            </button>
          )}
        </div>
      </div>

      {!canManageApplications && (
        <p className="mt-3 text-[11px] leading-5 text-amber-200/80">Servis yonetme yetkiniz yok.</p>
      )}
    </section>
  )

  const sessionsSection = (
    <section className={`${panelClass} bg-ink-900/55`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Oturumlar
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Genel log ve acik/cikmis tum servis calismalari.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
          {runSessions.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => setActiveConsoleTabId(HISTORY_CONSOLE_TAB_ID)}
          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
            activeRunSession
              ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              : "border-accent-400/50 bg-accent-500/[0.08]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">Genel Log</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Kalici servis gecmisi
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              {historyLogs.length}
            </span>
          </div>
        </button>

        {runSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-6 text-center text-xs text-slate-500">
            Henuz calisma oturumu yok.
          </div>
        ) : (
          runSessions.map((entry) => {
            const entryIsActive = activeConsoleTabId === entry.id
            const entryIsLive = isRunLive(entry.status)
            const statusMeta = getStatusMeta(entry.status)

            return (
              <div
                key={`run-session-${entry.id}`}
                className={`rounded-xl border p-2 transition ${
                  entryIsActive
                    ? "border-white/20 bg-white/[0.08]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveConsoleTabId(entry.id)}
                  className="w-full px-1 py-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-100">
                      {entry.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {(runLogsByTab[entry.id] || []).length} satir
                    </span>
                  </div>
                </button>
                {!entryIsLive && (
                  <button
                    type="button"
                    onClick={() => handleCloseRunTab(entry.id)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-slate-100"
                    aria-label={`${entry.label} sekmesini kapat`}
                  >
                    Sekmeyi kapat
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )

  const contextSection = (
    <section className={`${panelClass} bg-ink-900/55`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Secili baglam
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Secili servis veya aktif oturum detaylari.
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${activeContextBadgeClass}`}
        >
          {activeContextBadgeLabel}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Servis
          </p>
          <p className="mt-2 font-display text-lg text-white">{activeContextName}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-accent-200">
            {activeContextBackend}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-400">{activeContextAbout}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Durum notu
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{activeContextStateText}</p>
        </div>

        {!hasWsUrl && (
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-3 text-xs leading-5 text-amber-100">
            Websocket adresi yok. Servisleri calistirmak icin admin panelinden websocket
            adresi kaydedin.
          </div>
        )}
      </div>
    </section>
  )

  const consoleSection = (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-900/88 via-ink-900/78 to-ink-950/86 shadow-card">
      <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Operasyon yuzeyi
            </p>
            <div>
              <h2 className="font-display text-xl text-white">
                {activeRunSession ? activeRunSession.label : "Servis Konsolu"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {activeRunSession
                  ? activeRunSession.applicationAbout || "Servis aciklamasi yok."
                  : selectedApplication
                    ? selectedApplication.about || "Servis aciklamasi yok."
                    : "Calistirmak veya loglarini izlemek icin bir servis sec."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              {consoleLineLabel}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${connectionBadgeClass}`}
            >
              {connectionLabel}
            </span>
            {(activeRunSession || selectedApplication) && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {activeContextBackend}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 bg-ink-900/45 px-5 py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_150px_auto]">
          <select
            value={selectedApplicationId}
            onChange={(event) => setSelectedApplicationId(event.target.value)}
            disabled={!hasApplications}
            className={inputClassName}
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
            onClick={handleRun}
            disabled={!canRunSelectedApplication}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300/45 bg-emerald-500/12 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Calistir
          </button>

          <button
            type="button"
            onClick={() => handleCancelRun()}
            disabled={!canCancelActiveRun}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-300/45 bg-rose-500/12 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:border-rose-200/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Islemi iptal et
          </button>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={!canClearApplicationLogs || !canViewApplicationLogs || historyLogs.length === 0}
              className="inline-flex h-10 items-center rounded-lg border border-white/12 bg-white/[0.05] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/25 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Log temizle
            </button>
          </div>
        </div>
      </div>

      {activeRunPrompt && isActiveRunLive && (
        <div className="border-b border-white/10 bg-gradient-to-r from-accent-500/[0.08] via-white/[0.03] to-transparent px-5 py-4">
          <div className="rounded-xl border border-white/10 bg-ink-950/45 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/45 bg-emerald-500/12 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                Input
              </span>
              <p className="text-sm text-slate-200">{activeRunPrompt.message}</p>
            </div>

            {activeRunPrompt.step && (
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                Step: {activeRunPrompt.step}
              </p>
            )}

            <div className="mt-3">
              {activeRunPrompt.inputType === "choice" && (
                <div className="flex flex-wrap gap-2">
                  {activeRunPrompt.options.map((option) => (
                    <button
                      key={`choice-${option.value}`}
                      type="button"
                      onClick={() => handleUserInputSubmit(option.value, activeRunId)}
                      className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-white/30 hover:bg-white/[0.1]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {activeRunPrompt.inputType === "confirm" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserInputSubmit("evet", activeRunId)}
                    className="rounded-lg border border-emerald-300/45 bg-emerald-500/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/20"
                  >
                    Evet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserInputSubmit("hayir", activeRunId)}
                    className="rounded-lg border border-rose-300/45 bg-rose-500/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/20"
                  >
                    Hayir
                  </button>
                </div>
              )}

              {activeRunPrompt.inputType === "text" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={activeRunPromptValue}
                    onChange={(event) => {
                      const targetRunId = String(activeRunId ?? "").trim()
                      if (!targetRunId) return
                      setPendingUserInputValueByRunId((prev) => ({
                        ...prev,
                        [targetRunId]: event.target.value,
                      }))
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleUserInputSubmit("", activeRunId)
                      }
                    }}
                    placeholder={activeRunPrompt.placeholder || "Cevap girin ve Enter"}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => handleUserInputSubmit("", activeRunId)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-white/30 hover:bg-white/[0.1]"
                  >
                    Gonder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="no-scrollbar h-[420px] overflow-y-auto bg-gradient-to-b from-ink-950/45 via-ink-950/30 to-ink-950/15 px-5 py-4 sm:h-[520px]">
        {!canViewApplicationLogs ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
            Servis Konsolu log goruntuleme yetkiniz yok.
          </div>
        ) : !activeRunSession && isLogsLoading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
            Loglar yukleniyor...
          </div>
        ) : consoleLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
            Beklenen log akisi burada gorunecek.
          </div>
        ) : (
          <div className="space-y-2">
            {consoleLogs.map((entry) => {
              const statusMeta = getStatusMeta(entry.status)
              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border px-3 py-3 ${statusMeta.surfaceClass}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex flex-wrap items-center gap-2 sm:w-[190px] sm:flex-none">
                      <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {entry.time}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusMeta.badgeClass}`}
                      >
                        {entry.status === "success"
                          ? "OK"
                          : entry.status === "error"
                            ? "ERR"
                            : entry.status === "connecting"
                              ? "CON"
                              : "RUN"}
                      </span>
                    </div>
                    <div className="min-w-0 font-mono text-[11px] leading-6 text-slate-100 sm:text-[12px]">
                      {sanitizeLogMessage(entry.message)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )

  if (isTabLoading) {
    return <ApplicationsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-5">
      {heroSection}

      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          {librarySection}
          {editorSection}
        </aside>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:order-1">
            {sessionsSection}
            {contextSection}
          </aside>

          <div className="lg:order-2">{consoleSection}</div>
        </div>
      </div>
    </div>
  )
}
