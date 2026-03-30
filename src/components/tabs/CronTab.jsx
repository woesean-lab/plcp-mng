import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

const DEFAULT_FORM = {
  id: "",
  name: "Gunluk Eldorado Sayim",
  type: "eldoradosayim",
  scheduleTime: "00:05",
  timezone: "Europe/Istanbul",
  targetDateMode: "yesterday",
  url: "",
  httpMethod: "GET",
  httpHeaders: "",
  httpBody: "",
  timeoutMs: "30000",
  isActive: true,
}

const JOB_TYPE_OPTIONS = [
  {
    value: "eldoradosayim",
    label: "Eldorado sayim",
    helper: "Websocket ile sayim alip satis kaydini gunceller.",
  },
  {
    value: "http",
    label: "HTTP endpoint",
    helper: "Belirtilen endpointi zamaninda veya manuel olarak tetikler.",
  },
]

const TARGET_DATE_OPTIONS = [
  { value: "yesterday", label: "Dun" },
  { value: "today", label: "Bugun" },
]

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function CronSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-20 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-32 rounded-full" />
          <SkeletonBlock className="h-7 w-32 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`cron-metric-${idx}`}
            className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card"
          >
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-6 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-24 w-full rounded-2xl" />
            <SkeletonBlock className="mt-3 h-24 w-full rounded-2xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-52 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

const formatDateTime = (value, timeZone = "Europe/Istanbul") => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone,
    }).format(parsed)
  } catch {
    return parsed.toLocaleString("tr-TR")
  }
}

const formatRunDuration = (startedAt, finishedAt) => {
  if (!startedAt || !finishedAt) return "-"
  const start = new Date(startedAt)
  const finish = new Date(finishedAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return "-"
  const totalSeconds = Math.max(0, Math.round((finish.getTime() - start.getTime()) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}dk ${seconds}s`
}

const getStatusTone = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (normalized === "success") return "border-emerald-300/40 bg-emerald-500/12 text-emerald-100"
  if (normalized === "error") return "border-rose-300/40 bg-rose-500/12 text-rose-100"
  if (normalized === "running") return "border-sky-300/40 bg-sky-500/12 text-sky-100"
  if (normalized === "queued") return "border-amber-300/40 bg-amber-500/12 text-amber-100"
  if (normalized === "active") return "border-accent-300/40 bg-accent-500/12 text-accent-100"
  return "border-white/10 bg-white/5 text-slate-200"
}

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20"
const secondaryButtonClass =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:bg-white/10"
const primaryButtonClass =
  "rounded-xl border border-accent-400/60 bg-accent-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-50 transition hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
const dangerButtonClass =
  "rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
const successButtonClass =
  "rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
const codeFieldClass =
  "w-full rounded-xl border border-white/10 bg-ink-950/90 px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20"

const formatJobTypeLabel = (type) =>
  JOB_TYPE_OPTIONS.find((option) => option.value === type)?.label || String(type ?? "-")

function MetricCard({ label, value, helper, toneClass = "bg-ink-900/60" }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 p-4 shadow-card ${toneClass}`}>
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{helper}</p>
      </div>
    </div>
  )
}

export default function CronTab({
  panelClass,
  apiFetch,
  isActive = false,
  canManageCron = false,
  canRunCron = false,
  canViewCronLogs = false,
  canClearCronLogs = false,
}) {
  const [jobs, setJobs] = useState([])
  const [serverTime, setServerTime] = useState("")
  const [serverTimeZone, setServerTimeZone] = useState("Europe/Istanbul")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunsLoading, setIsRunsLoading] = useState(false)
  const [isManualRunningJobId, setIsManualRunningJobId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [runsByJobId, setRunsByJobId] = useState({})
  const [form, setForm] = useState(DEFAULT_FORM)
  const selectedJob = useMemo(
    () => jobs.find((item) => item.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  )
  const selectedRuns = useMemo(
    () => (selectedJobId ? runsByJobId[selectedJobId] ?? [] : []),
    [runsByJobId, selectedJobId],
  )
  const activeJobCount = useMemo(() => jobs.filter((item) => item.isActive).length, [jobs])
  const runningJobCount = useMemo(() => jobs.filter((item) => item.isRunning).length, [jobs])
  const errorJobCount = useMemo(
    () => jobs.filter((item) => String(item.lastRunStatus ?? "").trim().toLowerCase() === "error").length,
    [jobs],
  )

  const loadJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (typeof apiFetch !== "function") return
      if (!silent) setIsLoading(true)
      try {
        const res = await apiFetch("/api/cron/jobs")
        if (!res.ok) throw new Error("cron_jobs_failed")
        const payload = await res.json()
        const nextJobs = Array.isArray(payload?.jobs) ? payload.jobs : []
        setJobs(nextJobs)
        setServerTime(String(payload?.serverTime ?? "").trim())
        setServerTimeZone(String(payload?.serverTimeZone ?? "Europe/Istanbul").trim() || "Europe/Istanbul")
        setSelectedJobId((prev) => {
          if (prev && nextJobs.some((item) => item.id === prev)) return prev
          return nextJobs[0]?.id ?? ""
        })
      } catch (error) {
        console.error(error)
        if (!silent) toast.error("Cron gorevleri alinamadi.")
        setJobs([])
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [apiFetch],
  )

  const loadRuns = useCallback(
    async (jobId, { silent = false } = {}) => {
      const normalizedJobId = String(jobId ?? "").trim()
      if (!normalizedJobId || !canViewCronLogs || typeof apiFetch !== "function") return
      if (!silent) setIsRunsLoading(true)
      try {
        const res = await apiFetch(`/api/cron/jobs/${normalizedJobId}/runs?limit=30`)
        if (!res.ok) throw new Error("cron_runs_failed")
        const payload = await res.json()
        setRunsByJobId((prev) => ({
          ...prev,
          [normalizedJobId]: Array.isArray(payload?.runs) ? payload.runs : [],
        }))
      } catch (error) {
        console.error(error)
        if (!silent) toast.error("Cron loglari alinamadi.")
      } finally {
        if (!silent) setIsRunsLoading(false)
      }
    },
    [apiFetch, canViewCronLogs],
  )

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    if (!selectedJobId || !canViewCronLogs) return
    loadRuns(selectedJobId)
  }, [canViewCronLogs, loadRuns, selectedJobId])

  useEffect(() => {
    if (!isActive) return
    const intervalId = window.setInterval(() => {
      loadJobs({ silent: true })
      if (selectedJobId && canViewCronLogs) {
        loadRuns(selectedJobId, { silent: true })
      }
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [canViewCronLogs, isActive, loadJobs, loadRuns, selectedJobId])

  const resetForm = () => setForm(DEFAULT_FORM)

  const handleEdit = (job) => {
    setForm({
      id: job.id,
      name: job.name,
      type: job.type,
      scheduleTime: job.scheduleTime,
      timezone: job.timezone,
      targetDateMode: job.targetDateMode,
      url: job.url || "",
      httpMethod: job.httpMethod || "GET",
      httpHeaders:
        job.httpHeaders && Object.keys(job.httpHeaders).length > 0
          ? JSON.stringify(job.httpHeaders, null, 2)
          : "",
      httpBody: job.httpBody || "",
      timeoutMs:
        Number.isFinite(Number(job.timeoutMs)) && Number(job.timeoutMs) > 0
          ? String(job.timeoutMs)
          : "30000",
      isActive: Boolean(job.isActive),
    })
  }

  const handleSave = async () => {
    if (!canManageCron) {
      toast.error("Cron yonetim yetkiniz yok.")
      return
    }
    const name = String(form.name ?? "").trim()
    const scheduleTime = String(form.scheduleTime ?? "").trim()
    const timezone = String(form.timezone ?? "").trim()
    if (!name) {
      toast.error("Gorev adi girin.")
      return
    }
    if (!/^\d{2}:\d{2}$/.test(scheduleTime)) {
      toast.error("Saat HH:mm formatinda olmali.")
      return
    }
    if (!timezone) {
      toast.error("Timezone girin.")
      return
    }
    const normalizedType = String(form.type ?? "").trim()
    const url = String(form.url ?? "").trim()
    const httpHeaders = String(form.httpHeaders ?? "").trim()
    const httpBody = String(form.httpBody ?? "")
    const timeoutMs = String(form.timeoutMs ?? "").trim()
    if (normalizedType === "http") {
      if (!url) {
        toast.error("HTTP endpoint URL girin.")
        return
      }
      try {
        new URL(url)
      } catch {
        toast.error("HTTP endpoint gecersiz.")
        return
      }
      if (httpHeaders) {
        try {
          const parsedHeaders = JSON.parse(httpHeaders)
          if (!parsedHeaders || typeof parsedHeaders !== "object" || Array.isArray(parsedHeaders)) {
            toast.error("HTTP header JSON object olmali.")
            return
          }
        } catch {
          toast.error("HTTP header JSON gecersiz.")
          return
        }
      }
      if (timeoutMs && (!Number.isFinite(Number(timeoutMs)) || Number(timeoutMs) <= 0)) {
        toast.error("Timeout ms pozitif bir sayi olmali.")
        return
      }
    }
    setIsSaving(true)
    try {
      const res = await apiFetch(form.id ? `/api/cron/jobs/${form.id}` : "/api/cron/jobs", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: normalizedType,
          scheduleTime,
          timezone,
          targetDateMode: form.targetDateMode,
          url,
          httpMethod: form.httpMethod,
          httpHeaders,
          httpBody,
          timeoutMs,
          isActive: Boolean(form.isActive),
        }),
      })
      if (!res.ok) throw new Error("cron_save_failed")
      const saved = await res.json()
      await loadJobs({ silent: true })
      setSelectedJobId(saved?.id || "")
      resetForm()
      toast.success(form.id ? "Cron gorevi guncellendi" : "Cron gorevi eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Cron gorevi kaydedilemedi.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (job) => {
    if (!canManageCron) return
    try {
      const res = await apiFetch(`/api/cron/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !job.isActive }),
      })
      if (!res.ok) throw new Error("cron_toggle_failed")
      await loadJobs({ silent: true })
      toast.success(job.isActive ? "Cron gorevi pasif yapildi" : "Cron gorevi aktif edildi")
    } catch (error) {
      console.error(error)
      toast.error("Cron gorevi guncellenemedi.")
    }
  }
  const handleDelete = async (job) => {
    if (!canManageCron) return
    const confirmed = window.confirm(`${job.name} silinsin mi?`)
    if (!confirmed) return
    try {
      const res = await apiFetch(`/api/cron/jobs/${job.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("cron_delete_failed")
      setRunsByJobId((prev) => {
        const next = { ...prev }
        delete next[job.id]
        return next
      })
      await loadJobs({ silent: true })
      if (selectedJobId === job.id) {
        setSelectedJobId("")
      }
      toast.success("Cron gorevi silindi")
    } catch (error) {
      console.error(error)
      toast.error("Cron gorevi silinemedi.")
    }
  }

  const handleRunNow = async (job) => {
    if (!canRunCron) {
      toast.error("Cron calistirma yetkiniz yok.")
      return
    }
    setIsManualRunningJobId(job.id)
    try {
      const res = await apiFetch(`/api/cron/jobs/${job.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("cron_run_failed")
      await Promise.all([loadJobs({ silent: true }), loadRuns(job.id, { silent: true })])
      setSelectedJobId(job.id)
      toast.success("Cron gorevi baslatildi")
    } catch (error) {
      console.error(error)
      toast.error("Cron gorevi baslatilamadi.")
    } finally {
      setIsManualRunningJobId("")
    }
  }

  const handleClearRuns = async (job) => {
    if (!canClearCronLogs) {
      toast.error("Cron log temizleme yetkiniz yok.")
      return
    }
    const confirmed = window.confirm(`${job.name} loglari silinsin mi?`)
    if (!confirmed) return
    try {
      const res = await apiFetch(`/api/cron/jobs/${job.id}/runs`, { method: "DELETE" })
      if (!res.ok) throw new Error("cron_clear_failed")
      setRunsByJobId((prev) => ({ ...prev, [job.id]: [] }))
      toast.success("Cron loglari temizlendi")
    } catch (error) {
      console.error(error)
      toast.error("Cron loglari temizlenemedi.")
    }
  }

  if (isLoading && jobs.length === 0) {
    return <CronSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Cron
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Cron Gorevleri</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Zamanlanmis backend gorevlerini yonet, manuel tetikle ve log akisini takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Sunucu: {formatDateTime(serverTime, serverTimeZone)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              TZ: {serverTimeZone || "-"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Toplam" value={jobs.length} helper="Kayitli cron gorevi" />
        <MetricCard label="Aktif" value={activeJobCount} helper="Zamanlama acik" />
        <MetricCard label="Calisiyor/Hata" value={`${runningJobCount}/${errorJobCount}`} helper="Canli durum ozeti" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <section className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Gorev listesi</p>
                <p className="text-sm text-slate-400">Kayitli cron gorevleri ve hizli aksiyonlar.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                Secili: {selectedJob ? selectedJob.name : "-"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-sm text-slate-400">
                  Henuz cron gorevi eklenmedi.
                </div>
              ) : (
                jobs.map((job) => {
                  const isSelected = job.id === selectedJobId
                  const stateStatus = job.isRunning ? "running" : job.isActive ? "active" : job.lastRunStatus || "idle"
                  return (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedJobId(job.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedJobId(job.id)
                        }
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${isSelected ? "border-accent-400/40 bg-accent-500/10 shadow-glow" : "border-white/10 bg-black/20 hover:border-white/15 hover:bg-white/5"}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{job.name}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(stateStatus)}`}>
                              {job.isRunning ? "Calisiyor" : job.isActive ? "Aktif" : "Pasif"}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                              {job.type}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
                            <p>Saat: {job.scheduleTime}</p>
                            <p>Timezone: {job.timezone}</p>
                            {job.type === "http" ? (
                              <>
                                <p>Method: {job.httpMethod || "GET"}</p>
                                <p>Timeout: {job.timeoutMs ? `${job.timeoutMs} ms` : "-"}</p>
                              </>
                            ) : (
                              <>
                                <p>Son: {formatDateTime(job.lastRunAt, job.timezone)}</p>
                                <p>Siradaki: {formatDateTime(job.nextRunAt, job.timezone)}</p>
                              </>
                            )}
                          </div>
                          {job.type === "http" ? (
                            <p className="mt-2 truncate text-xs text-slate-500">URL: {job.url || "-"}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-500">Son mesaj: {job.lastRunMessage || "-"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {canRunCron ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleRunNow(job) }} disabled={isManualRunningJobId === job.id || job.isRunning} className={successButtonClass}>
                              {isManualRunningJobId === job.id ? "Baslatiliyor" : "Manuel baslat"}
                            </button>
                          ) : null}
                          {canManageCron ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleEdit(job) }} className={secondaryButtonClass}>
                              Duzenle
                            </button>
                          ) : null}
                          {canManageCron ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleToggleActive(job) }} className={secondaryButtonClass}>
                              {job.isActive ? "Pasif yap" : "Aktif et"}
                            </button>
                          ) : null}
                          {canManageCron ? (
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(job) }} className={dangerButtonClass}>
                              Sil
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Log ekrani</p>
                <p className="text-sm text-slate-400">Secilen gorevin son calisma kayitlari.</p>
              </div>
              {selectedJob && canClearCronLogs ? (
                <button type="button" onClick={() => handleClearRuns(selectedJob)} className={dangerButtonClass}>
                  Log temizle
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-950/85 p-3">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-1 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {selectedJob ? selectedJob.name : "Cron loglari"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">CMD akisi · son 30 calisma</p>
                </div>
                {isRunsLoading ? <span className="text-xs text-slate-500">Yukleniyor...</span> : null}
              </div>

              <div className="mt-3 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {!selectedJob ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
                    Loglari gormek icin bir cron gorevi sec.
                  </div>
                ) : selectedRuns.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-500">
                    Bu gorev icin log kaydi yok.
                  </div>
                ) : (
                  selectedRuns.map((run) => {
                    const runLogs = Array.isArray(run.logs) ? run.logs : []
                    return (
                      <div key={run.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(run.status)}`}>
                              {run.status}
                            </span>
                            <span className="text-xs text-slate-400">{run.trigger}</span>
                            <span className="text-xs text-slate-500">
                              {selectedJob?.type === "http" ? "Hedef: HTTP endpoint" : `Tarih: ${run.targetDate || "-"}`}
                            </span>
                          </div>
                          <div className="text-right text-[11px] text-slate-500">
                            <p>{formatDateTime(run.startedAt, selectedJob.timezone)}</p>
                            <p>Sure: {formatRunDuration(run.startedAt, run.finishedAt)}</p>
                          </div>
                        </div>
                        <div className="mt-3 rounded-xl border border-white/10 bg-ink-950/90 p-3 font-mono text-[12px] text-slate-200">
                          {runLogs.length === 0 ? (
                            <p className="text-slate-500">log bekleniyor...</p>
                          ) : (
                            runLogs.map((entry, index) => (
                              <div key={`${run.id}-${index}`} className="flex flex-wrap gap-2 leading-6">
                                <span className="text-slate-500">[{String(entry?.time ?? "").slice(11, 19) || "--:--:--"}]</span>
                                <span className={`uppercase ${entry?.status === "error" ? "text-rose-300" : entry?.status === "success" ? "text-emerald-300" : "text-sky-200"}`}>
                                  {String(entry?.status ?? "info")}
                                </span>
                                <span className="break-all text-slate-200">{String(entry?.message ?? "")}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>Mesaj: {run.message || "-"}</span>
                          <span>Sonuc: {run.result ?? "-"}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  {form.id ? "Cron duzenle" : "Yeni cron gorevi"}
                </p>
                <p className="text-sm text-slate-400">Saat, timezone ve calisma kuralini kaydet.</p>
              </div>
              {form.id ? (
                <button type="button" onClick={resetForm} className={secondaryButtonClass}>
                  Temizle
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Gorev adi</label>
                <input className={fieldClass} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Orn: Gunluk Eldorado Sayim" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Gorev tipi</label>
                <select
                  className={fieldClass}
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value,
                      httpMethod:
                        event.target.value === "http"
                          ? prev.httpMethod || "GET"
                          : prev.httpMethod,
                    }))
                  }
                >
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{JOB_TYPE_OPTIONS.find((option) => option.value === form.type)?.helper || "-"}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Saat</label>
                  <input className={fieldClass} type="time" value={form.scheduleTime} onChange={(event) => setForm((prev) => ({ ...prev, scheduleTime: event.target.value }))} />
                </div>
                {form.type === "http" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Method</label>
                    <select
                      className={fieldClass}
                      value={form.httpMethod}
                      onChange={(event) => setForm((prev) => ({ ...prev, httpMethod: event.target.value }))}
                    >
                      {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hedef tarih</label>
                    <select className={fieldClass} value={form.targetDateMode} onChange={(event) => setForm((prev) => ({ ...prev, targetDateMode: event.target.value }))}>
                      {TARGET_DATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Timezone</label>
                <input className={fieldClass} value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} placeholder="Europe/Istanbul" />
              </div>

              {form.type === "http" ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Endpoint URL</label>
                    <input
                      className={fieldClass}
                      value={form.url}
                      onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                      placeholder="https://example.com/api/run-cron"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Timeout (ms)</label>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={form.timeoutMs}
                      onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: event.target.value }))}
                      placeholder="30000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Headers JSON</label>
                    <textarea
                      rows={4}
                      className={codeFieldClass}
                      value={form.httpHeaders}
                      onChange={(event) => setForm((prev) => ({ ...prev, httpHeaders: event.target.value }))}
                      placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
                    />
                  </div>
                  {form.httpMethod !== "GET" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Body</label>
                      <textarea
                        rows={5}
                        className={codeFieldClass}
                        value={form.httpBody}
                        onChange={(event) => setForm((prev) => ({ ...prev, httpBody: event.target.value }))}
                        placeholder='{"date":"2026-03-30"}'
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 text-sm text-slate-200">
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} className="h-4 w-4 rounded border-white/10 bg-ink-950 text-accent-400" />
                Kayittan sonra aktif olsun
              </label>

              <button type="button" onClick={handleSave} disabled={!canManageCron || isSaving} className={`${primaryButtonClass} w-full px-4 py-3 text-sm`}>
                {isSaving ? "Kaydediliyor" : form.id ? "Guncelle" : "Cron gorevini kaydet"}
              </button>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Secili gorev ozeti</p>
              <p className="mt-1 text-sm text-slate-400">Anlik durum ve bir sonraki calisma bilgisi.</p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gorev</p>
                <p className="mt-1 font-semibold text-white">{selectedJob?.name || "-"}</p>
                {selectedJob ? (
                  <p className="mt-1 text-xs text-slate-400">{formatJobTypeLabel(selectedJob.type)}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Son durum</p>
                  <p className="mt-1 font-semibold text-white">{selectedJob?.lastRunStatus || "-"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {selectedJob?.type === "http" ? "Method" : "Siradaki"}
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    {selectedJob?.type === "http"
                      ? selectedJob?.httpMethod || "GET"
                      : formatDateTime(selectedJob?.nextRunAt, selectedJob?.timezone)}
                  </p>
                </div>
              </div>
              {selectedJob?.type === "http" ? (
                <>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Endpoint</p>
                    <p className="mt-1 break-all text-sm text-slate-200">{selectedJob?.url || "-"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Timeout</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedJob?.timeoutMs ? `${selectedJob.timeoutMs} ms` : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Headers</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedJob?.httpHeaders && Object.keys(selectedJob.httpHeaders).length > 0
                          ? `${Object.keys(selectedJob.httpHeaders).length} adet`
                          : "Yok"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Hedef tarih modu</p>
                  <p className="mt-1 font-semibold text-white">
                    {selectedJob?.targetDateMode === "today" ? "Bugun" : "Dun"}
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Son mesaj</p>
                <p className="mt-1 text-sm text-slate-200">{selectedJob?.lastRunMessage || "-"}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
