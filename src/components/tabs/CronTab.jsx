import { useMemo, useState } from "react"
import { toast } from "react-hot-toast"

const WINDOW_PRESET_OPTIONS = [
  { value: "opening", label: "Acilis penceresi", hint: "09:30 operasyon kontrolu" },
  { value: "hourly", label: "Saatlik akis", hint: "Gun ici takip isleri" },
  { value: "audit", label: "Kontrol saati", hint: "Fiyat ve kalite taramasi" },
  { value: "night", label: "Gece kapanisi", hint: "Arsiv ve snapshot gorevleri" },
]

const DESTINATION_OPTIONS = [
  { value: "dashboard", label: "Dashboard alarmi" },
  { value: "slack", label: "Slack bildirimi" },
  { value: "mail", label: "Mail raporu" },
  { value: "queue", label: "Is kuyugu" },
]

const STATUS_META = {
  healthy: {
    label: "Planli",
    chipClass: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
    cardClass: "border-emerald-300/15 bg-emerald-500/[0.04]",
    dotClass: "bg-emerald-300",
  },
  late: {
    label: "Gecikmis",
    chipClass: "border-amber-300/20 bg-amber-500/10 text-amber-100",
    cardClass: "border-amber-300/15 bg-amber-500/[0.04]",
    dotClass: "bg-amber-300",
  },
  paused: {
    label: "Duraklatildi",
    chipClass: "border-slate-300/15 bg-white/[0.04] text-slate-200",
    cardClass: "border-white/10 bg-white/[0.03]",
    dotClass: "bg-slate-400",
  },
  draft: {
    label: "Taslak",
    chipClass: "border-sky-300/20 bg-sky-500/10 text-sky-100",
    cardClass: "border-sky-300/15 bg-sky-500/[0.04]",
    dotClass: "bg-sky-300",
  },
}

const PLAYBOOK_STEPS = [
  {
    id: "opening",
    time: "09:30",
    title: "Acilis kontrolu",
    detail: "Stok senkronu, websocket nabzi ve ilk hata taramasi ayni blokta calisir.",
  },
  {
    id: "audit",
    time: "13:00",
    title: "Fiyat guvenligi",
    detail: "Bulk fiyat akisi oncesi sapmalar toplanir, kritik farklar alarm olarak gecer.",
  },
  {
    id: "night",
    time: "03:00",
    title: "Gece kapanisi",
    detail: "Snapshot, rapor ve arsiv gorevleri geceye tasinarak gun ici yuk hafifletilir.",
  },
]

const createDraft = (owner) => ({
  name: "",
  schedule: "*/30 * * * *",
  windowPreset: "hourly",
  destination: "dashboard",
  owner: String(owner ?? "").trim() || "Operasyon",
  notes: "",
})

const createJobId = () => `cron-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const resolveNextRunAt = (windowPreset) => {
  const now = new Date()
  const next = new Date(now)

  if (windowPreset === "opening") {
    next.setHours(9, 30, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (windowPreset === "audit") {
    next.setHours(13, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (windowPreset === "night") {
    next.setHours(3, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  next.setMinutes(Math.ceil((now.getMinutes() + 15) / 30) * 30, 0, 0)
  if (next <= now) next.setHours(next.getHours() + 1)
  return next.toISOString()
}

const formatDateTimeLabel = (value) => {
  if (!value) return "Planlanmadi"
  const parsed = Date.parse(String(value))
  if (!Number.isFinite(parsed)) return "Planlanmadi"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed))
}

const INITIAL_JOBS = [
  {
    id: "cron-stock-sync",
    name: "Eldorado stok senkronu",
    schedule: "*/20 * * * *",
    windowPreset: "hourly",
    destination: "dashboard",
    owner: "Operasyon",
    notes: "Kritik stok farklarini panelde toplar, stoksuz urunleri isaretler.",
    lastRunAt: "2026-03-30T08:40:00+03:00",
    nextRunAt: "2026-03-30T09:00:00+03:00",
    status: "healthy",
    enabled: true,
  },
  {
    id: "cron-price-audit",
    name: "Bulk fiyat on kontrolu",
    schedule: "0 */2 * * *",
    windowPreset: "audit",
    destination: "slack",
    owner: "Fiyat Takimi",
    notes: "Hazir olmayan urunleri ayiklar ve fiyat farklarini slack alarmi olarak yollar.",
    lastRunAt: "2026-03-30T06:00:00+03:00",
    nextRunAt: "2026-03-30T10:00:00+03:00",
    status: "late",
    enabled: true,
  },
  {
    id: "cron-service-heartbeat",
    name: "Servis heartbeat denetimi",
    schedule: "*/5 * * * *",
    windowPreset: "hourly",
    destination: "queue",
    owner: "Backend",
    notes: "Application tabinda kosan servislerin cevap surelerini toplar.",
    lastRunAt: "2026-03-30T08:55:00+03:00",
    nextRunAt: "2026-03-30T09:00:00+03:00",
    status: "healthy",
    enabled: true,
  },
  {
    id: "cron-night-snapshot",
    name: "Gece snapshot ve arsiv",
    schedule: "0 3 * * *",
    windowPreset: "night",
    destination: "mail",
    owner: "Admin",
    notes: "Gun sonu raporlarini derler, kritik loglari mail ozetine baglar.",
    lastRunAt: "2026-03-29T03:00:00+03:00",
    nextRunAt: "2026-03-31T03:00:00+03:00",
    status: "paused",
    enabled: false,
  },
]

function MetricCard({ label, value, hint, accentClass = "bg-slate-400" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/65 p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </div>
  )
}

export default function CronTab({ panelClass = "", activeUsername = "" }) {
  const [jobs, setJobs] = useState(INITIAL_JOBS)
  const [filter, setFilter] = useState("all")
  const [draft, setDraft] = useState(() => createDraft(activeUsername))

  const windowOptionsByValue = useMemo(
    () =>
      WINDOW_PRESET_OPTIONS.reduce((acc, entry) => {
        acc[entry.value] = entry
        return acc
      }, {}),
    [],
  )
  const destinationOptionsByValue = useMemo(
    () =>
      DESTINATION_OPTIONS.reduce((acc, entry) => {
        acc[entry.value] = entry
        return acc
      }, {}),
    [],
  )

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((left, right) => {
      const leftTs = Date.parse(String(left?.nextRunAt ?? "")) || Number.MAX_SAFE_INTEGER
      const rightTs = Date.parse(String(right?.nextRunAt ?? "")) || Number.MAX_SAFE_INTEGER
      return leftTs - rightTs
    })
  }, [jobs])

  const filteredJobs = useMemo(() => {
    if (filter === "enabled") return sortedJobs.filter((job) => job.enabled)
    if (filter === "attention") {
      return sortedJobs.filter((job) => job.status === "late" || job.status === "draft")
    }
    return sortedJobs
  }, [filter, sortedJobs])

  const activeJobs = useMemo(() => jobs.filter((job) => job.enabled).length, [jobs])
  const attentionJobs = useMemo(
    () => jobs.filter((job) => job.status === "late" || job.status === "draft").length,
    [jobs],
  )
  const nightlyJobs = useMemo(() => jobs.filter((job) => job.windowPreset === "night").length, [jobs])
  const nextJob = sortedJobs.find((job) => job.enabled && job.nextRunAt)

  const handleDraftChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleCreateJob = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      toast.error("Cron gorevi icin bir ad gerekli.")
      return
    }
    if (!draft.schedule.trim()) {
      toast.error("Cron ifadesi bos olamaz.")
      return
    }
    const nextJobEntry = {
      id: createJobId(),
      name: draft.name.trim(),
      schedule: draft.schedule.trim(),
      windowPreset: draft.windowPreset,
      destination: draft.destination,
      owner: draft.owner.trim() || "Operasyon",
      notes: draft.notes.trim(),
      lastRunAt: "",
      nextRunAt: resolveNextRunAt(draft.windowPreset),
      status: "draft",
      enabled: false,
    }
    setJobs((current) => [nextJobEntry, ...current])
    setDraft(createDraft(draft.owner || activeUsername))
    toast.success("Cron gorevi taslak olarak eklendi.")
  }

  const handleToggleJob = (jobId) => {
    setJobs((current) =>
      current.map((job) => {
        if (job.id !== jobId) return job
        if (job.enabled) {
          return {
            ...job,
            enabled: false,
            status: "paused",
          }
        }
        return {
          ...job,
          enabled: true,
          status: job.status === "draft" ? "healthy" : "healthy",
          nextRunAt: job.nextRunAt || resolveNextRunAt(job.windowPreset),
        }
      }),
    )
  }

  const handleDeleteJob = (jobId) => {
    setJobs((current) => current.filter((job) => job.id !== jobId))
    toast.success("Cron gorevi kaldirildi.")
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-5 shadow-card sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgba(14,165,233,0.22),transparent)]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-100">
              Cron merkez
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              Zamanlanmis gorev operasyonu
            </h1>
            <p className="mt-2 text-sm text-slate-200/80">
              Bu alan gun ici otomasyonlari planlamak, taslak cron gorevlerini toparlamak ve geceye tasinacak rutinleri ayirmak icin tasarlandi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Siradaki pencere</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {nextJob ? nextJob.name : "Planli calisma yok"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {nextJob ? formatDateTimeLabel(nextJob.nextRunAt) : "Yeni gorev eklenmesini bekliyor"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Plan sahibi</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {String(activeUsername ?? "").trim() || "Operasyon"}
              </p>
              <p className="mt-1 text-xs text-slate-400">Yeni gorevlerde varsayilan sahip olarak kullanilir.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Aktif gorev"
          value={activeJobs}
          hint="Canli takvimde su an calismaya hazir cronlar."
          accentClass="bg-emerald-400"
        />
        <MetricCard
          label="Dikkat gereken"
          value={attentionJobs}
          hint="Geciken ya da taslakta bekleyen isler."
          accentClass="bg-amber-300"
        />
        <MetricCard
          label="Geceye tasinan"
          value={nightlyJobs}
          hint="Gun ici yuku azaltmak icin gece penceresinde calisanlar."
          accentClass="bg-sky-400"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className={`${panelClass} bg-ink-900/60`}>
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Yeni cron gorevi</p>
              <p className="mt-1 text-sm text-slate-300">
                Ilk surum senaryosunda cronlar once taslak olarak eklenir, sonra ekip tarafindan aktive edilir.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Tum gorevler" },
                { key: "enabled", label: "Sadece aktif" },
                { key: "attention", label: "Dikkat isteyen" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    filter === item.key
                      ? "border-sky-300/30 bg-sky-500/10 text-sky-50"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateJob}>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-200">Gorev adi</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => handleDraftChange("name", event.target.value)}
                placeholder="Orn. stok alarmi"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-200">Cron ifadesi</span>
              <input
                type="text"
                value={draft.schedule}
                onChange={(event) => handleDraftChange("schedule", event.target.value)}
                placeholder="*/30 * * * *"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-200">Zaman penceresi</span>
              <select
                value={draft.windowPreset}
                onChange={(event) => handleDraftChange("windowPreset", event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              >
                {WINDOW_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-200">Cikis kanali</span>
              <select
                value={draft.destination}
                onChange={(event) => handleDraftChange("destination", event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              >
                {DESTINATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-200">Sorumlu</span>
              <input
                type="text"
                value={draft.owner}
                onChange={(event) => handleDraftChange("owner", event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold text-slate-200">Not</span>
              <textarea
                value={draft.notes}
                onChange={(event) => handleDraftChange("notes", event.target.value)}
                placeholder="Bu gorev neyi kontrol edecek?"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-slate-400">
                Yeni gorevler once taslak acilir. Gerekirse kart uzerinden hemen aktif edebilirsin.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-sky-300/35 bg-sky-500/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-50 transition hover:-translate-y-0.5 hover:bg-sky-500/18"
              >
                Gorevi ekle
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-ink-950/40 px-4 py-5 text-sm text-slate-400">
                Bu filtrede gosterilecek cron gorevi bulunamadi.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const statusMeta = STATUS_META[job.status] ?? STATUS_META.healthy
                const windowLabel = windowOptionsByValue[job.windowPreset]?.label ?? "Pencere yok"
                const destinationLabel = destinationOptionsByValue[job.destination]?.label ?? "Cikis yok"
                return (
                  <article
                    key={job.id}
                    className={`rounded-2xl border p-4 shadow-card ${statusMeta.cardClass}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
                          <h3 className="text-sm font-semibold text-white">{job.name}</h3>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                            {job.schedule}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusMeta.chipClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{job.notes || "Not girilmedi."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleJob(job.id)}
                          className={`rounded-xl border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                            job.enabled
                              ? "border-amber-300/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                              : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                          }`}
                        >
                          {job.enabled ? "Duraklat" : "Aktif et"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="rounded-xl border border-rose-300/25 bg-rose-500/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-500/14"
                        >
                          Kaldir
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-ink-950/45 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Son calisma</p>
                        <p className="mt-1 text-sm font-semibold text-white">{formatDateTimeLabel(job.lastRunAt)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-ink-950/45 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Sonraki calisma</p>
                        <p className="mt-1 text-sm font-semibold text-white">{formatDateTimeLabel(job.nextRunAt)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-ink-950/45 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Pencere</p>
                        <p className="mt-1 text-sm font-semibold text-white">{windowLabel}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-ink-950/45 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Cikis / sahip</p>
                        <p className="mt-1 text-sm font-semibold text-white">{destinationLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">{job.owner}</p>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Senaryo</p>
                <p className="mt-1 text-sm text-slate-300">Cron tabi icin kurulan operasyon akisi.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Playbook
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {PLAYBOOK_STEPS.map((step) => (
                <div key={step.id} className="rounded-2xl border border-white/10 bg-ink-950/45 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                      {step.time}
                    </span>
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{step.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Operasyon notlari</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-ink-950/45 px-4 py-3">
                Taslak gorevler ilk asamada devreye alinmaz. Bu sayede yeni cronlar once ekip tarafinda kontrol edilir.
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-950/45 px-4 py-3">
                Gecikmis kartlar gun ici riskleri isaretler. Bunlari aktif tutup saat penceresini sadelestirmek onerilir.
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-950/45 px-4 py-3">
                Gece snapshotlari ayri tutuldu; stok ve fiyat yogunluklari gun ortasi akisini bloklamasin diye.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
