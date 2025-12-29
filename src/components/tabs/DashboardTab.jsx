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
  onNavigate,
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
  const stockUsage = stocks.total > 0 ? Math.round((stocks.used / stocks.total) * 100) : 0
  const onOpenTab = (tabKey) => {
    if (typeof onNavigate === "function") onNavigate(tabKey)
  }

  const kpiItems = [
    canViewSales && {
      id: "sales",
      label: "Son 7 gun satis",
      value: summary.last7Total,
      hint: `Ortalama ${summary.average}`,
      tone: "from-emerald-500/20 to-emerald-500/5",
    },
    canViewTasks && {
      id: "tasks",
      label: "Aktif gorev",
      value: activeTaskCount,
      hint: `${tasks.todo} bekleyen`,
      tone: "from-sky-500/20 to-sky-500/5",
    },
    canViewProblems && {
      id: "problems",
      label: "Problemli musteri",
      value: openCount,
      hint: openCount > 0 ? "Takipte" : "Temiz",
      tone: "from-rose-500/20 to-rose-500/5",
    },
    canViewStock && {
      id: "stock",
      label: "Biten urun",
      value: stocks.empty,
      hint: `Kullanim ${stockUsage}%`,
      tone: "from-amber-500/20 to-amber-500/5",
    },
    canViewMessages && {
      id: "templates",
      label: "Sablon",
      value: templateCountText,
      hint: `Kategori ${categoryCountText}`,
      tone: "from-indigo-500/20 to-indigo-500/5",
    },
    canViewLists && {
      id: "lists",
      label: "Listeler",
      value: listCountText,
      hint: "Aktif",
      tone: "from-slate-500/20 to-slate-500/5",
    },
  ].filter(Boolean)
  const fallbackKpis = [
    {
      id: "modules",
      label: "Erisim modulu",
      value: moduleCount,
      hint: "Gorunur sekmeler",
      tone: "from-slate-500/15 to-slate-500/5",
    },
    {
      id: "permissions",
      label: "Yetki seviyesi",
      value: permissionCount,
      hint: "Rol kapsaminda",
      tone: "from-slate-500/15 to-slate-500/5",
    },
    {
      id: "resolved",
      label: "Cozulen problem",
      value: resolvedCount,
      hint: "Takip kaydi",
      tone: "from-slate-500/15 to-slate-500/5",
    },
  ]
  const kpisToShow = kpiItems.length > 0 ? kpiItems : fallbackKpis
  const actionItems = [
    canViewTasks && {
      id: "act-tasks",
      label: "Gorevleri planla",
      detail: "Yeni aksiyon ekle",
      tab: "tasks",
      accent: "bg-sky-400",
    },
    canViewSales && {
      id: "act-sales",
      label: "Satis girisi",
      detail: "Yeni kayit ekle",
      tab: "sales",
      accent: "bg-emerald-400",
    },
    canViewProblems && {
      id: "act-problems",
      label: "Problemli musteriler",
      detail: "Kayitlari guncelle",
      tab: "problems",
      accent: "bg-rose-400",
    },
    canViewStock && {
      id: "act-stock",
      label: "Stok guncelle",
      detail: "Urunleri kontrol et",
      tab: "stock",
      accent: "bg-amber-400",
    },
    canViewMessages && {
      id: "act-messages",
      label: "Sablonlari yonet",
      detail: "Mesaj havuzu",
      tab: "messages",
      accent: "bg-indigo-400",
    },
    canViewLists && {
      id: "act-lists",
      label: "Listeleri ac",
      detail: "Katilimlari guncelle",
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className={`${panelClass} bg-ink-900/55`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Kilit metrikler</p>
              <p className="mt-1 text-sm text-slate-300">Bugunun performans fotografindan ozet.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Canli
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {kpisToShow.map((item) => (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${item.tone} px-4 py-4 shadow-inner`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)] opacity-60" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-200/70">{item.label}</p>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-slate-200/80">
                      Ozet
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <p className="text-3xl font-semibold text-white">{item.value}</p>
                    <span className="text-xs text-slate-200/80">{item.hint}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelClass} bg-ink-900/55`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Aksiyonlar</p>
              <p className="mt-1 text-sm text-slate-300">Is akisini hizlandir.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {actionItems.length} is
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {actionItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-4 text-sm text-slate-400">
                Aksiyon bulunamadi.
              </div>
            ) : (
              actionItems.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onOpenTab(action.tab)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-left shadow-inner transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-1 rounded-full ${action.accent}`} />
                    <div>
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="text-xs text-slate-400">{action.detail}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 transition group-hover:text-slate-200">
                    Ac
                    <span className="h-1 w-6 rounded-full bg-white/10 transition group-hover:w-10" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
