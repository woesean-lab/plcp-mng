import { useState } from "react"
import { parseFlexibleNumberInput } from "../../utils/numberInput"

const USD_TO_TRY_RATE = 44.5984
const inputClassName =
  "w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 transition hover:border-accent-400/40 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"

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

const parseDateKey = (value) => {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return new Date(year, month - 1, day)
}

const formatDateKey = (dateValue) => {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, "0")
  const day = String(dateValue.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatShortDate = (dateValue) => {
  const day = String(dateValue.getDate()).padStart(2, "0")
  const month = String(dateValue.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}`
}

const getWeekStartKey = (value) => {
  const dateValue = parseDateKey(value)
  if (!dateValue) return value
  const day = dateValue.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = new Date(dateValue)
  start.setDate(dateValue.getDate() + offset)
  return formatDateKey(start)
}

const getBalanceRangeKey = (value, range) => {
  if (!value) return ""
  if (range === "yearly") {
    const [year] = value.split("-")
    return year || value
  }
  if (range === "monthly") {
    const [year, month] = value.split("-")
    if (!year || !month) return value
    return `${year}-${month}`
  }
  if (range === "weekly") return getWeekStartKey(value)
  return value
}

const formatBalancePointLabel = (value, range) => {
  if (!value) return ""
  if (range === "yearly") return value
  if (range === "monthly") {
    const [year, month] = value.split("-")
    if (!year || !month) return value
    return `${month}/${year.slice(-2)}`
  }
  if (range === "weekly") {
    const start = parseDateKey(value)
    if (!start) return value
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${formatShortDate(start)}-${formatShortDate(end)}`
  }
  return formatPointLabel(value)
}

const currency = (value) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0"
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

const preciseCurrency = (value) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "0,00"
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function AccountingSkeleton({ panelClass, canViewAnalytics }) {
  if (!canViewAnalytics) {
    return (
      <div className="space-y-6">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-32 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
        <div className={`${panelClass} bg-ink-800/60`}>
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-28 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-52 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
        <div className="mt-4 h-20 w-full max-w-[280px] rounded-2xl bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`accounting-metric-${index}`}
            className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card"
          >
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-3 h-7 w-28 rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-32 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="mt-4 h-36 w-full rounded-2xl bg-white/5" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="h-4 w-20 rounded-full bg-white/10" />
            <div className="mt-4 h-28 w-full rounded-2xl bg-white/5" />
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 h-40 w-full rounded-2xl bg-white/5" />
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <div className="h-4 w-28 rounded-full bg-white/10" />
            <div className="mt-4 h-32 w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountingTab({
  panelClass,
  isLoading,
  accountingRecords = [],
  saveAccountingRecord,
  canCreate = false,
  canViewAnalytics = true,
}) {
  const [balanceRange, setBalanceRange] = useState("daily")
  const [form, setForm] = useState({
    date: todayKey(),
    available: "",
    pending: "",
    withdrawal: "",
    note: "",
  })
  const [formError, setFormError] = useState("")
  const responsivePanelClass = `${panelClass} px-4 py-4 sm:px-6 sm:py-6`

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError("")
  }

  if (isLoading) {
    return <AccountingSkeleton panelClass={panelClass} canViewAnalytics={canViewAnalytics} />
  }

  const records = Array.isArray(accountingRecords) ? accountingRecords : []
  const sorted = [...records].sort((a, b) => String(b?.date ?? "").localeCompare(String(a?.date ?? "")))
  const balanceRecords = sorted.map((item) => {
    const available = Number(item?.available ?? 0)
    const pending = Number(item?.pending ?? 0)
    const withdrawal = Number(item?.withdrawal ?? 0)
    return {
      ...item,
      available: Number.isFinite(available) ? available : 0,
      pending: Number.isFinite(pending) ? pending : 0,
      withdrawal: Number.isFinite(withdrawal) ? withdrawal : 0,
      total:
        (Number.isFinite(available) ? available : 0) + (Number.isFinite(pending) ? pending : 0),
    }
  })

  const latest = balanceRecords[0] ?? null
  const previous = balanceRecords[1] ?? null
  const totalBalance = latest?.total ?? 0
  const totalBalanceTry = totalBalance * USD_TO_TRY_RATE
  const availableDiff = latest && previous ? latest.available - previous.available : 0
  const pendingDiff = latest && previous ? latest.pending - previous.pending : 0
  const balanceRangeMeta = {
    daily: { label: "Gunluk", helper: "Son 10 gunluk net kazanc" },
    weekly: { label: "Haftalik", helper: "Son 12 haftalik net kazanc" },
    monthly: { label: "Aylik", helper: "Son 12 aylik net kazanc" },
    yearly: { label: "Yillik", helper: "Son 6 yillik net kazanc" },
  }
  const activeBalanceRange = balanceRangeMeta[balanceRange] || balanceRangeMeta.daily

  const sumWithdrawalsBetween = (startExclusive, endInclusive) =>
    balanceRecords.reduce((sum, item) => {
      if (item.date > startExclusive && item.date <= endInclusive) {
        return sum + item.withdrawal
      }
      return sum
    }, 0)

  const bestRecord = balanceRecords.reduce(
    (best, item) => (best && best.total >= item.total ? best : item),
    null,
  )
  const worstRecord = balanceRecords.reduce(
    (worst, item) => (worst && worst.total <= item.total ? worst : item),
    null,
  )
  const averageTotal =
    balanceRecords.length > 0
      ? balanceRecords.reduce((sum, item) => sum + item.total, 0) / balanceRecords.length
      : 0
  const latestTotalDiff = previous ? latest.total - previous.total + latest.withdrawal : null
  const findHistoricalDiff = (days) => {
    if (!latest?.date) return null
    const latestDateValue = parseDateKey(latest.date)
    if (!latestDateValue) return null
    const targetDate = new Date(latestDateValue)
    targetDate.setDate(targetDate.getDate() - days)
    const comparison = balanceRecords.find((item) => {
      const itemDate = parseDateKey(item.date)
      return itemDate && itemDate <= targetDate
    })
    return comparison
      ? latest.total - comparison.total + sumWithdrawalsBetween(comparison.date, latest.date)
      : null
  }
  const weeklyDiff = findHistoricalDiff(7)
  const monthlyDiff = findHistoricalDiff(30)
  const recentList = balanceRecords.slice(0, 20)
  const rangeLimit =
    balanceRange === "yearly" ? 6 : balanceRange === "monthly" ? 12 : balanceRange === "weekly" ? 12 : 10
  const groupedChartEntries = []
  const groupedChartEntryMap = new Map()

  sorted.forEach((item) => {
    const available = Number(item?.available ?? 0)
    const pending = Number(item?.pending ?? 0)
    const withdrawal = Number(item?.withdrawal ?? 0)
    const key = getBalanceRangeKey(item?.date ?? "", balanceRange)
    if (groupedChartEntryMap.has(key)) {
      groupedChartEntryMap.get(key).withdrawalTotal += Number.isFinite(withdrawal) ? withdrawal : 0
      return
    }
    const entry = {
      key,
      total: (Number.isFinite(available) ? available : 0) + (Number.isFinite(pending) ? pending : 0),
      withdrawalTotal: Number.isFinite(withdrawal) ? withdrawal : 0,
    }
    groupedChartEntryMap.set(key, entry)
    groupedChartEntries.push(entry)
  })

  const chartPoints = groupedChartEntries.reverse().slice(-rangeLimit)
  const chartData = chartPoints.map((item, index) => {
    const prev = index > 0 ? chartPoints[index - 1] : null
    const diff = prev ? item.total - prev.total + item.withdrawalTotal : 0
    return {
      date: item.key,
      diff,
      label: formatBalancePointLabel(item.key, balanceRange),
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

  const handleAdd = async () => {
    const date = form.date.trim()
    const available = parseFlexibleNumberInput(form.available)
    const pending = parseFlexibleNumberInput(form.pending)
    const withdrawal = form.withdrawal.trim() === "" ? 0 : parseFlexibleNumberInput(form.withdrawal)

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      setFormError("Tarih secin.")
      return
    }
    if (!Number.isFinite(available) || available < 0) {
      setFormError("Mevcut bakiye girin.")
      return
    }
    if (!Number.isFinite(pending) || pending < 0) {
      setFormError("Bekleyen bakiye girin.")
      return
    }
    if (!Number.isFinite(withdrawal) || withdrawal < 0) {
      setFormError("Cekim tutari sayi olmali.")
      return
    }
    if (typeof saveAccountingRecord !== "function") {
      setFormError("Bakiye kaydi hazir degil.")
      return
    }

    try {
      await saveAccountingRecord({
        date,
        available,
        pending,
        withdrawal,
        note: form.note.trim(),
      })
      setForm((prev) => ({
        ...prev,
        available: "",
        pending: "",
        withdrawal: "",
        note: "",
      }))
      setFormError("")
    } catch (error) {
      setFormError("Kayit eklenemedi.")
    }
  }

  const recordsCard = (
    <div className={`${responsivePanelClass} bg-ink-900/60`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
            Gun sonu kayitlari
          </p>
          <p className="text-sm text-slate-400">Son eklenen toplam bakiyeler.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
          {recentList.length} kayit
        </span>
      </div>

      <div className="no-scrollbar mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1 sm:max-h-[420px]">
        {recentList.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-6 text-center text-sm text-slate-400 shadow-inner">
            Kayit bulunamadi.
          </div>
        ) : (
          recentList.map((item, index) => {
            const prev = balanceRecords[index + 1]
            const itemDiff = prev ? item.total - prev.total + item.withdrawal : null
            return (
              <div
                key={item.id || item.date}
                className="min-h-[74px] rounded-xl border border-white/10 bg-ink-900/70 px-3 py-3 shadow-inner sm:px-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {formatDate(item.date)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">$ {currency(item.total)}</p>
                    {item.withdrawal > 0 ? (
                      <p className="mt-1 text-[11px] text-amber-200">
                        Cekim: $ {currency(item.withdrawal)}
                      </p>
                    ) : null}
                    {item.note ? (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">{item.note}</p>
                    ) : null}
                  </div>
                  <div
                    className={`shrink-0 self-start text-left sm:self-auto sm:text-right ${
                      itemDiff === null ? "text-slate-400" : itemDiff >= 0 ? "text-emerald-200" : "text-rose-200"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {itemDiff === null ? "-" : `${itemDiff >= 0 ? "+" : "-"}$ ${currency(Math.abs(itemDiff))}`}
                    </p>
                    {itemDiff === null ? null : (
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        TL {itemDiff >= 0 ? "+" : "-"}
                        {preciseCurrency(Math.abs(itemDiff) * USD_TO_TRY_RATE)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  const entryCard = canCreate ? (
    <div className={`${responsivePanelClass} bg-ink-800/60`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
            Gun sonu girisi
          </p>
          <p className="text-sm text-slate-400">Mevcut ve bekleyen bakiyeleri gir.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
          {records.length} kayit
        </span>
      </div>

      <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-3 shadow-inner sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="decimal"
            value={form.available}
            onChange={(event) => updateForm("available", event.target.value)}
            placeholder="Mevcut bakiye"
            className={`${inputClassName} placeholder:text-slate-500`}
          />
          <input
            type="text"
            inputMode="decimal"
            value={form.pending}
            onChange={(event) => updateForm("pending", event.target.value)}
            placeholder="Bekleyen bakiye"
            className={`${inputClassName} placeholder:text-slate-500`}
          />
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={form.withdrawal}
          onChange={(event) => updateForm("withdrawal", event.target.value)}
          placeholder="Cekim (opsiyonel)"
          className={`${inputClassName} placeholder:text-slate-500`}
        />
        <input
          type="date"
          value={form.date}
          onChange={(event) => updateForm("date", event.target.value)}
          className={inputClassName}
        />
        <input
          value={form.note}
          onChange={(event) => updateForm("note", event.target.value)}
          placeholder="Not (opsiyonel)"
          className={`${inputClassName} placeholder:text-slate-500`}
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
  ) : null

  const sidebarCards = (
    <div className="space-y-6">
      {recordsCard}
      {entryCard}
    </div>
  )

  if (!canViewAnalytics) {
    return sidebarCards
  }

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
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
                  Toplam bakiye
                </p>
                <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">$ {currency(totalBalance)}</p>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    TL cevrimi
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-100 sm:text-base">
                    TL {preciseCurrency(totalBalanceTry)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.2),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Mevcut bakiye
            </p>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">$ {currency(latest?.available ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {latest ? formatDate(latest.date) : "Kayit yok"} · {availableDiff >= 0 ? "+" : "-"}$ {" "}
              {currency(Math.abs(availableDiff))}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(244,63,94,0.2),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Bekleyen bakiye
            </p>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">$ {currency(latest?.pending ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {latest ? "Guncel" : "Kayit yok"} · {pendingDiff >= 0 ? "+" : "-"}$ {" "}
              {currency(Math.abs(pendingDiff))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className={`${responsivePanelClass} bg-ink-900/60`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Kazanc grafigi
                </p>
                <p className="text-sm text-slate-400">{activeBalanceRange.helper}.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex w-full flex-wrap items-center justify-between gap-1 rounded-full border border-white/10 bg-ink-900/60 p-1 sm:w-auto sm:justify-start">
                  {Object.entries(balanceRangeMeta).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBalanceRange(key)}
                      className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition sm:flex-none ${
                        balanceRange === key
                          ? "bg-accent-400 text-ink-900 shadow-glow"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
                <span className="inline-flex justify-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 sm:justify-start">
                  En yuksek: $ {currency(maxAbsDiff)}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-ink-900/70 p-3 text-slate-100 shadow-inner sm:p-4">
              {chartBars.length > 0 ? (
                <div className="-mx-1 overflow-x-auto px-1 pb-2 sm:-mx-2 sm:px-2">
                  <div className="flex min-w-[320px] items-end gap-2 sm:min-w-[520px] sm:gap-3">
                    {chartBars.map((bar, index) => (
                      <div
                        key={`diff-bar-${index}`}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div className="relative flex h-36 w-full items-end justify-center">
                          <span
                            className={`absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold sm:block ${
                              bar.diff >= 0 ? "text-emerald-200" : "text-rose-200"
                            }`}
                            style={{ bottom: `calc(${bar.heightPercent}% + 0.35rem)` }}
                          >
                            {bar.diff >= 0 ? "+" : "-"}$ {currency(Math.abs(bar.diff))}
                          </span>
                          <div
                            className={`w-full rounded-2xl ${
                              bar.diff >= 0 ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                            style={{ height: `${bar.heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-300 sm:text-[11px]">{bar.label}</span>
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

          <div className={`${responsivePanelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Ozet
                </p>
                <p className="text-xs text-slate-400">Kisa bakiye ozeti.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                Kayit: {balanceRecords.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En yuksek bakiye
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {bestRecord ? formatDate(bestRecord.date) : "-"}
                </p>
                <p className="text-xs text-accent-200">$ {currency(bestRecord?.total ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  En dusuk bakiye
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {worstRecord ? formatDate(worstRecord.date) : "-"}
                </p>
                <p className="text-xs text-accent-200">$ {currency(worstRecord?.total ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Ortalama bakiye
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  $ {currency(Math.round(averageTotal))}
                </p>
                <p className="text-xs text-slate-400">Kayit basina</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Gunluk kazanc
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    latestTotalDiff === null
                      ? "text-slate-200"
                      : latestTotalDiff >= 0
                        ? "text-emerald-200"
                        : "text-rose-200"
                  }`}
                >
                  {latestTotalDiff === null
                    ? "-"
                    : `${latestTotalDiff >= 0 ? "+" : "-"}$ ${currency(Math.abs(latestTotalDiff))}`}
                </p>
                <p className="text-xs text-slate-400">Bir onceki kayda gore net kazanc</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Haftalik kazanc
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    weeklyDiff === null ? "text-slate-200" : weeklyDiff >= 0 ? "text-emerald-200" : "text-rose-200"
                  }`}
                >
                  {weeklyDiff === null ? "-" : `${weeklyDiff >= 0 ? "+" : "-"}$ ${currency(Math.abs(weeklyDiff))}`}
                </p>
                <p className="text-xs text-slate-400">Son 7 gunluk net kazanc</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Aylik kazanc
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    monthlyDiff === null ? "text-slate-200" : monthlyDiff >= 0 ? "text-emerald-200" : "text-rose-200"
                  }`}
                >
                  {monthlyDiff === null
                    ? "-"
                    : `${monthlyDiff >= 0 ? "+" : "-"}$ ${currency(Math.abs(monthlyDiff))}`}
                </p>
                <p className="text-xs text-slate-400">Son 30 gunluk net kazanc</p>
              </div>
            </div>
          </div>
        </div>

        {sidebarCards}
      </div>
    </div>
  )
}
