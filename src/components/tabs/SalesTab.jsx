import { useState } from "react"

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60 px-5 py-5`}>
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
  salesRecords,
  handleSaleUpdateByDate,
}) {
  const isSalesTabLoading = isLoading

  if (isSalesTabLoading) {
    return <SalesSkeleton panelClass={panelClass} />
  }

  const summary = salesSummary || { total: 0, count: 0, average: 0, last7Total: 0 }
  const salesList = Array.isArray(salesRecords) ? salesRecords : []
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
  const formatPointLabel = (value) => {
    if (!value) return ""
    if (salesRange === "yearly") return value
    if (salesRange === "monthly") {
      const [year, month] = value.split("-")
      if (!year || !month) return value
      return `${month}/${year.slice(-2)}`
    }
    if (salesRange === "weekly") {
      const [year, month, day] = value.split("-")
      if (!year || !month || !day) return value
      return `Wk ${day}.${month}`
    }
    const [year, month, day] = value.split("-")
    if (!year || !month || !day) return value
    return `${day}.${month}`
  }

  const chart = (() => {
    if (chartData.length === 0) return null
    const maxValue = Math.max(...chartData.map((item) => Number(item.amount ?? 0)), 0)
    let peakIndex = -1
    chartData.forEach((item, index) => {
      if (Number(item.amount ?? 0) === maxValue) peakIndex = index
    })
    const bars = chartData.map((item, index) => {
      const amount = Number(item.amount ?? 0)
      const ratio = maxValue > 0 ? amount / maxValue : 0
      const heightPercent = ratio === 0 ? 4 : Math.max(8, ratio * 85)
      return {
        amount,
        ratio,
        heightPercent,
        label: formatPointLabel(item.date),
        showLabel: true,
        isPeak: index === peakIndex,
      }
    })
    return { bars, maxValue }
  })()
  const [updateDate, setUpdateDate] = useState("")
  const [updateAmount, setUpdateAmount] = useState("")

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
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

            <div className="mt-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 text-slate-100 shadow-inner">
              {chart ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    {chart.bars.map((bar, idx) => (
                      <div key={`bar-${idx}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className={`relative w-full rounded-2xl ${
                              bar.isPeak
                                ? "bg-emerald-400"
                                : "bg-slate-600/80"
                            }`}
                            style={{ height: `${bar.heightPercent}%` }}
                          >
                            <span
                              className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold ${
                                bar.isPeak ? "text-emerald-300" : "text-slate-300"
                              }`}
                            >
                              {bar.amount}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-ink-900/80 px-4 py-6 text-center text-sm text-slate-400">
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
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satis girisi
                </p>
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
              Hizli guncelle
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  placeholder="Yeni adet"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const success = handleSaleUpdateByDate(updateDate, "", updateAmount)
                    if (success) {
                      setUpdateDate("")
                      setUpdateAmount("")
                    }
                  }}
                  className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  Guncelle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpdateDate("")
                    setUpdateAmount("")
                  }}
                  className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
