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

function ApplicationsSkeleton({ panelClass }) {
  return (
    <div className="space-y-4">
      <div className={`${panelClass} bg-ink-900/70`}>
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className={`${panelClass} bg-ink-900/70`}>
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-40 w-full animate-pulse rounded-xl bg-white/10" />
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
    const nextApp = {
      id,
      name,
      about,
      backendKey,
      backendLabel,
    }
    setApplications((prev) => [nextApp, ...prev])
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
    appendLog("running", `Backend: ${selectedApplication.backendLabel}`)
    appendLog("running", "Komut tetiklendi.")

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

  const visibleLogs = runLogs.slice(0, CMD_VISIBLE_ROWS)
  const emptyRows = Math.max(0, CMD_VISIBLE_ROWS - visibleLogs.length)

  if (isLoading) {
    return <ApplicationsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 p-4 shadow-card sm:p-6">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Uygulamalar
        </span>
        <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">Uygulama yonetimi</h2>
        <p className="mt-1 text-sm text-slate-300">Kaydet, sec ve calistir. Bu ekran simdilik UI icindir.</p>
      </header>

      <section className={`${panelClass} space-y-4 bg-ink-900/65`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">
            Uygulama ekle
          </p>
          <span className="rounded-full border border-white/10 bg-ink-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
            {applications.length} kayit
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
          <input
            type="text"
            value={appNameDraft}
            onChange={(event) => setAppNameDraft(event.target.value)}
            placeholder="Uygulama adi"
            className="h-10 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
          />
          <input
            type="text"
            value={appAboutDraft}
            onChange={(event) => setAppAboutDraft(event.target.value)}
            placeholder="Uygulama hakkinda"
            className="h-10 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
          />
          <select
            value={backendDraft}
            onChange={(event) => setBackendDraft(event.target.value)}
            disabled={applicationBackendOptions.length === 0}
            className="h-10 appearance-none rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="h-10 rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kaydet
          </button>
        </div>
      </section>

      <section className={`${panelClass} space-y-4 bg-ink-900/65`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Uygulama sec</p>
            <select
              value={selectedApplicationId}
              onChange={(event) => setSelectedApplicationId(event.target.value)}
              disabled={applications.length === 0}
              className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{applications.length === 0 ? "Kayitli uygulama yok" : "Uygulama sec"}</option>
              {applications.map((entry) => (
                <option key={`app-select-${entry.id}`} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            {selectedApplication && (
              <p className="text-[11px] text-slate-400">
                {selectedApplication.about} | {selectedApplication.backendLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={!selectedApplication || isRunning}
            className="h-10 rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Calisiyor..." : "Calistir"}
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70">
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
          <div className="no-scrollbar h-[320px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:text-[12px] sm:leading-6">
            <div className="space-y-0.5">
              {visibleLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap"
                >
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
                <div
                  key={`applications-log-placeholder-${index}`}
                  className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap"
                >
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
      </section>
    </div>
  )
}
