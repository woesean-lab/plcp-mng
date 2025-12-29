import { useMemo, useState } from "react"

const rangeOptions = [
  { key: "daily", label: "Gunluk", caption: "Son 7 gun" },
  { key: "weekly", label: "Haftalik", caption: "Son 8 hafta" },
  { key: "monthly", label: "Aylik", caption: "Son 12 ay" },
  { key: "yearly", label: "Yillik", caption: "Son 5 yil" },
]

const baseSeries = {
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

const createSeriesState = () =>
  Object.fromEntries(
    Object.entries(baseSeries).map(([key, items]) => [
      key,
      items.map((item) => ({ ...item })),
    ]),
  )

const formatRangeLabel = (dateString, rangeKey) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  if (rangeKey === "daily") return `${month}/${day}`
  if (rangeKey === "monthly") return `${year}-${month}`
  if (rangeKey === "yearly") return String(year)
  const start = new Date(year, 0, 1)
  const diff = Math.floor((date - start) / 86400000) + start.getDay()
  const week = Math.ceil((diff + 1) / 7)
  return `H${week}`
}


const getTrendTone = (value) => {
  if (value >= 0) {
    return {
      label: "Yukselis",
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
        <SkeletonBlock className="mt-4 h-9 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-4 h-32 w-full rounded-2xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="mt-4 h-20 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-40 rounded-full" />
            <SkeletonBlock className="mt-4 h-52 w-full rounded-2xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="mt-4 h-20 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChartsTab({ isLoading, panelClass }) {
  const [range, setRange] = useState("weekly")
  const [seriesByRange, setSeriesByRange] = useState(() => createSeriesState())
  const [entryDate, setEntryDate] = useState("")
  const [entryValue, setEntryValue] = useState("")
  const [entryError, setEntryError] = useState("")
  const rangeMeta = rangeOptions.find((option) => option.key === range) || rangeOptions[0]
  const data = seriesByRange[rangeMeta.key] || []
  const numberFormatter = useMemo(() => new Intl.NumberFormat("tr-TR"), [])
  const values = useMemo(() => data.map((item) => item.value), [data])
  const summary = useMemo(() => {
    if (values.length === 0) return { total: 0, average: 0, max: 0, min: 0 }
    const total = values.reduce((acc, value) => acc + value, 0)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const average = Math.round(total / values.length)
    return { total, average, max, min }
  }, [values])
  const trendValue = values.length > 1 ? values[values.length - 1] - values[0] : 0
  const trendPercent = values[0] ? Math.round((trendValue / values[0]) * 100) : 0
  const trendTone = getTrendTone(trendValue)
  const topEntry = useMemo(() => {
    if (data.length === 0) return null
    return data.reduce((acc, item) => (item.value > acc.value ? item : acc), data[0])
  }, [data])
  const lastEntry = useMemo(() => (data.length ? data[data.length - 1] : null), [data])
  const recentEntries = useMemo(() => [...data].slice(-5).reverse(), [data])
  const recentMax = useMemo(() => {
    if (recentEntries.length === 0) return 0
    return recentEntries.reduce((acc, item) => Math.max(acc, item.value), 0)
  }, [recentEntries])
  const recentTotal = useMemo(
    () => recentEntries.reduce((acc, item) => acc + item.value, 0),
    [recentEntries],
  )
  const maxEntry = topEntry
  const minEntry = useMemo(() => {
    if (data.length === 0) return null
    return data.reduce((acc, item) => (item.value < acc.value ? item : acc), data[0])
  }, [data])

  const handleEntrySubmit = (event) => {
    event.preventDefault()
    const dateValue = String(entryDate || "").trim()
    const amountValue = Number(entryValue)
    if (!dateValue) {
      setEntryError("Tarih gerekli.")
      return
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setEntryError("Satis miktari gecerli olmali.")
      return
    }
    setEntryError("")
    const label = formatRangeLabel(dateValue, rangeMeta.key) || dateValue
    setSeriesByRange((prev) => {
      const list = Array.isArray(prev[rangeMeta.key]) ? [...prev[rangeMeta.key]] : []
      list.push({ label, value: amountValue, date: dateValue, custom: true })
      return { ...prev, [rangeMeta.key]: list }
    })
    setEntryValue("")
  }

  if (isLoading) {
    return <ChartsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-10 h-48 w-48 rounded-full bg-accent-400/20 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-sky-300/10 blur-3xl" />
        </div>
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Grafik
            </span>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
                Satis panosu
              </h1>
              <p className="max-w-2xl text-sm text-slate-200/80">
                Gunluk, haftalik, aylik ve yillik satisi tek bir line chart ile izle.
              </p>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">En cok satis</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-100">
                  {topEntry ? topEntry.date || topEntry.label : "-"}
                </p>
                <p className="text-xs text-slate-400">Satis zirvesi</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-slate-100">
                  {topEntry ? numberFormatter.format(topEntry.value) : "-"}
                </p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {rangeMeta.caption}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Toplam: {numberFormatter.format(summary.total)}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Satis girisi
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {rangeMeta.caption}
              </span>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleEntrySubmit}>
              <label className="space-y-1 text-xs font-semibold text-slate-200">
                Tarih
                <input
                  type="date"
                  value={entryDate}
                  onChange={(event) => {
                    setEntryDate(event.target.value)
                    if (entryError) setEntryError("")
                  }}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-200">
                Satis miktari
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={entryValue}
                  onChange={(event) => {
                    setEntryValue(event.target.value)
                    if (entryError) setEntryError("")
                  }}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </label>
              {entryError && (
                <div className="rounded-lg border border-rose-200/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {entryError}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Kayit secili doneme eklenir.</p>
                <button
                  type="submit"
                  className="rounded-full border border-accent-400/70 bg-accent-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300"
                >
                  Ekle
                </button>
              </div>
            </form>
          </section>

          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Son girisler
                </p>
                <p className="text-xs text-slate-400">Son 5 kayit hareketi</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {recentEntries.length} kayit
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  Toplam: {numberFormatter.format(recentTotal)}
                </span>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-ink-950/40">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                <span>Tarih / Etiket</span>
                <span>Tutar</span>
              </div>
              {recentEntries.length === 0 ? (
                <div className="px-4 py-6 text-xs text-slate-400">Henuz giris yok.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {recentEntries.map((item, index) => {
                    const share = recentTotal
                      ? Math.round((item.value / recentTotal) * 100)
                      : 0
                    const barWidth = recentMax
                      ? Math.max(6, Math.round((item.value / recentMax) * 100))
                      : 0
                    const isPeak = item.value === recentMax
                    return (
                      <div
                        key={`${item.label}-${index}`}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${
                          isPeak ? "bg-white/5" : "bg-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent-400/80 shadow-glow" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100">
                              {item.date || item.label}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                {item.label}
                              </span>
                              <span>Giris</span>
                              {item.custom && (
                                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                  Elle
                                </span>
                              )}
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-white/10">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-accent-400/80 to-accent-200/60"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-100">
                            {numberFormatter.format(item.value)}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                            Pay {share}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${panelClass} relative overflow-hidden bg-gradient-to-br from-ink-900/90 via-ink-900/60 to-ink-950/80`}>
            <div className="absolute -right-24 -top-16 h-56 w-56 rounded-full bg-accent-400/15 blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-sky-300/10 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    Satis grafigi
                  </p>
                  <p className="text-xs text-slate-400">{rangeMeta.caption}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trendTone.badge}`}>
                    {trendTone.label} {trendTone.sign}{Math.abs(trendPercent)}%
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    Toplam: {numberFormatter.format(summary.total)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    Ortalama: {numberFormatter.format(summary.average)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Son deger</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">
                    {lastEntry ? numberFormatter.format(lastEntry.value) : "-"}
                  </p>
                  <p className="text-xs text-slate-400">{lastEntry ? lastEntry.label : "Kayit yok"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Zirve</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {maxEntry ? numberFormatter.format(maxEntry.value) : "-"}
                  </p>
                  <p className="text-xs text-slate-400">{maxEntry ? maxEntry.label : "-"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Dip</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">
                    {minEntry ? numberFormatter.format(minEntry.value) : "-"}
                  </p>
                  <p className="text-xs text-slate-400">{minEntry ? minEntry.label : "-"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Ozet
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                Toplam satis
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/80 via-ink-900/60 to-ink-800/60 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Toplam satis</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">
                  {numberFormatter.format(summary.total)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Ortalama: {numberFormatter.format(summary.average)}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 font-semibold ${trendTone.badge}`}>
                    {trendTone.label} {trendTone.sign}{Math.abs(trendPercent)}%
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ortalama</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {numberFormatter.format(summary.average)}
                </p>
                <p className="text-xs text-slate-400">Donem basina</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Min / Max</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-slate-100">
                    {numberFormatter.format(summary.min)}
                  </span>
                  <span className="text-sm text-slate-500">/</span>
                  <span className="text-lg font-semibold text-slate-100">
                    {numberFormatter.format(summary.max)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Aralik</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Demo veri kullaniyoruz, DB baglantisi acilmadi.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}


