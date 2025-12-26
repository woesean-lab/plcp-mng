function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ProblemsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`problem-card-${idx}`}
                  className="rounded-xl border border-white/10 bg-ink-900/60 p-4 shadow-inner"
                >
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="mt-3 h-10 w-full rounded-lg" />
                  <SkeletonBlock className="mt-3 h-3 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-20 w-full rounded-xl" />
          </div>
          )}
        </div>
      </div>
    </div>
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
  const isProblemsTabLoading = isLoading

  if (isProblemsTabLoading) {
    return <ProblemsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Problemli Müşteriler
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Problemli Müşteriler</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Müşteri kullanıcı adı ve sorununu kaydet; çözülünce "Problem çözüldü" ile kapat veya sil.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Açık problem: {openProblems.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Çözülen: {resolvedProblems.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {problems.length}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Açık problemler</p>
                <p className="text-sm text-slate-400">Kullanıcı adı ve sorun bilgisi listelenir.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {openProblems.length} kayıt
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isProblemsTabLoading ? (
                <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={`problem-skeleton-${idx}`}
                      className="rounded-xl border border-white/10 bg-ink-900 p-4 shadow-inner"
                    >
                      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                      <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" />
                      <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {openProblems.length === 0 && (
                    <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      Açık problem yok.
                    </div>
                  )}
                  {openProblems.map((pb) => (
                    <div
                      key={pb.id}
                      className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-ink-900 p-4 shadow-inner"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-accent-200 break-all">
                            {pb.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProblemCopy(pb.username)}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                        >
                          Kopyala
                        </button>
                      </div>
                      <p className="rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-slate-200 shadow-inner">
                        {pb.issue}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(canResolve || canDelete) && (
                          <>
                        {canResolve && (
                        <button
                          type="button"
                          onClick={() => handleProblemResolve(pb.id)}
                          className="rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25"
                        >
                          Çözüldü
                        </button>
                        )}
                        {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                            confirmProblemTarget === pb.id
                              ? "border-rose-300 bg-rose-500/25 text-rose-50"
                              : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                          }`}
                        >
                          {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                        </button>
                        )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Çözülen problemler</p>
                <p className="text-sm text-slate-400">Çözülmüş kayıtları sakla ya da sil.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {resolvedProblems.length} kayıt
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isProblemsTabLoading ? (
                <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`resolved-skeleton-${idx}`}
                      className="rounded-xl border border-emerald-200/40 bg-emerald-950/50 p-4 shadow-inner"
                    >
                      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                      <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" />
                      <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {resolvedProblems.length === 0 && (
                    <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      Çözülen kayıt yok.
                    </div>
                  )}
                  {resolvedProblems.map((pb) => (
                    <div
                      key={pb.id}
                      className="flex h-full flex-col gap-3 rounded-xl border border-emerald-200/40 bg-emerald-950/50 p-4 shadow-inner"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex max-w-full flex-wrap rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-50 break-all">
                            {pb.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProblemCopy(pb.username)}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                        >
                          Kopyala
                        </button>
                      </div>
                      <p className="rounded-lg border border-emerald-200/20 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-50/90 shadow-inner">
                        {pb.issue}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(canResolve || canDelete) && (
                          <>
                        {canResolve && (
                        <button
                          type="button"
                          onClick={() => handleProblemReopen(pb.id)}
                          className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                        >
                          Çözülmedi
                        </button>
                        )}
                        {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                          className={`w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                            confirmProblemTarget === pb.id
                              ? "border-rose-200 bg-rose-500/25 text-rose-50"
                              : "border-rose-200/80 bg-rose-500/10 text-rose-50 hover:border-rose-100 hover:bg-rose-500/20"
                          }`}
                        >
                          {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                        </button>
                        )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canCreate && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Problem ekle</p>
                <p className="text-sm text-slate-400">Kullanıcı adı ve sorunu yazıp kaydet.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Toplam: {problems.length}
              </span>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="pb-username">
                  Kullanıcı adı
                </label>
                <input
                  id="pb-username"
                  type="text"
                  value={problemUsername}
                  onChange={(e) => setProblemUsername(e.target.value)}
                  placeholder="@kullanici"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="pb-issue">
                  Sorun
                </label>
                <textarea
                  id="pb-issue"
                  value={problemIssue}
                  onChange={(e) => setProblemIssue(e.target.value)}
                  rows={4}
                  placeholder="Sorunun kısa özeti..."
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
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

