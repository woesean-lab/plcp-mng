import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"

const CMD_VISIBLE_ROWS = 14
const MAX_LOG_ENTRIES = 300

const normalizeBackendKind = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

const isApplicationBackendKind = (value) => normalizeBackendKind(value) === "uygulama"

const formatLogTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

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
  canManageApplications = false,
  canRunApplications = false,
  canViewApplicationLogs = false,
  canClearApplicationLogs = false,
}) {
  const [appNameDraft, setAppNameDraft] = useState("")
  const [appAboutDraft, setAppAboutDraft] = useState("")
  const [backendDraft, setBackendDraft] = useState("")
  const [applications, setApplications] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState("")
  const [editingApplicationId, setEditingApplicationId] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [runLogsByApplication, setRunLogsByApplication] = useState({})
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(true)
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const runTimerRef = useRef(null)
  const canAccessApplications =
    canManageApplications || canRunApplications || canViewApplicationLogs || canClearApplicationLogs

  const normalizeApplicationEntry = useCallback((entry) => {
    const id = String(entry?.id ?? "").trim()
    const name = String(entry?.name ?? "").trim()
    const about = String(entry?.about ?? "").trim()
    const backendKey = String(entry?.backendKey ?? "").trim()
    if (!id || !name || !about || !backendKey) return null
    const backendLabel = String(entry?.backendLabel ?? backendKey).trim() || backendKey
    return { id, name, about, backendKey, backendLabel, isActive: Boolean(entry?.isActive) }
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
    return () => {
      if (runTimerRef.current) {
        window.clearTimeout(runTimerRef.current)
        runTimerRef.current = null
      }
    }
  }, [])

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
          throw new Error(apiError || "Uygulama listesi alinamadi.")
        }
        const payload = await res.json()
        if (!isMounted) return
        const normalized = Array.isArray(payload)
          ? payload.map(normalizeApplicationEntry).filter(Boolean)
          : []
        setApplications(normalized)
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "Uygulama listesi alinamadi.")
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

  useEffect(() => {
    if (applications.length === 0) {
      setSelectedApplicationId("")
      return
    }
    if (!selectedApplicationId || !applications.some((entry) => entry.id === selectedApplicationId)) {
      setSelectedApplicationId(applications[0].id)
    }
  }, [applications, selectedApplicationId])

  const selectedApplication = useMemo(
    () => applications.find((entry) => entry.id === selectedApplicationId) || null,
    [applications, selectedApplicationId],
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
          throw new Error(apiError || "CMD loglari alinamadi.")
        }
        const payload = await res.json()
        if (!isMounted) return
        const normalized = Array.isArray(payload)
          ? payload.map(normalizeApplicationLogEntry).filter(Boolean)
          : []
        setRunLogsByApplication((prev) => ({ ...prev, [appId]: normalized }))
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return
        toast.error(error?.message || "CMD loglari alinamadi.")
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
      toast.error("Uygulama yonetme yetkiniz yok.")
      return
    }
    const name = String(appNameDraft ?? "").trim()
    const about = String(appAboutDraft ?? "").trim()
    const backendKey = String(backendDraft ?? "").trim()
    if (!name) {
      toast.error("Uygulama adi girin.")
      return
    }
    if (!about) {
      toast.error("Uygulama hakkinda alani bos olamaz.")
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
          throw new Error(apiError || "Uygulama guncellenemedi.")
        }
        const saved = normalizeApplicationEntry(await res.json())
        if (!saved) throw new Error("Guncellenen uygulama verisi gecersiz.")
        setApplications((prev) => prev.map((entry) => (entry.id === saved.id ? saved : entry)))
        setSelectedApplicationId(saved.id)
        void persistLog(saved.id, "success", `Uygulama guncellendi: ${saved.name} (${saved.backendLabel})`)
        toast.success("Uygulama guncellendi.")
      } else {
        const res = await apiFetchApplications("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, isActive: true }),
        })
        if (!res.ok) {
          const apiError = await readApiError(res)
          throw new Error(apiError || "Uygulama kaydedilemedi.")
        }
        const saved = normalizeApplicationEntry(await res.json())
        if (!saved) throw new Error("Kaydedilen uygulama verisi gecersiz.")
        setApplications((prev) => [saved, ...prev])
        setSelectedApplicationId(saved.id)
        void persistLog(saved.id, "success", `Uygulama kaydedildi: ${saved.name} (${saved.backendLabel})`)
        toast.success("Uygulama kaydedildi.")
      }
    } catch (error) {
      toast.error(error?.message || "Uygulama kaydedilemedi.")
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
      toast.error("Uygulama yonetme yetkiniz yok.")
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
        throw new Error(apiError || "Uygulama durumu guncellenemedi.")
      }
      const saved = normalizeApplicationEntry(await res.json())
      if (!saved) throw new Error("Guncellenen durum verisi gecersiz.")
      setApplications((prev) => prev.map((entry) => (entry.id === saved.id ? saved : entry)))
      void persistLog(
        saved.id,
        "running",
        `${saved.name} ${saved.isActive ? "aktif edildi" : "kapatildi"}.`,
      )
      toast.success(saved.isActive ? "Uygulama aktif edildi." : "Uygulama kapatildi.")
    } catch (error) {
      toast.error(error?.message || "Uygulama durumu guncellenemedi.")
    }
  }

  const handleDelete = async (appId) => {
    if (!canManageApplications) {
      toast.error("Uygulama yonetme yetkiniz yok.")
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
        throw new Error(apiError || "Uygulama silinemedi.")
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
      toast.success("Uygulama silindi.")
    } catch (error) {
      toast.error(error?.message || "Uygulama silinemedi.")
    }
  }

  const handleRun = () => {
    if (!canRunApplications) {
      toast.error("Uygulama calistirma yetkiniz yok.")
      return
    }
    if (!selectedApplication) {
      toast.error("Calistirmak icin uygulama secin.")
      return
    }
    if (!selectedApplication.isActive) {
      toast.error("Secilen uygulama kapali. Once aktif edin.")
      return
    }
    if (isRunning) return

    setIsRunning(true)
    void persistLog(selectedApplication.id, "running", `Calistiriliyor: ${selectedApplication.name}`)
    void persistLog(selectedApplication.id, "running", `Backend map: ${selectedApplication.backendLabel}`)
    void persistLog(selectedApplication.id, "running", "Komut tetiklendi. (UI demo)")

    runTimerRef.current = window.setTimeout(() => {
      void persistLog(selectedApplication.id, "success", `Tamamlandi: ${selectedApplication.name}`)
      setIsRunning(false)
      runTimerRef.current = null
    }, 900)
  }

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
        throw new Error(apiError || "CMD loglari temizlenemedi.")
      }
      toast.success("CMD loglari temizlendi.")
    } catch (error) {
      toast.error(error?.message || "CMD loglari temizlenemedi.")
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

  if (isTabLoading) {
    return <ApplicationsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Uygulamalar
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Uygulamalar</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Uygulama ekle, uygulama sec ve calistir.
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
              Durum: {isRunning ? "Baglaniliyor" : "Baglanildi"}
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
                CMD
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
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  isRunning
                    ? "border-sky-300/60 bg-sky-500/15 text-sky-100"
                    : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {isRunning ? "Baglaniliyor" : "Baglanildi"}
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
              <option value="">{hasApplications ? "Uygulama sec" : "Kayitli uygulama yok"}</option>
              {applications.map((entry) => (
                <option key={`run-app-${entry.id}`} value={entry.id}>
                  {entry.isActive ? entry.name : `${entry.name} (Kapali)`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRun}
              disabled={!canRunApplications || !selectedApplication || !selectedApplication.isActive || isRunning}
              className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Calisiyor..." : "Calistir"}
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
                  {selectedApplication.name} ({selectedApplication.backendLabel})
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedApplication.about || "Uygulama aciklamasi yok."}
                </p>
              </>
            ) : (
              "Calistirmak icin uygulama secin."
            )}
          </div>

          <div className="no-scrollbar h-[320px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
            {!canViewApplicationLogs ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                CMD log goruntuleme yetkiniz yok.
              </div>
            ) : isLogsLoading ? (
              <div className="flex h-full items-center justify-center text-slate-500">Loglar yukleniyor...</div>
            ) : (
              <div className="space-y-0.5">
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
                    <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
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
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300/85">Uygulama Yonet</p>
              <p className="text-xs text-slate-400">Kisa kayit ve hizli yonetim.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              {applications.length} kayit
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/55 p-3">
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Uygulama adi</label>
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
                    {applicationBackendOptions.length === 0 ? "Uygulama backend map yok" : "Backend sec"}
                  </option>
                  {applicationBackendOptions.map((entry) => (
                    <option key={`application-backend-${entry.key}`} value={entry.key}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Uygulama hakkinda</label>
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
                    ? "kind=uygulama map yok"
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
            <p className="mt-2 text-[11px] text-amber-200/80">Uygulama yonetme yetkiniz yok.</p>
          )}

          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/55 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Kayitli uygulamalar
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                {applications.length}
              </span>
            </div>

            <div className="no-scrollbar mt-2 max-h-[170px] space-y-1.5 overflow-y-auto pr-1">
              {applications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-2.5 py-5 text-center text-[11px] text-slate-500">
                  Henuz uygulama kaydi yok.
                </p>
              ) : (
                applications.map((entry) => {
                  const isSelected = entry.id === selectedApplicationId
                  return (
                    <div
                      key={`manage-app-${entry.id}`}
                      className={`rounded-lg border ${
                        isSelected ? "border-accent-300/40 bg-accent-500/10" : "border-white/10 bg-ink-900/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedApplicationId(entry.id)}
                        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-100">{entry.name}</span>
                          <span className="block truncate text-[10px] text-slate-400">{entry.backendLabel}</span>
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
                      </button>

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

            <div className="mt-2 rounded-lg border border-white/10 bg-ink-900/65 px-2.5 py-2 text-[10px] text-slate-400">
              {selectedApplication ? (
                <>
                  <p className="text-[11px] font-semibold text-slate-200">{selectedApplication.name}</p>
                  <p className="mt-1 break-words">{selectedApplication.about || "Uygulama aciklamasi yok."}</p>
                </>
              ) : (
                "Detay icin uygulama secin."
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
