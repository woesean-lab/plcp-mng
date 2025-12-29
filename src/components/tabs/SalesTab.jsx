function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function SalesSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-52" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`sales-metric-${idx}`}
            className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card"
          >
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-6 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-32 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

const formatDate = (value) => {
  if (!value) return ""
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

export default function SalesTab({
  isLoading,
  panelClass,
  canCreate,
  salesSummary,
  salesChartData,
  salesRange,
  setSalesRange,
  salesForm,
  setSalesForm,
  handleSaleAdd,
  recentSales,
}) {
  const isSalesTabLoading = isLoading

  if (isSalesTabLoading) {
    return <SalesSkeleton panelClass={panelClass} />
  }

  const summary = salesSummary || { total: 0, count: 0, average: 0, last7Total: 0 }
  const salesList = Array.isArray(recentSales) ? recentSales : []
  const chartData = Array.isArray(salesChartData) ? salesChartData : []
  const rangeMeta = {
    daily: { label: "Gunluk", helper: "Son 14 gunluk kayit" },
    weekly: { label: "Haftalik", helper: "Son 12 haftalik kayit" },
    monthly: { label: "Aylik", helper: "Son 12 aylik kayit" },
    yearly: { label: "Yillik", helper: "Son 6 yillik kayit" },
  }
  const activeRange = rangeMeta[salesRange] || rangeMeta.daily
  const formatRangeLabel = (value) => {
    if (!value) return ""
    if (salesRange === "yearly") return value
    if (salesRange === "monthly") {
      const [year, month] = value.split("-")
      if (!year || !month) return value
      return `${month}/${year}`
    }
    return formatDate(value)
  }

  const chart = (() => {
    if (chartData.length === 0) return null
    const width = 100
    const height = 40
    const pad = 4
    const maxValue = Math.max(...chartData.map((item) => item.amount), 0)
    const span = height - pad * 2
    const count = chartData.length
    const step = count > 1 ? (width - pad * 2) / (count - 1) : 0
    const points = chartData.map((item, index) => {
      const x = count > 1 ? pad + index * step : width / 2
      const value = maxValue > 0 ? item.amount / maxValue : 0
      const y = height - pad - value * span
      return { x, y }
    })
    const line = points.map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    const area = `${line} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`
    return { line, area, maxValue }
  })()

  const chartStartLabel = chartData[0]?.date ? formatRangeLabel(chartData[0].date) : ""
  const lastChartItem = chartData[chartData.length - 1]
  const chartEndLabel = lastChartItem?.date ? formatRangeLabel(lastChartItem.date) : ""

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Satis
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Satis</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Tarih bazli satis gir, hareketi grafikte takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {summary.total}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Kayit: {summary.count}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Toplam satis</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
            <p className="mt-1 text-xs text-slate-400">Tum kayitlar</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(59,130,246,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Son 7 gun</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.last7Total}</p>
            <p className="mt-1 text-xs text-slate-400">Gunluk satis girisi</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Ortalama</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.average}</p>
            <p className="mt-1 text-xs text-slate-400">Kayit basina</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satis grafigi
                </p>
                <p className="text-sm text-slate-400">{activeRange.helper}.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rangeMeta).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSalesRange(key)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                        salesRange === key
                          ? "border-accent-300 bg-accent-500/20 text-accent-50 shadow-glow"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300/60 hover:text-accent-100"
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  En yuksek: {chart?.maxValue ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              {chart ? (
                <div className="space-y-3">
                  <svg viewBox="0 0 100 40" className="h-32 w-full">
                    <defs>
                      <linearGradient id="sales-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3ac7ff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3ac7ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={chart.area} fill="url(#sales-gradient)" />
                    <path d={chart.line} fill="none" stroke="#3ac7ff" strokeWidth="1.4" />
                  </svg>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{chartStartLabel || "-"}</span>
                    <span>{chartEndLabel || "-"}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                  Henuz satis kaydi yok. Ilk satisi ekleyin.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canCreate && (
          <div className={`${panelClass} bg-ink-900/70`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Satis girisi</p>
                <p className="text-sm text-slate-400">Tarih ve satis adetini ekle.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Kayit: {summary.count}
              </span>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="sales-date">
                  Tarih
                </label>
                <input
                  id="sales-date"
                  type="date"
                  value={salesForm.date}
                  onChange={(e) => setSalesForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="sales-amount">
                  Satis adedi
                </label>
                <input
                  id="sales-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={salesForm.amount}
                  onChange={(e) => setSalesForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Orn: 42"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaleAdd}
                  className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setSalesForm((prev) => ({ ...prev, amount: "" }))}
                  className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>
          )}

          <div className={`${panelClass} bg-ink-800/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
              Son kayitlar
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {salesList.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                  Kayit bulunamadi.
                </p>
              ) : (
                salesList.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 text-sm text-slate-200 shadow-inner"
                  >
                    <span>{formatDate(sale.date)}</span>
                    <span className="text-sm font-semibold text-slate-100">{sale.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
