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
  const userRole = activeUser?.role?.name || "Personel"
  const permissionCount = Array.isArray(activeUser?.role?.permissions)
    ? activeUser.role.permissions.length
    : 0
  const moduleCount = [
    canViewMessages,
    canViewTasks,
    canViewSales,
    canViewProblems,
    canViewLists,
    canViewStock,
  ].filter(Boolean).length
  const userInitial = userName.slice(0, 1).toUpperCase() || "K"
  const activeTaskCount = tasks.todo + tasks.doing
  const taskProgress = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0
  const stockUsage = stocks.total > 0 ? Math.round((stocks.used / stocks.total) * 100) : 0
  const headerMetrics = [
    canViewTasks && {
      id: "active-tasks",
      label: "Aktif gorev",
      value: activeTaskCount,
      note: `${tasks.todo} bekleyen`,
    },
    canViewProblems && {
      id: "open-problems",
      label: "Problemli musteri",
      value: openCount,
      note: openCount > 0 ? `${openCount} acik kayit` : "Sorun yok",
    },
    canViewSales && {
      id: "last7-sales",
      label: "Son 7 gun satis",
      value: summary.last7Total,
      note: `Ortalama ${summary.average}`,
    },
  ].filter(Boolean)
  const fallbackMetrics = [
    { id: "modules", label: "Erisim modulu", value: moduleCount, note: "Gorunur sekmeler" },
    { id: "permissions", label: "Yetki seviyesi", value: permissionCount, note: "Rol kapsaminda" },
    { id: "resolved", label: "Cozulen problem", value: resolvedCount, note: "Takip kaydi" },
  ]
  const metricsToShow = headerMetrics.length > 0 ? headerMetrics : fallbackMetrics
  const moduleCards = [
    canViewTasks && {
      id: "tasks",
      label: "Gorev akisi",
      value: activeTaskCount,
      note: `Tamam ${tasks.done}`,
    },
    canViewSales && {
      id: "sales",
      label: "Satis ozeti",
      value: summary.total,
      note: `Son 7 gun ${summary.last7Total}`,
    },
    canViewStock && {
      id: "stock",
      label: "Stok kontrol",
      value: stocks.total,
      note: `Bosalan ${stocks.empty}`,
    },
    canViewProblems && {
      id: "problems",
      label: "Problemli musteri",
      value: openCount,
      note: openCount > 0 ? `${openCount} acik kayit` : "Sorun yok",
    },
    canViewMessages && {
      id: "messages",
      label: "Sablonlar",
      value: templateCountText,
      note: `Kategori ${categoryCountText}`,
    },
    canViewLists && { id: "lists", label: "Listeler", value: listCountText, note: "Aktif listeler" },
  ].filter(Boolean)
  const riskItems = [
    canViewProblems && {
      id: "risk-problems",
      title: "Problemli musteri",
      value: openCount,
      detail: openCount > 0 ? `${openCount} acik kayit` : "Sorun yok",
      tone: openCount > 0 ? "text-rose-200" : "text-emerald-200",
      dot: openCount > 0 ? "bg-rose-400" : "bg-emerald-400",
    },
    canViewStock && {
      id: "risk-stock",
      title: "Biten urun",
      value: stocks.empty,
      detail: stocks.empty > 0 ? `${stocks.empty} urun` : "Stok stabil",
      tone: stocks.empty > 0 ? "text-amber-200" : "text-emerald-200",
      dot: stocks.empty > 0 ? "bg-amber-400" : "bg-emerald-400",
    },
    canViewTasks && {
      id: "risk-tasks",
      title: "Bekleyen gorev",
      value: tasks.todo,
      detail: tasks.todo > 0 ? `${tasks.todo} yapilacak` : "Dengeli",
      tone: tasks.todo > 0 ? "text-sky-200" : "text-emerald-200",
      dot: tasks.todo > 0 ? "bg-sky-400" : "bg-emerald-400",
    },
  ].filter(Boolean)
  const showModuleCards = moduleCards.length > 0
  const showComms = canViewMessages || canViewLists

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_120%_at_0%_0%,rgba(34,197,94,0.18),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
        <div className="pointer-events-none absolute -right-28 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                Is Yonetim Paneli
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold text-white">Akis</h1>
              <p className="mt-2 text-sm text-slate-200/80">
                Merhaba {userName}, bugunku operasyonlari tek bakista yonetebilirsin.
              </p>
            </div>
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/90 to-emerald-200/40 text-lg font-semibold text-ink-900">
                  {userInitial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{userName}</p>
                  <p className="text-xs text-slate-400">{userRole}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Yetki: {permissionCount}
                  </p>
                </div>
              </div>
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Sistem</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Durum stabil
                </div>
                <div className="mt-2 text-xs text-slate-400">Erisim modulu: {moduleCount}</div>
                <div className="mt-1 text-xs text-slate-400">Cozulen problem: {resolvedCount}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricsToShow.map((metric) => (
              <div
                key={metric.id}
                className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModuleCards && (
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Modul ozetleri</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Bugun
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {moduleCards.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          {canViewTasks && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Gorev akisi</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Aktif {activeTaskCount}
                </span>
              </div>
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
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tamamlanma</span>
                  <span>{taskProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-emerald-400/70"
                    style={{ width: `${taskProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {canViewSales && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Satis ozeti</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Kayit {summary.count}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Toplam</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.total}</p>
                  <p className="text-xs text-slate-400">Son 7 gun {summary.last7Total}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Ortalama</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.average}</p>
                  <p className="text-xs text-slate-400">Kayit {summary.count}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Son 7 gun</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{summary.last7Total}</p>
                  <p className="text-xs text-slate-400">Toplam performans</p>
                </div>
              </div>
            </div>
          )}

          {canViewStock && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Stok gorunumu</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Bosalan {stocks.empty}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{stocks.total}</p>
                  Toplam
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{stocks.used}</p>
                  Kullanilan
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner">
                  <p className="text-lg font-semibold text-white">{stocks.empty}</p>
                  Biten
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Kullanim</span>
                  <span>{stockUsage}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-emerald-400/70"
                    style={{ width: `${stockUsage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Uyari ve riskler</p>
            <div className="mt-4 space-y-3">
              {riskItems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-300 shadow-inner">
                  Kritik risk yok. Sistem dengeli.
                </div>
              ) : (
                riskItems.map((alert) => (
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

          {showComms && (
            <div className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Iletisim ve listeler</p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {canViewMessages && (
                  <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Sablonlar</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{templateCountText}</p>
                    <p className="text-xs text-slate-400">Kategori {categoryCountText}</p>
                  </div>
                )}
                {canViewLists && (
                  <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Listeler</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{listCountText}</p>
                    <p className="text-xs text-slate-400">Aktif listeler</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
