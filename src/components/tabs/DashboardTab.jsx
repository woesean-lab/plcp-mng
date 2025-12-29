export default function DashboardTab({
  panelClass,
  activeUser,
  templateCountText,
  categoryCountText,
  taskStats,
  salesSummary,
  listCountText,
  stockSummary,
  openProblems,
  resolvedProblems,
  canViewMessages,
  canViewTasks,
  canViewSales,
  canViewProblems,
  canViewLists,
  canViewStock,
}) {
  const summary = salesSummary || { total: 0, count: 0, average: 0, last7Total: 0 }
  const tasks = taskStats || { total: 0, todo: 0, doing: 0, done: 0 }
  const openCount = Array.isArray(openProblems) ? openProblems.length : 0
  const resolvedCount = Array.isArray(resolvedProblems) ? resolvedProblems.length : 0
  const stocks = stockSummary || { total: 0, used: 0, empty: 0 }
  const userName = activeUser?.username || "Kullanici"

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_10%_0%,rgba(59,130,246,0.18),transparent)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
            Dashboard
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">Genel Bakis</h1>
          <p className="mt-2 text-sm text-slate-200/80">
            Merhaba {userName}, burada tum panellerin hizli ozetini gorursun.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canViewSales && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Satis</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Son 7 gun: {summary.last7Total}</span>
              <span>Ortalama: {summary.average}</span>
            </div>
          </div>
        )}

        {canViewTasks && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Gorev</p>
            <p className="mt-2 text-3xl font-semibold text-white">{tasks.total}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Yapilacak: {tasks.todo}</span>
              <span>Devam: {tasks.doing}</span>
              <span>Tamam: {tasks.done}</span>
            </div>
          </div>
        )}

        {canViewProblems && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Problemli Musteriler
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">{openCount}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Acik: {openCount}</span>
              <span>Kapali: {resolvedCount}</span>
            </div>
          </div>
        )}

        {canViewStock && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Stok</p>
            <p className="mt-2 text-3xl font-semibold text-white">{stocks.total}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Kullanilan: {stocks.used}</span>
              <span>Biten urun: {stocks.empty}</span>
            </div>
          </div>
        )}

        {canViewMessages && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Mesaj Sablonlari
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">{templateCountText}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Kategori: {categoryCountText}</span>
            </div>
          </div>
        )}

        {canViewLists && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Listeler</p>
            <p className="mt-2 text-3xl font-semibold text-white">{listCountText}</p>
            <div className="mt-2 text-xs text-slate-400">Aktif listeler</div>
          </div>
        )}
      </div>
    </div>
  )
}
