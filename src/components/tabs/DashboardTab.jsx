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
  const alerts = [
    canViewProblems && {
      id: "problems",
      title: "Problemli musteri",
      value: openCount,
      detail: openCount > 0 ? `${openCount} acik kayit` : "Sorun yok",
      tone: openCount > 0 ? "text-rose-200" : "text-emerald-200",
      dot: openCount > 0 ? "bg-rose-400" : "bg-emerald-400",
    },
    canViewStock && {
      id: "stock",
      title: "Biten urun",
      value: stocks.empty,
      detail: stocks.empty > 0 ? `${stocks.empty} urun` : "Stok stabil",
      tone: stocks.empty > 0 ? "text-amber-200" : "text-emerald-200",
      dot: stocks.empty > 0 ? "bg-amber-400" : "bg-emerald-400",
    },
    canViewTasks && {
      id: "tasks",
      title: "Gorev yogunlugu",
      value: tasks.todo,
      detail: tasks.todo > 0 ? `${tasks.todo} yapilacak` : "Dengeli",
      tone: tasks.todo > 0 ? "text-sky-200" : "text-emerald-200",
      dot: tasks.todo > 0 ? "bg-sky-400" : "bg-emerald-400",
    },
  ].filter(Boolean)
  const quickFacts = [
    canViewSales && { id: "sales", label: "Satis", value: summary.total, note: "Son 7 gun", extra: summary.last7Total },
    canViewTasks && { id: "tasks", label: "Gorev", value: tasks.total, note: "Devam", extra: tasks.doing },
    canViewStock && { id: "stock", label: "Stok", value: stocks.total, note: "Kullanilan", extra: stocks.used },
    canViewMessages && {
      id: "messages",
      label: "Sablon",
      value: templateCountText,
      note: "Kategori",
      extra: categoryCountText,
    },
    canViewLists && { id: "lists", label: "Listeler", value: listCountText, note: "Aktif" },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgba(34,197,94,0.16),transparent)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                Kontrol Merkezi
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold text-white">Genel Durum</h1>
              <p className="mt-2 text-sm text-slate-200/80">
                Merhaba {userName}, bugunku durumun kisa ozetini gorebilirsin.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Sistem</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Durum stabil
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Durum Ozetleri</p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                Bugun
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickFacts.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                  {item.note && (
                    <p className="mt-1 text-xs text-slate-400">
                      {item.note}: {item.extra ?? "-"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {canViewSales && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Satis performansi
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Toplam</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.total}</p>
                  <p className="text-xs text-slate-400">Son 7 gun: {summary.last7Total}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Ortalama</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.average}</p>
                  <p className="text-xs text-slate-400">Toplam kayit: {summary.count}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Uyarilar</p>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-300 shadow-inner">
                  Kritik uyarı yok. Sistem dengeli.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${alert.dot}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{alert.title}</p>
                        <p className="text-xs text-slate-400">{alert.detail}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${alert.tone}`}>{alert.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {canViewTasks && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Is Akisi</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{tasks.todo}</p>
                  Yapilacak
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{tasks.doing}</p>
                  Devam
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{tasks.done}</p>
                  Tamam
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
