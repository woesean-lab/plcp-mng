import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronUpDownIcon, PauseIcon, PlayIcon } from "@heroicons/react/20/solid"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"
import { renderActionToast } from "../../utils/actionToast"

const MAX_LOG_ENTRIES = 300
const CMD_VISIBLE_ROWS = 15
const MASKED_BACKEND_TEXT = "******"
const HISTORY_CONSOLE_TAB_ID = "__history__"
const CMD_WINDOW_TITLE = "Canli Operasyon"
const LOG_URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi
const TRANSIENT_NETWORK_ERROR_MESSAGES = new Set([
  "failed to fetch",
  "load failed",
  "network request failed",
])
const START_RECOVERY_WINDOW_MS = 15000
const START_RECOVERY_DELAYS_MS = [0, 700, 1500]

const isTransientNetworkError = (error) => {
  const name = String(error?.name ?? "").trim().toLowerCase()
  const message = String(error?.message ?? "").trim().toLowerCase()
  return (
    name === "aborterror" ||
    message.includes("networkerror") ||
    TRANSIENT_NETWORK_ERROR_MESSAGES.has(message)
  )
}

const getRequestErrorMessage = (error, fallback) => {
  const normalizedFallback = String(fallback ?? "").trim() || "Islem tamamlanamadi."
  const message = String(error?.message ?? "").trim()
  if (!message || isTransientNetworkError(error)) return normalizedFallback
  return message
}

const waitForRetry = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })

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

const sortRunSessionsDesc = (a, b) => {
  const startedDiff = Number(b?.startedAtMs ?? 0) - Number(a?.startedAtMs ?? 0)
  if (startedDiff !== 0) return startedDiff
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""))
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

const splitTrailingLinkSuffix = (value) => {
  let url = String(value ?? "")
  let suffix = ""

  while (url && /[),.;!?\]}]+$/.test(url)) {
    suffix = `${url.slice(-1)}${suffix}`
    url = url.slice(0, -1)
  }

  return { url, suffix }
}

const splitLogMessageLinks = (value) => {
  const message = String(value ?? "")
  if (!message) return []

  const segments = []
  const regex = new RegExp(LOG_URL_REGEX)
  let lastIndex = 0
  let match = regex.exec(message)

  while (match) {
    const startIndex = match.index
    const rawMatch = match[0]
    const { url, suffix } = splitTrailingLinkSuffix(rawMatch)

    if (startIndex > lastIndex) {
      segments.push({ type: "text", value: message.slice(lastIndex, startIndex) })
    }

    if (url) {
      segments.push({ type: "link", value: url })
    }

    if (suffix) {
      segments.push({ type: "text", value: suffix })
    }

    lastIndex = startIndex + rawMatch.length
    match = regex.exec(message)
  }

  if (lastIndex < message.length) {
    segments.push({ type: "text", value: message.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: "text", value: message }]
}

const getConsoleStatusMeta = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (normalized === "success") {
    return {
      code: "OK",
      dotClass: "bg-emerald-300",
      textClass: "text-emerald-300",
    }
  }
  if (normalized === "error") {
    return {
      code: "ERR",
      dotClass: "bg-rose-300",
      textClass: "text-rose-300",
    }
  }
  if (normalized === "connecting") {
    return {
      code: "CON",
      dotClass: "bg-sky-300",
      textClass: "text-sky-300",
    }
  }
  return {
    code: "RUN",
    dotClass: "bg-sky-300",
    textClass: "text-sky-300",
  }
}

const getRunSessionStateMeta = (status, connectionState) => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase()
  const normalizedConnection = String(connectionState ?? "").trim().toLowerCase()
  if (normalizedStatus === "success") {
    return {
      label: "Tamamlandi",
      badgeClass: "border-sky-400/30 bg-sky-500/12 text-sky-100",
      metaClass: "text-sky-200",
      dotClass: "bg-sky-300",
    }
  }
  if (normalizedStatus === "error" || normalizedConnection === "error") {
    return {
      label: normalizedConnection === "error" ? "Baglanti hatasi" : "Hata",
      badgeClass: "border-rose-400/30 bg-rose-500/12 text-rose-100",
      metaClass: "text-rose-200",
      dotClass: "bg-rose-300",
    }
  }
  if (normalizedStatus === "connecting" || normalizedConnection === "connecting") {
    return {
      label: "Baglaniyor",
      badgeClass: "border-sky-400/30 bg-sky-500/12 text-sky-100",
      metaClass: "text-sky-200",
      dotClass: "bg-sky-300",
    }
  }
  return {
    label: "Calisiyor",
    badgeClass: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100",
    metaClass: "text-emerald-200",
    dotClass: "bg-emerald-300",
  }
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
  isActive = false,
  backendOptions = [],
  automationWsUrl = "",
  activeUsername = "",
  canManageApplications = false,
  canRunApplications = false,
  canViewApplicationLogs = false,
  canClearApplicationLogs = false,
  canViewApplicationBackendMap = false,
  onNavigateToTab,
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
  const [pendingUserInputValueByRunId, setPendingUserInputValueByRunId] = useState({})
  const [isRunApplicationMenuOpen, setIsRunApplicationMenuOpen] = useState(false)
  const runSessionsRef = useRef([])
  const dismissedRunIdsRef = useRef(new Set())
  const seenLiveRunIdsRef = useRef(new Set())
  const completedToastRunIdsRef = useRef(new Set())
  const activeRunToastIdsRef = useRef(new Set())
  const runSessionsRequestInFlightRef = useRef(false)
  const runSnapshotRequestByIdRef = useRef({})
  const runApplicationMenuRef = useRef(null)
  const canAccessApplications =
    canManageApplications || canRunApplications || canViewApplicationLogs || canClearApplicationLogs

  const focusApplicationRun = useCallback(
    (runEntry) => {
      const normalizedRunId = String(runEntry?.id ?? "").trim()
      if (!normalizedRunId) return
      const normalizedApplicationId = String(runEntry?.applicationId ?? "").trim()
      if (typeof onNavigateToTab === "function") {
        onNavigateToTab("applications")
      }
      if (normalizedApplicationId) {
        setSelectedApplicationId(normalizedApplicationId)
      }
      setActiveConsoleTabId(normalizedRunId)
    },
    [onNavigateToTab],
  )

  const buildRunToastContent = useCallback(
    (message, runEntry) =>
      renderActionToast(message, "Isleme git", () => {
        focusApplicationRun(runEntry)
      }),
    [focusApplicationRun],
  )

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

  const normalizeApplicationRunSession = useCallback(
    (entry) => {
      const id = String(entry?.id ?? "").trim()
      const label = String(entry?.label ?? "").trim()
      const applicationId = String(entry?.applicationId ?? "").trim()
      const applicationName = String(entry?.applicationName ?? "").trim()
      const applicationAbout = String(entry?.applicationAbout ?? "").trim()
      const backendKey = String(entry?.backendKey ?? "").trim()
      if (!id || !label || !applicationId || !applicationName || !backendKey) return null
      const backendLabel = String(entry?.backendLabel ?? backendKey).trim() || backendKey
      const startedAtMs = Number(entry?.startedAtMs ?? 0)
      const endedAtMs = Number(entry?.endedAtMs ?? 0)
      return {
        id,
        label,
        serial: Number(entry?.serial ?? 0) || 0,
        applicationId,
        applicationName,
        applicationAbout,
        backendKey,
        backendLabel,
        status: String(entry?.status ?? "").trim() || "error",
        connectionState: String(entry?.connectionState ?? "").trim() || "idle",
        startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : 0,
        endedAtMs: Number.isFinite(endedAtMs) ? endedAtMs : 0,
        createdByUsername: String(entry?.createdByUsername ?? "").trim(),
        pendingPrompt: entry?.pendingPrompt
          ? normalizeUserInputPrompt(entry.pendingPrompt, backendKey)
          : null,
      }
    },
    [normalizeUserInputPrompt],
  )

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

  const copyTextToClipboard = useCallback(async (value) => {
    const text = String(value ?? "").trim()
    if (!text) return

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.setAttribute("readonly", "")
        textarea.style.position = "absolute"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        const didCopy = document.execCommand("copy")
        document.body.removeChild(textarea)
        if (!didCopy) throw new Error("copy-failed")
      } else {
        throw new Error("clipboard-unavailable")
      }

      toast.success("Link kopyalandi.")
    } catch {
      toast.error("Link kopyalanamadi.")
    }
  }, [])

  useEffect(() => {
    if (applicationBackendOptions.length === 0) {
      setBackendDraft("")
      return
    }
    if (!backendDraft || !applicationBackendOptions.some((entry) => entry.key === backendDraft)) {
      setBackendDraft(applicationBackendOptions[0].key)
    }
  }, [applicationBackendOptions, backendDraft])

  useEffect(() => {
    runSessionsRef.current = runSessions
  }, [runSessions])

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
        toast.error(getRequestErrorMessage(error, "Servis listesi alinamadi."))
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
      setIsRunApplicationMenuOpen(false)
      return
    }
    if (!selectedApplicationId || !runDropdownApplications.some((entry) => entry.id === selectedApplicationId)) {
      setSelectedApplicationId(runDropdownApplications[0].id)
    }
  }, [runDropdownApplications, selectedApplicationId])

  useEffect(() => {
    if (!isRunApplicationMenuOpen) return undefined

    const handlePointerDown = (event) => {
      const menuNode = runApplicationMenuRef.current
      if (menuNode && !menuNode.contains(event.target)) {
        setIsRunApplicationMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsRunApplicationMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isRunApplicationMenuOpen])

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

  useEffect(() => {
    const appId = String(selectedApplicationId ?? "").trim()
    if (!appId || !canViewApplicationLogs) {
      setIsLogsLoading(false)
      return
    }

    let isMounted = true
    let hasLoadError = false
    let hasLoadedOnce = false

    const loadLogs = async () => {
      if (!hasLoadedOnce) {
        setIsLogsLoading(true)
      }
      try {
        const res = await apiFetchApplications(`/api/applications/${encodeURIComponent(appId)}/logs`, {
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
        hasLoadError = false
        hasLoadedOnce = true
      } catch (error) {
        if (!isMounted) return
        if (!hasLoadError) {
          toast.error(getRequestErrorMessage(error, "Servis Konsolu loglari alinamadi."))
          hasLoadError = true
        }
        hasLoadedOnce = true
      } finally {
        if (isMounted) setIsLogsLoading(false)
      }
    }

    void loadLogs()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      void loadLogs()
    }, 3000)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      void loadLogs()
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
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

  const syncRunSessions = useCallback(
    (payload) => {
      const normalizedRuns = Array.isArray(payload)
        ? payload.map(normalizeApplicationRunSession).filter(Boolean)
        : []

      normalizedRuns.forEach((entry) => {
        if (isRunLive(entry.status)) {
          seenLiveRunIdsRef.current.add(entry.id)
        }
      })

      setRunSessions((prev) => {
        const prevById = new Map(prev.map((entry) => [entry.id, entry]))
        return normalizedRuns
          .filter((entry) => !(dismissedRunIdsRef.current.has(entry.id) && !isRunLive(entry.status)))
          .map((entry) => ({ ...(prevById.get(entry.id) || {}), ...entry }))
          .sort(sortRunSessionsDesc)
      })

      setPendingUserInputValueByRunId((prev) => {
        let next = prev
        const promptRunIds = new Set(
          normalizedRuns.filter((entry) => entry.pendingPrompt).map((entry) => entry.id),
        )
        const runIds = new Set(normalizedRuns.map((entry) => entry.id))
        Object.keys(prev).forEach((runId) => {
          if (runIds.has(runId) && promptRunIds.has(runId)) return
          if (next === prev) next = { ...prev }
          delete next[runId]
        })
        return next
      })
    },
    [isRunLive, normalizeApplicationRunSession],
  )

  const applyRunSnapshot = useCallback(
    (payload) => {
      const normalizedRun = normalizeApplicationRunSession(payload?.run ?? payload)
      if (!normalizedRun) return null

      dismissedRunIdsRef.current.delete(normalizedRun.id)
      if (isRunLive(normalizedRun.status)) {
        seenLiveRunIdsRef.current.add(normalizedRun.id)
      }

      setRunSessions((prev) => {
        const current = prev.find((entry) => entry.id === normalizedRun.id) || null
        const next = [{ ...(current || {}), ...normalizedRun }, ...prev.filter((entry) => entry.id !== normalizedRun.id)]
        return next.sort(sortRunSessionsDesc)
      })

      if (Array.isArray(payload?.logs)) {
        const normalizedLogs = payload.logs.map(normalizeApplicationLogEntry).filter(Boolean)
        setRunLogsByTab((prev) => ({
          ...prev,
          [normalizedRun.id]: normalizedLogs,
        }))
      }

      if (!normalizedRun.pendingPrompt) {
        setPendingUserInputValueByRunId((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, normalizedRun.id)) return prev
          const next = { ...prev }
          delete next[normalizedRun.id]
          return next
        })
      }

      return normalizedRun
    },
    [isRunLive, normalizeApplicationLogEntry, normalizeApplicationRunSession],
  )

  const fetchRunSessions = useCallback(
    async ({ silent = true } = {}) => {
      if (!canAccessApplications) return
      if (runSessionsRequestInFlightRef.current) return
      runSessionsRequestInFlightRef.current = true
      try {
        const res = await apiFetchApplications("/api/application-runs")
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis oturumlari alinamadi.")
        }
        const payload = await res.json()
        syncRunSessions(payload)
      } catch (error) {
        if (!silent) {
          toast.error(getRequestErrorMessage(error, "Servis oturumlari alinamadi."))
        }
      } finally {
        runSessionsRequestInFlightRef.current = false
      }
    },
    [apiFetchApplications, canAccessApplications, readApiError, syncRunSessions],
  )

  const fetchRunSnapshot = useCallback(
    async (runId, { silent = true } = {}) => {
      const normalizedRunId = String(runId ?? "").trim()
      if (!normalizedRunId) return null
      if (runSnapshotRequestByIdRef.current?.[normalizedRunId]) return null
      runSnapshotRequestByIdRef.current[normalizedRunId] = true
      try {
        const res = await apiFetchApplications(`/api/application-runs/${encodeURIComponent(normalizedRunId)}`)
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Servis oturumu alinamadi.")
        }
        return applyRunSnapshot(await res.json())
      } catch (error) {
        if (!silent) {
          toast.error(getRequestErrorMessage(error, "Servis oturumu alinamadi."))
        }
        return null
      } finally {
        delete runSnapshotRequestByIdRef.current[normalizedRunId]
      }
    },
    [apiFetchApplications, applyRunSnapshot, readApiError],
  )

  const recoverApplicationRunAfterTransientStartError = useCallback(
    async (applicationId, startedAtMs) => {
      const normalizedApplicationId = String(applicationId ?? "").trim()
      if (!normalizedApplicationId) return null

      for (const delayMs of START_RECOVERY_DELAYS_MS) {
        if (delayMs > 0) {
          await waitForRetry(delayMs)
        }

        try {
          const res = await apiFetchApplications("/api/application-runs")
          if (!res.ok) {
            continue
          }

          const payload = await res.json()
          const normalizedRuns = Array.isArray(payload)
            ? payload.map(normalizeApplicationRunSession).filter(Boolean)
            : []

          syncRunSessions(payload)

          const recoveredRun =
            normalizedRuns.find(
              (entry) =>
                entry.applicationId === normalizedApplicationId &&
                Number(entry.startedAtMs ?? 0) >= startedAtMs - START_RECOVERY_WINDOW_MS,
            ) || null

          if (recoveredRun) {
            return recoveredRun
          }
        } catch {
          // Ignore transient recovery failures and keep retrying.
        }
      }

      return null
    },
    [apiFetchApplications, normalizeApplicationRunSession, syncRunSessions],
  )

  useEffect(() => {
    if (!canAccessApplications) {
      setRunSessions([])
      setRunLogsByTab({})
      return
    }
    if (!isActive) return

    const sync = () => {
      void fetchRunSessions({ silent: true })
    }

    sync()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      sync()
    }, 2500)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      sync()
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [canAccessApplications, fetchRunSessions, isActive])

  useEffect(() => {
    if (!activeRunId || !isActive) return

    const sync = () => {
      void fetchRunSnapshot(activeRunId, { silent: true })
    }

    sync()

    const intervalId = isRunLive(activeRunSession?.status)
      ? window.setInterval(() => {
          if (document.visibilityState === "hidden") return
          sync()
        }, 1500)
      : null

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      sync()
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [activeRunId, activeRunSession?.status, fetchRunSnapshot, isActive, isRunLive])

  useEffect(() => {
    runSessions.forEach((entry) => {
      if (isRunLive(entry.status)) {
        if (!activeRunToastIdsRef.current.has(entry.id)) {
          activeRunToastIdsRef.current.add(entry.id)
          toast.loading(buildRunToastContent(`${entry.label} calisiyor...`, entry), {
            id: `application-run-${entry.id}`,
            position: "top-right",
          })
        }
        seenLiveRunIdsRef.current.add(entry.id)
        return
      }
      if (!seenLiveRunIdsRef.current.has(entry.id)) return
      if (completedToastRunIdsRef.current.has(entry.id)) return

      completedToastRunIdsRef.current.add(entry.id)
      const toastId = activeRunToastIdsRef.current.has(entry.id)
        ? `application-run-${entry.id}`
        : undefined
      activeRunToastIdsRef.current.delete(entry.id)
      if (entry.status === "success") {
        toast.success(buildRunToastContent(`${entry.applicationName}: Servis hatasiz bitirildi.`, entry), {
          id: toastId,
          position: "top-right",
        })
      } else if (entry.status === "error") {
        toast.error(buildRunToastContent(`${entry.applicationName} tamamlanamadi.`, entry), {
          id: toastId,
          position: "top-right",
        })
      }
    })
  }, [buildRunToastContent, isRunLive, runSessions])

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
      toast.error(getRequestErrorMessage(error, "Servis kaydedilemedi."))
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
      toast.error(getRequestErrorMessage(error, "Servis durumu guncellenemedi."))
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
      toast.error(getRequestErrorMessage(error, "Servis silinemedi."))
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
      dismissedRunIdsRef.current.add(normalizedRunId)
      setRunSessions((prev) => prev.filter((entry) => entry.id !== normalizedRunId))
      runSessionsRef.current = runSessionsRef.current.filter((entry) => entry.id !== normalizedRunId)
      setRunLogsByTab((prev) => {
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
      if (activeConsoleTabId === normalizedRunId) {
        setActiveConsoleTabId(HISTORY_CONSOLE_TAB_ID)
      }
    },
    [activeConsoleTabId, isRunLive],
  )

  const handleRun = useCallback(async () => {
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

    const requestStartedAtMs = Date.now()

    try {
      const res = await apiFetchApplications(
        `/api/applications/${encodeURIComponent(selectedApplication.id)}/run`,
        {
          method: "POST",
        },
      )
      if (!res.ok) {
        const apiError = await readApiError(res)
        const message =
          apiError === "automation_ws_url_missing"
            ? "Websocket adresi bulunamadi. Admin panelinden kaydedin."
            : apiError === "application_inactive"
              ? "Secilen servis kapali. Once aktif edin."
              : apiError || "Servis baslatilamadi."
        throw new Error(message)
      }

      const runEntry = applyRunSnapshot(await res.json())
      if (!runEntry) {
        throw new Error("Servis oturumu olusturulamadi.")
      }

      completedToastRunIdsRef.current.delete(runEntry.id)
      if (isRunLive(runEntry.status)) {
        activeRunToastIdsRef.current.add(runEntry.id)
        toast.loading(buildRunToastContent(`${runEntry.label} calisiyor...`, runEntry), {
          id: `application-run-${runEntry.id}`,
          position: "top-right",
        })
      }
      setActiveConsoleTabId(runEntry.id)
    } catch (error) {
      if (isTransientNetworkError(error)) {
        const recoveredRun = await recoverApplicationRunAfterTransientStartError(
          selectedApplication.id,
          requestStartedAtMs,
        )
        if (recoveredRun) {
          setActiveConsoleTabId(recoveredRun.id)
          return
        }
      }

      toast.error(getRequestErrorMessage(error, "Servis baslatilamadi."))
    }
  }, [
    apiFetchApplications,
    applyRunSnapshot,
    automationWsUrl,
    canRunApplications,
    buildRunToastContent,
    isRunLive,
    readApiError,
    recoverApplicationRunAfterTransientStartError,
    selectedApplication,
  ])

  const handleCancelRun = useCallback(
    async (runIdOverride = "") => {
      const targetRunId = String(runIdOverride || activeRunId).trim()
      if (!targetRunId) return
      const runEntry = runSessionsRef.current.find((entry) => entry.id === targetRunId) || null
      if (!runEntry || !isRunLive(runEntry.status)) return
      try {
        const res = await apiFetchApplications(
          `/api/application-runs/${encodeURIComponent(targetRunId)}/cancel`,
          {
            method: "POST",
          },
        )
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Islem iptal edilemedi.")
        }
        applyRunSnapshot(await res.json())
        toast("Islem iptal edildi.", { position: "top-right" })
      } catch (error) {
        toast.error(getRequestErrorMessage(error, "Islem iptal edilemedi."))
      }
    },
    [activeRunId, apiFetchApplications, applyRunSnapshot, isRunLive, readApiError],
  )

  const handleUserInputSubmit = useCallback(
    async (forcedValue = "", runIdOverride = "") => {
      const targetRunId = String(runIdOverride || activeRunId).trim()
      if (!targetRunId) return
      const runEntry = runSessionsRef.current.find((entry) => entry.id === targetRunId) || null
      if (!runEntry || !isRunLive(runEntry.status)) return

      const pendingUserInput = runEntry.pendingPrompt
      if (!pendingUserInput) return

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
        const res = await apiFetchApplications(
          `/api/application-runs/${encodeURIComponent(targetRunId)}/input`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: valueToSend }),
          },
        )
        if (!res.ok) {
          const apiError = await readApiError(res)
          const message =
            apiError === "application_run_socket_not_open"
              ? "Servis baglantisi hazir degil."
              : apiError === "application_run_input_not_requested"
                ? "Bekleyen bir kullanici girdisi yok."
                : apiError || "Kullanici girdisi gonderilemedi."
          throw new Error(message)
        }
        applyRunSnapshot(await res.json())
      } catch (error) {
        toast.error(getRequestErrorMessage(error, "Kullanici girdisi gonderilemedi."))
      }
    },
    [
      activeRunId,
      apiFetchApplications,
      applyRunSnapshot,
      isRunLive,
      pendingUserInputValueByRunId,
      readApiError,
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
      toast.error(getRequestErrorMessage(error, "Servis Konsolu loglari temizlenemedi."))
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
  const visibleConsoleLogs = useMemo(
    () => (activeRunSession ? consoleLogs.slice(0, CMD_VISIBLE_ROWS) : consoleLogs),
    [activeRunSession, consoleLogs],
  )
  const emptyConsoleLogRows = useMemo(
    () => (activeRunSession ? Math.max(0, CMD_VISIBLE_ROWS - visibleConsoleLogs.length) : 0),
    [activeRunSession, visibleConsoleLogs],
  )
  const activeRunPrompt = activeRunSession?.pendingPrompt || null
  const activeRunPromptValue = activeRunSession
    ? String(pendingUserInputValueByRunId[activeRunSession.id] ?? "")
    : ""
  const isActiveRunLive = activeRunSession ? isRunLive(activeRunSession.status) : false
  const isTabLoading = isLoading || isApplicationsLoading
  const hasWsUrl = String(automationWsUrl ?? "").trim().length > 0
  const commandPromptLabel = `${String(activeUsername ?? "").trim() || "kullanici"}>`
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
  const runActionDisabled =
    !canRunApplications || !selectedApplication || !selectedApplication.isActive || !hasWsUrl
  const consoleSubtitle = activeRunSession
    ? "Canli oturum akisi ve kullanici girdileri"
    : "Secili servisin kayitli log akisi"
  const terminalButtonBaseClass =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
  const terminalButtonNeutralClass =
    `${terminalButtonBaseClass} border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 focus:ring-slate-300/20`
  const terminalRunButtonClass =
    `${terminalButtonBaseClass} rounded-xl border border-emerald-300/60 bg-emerald-500/15 px-4 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-500/25 focus:ring-emerald-500/25`
  const terminalPromptButtonClass =
    `${terminalButtonNeutralClass} min-w-0 w-full justify-start break-words px-3 text-left sm:w-auto sm:justify-center sm:text-center`
  const isHistoryConsoleActive = activeConsoleTabId === HISTORY_CONSOLE_TAB_ID
  const runSelectorButtonClass = `flex h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left text-[13px] text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60 ${
    isRunApplicationMenuOpen
      ? "border-sky-300/35 bg-[#101827] text-white"
      : "border-white/10 bg-[#0b1018] hover:border-sky-300/20 hover:bg-[#0f1622]"
  }`
  const historyConsoleTabClass = `inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-left transition ${
    isHistoryConsoleActive
      ? "border-white/15 bg-white/[0.08] text-slate-100 hover:border-white/20 hover:bg-white/[0.1]"
      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-slate-100"
  }`

  if (isTabLoading) {
    return <ApplicationsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Servis</h1>
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

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-3">
        <section className={`order-1 min-w-0 ${panelClass} bg-[#0b0f19]/60 lg:col-span-2`}>
          <div className="space-y-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Servis calistir
                </p>
                <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
                  Servis sec, islemi baslat ve akisi bu alandan takip et.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f141d] shadow-card">
              <section className="overflow-hidden rounded-2xl bg-white/[0.02]">
                <div className="border-b border-white/10 px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0b1119] px-3">
                        <span className="h-6 w-1 rounded-full bg-accent-400/80 shadow-glow" />
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-200">
                              Pulcip
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
                              Core
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[440px] xl:flex-row xl:items-stretch">
                      <div ref={runApplicationMenuRef} className="relative min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasApplications) return
                            setIsRunApplicationMenuOpen((prev) => !prev)
                          }}
                          disabled={!hasApplications}
                          className={runSelectorButtonClass}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-100">
                              {selectedApplication?.name || "Kayitli servis yok"}
                            </p>
                          </div>
                          <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                            <ChevronUpDownIcon
                              className={`h-4 w-4 transition ${
                              isRunApplicationMenuOpen ? "text-sky-200" : "text-slate-500"
                              }`}
                              aria-hidden="true"
                            />
                          </span>
                        </button>

                        {isRunApplicationMenuOpen && hasApplications && (
                          <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0f17] shadow-[0_20px_45px_rgba(2,6,23,0.5)]">
                            <div className="max-h-72 overflow-y-auto p-2">
                              {runDropdownApplications.map((entry) => {
                                const isSelected = entry.id === selectedApplicationId
                                return (
                                  <button
                                    key={`run-app-${entry.id}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedApplicationId(entry.id)
                                      setIsRunApplicationMenuOpen(false)
                                    }}
                                    className={`group flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition ${
                                      isSelected
                                        ? "border-sky-300/25 bg-sky-500/[0.09] text-white"
                                        : "border-transparent bg-transparent text-slate-200 hover:border-sky-300/20 hover:bg-sky-500/[0.08] hover:text-white"
                                    }`}
                                  >
                                    <span className="truncate text-[13px] font-semibold">{entry.name}</span>
                                    <span
                                      className={`mt-1 line-clamp-2 text-[11px] leading-5 ${
                                        isSelected ? "text-sky-50/75" : "text-slate-400 group-hover:text-sky-100/80"
                                      }`}
                                    >
                                      {entry.about}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleRun}
                        disabled={runActionDisabled}
                        className={`${terminalRunButtonClass} h-12 w-full gap-2 text-[11px] xl:w-[152px]`}
                      >
                        <PlayIcon className="h-4 w-4" aria-hidden="true" />
                        Calistir
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="no-scrollbar overflow-x-auto">
                      <div className="flex min-w-max items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveConsoleTabId(HISTORY_CONSOLE_TAB_ID)}
                          className={historyConsoleTabClass}
                        >
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                          <span className="text-[12px] font-semibold">Log</span>
                        </button>

                        {runSessions.map((entry) => {
                          const entryIsActive = activeConsoleTabId === entry.id
                          const entryIsLive = isRunLive(entry.status)
                          const entryStateMeta = getRunSessionStateMeta(entry.status, entry.connectionState)
                          const entryDisplayLabel = entry.serial > 0 ? `[#${entry.serial}]` : `[#${entry.id}]`
                          const entryToneClass = entry.status === "success"
                            ? entryIsActive
                              ? "border-sky-300/25 bg-sky-500/10 shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                              : "border-sky-300/15 bg-sky-500/[0.06] hover:border-sky-300/25 hover:bg-sky-500/[0.10]"
                            : entry.status === "error" || entry.connectionState === "error"
                              ? entryIsActive
                                ? "border-rose-300/25 bg-rose-500/10 shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                                : "border-rose-300/15 bg-rose-500/[0.06] hover:border-rose-300/25 hover:bg-rose-500/[0.10]"
                              : entryIsActive
                                ? "border-emerald-300/25 bg-emerald-500/10 shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                                : "border-emerald-300/15 bg-emerald-500/[0.06] hover:border-emerald-300/25 hover:bg-emerald-500/[0.10]"

                          return (
                            <div
                              key={`run-tab-${entry.id}`}
                              className={`relative rounded-xl border transition ${entryToneClass}`}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveConsoleTabId(entry.id)}
                                className="flex h-12 items-center gap-2 px-3.5 pr-9 text-left"
                                title={entry.label}
                              >
                                <span className={`h-2 w-2 rounded-full ${entryStateMeta.dotClass}`} />
                                <span className="min-w-0">
                                  <span
                                    className={`block max-w-[150px] truncate text-[12px] font-semibold ${
                                      entryIsActive ? "text-slate-100" : "text-white"
                                    }`}
                                  >
                                    {entryDisplayLabel}
                                  </span>
                                  <span className="mt-0.5 block max-w-[150px] truncate text-[10px] text-slate-400">
                                    {entry.applicationName}
                                  </span>
                                </span>
                              </button>

                              {entryIsLive ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelRun(entry.id)}
                                  className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300/40 hover:bg-emerald-500/15 hover:text-emerald-100"
                                  aria-label={`${entry.label} islemini iptal et`}
                                >
                                  <PauseIcon className="h-3 w-3" aria-hidden="true" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCloseRunTab(entry.id)}
                                  className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                                  aria-label={`${entry.label} sekmesini kapat`}
                                >
                                  x
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    {!hasWsUrl && (
                      <span className="rounded-full border border-amber-300/20 bg-amber-500/8 px-2.5 py-1 text-amber-200">
                        websocket adresi kayitli degil
                      </span>
                    )}
                  </div>
                </div>

                <div className="no-scrollbar h-[360px] overflow-y-auto overflow-x-hidden bg-[#070b12] px-3 py-3 font-mono text-[11px] leading-5 md:h-[336px] md:text-[12px] md:leading-6">
                  {!canViewApplicationLogs ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      Servis Konsolu log goruntuleme yetkiniz yok.
                    </div>
                  ) : !activeRunSession && isLogsLoading ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      Loglar yukleniyor...
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="mb-2 flex flex-wrap items-center justify-end gap-1.5 text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        <span className="inline-flex h-6 items-center rounded-md border border-white/10 bg-white/[0.03] px-2">
                          {runSessions.length} acik
                        </span>
                        <span className="inline-flex h-6 items-center rounded-md border border-white/10 bg-white/[0.03] px-2">
                          {activeRunSession ? "canli oturum" : "log akis"}
                        </span>
                        <span className="inline-flex h-6 items-center rounded-md border border-white/10 bg-white/[0.03] px-2 font-mono">
                          {consoleLogs.length} satir
                        </span>
                      </div>
                      {!activeRunPrompt && (
                        <p className="mb-2 text-[11px] text-slate-500">{consoleSubtitle}</p>
                      )}
                      {activeRunPrompt && isActiveRunLive && (
                        <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                          <div className="flex min-w-0 flex-col gap-2 text-slate-300">
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <span className="inline-flex h-6 items-center rounded-md border border-emerald-300/25 bg-emerald-500/10 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                                Prompt
                              </span>
                              <span className="hidden flex-none text-slate-500 sm:inline">{commandPromptLabel}</span>
                              <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                              <span className="min-w-0 break-words text-slate-100">{activeRunPrompt.message}</span>
                            </div>
                            {activeRunPrompt.inputType === "text" && (
                              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
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
                                  placeholder={activeRunPrompt.placeholder || "cevap yaz ve Enter"}
                                  className="h-10 w-full min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a1018] px-3 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUserInputSubmit("", activeRunId)}
                                  className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:border-emerald-200 hover:bg-emerald-500/25"
                                >
                                  Gonder
                                </button>
                              </div>
                            )}
                          </div>
                          {activeRunPrompt.step && (
                            <p className="mt-1 text-[11px] text-slate-500">Adim: {activeRunPrompt.step}</p>
                          )}
                          {activeRunPrompt.inputType === "choice" && (
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {activeRunPrompt.options.map((option) => (
                                <button
                                  key={`choice-${option.value}`}
                                  type="button"
                                  onClick={() => handleUserInputSubmit(option.value, activeRunId)}
                                  className={terminalPromptButtonClass}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {activeRunPrompt.inputType === "confirm" && (
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => handleUserInputSubmit("evet", activeRunId)}
                                className={terminalPromptButtonClass}
                              >
                                Evet
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUserInputSubmit("hayir", activeRunId)}
                                className={terminalPromptButtonClass}
                              >
                                Hayir
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {visibleConsoleLogs.map((entry) => {
                        const statusMeta = getConsoleStatusMeta(entry.status)
                        const sanitizedMessage = sanitizeLogMessage(entry.message)
                        const messageSegments = splitLogMessageLinks(sanitizedMessage)

                        return (
                          <div key={entry.id} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap">
                            <span className="hidden flex-none text-slate-500 sm:inline">{commandPromptLabel}</span>
                            <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                            <span className={`flex-none ${statusMeta.textClass}`}>[{entry.time}]</span>
                            <span className={`flex-none ${statusMeta.textClass}`}>{statusMeta.code}</span>
                            <span className="min-w-0 break-words text-slate-100">
                              {messageSegments.map((segment, index) =>
                                segment.type === "link" ? (
                                  <button
                                    key={`${entry.id}-segment-${index}`}
                                    type="button"
                                    onClick={() => void copyTextToClipboard(segment.value)}
                                    className="inline break-all bg-transparent p-0 text-left align-baseline text-accent-200 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-accent-100 hover:decoration-accent-300 focus:outline-none"
                                    title="Tiklayinca kopyalanir"
                                  >
                                    {segment.value}
                                  </button>
                                ) : (
                                  <span key={`${entry.id}-segment-${index}`}>{segment.value}</span>
                                ),
                              )}
                            </span>
                          </div>
                        )
                      })}

                      {Array.from({ length: emptyConsoleLogRows }).map((_, index) => (
                        <div key={`console-placeholder-${index}`} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap">
                          <span className="hidden flex-none text-slate-600 sm:inline">{commandPromptLabel}</span>
                          <span className="flex-none text-slate-600 sm:hidden">&gt;</span>
                          <span className="flex-none text-slate-700">[--:--]</span>
                          <span className="flex-none text-slate-700">--</span>
                          <span
                            className={`truncate text-slate-700 ${
                              consoleLogs.length === 0 && index === 0 ? "text-slate-500" : "opacity-0"
                            }`}
                          >
                            {consoleLogs.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className={`order-2 min-w-0 self-start ${panelClass} bg-ink-900/60 lg:order-2 lg:col-span-1`}>
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
