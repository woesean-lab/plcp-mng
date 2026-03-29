import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import {
  buildSocketIoWsUrl,
  parseSocketIoEventPacket,
  splitEnginePackets,
} from "../../utils/socketIoClient"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function SalesSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
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

const getLocalDateInputValue = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const normalizeRuntimeMessage = (value) => {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const readFirstNumericValue = (value, depth = 0) => {
  if (depth > 3 || value === null || value === undefined) return null
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.floor(value) : null
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".")
    if (!normalized) return null
    const direct = Number(normalized)
    if (Number.isFinite(direct)) return Math.floor(direct)
    const match = normalized.match(/-?\d+(?:\.\d+)?/)
    if (!match) return null
    const parsed = Number(match[0])
    return Number.isFinite(parsed) ? Math.floor(parsed) : null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = readFirstNumericValue(item, depth + 1)
      if (Number.isFinite(found)) return found
    }
    return null
  }
  if (typeof value === "object") {
    const priorityKeys = ["count", "result", "value", "amount", "total", "sayim"]
    for (const key of priorityKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = readFirstNumericValue(value[key], depth + 1)
        if (Number.isFinite(found)) return found
      }
    }
    for (const item of Object.values(value)) {
      const found = readFirstNumericValue(item, depth + 1)
      if (Number.isFinite(found)) return found
    }
  }
  return null
}

export default function SalesTab({
  isLoading,
  panelClass,
  canCreate,
  canViewAnalytics = true,
  salesSummary,
  salesChartData,
  salesRange,
  setSalesRange,
  salesForm,
  setSalesForm,
  automationWsUrl = "",
  saveSaleRecord,
  handleSaleAdd,
  salesRecords,
}) {
  const isSalesTabLoading = isLoading

  if (isSalesTabLoading && canViewAnalytics) {
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
  const [countRequestDate, setCountRequestDate] = useState(
    () => String(salesForm?.date ?? "").trim() || getLocalDateInputValue(),
  )
  const [isCountRunning, setIsCountRunning] = useState(false)
  const [countResultModal, setCountResultModal] = useState({
    isOpen: false,
    date: "",
    count: 0,
    collectedAt: "",
  })
  const [isCountSaving, setIsCountSaving] = useState(false)
  const countSocketRef = useRef(null)
  const countToastIdRef = useRef("")

  const closeCountSocket = useCallback(() => {
    const socket = countSocketRef.current
    countSocketRef.current = null
    if (!socket) return
    try {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
    } catch {
      // Ignore close errors.
    }
  }, [])

  const updateCountToast = useCallback((type, message) => {
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return
    const toastId = countToastIdRef.current || "sales-count-runtime"
    countToastIdRef.current = toastId
    if (type === "success") {
      toast.success(normalizedMessage, { id: toastId, position: "top-right" })
      return
    }
    if (type === "error") {
      toast.error(normalizedMessage, { id: toastId, position: "top-right" })
      return
    }
    toast.loading(normalizedMessage, { id: toastId, position: "top-right" })
  }, [])

  const handleCountModalClose = useCallback(() => {
    if (isCountSaving) return
    setCountResultModal((prev) => ({ ...prev, isOpen: false }))
  }, [isCountSaving])

  const handleCountResultSave = useCallback(async () => {
    if (isCountSaving) return
    const targetDate = String(countResultModal.date ?? "").trim()
    const targetCount = Number(countResultModal.count)
    if (!targetDate || !Number.isFinite(targetCount) || targetCount <= 0) {
      toast.error("Gecerli sayim sonucu bulunamadi.")
      return
    }
    if (typeof saveSaleRecord !== "function") {
      toast.error("Satis kaydi hazir degil.")
      return
    }
    setIsCountSaving(true)
    try {
      await saveSaleRecord(targetDate, targetCount, {
        successMessage: "Sayim kaydi eklendi",
        errorMessage: "Sayim kaydi eklenemedi.",
      })
      setCountResultModal((prev) => ({ ...prev, isOpen: false }))
      setSalesForm((prev) => ({ ...prev, date: targetDate, amount: String(targetCount) }))
    } catch {
      // saveSaleRecord already surfaces the error toast.
    } finally {
      setIsCountSaving(false)
    }
  }, [countResultModal.count, countResultModal.date, isCountSaving, saveSaleRecord, setSalesForm])

  const handleCountRun = useCallback(() => {
    if (!canCreate) {
      toast.error("Satis girme yetkiniz yok.")
      return
    }
    if (isCountRunning) {
      toast.error("Sayim islemi zaten calisiyor.")
      return
    }

    const targetDate = String(countRequestDate ?? "").trim()
    const parsedDate = new Date(`${targetDate}T00:00:00`)
    if (!targetDate || Number.isNaN(parsedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      toast.error("Tarih secin.")
      return
    }

    const wsBaseUrl = String(automationWsUrl ?? "").trim()
    if (!wsBaseUrl) {
      toast.error("Websocket adresi bulunamadi. Admin panelinden kaydedin.")
      return
    }

    const triggerUrl = buildSocketIoWsUrl(wsBaseUrl, {
      kind: "uygulama",
      backend: "eldoradosayim",
      date: targetDate,
    })
    if (!triggerUrl) {
      toast.error("Socket.IO adresi olusturulamadi.")
      return
    }

    closeCountSocket()
    setIsCountRunning(true)
    setCountResultModal((prev) => ({ ...prev, isOpen: false }))
    updateCountToast("loading", "Sayim aliniyor...")

    let socket = null
    let settled = false
    let hasConnected = false
    let hasResult = false
    let timeoutId = null

    const clearRunTimeout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const resetRunTimeout = (ms = 120000) => {
      clearRunTimeout()
      timeoutId = window.setTimeout(() => {
        complete("error", "Sayim sonucu beklenirken zaman asimi olustu.")
      }, ms)
    }

    const complete = (status, message) => {
      if (settled) return
      settled = true
      clearRunTimeout()
      closeCountSocket()
      setIsCountRunning(false)

      if (status === "success") {
        updateCountToast("success", message || "Sayim sonucu alindi.")
      } else if (status === "error") {
        updateCountToast("error", message || "Sayim islemi tamamlanamadi.")
      }
    }

    try {
      socket = new WebSocket(triggerUrl)
    } catch {
      complete("error", "Sayim icin websocket baglantisi baslatilamadi.")
      return
    }

    countSocketRef.current = socket
    resetRunTimeout(15000)

    socket.onmessage = (event) => {
      if (settled) return
      const rawPayload = typeof event.data === "string" ? event.data : ""
      if (!rawPayload) return

      const packets = splitEnginePackets(rawPayload)
      for (const packet of packets) {
        if (settled) return

        if (packet === "2") {
          try {
            socket?.send("3")
          } catch {
            // Ignore pong send errors.
          }
          continue
        }

        if (packet.startsWith("0{")) {
          try {
            socket?.send("40")
          } catch {
            complete("error", "Socket.IO baglantisi baslatilamadi.")
          }
          continue
        }

        if (packet.startsWith("40")) {
          hasConnected = true
          updateCountToast("loading", "eldoradosayim baglandi.")
          resetRunTimeout(300000)
          continue
        }

        if (packet.startsWith("41")) {
          if (hasResult) {
            complete("success", "Sayim sonucu hazir.")
          } else {
            complete("error", "Baglanti sonuc gelmeden kapandi.")
          }
          return
        }

        if (packet.startsWith("44")) {
          complete("error", "eldoradosayim tetiklenemedi.")
          return
        }

        const eventPacket = parseSocketIoEventPacket(packet)
        if (!eventPacket) continue

        const eventName = String(eventPacket.event ?? "").trim().toLowerCase()
        const firstArg = eventPacket.args[0]

        if (eventName === "script-triggered" || eventName === "script-started") {
          updateCountToast("loading", "Sayim script baslatildi.")
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "durum") {
          const lines = normalizeRuntimeMessage(firstArg?.message ?? firstArg)
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
          if (lines.length > 0) {
            updateCountToast("loading", lines[lines.length - 1])
          }
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "script-log") {
          const lines = String(firstArg?.message ?? "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
          if (lines.length > 0) {
            updateCountToast("loading", lines[lines.length - 1])
          }
          resetRunTimeout(300000)
          continue
        }

        if (eventName === "sonuc") {
          const rawResult = firstArg?.value ?? firstArg
          const countValue = readFirstNumericValue(rawResult)
          if (!Number.isFinite(countValue) || countValue <= 0) {
            complete("error", "Sayim sonucu gecerli bir sayi olarak donmedi.")
            return
          }

          hasResult = true
          setCountResultModal({
            isOpen: true,
            date: targetDate,
            count: countValue,
            collectedAt: getLocalDateInputValue(),
          })
          complete("success", `Sayim alindi: ${countValue}`)
          return
        }

        if (eventName === "script-exit") {
          const exitCode = Number(firstArg?.code ?? firstArg?.exitCode)
          if (Number.isFinite(exitCode) && exitCode !== 0 && !hasResult) {
            complete("error", `Script cikti. Kod: ${exitCode}`)
            return
          }
          resetRunTimeout(5000)
          continue
        }

        resetRunTimeout(300000)
      }
    }

    socket.onerror = () => {
      complete("error", hasConnected ? "Baglanti sirasinda hata olustu." : "Websocket baglantisi kurulamadi.")
    }

    socket.onclose = () => {
      if (settled) return
      if (hasResult) {
        complete("success", "Sayim sonucu hazir.")
        return
      }
      if (hasConnected) {
        complete("error", "Baglanti acildi ancak sonuc gelmedi.")
        return
      }
      complete("error", "Websocket baglantisi kapandi.")
    }
  }, [
    automationWsUrl,
    canCreate,
    closeCountSocket,
    countRequestDate,
    isCountRunning,
    updateCountToast,
  ])

  useEffect(() => {
    if (!countRequestDate && salesForm?.date) {
      setCountRequestDate(String(salesForm.date).trim())
    }
  }, [countRequestDate, salesForm?.date])

  useEffect(() => {
    return () => {
      closeCountSocket()
    }
  }, [closeCountSocket])

  const entryCard = canCreate ? (
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
  ) : null
  const countCard = canCreate ? (
    <div className={`${panelClass} relative overflow-hidden bg-ink-800/60`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(59,130,246,0.16),transparent)]" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
            Sayim al
          </p>
          <p className="text-sm text-slate-400">Websocket uzerinden guncel sayimi cek.</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
          backend: eldoradosayim
        </span>
      </div>

      <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200" htmlFor="sales-count-date">
            Tarih
          </label>
          <input
            id="sales-count-date"
            type="date"
            value={countRequestDate}
            onChange={(event) => setCountRequestDate(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
        </div>

        <button
          type="button"
          onClick={handleCountRun}
          disabled={isCountRunning}
          className="flex w-full items-center justify-center rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCountRunning ? "Sayim aliniyor..." : "Sayim al"}
        </button>
      </div>
    </div>
  ) : null
  const sidebarCards = (
    <div className="space-y-6">
      {entryCard}
      {countCard}
    </div>
  )

  if (!canViewAnalytics) {
    return (
      <>
        <div className="space-y-6">{sidebarCards}</div>
        {countResultModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/95 p-5 shadow-card backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Sayim sonucu
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Sonuc hazir</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCountModalClose}
                  disabled={isCountSaving}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tarih</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDate(countResultModal.date)}</p>
                </div>
                <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Sayim</p>
                  <p className="mt-2 text-lg font-semibold text-sky-50">{countResultModal.count}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Alinma tarihi: {formatDate(countResultModal.collectedAt)}
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCountModalClose}
                  disabled={isCountSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={handleCountResultSave}
                  disabled={isCountSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCountSaving ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Satış
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Satış Grafiği
            </h1>
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

        {sidebarCards}
      </div>
      {countResultModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/95 p-5 shadow-card backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Sayim sonucu
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">Sonuc hazir</h2>
              </div>
              <button
                type="button"
                onClick={handleCountModalClose}
                disabled={isCountSaving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Tarih</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatDate(countResultModal.date)}</p>
              </div>
              <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Sayim</p>
                <p className="mt-2 text-lg font-semibold text-sky-50">{countResultModal.count}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Alinma tarihi: {formatDate(countResultModal.collectedAt)}
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCountModalClose}
                disabled={isCountSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={handleCountResultSave}
                disabled={isCountSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCountSaving ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
