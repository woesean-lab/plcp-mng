import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CubeIcon,
  CurrencyDollarIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PowerIcon,
  StarIcon as StarOutlineIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { PlayIcon, StarIcon as StarSolidIcon } from "@heroicons/react/20/solid"
import { toast } from "react-hot-toast"
import { AUTH_TOKEN_STORAGE_KEY } from "../../constants/appConstants"
import useEldoradoAutomationRuntime from "../../hooks/useEldoradoAutomationRuntime"
import useEldoradoPriceCommandRuntime from "../../hooks/useEldoradoPriceCommandRuntime"
import {
  calculateRoundedPriceResult,
  normalizePricePayloadValues,
  roundPriceNumber,
} from "../../utils/priceMath"
import StockModal from "../modals/StockModal"
function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}
const formatCategoryLabel = (value) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
const normalizeCategoryKey = (value) => String(value ?? "").trim().toLowerCase()
const getCategoryKeyFromHref = (href) => {
  if (!href) return ""
  const raw = String(href).trim()
  if (!raw) return ""
  let path = raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      path = new URL(raw).pathname
    } catch {
      path = raw
    }
  }
  const parts = path.split("?")[0].split("#")[0].split("/").filter(Boolean)
  if (parts.length === 0) return ""
  const lowered = parts.map((part) => String(part ?? "").trim().toLowerCase())
  const shopIndex = lowered.indexOf("shop")
  if (lowered[0] === "users" && shopIndex >= 0 && parts[shopIndex + 1]) {
    return normalizeCategoryKey(parts[shopIndex + 1])
  }
  return normalizeCategoryKey(parts[0])
}
const getKnownMainProductCategory = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

  if (normalized === "currency") return "Currency"
  if (normalized === "topup" || normalized === "topups") return "TopUp"
  if (normalized === "giftcard" || normalized === "giftcards") return "GiftCard"
  if (normalized === "account" || normalized === "accounts") return "Account"
  if (normalized === "customitem" || normalized === "item" || normalized === "items") return "CustomItem"
  return ""
}
const getCategoryKey = (product) => {
  const direct = normalizeCategoryKey(product?.category)
  if (direct && direct !== "users" && direct !== "shop") return direct
  const derived = getCategoryKeyFromHref(product?.href)
  return derived || "diger"
}

const resolveMainProductCategory = (product) =>
  getKnownMainProductCategory(product?.mainCategory) ||
  getKnownMainProductCategory(product?.category) ||
  (String(product?.kind ?? "").trim().toLowerCase() === "topups" ? "TopUp" : "") ||
  "CustomItem"
const isValidPriceInput = (value) => /^\d+(?:[.,]\d{1,2})?$/.test(String(value ?? "").trim())
const formatPriceMetric = (value) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized.toFixed(2) : "-"
}
const normalizeDecimalInput = (value) => String(value ?? "").trim().replace(",", ".")
const roundPriceControlValue = (value) => Math.round(Number(value) * 100) / 100
const formatPriceControlNumber = (value) => {
  const normalized = roundPriceControlValue(value)
  if (!Number.isFinite(normalized)) return "-"
  return normalized.toFixed(2).replace(/\.?0+$/, "")
}
const formatBulkPriceLogTime = () =>
  new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
const formatDownloadDateToken = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const normalizeDownloadName = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
const MAX_AUTOMATION_RUN_LOG_ENTRIES = 300
const MAX_PRICE_COMMAND_RUN_LOG_ENTRIES = 120
const CMD_VISIBLE_ROWS = 15
const PRICE_COMMAND_VISIBLE_ROWS = 12
const DEFAULT_PRICE_MULTIPLIER = 2
const DEFAULT_PRICE_PERCENT = String(DEFAULT_PRICE_MULTIPLIER * 100)
const PRICE_MULTIPLIER_MIN = 0.25
const PRICE_MULTIPLIER_MAX = 20
const PRICE_MULTIPLIER_PRESETS = [1.25, 1.5, 2, 2.5, 3, 4]
const PRICE_MULTIPLIER_ADJUSTMENTS = [-0.25, -0.05, 0.05, 0.25]
const PRICE_COMMAND_PROMPT_PATH = "C:\\plcp\\pricing>"
const BULK_PRICE_COMMAND_PROMPT_PATH = "C:\\plcp\\pricing-bulk>"
const BULK_PRICE_SESSION_STORAGE_KEY = "plcp:products:bulk-price-session:v1"
const BULK_PRICE_RESUMABLE_STATUSES = new Set(["pending", "running", "error"])
const PRICE_COMMAND_BACKEND_KEY = "eldoradofiyatguncelleme"
const isDesktopViewport = () =>
  typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches
const clampPriceMultiplier = (value, fallback = DEFAULT_PRICE_MULTIPLIER) => {
  const multiplier = Number(normalizeDecimalInput(value))
  if (!Number.isFinite(multiplier) || multiplier <= 0) return fallback
  return Math.min(PRICE_MULTIPLIER_MAX, Math.max(PRICE_MULTIPLIER_MIN, roundPriceControlValue(multiplier)))
}
const percentToMultiplier = (value, fallback = Number.NaN) => {
  const percent = Number(normalizeDecimalInput(value))
  if (!Number.isFinite(percent) || percent <= 0) return fallback
  return roundPriceControlValue(percent / 100)
}
const multiplierToPercent = (value, fallback = Number.NaN) => {
  const multiplier = Number(normalizeDecimalInput(value))
  if (!Number.isFinite(multiplier) || multiplier <= 0) return fallback
  return roundPriceControlValue(multiplier * 100)
}
const formatMultiplierDisplay = (value) => {
  const normalized = roundPriceControlValue(value)
  if (!Number.isFinite(normalized)) return "-"
  return `${normalized.toFixed(2)}x`
}
const formatMultiplierToken = (value) => {
  const normalized = roundPriceControlValue(value)
  if (!Number.isFinite(normalized)) return "-"
  return `${formatPriceControlNumber(normalized)}x`
}
const formatPercentToken = (value) => {
  const percent = multiplierToPercent(value)
  if (!Number.isFinite(percent)) return "-"
  return `%${formatPriceControlNumber(percent)}`
}
const formatPercentDraftValue = (value) => {
  const normalized = roundPriceControlValue(value)
  if (!Number.isFinite(normalized)) return ""
  return normalized.toFixed(2).replace(/\.?0+$/, "")
}
const isSameMultiplierValue = (left, right) =>
  Math.abs(roundPriceControlValue(left) - roundPriceControlValue(right)) < 0.001
const normalizeBackendKind = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
const isStockFetchBackendKind = (value) => normalizeBackendKind(value) === "stokcek"
const isApplicationBackendKind = (value) => {
  const normalized = normalizeBackendKind(value)
  return normalized === "uygulama" || normalized === "servis"
}

const getCommandLogStatusMeta = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase()
  if (normalized === "success") {
    return { code: "OK", textClass: "text-emerald-300" }
  }
  if (normalized === "error") {
    return { code: "ERR", textClass: "text-rose-300" }
  }
  if (normalized === "connecting") {
    return { code: "CON", textClass: "text-sky-300" }
  }
  return { code: "RUN", textClass: "text-amber-300" }
}

const getCommandConnectionLabel = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "connected") return "Baglanildi"
  if (normalized === "connecting") return "Baglaniyor"
  return "Baglanilmadi"
}

const getCommandConnectionBadgeClass = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "connected") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
  }
  if (normalized === "connecting") {
    return "border-sky-300/30 bg-sky-500/10 text-sky-100"
  }
  return "border-rose-300/30 bg-rose-500/10 text-rose-100"
}

const createEmptyBulkPriceCommandState = (overrides = {}) => ({
  isRunning: false,
  cancelRequested: false,
  total: 0,
  ready: 0,
  success: 0,
  error: 0,
  skipped: 0,
  currentOfferId: "",
  currentName: "",
  ...overrides,
})

const createBulkPriceCommandLogEntry = (status, message) => ({
  id: `bulk-price-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  time: formatBulkPriceLogTime(),
  status: String(status ?? "").trim() || "running",
  message: String(message ?? "").trim(),
})

const normalizeBulkPriceCommandLogEntry = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const time = String(entry?.time ?? "").trim()
  const status = String(entry?.status ?? "").trim()
  const message = String(entry?.message ?? "").trim()
  if (!id || !time || !status || !message) return null
  return { id, time, status, message }
}

const createBulkPriceItemStatusEntry = (status, name, message = "") => ({
  status: String(status ?? "").trim().toLowerCase() || "pending",
  name: String(name ?? "").trim() || "Isimsiz urun",
  message: String(message ?? "").trim(),
  updatedAt: Date.now(),
})

const countBulkPriceItemStatuses = (statusByOffer = {}) =>
  Object.values(statusByOffer || {}).reduce(
    (acc, entry) => {
      const normalizedStatus = String(entry?.status ?? "").trim().toLowerCase()
      if (!normalizedStatus) return acc
      acc.total += 1
      if (normalizedStatus === "success") acc.success += 1
      else if (normalizedStatus === "error") acc.error += 1
      else if (normalizedStatus === "skipped") acc.skipped += 1
      else if (normalizedStatus === "running") acc.running += 1
      else acc.pending += 1
      return acc
    },
    { total: 0, success: 0, error: 0, skipped: 0, pending: 0, running: 0 },
  )

const normalizeAutomationTarget = (entry) => {
  const id = String(entry?.id ?? "").trim()
  const backend = String(entry?.backend ?? "").trim()
  const url = String(entry?.url ?? "").trim()
  const starred = Boolean(entry?.starred)
  if (!backend || !url) return null
  return { id, backend, url, starred }
}

const normalizeAutomationTargetList = (value) => {
  const list = Array.isArray(value) ? value : []
  const seenById = new Set()
  const seenByPair = new Set()
  const normalized = []
  list.forEach((entry) => {
    const item = normalizeAutomationTarget(entry)
    if (!item) return
    const pairKey = `${item.backend}::${item.url}`
    if (item.id) {
      if (seenById.has(item.id)) return
      seenById.add(item.id)
    } else if (seenByPair.has(pairKey)) {
      return
    }
    seenByPair.add(pairKey)
    normalized.push({
      id:
        item.id ||
        `pair-${encodeURIComponent(item.backend).slice(0, 80)}-${encodeURIComponent(item.url).slice(0, 160)}`,
      backend: item.backend,
      url: item.url,
      starred: Boolean(item.starred),
    })
  })
  return normalized
}

const maskSensitiveText = (value, minLength = 8) => {
  const raw = String(value ?? "").trim()
  if (!raw) return "*".repeat(minLength)
  const safeLength = Math.max(minLength, Math.min(raw.length, 48))
  return "*".repeat(safeLength)
}

const escapeRegExp = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const maskAutomationLogMessage = (message, backendCandidates = []) => {
  const raw = String(message ?? "")
  if (!raw) return raw

  let masked = raw

  masked = masked.replace(/(?:https?|wss?):\/\/[^\s)]+/gi, (url) => maskSensitiveText(url, 16))

  masked = masked.replace(
    /(backend\s*[=:]\s*)([^\s,]+)/gi,
    (_, prefix, backendValue) => `${prefix}${maskSensitiveText(backendValue, 8)}`,
  )

  const backendList = Array.from(
    new Set(
      (Array.isArray(backendCandidates) ? backendCandidates : [])
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => b.length - a.length)

  backendList.forEach((backendKey) => {
    masked = masked.replace(new RegExp(escapeRegExp(backendKey), "g"), maskSensitiveText(backendKey, 8))
  })

  return masked
}

function PriceMultiplierControl({
  label = "Katsayi",
  description = "",
  value = DEFAULT_PRICE_MULTIPLIER,
  onChange,
  disabled = false,
  compact = false,
  framed = compact,
}) {
  const normalizedValue = clampPriceMultiplier(value)
  const presetValues = compact ? [1.5, 2, 2.5] : PRICE_MULTIPLIER_PRESETS
  const handleSelect = (nextValue) => {
    if (disabled || typeof onChange !== "function") return
    onChange(clampPriceMultiplier(nextValue))
  }

  return (
    <div className={`${framed ? "rounded-xl border border-white/10 bg-white/[0.03] p-2" : "space-y-2"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
            {label}
          </label>
          {description ? <p className="mt-0.5 text-[10px] text-slate-500">{description}</p> : null}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          }`}
        >
          <span className="font-semibold text-white">{formatMultiplierDisplay(normalizedValue)}</span>
          <span className="text-slate-500">{formatPercentToken(normalizedValue)}</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {presetValues.map((presetValue) => {
          const isActive = isSameMultiplierValue(normalizedValue, presetValue)
          return (
            <button
              key={`price-multiplier-preset-${presetValue}`}
              type="button"
              onClick={() => handleSelect(presetValue)}
              disabled={disabled}
              className={`inline-flex items-center justify-center rounded-full border font-semibold transition ${
                compact ? "h-7 px-2.5 text-[10px]" : "h-8 px-3 text-[11px]"
              } ${
                isActive
                  ? "border-amber-200/60 bg-amber-500/15 text-amber-50"
                  : "border-white/10 bg-ink-950/40 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {formatMultiplierToken(presetValue)}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRICE_MULTIPLIER_ADJUSTMENTS.map((stepValue) => {
          const nextValue = clampPriceMultiplier(normalizedValue + stepValue)
          const isNegative = stepValue < 0
          const labelText = `${isNegative ? "" : "+"}${formatPriceControlNumber(stepValue)}x`
          return (
            <button
              key={`price-multiplier-step-${stepValue}`}
              type="button"
              onClick={() => handleSelect(nextValue)}
              disabled={disabled}
              className={`inline-flex items-center justify-center rounded-lg border font-semibold transition ${
                compact ? "h-7 px-2 text-[10px]" : "h-8 px-2.5 text-[11px]"
              } ${
                isNegative
                  ? "border-rose-300/15 bg-rose-500/[0.05] text-rose-100 hover:border-rose-200/30 hover:bg-rose-500/[0.1]"
                  : "border-emerald-300/15 bg-emerald-500/[0.05] text-emerald-100 hover:border-emerald-200/30 hover:bg-emerald-500/[0.1]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {labelText}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProductsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-3 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-full" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className={`${panelClass} bg-ink-900/80`}>
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="mt-3 h-3 w-32 rounded-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={`product-category-${index}`} className="h-9 w-full rounded-xl" />
            ))}
          </div>
        </aside>
        <div className={`${panelClass} bg-ink-800/60`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SkeletonBlock className="h-3 w-32 rounded-full" />
              <SkeletonBlock className="mt-3 h-4 w-48 rounded-full" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonBlock className="h-7 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-28 rounded-full" />
                <SkeletonBlock className="h-7 w-32 rounded-full" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              <SkeletonBlock className="h-11 w-full rounded-lg" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`product-card-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
                <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                <div className="flex flex-wrap items-center gap-3">
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SkeletonBlock className="h-11 w-24 rounded-lg" />
                  <SkeletonBlock className="h-11 w-40 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
function ProductsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`product-card-skeleton-${index}`}
          className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-inner"
        >
          <SkeletonBlock className="h-4 w-2/3 rounded-full" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-4 w-20 rounded-full" />
            <SkeletonBlock className="h-4 w-24 rounded-full" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-7 w-16 rounded-full" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
export default function ProductsTab({
  panelClass = "",
  catalog,
  isLoading = false,
  isActive = false,
  isRefreshing = false,
  onRefresh,
  keysByOffer = {},
  keysLoading = {},
  keysDeleting = {},
  groups = [],
  groupAssignments = {},
  messageGroups = [],
  messageGroupAssignments = {},
  messageGroupTemplates = {},
  messageTemplatesByOffer = {},
  templates = [],
  activeUsername = "",
  stockEnabledByOffer = {},
  automationWsUrl = "",
  automationWsProbeStatus = "idle",
  automationEnabledByOffer: automationEnabledByOfferProp = {},
  automationTargetsByOffer: automationTargetsByOfferProp = {},
  automationBackendOptions = [],
  priceEnabledByOffer: priceEnabledByOfferProp = {},
  savedPricesByOffer: savedPricesByOfferProp = {},
  starredOffers = {},
  onLoadKeys,
  onAddKeys,
  onDeleteKey,
  onUpdateKeyStatus,
  onUpdateKeyCode,
  onBulkCopy,
  onBulkDelete,
  onDeleteGroup,
  onCopyKey,
  onCreateGroup,
  onAssignGroup,
  onCreateMessageGroup,
  onAssignMessageGroup,
  onDeleteMessageGroup,
  onAddMessageTemplate,
  onAddMessageGroupTemplate,
  onRemoveMessageGroupTemplate,
  onRemoveMessageTemplate,
  onToggleStock,
  onSaveAutomation,
  onAddAutomationTarget,
  onDeleteAutomationTarget,
  onToggleAutomationTargetStar,
  onSavePrice,
  onTogglePrice,
  onToggleOfferStar,
  onDeleteOffer,
  onRefreshOffer,
  canManagePrices: canManagePricesProp,
  canViewPriceDetails: canViewPriceDetailsProp,
  canViewPriceCommandLogs: canViewPriceCommandLogsProp,
  canTogglePrice: canTogglePriceProp,
  canAddKeys = false,
  canDeleteKeys = false,
  canCopyKeys = false,
  canEditKeys: canEditKeysProp = false,
  canChangeKeyStatus: canChangeKeyStatusProp = false,
  canManageGroups: canManageGroupsProp,
  canManageMessages: canManageMessagesProp,
  canToggleStock: canToggleStockProp,
  canToggleCard: canToggleCardProp,
  canManageAutomation: canManageAutomationProp,
  canViewAutomationPanel: canViewAutomationPanelProp,
  canManageAutomationTargets: canManageAutomationTargetsProp,
  canRunAutomation: canRunAutomationProp,
  canViewAutomationLogs: canViewAutomationLogsProp,
  canClearAutomationLogs: canClearAutomationLogsProp,
  canStarAutomationTargets: canStarAutomationTargetsProp,
  canViewAutomationTargetDetails: canViewAutomationTargetDetailsProp,
  canViewLinks = false,
  canStarOffers: canStarOffersProp,
  canDeleteOffers = false,
}) {
  const [query, setQuery] = useState("")
  const [openOffers, setOpenOffers] = useState({})
  const [confirmKeyTarget, setConfirmKeyTarget] = useState(null)
  const [groupDrafts, setGroupDrafts] = useState({})
  const [groupSelectionDrafts, setGroupSelectionDrafts] = useState({})
  const [bulkCounts, setBulkCounts] = useState({})
  const [stockModalDraft, setStockModalDraft] = useState("")
  const [stockModalTarget, setStockModalTarget] = useState(null)
  const [editingKeys, setEditingKeys] = useState({})
  const [savingKeys, setSavingKeys] = useState({})
  const [confirmGroupDelete, setConfirmGroupDelete] = useState(null)
  const [activePanelByOffer, setActivePanelByOffer] = useState({})
  const [messageTemplateDrafts, setMessageTemplateDrafts] = useState({})
  const [messageGroupDrafts, setMessageGroupDrafts] = useState({})
  const [messageGroupSelectionDrafts, setMessageGroupSelectionDrafts] = useState({})
  const [refreshingOffers, setRefreshingOffers] = useState({})
  const [confirmMessageGroupDelete, setConfirmMessageGroupDelete] = useState(null)
  const [confirmMessageTemplateDelete, setConfirmMessageTemplateDelete] = useState(null)
  const [confirmOfferDelete, setConfirmOfferDelete] = useState(null)
  const [priceEnabledByOffer, setPriceEnabledByOffer] = useState(
    priceEnabledByOfferProp && typeof priceEnabledByOfferProp === "object"
      ? priceEnabledByOfferProp
      : {},
  )
  const [automationEnabledByOffer, setAutomationEnabledByOffer] = useState(
    automationEnabledByOfferProp && typeof automationEnabledByOfferProp === "object"
      ? automationEnabledByOfferProp
      : {},
  )
  const [automationTargetsByOffer, setAutomationTargetsByOffer] = useState(
    automationTargetsByOfferProp && typeof automationTargetsByOfferProp === "object"
      ? Object.entries(automationTargetsByOfferProp).reduce((acc, [offerId, rows]) => {
          const normalizedOfferId = String(offerId ?? "").trim()
          if (!normalizedOfferId) return acc
          const normalizedRows = normalizeAutomationTargetList(rows)
          if (normalizedRows.length === 0) return acc
          acc[normalizedOfferId] = normalizedRows
          return acc
        }, {})
      : {},
  )
  const [automationTargetDraftsByOffer, setAutomationTargetDraftsByOffer] = useState({})
  const [automationSelectedTargetByOffer, setAutomationSelectedTargetByOffer] = useState({})
  const [automationTargetSavingByOffer, setAutomationTargetSavingByOffer] = useState({})
  const [automationTargetDeletingByOffer, setAutomationTargetDeletingByOffer] = useState({})
  const [automationTargetStarringByOffer, setAutomationTargetStarringByOffer] = useState({})
  const [automationResultPopup, setAutomationResultPopup] = useState({
    isOpen: false,
    offerId: "",
    title: "",
    backend: "",
    value: "",
  })
  const [popupStockAddMode, setPopupStockAddMode] = useState("")
  const [isPopupValueEditing, setIsPopupValueEditing] = useState(false)
  const [popupValueDraft, setPopupValueDraft] = useState("")
  const [priceDrafts, setPriceDrafts] = useState({})
  const [savedPricesByOffer, setSavedPricesByOffer] = useState(
    savedPricesByOfferProp && typeof savedPricesByOfferProp === "object"
      ? savedPricesByOfferProp
      : {},
  )
  const [isBulkPriceModeOpen, setIsBulkPriceModeOpen] = useState(false)
  const [confirmBulkUsedDelete, setConfirmBulkUsedDelete] = useState(false)
  const [isBulkUsedDeleteRunning, setIsBulkUsedDeleteRunning] = useState(false)
  const [isBulkStockRefreshRunning, setIsBulkStockRefreshRunning] = useState(false)
  const [selectedPriceOfferIds, setSelectedPriceOfferIds] = useState({})
  const [bulkPriceCommandState, setBulkPriceCommandState] = useState(createEmptyBulkPriceCommandState)
  const [bulkPriceCommandLogEntries, setBulkPriceCommandLogEntries] = useState([])
  const [bulkPriceItemStatusByOffer, setBulkPriceItemStatusByOffer] = useState({})
  const [bulkPriceLogsLoaded, setBulkPriceLogsLoaded] = useState(false)
  const [bulkPriceLogsLoading, setBulkPriceLogsLoading] = useState(false)
  const [bulkPriceLogsClearing, setBulkPriceLogsClearing] = useState(false)
  const [keyFadeById, setKeyFadeById] = useState({})
  const [selectFlashByKey, setSelectFlashByKey] = useState({})
  const stockModalLineRef = useRef(null)
  const stockModalTextareaRef = useRef(null)
  const popupValueEditorRef = useRef(null)
  const popupValueCopyTimerRef = useRef(null)
  const bulkUsedDeleteConfirmTimerRef = useRef(null)
  const bulkPriceSessionHydratedRef = useRef(false)
  const bulkPriceCancelRequestedRef = useRef(false)
  const prevGroupAssignments = useRef(groupAssignments)
  const prevMessageGroupAssignments = useRef(messageGroupAssignments)
  useEffect(
    () => () => {
      if (bulkUsedDeleteConfirmTimerRef.current) {
        clearTimeout(bulkUsedDeleteConfirmTimerRef.current)
      }
    },
    [],
  )
  useEffect(() => {
    if (!savedPricesByOfferProp || typeof savedPricesByOfferProp !== "object") return
    setSavedPricesByOffer(savedPricesByOfferProp)
  }, [savedPricesByOfferProp])
  useEffect(() => {
    if (!priceEnabledByOfferProp || typeof priceEnabledByOfferProp !== "object") return
    setPriceEnabledByOffer(priceEnabledByOfferProp)
  }, [priceEnabledByOfferProp])
  useEffect(() => {
    if (!automationEnabledByOfferProp || typeof automationEnabledByOfferProp !== "object") return
    setAutomationEnabledByOffer(automationEnabledByOfferProp)
  }, [automationEnabledByOfferProp])
  useEffect(() => {
    if (!automationTargetsByOfferProp || typeof automationTargetsByOfferProp !== "object") {
      setAutomationTargetsByOffer({})
      return
    }
    const normalized = Object.entries(automationTargetsByOfferProp).reduce((acc, [offerId, list]) => {
      const normalizedOfferId = String(offerId ?? "").trim()
      if (!normalizedOfferId) return acc
      const normalizedList = normalizeAutomationTargetList(list)
      if (normalizedList.length === 0) return acc
      acc[normalizedOfferId] = normalizedList
      return acc
    }, {})
    setAutomationTargetsByOffer(normalized)
  }, [automationTargetsByOfferProp])
  useEffect(() => {
    if (!savedPricesByOfferProp || typeof savedPricesByOfferProp !== "object") return
    setPriceDrafts((prev) => {
      const next = { ...prev }
      Object.entries(savedPricesByOfferProp).forEach(([offerId, price]) => {
        if (!offerId || !price || typeof price !== "object") return
        const hasDraft = next[offerId] && (next[offerId].base !== "" || next[offerId].percent !== "")
        if (hasDraft) return
        const savedPercent = String(price.percent ?? "").trim()
        next[offerId] = {
          base: price.base ?? "",
          percent: savedPercent || DEFAULT_PRICE_PERCENT,
        }
      })
      return next
    })
  }, [savedPricesByOfferProp])
  const trackedAutomationLogOfferIds = useMemo(
    () =>
      Object.entries(openOffers || {})
        .filter(([, isOpen]) => Boolean(isOpen))
        .map(([offerId]) => String(offerId ?? "").trim())
        .filter((offerId) => activePanelByOffer?.[offerId] === "automation"),
    [activePanelByOffer, openOffers],
  )
  const trackedPriceLogOfferIds = useMemo(
    () =>
      Object.entries(openOffers || {})
        .filter(([, isOpen]) => Boolean(isOpen))
        .map(([offerId]) => String(offerId ?? "").trim())
        .filter((offerId) => activePanelByOffer?.[offerId] === "price"),
    [activePanelByOffer, openOffers],
  )
  const canManageGroups = typeof canManageGroupsProp === "boolean" ? canManageGroupsProp : canAddKeys
  const canManageStock =
    typeof canToggleStockProp === "boolean"
      ? canToggleStockProp
      : canAddKeys && typeof onToggleStock === "function"
  const canManageMessages =
    typeof canManageMessagesProp === "boolean"
      ? canManageMessagesProp
      : canAddKeys &&
        (typeof onAddMessageGroupTemplate === "function" || typeof onAddMessageTemplate === "function")
  const canManagePrices =
    typeof canManagePricesProp === "boolean" ? canManagePricesProp : canAddKeys
  const canViewPriceDetails =
    typeof canViewPriceDetailsProp === "boolean" ? canViewPriceDetailsProp : canManagePrices
  const canViewPriceCommandLogs =
    typeof canViewPriceCommandLogsProp === "boolean"
      ? canViewPriceCommandLogsProp
      : canManagePrices
  const canTogglePrice =
    typeof canTogglePriceProp === "boolean" ? canTogglePriceProp : canManagePrices
  const canDeleteMessageGroup =
    canManageMessages && typeof onDeleteMessageGroup === "function"
  const canRemoveMessageTemplate =
    canManageMessages &&
    (typeof onRemoveMessageTemplate === "function" ||
      typeof onRemoveMessageGroupTemplate === "function")
  const canUpdateKeys =
    typeof onUpdateKeyStatus === "function" &&
    (typeof canChangeKeyStatusProp === "boolean" ? canChangeKeyStatusProp : canCopyKeys)
  const canEditKeys =
    typeof onUpdateKeyCode === "function" &&
    (typeof canEditKeysProp === "boolean" ? canEditKeysProp : canAddKeys)
  const canStarOffers =
    typeof canStarOffersProp === "boolean" ? canStarOffersProp : canAddKeys
  const canToggleCard =
    typeof canToggleCardProp === "boolean" ? canToggleCardProp : canStarOffers
  const canManageAutomation =
    typeof canManageAutomationProp === "boolean"
      ? canManageAutomationProp
      : canToggleCard && typeof onSaveAutomation === "function"
  const canViewAutomationPanel =
    typeof canViewAutomationPanelProp === "boolean"
      ? canViewAutomationPanelProp
      : canManageAutomation
  const canManageAutomationTargets =
    typeof canManageAutomationTargetsProp === "boolean"
      ? canManageAutomationTargetsProp
      : canManageAutomation
  const canRunAutomation =
    typeof canRunAutomationProp === "boolean" ? canRunAutomationProp : canManageAutomationTargets
  const canViewAutomationLogs =
    typeof canViewAutomationLogsProp === "boolean"
      ? canViewAutomationLogsProp
      : canRunAutomation || canManageAutomationTargets
  const canClearAutomationLogs =
    typeof canClearAutomationLogsProp === "boolean" ? canClearAutomationLogsProp : false
  const canStarAutomationTargets =
    typeof canStarAutomationTargetsProp === "boolean"
      ? canStarAutomationTargetsProp
      : canManageAutomationTargets
  const canViewAutomationTargetDetails =
    typeof canViewAutomationTargetDetailsProp === "boolean"
      ? canViewAutomationTargetDetailsProp
      : true
  const {
    automationRunLogByOffer,
    automationIsRunningByOffer,
    automationConnectionStateByOffer,
    automationTwoFactorPromptByOffer,
    automationTwoFactorCodeByOffer,
    setAutomationTwoFactorCodeByOffer,
    automationLogsClearingByOffer,
    loadAutomationRunLogs,
    clearAutomationRunLogs,
    appendAutomationRunLog,
    handleAutomationRun,
    handleAutomationTwoFactorCodeSubmit,
  } = useEldoradoAutomationRuntime({
    activeUsername,
    automationWsUrl,
    canRunAutomation,
    canViewAutomationLogs,
    canClearAutomationLogs,
    canViewAutomationTargetDetails,
    isActive,
    trackedLogOfferIds: trackedAutomationLogOfferIds,
    maskSensitiveText,
    setAutomationResultPopup,
    maxAutomationRunLogEntries: MAX_AUTOMATION_RUN_LOG_ENTRIES,
  })
  const normalizedAutomationBackendOptions = useMemo(() => {
    const rawList = Array.isArray(automationBackendOptions) ? automationBackendOptions : []
    const seen = new Set()
    return rawList
      .map((entry) => {
        const key = String(entry?.key ?? entry?.backend ?? entry?.id ?? entry ?? "").trim()
        if (!key || seen.has(key)) return null
        seen.add(key)
        const label = String(entry?.label ?? entry?.title ?? entry?.name ?? key).trim() || key
        const kind = normalizeBackendKind(entry?.kind ?? entry?.group ?? entry?.type)
        return { key, label, kind }
      })
      .filter(Boolean)
  }, [automationBackendOptions])
  const stockFetchAutomationBackendOptions = useMemo(
    () => normalizedAutomationBackendOptions.filter((entry) => isStockFetchBackendKind(entry.kind)),
    [normalizedAutomationBackendOptions],
  )
  const applicationAutomationBackendOptions = useMemo(
    () => normalizedAutomationBackendOptions.filter((entry) => isApplicationBackendKind(entry.kind)),
    [normalizedAutomationBackendOptions],
  )
  const priceCommandBackendEntry = useMemo(() => {
    const exactMatch =
      applicationAutomationBackendOptions.find(
        (entry) => normalizeBackendKind(entry.key) === PRICE_COMMAND_BACKEND_KEY,
      ) ||
      applicationAutomationBackendOptions.find(
        (entry) => normalizeBackendKind(entry.label) === PRICE_COMMAND_BACKEND_KEY,
      )
    return exactMatch || { key: PRICE_COMMAND_BACKEND_KEY, label: PRICE_COMMAND_BACKEND_KEY, kind: "uygulama" }
  }, [applicationAutomationBackendOptions])
  const {
    priceCommandRunLogByOffer,
    priceCommandIsRunningByOffer,
    priceCommandConnectionStateByOffer,
    priceCommandLogsClearingByOffer,
    loadPriceCommandLogs,
    clearPriceCommandLogs,
    runPriceCommandAsync,
    handlePriceCommandRun,
  } = useEldoradoPriceCommandRuntime({
    activeUsername,
    wsUrl: automationWsUrl,
    canRunPriceCommand: canManagePrices,
    canViewPriceCommandLogs,
    defaultBackendKey: priceCommandBackendEntry?.key ?? PRICE_COMMAND_BACKEND_KEY,
    defaultBackendLabel: priceCommandBackendEntry?.label ?? PRICE_COMMAND_BACKEND_KEY,
    maxLogEntries: MAX_PRICE_COMMAND_RUN_LOG_ENTRIES,
    isActive,
    trackedLogOfferIds: trackedPriceLogOfferIds,
  })
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const triggerKeyFade = (keyId) => {
    const normalizedId = String(keyId ?? "").trim()
    if (!normalizedId) return
    setKeyFadeById((prev) => ({ ...prev, [normalizedId]: true }))
    setTimeout(() => {
      setKeyFadeById((prev) => {
        const next = { ...prev }
        delete next[normalizedId]
        return next
      })
    }, 240)
  }
  const triggerSelectFlash = (offerId, section) => {
    const normalizedId = String(offerId ?? "").trim()
    const normalizedSection = String(section ?? "").trim()
    if (!normalizedId || !normalizedSection) return
    const key = `${normalizedId}:${normalizedSection}`
    setSelectFlashByKey((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setSelectFlashByKey((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, 260)
  }
  const items = Array.isArray(catalog?.items) ? catalog.items : []
  const topups = Array.isArray(catalog?.topups) ? catalog.topups : []
  const allProducts = useMemo(() => [...items, ...topups], [items, topups])
  const missingTotal = useMemo(
    () => allProducts.filter((product) => Boolean(product?.missing)).length,
    [allProducts],
  )
  const categoryMap = useMemo(() => {
    const bucket = new Map()
    allProducts.forEach((product) => {
      const key = getCategoryKey(product)
      if (!bucket.has(key)) bucket.set(key, [])
      bucket.get(key).push(product)
    })
    return bucket
  }, [allProducts])
  const categories = useMemo(() => {
    const list = Array.from(categoryMap.entries()).map(([key, bucketItems]) => ({
      key,
      label: key === "diger" ? "Diğer" : formatCategoryLabel(key),
      items: bucketItems,
    }))
    list.sort((a, b) => a.label.localeCompare(b.label, "tr"))
    return [
      { key: "all", label: "Tümü", items: allProducts },
      { key: "missing", label: "Eksik Ürünler", items: allProducts },
      ...list,
    ]
  }, [allProducts, categoryMap])
  const [activeCategoryKey, setActiveCategoryKey] = useState("all")
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(() => isDesktopViewport())
  const activeCategory = categories.find((category) => category.key === activeCategoryKey) ?? categories[0]
  const canRefresh = typeof onRefresh === "function"
  const baseList =
    activeCategoryKey === "all" || activeCategoryKey === "missing"
      ? allProducts
      : categoryMap.get(activeCategoryKey) ?? activeCategory?.items ?? []
  const list =
    activeCategoryKey === "missing"
      ? baseList.filter((product) => Boolean(product?.missing))
      : baseList
  const normalizedQuery = query.trim().toLowerCase()
  const [page, setPage] = useState(1)
  const pageSize = 12
  const filteredList = useMemo(() => {
    if (!normalizedQuery) return list
    return list.filter((product) => {
      const name = String(product?.name ?? "").toLowerCase()
      return name.includes(normalizedQuery)
    })
  }, [list, normalizedQuery])
  const toolbarUsedStockCount = useMemo(
    () =>
      allProducts.reduce((total, product) => {
        const offerId = String(product?.id ?? "").trim()
        const loadedKeys = Array.isArray(keysByOffer?.[offerId]) ? keysByOffer[offerId] : null
        if (loadedKeys) {
          return (
            total +
            loadedKeys.reduce(
              (count, item) =>
                count +
                (String(item?.status ?? "").trim().toLowerCase() === "used" ? 1 : 0),
              0,
            )
          )
        }
        const rawUsedCount = Number(product?.stockUsedCount)
        return total + (Number.isFinite(rawUsedCount) ? Math.max(0, rawUsedCount) : 0)
      }, 0),
    [allProducts, keysByOffer],
  )
  const sortedList = useMemo(() => {
    if (!starredOffers || Object.keys(starredOffers).length === 0) return filteredList
    return [...filteredList].sort((a, b) => {
      const aId = String(a?.id ?? "").trim()
      const bId = String(b?.id ?? "").trim()
      const aStar = Boolean(starredOffers[aId])
      const bStar = Boolean(starredOffers[bId])
      if (aStar === bStar) return 0
      return aStar ? -1 : 1
    })
  }, [filteredList, starredOffers])
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const totalItems = filteredList.length
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedList.slice(start, start + pageSize)
  }, [sortedList, page, pageSize])
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize)
  const stockModalLineCount = useMemo(() => {
    const count = stockModalDraft.split("\n").length
    return Math.max(1, count)
  }, [stockModalDraft])
  const productStats = useMemo(() => {
    const totals = {
      totalOffers: allProducts.length,
      stockEnabled: 0,
      automationEnabled: 0,
      stockDisabled: 0,
      outOfStock: 0,
      totalStock: 0,
      usedStock: 0,
    }
    const countedGroups = new Set()
    allProducts.forEach((product) => {
      const offerId = String(product?.id ?? "").trim()
      const isStockEnabled = Boolean(stockEnabledByOffer?.[offerId])
      const isAutomationEnabled = Boolean(automationEnabledByOffer?.[offerId])
      if (isStockEnabled) {
        totals.stockEnabled += 1
      } else {
        totals.stockDisabled += 1
      }
      if (isAutomationEnabled) {
        totals.automationEnabled += 1
      }
      const keyList = Array.isArray(keysByOffer?.[offerId]) ? keysByOffer[offerId] : []
      const usedCountFromKeys = keyList.reduce(
        (acc, item) => acc + (item?.status === "used" ? 1 : 0),
        0,
      )
      const availableCountFromKeys = keyList.reduce(
        (acc, item) => acc + (item?.status !== "used" ? 1 : 0),
        0,
      )
      const stockCountRaw = Number(product?.stockCount)
      const stockUsedRaw = Number(product?.stockUsedCount)
      const stockTotalRaw = Number(product?.stockTotalCount)
      const rawTotalCount = Number.isFinite(stockTotalRaw) ? stockTotalRaw : keyList.length
      const rawUsedCount = Number.isFinite(stockUsedRaw) ? stockUsedRaw : usedCountFromKeys
      const rawAvailableCount = Number.isFinite(stockCountRaw)
        ? stockCountRaw
        : Math.max(0, rawTotalCount - rawUsedCount)
      const hasLoadedKeys = Object.prototype.hasOwnProperty.call(keysByOffer, offerId)
      const usedCount = hasLoadedKeys ? usedCountFromKeys : rawUsedCount
      const availableCount = hasLoadedKeys ? availableCountFromKeys : rawAvailableCount
      const totalCount = Math.max(0, availableCount + usedCount)
      const groupId = String(
        groupAssignments?.[offerId] ?? product?.stockGroupId ?? "",
      ).trim()
      const countKey = groupId ? `group:${groupId}` : `offer:${offerId}`
      const shouldCountStock = !countedGroups.has(countKey)
      if (shouldCountStock) {
        countedGroups.add(countKey)
        totals.totalStock += Math.max(0, availableCount)
        totals.usedStock += Math.max(0, usedCount)
      }
      if (isStockEnabled && Math.max(0, availableCount) === 0) {
        totals.outOfStock += 1
      }
    })
    return totals
  }, [allProducts, automationEnabledByOffer, groupAssignments, keysByOffer, stockEnabledByOffer])
  const automationWsSummary = useMemo(() => {
    const values = Object.values(automationConnectionStateByOffer || {})
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
    const connectedCount = values.filter((value) => value === "connected").length
    const hasWsUrl = Boolean(String(automationWsUrl ?? "").trim())
    const probeStatus = String(automationWsProbeStatus ?? "").trim().toLowerCase()
    const isConnected = hasWsUrl && (connectedCount > 0 || probeStatus === "connected")
    const isConnecting = !isConnected && hasWsUrl && probeStatus === "connecting"
    return {
      label: isConnected ? "Baglanildi" : isConnecting ? "Baglaniyor" : "Baglanilmadi",
    }
  }, [automationConnectionStateByOffer, automationWsProbeStatus, automationWsUrl])
  useEffect(() => {
    const validIds = new Set(
      allProducts
        .map((product) => String(product?.id ?? "").trim())
        .filter(Boolean),
    )
    const selectableIds = new Set(
      allProducts
        .filter((product) => Boolean(priceEnabledByOffer?.[String(product?.id ?? "").trim()]))
        .map((product) => String(product?.id ?? "").trim())
        .filter(Boolean),
    )
    setSelectedPriceOfferIds((prev) => {
      const next = {}
      let changed = false
      Object.entries(prev).forEach(([offerId, selected]) => {
        if (!selected) return
        if (validIds.has(offerId) && selectableIds.has(offerId)) {
          next[offerId] = true
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })
    setBulkPriceItemStatusByOffer((prev) => {
      const next = {}
      let changed = false
      Object.entries(prev).forEach(([offerId, entry]) => {
        if (validIds.has(offerId)) {
          next[offerId] = entry
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [allProducts, priceEnabledByOffer])
  useEffect(() => {
    if (typeof window === "undefined") {
      bulkPriceSessionHydratedRef.current = true
      return
    }

    try {
      const rawSession = window.localStorage.getItem(BULK_PRICE_SESSION_STORAGE_KEY)
      if (!rawSession) {
        bulkPriceSessionHydratedRef.current = true
        return
      }

      const parsed = JSON.parse(rawSession)
      const restoredSelectedOfferIds = Object.entries(parsed?.selectedPriceOfferIds ?? {}).reduce(
        (acc, [offerId, selected]) => {
          const normalizedOfferId = String(offerId ?? "").trim()
          if (!normalizedOfferId || !selected) return acc
          acc[normalizedOfferId] = true
          return acc
        },
        {},
      )
      const restoredItemStatuses = Object.entries(parsed?.bulkPriceItemStatusByOffer ?? {}).reduce(
        (acc, [offerId, entry]) => {
          const normalizedOfferId = String(offerId ?? "").trim()
          if (!normalizedOfferId || !entry || typeof entry !== "object") return acc
          const normalizedStatus = String(entry.status ?? "").trim().toLowerCase()
          if (!normalizedStatus) return acc
          acc[normalizedOfferId] = createBulkPriceItemStatusEntry(
            normalizedStatus === "running" ? "pending" : normalizedStatus,
            entry.name,
            entry.message ?? entry.reason,
          )
          if (Number.isFinite(Number(entry.updatedAt))) {
            acc[normalizedOfferId].updatedAt = Number(entry.updatedAt)
          }
          return acc
        },
        {},
      )
      const hadInterruptedRun =
        Boolean(parsed?.bulkPriceCommandState?.isRunning) ||
        Object.values(parsed?.bulkPriceItemStatusByOffer ?? {}).some(
          (entry) => String(entry?.status ?? "").trim().toLowerCase() === "running",
        )
      const restoredLogs = Array.isArray(parsed?.bulkPriceCommandLogEntries)
        ? parsed.bulkPriceCommandLogEntries
            .map((entry) => {
              const message = String(entry?.message ?? "").trim()
              if (!message) return null
              return {
                id:
                  String(entry?.id ?? "").trim() ||
                  `bulk-price-log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                time: String(entry?.time ?? "").trim() || formatBulkPriceLogTime(),
                status: String(entry?.status ?? "").trim() || "running",
                message,
              }
            })
            .filter(Boolean)
            .slice(0, MAX_PRICE_COMMAND_RUN_LOG_ENTRIES)
        : []

      const nextLogs = hadInterruptedRun
        ? [
            createBulkPriceCommandLogEntry(
              "error",
              "Onceki toplu gonderim sayfadan cikildigi icin durduruldu. Tamamlanmayanlari yeniden gonderebilirsiniz.",
            ),
            ...restoredLogs,
          ].slice(0, MAX_PRICE_COMMAND_RUN_LOG_ENTRIES)
        : restoredLogs

      const restoredCounts = countBulkPriceItemStatuses(restoredItemStatuses)
      const restoredSelectedCount = Object.keys(restoredSelectedOfferIds).length

      if (restoredSelectedCount > 0) {
        setSelectedPriceOfferIds(restoredSelectedOfferIds)
      }
      if (Object.keys(restoredItemStatuses).length > 0) {
        setBulkPriceItemStatusByOffer(restoredItemStatuses)
      }
      if (nextLogs.length > 0) {
        setBulkPriceCommandLogEntries(nextLogs)
      }
      setBulkPriceCommandState(
        createEmptyBulkPriceCommandState({
          total: Math.max(
            Number(parsed?.bulkPriceCommandState?.total) || 0,
            restoredCounts.total,
            restoredSelectedCount,
          ),
          ready: Math.max(Number(parsed?.bulkPriceCommandState?.ready) || 0, restoredCounts.pending),
          success: restoredCounts.success,
          error: restoredCounts.error,
          skipped: restoredCounts.skipped,
        }),
      )

      if (hadInterruptedRun) {
        toast.error("Toplu gonderim yarida kaldi. Tamamlanmayanlari yeniden gonderebilirsiniz.")
      }
    } catch {
      // Ignore invalid persisted bulk session payloads.
    } finally {
      bulkPriceSessionHydratedRef.current = true
    }
  }, [])
  useEffect(() => {
    if (!bulkPriceSessionHydratedRef.current || typeof window === "undefined") return

    const hasPersistedSession =
      Object.values(selectedPriceOfferIds).some(Boolean) ||
      bulkPriceCommandLogEntries.length > 0 ||
      Object.keys(bulkPriceItemStatusByOffer).length > 0 ||
      bulkPriceCommandState.total > 0

    if (!hasPersistedSession) {
      window.localStorage.removeItem(BULK_PRICE_SESSION_STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(
        BULK_PRICE_SESSION_STORAGE_KEY,
        JSON.stringify({
          selectedPriceOfferIds,
          bulkPriceCommandState,
          bulkPriceCommandLogEntries,
          bulkPriceItemStatusByOffer,
          updatedAt: Date.now(),
        }),
      )
    } catch {
      // Ignore persistence errors.
    }
  }, [
    bulkPriceCommandLogEntries,
    bulkPriceCommandState,
    bulkPriceItemStatusByOffer,
    selectedPriceOfferIds,
  ])
  const apiFetchBulkPriceLog = useCallback(async (input, init = {}) => {
    const headers = new Headers(init.headers || {})
    if (typeof window !== "undefined") {
      try {
        const token = String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "").trim()
        if (token) {
          headers.set("Authorization", `Bearer ${token}`)
        }
      } catch {
        // Ignore localStorage read errors.
      }
    }
    return fetch(input, { ...init, headers })
  }, [])
  const persistBulkPriceCommandLogEntry = async (entry) => {
    if (!entry) return
    try {
      const res = await apiFetchBulkPriceLog("/api/eldorado/price-command-bulk-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        // Ignore API-level errors; keep UI responsive.
      }
    } catch {
      // Ignore persistence errors; keep UI responsive.
    }
  }
  const loadBulkPriceCommandLogs = useCallback(async (options = {}) => {
    if (!canViewPriceCommandLogs) return false
    const force = Boolean(options?.force)
    if (!force && bulkPriceLogsLoaded) return true

    setBulkPriceLogsLoading(true)
    try {
      const res = await apiFetchBulkPriceLog(
        `/api/eldorado/price-command-bulk-logs?limit=${MAX_PRICE_COMMAND_RUN_LOG_ENTRIES}`,
      )
      if (!res.ok) {
        throw new Error("bulk_price_logs_load_failed")
      }
      const payload = await res.json()
      const normalized = Array.isArray(payload)
        ? payload.map(normalizeBulkPriceCommandLogEntry).filter(Boolean)
        : []
      setBulkPriceCommandLogEntries((prev) => {
        const seen = new Set()
        return [...normalized, ...prev]
          .filter((entry) => {
            const id = String(entry?.id ?? "").trim()
            if (!id || seen.has(id)) return false
            seen.add(id)
            return true
          })
          .slice(0, MAX_PRICE_COMMAND_RUN_LOG_ENTRIES)
      })
      setBulkPriceLogsLoaded(true)
      return true
    } catch {
      toast.error("Toplu fiyat loglari alinamadi.")
      return false
    } finally {
      setBulkPriceLogsLoading(false)
    }
  }, [apiFetchBulkPriceLog, bulkPriceLogsLoaded, canViewPriceCommandLogs])
  const appendBulkPriceCommandLog = (status, message, options = {}) => {
    const normalizedMessage = String(message ?? "").trim()
    if (!normalizedMessage) return
    const entry = createBulkPriceCommandLogEntry(status, normalizedMessage)
    setBulkPriceCommandLogEntries((prev) => [
      entry,
      ...prev,
    ].slice(0, MAX_PRICE_COMMAND_RUN_LOG_ENTRIES))
    setBulkPriceLogsLoaded(true)
    if (options?.persist !== false) {
      void persistBulkPriceCommandLogEntry(entry)
    }
  }
  const clearBulkPriceCommandLogs = async () => {
    if (isBulkPriceRunning || bulkPriceLogsClearing) return false
    setBulkPriceLogsClearing(true)
    try {
      const res = await apiFetchBulkPriceLog("/api/eldorado/price-command-bulk-logs", {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error("bulk_price_logs_clear_failed")
      }
      setBulkPriceCommandLogEntries([])
      setBulkPriceItemStatusByOffer({})
      setBulkPriceCommandState((prev) =>
        createEmptyBulkPriceCommandState({
          isRunning: prev.isRunning,
        }),
      )
      setBulkPriceLogsLoaded(true)
      toast.success("Toplu fiyat loglari temizlendi.")
      return true
    } catch {
      toast.error("Toplu fiyat loglari temizlenemedi.")
      return false
    } finally {
      setBulkPriceLogsClearing(false)
    }
  }
  const buildBulkPriceCandidate = (product) => {
    const offerId = String(product?.id ?? "").trim()
    const name = String(product?.name ?? "").trim() || "Isimsiz urun"
    const priceDraft = priceDrafts[offerId] ?? { base: "", percent: DEFAULT_PRICE_PERCENT }
    const baseInputValue = String(priceDraft?.base ?? "").trim()
    const baseValue = normalizeDecimalInput(baseInputValue)
    const percentValue = normalizeDecimalInput(priceDraft?.percent)
    const isBaseValid = isValidPriceInput(baseInputValue)
    const baseNumber = isBaseValid ? Number(baseValue) : Number.NaN
    const percentNumber = Number(percentValue)
    const multiplierNumber = Number.isFinite(percentNumber) ? percentToMultiplier(percentNumber) : Number.NaN
    const result = calculateRoundedPriceResult(baseNumber, multiplierNumber)
    const category = resolveMainProductCategory(product)
    if (!offerId) {
      return { offerId: "", name, category, result, status: "skipped", reason: "Urun ID yok." }
    }
    if (!Boolean(priceEnabledByOffer?.[offerId])) {
      return { offerId, name, category, result, status: "skipped", reason: "Fiyat tabi kapali." }
    }
    if (Boolean(priceCommandIsRunningByOffer?.[offerId])) {
      return { offerId, name, category, result, status: "skipped", reason: "Komut zaten calisiyor." }
    }
    if (!isBaseValid) {
      return { offerId, name, category, result, status: "skipped", reason: "Gecerli fiyat yok." }
    }
    if (!Number.isFinite(multiplierNumber)) {
      return { offerId, name, category, result, status: "skipped", reason: "Gecerli katsayi yok." }
    }
    if (!Number.isFinite(result)) {
      return { offerId, name, category, result, status: "skipped", reason: "Sonuc hesaplanamadi." }
    }
    return { offerId, name, category, result, status: "ready", reason: "" }
  }
  const selectedFilteredOfferIds = useMemo(
    () =>
      sortedList
        .map((product) => String(product?.id ?? "").trim())
        .filter((offerId) => Boolean(offerId) && Boolean(priceEnabledByOffer?.[offerId])),
    [priceEnabledByOffer, sortedList],
  )
  const selectedPageOfferIds = useMemo(
    () =>
      paginatedList
        .map((product) => String(product?.id ?? "").trim())
        .filter((offerId) => Boolean(offerId) && Boolean(priceEnabledByOffer?.[offerId])),
    [paginatedList, priceEnabledByOffer],
  )
  const selectedPriceCount = useMemo(
    () => Object.values(selectedPriceOfferIds).filter(Boolean).length,
    [selectedPriceOfferIds],
  )
  const selectedBulkPriceProducts = useMemo(
    () =>
      allProducts.filter((product) => {
        const offerId = String(product?.id ?? "").trim()
        return Boolean(offerId) && Boolean(selectedPriceOfferIds?.[offerId])
      }),
    [allProducts, selectedPriceOfferIds],
  )
  const selectedBulkPriceCandidates = useMemo(
    () => selectedBulkPriceProducts.map((product) => buildBulkPriceCandidate(product)),
    [selectedBulkPriceProducts, priceDrafts, priceEnabledByOffer, priceCommandIsRunningByOffer],
  )
  const resumableBulkPriceCandidates = useMemo(
    () =>
      selectedBulkPriceCandidates.filter((item) => {
        if (item.status !== "ready") return false
        const persistedStatus = String(bulkPriceItemStatusByOffer?.[item.offerId]?.status ?? "")
          .trim()
          .toLowerCase()
        return BULK_PRICE_RESUMABLE_STATUSES.has(persistedStatus)
      }),
    [bulkPriceItemStatusByOffer, selectedBulkPriceCandidates],
  )
  const bulkPriceReadyCount = useMemo(
    () => selectedBulkPriceCandidates.filter((item) => item.status === "ready").length,
    [selectedBulkPriceCandidates],
  )
  const bulkPriceSkippedCount = Math.max(0, selectedBulkPriceCandidates.length - bulkPriceReadyCount)
  const bulkPriceResumeCount = resumableBulkPriceCandidates.length
  const isBulkPriceRunning = Boolean(bulkPriceCommandState.isRunning)
  const isBulkPriceCancelRequested = Boolean(bulkPriceCommandState.cancelRequested)
  const bulkPriceStatusLabel =
    bulkPriceCommandState.total > 0
      ? `Basari ${bulkPriceCommandState.success} / Hata ${bulkPriceCommandState.error}`
      : "Beklemede"
  useEffect(() => {
    bulkPriceCancelRequestedRef.current = isBulkPriceCancelRequested
  }, [isBulkPriceCancelRequested])
  useEffect(() => {
    if (!isBulkPriceModeOpen || !canViewPriceCommandLogs) return
    void loadBulkPriceCommandLogs()
  }, [canViewPriceCommandLogs, isBulkPriceModeOpen, loadBulkPriceCommandLogs])
  const areAllFilteredSelected =
    selectedFilteredOfferIds.length > 0 &&
    selectedFilteredOfferIds.every((offerId) => Boolean(selectedPriceOfferIds?.[offerId]))
  const areAllPageSelected =
    selectedPageOfferIds.length > 0 &&
    selectedPageOfferIds.every((offerId) => Boolean(selectedPriceOfferIds?.[offerId]))
  const canUseBulkPriceActions = canManagePrices && canViewPriceDetails
  const canUseBulkUsedDelete =
    canDeleteKeys && typeof onBulkDelete === "function" && typeof onLoadKeys === "function"
  const canRefreshAllStocks = typeof onLoadKeys === "function" && allProducts.length > 0
  const togglePriceOfferSelection = (offerId, nextSelected) => {
    const normalizedOfferId = String(offerId ?? "").trim()
    if (
      !normalizedOfferId ||
      isBulkPriceRunning ||
      !Boolean(priceEnabledByOffer?.[normalizedOfferId])
    ) {
      return
    }
    setSelectedPriceOfferIds((prev) => {
      const shouldSelect =
        typeof nextSelected === "boolean" ? nextSelected : !Boolean(prev?.[normalizedOfferId])
      if (shouldSelect) {
        return { ...prev, [normalizedOfferId]: true }
      }
      const next = { ...prev }
      delete next[normalizedOfferId]
      return next
    })
  }
  const selectBulkPriceOffers = (offerIds = []) => {
    if (isBulkPriceRunning) return
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(offerIds) ? offerIds : [])
          .map((offerId) => String(offerId ?? "").trim())
          .filter(Boolean),
      ),
    )
    if (normalizedIds.length === 0) return
    setSelectedPriceOfferIds((prev) => {
      const next = { ...prev }
      normalizedIds.forEach((offerId) => {
        if (!priceEnabledByOffer?.[offerId]) return
        next[offerId] = true
      })
      return next
    })
  }
  const clearSelectedPriceOffers = () => {
    if (isBulkPriceRunning) return
    setSelectedPriceOfferIds({})
  }
  const persistSavedPrices = async (entries = [], options = {}) => {
    const normalizedEntries = Array.isArray(entries) ? entries : []
    const savedRows = {}
    let savedCount = 0
    let processedCount = 0

    for (const entry of normalizedEntries) {
      const normalizedId = String(entry?.offerId ?? "").trim()
      const base = Number(entry?.base)
      const percent = Number(entry?.percent)
      const result = Number(entry?.result)
      if (!normalizedId || !Number.isFinite(base) || !Number.isFinite(percent) || !Number.isFinite(result)) {
        continue
      }
      let shouldSave = true
      if (typeof onSavePrice === "function") {
        shouldSave = await onSavePrice(normalizedId, base, percent, result)
      }
      processedCount += 1
      if (shouldSave) {
        savedRows[normalizedId] = { base, percent, result }
        savedCount += 1
      }
      if (typeof options?.onProgress === "function") {
        options.onProgress({
          processed: processedCount,
          total: normalizedEntries.length,
          saved: savedCount,
        })
      }
    }

    if (savedCount > 0) {
      setSavedPricesByOffer((prev) => ({
        ...prev,
        ...savedRows,
      }))
    }

    return savedCount
  }
  const handleCancelBulkPriceCommand = () => {
    if (!isBulkPriceRunning || bulkPriceCancelRequestedRef.current) return
    bulkPriceCancelRequestedRef.current = true
    setBulkPriceCommandState((prev) => ({
      ...prev,
      cancelRequested: true,
    }))
    appendBulkPriceCommandLog("error", "Iptal istendi. Mevcut urun tamamlaninca kuyruk duracak.")
  }
  const runBulkPriceCommands = async ({ resumeOnly = false } = {}) => {
    if (isBulkPriceRunning) return
    bulkPriceCancelRequestedRef.current = false
    if (!canUseBulkPriceActions) {
      toast.error("Toplu sonuc gonderme yetkiniz yok.")
      return
    }
    if (!String(automationWsUrl ?? "").trim()) {
      toast.error("Websocket adresi bulunamadi. Admin panelinden kaydedin.")
      return
    }
    if (selectedBulkPriceCandidates.length === 0) {
      toast.error("Once urun secin.")
      return
    }

    const resumableStatusByOffer = resumeOnly ? bulkPriceItemStatusByOffer : {}
    const candidateScope = resumeOnly
      ? selectedBulkPriceCandidates.filter((item) => {
          const normalizedStatus = String(resumableStatusByOffer?.[item.offerId]?.status ?? "")
            .trim()
            .toLowerCase()
          return BULK_PRICE_RESUMABLE_STATUSES.has(normalizedStatus)
        })
      : selectedBulkPriceCandidates

    if (resumeOnly && candidateScope.length === 0) {
      toast.error("Yeniden gonderilecek tamamlanmayan urun yok.")
      return
    }

    const readyItems = candidateScope.filter((item) => item.status === "ready")
    const skippedItems = candidateScope.filter((item) => item.status !== "ready")
    const selectedOfferIdSet = new Set(
      selectedBulkPriceCandidates.map((item) => String(item?.offerId ?? "").trim()).filter(Boolean),
    )
    const nextStatusByOffer = resumeOnly
      ? Object.entries(bulkPriceItemStatusByOffer).reduce((acc, [offerId, entry]) => {
          if (!selectedOfferIdSet.has(offerId)) return acc
          acc[offerId] = entry
          return acc
        }, {})
      : {}

    readyItems.forEach((item) => {
      nextStatusByOffer[item.offerId] = createBulkPriceItemStatusEntry("pending", item.name)
    })
    skippedItems.forEach((item) => {
      nextStatusByOffer[item.offerId] = createBulkPriceItemStatusEntry("skipped", item.name, item.reason)
    })

    const nextStatusCounts = countBulkPriceItemStatuses(nextStatusByOffer)

    if (readyItems.length === 0) {
      setBulkPriceItemStatusByOffer(nextStatusByOffer)
      if (!resumeOnly) {
        setBulkPriceCommandLogEntries([])
      }
      setBulkPriceCommandState(
        createEmptyBulkPriceCommandState({
          total: selectedBulkPriceCandidates.length,
          ready: 0,
          success: nextStatusCounts.success,
          error: nextStatusCounts.error,
          skipped: nextStatusCounts.skipped,
        }),
      )
      skippedItems.forEach((item) => {
        appendBulkPriceCommandLog("error", `${item.name} atlandi: ${item.reason}`)
      })
      toast.error(
        resumeOnly ? "Yeniden gonderilecek gecerli urun yok." : "Gonderilecek gecerli urun yok.",
      )
      return
    }

    setBulkPriceItemStatusByOffer(nextStatusByOffer)
    setBulkPriceCommandState(
      createEmptyBulkPriceCommandState({
        isRunning: true,
        cancelRequested: false,
        total: selectedBulkPriceCandidates.length,
        ready: readyItems.length,
        success: nextStatusCounts.success,
        error: nextStatusCounts.error,
        skipped: nextStatusCounts.skipped,
      }),
    )
    if (!resumeOnly) {
      setBulkPriceCommandLogEntries([])
    }
    appendBulkPriceCommandLog(
      "running",
      resumeOnly
        ? `Tamamlanmayan gonderim yeniden baslatildi. Secili=${selectedBulkPriceCandidates.length}, kalan=${candidateScope.length}, hazir=${readyItems.length}`
        : `Toplu gonderim basladi. Secili=${selectedBulkPriceCandidates.length}, hazir=${readyItems.length}, atlanacak=${skippedItems.length}`,
    )
    skippedItems.forEach((item) => {
      appendBulkPriceCommandLog("error", `${item.name} atlandi: ${item.reason}`)
    })

    const statusSnapshot = { ...nextStatusByOffer }
    let successCount = nextStatusCounts.success
    let errorCount = nextStatusCounts.error

    for (const item of readyItems) {
      if (bulkPriceCancelRequestedRef.current) {
        break
      }
      setBulkPriceItemStatusByOffer((prev) => ({
        ...prev,
        [item.offerId]: createBulkPriceItemStatusEntry("running", item.name),
      }))
      statusSnapshot[item.offerId] = createBulkPriceItemStatusEntry("running", item.name)
      setBulkPriceCommandState((prev) => ({
        ...prev,
        currentOfferId: item.offerId,
        currentName: item.name,
      }))
      appendBulkPriceCommandLog("running", `${item.name} gonderiliyor...`)
      try {
        await runPriceCommandAsync(
          {
            offerId: item.offerId,
            category: item.category,
            result: item.result,
          },
          {
            label: "Toplu Sonucu Gonder",
            backendKey: priceCommandBackendEntry?.key ?? PRICE_COMMAND_BACKEND_KEY,
            backendLabel: priceCommandBackendEntry?.label ?? PRICE_COMMAND_BACKEND_KEY,
            showToast: false,
          },
        )
        successCount += 1
        setBulkPriceItemStatusByOffer((prev) => ({
          ...prev,
          [item.offerId]: createBulkPriceItemStatusEntry("success", item.name),
        }))
        statusSnapshot[item.offerId] = createBulkPriceItemStatusEntry("success", item.name)
        setBulkPriceCommandState((prev) => ({
          ...prev,
          success: successCount,
        }))
        appendBulkPriceCommandLog("success", `${item.name} tamamlandi.`)
      } catch (error) {
        errorCount += 1
        const errorMessage = String(error?.message ?? "Bilinmeyen hata")
        setBulkPriceItemStatusByOffer((prev) => ({
          ...prev,
          [item.offerId]: createBulkPriceItemStatusEntry("error", item.name, errorMessage),
        }))
        statusSnapshot[item.offerId] = createBulkPriceItemStatusEntry("error", item.name, errorMessage)
        setBulkPriceCommandState((prev) => ({
          ...prev,
          error: errorCount,
        }))
        appendBulkPriceCommandLog(
          "error",
          `${item.name} hata verdi: ${errorMessage}`,
        )
      }

      if (bulkPriceCancelRequestedRef.current) {
        break
      }
    }

    const wasCancelled = bulkPriceCancelRequestedRef.current
    const remainingPendingCount = Object.values(statusSnapshot).reduce((count, entry) => {
      return count + (String(entry?.status ?? "").trim().toLowerCase() === "pending" ? 1 : 0)
    }, 0)

    setBulkPriceCommandState((prev) => ({
      ...prev,
      isRunning: false,
      cancelRequested: false,
      success: successCount,
      error: errorCount,
      currentOfferId: "",
      currentName: "",
    }))
    bulkPriceCancelRequestedRef.current = false
    if (wasCancelled || remainingPendingCount > 0) {
      appendBulkPriceCommandLog(
        "error",
        `Toplu gonderim iptal edildi. Kalan islem sayisi: ${Math.max(0, remainingPendingCount)}`,
      )
      toast.error(`Toplu gonderim durduruldu. Kalan=${Math.max(0, remainingPendingCount)}`)
    } else if (errorCount > 0) {
      toast.error(`Toplu gonderim tamamlandi. Basarili=${successCount}, Hata=${errorCount}`)
    } else {
      toast.success(`Toplu gonderim tamamlandi. Basarili=${successCount}`)
    }
  }
  const handleBulkPriceCommandRun = async () => {
    await runBulkPriceCommands({ resumeOnly: false })
  }
  const handleResumeBulkPriceCommandRun = async () => {
    await runBulkPriceCommands({ resumeOnly: true })
  }
  const toggleOfferOpen = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setConfirmKeyTarget(null)
    setOpenOffers((prev) => {
      const nextOpen = !prev[normalizedId]
      const isStockEnabled = Boolean(stockEnabledByOffer?.[normalizedId])
      if (nextOpen && isStockEnabled && typeof onLoadKeys === "function") {
        onLoadKeys(normalizedId)
      }
      return { ...prev, [normalizedId]: nextOpen }
    })
  }
  const toggleStarred = (offerId) => {
    if (typeof onToggleOfferStar !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    onToggleOfferStar(normalizedId)
  }
  const handleStockModalScroll = (event) => {
    if (!stockModalLineRef.current) return
    stockModalLineRef.current.scrollTop = event.target.scrollTop
  }
  const openStockModal = (offerId, name) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setStockModalDraft("")
    setStockModalTarget({ id: normalizedId, name: String(name ?? "").trim() })
  }
  const handleStockModalClose = () => {
    setStockModalDraft("")
    setStockModalTarget(null)
  }
  const handleStockModalSave = async () => {
    if (!stockModalTarget || typeof onAddKeys !== "function") return
    const ok = await onAddKeys(stockModalTarget.id, stockModalDraft)
    if (ok) {
      handleStockModalClose()
    }
  }
  const handlePriceToggle = async (offerId) => {
    if (!canTogglePrice) return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const nextEnabled = !priceEnabledByOffer?.[normalizedId]
    if (typeof onTogglePrice === "function") {
      const ok = await onTogglePrice(normalizedId, nextEnabled)
      if (!ok) return
    }
    setPriceEnabledByOffer((prev) => ({ ...prev, [normalizedId]: nextEnabled }))
  }
  const handleAutomationToggle = async (offerId) => {
    if (!canManageAutomationTargets || typeof onSaveAutomation !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const nextEnabled = !Boolean(automationEnabledByOffer?.[normalizedId])
    const saved = await onSaveAutomation(normalizedId, { enabled: nextEnabled })
    if (!saved) return
    setAutomationEnabledByOffer((prev) => ({ ...prev, [normalizedId]: Boolean(saved.enabled) }))
    if (!Boolean(saved.enabled)) {
      setActivePanelByOffer((prev) => {
        if (prev?.[normalizedId] !== "automation") return prev
        return { ...prev, [normalizedId]: "inventory" }
      })
    }
  }
  const getAutomationTargets = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return []
    return normalizeAutomationTargetList(automationTargetsByOffer?.[normalizedId])
  }
  const getAutomationTargetDraft = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return { url: "", backend: "" }
    const draft = automationTargetDraftsByOffer?.[normalizedId]
    const draftBackend = String(draft?.backend ?? "").trim()
    const fallbackBackend =
      String(getAutomationTargets(normalizedId)[0]?.backend ?? "").trim() ||
      String(stockFetchAutomationBackendOptions?.[0]?.key ?? "").trim()
    return {
      url: String(draft?.url ?? ""),
      backend: draftBackend || fallbackBackend,
    }
  }
  const handleAutomationTargetDraftChange = (offerId, field, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    if (!["url", "backend"].includes(field)) return
    setAutomationTargetDraftsByOffer((prev) => ({
      ...prev,
      [normalizedId]: {
        ...(prev?.[normalizedId] ?? { url: "", backend: "" }),
        [field]: field === "url" ? String(value ?? "") : String(value ?? "").trim(),
      },
    }))
  }
  const handleAutomationTargetSave = async (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId || !canManageAutomationTargets || typeof onAddAutomationTarget !== "function") return
    const draft = getAutomationTargetDraft(normalizedId)
    const backend = String(draft.backend ?? "").trim()
    const url = String(draft.url ?? "").trim()
    if (!url) {
      toast.error("URL girin.")
      return
    }
    if (!backend) {
      toast.error("Backend map secin.")
      return
    }

    const current = getAutomationTargets(normalizedId)
    if (current.some((entry) => entry.backend === backend && entry.url === url)) {
      toast.error("Bu URL ve backend map zaten ekli.")
      return
    }

    setAutomationTargetSavingByOffer((prev) => ({ ...prev, [normalizedId]: true }))
    try {
      const saved = await onAddAutomationTarget(normalizedId, { backend, url })
      if (!saved) return
      const savedTarget = normalizeAutomationTarget(saved)
      if (!savedTarget?.id) return
      setAutomationTargetsByOffer((prev) => {
        const rows = normalizeAutomationTargetList(prev?.[normalizedId])
        const withoutDuplicate = rows.filter((entry) => entry.id !== savedTarget.id)
        return {
          ...prev,
          [normalizedId]: [...withoutDuplicate, { ...savedTarget, id: savedTarget.id }],
        }
      })
      setAutomationTargetDraftsByOffer((prev) => ({
        ...prev,
        [normalizedId]: {
          url: "",
          backend,
        },
      }))
      setAutomationSelectedTargetByOffer((prev) => ({
        ...prev,
        [normalizedId]: savedTarget.id,
      }))
    } finally {
      setAutomationTargetSavingByOffer((prev) => {
        const next = { ...prev }
        delete next[normalizedId]
        return next
      })
    }
  }
  const handleAutomationTargetSelect = (offerId, targetId) => {
    const normalizedId = String(offerId ?? "").trim()
    const normalizedTargetId = String(targetId ?? "").trim()
    if (!normalizedId || !normalizedTargetId) return
    setAutomationSelectedTargetByOffer((prev) => ({ ...prev, [normalizedId]: normalizedTargetId }))
  }
  const handleAutomationTargetDelete = async (offerId, targetId) => {
    const normalizedId = String(offerId ?? "").trim()
    const normalizedTargetId = String(targetId ?? "").trim()
    if (
      !normalizedId ||
      !normalizedTargetId ||
      !canManageAutomationTargets ||
      typeof onDeleteAutomationTarget !== "function"
    ) {
      return
    }
    const deletingKey = `${normalizedId}:${normalizedTargetId}`
    setAutomationTargetDeletingByOffer((prev) => ({ ...prev, [deletingKey]: true }))
    try {
      const ok = await onDeleteAutomationTarget(normalizedId, normalizedTargetId)
      if (!ok) return
      setAutomationTargetsByOffer((prev) => {
        const current = normalizeAutomationTargetList(prev?.[normalizedId])
        const nextRows = current.filter((entry) => entry.id !== normalizedTargetId)
        const next = { ...prev }
        if (nextRows.length > 0) {
          next[normalizedId] = nextRows
        } else {
          delete next[normalizedId]
        }
        return next
      })
      setAutomationSelectedTargetByOffer((prev) => {
        const currentSelection = String(prev?.[normalizedId] ?? "").trim()
        if (currentSelection !== normalizedTargetId) return prev
        const rows = getAutomationTargets(normalizedId).filter((entry) => entry.id !== normalizedTargetId)
        const nextSelection = rows[0]?.id || ""
        return {
          ...prev,
          [normalizedId]: nextSelection,
        }
      })
    } finally {
      setAutomationTargetDeletingByOffer((prev) => {
        const next = { ...prev }
        delete next[deletingKey]
        return next
      })
    }
  }
  const handleAutomationTargetStarToggle = async (offerId, targetId, nextStarred) => {
    const normalizedId = String(offerId ?? "").trim()
    const normalizedTargetId = String(targetId ?? "").trim()
    if (
      !normalizedId ||
      !normalizedTargetId ||
      !canStarAutomationTargets ||
      typeof onToggleAutomationTargetStar !== "function"
    ) {
      return
    }
    const actionKey = `${normalizedId}:${normalizedTargetId}`
    setAutomationTargetStarringByOffer((prev) => ({ ...prev, [actionKey]: true }))
    try {
      const saved = await onToggleAutomationTargetStar(normalizedId, normalizedTargetId, Boolean(nextStarred))
      if (!saved) return
      setAutomationTargetsByOffer((prev) => {
        const rows = normalizeAutomationTargetList(prev?.[normalizedId]).map((entry) =>
          entry.id === normalizedTargetId ? { ...entry, starred: Boolean(saved.starred) } : entry,
        )
        return {
          ...prev,
          [normalizedId]: rows,
        }
      })
    } finally {
      setAutomationTargetStarringByOffer((prev) => {
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    }
  }
  const handlePriceDraftChange = (offerId, field, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setPriceDrafts((prev) => ({
      ...prev,
      [normalizedId]: {
        ...(prev[normalizedId] ?? { base: "", percent: DEFAULT_PRICE_PERCENT }),
        [field]: value,
      },
    }))
  }
  const handlePriceMultiplierChange = (offerId, multiplierValue) => {
    const percentValue = formatPercentDraftValue(multiplierToPercent(multiplierValue))
    if (!percentValue) return
    handlePriceDraftChange(offerId, "percent", percentValue)
  }
  const handlePriceSave = async (offerId, base, percent, result) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const normalizedPayload = normalizePricePayloadValues({ base, percent, result })
    if (
      !Number.isFinite(normalizedPayload.base) ||
      !Number.isFinite(normalizedPayload.percent) ||
      !Number.isFinite(normalizedPayload.result)
    ) {
      toast.error("Gecerli bir fiyat girin. Ornek: 15.53")
      return
    }
    if (typeof onSavePrice === "function") {
      const ok = await onSavePrice(
        normalizedId,
        normalizedPayload.base,
        normalizedPayload.percent,
        normalizedPayload.result,
      )
      if (!ok) return
    }
    setSavedPricesByOffer((prev) => ({
      ...prev,
      [normalizedId]: {
        base: normalizedPayload.base,
        percent: normalizedPayload.percent,
        result: normalizedPayload.result,
      },
    }))
    toast.success("Fiyat kaydedildi.")
  }
  const handleBulkCountChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const cleaned = String(value ?? "").replace(/\D/g, "")
    setBulkCounts((prev) => ({ ...prev, [normalizedId]: cleaned }))
  }
  const handleBulkCopy = (offerId, markUsed) => {
    if (typeof onBulkCopy !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const rawCount = bulkCounts[normalizedId]
    onBulkCopy(normalizedId, rawCount, { markUsed })
  }
  const handleBulkDelete = (offerId, list) => {
    if (typeof onBulkDelete !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const availableList = Array.isArray(list) ? list : []
    const rawCount = bulkCounts[normalizedId]
    const count = Math.max(1, Number(rawCount ?? availableList.length) || availableList.length)
    const selected = availableList.slice(0, count)
    if (selected.length === 0) {
      toast.error("Silinecek stok yok.")
      return
    }
    selected.forEach((item) => triggerKeyFade(item?.id))
    wait(180).then(() => onBulkDelete(normalizedId, selected.map((item) => item.id)))
  }
  const handleUsedBulkDownload = (offerId, productName, list) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return

    const selected = Array.isArray(list)
      ? list
          .map((item) => String(item?.code ?? "").trim())
          .filter(Boolean)
      : []
    if (selected.length === 0) {
      toast.error("Indirilecek kullanilan stok yok.")
      return
    }

    const filenameBase =
      normalizeDownloadName(productName) || normalizeDownloadName(normalizedId) || "kullanilan-stoklar"
    const downloadUrl = URL.createObjectURL(new Blob([selected.join("\r\n")], { type: "text/plain;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = downloadUrl
    anchor.download = `${filenameBase}-kullanilan-stoklar-${formatDownloadDateToken()}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(downloadUrl)
    toast.success(`${selected.length} kullanilan stok indirildi.`)
  }
  const armBulkUsedDeleteConfirm = () => {
    setConfirmBulkUsedDelete(true)
    if (bulkUsedDeleteConfirmTimerRef.current) {
      clearTimeout(bulkUsedDeleteConfirmTimerRef.current)
    }
    bulkUsedDeleteConfirmTimerRef.current = setTimeout(() => {
      setConfirmBulkUsedDelete(false)
      bulkUsedDeleteConfirmTimerRef.current = null
    }, 2400)
  }
  const handleToolbarBulkUsedDelete = async () => {
    if (!canUseBulkUsedDelete || isBulkUsedDeleteRunning) return
    if (toolbarUsedStockCount <= 0) {
      toast.error("Temizlenecek kullanilan stok yok.")
      return
    }
    if (!confirmBulkUsedDelete) {
      armBulkUsedDeleteConfirm()
      return
    }

    setConfirmBulkUsedDelete(false)
    if (bulkUsedDeleteConfirmTimerRef.current) {
      clearTimeout(bulkUsedDeleteConfirmTimerRef.current)
      bulkUsedDeleteConfirmTimerRef.current = null
    }

    setIsBulkUsedDeleteRunning(true)
    try {
      let deletedStockCount = 0
      let affectedOfferCount = 0
      let failedOfferCount = 0

      for (const product of allProducts) {
        const offerId = String(product?.id ?? "").trim()
        if (!offerId) continue

        const loadedKeys = Array.isArray(keysByOffer?.[offerId]) ? keysByOffer[offerId] : null
        const resolvedKeys = loadedKeys ?? (await onLoadKeys(offerId, { force: true, silent: true }))
        if (resolvedKeys === null) {
          failedOfferCount += 1
          continue
        }
        const usedKeys = Array.isArray(resolvedKeys)
          ? resolvedKeys.filter((item) => String(item?.status ?? "").trim().toLowerCase() === "used")
          : []
        if (usedKeys.length === 0) continue

        usedKeys.forEach((item) => triggerKeyFade(item?.id))
        await wait(180)
        const ok = await onBulkDelete(
          offerId,
          usedKeys.map((item) => item.id),
          { silent: true },
        )
        if (ok === false) {
          failedOfferCount += 1
          continue
        }

        deletedStockCount += usedKeys.length
        affectedOfferCount += 1
      }

      if (deletedStockCount === 0) {
        toast.error("Temizlenecek kullanilan stok bulunamadi.")
        return
      }
      if (failedOfferCount > 0) {
        toast.success(
          `${deletedStockCount} kullanilan stok temizlendi (${affectedOfferCount} urun, ${failedOfferCount} hata).`,
          {
            duration: 2200,
            position: "top-right",
          },
        )
      } else {
        toast.success(`${deletedStockCount} kullanilan stok temizlendi (${affectedOfferCount} urun).`, {
          duration: 1800,
          position: "top-right",
        })
      }
    } finally {
      setIsBulkUsedDeleteRunning(false)
    }
  }
  const handleToolbarRefreshAllStocks = async () => {
    if (!canRefreshAllStocks || isBulkStockRefreshRunning) return
    const offerIds = Array.from(
      new Set(
        allProducts
          .map((product) => String(product?.id ?? "").trim())
          .filter(Boolean),
      ),
    )
    if (offerIds.length === 0) {
      toast.error("Yenilenecek urun stogu yok.")
      return
    }

    setIsBulkStockRefreshRunning(true)
    setRefreshingOffers((prev) => {
      const next = { ...prev }
      offerIds.forEach((offerId) => {
        next[offerId] = true
      })
      return next
    })

    try {
      let failedOfferCount = 0
      const batchSize = 6
      for (let index = 0; index < offerIds.length; index += batchSize) {
        const batch = offerIds.slice(index, index + batchSize)
        const results = await Promise.all(
          batch.map((offerId) => onLoadKeys(offerId, { force: true, silent: true })),
        )
        failedOfferCount += results.filter((result) => result === null).length
      }

      if (failedOfferCount > 0) {
        toast.success(
          `${offerIds.length - failedOfferCount} urunun stogu yenilendi (${failedOfferCount} hata).`,
          {
            duration: 2200,
            position: "top-right",
          },
        )
      } else {
        toast.success(`${offerIds.length} urunun stogu yenilendi.`, {
          duration: 1800,
          position: "top-right",
        })
      }
    } finally {
      setRefreshingOffers((prev) => {
        const next = { ...prev }
        offerIds.forEach((offerId) => {
          next[offerId] = false
        })
        return next
      })
      setIsBulkStockRefreshRunning(false)
    }
  }
  const handleGroupDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setGroupDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }
  const handleGroupCreate = async (offerId) => {
    if (typeof onCreateGroup !== "function" || typeof onAssignGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = groupDrafts[normalizedId] ?? ""
    const created = await onCreateGroup(draft)
    if (!created) return
    setGroupDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
    setConfirmGroupDelete(null)
    onAssignGroup(normalizedId, created.id)
  }
  const handleGroupAssign = (offerId, groupId) => {
    if (typeof onAssignGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setConfirmGroupDelete(null)
    onAssignGroup(normalizedId, groupId)
  }
  const handleGroupDelete = (offerId, groupId) => {
    if (typeof onDeleteGroup !== "function") return
    const normalizedOfferId = String(offerId ?? "").trim()
    const normalizedGroupId = String(groupId ?? "").trim()
    if (!normalizedOfferId || !normalizedGroupId) return
    if (confirmGroupDelete === normalizedGroupId) {
      setConfirmGroupDelete(null)
      onDeleteGroup(normalizedGroupId)
      return
    }
    setConfirmGroupDelete(normalizedGroupId)
    toast("Grubu silmek icin tekrar tikla", { position: "top-right" })
  }
  const setActivePanel = (offerId, panel) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setActivePanelByOffer((prev) => {
      const current = prev[normalizedId]
      const next = current === panel ? "none" : panel
      return { ...prev, [normalizedId]: next }
    })
  }
  const handleMessageTemplateDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setMessageTemplateDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }
  const handleMessageGroupDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setMessageGroupDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }
  const handleMessageGroupCreate = async (offerId) => {
    if (typeof onCreateMessageGroup !== "function" || typeof onAssignMessageGroup !== "function") {
      return
    }
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = String(messageGroupDrafts[normalizedId] ?? "").trim()
    if (!draft) return
    const created = await onCreateMessageGroup(draft)
    if (!created) return
    setMessageGroupDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
    onAssignMessageGroup(normalizedId, created.id)
  }
  const handleMessageGroupAssign = (offerId, value) => {
    if (typeof onAssignMessageGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setConfirmMessageGroupDelete(null)
    onAssignMessageGroup(normalizedId, value)
  }
  const handleMessageGroupDelete = (groupId) => {
    if (!canDeleteMessageGroup) return
    const normalizedGroupId = String(groupId ?? "").trim()
    if (!normalizedGroupId) return
    if (confirmMessageGroupDelete === normalizedGroupId) {
      setConfirmMessageGroupDelete(null)
      onDeleteMessageGroup(normalizedGroupId)
      return
    }
    setConfirmMessageGroupDelete(normalizedGroupId)
    toast("Mesaj grubunu silmek icin tekrar tikla", { position: "top-right" })
  }
  const handleMessageTemplateAdd = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const selected = String(messageTemplateDrafts[normalizedId] ?? "").trim()
    if (!selected) return
    const groupId = String(messageGroupAssignments?.[normalizedId] ?? "").trim()
    if (groupId) {
      if (typeof onAddMessageGroupTemplate !== "function") return
      const ok = onAddMessageGroupTemplate(groupId, selected)
      if (!ok) return
    } else {
      if (typeof onAddMessageTemplate !== "function") return
      const ok = onAddMessageTemplate(normalizedId, selected)
      if (!ok) return
    }
    setMessageTemplateDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
  }
  const handleMessageTemplateRemove = (offerId, label) => {
    if (!canRemoveMessageTemplate) return
    const normalizedId = String(offerId ?? "").trim()
    const normalizedLabel = String(label ?? "").trim()
    if (!normalizedId || !normalizedLabel) return
    const groupId = String(messageGroupAssignments?.[normalizedId] ?? "").trim()
    const target = `${normalizedId}:${groupId || "independent"}:${normalizedLabel}`
    if (confirmMessageTemplateDelete !== target) {
      setConfirmMessageTemplateDelete(target)
      return
    }
    setConfirmMessageTemplateDelete(null)
    if (groupId) {
      if (typeof onRemoveMessageGroupTemplate !== "function") return
      onRemoveMessageGroupTemplate(groupId, normalizedLabel)
      return
    }
    if (typeof onRemoveMessageTemplate !== "function") return
    onRemoveMessageTemplate(normalizedId, normalizedLabel)
  }
  const handleMessageTemplateCopy = async (label) => {
    const normalizedLabel = String(label ?? "").trim()
    if (!normalizedLabel) return
    const message = templates.find((tpl) => tpl.label === normalizedLabel)?.value
    const trimmedMessage = String(message ?? "").trim()
    if (!trimmedMessage) {
      toast.error("Mesaj şablonu bulunamadı.")
      return
    }
    try {
      await navigator.clipboard.writeText(trimmedMessage)
      toast.success("Mesaj kopyalandı", { duration: 1500, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamadı")
    }
  }
  const handleStockToggle = (offerId) => {
    if (!canManageStock) return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const nextEnabled = !Boolean(stockEnabledByOffer?.[normalizedId])
    onToggleStock(normalizedId, nextEnabled)
    if (nextEnabled && openOffers[normalizedId] && typeof onLoadKeys === "function") {
      onLoadKeys(normalizedId)
    }
  }
  const handleKeyDelete = (offerId, keyId) => {
    if (typeof onDeleteKey !== "function") return
    const normalizedOfferId = String(offerId ?? "").trim()
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedOfferId || !normalizedKeyId) return
    const target = `${normalizedOfferId}-${normalizedKeyId}`
    if (confirmKeyTarget === target) {
      setConfirmKeyTarget(null)
      triggerKeyFade(normalizedKeyId)
      wait(180).then(() => onDeleteKey(normalizedOfferId, normalizedKeyId))
      return
    }
    setConfirmKeyTarget(target)
  }
  const handleKeyStatusUpdate = async (offerId, keyId, nextStatus) => {
    if (typeof onUpdateKeyStatus !== "function") return
    const normalizedOfferId = String(offerId ?? "").trim()
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedOfferId || !normalizedKeyId) return
    triggerKeyFade(normalizedKeyId)
    await wait(180)
    onUpdateKeyStatus(normalizedOfferId, normalizedKeyId, nextStatus)
  }
  const handleKeyCopy = (code) => {
    if (typeof onCopyKey !== "function") return
    onCopyKey(code)
  }
  const handleKeyEditStart = (keyId, code) => {
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedKeyId) return
    setEditingKeys((prev) => ({ ...prev, [normalizedKeyId]: String(code ?? "") }))
  }
  const handleKeyEditChange = (keyId, value) => {
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedKeyId) return
    setEditingKeys((prev) => ({ ...prev, [normalizedKeyId]: value }))
  }
  const handleKeyEditCancel = (keyId) => {
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedKeyId) return
    setEditingKeys((prev) => {
      const next = { ...prev }
      delete next[normalizedKeyId]
      return next
    })
  }
  const handleKeyEditSave = async (offerId, keyId) => {
    if (typeof onUpdateKeyCode !== "function") return
    const normalizedOfferId = String(offerId ?? "").trim()
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedOfferId || !normalizedKeyId) return
    const draft = editingKeys[normalizedKeyId]
    const trimmed = String(draft ?? "").trim()
    if (!trimmed) {
      toast.error("Stok kodu bos olamaz.")
      return
    }
    setSavingKeys((prev) => ({ ...prev, [normalizedKeyId]: true }))
    const ok = await onUpdateKeyCode(normalizedOfferId, normalizedKeyId, trimmed)
    setSavingKeys((prev) => {
      const next = { ...prev }
      delete next[normalizedKeyId]
      return next
    })
    if (ok) handleKeyEditCancel(normalizedKeyId)
  }
  const handleKeysRefresh = (offerId) => {
    if (typeof onLoadKeys !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    onLoadKeys(normalizedId, { force: true })
    toast("Stoklar yenileniyor...", { duration: 1200, position: "top-right" })
  }
  const handleOfferRefresh = async (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setRefreshingOffers((prev) => ({ ...prev, [normalizedId]: true }))
    const startedAt = Date.now()
    try {
      if (typeof onRefreshOffer === "function") {
        await onRefreshOffer(normalizedId)
      } else {
        handleKeysRefresh(normalizedId)
      }
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < 450) {
        await new Promise((resolve) => setTimeout(resolve, 450 - elapsed))
      }
      setRefreshingOffers((prev) => ({ ...prev, [normalizedId]: false }))
    }
  }
  const handleOfferDeleteWithConfirm = async (offerId) => {
    if (!canDeleteOffers || typeof onDeleteOffer !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    if (confirmOfferDelete === normalizedId) {
      setConfirmOfferDelete(null)
      const ok = await onDeleteOffer(normalizedId)
      if (ok) {
        setOpenOffers((prev) => {
          const next = { ...prev }
          delete next[normalizedId]
          return next
        })
      }
      return
    }
    setConfirmOfferDelete(normalizedId)
    toast("Silmek icin tekrar tikla", { duration: 1400, position: "top-right" })
  }
  useEffect(() => {
    if (!categories.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey(categories[0]?.key ?? "items")
    }
  }, [activeCategoryKey, categories])
  useEffect(() => {
    setPage(1)
  }, [activeCategoryKey, normalizedQuery])
  useEffect(() => {
    setOpenOffers({})
  }, [allProducts.length])
  useEffect(() => {
    if (groupAssignments !== prevGroupAssignments.current) {
      const nextAssignments = groupAssignments ?? {}
      setGroupSelectionDrafts((prev) => {
        const next = { ...prev }
        Object.entries(next).forEach(([offerId, draftValue]) => {
          const assigned = String(nextAssignments?.[offerId] ?? "").trim()
          const normalizedDraft = String(draftValue ?? "").trim()
          if (normalizedDraft === assigned) {
            delete next[offerId]
          }
        })
        return next
      })
      prevGroupAssignments.current = groupAssignments
    }
  }, [groupAssignments])
  useEffect(() => {
    if (messageGroupAssignments !== prevMessageGroupAssignments.current) {
      const nextAssignments = messageGroupAssignments ?? {}
      setMessageGroupSelectionDrafts((prev) => {
        const next = { ...prev }
        Object.entries(next).forEach(([offerId, draftValue]) => {
          const assigned = String(nextAssignments?.[offerId] ?? "").trim()
          const normalizedDraft = String(draftValue ?? "").trim()
          if (normalizedDraft === assigned) {
            delete next[offerId]
          }
        })
        return next
      })
      prevMessageGroupAssignments.current = messageGroupAssignments
    }
  }, [messageGroupAssignments])
  useEffect(() => {
    const defaultBackend = String(stockFetchAutomationBackendOptions?.[0]?.key ?? "").trim()
    setAutomationTargetDraftsByOffer((prev) => {
      const next = { ...prev }
      Object.entries(next).forEach(([offerId, draft]) => {
        const backend = String(draft?.backend ?? "").trim()
        if (backend) return
        const rows = normalizeAutomationTargetList(automationTargetsByOffer?.[offerId])
        const fallbackBackend = String(rows[0]?.backend ?? "").trim() || defaultBackend
        if (!fallbackBackend) return
        next[offerId] = {
          url: String(draft?.url ?? ""),
          backend: fallbackBackend,
        }
      })
      return next
    })
    setAutomationSelectedTargetByOffer((prev) => {
      const next = { ...prev }
      const allOfferIds = new Set([
        ...Object.keys(next),
        ...Object.keys(automationTargetsByOffer || {}),
      ])
      allOfferIds.forEach((offerId) => {
        const rows = normalizeAutomationTargetList(automationTargetsByOffer?.[offerId])
        if (rows.length === 0) {
          delete next[offerId]
          return
        }
        const current = String(next?.[offerId] ?? "").trim()
        if (!current || !rows.some((row) => row.id === current)) {
          next[offerId] = rows[0].id
        }
      })
      return next
    })
  }, [automationTargetsByOffer, stockFetchAutomationBackendOptions])
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])
  useEffect(() => {
    if (!automationResultPopup.isOpen) {
      setIsPopupValueEditing(false)
      setPopupValueDraft("")
      if (popupValueCopyTimerRef.current) {
        window.clearTimeout(popupValueCopyTimerRef.current)
        popupValueCopyTimerRef.current = null
      }
      return
    }
    if (!isPopupValueEditing) {
      setPopupValueDraft(String(automationResultPopup.value ?? ""))
    }
  }, [automationResultPopup.isOpen, automationResultPopup.value, isPopupValueEditing])
  useEffect(() => {
    if (!isPopupValueEditing) return
    popupValueEditorRef.current?.focus()
    popupValueEditorRef.current?.select?.()
  }, [isPopupValueEditing])
  useEffect(() => {
    return () => {
      if (popupValueCopyTimerRef.current) {
        window.clearTimeout(popupValueCopyTimerRef.current)
        popupValueCopyTimerRef.current = null
      }
    }
  }, [])
  const copyPopupValueToClipboard = async () => {
    const valueToCopy = String(automationResultPopup.value || "-")
    try {
      await navigator.clipboard.writeText(valueToCopy)
      toast.success("Sonuc kopyalandi", { position: "top-right" })
    } catch {
      toast.error("Sonuc kopyalanamadi", { position: "top-right" })
    }
  }
  const schedulePopupValueCopy = () => {
    if (isPopupValueEditing) return
    if (popupValueCopyTimerRef.current) {
      window.clearTimeout(popupValueCopyTimerRef.current)
      popupValueCopyTimerRef.current = null
    }
    popupValueCopyTimerRef.current = window.setTimeout(() => {
      popupValueCopyTimerRef.current = null
      void copyPopupValueToClipboard()
    }, 220)
  }
  const startPopupValueEditing = () => {
    if (popupValueCopyTimerRef.current) {
      window.clearTimeout(popupValueCopyTimerRef.current)
      popupValueCopyTimerRef.current = null
    }
    setPopupValueDraft(String(automationResultPopup.value ?? ""))
    setIsPopupValueEditing(true)
  }
  const cancelPopupValueEditing = () => {
    setPopupValueDraft(String(automationResultPopup.value ?? ""))
    setIsPopupValueEditing(false)
  }
  const savePopupValueEditing = () => {
    setAutomationResultPopup((prev) => ({
      ...prev,
      value: String(popupValueDraft ?? ""),
    }))
    setIsPopupValueEditing(false)
  }
  const handlePopupAddToStock = async (status = "available") => {
    if (typeof onAddKeys !== "function") {
      toast.error("Stoga ekleme islemi kullanilamiyor.")
      return
    }

    const offerId = String(automationResultPopup.offerId ?? "").trim()
    const normalizedStatus = String(status ?? "").trim().toLowerCase() === "used" ? "used" : "available"
    const rawValueToAdd = isPopupValueEditing
      ? String(popupValueDraft ?? "")
      : String(automationResultPopup.value ?? "")
    const valueToAdd = String(rawValueToAdd)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim()
    if (!offerId) {
      toast.error("Aktif urun bulunamadi.")
      return
    }
    if (!valueToAdd || valueToAdd === "-") {
      toast.error("Eklenecek deger bulunamadi.")
      return
    }
    if (isPopupValueEditing) {
      setAutomationResultPopup((prev) => ({
        ...prev,
        value: rawValueToAdd,
      }))
      setIsPopupValueEditing(false)
    }

    setPopupStockAddMode(normalizedStatus)
    try {
      const ok = await onAddKeys(offerId, valueToAdd, { status: normalizedStatus })
      if (!ok) return
      appendAutomationRunLog(
        offerId,
        "success",
        normalizedStatus === "used" ? "Kullanilan stoga eklendi: 1 satir" : "Stoga eklendi: 1 satir",
      )
      setAutomationResultPopup((prev) => ({
        ...prev,
        isOpen: false,
      }))
    } finally {
      setPopupStockAddMode("")
    }
  }
  if (isLoading) {
    return <ProductsSkeleton panelClass={panelClass} />
  }
  const resultModalContent = automationResultPopup.isOpen ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/20 text-emerald-200">
            <CheckIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Islem Basarili
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {automationResultPopup.title || "Stok çek"} tamamlandi.
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Sonuc: <span className="text-emerald-100">{automationResultPopup.backend || "-"}</span>
            </p>
          </div>
        </div>

        <div
          className={`mt-4 rounded-xl border border-white/10 bg-black/25 p-3 ${
            isPopupValueEditing ? "" : "cursor-copy"
          }`}
          title={isPopupValueEditing ? "Duzenleme modu" : "Tek tikla kopyala, cift tikla duzenle"}
          onClick={() => {
            schedulePopupValueCopy()
          }}
          onDoubleClick={(event) => {
            event.preventDefault()
            if (isPopupValueEditing) return
            startPopupValueEditing()
          }}
        >
          {isPopupValueEditing ? (
            <div className="space-y-2">
              <textarea
                ref={popupValueEditorRef}
                value={popupValueDraft}
                onChange={(event) => setPopupValueDraft(event.target.value)}
                rows={6}
                className="w-full resize-y rounded-md border border-white/15 bg-ink-950/70 px-2.5 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                placeholder="Sonuc degeri"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault()
                    savePopupValueEditing()
                    return
                  }
                  if (event.key === "Escape") {
                    event.preventDefault()
                    cancelPopupValueEditing()
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/35 hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation()
                    cancelPopupValueEditing()
                  }}
                >
                  Iptal
                </button>
                <button
                  type="button"
                  className="rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
                  onClick={(event) => {
                    event.stopPropagation()
                    savePopupValueEditing()
                  }}
                >
                  Kaydet
                </button>
              </div>
            </div>
          ) : (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
              {automationResultPopup.value || "-"}
            </pre>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Tek tikla kopyala, cift tikla duzenle</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-sky-300/70 bg-sky-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void handlePopupAddToStock("available")
              }}
              disabled={Boolean(popupStockAddMode)}
            >
              {popupStockAddMode === "available" ? "EKLENIYOR..." : "Stoga Ekle"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void handlePopupAddToStock("used")
              }}
              disabled={Boolean(popupStockAddMode)}
            >
              {popupStockAddMode === "used" ? "EKLENIYOR..." : "Kullanilan Stoga Ekle"}
            </button>
          </div>
          <button
            type="button"
            className="rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25"
            onClick={() =>
              setAutomationResultPopup((prev) => ({
                ...prev,
                isOpen: false,
              }))
            }
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  ) : null
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Ürün listesi
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Ürün adlarını gör ve filtrele.
            </p>
          </div>
          <div className="w-full md:max-w-[760px]">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Toplam urun
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">{productStats.totalOffers}</p>
                  <p className="text-[11px] text-slate-400">Katalogdaki teklifler</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(59,130,246,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Stok acik
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">{productStats.stockEnabled}</p>
                  <p className="text-[11px] text-slate-400">Stok takibi acik urun</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Toplam stok
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">{productStats.totalStock}</p>
                  <p className="text-[11px] text-slate-400">Kayitli anahtar</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(245,158,11,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Kullanilan stok
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">{productStats.usedStock}</p>
                  <p className="text-[11px] text-slate-400">Isaretlenen anahtar</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-3 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(20,184,166,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Otomasyon acik
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">{productStats.automationEnabled}</p>
                  <p className="text-[11px] text-slate-400">Aktif stok cek urunu - {automationWsSummary.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className={`${panelClass} bg-ink-900/80`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Kategoriler
            </p>
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-slate-100"
              title={isCategoryMenuOpen ? "Kategori menusu kapat" : "Kategori menusu ac"}
              aria-label={isCategoryMenuOpen ? "Kategori menusu kapat" : "Kategori menusu ac"}
              aria-expanded={isCategoryMenuOpen}
            >
              <ChevronUpIcon
                aria-hidden="true"
                className={`h-4 w-4 transition-transform ${isCategoryMenuOpen ? "" : "rotate-180"}`}
              />
            </button>
          </div>
          {isCategoryMenuOpen ? (
            <div className="mt-3 space-y-1.5">
              {categories.map((category) => {
                const isActive = activeCategoryKey === category.key
                const categoryCount = category.key === "missing" ? missingTotal : category.items.length
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      setActiveCategoryKey(category.key)
                      setPage(1)
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                      isActive
                        ? "border-accent-400/40 bg-accent-500/10 text-slate-100"
                        : "border-white/5 bg-ink-900/40 text-slate-300 hover:border-white/15 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <span className="truncate pr-2">{category.label}</span>
                    <span
                      className={`inline-flex min-w-[24px] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        isActive
                          ? "bg-white/10 text-slate-100"
                          : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {categoryCount}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Kategori menusu kapali.</p>
          )}
        </aside>
        <div className={`${panelClass} bg-ink-800/60`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-300">
                {activeCategory?.label ?? "Tumu"} - {list.length} urun
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 xl:flex-row xl:items-stretch">
              <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded border border-white/10 bg-ink-900 px-3 py-2 shadow-inner sm:h-11 sm:gap-3 sm:px-4 sm:py-0">
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                  Ara
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Urun adi ara"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      title="Temizle"
                      aria-label="Temizle"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                        Temizle
                      </span>
                    </button>
                  )}
                </div>
              </div>
              {(canRefresh || canRefreshAllStocks || canUseBulkUsedDelete || (canUseBulkPriceActions && filteredList.length > 0)) && (
                <div className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-2 shadow-card">
                  {canRefresh && (
                    <button
                      type="button"
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition ${
                        isRefreshing
                          ? "cursor-not-allowed border-white/5 text-slate-600"
                          : "hover:border-white/20 hover:bg-white/5 hover:text-slate-100"
                      }`}
                      title="Urun katalogunu yenile"
                      aria-label="Urun katalogunu yenile"
                    >
                      <CubeIcon
                        aria-hidden="true"
                        className={`h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`}
                      />
                    </button>
                  )}
                  {canRefreshAllStocks && (
                    <button
                      type="button"
                      onClick={handleToolbarRefreshAllStocks}
                      disabled={isBulkStockRefreshRunning}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition ${
                        isBulkStockRefreshRunning
                          ? "cursor-not-allowed border-white/5 text-slate-600"
                          : "hover:border-white/20 hover:bg-white/5 hover:text-sky-100"
                      }`}
                      title="Tum urun stoklarini yenile"
                      aria-label="Tum urun stoklarini yenile"
                    >
                      <ArrowPathIcon
                        aria-hidden="true"
                        className={`h-4 w-4 ${isBulkStockRefreshRunning ? "animate-spin" : ""}`}
                      />
                    </button>
                  )}
                  {canUseBulkUsedDelete && (
                    <button
                      type="button"
                      onClick={handleToolbarBulkUsedDelete}
                      disabled={isBulkUsedDeleteRunning || toolbarUsedStockCount <= 0}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        confirmBulkUsedDelete
                          ? "border-rose-300/60 bg-rose-500/15 text-rose-50"
                          : "border-white/10 text-slate-300 hover:border-rose-300/40 hover:bg-rose-500/10 hover:text-rose-100"
                      } ${
                        isBulkUsedDeleteRunning || toolbarUsedStockCount <= 0
                          ? "cursor-not-allowed opacity-60"
                          : ""
                      }`}
                      title={
                        confirmBulkUsedDelete
                          ? "Onayla: kullanilan stoklari temizle"
                          : "Kullanilan stoklari temizle"
                      }
                      aria-label={
                        confirmBulkUsedDelete
                          ? "Onayla: kullanilan stoklari temizle"
                          : "Kullanilan stoklari temizle"
                      }
                    >
                      <TrashIcon
                        aria-hidden="true"
                        className={`h-4 w-4 ${isBulkUsedDeleteRunning ? "animate-pulse" : ""}`}
                      />
                    </button>
                  )}
                  {canUseBulkPriceActions && filteredList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBulkPriceModeOpen((prev) => !prev)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-slate-100"
                      title={isBulkPriceModeOpen ? "Toplu fiyat panelini kapat" : "Toplu fiyat panelini ac"}
                      aria-label={isBulkPriceModeOpen ? "Toplu fiyat panelini kapat" : "Toplu fiyat panelini ac"}
                      aria-expanded={isBulkPriceModeOpen}
                    >
                      <CurrencyDollarIcon
                        aria-hidden="true"
                        className={`h-4 w-4 transition-transform ${isBulkPriceModeOpen ? "scale-110 text-emerald-300" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {isRefreshing && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-sky-300 animate-pulse" />
                <span className="min-w-0 truncate font-semibold">
                  Urun taramasi arka planda devam ediyor.
                </span>
              </div>
              <span className="text-sky-100/80">Liste kullanilabilir, bitince otomatik guncellenecek.</span>
            </div>
          )}
          {isBulkPriceModeOpen && canUseBulkPriceActions && filteredList.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-sky-400/20 bg-[linear-gradient(135deg,rgba(8,13,24,0.98),rgba(12,18,34,0.96))] shadow-card">
              <div className="px-3 py-3">
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-white">Toplu fiyat gonderimi</p>
                          <span className="inline-flex items-center rounded-full border border-sky-300/15 bg-sky-500/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                            {bulkPriceStatusLabel}
                          </span>
                          {isBulkPriceRunning && bulkPriceCommandState.currentName && (
                            <span className="inline-flex min-w-0 items-center rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                              <span className="truncate">Calisiyor: {bulkPriceCommandState.currentName}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-200">
                            <span className="text-slate-500">Secili</span>
                            <span className="font-semibold text-white">{selectedPriceCount}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/15 bg-emerald-500/[0.08] px-2 py-1 text-[10px] text-emerald-100">
                            <span className="text-emerald-200/80">Hazir</span>
                            <span className="font-semibold">{bulkPriceReadyCount}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/15 bg-amber-500/[0.08] px-2 py-1 text-[10px] text-amber-100">
                            <span className="text-amber-200/80">Atlanacak</span>
                            <span className="font-semibold">{bulkPriceSkippedCount}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 xl:w-[360px] xl:items-stretch">
                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          <button
                            type="button"
                            onClick={handleResumeBulkPriceCommandRun}
                            disabled={isBulkPriceRunning || bulkPriceResumeCount === 0}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-500/10 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-50 transition hover:border-sky-200/50 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {bulkPriceResumeCount > 0
                              ? `Kalanlari gonder (${bulkPriceResumeCount})`
                              : "Kalanlari gonder"}
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkPriceCommandRun}
                            disabled={isBulkPriceRunning || selectedPriceCount === 0 || bulkPriceReadyCount === 0}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition hover:border-emerald-200/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBulkPriceRunning ? "Gonderiliyor..." : "Secilenleri gonder"}
                          </button>
                          {isBulkPriceRunning && (
                            <button
                              type="button"
                              onClick={handleCancelBulkPriceCommand}
                              disabled={isBulkPriceCancelRequested}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-50 transition hover:border-rose-200/50 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBulkPriceCancelRequested ? "Durduruluyor..." : "Iptal et"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => selectBulkPriceOffers(selectedPageOfferIds)}
                        disabled={isBulkPriceRunning || selectedPageOfferIds.length === 0 || areAllPageSelected}
                        className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bu sayfayi sec
                      </button>
                      <button
                        type="button"
                        onClick={() => selectBulkPriceOffers(selectedFilteredOfferIds)}
                        disabled={isBulkPriceRunning || selectedFilteredOfferIds.length === 0 || areAllFilteredSelected}
                        className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Filtredekileri sec
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedPriceOffers}
                        disabled={isBulkPriceRunning || selectedPriceCount === 0}
                        className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/15 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                      {(isBulkPriceRunning || bulkPriceCommandLogEntries.length > 0) && (
                        <section className="overflow-hidden rounded-xl border border-white/10 bg-ink-950/45">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-rose-300/80" />
                              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                              <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
                              <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                Toplu komut ciktilari
                              </span>
                            </div>
                            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
                                {bulkPriceLogsLoading
                                  ? "Yukleniyor"
                                  : `${bulkPriceCommandLogEntries.length} satir`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void clearBulkPriceCommandLogs()
                                }}
                                disabled={
                                  bulkPriceCommandLogEntries.length === 0 ||
                                  isBulkPriceRunning ||
                                  bulkPriceLogsLoading ||
                                  bulkPriceLogsClearing
                                }
                                className="inline-flex h-7 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {bulkPriceLogsClearing ? "..." : "Log temizle"}
                              </button>
                            </div>
                          </div>
                          <div className="no-scrollbar h-[220px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:text-[12px] sm:leading-6">
                            <div className="mb-2 flex min-w-0 flex-wrap items-start gap-2 text-slate-300 sm:flex-nowrap">
                              <span className="hidden flex-none text-slate-500 sm:inline">{BULK_PRICE_COMMAND_PROMPT_PATH}</span>
                              <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                              <span className="min-w-0 break-words text-slate-400">
                                secili={selectedPriceCount} / hazir={bulkPriceReadyCount} / backend={priceCommandBackendEntry?.label ?? PRICE_COMMAND_BACKEND_KEY}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {bulkPriceCommandLogEntries.map((entry) => {
                                const statusMeta = getCommandLogStatusMeta(entry.status)
                                return (
                                  <div key={entry.id} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap">
                                    <span className="hidden flex-none text-slate-500 sm:inline">{BULK_PRICE_COMMAND_PROMPT_PATH}</span>
                                    <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                                    <span className={`flex-none ${statusMeta.textClass}`}>[{entry.time}]</span>
                                    <span className={`flex-none ${statusMeta.textClass}`}>{statusMeta.code}</span>
                                    <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
                                  </div>
                                )
                              })}
                              {bulkPriceCommandLogEntries.length === 0 && (
                                <div className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap">
                                  <span className="hidden flex-none text-slate-600 sm:inline">{BULK_PRICE_COMMAND_PROMPT_PATH}</span>
                                  <span className="flex-none text-slate-600 sm:hidden">&gt;</span>
                                  <span className="flex-none text-slate-700">[--:--]</span>
                                  <span className="flex-none text-slate-700">--</span>
                                  <span className="truncate text-slate-500">bekleniyor...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </div>
          )}
          <div key={activeCategoryKey} className="mt-4 space-y-2">
            {isRefreshing && list.length === 0 ? (
              <ProductsListSkeleton />
            ) : filteredList.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Gösterilecek ürün bulunamadı.
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedList.map((product, index) => {
                  const name = String(product?.name ?? "").trim() || "İsimsiz ürün"
                  const isMissing = Boolean(product?.missing)
                  const key = product?.id ?? `${name}-${index}`
                  const offerId = String(product?.id ?? "").trim()
                  const isPriceSelected = Boolean(selectedPriceOfferIds?.[offerId])
                  const keyList = Array.isArray(keysByOffer?.[offerId]) ? keysByOffer[offerId] : []
                  const stockCountRaw = Number(product?.stockCount)
                  const stockUsedRaw = Number(product?.stockUsedCount)
                  const stockTotalRaw = Number(product?.stockTotalCount)
                  const usedKeys = keyList.filter((item) => item?.status === "used")
                  const availableKeys = keyList.filter((item) => item?.status !== "used")
                  const usedCountFromKeys = usedKeys.length
                  const availableCountFromKeys = availableKeys.length
                  const totalCountFromKeys = keyList.length
                  const rawTotalCount = Number.isFinite(stockTotalRaw) ? stockTotalRaw : totalCountFromKeys
                  const rawUsedCount = Number.isFinite(stockUsedRaw) ? stockUsedRaw : usedCountFromKeys
                  const rawAvailableCount = Number.isFinite(stockCountRaw)
                    ? stockCountRaw
                    : Math.max(0, rawTotalCount - rawUsedCount)
                  const hasLoadedKeys = Object.prototype.hasOwnProperty.call(keysByOffer, offerId)
                  const totalCount = hasLoadedKeys ? totalCountFromKeys : rawTotalCount
                  const usedCount = hasLoadedKeys ? usedCountFromKeys : rawUsedCount
                  const availableCount = hasLoadedKeys ? availableCountFromKeys : rawAvailableCount
                  const groupId = String(
                    groupAssignments?.[offerId] ?? product?.stockGroupId ?? "",
                  ).trim()
                  const group = groupId ? groups.find((entry) => entry.id === groupId) : null
                  const groupName = String(group?.name ?? product?.stockGroupName ?? "").trim()
                  const groupSelectionValue = groupSelectionDrafts[offerId] ?? groupId
                  const isGroupSelectionDirty = groupSelectionValue !== groupId
                  const categoryKey = getCategoryKey(product)
                  const categoryLabel =
                    categoryKey === "diger" ? "Diğer" : formatCategoryLabel(categoryKey)
                  const isOpen = Boolean(openOffers[offerId])
                  const isStockEnabled = Boolean(stockEnabledByOffer?.[offerId])
                  const isOutOfStock = isStockEnabled && availableCount === 0
                  const isKeysLoading = Boolean(keysLoading?.[offerId])
                  const groupDraftValue = groupDrafts[offerId] ?? ""
                  const availablePanels = ["inventory"]
                  const isPriceEnabled = Boolean(priceEnabledByOffer?.[offerId])
                  const isAutomationEnabled = Boolean(automationEnabledByOffer?.[offerId])
                  const automationTargets = getAutomationTargets(offerId)
                  const automationTargetDraft = getAutomationTargetDraft(offerId)
                  const selectedAutomationTargetId = String(
                    automationSelectedTargetByOffer?.[offerId] ?? "",
                  ).trim()
                  const selectedAutomationTarget =
                    automationTargets.find((entry) => entry.id === selectedAutomationTargetId) ||
                    automationTargets[0] ||
                    null
                  const selectedAutomationTargetIndex = selectedAutomationTarget
                    ? automationTargets.findIndex((entry) => entry.id === selectedAutomationTarget.id)
                    : -1
                  const selectedAutomationServiceLabel =
                    selectedAutomationTargetIndex >= 0
                      ? `Servis ${selectedAutomationTargetIndex + 1}`
                      : ""
                  const selectedAutomationTargetIsStarred = Boolean(selectedAutomationTarget?.starred)
                  const draftAutomationUrl = String(automationTargetDraft?.url ?? "")
                  const draftAutomationBackend =
                    String(automationTargetDraft?.backend ?? "").trim() ||
                    String(selectedAutomationTarget?.backend ?? "").trim() ||
                    String(stockFetchAutomationBackendOptions?.[0]?.key ?? "").trim()
                  const isAutomationTargetDetailsHidden =
                    !canViewAutomationTargetDetails && !canManageAutomationTargets
                  const visibleDraftAutomationUrl = isAutomationTargetDetailsHidden
                    ? maskSensitiveText(draftAutomationUrl, 16)
                    : draftAutomationUrl
                  const visibleDraftAutomationBackend = isAutomationTargetDetailsHidden
                    ? ""
                    : draftAutomationBackend
                  const isAutomationTargetSaving = Boolean(automationTargetSavingByOffer?.[offerId])
                  const automationRunLogEntries = Array.isArray(automationRunLogByOffer?.[offerId])
                    ? automationRunLogByOffer[offerId]
                    : []
                  const automationSensitiveBackendKeys = Array.from(
                    new Set(
                      [
                        ...automationTargets.map((entry) => String(entry?.backend ?? "").trim()),
                        ...stockFetchAutomationBackendOptions.map((option) => String(option?.key ?? "").trim()),
                        ...stockFetchAutomationBackendOptions.map((option) => String(option?.label ?? "").trim()),
                      ].filter(Boolean),
                    ),
                  )
                  const visibleAutomationRunLogEntries = automationRunLogEntries
                    .slice(0, CMD_VISIBLE_ROWS)
                    .map((entry) => ({
                      ...entry,
                      visibleMessage: canViewAutomationTargetDetails
                        ? String(entry?.message ?? "")
                        : maskAutomationLogMessage(entry?.message, automationSensitiveBackendKeys),
                    }))
                  const emptyAutomationRunLogRows = Math.max(
                    0,
                    CMD_VISIBLE_ROWS - visibleAutomationRunLogEntries.length,
                  )
                  const isAutomationRunning = Boolean(automationIsRunningByOffer?.[offerId])
                  const isAutomationLogsClearing = Boolean(automationLogsClearingByOffer?.[offerId])
                  const automationTwoFactorPrompt = automationTwoFactorPromptByOffer?.[offerId] ?? null
                  const automationTwoFactorBackendRaw = String(
                    automationTwoFactorPrompt?.backend ?? "",
                  ).trim()
                  const automationTwoFactorMessage = String(
                    automationTwoFactorPrompt?.message ?? "",
                  ).trim()
                  const hasAutomationTwoFactorPrompt = Boolean(automationTwoFactorBackendRaw)
                  const automationTwoFactorBackendDisplay = canViewAutomationTargetDetails
                    ? automationTwoFactorBackendRaw
                    : maskSensitiveText(automationTwoFactorBackendRaw, 8)
                  const automationTwoFactorCodeValue = String(
                    automationTwoFactorCodeByOffer?.[offerId] ?? "",
                  )
                  if (isAutomationEnabled && canViewAutomationPanel) {
                    availablePanels.push("automation")
                  }
                  if (isPriceEnabled) {
                    availablePanels.push("price")
                  }
                  availablePanels.push("messages")
                  if (isStockEnabled) {
                    availablePanels.push("stock-group")
                  }
                  const storedPanel = activePanelByOffer[offerId]
                  const defaultPanel = availablePanels[0] ?? "inventory"
                  const activePanel =
                    storedPanel === "none"
                      ? "none"
                      : availablePanels.includes(storedPanel)
                        ? storedPanel
                        : defaultPanel
                  const messageTemplateDraftValue = messageTemplateDrafts[offerId] ?? ""
                  const messageGroupDraftValue = messageGroupDrafts[offerId] ?? ""
                  const normalizedTemplateValue = String(messageTemplateDraftValue ?? "").trim()
                  const isMessageTemplateValid = templates.some(
                    (tpl) => tpl.label === normalizedTemplateValue,
                  )
                  const messageGroupId = String(
                    messageGroupAssignments?.[offerId] ?? "",
                  ).trim()
                  const messageGroup = messageGroupId
                    ? messageGroups.find((group) => group.id === messageGroupId)
                    : null
                  const messageGroupName = String(messageGroup?.name ?? "").trim()
                  const messageGroupSelectionValue =
                    messageGroupSelectionDrafts[offerId] ?? messageGroupId
                  const isMessageGroupSelectionDirty =
                    messageGroupSelectionValue !== messageGroupId
                  const independentMessages = Array.isArray(messageTemplatesByOffer?.[offerId])
                    ? messageTemplatesByOffer[offerId]
                    : []
                  const messageGroupMessages = messageGroupId
                    ? Array.isArray(messageGroupTemplates?.[messageGroupId])
                      ? messageGroupTemplates[messageGroupId]
                      : []
                    : independentMessages
                  const messageGroupLabel =
                    messageGroupName || (messageGroupMessages.length > 0 ? "Bağımsız" : "Yok")
                  const priceDraft = priceDrafts[offerId] ?? { base: "", percent: DEFAULT_PRICE_PERCENT }
                  const savedPriceEntry = savedPricesByOffer?.[offerId] ?? null
                  const baseInputValue = String(priceDraft.base ?? "").trim()
                  const baseValue = normalizeDecimalInput(baseInputValue)
                  const percentValue = normalizeDecimalInput(priceDraft.percent)
                  const isBasePriceValid = isValidPriceInput(baseInputValue)
                  const baseNumber = isBasePriceValid ? Number(baseValue) : Number.NaN
                  const percentNumber = Number(percentValue)
                  const multiplierNumber =
                    Number.isFinite(percentNumber) && percentNumber > 0
                      ? percentToMultiplier(percentNumber)
                      : DEFAULT_PRICE_MULTIPLIER
                  const priceResult = Number.isFinite(baseNumber)
                    ? calculateRoundedPriceResult(baseNumber, multiplierNumber)
                    : ""
                  const productCategory = resolveMainProductCategory(product)
                  const currentResultDisplay =
                    priceResult === "" ? "-" : roundPriceNumber(priceResult).toFixed(2)
                  const savedResultDisplay = formatPriceMetric(savedPriceEntry?.result)
                  const hasSavedPrice = savedResultDisplay !== "-"
                  const priceCommandLogEntries = Array.isArray(priceCommandRunLogByOffer?.[offerId])
                    ? priceCommandRunLogByOffer[offerId]
                    : []
                  const visiblePriceCommandLogEntries = priceCommandLogEntries.slice(0, PRICE_COMMAND_VISIBLE_ROWS)
                  const emptyPriceCommandLogRows = Math.max(
                    0,
                    PRICE_COMMAND_VISIBLE_ROWS - visiblePriceCommandLogEntries.length,
                  )
                  const isPriceCommandRunning = Boolean(priceCommandIsRunningByOffer?.[offerId])
                  const isPriceCommandLogsClearing = Boolean(priceCommandLogsClearingByOffer?.[offerId])
                  const priceCommandConnectionState = String(
                    priceCommandConnectionStateByOffer?.[offerId] ?? "idle",
                  ).trim()
                  const priceCommandConnectionLabel = getCommandConnectionLabel(priceCommandConnectionState)
                  const priceCommandConnectionBadgeClass =
                    getCommandConnectionBadgeClass(priceCommandConnectionState)
                  const canSendPriceResult =
                    Boolean(offerId) &&
                    canManagePrices &&
                    canViewPriceDetails &&
                    priceResult !== "" &&
                    Boolean(String(automationWsUrl ?? "").trim()) &&
                    !isPriceCommandRunning
                  const canSavePrice =
                    Boolean(offerId) &&
                    canManagePrices &&
                    isBasePriceValid &&
                    priceResult !== ""
                  const priceDraftStateLabel =
                    isPriceCommandRunning
                      ? "Komut calisiyor"
                      : !isBasePriceValid && priceDraft.base !== ""
                        ? "Gecersiz fiyat"
                        : canSendPriceResult
                          ? "Gonderime hazir"
                          : canSavePrice
                            ? "Kayda hazir"
                            : "Taslak"
                  const priceDraftStateClass =
                    isPriceCommandRunning
                      ? "border-sky-300/30 bg-sky-500/10 text-sky-100"
                      : !isBasePriceValid && priceDraft.base !== ""
                        ? "border-rose-300/30 bg-rose-500/10 text-rose-100"
                        : canSendPriceResult
                          ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                  const priceControlMessage =
                    !isBasePriceValid && priceDraft.base !== ""
                      ? "Kaydetmek icin gecerli bir baz fiyat girin."
                      : canSendPriceResult
                        ? "Secili fiyat sonucu websocket komutuna hazir."
                        : canSavePrice
                          ? "Fiyat ayari kaydedilmeye hazir."
                          : "Sonuc icin baz fiyat ve katsayi secin."
                  const canDeleteMessageItem = messageGroupId
                    ? typeof onRemoveMessageGroupTemplate === "function"
                    : typeof onRemoveMessageTemplate === "function"
                  const isOfferRefreshing = Boolean(refreshingOffers[offerId])
                  const rawHref = String(product?.href ?? "").trim()
                  const href = rawHref
                    ? rawHref.startsWith("http://") || rawHref.startsWith("https://")
                      ? rawHref
                      : `https://www.eldorado.gg${rawHref.startsWith("/") ? "" : "/"}${rawHref}`
                    : ""
                  const rawImageUrl = String(product?.imageUrl ?? "").trim()
                  const imageUrl = rawImageUrl
                    ? rawImageUrl.startsWith("http://") || rawImageUrl.startsWith("https://")
                      ? rawImageUrl
                      : `https://www.eldorado.gg${rawImageUrl.startsWith("/") ? "" : "/"}${rawImageUrl}`
                    : ""
                  const productInitial = name.charAt(0).toUpperCase() || "?"
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border border-white/10 p-4 shadow-inner transition hover:border-accent-400/60 ${
                        isMissing
                          ? "border-rose-400/40 bg-rose-500/10"
                          : isOutOfStock
                            ? "border-rose-300/30 bg-ink-900/70"
                            : "bg-ink-900/70"
                      } ${isOpen ? "border-accent-400/60" : ""} ${
                        isPriceSelected
                          ? "border-sky-400/30 bg-[linear-gradient(180deg,rgba(14,23,42,0.9),rgba(15,23,42,0.75))] shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-nowrap">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {canUseBulkPriceActions && isBulkPriceModeOpen && isPriceEnabled && (
                            <button
                              type="button"
                              disabled={isBulkPriceRunning || !offerId}
                              aria-label={`${name} toplu fiyat sonucu sec`}
                              className={`mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                                isPriceSelected
                                  ? "border-sky-300/30 bg-sky-500/15 text-sky-50"
                                  : "border-white/10 bg-white/[0.04] text-slate-300"
                              } ${
                                isBulkPriceRunning || !offerId
                                  ? "cursor-not-allowed opacity-60"
                                  : "hover:border-white/15 hover:bg-white/[0.08]"
                              }`}
                              onMouseDown={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation()
                                togglePriceOfferSelection(offerId)
                              }}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isPriceSelected ? "bg-sky-300" : "bg-slate-500"
                                }`}
                              />
                              <span>{isPriceSelected ? "Secili" : "Sec"}</span>
                            </button>
                          )}
                          <div
                            role="button"
                            tabIndex={!offerId || !canToggleCard ? -1 : 0}
                            aria-disabled={!offerId || !canToggleCard}
                            onClick={() => {
                              if (!offerId || !canToggleCard) return
                              toggleOfferOpen(offerId)
                            }}
                            onKeyDown={(event) => {
                              if (!offerId || !canToggleCard) return
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                toggleOfferOpen(offerId)
                              }
                            }}
                            className={`min-w-0 flex-1 text-left ${
                              !offerId || !canToggleCard ? "cursor-not-allowed opacity-60" : ""
                            }`}
                          >
                            <div className="flex min-h-[36px] flex-wrap items-start gap-2 sm:items-center">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-[11px] font-semibold text-slate-200">
                                {imageUrl ? (
                                  <>
                                  <img
                                    src={imageUrl}
                                    alt={name}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none"
                                      const fallback = event.currentTarget.nextElementSibling
                                      if (fallback) fallback.classList.remove("hidden")
                                    }}
                                  />
                                  <span className="hidden">{productInitial}</span>
                                </>
                              ) : (
                                productInitial
                              )}
                            </span>
                            <span
                              className={`min-w-0 flex-1 break-words font-body text-[13px] font-semibold leading-snug text-white sm:text-sm ${
                                isMissing
                                  ? "text-orange-50"
                                  : isOutOfStock
                                    ? "text-rose-50"
                                    : "text-white"
                              }`}
                            >
                              {name}
                            </span>
                            {(isStockEnabled || isMissing) && (
                              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                                {isStockEnabled && (
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                      availableCount === 0
                                        ? "border border-rose-300/60 bg-rose-500/15 text-rose-50"
                                        : "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                                    }`}
                                  >
                                    {availableCount} stok
                                  </span>
                                )}
                                {isStockEnabled && usedCount > 0 && (
                                  <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
                                    Kullanıldı: {usedCount}
                                  </span>
                                )}
                                {isMissing && (
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                                    Eksik
                                  </span>
                                )}
                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex w-full flex-wrap items-center gap-1 rounded-lg border border-[#ffffff1a] bg-[#ffffff0d] px-2 py-1 shadow-inner sm:gap-1.5 sm:px-2.5 lg:h-[36px] lg:w-[216px] lg:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleStockToggle(offerId)}
                              disabled={!canManageStock || !offerId}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                !canManageStock || !offerId
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                              aria-label="Stok aç/kapat"
                              title={isStockEnabled ? "Stok açık" : "Stok kapalı"}
                            >
                              <span
                                className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                                  isStockEnabled ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              <PowerIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePriceToggle(offerId)}
                              disabled={!offerId || !canTogglePrice}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                !offerId || !canTogglePrice ? "cursor-not-allowed opacity-60" : ""
                              }`}
                              aria-label="Fiyat aç/kapat"
                              title={isPriceEnabled ? "Fiyat açık" : "Fiyat kapalı"}
                            >
                              <span
                                className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                                  isPriceEnabled ? "bg-sky-400" : "bg-rose-400"
                                }`}
                              />
                              <CurrencyDollarIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutomationToggle(offerId)}
                              disabled={!offerId || !canManageAutomationTargets}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md transition before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                isAutomationEnabled ? "text-emerald-300 hover:text-emerald-200" : "text-slate-200/80 hover:text-white"
                              } ${
                                !offerId || !canManageAutomationTargets
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                              aria-label="Stok cek ac/kapat"
                              title={isAutomationEnabled ? "Stok cek acik" : "Stok cek kapali"}
                            >
                              <span
                                className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                                  isAutomationEnabled ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              <PlayIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStarred(offerId)}
                              disabled={!offerId || !canStarOffers}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                !offerId || !canStarOffers ? "cursor-not-allowed opacity-60" : ""
                              } ${starredOffers[offerId] ? "text-yellow-300" : ""}`}
                              aria-label="Ürünü yıldızla"
                              title={starredOffers[offerId] ? "Yıldızı kaldır" : "Yıldızla"}
                            >
                              {starredOffers[offerId] ? (
                                <StarSolidIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              ) : (
                                <StarOutlineIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOfferRefresh(offerId)}
                              disabled={!offerId || isKeysLoading || !isStockEnabled || isOfferRefreshing}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                !offerId || isKeysLoading || !isStockEnabled || isOfferRefreshing
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                              aria-label="Stokları yenile"
                              title={
                                !isStockEnabled
                                  ? "Stok kapalı"
                                  : isOfferRefreshing
                                    ? "Yenileniyor..."
                                    : isKeysLoading
                                      ? "Yükleniyor..."
                                      : "Yenile"
                              }
                            >
                              <ArrowPathIcon
                                aria-hidden="true"
                                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isKeysLoading || isOfferRefreshing ? "animate-spin" : ""}`}
                              />
                            </button>
                            {canDeleteOffers && (
                              <button
                                type="button"
                                onClick={() => handleOfferDeleteWithConfirm(offerId)}
                                disabled={!offerId}
                                className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                  !offerId ? "cursor-not-allowed opacity-60" : ""
                                } ${confirmOfferDelete === offerId ? "bg-rose-500/20 text-rose-100" : ""}`}
                                aria-label="Urun sil"
                                title={confirmOfferDelete === offerId ? "Onayla" : "Sil"}
                              >
                                <TrashIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                            )}
                            {href && canViewLinks && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7"
                                aria-label="Ürün linki"
                              >
                                <LinkIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </a>
                            )}
                            {canAddKeys && (
                              <button
                                type="button"
                                onClick={() => openStockModal(offerId, name)}
                                disabled={!offerId || !isStockEnabled}
                                className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                  !offerId || !isStockEnabled
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                }`}
                                aria-label="Stok ekle"
                              >
                                <PlusIcon aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleOfferOpen(offerId)}
                              disabled={!offerId || !canToggleCard}
                              className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition sm:h-7 sm:w-7 ${
                                isOpen ? "bg-white/10 text-white" : ""
                              } ${!offerId || !canToggleCard ? "cursor-not-allowed opacity-60" : ""}`}
                              aria-label="Ürün detaylarını aç/kapat"
                            >
                              <ChevronRightIcon
                                aria-hidden="true"
                                className={`h-3.5 w-3.5 transition sm:h-4 sm:w-4 ${isOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {isOpen && (
                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                          <div className="rounded-2xl rounded-b-none border border-white/10 bg-[#131826] px-3 pt-2 shadow-card">
                            <div className="grid gap-2 border-b border-white/10 pb-2 sm:flex sm:flex-wrap sm:items-end sm:gap-4 sm:pb-0" role="tablist">
                              <button
                                type="button"
                                onClick={() => setActivePanel(offerId, "inventory")}
                                className={`group flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition sm:w-auto sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-1 sm:py-0 sm:pb-2 ${
                                  activePanel === "inventory"
                                    ? "border-accent-400 bg-accent-500/10 text-white sm:bg-transparent"
                                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-200 sm:border-transparent sm:bg-transparent sm:hover:border-white/30 sm:hover:bg-transparent"
                                }`}
                                aria-pressed={activePanel === "inventory"}
                              >
                                <span>Stok</span>
                                <span
                                  className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:ml-0 ${
                                    activePanel === "inventory"
                                      ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                                      : "border-white/10 bg-white/5 text-slate-300 group-hover:text-slate-200"
                                  }`}
                                >
                                  {availableCount} / {usedCount}
                                </span>
                              </button>
                              {isAutomationEnabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!canViewAutomationPanel) return
                                    setActivePanel(offerId, "automation")
                                    if (canViewAutomationLogs) {
                                      void loadAutomationRunLogs(offerId)
                                    }
                                  }}
                                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition sm:w-auto sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-1 sm:py-0 sm:pb-2 ${
                                    activePanel === "automation"
                                      ? "border-accent-400 bg-accent-500/10 text-white sm:bg-transparent"
                                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-200 sm:border-transparent sm:bg-transparent sm:hover:border-white/30 sm:hover:bg-transparent"
                                  } ${!canViewAutomationPanel ? "cursor-not-allowed opacity-60" : ""}`}
                                  aria-pressed={activePanel === "automation"}
                                >
                                  <span>Stok çek</span>
                                </button>
                              )}
                              {isPriceEnabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!canManagePrices) return
                                    setActivePanel(offerId, "price")
                                    if (canViewPriceCommandLogs) {
                                      void loadPriceCommandLogs(offerId)
                                    }
                                  }}
                                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition sm:w-auto sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-1 sm:py-0 sm:pb-2 ${
                                    activePanel === "price"
                                      ? "border-accent-400 bg-accent-500/10 text-white sm:bg-transparent"
                                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-200 sm:border-transparent sm:bg-transparent sm:hover:border-white/30 sm:hover:bg-transparent"
                                  } ${!canManagePrices ? "cursor-not-allowed opacity-60" : ""}`}
                                  aria-pressed={activePanel === "price"}
                                >
                                  <span>Fiyat</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setActivePanel(offerId, "messages")}
                                className={`group flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition sm:w-auto sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-1 sm:py-0 sm:pb-2 ${
                                  activePanel === "messages"
                                    ? "border-accent-400 bg-accent-500/10 text-white sm:bg-transparent"
                                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-200 sm:border-transparent sm:bg-transparent sm:hover:border-white/30 sm:hover:bg-transparent"
                                }`}
                                aria-pressed={activePanel === "messages"}
                              >
                                <span>Mesaj grubu</span>
                                <span
                                  className={`ml-auto max-w-[220px] whitespace-normal break-words rounded-full border px-2 py-0.5 text-left text-[10px] font-semibold leading-snug sm:ml-0 ${
                                    activePanel === "messages"
                                      ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                                      : "border-white/10 bg-white/5 text-slate-300 group-hover:text-slate-200"
                                    }`}
                                >
                                  {messageGroupLabel}
                                </span>
                              </button>
                              {isStockEnabled && (
                                <button
                                  type="button"
                                  onClick={() => setActivePanel(offerId, "stock-group")}
                                  className={`group flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition sm:w-auto sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-1 sm:py-0 sm:pb-2 ${
                                    activePanel === "stock-group"
                                      ? "border-accent-400 bg-accent-500/10 text-white sm:bg-transparent"
                                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-200 sm:border-transparent sm:bg-transparent sm:hover:border-white/30 sm:hover:bg-transparent"
                                  }`}
                                  aria-pressed={activePanel === "stock-group"}
                                >
                                  <span>Stok grubu</span>
                                  <span
                                    className={`ml-auto max-w-[220px] whitespace-normal break-words rounded-full border px-2 py-0.5 text-left text-[10px] font-semibold leading-snug sm:ml-0 ${
                                      activePanel === "stock-group"
                                        ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                                        : "border-white/10 bg-white/5 text-slate-300 group-hover:text-slate-200"
                                    }`}
                                  >
                                    {groupName || "Bağımsız"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                          {activePanel !== "inventory" && (
                          <div className={`grid min-w-0 items-start gap-3 ${isStockEnabled ? "lg:grid-cols-2" : ""}`}>
                            {isStockEnabled && activePanel === "stock-group" && (
                              <div className="min-w-0 rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-4 shadow-card -mt-2 animate-panelFade sm:p-5 lg:col-span-2">
                                {isOfferRefreshing && (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-24 rounded-lg" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                  </div>
                                )}
                                {!isOfferRefreshing && (
                                  <>
                                <div className="mt-1 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
                                  <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Stok grubu</label>
                                    <div
                                      className={`mt-1 grid gap-2 sm:flex sm:flex-wrap sm:items-center ${
                                        selectFlashByKey[`${offerId}:stock-group`] ? "animate-noteSwap" : ""
                                      }`}
                                    >
                                      <select
                                        value={groupSelectionValue}
                                        onChange={(event) =>
                                          setGroupSelectionDrafts((prev) => ({
                                            ...prev,
                                            [offerId]: event.target.value,
                                          }))
                                        }
                                        disabled={!canManageGroups}
                                        className="min-w-0 w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-9 sm:min-w-[160px] sm:flex-1 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <option value="">Bağımsız</option>
                                        {groups.map((groupOption) => (
                                          <option key={groupOption.id} value={groupOption.id}>
                                            {groupOption.name}
                                          </option>
                                        ))}
                                      </select>
                                      {groupSelectionValue && canManageGroups && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            {
                                              setGroupSelectionDrafts((prev) => ({
                                                ...prev,
                                                [offerId]: "",
                                              }))
                                              triggerSelectFlash(offerId, "stock-group")
                                            }
                                          }
                                          className="w-full rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-9 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25 sm:w-auto"
                                        >
                                          KALDIR
                                        </button>
                                      )}
                                      {canManageGroups && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleGroupAssign(offerId, groupSelectionValue)
                                            triggerSelectFlash(offerId, "stock-group")
                                          }}
                                          disabled={!isGroupSelectionDirty}
                                          className="w-full rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-9 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                        >
                                          KAYDET
                                        </button>
                                      )}
                                      {groupId && canManageGroups && (
                                        <button
                                          type="button"
                                          onClick={() => handleGroupDelete(offerId, groupId)}
                                          className="w-full rounded-lg border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-9 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25 sm:w-auto"
                                        >
                                          {confirmGroupDelete === groupId ? "ONAYLA" : "SİL"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {canManageGroups && (
                                    <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Yeni grup</label>
                                      <div className="mt-1 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                                        <input
                                          type="text"
                                          value={groupDraftValue}
                                          onChange={(event) => handleGroupDraftChange(offerId, event.target.value)}
                                          placeholder="Yeni grup adı"
                                          disabled={!canManageGroups}
                                          className="min-w-0 w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 h-9 sm:min-w-[160px] sm:flex-1 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleGroupCreate(offerId)}
                                          disabled={!canManageGroups || !groupDraftValue.trim()}
                                          className="w-full rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-9 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                        >
                                          OLUŞTUR
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                  </>
                                )}
                              </div>
                            )}
                            {activePanel === "messages" && (
                              <div className="min-w-0 rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-4 shadow-card -mt-2 animate-panelFade sm:p-5 lg:col-span-2">
                                {isOfferRefreshing ? (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-28 rounded-lg" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                  </div>
                                ) : (
                                  <>
                                <div className="mt-1 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                  <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Mesaj grubu</label>
                                    <div
                                      className={`mt-1 flex flex-wrap items-center gap-2 ${
                                        selectFlashByKey[`${offerId}:message-group`] ? "animate-noteSwap" : ""
                                      }`}
                                    >
                                      <select
                                        value={messageGroupSelectionValue}
                                        onChange={(event) =>
                                          setMessageGroupSelectionDrafts((prev) => ({
                                            ...prev,
                                            [offerId]: event.target.value,
                                          }))
                                        }
                                        disabled={!canManageMessages}
                                        className="min-w-[160px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-9 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <option value="">Bağımsız</option>
                                        {messageGroups.map((group) => (
                                          <option key={group.id} value={group.id}>
                                            {group.name}
                                          </option>
                                        ))}
                                      </select>
                                      {messageGroupSelectionValue && canManageMessages && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            {
                                              setMessageGroupSelectionDrafts((prev) => ({
                                                ...prev,
                                                [offerId]: "",
                                              }))
                                              triggerSelectFlash(offerId, "message-group")
                                            }
                                          }
                                          className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-9 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                                        >
                                          KALDIR
                                        </button>
                                      )}
                                      {canManageMessages && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleMessageGroupAssign(offerId, messageGroupSelectionValue)
                                            triggerSelectFlash(offerId, "message-group")
                                          }}
                                          disabled={!isMessageGroupSelectionDirty}
                                          className="rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-9 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          KAYDET
                                        </button>
                                      )}
                                      {messageGroupId && canDeleteMessageGroup && (
                                        <button
                                          type="button"
                                          onClick={() => handleMessageGroupDelete(messageGroupId)}
                                          className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-9 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                        >
                                          {confirmMessageGroupDelete === messageGroupId ? "ONAYLA" : "SİL"}
                                        </button>
                                      )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={messageGroupDraftValue}
                                        onChange={(event) => handleMessageGroupDraftChange(offerId, event.target.value)}
                                        placeholder="Yeni grup adı"
                                        disabled={!canManageMessages}
                                        className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 h-9 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleMessageGroupCreate(offerId)}
                                        disabled={!canManageMessages || !messageGroupDraftValue.trim()}
                                        className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-9 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        OLUŞTUR
                                      </button>
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Mesaj şablonu</label>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        list={`message-template-${offerId}`}
                                        value={messageTemplateDraftValue}
                                        onChange={(event) => handleMessageTemplateDraftChange(offerId, event.target.value)}
                                        placeholder={templates.length === 0 ? "Şablon yok" : "Şablon seç"}
                                        disabled={!canManageMessages || templates.length === 0}
                                        className="min-w-[220px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-9 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{ appearance: "none", WebkitAppearance: "none" }}
                                      />
                                      <datalist id={`message-template-${offerId}`}>
                                        {templates.map((tpl) => (
                                          <option key={`${offerId}-msg-${tpl.label}`} value={tpl.label} />
                                        ))}
                                      </datalist>
                                      <button
                                        type="button"
                                        onClick={() => handleMessageTemplateAdd(offerId)}
                                        disabled={!canManageMessages || !isMessageTemplateValid}
                                        className="rounded-lg border border-sky-300/60 bg-sky-500/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-9 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        EKLE
                                      </button>
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-500">Şablon ekledikçe kopyalama listesinde görünür.</p>
                                  </div>
                                </div>
                                  </>
                                )}
                              </div>
                            )}
{activePanel === "price" && isPriceEnabled && (
  <div className="relative -mt-2 w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-3 shadow-card animate-panelFade sm:p-5 lg:col-span-2">
    <div className="relative grid w-full min-w-0 max-w-full gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-3">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f1980]">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Fiyat yonetimi
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Baz fiyat ve katsayi
                </p>
              </div>
            </div>
          </div>
          <div className={`grid min-w-0 gap-3 p-3 sm:p-4 ${canViewPriceDetails ? "lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]" : ""}`}>
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    Fiyat gir
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sadece fiyat degeri girin
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Baz
                </span>
              </div>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={priceDraft.base}
                  onChange={(event) =>
                    handlePriceDraftChange(offerId, "base", event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="15.53"
                  disabled={!canManagePrices}
                  className={`h-10 min-w-0 w-full rounded-lg border bg-ink-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                    priceDraft.base !== "" && !isBasePriceValid
                      ? "border-rose-400/60 focus:border-rose-300 focus:ring-rose-500/20"
                      : "border-white/10 focus:border-accent-400 focus:ring-accent-500/30"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </div>
              {priceDraft.base !== "" && !isBasePriceValid ? (
                <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-100/90">
                  Sadece fiyat girin. Ornek: 15.53
                </p>
              ) : (
                <p className="mt-3 text-[10px] text-slate-500">
                  Ondalik girebilirsiniz. Ornek: 15.53
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {canViewPriceDetails ? (
                <PriceMultiplierControl
                  compact
                  framed={false}
                  label="Katsayi"
                  value={multiplierNumber}
                  onChange={(nextValue) => handlePriceMultiplierChange(offerId, nextValue)}
                  disabled={!canManagePrices}
                />
              ) : (
                <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-8 text-center text-[11px] text-slate-500">
                  Sonuc ve katsayi detaylari icin ek goruntuleme yetkisi gerekiyor.
                </p>
              )}
              <div className="mt-4 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    handlePriceSave(
                      offerId,
                      baseNumber,
                      percentNumber,
                      priceResult === "" ? 0 : priceResult,
                    )
                  }
                  disabled={!canSavePrice}
                  className="h-9 w-full rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>

      <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#0b0f1980] p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          Kontrol paneli
        </p>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2.5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${priceDraftStateClass}`}>
                  {priceDraftStateLabel}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                  {productCategory}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {priceControlMessage}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="rounded-xl border border-white/10 bg-ink-900/70 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Anlik sonuc</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {currentResultDisplay}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Kayitli sonuc</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {savedResultDisplay}
                  </p>
                </div>
              </div>
              {!hasSavedPrice && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Henuz kayitli fiyat ayari yok.
                </p>
              )}
            </div>
            {canViewPriceDetails && (
              <button
                type="button"
                onClick={() =>
                  handlePriceCommandRun(
                    {
                      offerId,
                      category: productCategory,
                      result: priceResult,
                    },
                    {
                      label: "Sonucu Gonder",
                      backendKey: priceCommandBackendEntry?.key ?? PRICE_COMMAND_BACKEND_KEY,
                      backendLabel: priceCommandBackendEntry?.label ?? PRICE_COMMAND_BACKEND_KEY,
                    },
                  )
                }
                disabled={!canSendPriceResult}
                className="h-9 w-full rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPriceCommandRunning ? "Gonderiliyor..." : "Sonucu Gonder"}
              </button>
            )}
            {!String(automationWsUrl ?? "").trim() && (
              <p className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100/90">
                Websocket adresi yok. Admin panelinden kaydedin.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
    {canViewPriceCommandLogs && (
      <section className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/65">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-300/80" />
            <span className="h-2 w-2 rounded-full bg-amber-300/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
            <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Komut ciktilari
            </span>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
              {priceCommandLogEntries.length} satir
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${priceCommandConnectionBadgeClass}`}
            >
              {priceCommandConnectionLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                void clearPriceCommandLogs(offerId)
              }}
              disabled={priceCommandLogEntries.length === 0 || isPriceCommandLogsClearing}
              className="inline-flex h-7 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPriceCommandLogsClearing ? "..." : "Log temizle"}
            </button>
          </div>
        </div>
        <div className="no-scrollbar h-[280px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
          {!String(automationWsUrl ?? "").trim() && (
            <p className="mb-2 rounded-lg border border-amber-300/20 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100/90">
              Websocket adresi yok. Admin panelinden kaydedin.
            </p>
          )}
          <div className="mb-2 flex min-w-0 flex-wrap items-start gap-2 text-slate-300 sm:flex-nowrap">
            <span className="hidden flex-none text-slate-500 sm:inline">{PRICE_COMMAND_PROMPT_PATH}</span>
            <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
            <span className="min-w-0 break-words text-slate-400">
              backend={priceCommandBackendEntry?.label ?? PRICE_COMMAND_BACKEND_KEY} / urun={offerId || "-"} / kategori={productCategory || "-"}
            </span>
          </div>
          <div className="space-y-0.5">
            {visiblePriceCommandLogEntries.map((entry) => {
              const statusMeta = getCommandLogStatusMeta(entry.status)
              return (
                <div key={entry.id} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap">
                  <span className="hidden flex-none text-slate-500 sm:inline">{PRICE_COMMAND_PROMPT_PATH}</span>
                  <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                  <span className={`flex-none ${statusMeta.textClass}`}>[{entry.time}]</span>
                  <span className={`flex-none ${statusMeta.textClass}`}>{statusMeta.code}</span>
                  <span className="min-w-0 break-words text-slate-100">{entry.message}</span>
                </div>
              )
            })}
            {Array.from({ length: emptyPriceCommandLogRows }).map((_, index) => (
              <div key={`price-command-placeholder-${offerId}-${index}`} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap">
                <span className="hidden flex-none text-slate-600 sm:inline">{PRICE_COMMAND_PROMPT_PATH}</span>
                <span className="flex-none text-slate-600 sm:hidden">&gt;</span>
                <span className="flex-none text-slate-700">[--:--]</span>
                <span className="flex-none text-slate-700">--</span>
                <span
                  className={`truncate text-slate-700 ${
                    priceCommandLogEntries.length === 0 && index === 0
                      ? "text-slate-500"
                      : "opacity-0"
                  }`}
                >
                  {priceCommandLogEntries.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )}
  </div>
)}
                            {activePanel === "automation" && isAutomationEnabled && (
                              <div className="relative -mt-2 w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-3 shadow-card animate-panelFade sm:p-5 lg:col-span-2">
                                <div className="relative grid w-full min-w-0 max-w-full gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                                  <div className="min-w-0 space-y-3">
                                    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0b0f1980] p-3.5">
                                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                            Hedef yonetimi
                                          </p>
                                          <p className="mt-1 text-[11px] text-slate-500">
                                            URL ve backend map kaydet
                                          </p>
                                        </div>
                                        <span className="rounded-full border border-white/10 bg-ink-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                                          {automationTargets.length} servis
                                        </span>
                                      </div>
                                      <div className="grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1.85fr)_minmax(150px,0.55fr)_auto]">
                                        <input
                                          type="text"
                                          value={visibleDraftAutomationUrl}
                                          onChange={(event) =>
                                            handleAutomationTargetDraftChange(offerId, "url", event.target.value)
                                          }
                                          placeholder="https://site.com/urun"
                                          disabled={!canManageAutomationTargets || isAutomationTargetSaving}
                                          className="h-9 min-w-0 w-full rounded-md border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <select
                                          value={visibleDraftAutomationBackend}
                                          onChange={(event) =>
                                            handleAutomationTargetDraftChange(offerId, "backend", event.target.value)
                                          }
                                          disabled={
                                            !canManageAutomationTargets ||
                                            stockFetchAutomationBackendOptions.length === 0
                                          }
                                          className="h-9 min-w-0 w-full appearance-none rounded-md border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <option value="">
                                            {stockFetchAutomationBackendOptions.length === 0
                                              ? "Backend map yok"
                                              : "Backend sec"}
                                          </option>
                                          {stockFetchAutomationBackendOptions.map((option) => {
                                            const optionKey = String(option?.key ?? "").trim()
                                            if (!optionKey) return null
                                            const optionLabel = String(option?.label ?? "").trim() || optionKey
                                            return (
                                              <option key={`${offerId}-automation-target-${optionKey}`} value={optionKey}>
                                                {optionLabel}
                                              </option>
                                            )
                                          })}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void handleAutomationTargetSave(offerId)
                                          }}
                                          disabled={
                                            !canManageAutomationTargets ||
                                            !draftAutomationBackend ||
                                            !String(draftAutomationUrl ?? "").trim() ||
                                            isAutomationTargetSaving
                                          }
                                          className="h-9 w-full rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                                        >
                                          {isAutomationTargetSaving ? "..." : "Kaydet"}
                                        </button>
                                      </div>
                                    </section>

                                    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f1980]">
                                      <div className="border-b border-white/10 px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                          Kayitli servisler
                                        </p>
                                      </div>
                                      <div className="no-scrollbar max-h-[228px] overflow-y-auto overflow-x-hidden p-2.5">
                                        {automationTargets.length === 0 ? (
                                          <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] text-slate-500">
                                            Henuz servis kaydi yok.
                                          </p>
                                        ) : (
                                          <div className="space-y-2">
                                            {automationTargets.map((targetRow, targetIndex) => {
                                              const backendLabel =
                                                String(
                                                  automationBackendOptions.find(
                                                    (option) =>
                                                      String(option?.key ?? "").trim() === targetRow.backend,
                                                  )?.label ?? "",
                                                ).trim() || targetRow.backend
                                              const serviceLabel = `Servis ${targetIndex + 1}`
                                              const isSelected = selectedAutomationTarget?.id === targetRow.id
                                              const isStarred = Boolean(targetRow?.starred)
                                              const deleteKey = `${offerId}:${targetRow.id}`
                                              const isDeleting = Boolean(
                                                automationTargetDeletingByOffer?.[deleteKey],
                                              )
                                              const starKey = `${offerId}:${targetRow.id}`
                                              const isStarring = Boolean(automationTargetStarringByOffer?.[starKey])
                                              const maskedUrl = maskSensitiveText(targetRow.url, 16)
                                              const maskedBackend = maskSensitiveText(backendLabel, 8)
                                              const urlDisplay = canViewAutomationTargetDetails
                                                ? targetRow.url
                                                : maskedUrl
                                              const backendLabelDisplay = canViewAutomationTargetDetails
                                                ? backendLabel
                                                : maskedBackend
                                              return (
                                                <div
                                                  key={`${offerId}-automation-target-row-${targetRow.id}`}
                                                  className={`group w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl border px-3 py-3 transition-colors ${
                                                    isSelected
                                                      ? "border-emerald-200/60 bg-emerald-500/10"
                                                      : "border-emerald-300/30 bg-emerald-500/5 hover:border-emerald-200/60 hover:bg-emerald-500/10"
                                                  }`}
                                                  onClick={() =>
                                                    handleAutomationTargetSelect(offerId, targetRow.id)
                                                  }
                                                  role="button"
                                                  tabIndex={0}
                                                  onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                      event.preventDefault()
                                                      handleAutomationTargetSelect(offerId, targetRow.id)
                                                    }
                                                  }}
                                                >
                                                  <div className="flex w-full min-w-0 flex-wrap items-start gap-2 sm:items-center">
                                                    <input
                                                      type="radio"
                                                      name={`automation-target-select-${offerId}`}
                                                      checked={isSelected}
                                                      onChange={() =>
                                                        handleAutomationTargetSelect(offerId, targetRow.id)
                                                      }
                                                      className="h-3.5 w-3.5 shrink-0 accent-accent-400"
                                                    />
                                                    <span className="shrink-0 rounded-md bg-[#0f172a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                                                      {serviceLabel}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 sm:flex-none sm:max-w-full">
                                                      {isStarred ? `\u2605 ${backendLabelDisplay}` : backendLabelDisplay}
                                                    </span>
                                                    <div className="flex w-full items-center justify-start gap-1.5 sm:ml-auto sm:w-auto sm:justify-end">
                                                      <button
                                                        type="button"
                                                        onClick={(event) => {
                                                          event.stopPropagation()
                                                          void handleAutomationTargetStarToggle(
                                                            offerId,
                                                            targetRow.id,
                                                            !isStarred,
                                                          )
                                                        }}
                                                        disabled={!canStarAutomationTargets || isStarring}
                                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                          isStarred
                                                            ? "border-amber-300/40 bg-amber-500/15 text-amber-100 hover:border-amber-200/60 hover:bg-amber-500/25"
                                                            : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10"
                                                        }`}
                                                        title={isStarred ? "Yildizi kaldir" : "Yildizla"}
                                                      >
                                                        {isStarring ? (
                                                          "..."
                                                        ) : (
                                                          isStarred ? (
                                                            <StarSolidIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                          ) : (
                                                            <StarOutlineIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                          )
                                                        )}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(event) => {
                                                          event.stopPropagation()
                                                          void handleAutomationTargetDelete(offerId, targetRow.id)
                                                        }}
                                                        disabled={!canManageAutomationTargets || isDeleting}
                                                        className="rounded-md border border-rose-300/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-100 transition hover:border-rose-200/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                      >
                                                        {isDeleting ? "..." : "Sil"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <div className="mt-2 min-w-0 w-full">
                                                    {canViewAutomationTargetDetails ? (
                                                      <a
                                                        href={targetRow.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="inline-flex w-full max-w-full items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                                                        title={targetRow.url}
                                                      >
                                                        <span className="inline-block max-w-full break-all sm:truncate">
                                                          {urlDisplay}
                                                        </span>
                                                      </a>
                                                    ) : (
                                                      <span
                                                        className="inline-flex w-full max-w-full items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
                                                        title={urlDisplay}
                                                      >
                                                        <span className="inline-block max-w-full break-all sm:truncate">
                                                          {urlDisplay}
                                                        </span>
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </section>
                                  </div>

                                  <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#0b0f1980] p-3.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                      Kontrol paneli
                                    </p>
                                    <div className="mt-3 space-y-2.5">
                                      <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2.5">
                                        {selectedAutomationTarget ? (
                                          <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="shrink-0 rounded-md bg-[#0f172a] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-200">
                                                {selectedAutomationServiceLabel}
                                              </span>
                                              {selectedAutomationTargetIsStarred && (
                                                <span className="rounded-md border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                                                  Yildizli
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                              Secili hedef calistirmaya hazir.
                                            </p>
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-slate-500">
                                            Calistirmak icin bir servis secin.
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAutomationRun(offerId, selectedAutomationTarget, name)
                                        }
                                        disabled={
                                          !canRunAutomation ||
                                          !selectedAutomationTarget ||
                                          isAutomationRunning
                                        }
                                        className="h-9 w-full rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isAutomationRunning ? "Calisiyor..." : "Calistir"}
                                      </button>
                                      {!String(automationWsUrl ?? "").trim() && (
                                        <p className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100/90">
                                          Websocket adresi yok. Stok cek sekmesinden kaydedin.
                                        </p>
                                      )}
                                    </div>
                                  </aside>

                                  {canViewAutomationLogs ? (
                                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/65 xl:col-span-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <span className="h-2 w-2 rounded-full bg-rose-300/80" />
                                          <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                                          <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
                                          <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                            Komut ciktilari
                                          </span>
                                        </div>
                                        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                                          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
                                            {automationRunLogEntries.length} satir
                                          </span>
                                          {canClearAutomationLogs && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                void clearAutomationRunLogs(offerId)
                                              }}
                                              disabled={
                                                isAutomationLogsClearing ||
                                                automationRunLogEntries.length === 0
                                              }
                                              className="inline-flex h-7 items-center rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              {isAutomationLogsClearing ? "..." : "Log temizle"}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="no-scrollbar h-[280px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
                                        <div className="space-y-0.5">
                                          {hasAutomationTwoFactorPrompt && (
                                            <div className="mb-2 border-b border-white/10 pb-1.5">
                                              <div className="flex min-w-0 flex-col items-start gap-2 text-slate-300 sm:flex-row sm:flex-wrap sm:items-center">
                                                <span className="flex-none text-emerald-300">
                                                  [2FA]
                                                </span>
                                                <span className="hidden flex-none text-slate-500 sm:inline">
                                                  C:\plcp\automation&gt;
                                                </span>
                                                <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                                                <span className="flex-none text-slate-300">
                                                  iki-faktor-kodu {automationTwoFactorBackendDisplay}
                                                </span>
                                                <input
                                                  type="text"
                                                  value={automationTwoFactorCodeValue}
                                                  onChange={(event) =>
                                                    setAutomationTwoFactorCodeByOffer((prev) => ({
                                                      ...prev,
                                                      [offerId]: event.target.value,
                                                    }))
                                                  }
                                                  onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                      event.preventDefault()
                                                      handleAutomationTwoFactorCodeSubmit(offerId)
                                                    }
                                                  }}
                                                  autoFocus={hasAutomationTwoFactorPrompt}
                                                  placeholder={automationTwoFactorMessage || "kodu yaz ve Enter"}
                                                  className="h-7 w-full min-w-0 flex-1 border-0 border-b border-white/20 bg-transparent px-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-0 sm:min-w-[140px]"
                                                />
                                              </div>
                                            </div>
                                          )}
                                          {visibleAutomationRunLogEntries.map((entry) => (
                                            <div key={entry.id} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-200 sm:flex-nowrap">
                                              <span className="hidden flex-none text-slate-500 sm:inline">C:\plcp\automation&gt;</span>
                                              <span className="flex-none text-slate-500 sm:hidden">&gt;</span>
                                              <span
                                                className={`flex-none ${
                                                  entry.status === "success"
                                                    ? "text-emerald-300"
                                                    : entry.status === "error"
                                                      ? "text-rose-300"
                                                      : "text-amber-300"
                                                }`}
                                              >
                                                [{entry.time}]
                                              </span>
                                              <span
                                                className={`flex-none ${
                                                  entry.status === "success"
                                                    ? "text-emerald-300"
                                                    : entry.status === "error"
                                                      ? "text-rose-300"
                                                      : "text-amber-300"
                                                }`}
                                              >
                                                {entry.status === "success"
                                                  ? "OK"
                                                  : entry.status === "error"
                                                    ? "ERR"
                                                    : "RUN"}
                                              </span>
                                              <span className="min-w-0 break-words text-slate-100">
                                                {entry.visibleMessage}
                                              </span>
                                            </div>
                                          ))}
                                          {Array.from({ length: emptyAutomationRunLogRows }).map((_, index) => (
                                            <div key={`automation-placeholder-${offerId}-${index}`} className="flex min-w-0 flex-wrap items-start gap-2 text-slate-700 sm:flex-nowrap">
                                              <span className="hidden flex-none text-slate-600 sm:inline">C:\plcp\automation&gt;</span>
                                              <span className="flex-none text-slate-600 sm:hidden">&gt;</span>
                                              <span className="flex-none text-slate-700">[--:--]</span>
                                              <span className="flex-none text-slate-700">--</span>
                                              <span
                                                className={`truncate text-slate-700 ${
                                                  automationRunLogEntries.length === 0 && index === 0
                                                    ? "text-slate-500"
                                                    : "opacity-0"
                                                }`}
                                              >
                                                {automationRunLogEntries.length === 0 && index === 0 ? "bekleniyor..." : "placeholder"}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </section>
                                  ) : (
                                    <div className="rounded-2xl border border-white/10 bg-ink-900/60 px-3 py-3 text-[11px] text-slate-400 xl:col-span-2">
                                      CMD loglarini goruntuleme izniniz yok.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          )}
                          {activePanel === "inventory" && (
                            <div className="grid items-start gap-3 lg:grid-cols-2">
                              <div className="min-w-0 rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-4 shadow-card -mt-2 animate-panelFade sm:p-5 lg:col-span-2">
                              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.2fr)]">
                          <div className="order-2 space-y-4 lg:col-start-2 lg:row-start-1 lg:order-none">
                            {isOfferRefreshing ? (
                              <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/40 p-4 shadow-inner">
                                <SkeletonBlock className="h-4 w-32 rounded-lg" />
                                <SkeletonBlock className="h-20 w-full rounded-xl" />
                                <SkeletonBlock className="h-20 w-full rounded-xl" />
                              </div>
                            ) : isStockEnabled ? (
                                <>
                              {isKeysLoading && (
                                <div className="rounded-2xl border border-white/10 bg-ink-900/40 px-4 py-3 text-xs text-slate-400 shadow-inner">
                                  Stoklar yukleniyor...
                                </div>
                              )}
                              {!isKeysLoading && availableKeys.length === 0 && (
                                <div className="rounded-2xl border border-white/10 bg-ink-900/40 px-4 py-3 text-xs text-slate-400 shadow-inner">
                                  Bu üründe kullanılabilir stok yok.
                                </div>
                              )}
                              {!isKeysLoading && availableKeys.length > 0 && (
                                <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                                  {canCopyKeys && (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Stoklar</span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/60 px-2 py-1">
                                          <input
                                            id={`bulk-${offerId}`}
                                            type="text"
                                            value={bulkCounts[offerId] ?? availableCount}
                                            onChange={(event) =>
                                              handleBulkCountChange(offerId, event.target.value)
                                            }
                                            inputMode="numeric"
                                            className="w-16 appearance-none bg-transparent text-xs text-slate-100 focus:outline-none"
                                          />
                                          <span className="text-[11px] text-slate-500">/ {availableCount}</span>
                                        </div>
                                        {canUpdateKeys && (
                                          <button
                                            type="button"
                                            onClick={() => handleBulkCopy(offerId, true)}
                                            className="rounded-md border border-amber-300/60 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-8 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/20"
                                          >
                                            Kopyala + kullanıldı
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleBulkCopy(offerId, false)}
                                          className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-8 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25"
                                        >
                                          Kopyala
                                        </button>
                          </div>
                        </div>
                                  )}
                                  <div className="space-y-2">
                                    {availableKeys.map((item, index) => {
                                      const isDeleting = Boolean(keysDeleting?.[item.id])
                                      const isFading = Boolean(keyFadeById?.[item.id])
                                      const isEditing = Object.prototype.hasOwnProperty.call(
                                        editingKeys,
                                        item.id,
                                      )
                                      const isSaving = Boolean(savingKeys[item.id])
                                      const draftValue = editingKeys[item.id] ?? ""
                                      return (
                                        <div
                                          key={item.id}
                                          className={`group flex flex-col items-start gap-3 rounded-xl border border-emerald-300/30 bg-emerald-500/5 px-3 py-2 transition-all duration-300 hover:border-emerald-200/60 hover:bg-emerald-500/10 sm:flex-row sm:items-center animate-panelFade ${
                                            isDeleting ? "opacity-60" : ""
                                          } ${isFading ? "animate-keyFadeOut" : ""}`}
                                        >
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-950/60 text-[11px] font-semibold text-slate-300 transition group-hover:border-accent-300 group-hover:text-accent-100">
                                            #{index + 1}
                                          </span>
                                          {isEditing ? (
                                            <div className="w-full flex-1">
                                              <input
                                                type="text"
                                                value={draftValue}
                                                onChange={(event) =>
                                                  handleKeyEditChange(item.id, event.target.value)
                                                }
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    event.preventDefault()
                                                    handleKeyEditSave(offerId, item.id)
                                                  }
                                                  if (event.key === "Escape") {
                                                    event.preventDefault()
                                                    handleKeyEditCancel(item.id)
                                                  }
                                                }}
                                                disabled={isSaving}
                                                autoFocus
                                                className="w-full rounded-md border border-white/10 bg-ink-900 px-2.5 py-1.5 font-mono text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                            </div>
                                          ) : (
                                            <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100">
                                              {item.code}
                                            </p>
                                          )}
                                          <div className="grid w-full grid-cols-2 gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:w-auto">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditSave(offerId, item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-6 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  KAYDET
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditCancel(item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-6 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  İPTAL
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                {canCopyKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyCopy(item.code)}
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                  >
                                                    Kopyala
                                                  </button>
                                                )}
                                                {canEditKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyEditStart(item.id, item.code)}
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-sky-300/60 bg-sky-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 sm:w-auto"
                                                  >
                                                    DÜZENLE</button>
                                                )}
                                                {canUpdateKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleKeyStatusUpdate(offerId, item.id, "used")
                                                    }
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                                  >
                                                    Kullanıldı
                                                  </button>
                                                )}
                                                {canDeleteKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyDelete(offerId, item.id)}
                                                    disabled={isDeleting}
                                                    className={`flex h-6 w-full items-center justify-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-wide transition hover:-translate-y-0.5 sm:w-auto ${
                                                      confirmKeyTarget === `${offerId}-${item.id}`
                                                        ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                                        : "border-rose-300/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                                    }`}
                                                  >
                                                    {confirmKeyTarget === `${offerId}-${item.id}`
                                                      ? "ONAYLA"
                                                      : "SİL"}
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {(
                                <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Kullanılan Stoklar</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full border border-rose-300/60 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-50">
                                        {usedKeys.length} adet
                                      </span>
                                      {canCopyKeys && (
                                        <button
                                          type="button"
                                          onClick={() => handleUsedBulkDownload(offerId, name, usedKeys)}
                                          className="rounded-md border border-sky-300/60 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-500/20"
                                        >
                                          Toplu indir
                                        </button>
                                      )}
                                      {canDeleteKeys && (
                                        <button
                                          type="button"
                                          onClick={() => handleBulkDelete(offerId, usedKeys)}
                                          className="rounded-md border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-50 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/20"
                                        >
                                          Toplu sil
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {usedKeys.map((item, index) => {
                                      const isDeleting = Boolean(keysDeleting?.[item.id])
                                      const isFading = Boolean(keyFadeById?.[item.id])
                                      const isEditing = Object.prototype.hasOwnProperty.call(
                                        editingKeys,
                                        item.id,
                                      )
                                      const isSaving = Boolean(savingKeys[item.id])
                                      const draftValue = editingKeys[item.id] ?? ""
                                      return (
                                        <div
                                          key={item.id}
                                          className={`group flex flex-col items-start gap-3 rounded-xl border border-rose-300/30 bg-rose-500/5 px-3 py-2 transition-all duration-300 hover:border-rose-200/60 hover:bg-rose-500/10 sm:flex-row sm:items-center ${
                                            isDeleting ? "opacity-60" : ""
                                          } ${isFading ? "animate-keyFadeOut" : ""}`}
                                        >
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-950/60 text-[11px] font-semibold text-slate-300 transition group-hover:border-amber-300 group-hover:text-amber-100">
                                            #{index + 1}
                                          </span>
                                          {isEditing ? (
                                            <div className="w-full flex-1">
                                              <input
                                                type="text"
                                                value={draftValue}
                                                onChange={(event) =>
                                                  handleKeyEditChange(item.id, event.target.value)
                                                }
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    event.preventDefault()
                                                    handleKeyEditSave(offerId, item.id)
                                                  }
                                                  if (event.key === "Escape") {
                                                    event.preventDefault()
                                                    handleKeyEditCancel(item.id)
                                                  }
                                                }}
                                                disabled={isSaving}
                                                autoFocus
                                                className="w-full rounded-md border border-white/10 bg-ink-900 px-2.5 py-1.5 font-mono text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                            </div>
                                          ) : (
                                            <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100">
                                              {item.code}
                                            </p>
                                          )}
                                          <div className="grid w-full grid-cols-2 gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:w-auto">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditSave(offerId, item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-6 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  KAYDET
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditCancel(item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-6 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  İPTAL
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                {canCopyKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyCopy(item.code)}
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                  >
                                                    Kopyala
                                                  </button>
                                                )}
                                                {canEditKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyEditStart(item.id, item.code)}
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-sky-300/60 bg-sky-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 sm:w-auto"
                                                  >
                                                    DÜZENLE</button>
                                                )}
                                                {canUpdateKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleKeyStatusUpdate(offerId, item.id, "available")
                                                    }
                                                    className="flex h-6 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                                  >
                                                    GERİ AL
                                                  </button>
                                                )}
                                                {canDeleteKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyDelete(offerId, item.id)}
                                                    disabled={isDeleting}
                                                    className={`flex h-6 w-full items-center justify-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-wide transition hover:-translate-y-0.5 sm:w-auto ${
                                                      confirmKeyTarget === `${offerId}-${item.id}`
                                                        ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                                        : "border-rose-300/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                                    }`}
                                                  >
                                                    {confirmKeyTarget === `${offerId}-${item.id}`
                                                      ? "ONAYLA"
                                                      : "SİL"}
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              </>
                            ) : (
                              <div className="rounded-2xl border border-white/10 bg-ink-900/40 px-4 py-3 text-xs text-slate-400 shadow-inner">
                                Bu üründe stok kapalı. Üstteki ON/OFF anahtarından açın.
                              </div>
                            )}
                            </div>
                          <div className="order-1 self-start rounded-2xl border border-white/10 bg-ink-900/50 p-4 lg:col-start-1 lg:row-start-1 lg:order-none">
                              <div>
                                {messageGroupMessages.length === 0 ? (
                                  <div className="text-xs text-slate-400">
                                    {messageGroupId
                                      ? "Bu grupta mesaj yok."
                                      : "Bağımsız mesaj yok."}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {messageGroupMessages.map((label) => {
                                      const messageDeleteTarget = `${offerId}:${messageGroupId || "independent"}:${label}`
                                      const isConfirmingDelete =
                                        confirmMessageTemplateDelete === messageDeleteTarget
                                      return (
                                        <div
                                          key={`${offerId}-msg-${messageGroupId || "independent"}-${label}`}
                                          className="flex max-w-full items-stretch gap-1 animate-panelFade"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleMessageTemplateCopy(label)}
                                            className="max-w-full rounded-md border border-white/15 bg-white/5 px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 whitespace-normal break-words"
                                          >
                                            {label}
                                          </button>
                                          {canDeleteMessageItem && (
                                            <button
                                              type="button"
                                              onClick={() => handleMessageTemplateRemove(offerId, label)}
                                              className="rounded-md border border-rose-300/60 bg-rose-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-50 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                            >
                                              {isConfirmingDelete ? "ONAYLA" : "SİL"}
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                          </div>
                              </div>
                              </div>
                            </div>
                          )}
                      </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {filteredList.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="text-slate-400">
                {pageStart}-{pageEnd} / {totalItems}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Önceki sayfa"
                  title="Önceki sayfa"
                >
                  <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="px-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Sonraki sayfa"
                  title="Sonraki sayfa"
                >
                  <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <StockModal
        isOpen={Boolean(stockModalTarget)}
        onClose={handleStockModalClose}
        draft={stockModalDraft}
        setDraft={setStockModalDraft}
        targetName={stockModalTarget?.name}
        lineRef={stockModalLineRef}
        lineCount={stockModalLineCount}
        textareaRef={stockModalTextareaRef}
        onScroll={handleStockModalScroll}
        onSave={handleStockModalSave}
      />
      {typeof document !== "undefined" && resultModalContent
        ? createPortal(resultModalContent, document.body)
        : null}
    </div>
  )
}

