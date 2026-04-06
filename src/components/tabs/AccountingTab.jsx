import { useState } from "react"

const todayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDate = (value) => {
  if (!value) return ""
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

const formatPointLabel = (value) => {
  if (!value) return ""
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}.${month}`
}

const currency = (value) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toLocaleString("tr-TR")
}

const preciseCurrency = (value) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0,00"
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const seedRecords = []
const USD_TO_TRY_RATE = 44.5984

export default function AccountingTab({ panelClass, isLoading }) {
  const [records, setRecords] = useState(seedRecords)
  const [form, setForm] = useState({
    date: todayKey(),
    available: "",
    pending: "",
    note: "",
  })
  const [formError, setFormError] = useState("")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-52 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-7 w-28 rounded-full bg-white/10" />
            <div className="h-7 w-24 rounded-full bg-white/10" />
          </div>
        </div>
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-32 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  const sorted = [...records].sort((a, b) => String(b.date).localeCompare(a.date))
  const latest = sorted[0]
  const totalBalance = (latest?.available ?? 0) + (latest?.pending ?? 0)
  const totalBalanceTry = totalBalance * USD_TO_TRY_RATE

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Bakiye</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Pazaryeri mevcut ve bekleyen bakiyelerini gun sonu girisiyle takip et.
            </p>
          </div>
          <div className="w-full md:w-auto md:min-w-[240px]">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-ink-900/80 to-ink-900/90 px-3.5 py-3.5 shadow-inner sm:px-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.22),transparent)]" />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Toplam bakiye</p>
                <p className="mt-2 text-2xl font-semibold text-white">$ {currency(totalBalance)}</p>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">TL cevrimi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100 sm:text-base">TL {preciseCurrency(totalBalanceTry)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {(() => {
        const sorted = [...records].sort((a, b) => String(b.date).localeCompare(a.date))
        const latest = sorted[0]
        const previous = sorted[1]
        const availableDiff = latest && previous ? latest.available - previous.available : 0
        const pendingDiff = latest && previous ? latest.pending - previous.pending : 0
        const recent = sorted.slice(0, 10)
        const chartPoints = sorted.slice().reverse().slice(-10)
        const chartData = chartPoints.map((item, index) => {
          const prev = index > 0 ? chartPoints[index - 1] : null
          const total = item.available + item.pending
          const prevTotal = prev ? prev.available + prev.pending : 0
          const diff = prev ? total - prevTotal : 0
          return {
            date: item.date,
            diff,
            label: formatPointLabel(item.date),
          }
        })
        const maxAbsDiff = Math.max(...chartData.map((item) => Math.abs(item.diff)), 0)
        const chartBars = chartData.map((item) => {
          const ratio = maxAbsDiff > 0 ? Math.abs(item.diff) / maxAbsDiff : 0
          const heightPercent = ratio === 0 ? 4 : Math.max(8, ratio * 85)
          return {
            ...item,
            heightPercent,
          }
        })

        const handleAdd = () => {
          const date = form.date.trim()
          const available = Number(form.available)
          const pending = Number(form.pending)
          if (!date || !Number.isFinite(available) || !Number.isFinite(pending)) {
            setFormError("Tarih, mevcut ve bekleyen bakiyeler zorunlu.")
            return
          }
          const next = {
            id: `acc-${Date.now()}`,
            date,
            available,
            pending,
            note: form.note.trim(),
          }
          setRecords((prev) => [next, ...prev])
          setForm((prev) => ({
            ...prev,
            available: "",
            pending: "",
            note: "",
          }))
          setFormError("")
        }

        return (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.2),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Mevcut bakiye
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">$ {currency(latest?.available ?? 0)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {latest ? formatDate(latest.date) : "Kayit yok"} ·{" "}
                    {availableDiff >= 0 ? "+" : "-"}$ {currency(Math.abs(availableDiff))}
                  </p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(244,63,94,0.2),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Bekleyen bakiye
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">$ {currency(latest?.pending ?? 0)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {latest ? "Guncel" : "Kayit yok"} · {pendingDiff >= 0 ? "+" : "-"}$ {currency(Math.abs(pendingDiff))}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Gun farki grafigi
                      </p>
                      <p className="text-sm text-slate-400">Son 10 gunluk toplam bakiye degisimi.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      En yuksek: $ {currency(maxAbsDiff)}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 text-slate-100 shadow-inner">
                    {chartBars.length > 0 ? (
                      <div className="-mx-2 overflow-x-auto px-2 pb-2">
                        <div className="flex min-w-[520px] items-end gap-3">
                          {chartBars.map((bar, idx) => (
                            <div
                              key={`diff-bar-${idx}`}
                              className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-2"
                            >
                              <div className="flex h-6 items-end justify-center px-1">
                                <span
                                  className={`whitespace-nowrap text-[10px] font-semibold ${
                                    bar.diff >= 0 ? "text-emerald-200" : "text-rose-200"
                                  }`}
                                >
                                  {bar.diff >= 0 ? "+" : "-"}$ {currency(Math.abs(bar.diff))}
                                </span>
                              </div>
                              <div className="flex h-28 w-full items-end justify-center">
                                <div
                                  className={`w-full rounded-2xl ${
                                    bar.diff >= 0 ? "bg-emerald-400" : "bg-rose-400"
                                  }`}
                                  style={{ height: `${bar.heightPercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-slate-300">{bar.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-ink-900/80 px-4 py-6 text-center text-sm text-slate-400">
                        Henuz kayit yok. Ilk gun sonu kaydini ekleyin.
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Gun sonu kayitlari
                      </p>
                      <p className="text-sm text-slate-400">Mevcut ve bekleyen bakiyeler.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {recent.length} kayit
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70">
                    <div className="grid grid-cols-[110px_1fr_120px] gap-3 border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      <span>Tarih</span>
                      <span>Toplam bakiye</span>
                      <span className="text-right">Gun farki</span>
                    </div>
                    {recent.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-400">Kayit bulunamadi.</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {recent.map((item, index) => {
                          const prev = recent[index + 1]
                          const itemTotal = item.available + item.pending
                          const itemPrevTotal = prev ? prev.available + prev.pending : null
                          const itemTotalDiff = itemPrevTotal !== null ? itemTotal - itemPrevTotal : null
                          return (
                            <div key={item.id} className="grid grid-cols-[110px_1fr_120px] gap-3 px-4 py-3">
                              <div className="text-sm font-semibold text-slate-100">{formatDate(item.date)}</div>
                              <div>
                                <div className="text-sm text-slate-200">
                                  <span className="font-semibold">$ {currency(itemTotal)}</span>
                                </div>
                                {item.note ? (
                                  <div className="mt-1 text-[11px] text-slate-500">{item.note}</div>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <div
                                  className={`text-sm font-semibold ${
                                    itemTotalDiff === null
                                      ? "text-slate-400"
                                      : itemTotalDiff >= 0
                                        ? "text-emerald-200"
                                        : "text-rose-200"
                                  }`}
                                >
                                  {itemTotalDiff === null
                                    ? "-"
                                    : `${itemTotalDiff >= 0 ? "+" : "-"}$ ${currency(Math.abs(itemTotalDiff))}`}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Gun sonu girisi
                      </p>
                      <p className="text-sm text-slate-400">Mevcut ve bekleyen bakiyeleri gir.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {records.length} kayit
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.available}
                        onChange={(e) => setForm((prev) => ({ ...prev, available: e.target.value }))}
                        placeholder="Mevcut bakiye"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition hover:border-accent-400/40 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.pending}
                        onChange={(e) => setForm((prev) => ({ ...prev, pending: e.target.value }))}
                        placeholder="Bekleyen bakiye"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition hover:border-accent-400/40 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                      />
                    </div>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 transition hover:border-accent-400/40 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                    />
                    <input
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Not (opsiyonel)"
                      className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition hover:border-accent-400/40 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                    />
                    {formError ? (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                        {formError}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="w-full rounded-lg border border-emerald-400/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
