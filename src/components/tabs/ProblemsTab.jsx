import { useMemo, useState } from "react"
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ProblemsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={`problem-metric-${idx}`} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`problem-card-skeleton-${idx}`}
                  className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-inner"
                >
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="mt-3 h-14 w-full rounded-lg" />
                  <SkeletonBlock className="mt-3 h-3 w-40 rounded-full" />
                  <div className="mt-4 flex gap-2">
                    <SkeletonBlock className="h-7 w-20 rounded-lg" />
                    <SkeletonBlock className="h-7 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-24 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

const VIEW_OPTIONS = [
  { key: "open", label: "Acik" },
  { key: "resolved", label: "Cozulen" },
  { key: "archived", label: "Arsiv" },
  { key: "all", label: "Tum" },
]

const parseProblemDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const formatProblemCreatedAt = (value) => {
  const date = parseProblemDate(value)
  if (!date) return "-"
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const compareProblemByDateDesc = (a, b) => {
  const left = parseProblemDate(a?.createdAt)
  const right = parseProblemDate(b?.createdAt)
  const leftMs = left ? left.getTime() : 0
  const rightMs = right ? right.getTime() : 0
  return rightMs - leftMs
}

function ProblemCard({
  problem,
  canResolve,
  canDelete,
  confirmProblemTarget,
  handleProblemCopy,
  handleProblemResolve,
  handleProblemArchive,
  handleProblemReopen,
  handleProblemDeleteWithConfirm,
}) {
  const status = String(problem?.status ?? "open")
  const isResolved = status === "resolved"
  const isArchived = status === "archived"
  const orderNumber = String(problem?.orderNumber ?? problem?.username ?? "").trim() || "-"

  return (
    <article
      className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/75 p-4 shadow-inner"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex max-w-full items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 break-all"
            >
              {orderNumber}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isArchived
                  ? "bg-amber-500/15 text-amber-200"
                  : isResolved
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-accent-500/15 text-accent-100"
              }`}
            >
              {isArchived ? "Arsiv" : isResolved ? "Cozulen" : "Acik"}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Eklendigi Tarih: {formatProblemCreatedAt(problem.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleProblemCopy(orderNumber)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          title="Siparis numarasini kopyala"
          aria-label="Siparis numarasini kopyala"
        >
          <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-ink-800/60 px-3.5 py-3">
        <p className="text-sm leading-relaxed text-slate-100">{problem.issue}</p>
      </div>

      {(canResolve || canDelete) && (
        <div className="mt-auto flex flex-wrap gap-2">
          {canResolve &&
            (isArchived ? (
              <button
                type="button"
                onClick={() => handleProblemReopen(problem.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:border-white/35 hover:bg-white/10"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Arsivden Cikar
              </button>
            ) : (
              <>
                {isResolved ? (
                  <button
                    type="button"
                    onClick={() => handleProblemReopen(problem.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:border-white/35 hover:bg-white/10"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Cozulmedi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleProblemResolve(problem.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-500/20"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Cozuldu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleProblemArchive(problem.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/20"
                >
                  <ArchiveBoxIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Arsive Al
                </button>
              </>
            ))}

          {canDelete && (
            <button
              type="button"
              onClick={() => handleProblemDeleteWithConfirm(problem.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                confirmProblemTarget === problem.id
                  ? "border-rose-300 bg-rose-500/25 text-rose-50"
                  : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
              }`}
            >
              <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {confirmProblemTarget === problem.id ? "Emin misin?" : "Sil"}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default function ProblemsTab({
  isLoading,
  panelClass,
  canCreate,
  canResolve,
  canDelete,
  openProblems,
  resolvedProblems,
  archivedProblems,
  problems,
  handleProblemCopy,
  handleProblemResolve,
  handleProblemArchive,
  handleProblemDeleteWithConfirm,
  confirmProblemTarget,
  handleProblemReopen,
  problemOrderNumber,
  setProblemOrderNumber,
  problemIssue,
  setProblemIssue,
  handleProblemAdd,
}) {
  const [activeView, setActiveView] = useState("open")

  const sortedOpenProblems = useMemo(
    () => [...openProblems].sort(compareProblemByDateDesc),
    [openProblems],
  )
  const sortedResolvedProblems = useMemo(
    () => [...resolvedProblems].sort(compareProblemByDateDesc),
    [resolvedProblems],
  )
  const sortedArchivedProblems = useMemo(
    () => [...archivedProblems].sort(compareProblemByDateDesc),
    [archivedProblems],
  )
  const sortedAllProblems = useMemo(() => [...problems].sort(compareProblemByDateDesc), [problems])

  const filteredProblems = useMemo(() => {
    if (activeView === "open") return sortedOpenProblems
    if (activeView === "resolved") return sortedResolvedProblems
    if (activeView === "archived") return sortedArchivedProblems
    return sortedAllProblems
  }, [activeView, sortedAllProblems, sortedOpenProblems, sortedResolvedProblems, sortedArchivedProblems])

  const activeViewLabel = useMemo(
    () => VIEW_OPTIONS.find((option) => option.key === activeView)?.label || "Tum",
    [activeView],
  )

  if (isLoading) {
    return <ProblemsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Problem</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Acik, cozulen ve arsiv kayitlarini tek ekrandan yonetin. Tarih alani eklenme zamanini gosterir.
            </p>
          </div>
          <div className="w-full md:max-w-[760px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Acik"
                value={openProblems.length}
                helper="Aktif kayit"
                tone="sky"
              />
              <MetricCard
                label="Cozulen"
                value={resolvedProblems.length}
                helper="Kapanan kayit"
                tone="emerald"
              />
              <MetricCard
                label="Toplam"
                value={problems.length}
                helper="Tum kayitlar"
                tone="indigo"
              />
              <MetricCard
                label="Arsiv"
                value={archivedProblems.length}
                helper="Arsivdeki kayit"
                tone="amber"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <section className={`${panelClass} bg-ink-800/60`}>
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    Problemler
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Duruma gore filtrele.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 p-1">
                    {VIEW_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setActiveView(option.key)}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                          activeView === option.key
                            ? "bg-accent-400 text-ink-900 shadow-glow"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {activeViewLabel}: {filteredProblems.length}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {filteredProblems.length === 0 ? (
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
                    Bu filtre icin problem kaydi bulunamadi.
                  </div>
                ) : (
                  filteredProblems.map((problem) => (
                    <ProblemCard
                      key={problem.id}
                      problem={problem}
                      canResolve={canResolve}
                      canDelete={canDelete}
                      confirmProblemTarget={confirmProblemTarget}
                      handleProblemCopy={handleProblemCopy}
                      handleProblemResolve={handleProblemResolve}
                      handleProblemArchive={handleProblemArchive}
                      handleProblemReopen={handleProblemReopen}
                      handleProblemDeleteWithConfirm={handleProblemDeleteWithConfirm}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="order-first space-y-6 lg:order-none">
          {canCreate && (
            <section className={`${panelClass} bg-ink-900/70`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni problem</p>
                  <p className="mt-1 text-sm text-slate-400">Siparis numarasini ve sorun detayini kaydet.</p>
                </div>
              </div>

              <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="pb-order-number">
                    Siparis numarasi
                  </label>
                  <input
                    id="pb-order-number"
                    type="text"
                    value={problemOrderNumber}
                    onChange={(event) => setProblemOrderNumber(event.target.value)}
                    placeholder="Orn: 1254389"
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="pb-issue">
                    Sorun detayi
                  </label>
                  <textarea
                    id="pb-issue"
                    value={problemIssue}
                    onChange={(event) => setProblemIssue(event.target.value)}
                    rows={4}
                    placeholder="Sorunun kisa ozetini yaz"
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleProblemAdd}
                    className="save-button flex-1 min-w-[140px] rounded-lg border px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide transition hover:-translate-y-0.5"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, helper, tone = "sky" }) {
  const toneByKey = {
    sky: "bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]",
    emerald: "bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.18),transparent)]",
    indigo: "bg-[radial-gradient(80%_120%_at_20%_0%,rgba(99,102,241,0.18),transparent)]",
    amber: "bg-[radial-gradient(80%_120%_at_20%_0%,rgba(245,158,11,0.18),transparent)]",
  }
  const toneClass = toneByKey[tone] || toneByKey.sky

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
      <div className={`pointer-events-none absolute inset-0 ${toneClass}`} />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-white">{value}</p>
        <p className="text-[11px] text-slate-400">{helper}</p>
      </div>
    </div>
  )
}
