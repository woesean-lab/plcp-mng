import { useMemo, useState } from "react"
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBlock key={`problem-feed-${idx}`} className="h-12 w-full rounded-xl" />
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

const normalizeSearch = (value) => String(value ?? "").trim().toLowerCase()

const problemMatchesQuery = (problem, normalizedQuery) => {
  if (!normalizedQuery) return true
  const username = String(problem?.username ?? "").toLowerCase()
  const issue = String(problem?.issue ?? "").toLowerCase()
  return username.includes(normalizedQuery) || issue.includes(normalizedQuery)
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
  handleProblemReopen,
  handleProblemDeleteWithConfirm,
}) {
  const isResolved = String(problem?.status ?? "") === "resolved"

  return (
    <article
      className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/75 p-4 shadow-inner"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isResolved ? "bg-emerald-300" : "bg-accent-300"}`} aria-hidden="true" />
            <span
              className="inline-flex max-w-full items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 break-all"
            >
              {problem.username}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isResolved ? "bg-emerald-500/15 text-emerald-200" : "bg-accent-500/15 text-accent-100"
              }`}
            >
              {isResolved ? "Cozulen" : "Acik"}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Eklendigi Tarih: {formatProblemCreatedAt(problem.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleProblemCopy(problem.username)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          title="Kullanici adini kopyala"
          aria-label="Kullanici adini kopyala"
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
            (isResolved ? (
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
  problems,
  handleProblemCopy,
  handleProblemResolve,
  handleProblemDeleteWithConfirm,
  confirmProblemTarget,
  handleProblemReopen,
  problemUsername,
  setProblemUsername,
  problemIssue,
  setProblemIssue,
  handleProblemAdd,
}) {
  const [activeView, setActiveView] = useState("open")
  const [searchQuery, setSearchQuery] = useState("")

  const normalizedQuery = normalizeSearch(searchQuery)

  const sortedOpenProblems = useMemo(
    () => [...openProblems].sort(compareProblemByDateDesc),
    [openProblems],
  )
  const sortedResolvedProblems = useMemo(
    () => [...resolvedProblems].sort(compareProblemByDateDesc),
    [resolvedProblems],
  )
  const sortedAllProblems = useMemo(() => [...problems].sort(compareProblemByDateDesc), [problems])

  const filteredProblems = useMemo(() => {
    const source =
      activeView === "open"
        ? sortedOpenProblems
        : activeView === "resolved"
          ? sortedResolvedProblems
          : sortedAllProblems

    return source.filter((problem) => problemMatchesQuery(problem, normalizedQuery))
  }, [activeView, normalizedQuery, sortedAllProblems, sortedOpenProblems, sortedResolvedProblems])

  const latestProblems = useMemo(() => sortedAllProblems.slice(0, 5), [sortedAllProblems])

  const todaysProblemCount = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("tr-TR")
    return sortedAllProblems.reduce((count, problem) => {
      const date = parseProblemDate(problem.createdAt)
      if (!date) return count
      return date.toLocaleDateString("tr-TR") === todayKey ? count + 1 : count
    }, 0)
  }, [sortedAllProblems])

  if (isLoading) {
    return <ProblemsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Problem Merkezi</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200/80">
            Acik ve cozulen kayitlari filtreleyip hizli yonetin. Kartlardaki tarih bilgisi problemin eklendigi zamani gosterir.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Acik" value={openProblems.length} />
            <MetricCard label="Cozulen" value={resolvedProblems.length} />
            <MetricCard label="Toplam" value={problems.length} />
            <MetricCard label="Bugun Eklenen" value={todaysProblemCount} />
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
                    Problem kartlari
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Duruma gore filtrele, kullanici veya sorun metniyle ara.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <div className="flex items-center rounded-lg border border-white/10 bg-ink-900/90 p-1">
                    {VIEW_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setActiveView(option.key)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                          activeView === option.key
                            ? "bg-white/15 text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-ink-900 px-3 sm:min-w-[250px]">
                    <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Kullanici veya sorun ara"
                      className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition hover:border-white/20 hover:text-white"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
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
                      handleProblemReopen={handleProblemReopen}
                      handleProblemDeleteWithConfirm={handleProblemDeleteWithConfirm}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Son eklenenler</p>
                <p className="mt-1 text-sm text-slate-400">En guncel problem hareketleri.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                {latestProblems.length} kayit
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {latestProblems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Henuz problem eklenmedi.
                </div>
              ) : (
                latestProblems.map((problem) => {
                  const isResolved = String(problem?.status ?? "") === "resolved"
                  return (
                    <div
                      key={`latest-${problem.id}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/75 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">{problem.username}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{problem.issue}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-slate-500">{formatProblemCreatedAt(problem.createdAt)}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-300">
                          {isResolved ? "Cozulen" : "Acik"}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        <div className="order-first space-y-6 lg:order-none">
          {canCreate && (
            <section className={`${panelClass} bg-ink-900/70`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni problem</p>
                  <p className="mt-1 text-sm text-slate-400">Kullanici adini ve sorun detayini kaydet.</p>
                </div>
              </div>

              <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="pb-username">
                    Kullanici adi
                  </label>
                  <input
                    id="pb-username"
                    type="text"
                    value={problemUsername}
                    onChange={(event) => setProblemUsername(event.target.value)}
                    placeholder="@kullanici"
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
                    className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProblemUsername("")
                      setProblemIssue("")
                    }}
                    className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className={`${panelClass} bg-ink-900/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kayit notu</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/75 px-3.5 py-3 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                Kartlardaki tarih alani, problemin eklendigi tarihi gosterir.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
