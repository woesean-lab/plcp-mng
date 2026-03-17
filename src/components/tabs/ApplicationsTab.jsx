import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"

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

function ApplicationsSkeleton() {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <SkeletonBlock className="mt-3 h-10 w-72 rounded-xl" />
        <SkeletonBlock className="mt-2 h-4 w-full rounded-full" />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <SkeletonBlock className="h-4 w-40 rounded-full" />
          <SkeletonBlock className="mt-3 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-24 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-10 w-28 rounded-lg" />
        </section>
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <SkeletonBlock className="h-4 w-40 rounded-full" />
          <SkeletonBlock className="mt-3 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-10 w-full rounded-lg" />
          <SkeletonBlock className="mt-2 h-[200px] w-full rounded-lg" />
        </section>
      </div>
      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <SkeletonBlock className="h-10 w-full rounded-lg" />
        <SkeletonBlock className="mt-3 h-[300px] w-full rounded-xl" />
      </section>
    </div>
  )
}

export default function ApplicationsTab({
  isLoading = false,
  backendOptions = [],
}) {
  const [appNameDraft, setAppNameDraft] = useState("")
  const [appAboutDraft, setAppAboutDraft] = useState("")
  const [backendDraft, setBackendDraft] = useState("")
  const [applications, setApplications] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [runLogs, setRunLogs] = useState([])
  const runTimerRef = useRef(null)

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

  const appendLog = (status, message) => {
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return
    const nextEntry = {
      id: `app-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: formatLogTime(),
      status: String(status ?? "").trim() || "running",
      message: normalizedMessage,
    }
    setRunLogs((prev) => [nextEntry, ...prev].slice(0, MAX_LOG_ENTRIES))
  }

  const handleSave = () => {
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
    const id = `app-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setApplications((prev) => [{ id, name, about, backendKey, backendLabel }, ...prev])
    setSelectedApplicationId(id)
    setAppNameDraft("")
    setAppAboutDraft("")
    appendLog("success", `Uygulama kaydedildi: ${name} (${backendLabel})`)
    toast.success("Uygulama kaydedildi.")
  }

  const selectedApplication = useMemo(
    () => applications.find((entry) => entry.id === selectedApplicationId) || null,
    [applications, selectedApplicationId],
  )

  const handleRun = () => {
    if (!selectedApplication) {
      toast.error("Calistirmak icin bir uygulama secin.")
      return
    }
    if (isRunning) return

    setIsRunning(true)
    appendLog("running", `Calistiriliyor: ${selectedApplication.name}`)
    appendLog("running", `Backend map: ${selectedApplication.backendLabel}`)
    appendLog("running", "Komut tetiklendi. (UI demo)")

    runTimerRef.current = window.setTimeout(() => {
      appendLog("success", `Tamamlandi: ${selectedApplication.name}`)
      setIsRunning(false)
      runTimerRef.current = null
    }, 1000)
  }

  const handleClearLogs = () => {
    setRunLogs([])
    toast.success("CMD loglari temizlendi.")
  }

  const visibleLogs = runLogs.slice(0, CMD_VISIBLE_ROWS)
  const emptyRows = Math.max(0, CMD_VISIBLE_ROWS - visibleLogs.length)
  const hasApplications = applications.length > 0

  if (isLoading) {
    return <ApplicationsSkeleton />
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(130deg,rgba(7,10,20,0.98),rgba(16,23,42,0.92),rgba(20,33,60,0.88))] px-5 py-5 shadow-card sm:px-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-12 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-2">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              Uygulamalar
            </p>
            <h1 className="font-display text-3xl font-semibold text-white">Application Deck</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Uygulama kartlari olustur, backend map bagla ve alt panelden calistir.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Kayitli</p>
              <p className="mt-1 text-xl font-semibold text-white">{applications.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Map</p>
              <p className="mt-1 text-xl font-semibold text-white">{applicationBackendOptions.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Durum</p>
              <p className="mt-1 text-base font-semibold text-white">{isRunning ? "Calisiyor" : "Hazir"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[24px] border border-white/10 bg-ink-900/70 p-4 shadow-card sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Yeni Uygulama</p>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Uygulama adi
              </label>
              <input
                type="text"
                value={appNameDraft}
                onChange={(event) => setAppNameDraft(event.target.value)}
                placeholder="Orn: Telegram bot runner"
                className="h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Uygulama hakkinda
              </label>
              <textarea
                rows={3}
                value={appAboutDraft}
                onChange={(event) => setAppAboutDraft(event.target.value)}
                placeholder="Kisa aciklama..."
                className="w-full resize-y rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={backendDraft}
                onChange={(event) => setBackendDraft(event.target.value)}
                disabled={applicationBackendOptions.length === 0}
                className="h-10 appearance-none rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
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
              <button
                type="button"
                onClick={handleSave}
                disabled={applicationBackendOptions.length === 0}
                className="h-10 rounded-lg border border-cyan-300/60 bg-cyan-500/15 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-50 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Kaydet
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Hizli not</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Bu ekran su an UI prototipi. Kayitlar sayfa yenilemede sifirlanir.
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-ink-900/70 p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Calistir</p>
            <button
              type="button"
              onClick={handleRun}
              disabled={!selectedApplication || isRunning}
              className="h-9 rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Calisiyor..." : "Calistir"}
            </button>
          </div>

          <div className="mt-3 space-y-3">
            <select
              value={selectedApplicationId}
              onChange={(event) => setSelectedApplicationId(event.target.value)}
              disabled={!hasApplications}
              className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{hasApplications ? "Uygulama sec" : "Kayitli uygulama yok"}</option>
              {applications.map((entry) => (
                <option key={`app-select-${entry.id}`} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>

            <div className="no-scrollbar max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {hasApplications ? (
                applications.map((entry) => {
                  const isSelected = entry.id === selectedApplicationId
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedApplicationId(entry.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-cyan-300/70 bg-cyan-500/10"
                          : "border-white/10 bg-ink-950/55 hover:border-white/25"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-100">{entry.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">
                          {entry.backendLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{entry.about}</p>
                    </button>
                  )
                })
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] text-slate-500">
                  Henuz uygulama kaydi yok.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-ink-900/70 shadow-card">
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
              {runLogs.length} satir
            </span>
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={runLogs.length === 0}
              className="inline-flex h-7 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Log temizle
            </button>
          </div>
        </div>

        <div className="no-scrollbar h-[320px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
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
        </div>
      </section>
    </div>
  )
}
