import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"

const APPLICATIONS_STORAGE_KEY = "pulcipApplicationsUi"
const MAX_RUN_LOG_ENTRIES = 300
const CMD_VISIBLE_ROWS = 14

const readStoredApplications = () => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        const id = String(item?.id ?? "").trim()
        const name = String(item?.name ?? "").trim()
        const backendMap = String(item?.backendMap ?? "").trim()
        if (!id || !name || !backendMap) return null
        return { id, name, backendMap }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

const buildLogEntry = (status, message) => ({
  id: `app-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  status,
  message,
  time: new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }),
})

export default function ApplicationsTab({ panelClass }) {
  const [applications, setApplications] = useState(() => readStoredApplications())
  const [appName, setAppName] = useState("")
  const [backendMap, setBackendMap] = useState("")
  const [selectedAppId, setSelectedAppId] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [runLog, setRunLog] = useState([])
  const runTimerRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications))
    } catch {
      // Ignore local storage write errors.
    }
  }, [applications])

  useEffect(() => {
    if (applications.length === 0) {
      setSelectedAppId("")
      return
    }
    if (applications.some((item) => item.id === selectedAppId)) return
    setSelectedAppId(applications[0].id)
  }, [applications, selectedAppId])

  useEffect(() => () => {
    if (runTimerRef.current) {
      window.clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }
  }, [])

  const selectedApp = useMemo(
    () => applications.find((item) => item.id === selectedAppId) ?? null,
    [applications, selectedAppId],
  )

  const lastSuccess = useMemo(
    () => runLog.find((entry) => entry.status === "success") ?? null,
    [runLog],
  )

  const visibleRunLogEntries = useMemo(
    () => runLog.slice(0, CMD_VISIBLE_ROWS),
    [runLog],
  )

  const emptyRunLogRows = useMemo(
    () => Math.max(0, CMD_VISIBLE_ROWS - visibleRunLogEntries.length),
    [visibleRunLogEntries.length],
  )

  const prependRunLogEntry = useCallback((entry) => {
    setRunLog((prev) => [entry, ...prev].slice(0, MAX_RUN_LOG_ENTRIES))
  }, [])

  const handleSaveApplication = () => {
    const name = appName.trim()
    const backend = backendMap.trim()
    if (!name || !backend) {
      toast.error("Uygulama adi ve backend map zorunlu.")
      return
    }

    setApplications((prev) => {
      const existing = prev.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        setSelectedAppId(existing.id)
        toast.success("Uygulama guncellendi.")
        return prev.map((item) =>
          item.id === existing.id ? { ...item, name, backendMap: backend } : item,
        )
      }

      const next = {
        id: `app-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name,
        backendMap: backend,
      }
      setSelectedAppId(next.id)
      toast.success("Uygulama kaydedildi.")
      return [next, ...prev]
    })

    setAppName("")
    setBackendMap("")
  }

  const handleRunSelected = () => {
    if (!selectedApp || isRunning) return
    setIsRunning(true)
    prependRunLogEntry(
      buildLogEntry(
        "running",
        `${selectedApp.name} baslatildi. backendMap=${selectedApp.backendMap}`,
      ),
    )

    runTimerRef.current = window.setTimeout(() => {
      prependRunLogEntry(
        buildLogEntry(
          "success",
          `${selectedApp.name} tamamlandi. backendMap=${selectedApp.backendMap}`,
        ),
      )
      setIsRunning(false)
      runTimerRef.current = null
    }, 1200)
  }

  const fieldClass =
    "w-full rounded-lg border border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 hover:border-white/20"
  const primaryButtonClass =
    "rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const secondaryButtonClass =
    "rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Uygulamalar
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Uygulamalar
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Uygulama adi ve backend map kaydet, uygulama secip calistir ve cmd ciktilarini takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {applications.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Son: {lastSuccess?.time ?? "--:--"}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                isRunning
                  ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                  : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
              }`}
            >
              {isRunning ? "Calisiyor" : "Hazir"}
            </span>
          </div>
        </div>
      </header>

      <section className={`${panelClass} bg-ink-900/60`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Yonetim</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Kayitli: {applications.length}
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            type="text"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleSaveApplication()
              }
            }}
            placeholder="Uygulama Adi"
            className={fieldClass}
          />
          <input
            type="text"
            value={backendMap}
            onChange={(event) => setBackendMap(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleSaveApplication()
              }
            }}
            placeholder="Backendmap"
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleSaveApplication}
            className={`min-w-[120px] ${primaryButtonClass}`}
          >
            Kaydet
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={selectedAppId}
            onChange={(event) => setSelectedAppId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Uygulama sec</option>
            {applications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.backendMap}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedApp || isRunning}
            onClick={handleRunSelected}
            className={`min-w-[130px] ${primaryButtonClass}`}
          >
            {isRunning ? "Calisiyor..." : "Calistir"}
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Secili Uygulama</p>
          <p className="mt-1 truncate text-sm text-slate-100">
            {selectedApp?.name ?? "Secim yok"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {selectedApp?.backendMap
              ? `Backend map: ${selectedApp.backendMap}`
              : "Backend map secilmedi"}
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/80 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-900/70 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400/80" />
              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              applications.cmd
            </p>
            <button
              type="button"
              onClick={() => setRunLog([])}
              disabled={runLog.length === 0}
              className={secondaryButtonClass}
            >
              Log temizle
            </button>
          </div>

          <div className="no-scrollbar h-[384px] overflow-auto px-3 py-3 font-mono text-[12px] leading-6">
            <div className="space-y-0.5">
              {visibleRunLogEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-slate-200">
                  <span className="flex-none text-slate-500">C:\plcp\applications&gt;</span>
                  <span
                    className={`flex-none ${
                      entry.status === "success" ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    [{entry.time}]
                  </span>
                  <span
                    className={`flex-none ${
                      entry.status === "success" ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {entry.status === "success" ? "OK" : "RUN"}
                  </span>
                  <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
                </div>
              ))}
              {Array.from({ length: emptyRunLogRows }).map((_, index) => (
                <div key={`empty-row-${index}`} className="flex items-start gap-2 text-slate-600/80">
                  <span className="flex-none text-slate-600">C:\plcp\applications&gt;</span>
                  {isRunning && index === 0 ? (
                    <span className="inline-block h-4 w-2 animate-pulse bg-slate-500/80" />
                  ) : (
                    <span
                      className={`min-w-0 ${
                        runLog.length === 0 && index === 0 ? "text-slate-500" : "opacity-0"
                      }`}
                    >
                      {runLog.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

