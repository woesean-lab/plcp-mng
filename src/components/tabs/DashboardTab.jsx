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
  recentActivity,
  canViewMessages,
  canViewTasks,
  canViewSales,
  canViewProblems,
  canViewLists,
  canViewStock,
  onNavigate,
}) {
  const summary = salesSummary || { total: 0, count: 0, average: 0, last7Total: 0, yesterdayTotal: 0 }
  const tasks = taskStats || { total: 0, todo: 0, doing: 0, done: 0 }
  const openCount = Array.isArray(openProblems) ? openProblems.length : 0
  const resolvedCount = Array.isArray(resolvedProblems) ? resolvedProblems.length : 0
  const stocks = stockSummary || { total: 0, used: 0, empty: 0 }
  const userName = activeUser?.username || "Kullanıcı"
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
  const onOpenTab = (tabKey) => {
    if (typeof onNavigate === "function") onNavigate(tabKey)
  }

  const activity = recentActivity || {
    salesCount: 0,
    salesTotal: 0,
    tasksUpdated: 0,
    problemsOpened: 0,
    problemsResolved: 0,
  }
  const attentionItems = [
    canViewTasks && {
      id: "focus-tasks",
      text: `Tamamlanması gereken ${tasks.todo} göreviniz var.`,
      accent: "bg-sky-400",
    },
    canViewProblems && {
      id: "focus-problems",
      text: `Çözülmesi gereken ${openCount} problemli müşteri var.`,
      accent: "bg-rose-400",
    },
  ].filter(Boolean)
  const activityItems = [
    canViewSales && {
      id: "activity-sales",
      label: "Satış girişi",
      value: activity.salesCount,
      hint: `Toplam ${activity.salesTotal}`,
      accent: "bg-emerald-400",
    },
    canViewTasks && {
      id: "activity-tasks",
      label: "Görev güncellemesi",
      value: activity.tasksUpdated,
      hint: "Son 24 saat",
      accent: "bg-sky-400",
    },
    canViewProblems && {
      id: "activity-problems",
      label: "Yeni problem",
      value: activity.problemsOpened,
      hint: `Çözülen ${activity.problemsResolved}`,
      accent: "bg-rose-400",
    },
  ].filter(Boolean)

  const kpiItems = [
    canViewSales && {
      id: "sales",
      label: "Son 7 gün satış",
      value: summary.last7Total,
      subLabel: "Dün",
      subValue: summary.yesterdayTotal,
      accent: "bg-emerald-400",
    },
    canViewTasks && {
      id: "tasks",
      label: "Aktif görev",
      value: activeTaskCount,
      hint: `${tasks.todo} bekleyen`,
      accent: "bg-sky-400",
    },
    canViewProblems && {
      id: "problems",
      label: "Problemli müşteri",
      value: openCount,
      hint: openCount > 0 ? "Takipte" : "Temiz",
      accent: "bg-rose-400",
    },
    canViewStock && {
      id: "stock",
      label: "Stoksuz ürün",
      value: stocks.empty,
      subLabel: "Stokta",
      subValue: stocks.total,
      accent: "bg-amber-400",
    },
    canViewLists && {
      id: "lists",
      label: "Listeler",
      value: listCountText,
      hint: "Aktif",
      accent: "bg-slate-400",
    },
  ].filter(Boolean)
  const fallbackKpis = [
    {
      id: "modules",
      label: "Erişim modülü",
      value: moduleCount,
      hint: "Görünür sekmeler",
      accent: "bg-slate-400",
    },
    {
      id: "permissions",
      label: "Yetki seviyesi",
      value: permissionCount,
      hint: "Rol kapsamında",
      accent: "bg-slate-400",
    },
    {
      id: "resolved",
      label: "Çözülen problem",
      value: resolvedCount,
      hint: "Takip kaydı",
      accent: "bg-slate-400",
    },
  ]
  const kpisToShow = kpiItems.length > 0 ? kpiItems : fallbackKpis
  const actionItems = [
    canViewTasks && {
      id: "act-tasks",
      label: "Görevleri planla",
      detail: "Yeni aksiyon ekle",
      tab: "tasks",
      accent: "bg-sky-400",
    },
    canViewSales && {
      id: "act-sales",
      label: "Satış girişi",
      detail: "Yeni kayıt ekle",
      tab: "sales",
      accent: "bg-emerald-400",
    },
    canViewProblems && {
      id: "act-problems",
      label: "Problemli müşteriler",
      detail: "Kayıtları güncelle",
      tab: "problems",
      accent: "bg-rose-400",
    },
    canViewStock && {
      id: "act-stock",
      label: "Stok güncelle",
      detail: "Ürünleri kontrol et",
      tab: "stock",
      accent: "bg-amber-400",
    },
    canViewMessages && {
      id: "act-messages",
      label: "Şablonları yönet",
      detail: "Mesaj havuzu",
      tab: "messages",
      accent: "bg-indigo-400",
    },
    canViewLists && {
      id: "act-lists",
      label: "Listeleri aç",
      detail: "Katılımları güncelle",
      tab: "lists",
      accent: "bg-slate-400",
    },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_120%_at_0%_0%,rgba(34,197,94,0.18),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
        <div className="pointer-events-none absolute -right-28 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              İş Yönetim Paneli
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold text-white">Akış</h1>
            <p className="mt-2 text-sm text-slate-200/80">
              Merhaba {userName}, bugünkü operasyonları tek bakışta yönetebilirsin.
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
              <div className="mt-2 text-xs text-slate-400">Erişim modülü: {moduleCount}</div>
              <div className="mt-1 text-xs text-slate-400">Çözülen problem: {resolvedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className={`${panelClass} bg-ink-900/55`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Hatırlatıcılar</p>
              <p className="mt-1 text-sm text-slate-300">Bugün önceliklendirilmesi gerekenler.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Canlı
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {attentionItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-400">
                Bugün kritik iş bulunamadı.
              </div>
            ) : (
              attentionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-200"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                  <span>{item.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {kpisToShow.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                  </div>
                  {item.hint && <p className="mt-2 text-xs text-slate-400">{item.hint}</p>}
                  {item.subLabel && (
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                      <span>{item.subLabel}</span>
                      <span className="font-semibold text-white">{item.subValue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          <div className={`${panelClass} bg-ink-900/55 mt-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Son 24 saat</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                Hareket
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activityItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-400 sm:col-span-2">
                  Son 24 saatte hareket yok.
                </div>
              ) : (
                activityItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                      <span>{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{item.hint}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>

        <div className={`${panelClass} bg-ink-900/55`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Aksiyonlar</p>
              <p className="mt-1 text-sm text-slate-300">İş akışını hızlandır.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {actionItems.length} iş
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {actionItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-4 text-sm text-slate-400 sm:col-span-2">
                Aksiyon bulunamadı.
              </div>
            ) : (
              actionItems.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onOpenTab(action.tab)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-4 text-left shadow-inner transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${action.accent}`} />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="text-xs text-slate-400">{action.detail}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 transition group-hover:text-slate-200">
                      Git
                      <span className="h-1 w-6 rounded-full bg-white/10 transition group-hover:w-10" />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
