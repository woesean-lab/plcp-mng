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

function ApplicationsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-3 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-full" />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
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
      toast.error("Calistirmak icin uygulama secin.")
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
    }, 900)
  }

  const handleClearLogs = () => {
    setRunLogs([])
    toast.success("CMD loglari temizlendi.")
  }

  const hasApplications = applications.length > 0
  const visibleLogs = runLogs.slice(0, CMD_VISIBLE_ROWS)
  const emptyRows = Math.max(0, CMD_VISIBLE_ROWS - visibleLogs.length)

  if (isLoading) {
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
              Durum: {isRunning ? "Calisiyor" : "Hazir"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
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
                {runLogs.length} satir
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  isRunning
                    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                    : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {isRunning ? "Calisiyor" : "Hazir"}
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
                  {entry.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRun}
              disabled={!selectedApplication || isRunning}
              className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Calisiyor..." : "Calistir"}
            </button>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={runLogs.length === 0}
                className="inline-flex h-9 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Log temizle
              </button>
            </div>
          </div>

          <div className="border-b border-white/10 bg-ink-900/30 px-3 py-1.5 text-[10px] text-slate-400">
            {selectedApplication
              ? `Secili: ${selectedApplication.name} (${selectedApplication.backendLabel})`
              : "Calistirmak icin uygulama secin."}
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

        <section className={`order-1 ${panelClass} bg-ink-900/60 lg:order-2 lg:col-span-1`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Uygulama Ekle</p>
              <p className="text-sm text-slate-400">Ad, aciklama ve backend map secimi.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {applications.length} kayit
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">Uygulama adi</label>
              <input
                type="text"
                value={appNameDraft}
                onChange={(event) => setAppNameDraft(event.target.value)}
                placeholder="Orn: Telegram bot runner"
                className="h-10 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">Uygulama hakkinda</label>
              <textarea
                rows={4}
                value={appAboutDraft}
                onChange={(event) => setAppAboutDraft(event.target.value)}
                placeholder="Uygulamanin ne is yaptigini yaz."
                className="w-full resize-y rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">Backend map</label>
              <select
                value={backendDraft}
                onChange={(event) => setBackendDraft(event.target.value)}
                disabled={applicationBackendOptions.length === 0}
                className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
              <span>Map durumu</span>
              <span>
                {applicationBackendOptions.length === 0
                  ? "kind=uygulama map yok"
                  : `${applicationBackendOptions.length} map hazir`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={applicationBackendOptions.length === 0}
              className="w-full rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Kaydet
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
