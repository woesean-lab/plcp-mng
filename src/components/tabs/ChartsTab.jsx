import { useMemo, useState } from "react"

const rangeOptions = [
  { key: "daily", label: "Gunluk", caption: "Son 7 gun" },
  { key: "weekly", label: "Haftalik", caption: "Son 8 hafta" },
  { key: "monthly", label: "Aylik", caption: "Son 12 ay" },
  { key: "yearly", label: "Yillik", caption: "Son 5 yil" },
]

const salesSeries = {
  daily: [
    { label: "Pzt", value: 3200 },
    { label: "Sal", value: 2800 },
    { label: "Car", value: 3600 },
    { label: "Per", value: 4200 },
    { label: "Cum", value: 3900 },
    { label: "Cmt", value: 4600 },
    { label: "Paz", value: 5200 },
  ],
  weekly: [
    { label: "H1", value: 18500 },
    { label: "H2", value: 20100 },
    { label: "H3", value: 17600 },
    { label: "H4", value: 21400 },
    { label: "H5", value: 22800 },
    { label: "H6", value: 19650 },
    { label: "H7", value: 23550 },
    { label: "H8", value: 24800 },
  ],
  monthly: [
    { label: "Oca", value: 84000 },
    { label: "Sub", value: 91000 },
    { label: "Mar", value: 88500 },
    { label: "Nis", value: 97200 },
    { label: "May", value: 105400 },
    { label: "Haz", value: 99200 },
    { label: "Tem", value: 112300 },
    { label: "Agu", value: 118900 },
    { label: "Eyl", value: 107700 },
    { label: "Eki", value: 121400 },
    { label: "Kas", value: 126800 },
    { label: "Ara", value: 139200 },
  ],
  yearly: [
    { label: "2021", value: 860000 },
    { label: "2022", value: 940000 },
    { label: "2023", value: 1015000 },
    { label: "2024", value: 1132000 },
    { label: "2025", value: 1245000 },
  ],
}

const buildChartPaths = (values) => {
  const width = 640
  const height = 200
  const padX = 24
  const padY = 20
  const innerWidth = width - padX * 2
  const innerHeight = height - padY * 2
  if (!values || values.length === 0) {
    return {
      width,
      height,
      padX,
      padY,
      innerWidth,
      innerHeight,
      min: 0,
      max: 0,
      points: [],
      linePath: "",
      areaPath: "",
      gridLines: [],
    }
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)
  const step = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth
  const points = values.map((value, index) => {
    const x = padX + index * step
    const y = padY + innerHeight - ((value - min) / range) * innerHeight
    return { x, y, value }
  })
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ")
  const areaPath = `${linePath} L ${padX + innerWidth} ${padY + innerHeight} L ${padX} ${padY + innerHeight} Z`
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    return padY + (innerHeight / 3) * index
  })
  return {
    width,
    height,
    padX,
    padY,
    innerWidth,
    innerHeight,
    min,
    max,
    points,
    linePath,
    areaPath,
    gridLines,
  }
}

const getTrendMeta = (value, percent) => {
  if (value >= 0) {
    return {
      label: percent > 0 ? "Yukselis" : "Stabil",
      className: "text-emerald-200",
      badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-100",
      sign: "+",
    }
  }
  return {
    label: "Dususte",
    className: "text-rose-200",
    badge: "border-rose-300/50 bg-rose-500/15 text-rose-100",
    sign: "",
  }
}

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ChartsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-9 w-48" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-24 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-40 rounded-full" />
            <SkeletonBlock className="mt-4 h-10 w-64 rounded-full" />
            <SkeletonBlock className="mt-6 h-48 w-full rounded-2xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`chart-stat-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SkeletonBlock className="h-3 w-16 rounded-full" />
                <SkeletonBlock className="mt-3 h-6 w-24 rounded-full" />
                <SkeletonBlock className="mt-2 h-3 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonBlock key={`chart-list-${idx}`} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChartsTab({ isLoading, panelClass }) {
  const [range, setRange] = useState("weekly")
  const rangeMeta = rangeOptions.find((option) => option.key === range) || rangeOptions[0]
  const data = salesSeries[rangeMeta.key] || []
  const numberFormatter = useMemo(() => new Intl.NumberFormat("tr-TR"), [])
  const values = useMemo(() => data.map((item) => item.value), [data])
  const summary = useMemo(() => {
    if (values.length === 0) {
      return { total: 0, average: 0, max: 0, min: 0 }
    }
    const total = values.reduce((acc, value) => acc + value, 0)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const average = Math.round(total / values.length)
    return { total, average, max, min }
  }, [values])
  const chart = useMemo(() => buildChartPaths(values), [values])
  const trendValue = values.length > 1 ? values[values.length - 1] - values[0] : 0
  const trendPercent = values[0] ? Math.round((trendValue / values[0]) * 100) : 0
  const trendMeta = getTrendMeta(trendValue, trendPercent)
  const listRange = Math.max(1, summary.max - summary.min)
  const targetTotal = Math.round(summary.total * 1.18)
  const targetProgress = targetTotal > 0 ? Math.min(100, Math.round((summary.total / targetTotal) * 100)) : 0

  if (isLoading) {
    return <ChartsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Grafik
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Grafik</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Satis ritmini donem bazinda izle. Demo veri ile gorsel akis sunar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Donem: {rangeMeta.caption}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {numberFormatter.format(summary.total)}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Satis grafigi
                </p>
                <p className="text-sm text-slate-400">{rangeMeta.caption}</p>
              </div>
              <div className="inline-flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                {rangeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRange(option.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      range === option.key
                        ? "bg-accent-500/20 text-accent-50 shadow-glow"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                    aria-pressed={range === option.key}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="h-48 w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Satis grafigi"
              >
                <defs>
                  <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ac7ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2b9fff" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="sales-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3ac7ff" />
                    <stop offset="100%" stopColor="#2b9fff" />
                  </linearGradient>
                </defs>
                {chart.gridLines.map((y, index) => (
                  <line
                    key={`grid-${index}`}
                    x1={chart.padX}
                    x2={chart.padX + chart.innerWidth}
                    y1={y}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                ))}
                {chart.areaPath && <path d={chart.areaPath} fill="url(#sales-area)" stroke="none" />}
                {chart.linePath && (
                  <path d={chart.linePath} fill="none" stroke="url(#sales-line)" strokeWidth="2.2" />
                )}
                {chart.points.map((point, index) => (
                  <circle
                    key={`point-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={index === chart.points.length - 1 ? 4.2 : 3}
                    fill={index === chart.points.length - 1 ? "#e2f5ff" : "#3ac7ff"}
                    opacity={index === chart.points.length - 1 ? 1 : 0.7}
                  />
                ))}
              </svg>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Toplam</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {numberFormatter.format(summary.total)}
                </p>
                <p className="text-xs text-slate-400">Secili donem</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ortalama</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {numberFormatter.format(summary.average)}
                </p>
                <p className="text-xs text-slate-400">Donem basina</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Zirve</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {numberFormatter.format(summary.max)}
                </p>
                <p className="text-xs text-slate-400">En yuksek nokta</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trend</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trendMeta.badge}`}>
                    {trendMeta.label}
                  </span>
                  <span className={`text-sm font-semibold ${trendMeta.className}`}>
                    {trendMeta.sign}
                    {Math.abs(trendPercent)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">Ilk ve son karsilasma</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Donem listesi
                </p>
                <p className="text-xs text-slate-400">{rangeMeta.caption}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {data.length} kayit
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {data.map((item, index) => {
                const prev = data[index - 1]?.value
                const diff = prev ? item.value - prev : 0
                const diffPercent = prev ? Math.round((diff / prev) * 100) : 0
                const isUp = diff >= 0
                const barPercent = ((item.value - summary.min) / listRange) * 100
                const barWidth = Math.max(8, Math.round(barPercent))
                return (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                        <p className="text-xs text-slate-400">Satis</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-100">
                          {numberFormatter.format(item.value)}
                        </p>
                        <p className={`text-xs font-semibold ${isUp ? "text-emerald-200" : "text-rose-200"}`}>
                          {prev ? `${isUp ? "+" : ""}${diffPercent}%` : "n/a"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10">
                      <div
                        className={`h-1.5 rounded-full ${isUp ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Hedef takibi
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                {targetProgress}% tamam
              </span>
            </div>
            <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Hedef</span>
                <span className="font-semibold text-slate-100">
                  {numberFormatter.format(targetTotal)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-accent-400 via-sky-300 to-accent-500"
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Gerceklesen</span>
                <span>{numberFormatter.format(summary.total)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              DB baglantisi kurulmadan ornek veri uzerinden gosterilir.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
