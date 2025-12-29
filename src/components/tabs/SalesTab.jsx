import { useMemo, useState } from "react"

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
}) {
  const isSalesTabLoading = isLoading

  if (isSalesTabLoading) {
    return <SalesSkeleton panelClass={panelClass} />
  }

  const summary = salesSummary || { total: 0, count: 0, average: 0, last7Total: 0, yesterdayTotal: 0 }
  const salesList = Array.isArray(salesRecords) ? salesRecords : []
  const chartData = Array.isArray(salesChartData) ? salesChartData : []
  const rangeMeta = {
    daily: { label: "Günlük", helper: "Son 14 günlük kayıt" },
    weekly: { label: "Haftalık", helper: "Son 12 haftalık kayıt" },
    monthly: { label: "Aylık", helper: "Son 12 aylık kayıt" },
    yearly: { label: "Yıllık", helper: "Son 6 yıllık kayıt" },
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
      const start = new Date(`${value}T00:00:00`)
      if (Number.isNaN(start.getTime())) return value
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const formatShort = (dateValue) => {
        const dayValue = String(dateValue.getDate()).padStart(2, "0")
        const monthValue = String(dateValue.getMonth() + 1).padStart(2, "0")
        return `${dayValue}.${monthValue}`
      }
      return `${formatShort(start)}-${formatShort(end)}`
    }
    const [year, month, day] = value.split("-")
    if (!year || !month || !day) return value
    return `${day}.${month}`
  }
  const formatMonthLabel = (value) => {
    if (!value) return ""
    const [year, month] = value.split("-")
    if (!year || !month) return value
    return `${month}/${year}`
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
  const analytics = useMemo(() => {
    if (salesList.length === 0) {
      return {
        bestDay: null,
        worstDay: null,
        bestMonth: null,
        bestYear: null,
        averageDaily: 0,
        totalDays: 0,
        totalSales: 0,
        last7Total: 0,
        prev7Total: 0,
        weeklyTrend: null,
        last30Total: 0,
        prev30Total: 0,
        monthlyTrend: null,
        peakDaysLast30: 0,
        maxLast30: 0,
        maxDeviation: 0,
        minDeviation: 0,
      }
    }
    const dailyTotals = new Map()
    let totalSales = 0
    salesList.forEach((sale) => {
      const date = String(sale?.date ?? "").trim()
      if (!date) return
      const amount = Number(sale?.amount ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) return
      totalSales += amount
      dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + amount)
    })
    if (dailyTotals.size === 0) {
      return {
        bestDay: null,
        worstDay: null,
        bestMonth: null,
        bestYear: null,
        averageDaily: 0,
        totalDays: 0,
        totalSales: 0,
        last7Total: 0,
        prev7Total: 0,
        weeklyTrend: null,
        last30Total: 0,
        prev30Total: 0,
        monthlyTrend: null,
        peakDaysLast30: 0,
        maxLast30: 0,
        maxDeviation: 0,
        minDeviation: 0,
      }
    }
    let bestDay = { date: "", total: -Infinity }
    let worstDay = { date: "", total: Infinity }
    const monthTotals = new Map()
    const yearTotals = new Map()
    dailyTotals.forEach((total, date) => {
      if (total > bestDay.total) bestDay = { date, total }
      if (total < worstDay.total) worstDay = { date, total }
      const [year, month] = date.split("-")
      if (year) {
        yearTotals.set(year, (yearTotals.get(year) ?? 0) + total)
      }
      if (year && month) {
        const monthKey = `${year}-${month}`
        monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + total)
      }
    })
    let bestMonth = null
    monthTotals.forEach((total, key) => {
      if (!bestMonth || total > bestMonth.total) {
        bestMonth = { key, total }
      }
    })
    let bestYear = null
    yearTotals.forEach((total, key) => {
      if (!bestYear || total > bestYear.total) {
        bestYear = { key, total }
      }
    })
    const totalDays = dailyTotals.size
    const averageDaily = totalDays > 0 ? Math.round(totalSales / totalDays) : 0
    const maxDeviation = bestDay.total > -Infinity ? Math.max(0, bestDay.total - averageDaily) : 0
    const minDeviation = worstDay.total < Infinity ? Math.max(0, averageDaily - worstDay.total) : 0
    const toKey = (value) => {
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, "0")
      const day = String(value.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    const shiftDate = (value, days) => {
      const next = new Date(value)
      next.setDate(next.getDate() + days)
      return next
    }
    const today = new Date()
    const todayKey = toKey(today)
    const last7Start = toKey(shiftDate(today, -6))
    const prev7Start = toKey(shiftDate(today, -13))
    const prev7End = toKey(shiftDate(today, -7))
    const last30Start = toKey(shiftDate(today, -29))
    const prev30Start = toKey(shiftDate(today, -59))
    const prev30End = toKey(shiftDate(today, -30))
    const sumRange = (startKey, endKey) => {
      let total = 0
      dailyTotals.forEach((value, date) => {
        if (date >= startKey && date <= endKey) total += value
      })
      return total
    }
    const last7Total = sumRange(last7Start, todayKey)
    const prev7Total = sumRange(prev7Start, prev7End)
    const weeklyTrend =
      prev7Total > 0 ? Math.round(((last7Total - prev7Total) / prev7Total) * 100) : null
    const last30Total = sumRange(last30Start, todayKey)
    const prev30Total = sumRange(prev30Start, prev30End)
    const monthlyTrend =
      prev30Total > 0 ? Math.round(((last30Total - prev30Total) / prev30Total) * 100) : null
    const last30Values = []
    dailyTotals.forEach((value, date) => {
      if (date >= last30Start && date <= todayKey) last30Values.push(value)
    })
    const maxLast30 = last30Values.length > 0 ? Math.max(...last30Values) : 0
    const peakDaysLast30 =
      maxLast30 > 0 ? last30Values.filter((value) => value === maxLast30).length : 0
    return {
      bestDay: bestDay.total > -Infinity ? bestDay : null,
      worstDay: worstDay.total < Infinity ? worstDay : null,
      bestMonth,
      bestYear,
      averageDaily,
      totalDays,
      totalSales,
      last7Total,
      prev7Total,
      weeklyTrend,
      last30Total,
      prev30Total,
      monthlyTrend,
      peakDaysLast30,
      maxLast30,
      maxDeviation,
      minDeviation,
    }
  }, [salesList])

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Satış
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Satış Grafiği</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Tarih bazlı satış gir, hareketi grafikte takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {summary.total}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Kayıt: {summary.count}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Toplam satış</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
            <p className="mt-1 text-xs text-slate-400">Tüm kayıtlar</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(59,130,246,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Son 7 gün</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.last7Total}</p>
            <p className="mt-1 text-xs text-slate-400">Günlük satış girişi</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.18),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Ortalama</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.average}</p>
            <p className="mt-1 text-xs text-slate-400">Kayıt başına</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satış Grafiği
                </p>
                <p className="text-sm text-slate-400">{activeRange.helper}.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 p-1">
                  {Object.entries(rangeMeta).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSalesRange(key)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        salesRange === key
                          ? "bg-accent-400 text-ink-900 shadow-glow"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  En yüksek: {chart?.maxValue ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 text-slate-100 shadow-inner">
              {chart ? (
                <div className="space-y-3">
                  <div className="-mx-2 overflow-x-auto px-2 pb-2">
                    <div className="flex min-w-[560px] items-end gap-3">
                      {chart.bars.map((bar, idx) => (
                        <div
                          key={`bar-${idx}`}
                          className="flex min-w-[32px] flex-1 flex-col items-center justify-end gap-2"
                        >
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className={`relative w-full rounded-2xl ${
                              bar.isPeak
                                ? "bg-accent-400"
                                : "bg-slate-600/80"
                            }`}
                            style={{ height: `${bar.heightPercent}%` }}
                          >
                            <span
                              className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold ${
                                bar.isPeak ? "text-accent-200" : "text-slate-300"
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
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-ink-900/80 px-4 py-6 text-center text-sm text-slate-400">
                  Henüz satış kaydı yok. İlk satışı ekleyin.
                </div>
              )}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satış özetleri
                </p>
                <p className="text-xs text-slate-400">Kısa performans özeti.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Gün: {analytics.totalDays}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En yüksek gün
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {analytics.bestDay ? formatDate(analytics.bestDay.date) : "-"}
                </p>
                <p className="text-xs text-accent-200">
                  {analytics.bestDay ? analytics.bestDay.total : 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En düşük gün
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {analytics.worstDay ? formatDate(analytics.worstDay.date) : "-"}
                </p>
                <p className="text-xs text-accent-200">
                  {analytics.worstDay ? analytics.worstDay.total : 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En yüksek ay
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {analytics.bestMonth ? formatMonthLabel(analytics.bestMonth.key) : "-"}
                </p>
                <p className="text-xs text-accent-200">
                  {analytics.bestMonth ? analytics.bestMonth.total : 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En yüksek yıl
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {analytics.bestYear ? analytics.bestYear.key : "-"}
                </p>
                <p className="text-xs text-accent-200">
                  {analytics.bestYear ? analytics.bestYear.total : 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Ortalama günlük
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{analytics.averageDaily}</p>
                <p className="text-xs text-slate-400">
                  Sapma: +{analytics.maxDeviation} / -{analytics.minDeviation}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Haftalık trend
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    analytics.weeklyTrend === null
                      ? "text-slate-200"
                      : analytics.weeklyTrend >= 0
                        ? "text-emerald-200"
                        : "text-rose-200"
                  }`}
                >
                  {analytics.weeklyTrend === null
                    ? "-"
                    : `${analytics.weeklyTrend > 0 ? "+" : ""}${analytics.weeklyTrend}%`}
                </p>
                <p className="text-xs text-slate-400">
                  Son 7: {analytics.last7Total} · Önceki 7: {analytics.prev7Total}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Aylık trend
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    analytics.monthlyTrend === null
                      ? "text-slate-200"
                      : analytics.monthlyTrend >= 0
                        ? "text-emerald-200"
                        : "text-rose-200"
                  }`}
                >
                  {analytics.monthlyTrend === null
                    ? "-"
                    : `${analytics.monthlyTrend > 0 ? "+" : ""}${analytics.monthlyTrend}%`}
                </p>
                <p className="text-xs text-slate-400">
                  Son 30: {analytics.last30Total} · Önceki 30: {analytics.prev30Total}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Zirve gün sayısı
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{analytics.peakDaysLast30}</p>
                <p className="text-xs text-slate-400">Maks: {analytics.maxLast30}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner lg:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Son 7 gün
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-slate-100">{analytics.last7Total}</p>
                  <p className="text-xs text-slate-400">Toplam: {analytics.totalSales}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canCreate && (
          <div className={`${panelClass} relative overflow-hidden bg-ink-800/60`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(34,197,94,0.14),transparent)]" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satış girişi
                </p>
                <p className="text-sm text-slate-400">Tarih ve satış adetini ekle.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Kayıt: {summary.count}
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
                  Satış adedi
                </label>
                <input
                  id="sales-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={salesForm.amount}
                  onChange={(e) => setSalesForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Örn: 42"
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
        </div>
      </div>
    </div>
  )
}
