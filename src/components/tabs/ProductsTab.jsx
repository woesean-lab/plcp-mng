import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"
import useEldoradoAutomationRuntime from "../../hooks/useEldoradoAutomationRuntime"
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
    } catch (error) {
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
const getCategoryKey = (product) => {
  const direct = normalizeCategoryKey(product?.category)
  if (direct) return direct
  const derived = getCategoryKeyFromHref(product?.href)
  return derived || "diger"
}
const MAX_AUTOMATION_RUN_LOG_ENTRIES = 300
const CMD_VISIBLE_ROWS = 15

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
  isRefreshing = false,
  onRefresh,
  keysByOffer = {},
  keysLoading = {},
  keysDeleting = {},
  groups = [],
  groupAssignments = {},
  notesByOffer = {},
  noteGroups = [],
  noteGroupAssignments = {},
  noteGroupNotes = {},
  messageGroups = [],
  messageGroupAssignments = {},
  messageGroupTemplates = {},
  messageTemplatesByOffer = {},
  templates = [],
  activeUsername = "",
  stockEnabledByOffer = {},
  automationWsUrl = "",
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
  onDeleteNoteGroup,
  onCreateNoteGroup,
  onAssignNoteGroup,
  onSaveNote,
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
  canTogglePrice: canTogglePriceProp,
  canAddKeys = false,
  canDeleteKeys = false,
  canCopyKeys = false,
  canEditKeys: canEditKeysProp = false,
  canChangeKeyStatus: canChangeKeyStatusProp = false,
  canManageGroups: canManageGroupsProp,
  canManageNotes: canManageNotesProp,
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
  const [noteDrafts, setNoteDrafts] = useState({})
  const [stockModalDraft, setStockModalDraft] = useState("")
  const [stockModalTarget, setStockModalTarget] = useState(null)
  const [editingKeys, setEditingKeys] = useState({})
  const [savingKeys, setSavingKeys] = useState({})
  const [confirmGroupDelete, setConfirmGroupDelete] = useState(null)
  const [noteGroupDrafts, setNoteGroupDrafts] = useState({})
  const [noteGroupSelectionDrafts, setNoteGroupSelectionDrafts] = useState({})
  const [activePanelByOffer, setActivePanelByOffer] = useState({})
  const [confirmNoteGroupDelete, setConfirmNoteGroupDelete] = useState(null)
  const [noteEditingByOffer, setNoteEditingByOffer] = useState({})
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
  const [isAddingPopupStock, setIsAddingPopupStock] = useState(false)
  const [isPopupValueEditing, setIsPopupValueEditing] = useState(false)
  const [popupValueDraft, setPopupValueDraft] = useState("")
  const [priceDrafts, setPriceDrafts] = useState({})
  const [savedPricesByOffer, setSavedPricesByOffer] = useState(
    savedPricesByOfferProp && typeof savedPricesByOfferProp === "object"
      ? savedPricesByOfferProp
      : {},
  )
  const [keyFadeById, setKeyFadeById] = useState({})
  const [noteGroupFlashByOffer, setNoteGroupFlashByOffer] = useState({})
  const [selectFlashByKey, setSelectFlashByKey] = useState({})
  const stockModalLineRef = useRef(null)
  const stockModalTextareaRef = useRef(null)
  const popupValueEditorRef = useRef(null)
  const popupValueCopyTimerRef = useRef(null)
  const prevNoteGroupAssignments = useRef(noteGroupAssignments)
  const prevGroupAssignments = useRef(groupAssignments)
  const prevMessageGroupAssignments = useRef(messageGroupAssignments)
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
        next[offerId] = {
          base: price.base ?? "",
          percent: price.percent ?? "",
        }
      })
      return next
    })
  }, [savedPricesByOfferProp])
  const canManageGroups = typeof canManageGroupsProp === "boolean" ? canManageGroupsProp : canAddKeys
  const canManageNotes =
    typeof canManageNotesProp === "boolean"
      ? canManageNotesProp
      : canAddKeys && typeof onSaveNote === "function"
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
    automationWsProbeStatus,
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
    canClearAutomationLogs,
    canViewAutomationTargetDetails,
    maskSensitiveText,
    setAutomationResultPopup,
    maxAutomationRunLogEntries: MAX_AUTOMATION_RUN_LOG_ENTRIES,
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
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(true)
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
    return {
      label: isConnected ? "Baglanildi" : "Baglanilmadi",
    }
  }, [automationConnectionStateByOffer, automationWsProbeStatus, automationWsUrl])
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
      String(automationBackendOptions?.[0]?.key ?? "").trim()
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
        ...(prev[normalizedId] ?? { base: "", percent: "" }),
        [field]: value,
      },
    }))
  }
  const handlePriceSave = async (offerId, base, percent, result) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    if (typeof onSavePrice === "function") {
      const ok = await onSavePrice(normalizedId, base, percent, result)
      if (!ok) return
    }
    setSavedPricesByOffer((prev) => ({
      ...prev,
      [normalizedId]: {
        base,
        percent,
        result,
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
  const handleNoteDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }
  const handleNoteGroupDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteGroupDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }
  const handleNoteReset = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteDrafts((prev) => {
      const next = { ...prev }
      delete next[normalizedId]
      return next
    })
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
  const toggleNoteEdit = (offerId) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteEditingByOffer((prev) => {
      const next = !prev[normalizedId]
      if (!next) {
        handleNoteReset(normalizedId)
      }
      return { ...prev, [normalizedId]: next }
    })
  }
  const handleNoteSave = (offerId) => {
    if (!canManageNotes) return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = noteDrafts[normalizedId]
    const noteGroupId = String(noteGroupAssignments?.[normalizedId] ?? "").trim()
    const stored = noteGroupId
      ? noteGroupNotes?.[noteGroupId] ?? ""
      : notesByOffer?.[normalizedId] ?? ""
    const value = draft !== undefined ? draft : stored
    onSaveNote(normalizedId, value)
    handleNoteReset(normalizedId)
    setNoteEditingByOffer((prev) => ({ ...prev, [normalizedId]: false }))
  }
  const handleNoteGroupCreate = async (offerId) => {
    if (typeof onCreateNoteGroup !== "function" || typeof onAssignNoteGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = noteGroupDrafts[normalizedId] ?? ""
    const created = await onCreateNoteGroup(draft)
    if (!created) return
    setNoteGroupDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
    onAssignNoteGroup(normalizedId, created.id)
  }
  const handleNoteGroupAssign = (offerId, groupId) => {
    if (typeof onAssignNoteGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteDrafts((prev) => {
      const next = { ...prev }
      delete next[normalizedId]
      return next
    })
    setConfirmNoteGroupDelete(null)
    onAssignNoteGroup(normalizedId, groupId)
  }
  const handleNoteGroupDelete = (groupId) => {
    if (typeof onDeleteNoteGroup !== "function") return
    const normalizedGroupId = String(groupId ?? "").trim()
    if (!normalizedGroupId) return
    if (confirmNoteGroupDelete === normalizedGroupId) {
      setConfirmNoteGroupDelete(null)
      onDeleteNoteGroup(normalizedGroupId)
      return
    }
    setConfirmNoteGroupDelete(normalizedGroupId)
    toast("Not grubunu silmek icin tekrar tikla", { position: "top-right" })
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
    const prev = prevNoteGroupAssignments.current || {}
    const next = noteGroupAssignments || {}
    const changed = new Set()
    Object.keys(next).forEach((offerId) => {
      if (next[offerId] !== prev[offerId]) changed.add(offerId)
    })
    Object.keys(prev).forEach((offerId) => {
      if (!(offerId in next)) changed.add(offerId)
    })
    if (changed.size > 0) {
      setNoteGroupFlashByOffer((current) => {
        const updated = { ...current }
        changed.forEach((offerId) => {
          updated[offerId] = true
        })
        return updated
      })
      setTimeout(() => {
        setNoteGroupFlashByOffer((current) => {
          const updated = { ...current }
          changed.forEach((offerId) => {
            delete updated[offerId]
          })
          return updated
        })
      }, 320)
    }
    setNoteGroupSelectionDrafts((current) => {
      const updated = { ...current }
      Object.entries(updated).forEach(([offerId, draftValue]) => {
        const assigned = String(next?.[offerId] ?? "").trim()
        const normalizedDraft = String(draftValue ?? "").trim()
        if (normalizedDraft === assigned) {
          delete updated[offerId]
        }
      })
      return updated
    })
    prevNoteGroupAssignments.current = next
  }, [noteGroupAssignments])
  useEffect(() => {
    const defaultBackend = String(automationBackendOptions?.[0]?.key ?? "").trim()
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
  }, [automationBackendOptions, automationTargetsByOffer])
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
  const handlePopupAddToStock = async () => {
    if (typeof onAddKeys !== "function") {
      toast.error("Stoga ekleme islemi kullanilamiyor.")
      return
    }

    const offerId = String(automationResultPopup.offerId ?? "").trim()
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

    setIsAddingPopupStock(true)
    try {
      const ok = await onAddKeys(offerId, valueToAdd)
      if (!ok) return
      appendAutomationRunLog(
        offerId,
        "success",
        "Stoga eklendi: 1 satir",
      )
      setAutomationResultPopup((prev) => ({
        ...prev,
        isOpen: false,
      }))
    } finally {
      setIsAddingPopupStock(false)
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
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M7.629 13.314 4.486 10.17l-1.172 1.172 4.315 4.315L16.686 6.6l-1.172-1.172z" />
            </svg>
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

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-lg border border-sky-300/70 bg-sky-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void handlePopupAddToStock()
            }}
            disabled={isAddingPopupStock}
          >
            {isAddingPopupStock ? "EKLENIYOR..." : "Stoga Ekle"}
          </button>
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
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Ürün listesi
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Ürün listesi
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Ürün adlarını gör ve filtrele.
            </p>
          </div>
          <div className="w-full md:max-w-[760px]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-slate-100"
                title={isCategoryMenuOpen ? "Kategori menusu kapat" : "Kategori menusu ac"}
                aria-label={isCategoryMenuOpen ? "Kategori menusu kapat" : "Kategori menusu ac"}
                aria-expanded={isCategoryMenuOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${isCategoryMenuOpen ? "" : "rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 14 6-6 6 6" />
                </svg>
              </button>
              {canRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition ${
                    isRefreshing
                      ? "cursor-not-allowed border-white/5 text-slate-600"
                      : "hover:border-white/20 hover:bg-white/5 hover:text-slate-100 focus-visible:bg-white/5 focus-visible:text-slate-100"
                  }`}
                  title="Ürünleri yenile"
                  aria-label="Ürünleri yenile"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12a8 8 0 1 0 2.35-5.65" />
                    <path d="M4 4v4h4" />
                  </svg>
                </button>
              )}
            </div>
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
            <div className="flex w-full flex-col gap-2">
              <div className="flex h-11 w-full items-center gap-3 rounded border border-white/10 bg-ink-900 px-4 shadow-inner">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ara</span>
                <div className="flex flex-1 items-center gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ürün adı ara"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="inline-flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
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
            </div>
          </div>
          <div key={activeCategoryKey} className="mt-4 space-y-2">
            {isRefreshing ? (
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
                  const noteGroupId = String(noteGroupAssignments?.[offerId] ?? "").trim()
                  const noteGroup = noteGroupId
                    ? noteGroups.find((entry) => entry.id === noteGroupId)
                    : null
                  const noteGroupName = String(noteGroup?.name ?? "").trim()
                  const noteGroupSelectionValue =
                    noteGroupSelectionDrafts[offerId] ?? noteGroupId
                  const isNoteGroupSelectionDirty = noteGroupSelectionValue !== noteGroupId
                  const noteGroupNote = String(noteGroupNotes?.[noteGroupId] ?? "").trim()
                  const storedNote = noteGroupId
                    ? noteGroupNote
                    : String(notesByOffer?.[offerId] ?? "").trim()
                  const noteDraftValue = noteDrafts[offerId]
                  const noteInputValue = noteDraftValue !== undefined ? noteDraftValue : storedNote
                  const noteHasChanges = String(noteInputValue ?? "").trim() !== storedNote
                  const noteGroupDraftValue = noteGroupDrafts[offerId] ?? ""
                  const availablePanels = ["inventory", "note", "messages"]
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
                    String(automationBackendOptions?.[0]?.key ?? "").trim()
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
                        ...automationBackendOptions.map((option) => String(option?.key ?? "").trim()),
                        ...automationBackendOptions.map((option) => String(option?.label ?? "").trim()),
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
                  if (isStockEnabled) {
                    availablePanels.push("stock-group")
                  }
                  if (isPriceEnabled) {
                    availablePanels.push("price")
                  }
                  if (isAutomationEnabled && canViewAutomationPanel) {
                    availablePanels.push("automation")
                  }
                  const storedPanel = activePanelByOffer[offerId]
                  const activePanel =
                    storedPanel === "none"
                      ? "none"
                      : availablePanels.includes(storedPanel)
                        ? storedPanel
                        : "inventory"
                  const isNoteEditing = Boolean(noteEditingByOffer[offerId])
                  const canEditNoteText = canManageNotes && isNoteEditing
                  const canSaveNote =
                    Boolean(offerId) && canManageNotes && noteHasChanges && isNoteEditing
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
                  const priceDraft = priceDrafts[offerId] ?? { base: "", percent: "" }
                  const baseValue = String(priceDraft.base ?? "").replace(",", ".")
                  const percentValue = String(priceDraft.percent ?? "").replace(",", ".")
                  const baseNumber = Number(baseValue)
                  const percentNumber = Number(percentValue)
                  const priceResult =
                    Number.isFinite(baseNumber) && Number.isFinite(percentNumber)
                      ? baseNumber * (percentNumber / 100)
                      : ""
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
                      } ${isOpen ? "border-accent-400/60" : ""}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap">
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
                          <div className="flex min-h-[36px] flex-wrap items-center gap-2">
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
                              <div className="flex shrink-0 flex-nowrap items-center gap-2">
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
                        <div className="flex flex-wrap items-stretch gap-1.5">
                          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#ffffff1a] bg-[#ffffff0d] px-2.5 py-1 shadow-inner sm:h-[36px] sm:w-[216px] sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleStockToggle(offerId)}
                              disabled={!canManageStock || !offerId}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
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
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 2v6" />
                                <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePriceToggle(offerId)}
                              disabled={!offerId || !canTogglePrice}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
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
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 2v20" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutomationToggle(offerId)}
                              disabled={!offerId || !canManageAutomationTargets}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md transition before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
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
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="currentColor"
                              >
                                <path d="M8 6v12l10-6z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStarred(offerId)}
                              disabled={!offerId || !canStarOffers}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
                                !offerId || !canStarOffers ? "cursor-not-allowed opacity-60" : ""
                              } ${starredOffers[offerId] ? "text-yellow-300" : ""}`}
                              aria-label="Ürünü yıldızla"
                              title={starredOffers[offerId] ? "Yıldızı kaldır" : "Yıldızla"}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill={starredOffers[offerId] ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m12 2 3.1 6.3 7 .9-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-.9z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOfferRefresh(offerId)}
                              disabled={!offerId || isKeysLoading || !isStockEnabled || isOfferRefreshing}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
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
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className={`h-4 w-4 ${isKeysLoading || isOfferRefreshing ? "animate-spin" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 12a8 8 0 1 0 2.35-5.65" />
                                <path d="M4 4v4h4" />
                              </svg>
                            </button>
                            {canDeleteOffers && (
                              <button
                                type="button"
                                onClick={() => handleOfferDeleteWithConfirm(offerId)}
                                disabled={!offerId}
                                className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
                                  !offerId ? "cursor-not-allowed opacity-60" : ""
                                } ${confirmOfferDelete === offerId ? "bg-rose-500/20 text-rose-100" : ""}`}
                                aria-label="Urun sil"
                                title={confirmOfferDelete === offerId ? "Onayla" : "Sil"}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M6 6l1 14h10l1-14" />
                                  <path d="M10 10v6" />
                                  <path d="M14 10v6" />
                                </svg>
                              </button>
                            )}
                            {href && canViewLinks && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition"
                                aria-label="Ürün linki"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10.5 5.5" />
                                  <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13.5 18.5" />
                                </svg>
                              </a>
                            )}
                            {canAddKeys && (
                              <button
                                type="button"
                                onClick={() => openStockModal(offerId, name)}
                                disabled={!offerId || !isStockEnabled}
                                className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
                                  !offerId || !isStockEnabled
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                }`}
                                aria-label="Stok ekle"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 5v14" />
                                  <path d="M5 12h14" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleOfferOpen(offerId)}
                              disabled={!offerId || !canToggleCard}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:text-white before:content-[''] before:absolute before:-inset-y-0 before:-inset-x-0.5 before:rounded-lg before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition ${
                                isOpen ? "bg-white/10 text-white" : ""
                              } ${!offerId || !canToggleCard ? "cursor-not-allowed opacity-60" : ""}`}
                              aria-label="Ürün detaylarını aç/kapat"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m9 6 6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {isOpen && (
                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                          <div className="rounded-2xl rounded-b-none border border-white/10 bg-[#131826] px-3 pt-2 shadow-card">
                            <div className="flex flex-wrap items-end gap-4 border-b border-white/10" role="tablist">
                              <button
                                type="button"
                                onClick={() => setActivePanel(offerId, "inventory")}
                                className={`group flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                  activePanel === "inventory"
                                    ? "border-accent-400 text-white"
                                    : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                }`}
                                aria-pressed={activePanel === "inventory"}
                              >
                                <span>Stok</span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
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
                                  className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                    activePanel === "automation"
                                      ? "border-accent-400 text-white"
                                      : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                  } ${!canViewAutomationPanel ? "cursor-not-allowed opacity-60" : ""}`}
                                  aria-pressed={activePanel === "automation"}
                                >
                                  <span>Stok çek</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setActivePanel(offerId, "note")}
                                className={`group flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                  activePanel === "note"
                                    ? "border-accent-400 text-white"
                                    : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                }`}
                                aria-pressed={activePanel === "note"}
                              >
                                <span>Ürün notu</span>
                                <span
                                  className={`max-w-[220px] whitespace-normal break-words rounded-full border px-2 py-0.5 text-left text-[10px] font-semibold leading-snug ${
                                    activePanel === "note"
                                      ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                                      : "border-white/10 bg-white/5 text-slate-300 group-hover:text-slate-200"
                                  }`}
                                >
                                  {noteGroupName || "Bağımsız"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActivePanel(offerId, "messages")}
                                className={`group flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                  activePanel === "messages"
                                    ? "border-accent-400 text-white"
                                    : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                }`}
                                aria-pressed={activePanel === "messages"}
                              >
                                <span>Mesaj grubu</span>
                                <span
                                  className={`max-w-[220px] whitespace-normal break-words rounded-full border px-2 py-0.5 text-left text-[10px] font-semibold leading-snug ${
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
                                  className={`group flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                    activePanel === "stock-group"
                                      ? "border-accent-400 text-white"
                                      : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                  }`}
                                  aria-pressed={activePanel === "stock-group"}
                                >
                                  <span>Stok grubu</span>
                                  <span
                                    className={`max-w-[220px] whitespace-normal break-words rounded-full border px-2 py-0.5 text-left text-[10px] font-semibold leading-snug ${
                                      activePanel === "stock-group"
                                        ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                                        : "border-white/10 bg-white/5 text-slate-300 group-hover:text-slate-200"
                                    }`}
                                  >
                                    {groupName || "Bağımsız"}
                                  </span>
                                </button>
                              )}
                              {isPriceEnabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!canManagePrices) return
                                    setActivePanel(offerId, "price")
                                  }}
                                  className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
                                    activePanel === "price"
                                      ? "border-accent-400 text-white"
                                      : "border-transparent text-slate-400 hover:border-white/30 hover:text-slate-200"
                                  } ${!canManagePrices ? "cursor-not-allowed opacity-60" : ""}`}
                                  aria-pressed={activePanel === "price"}
                                >
                                  <span>Fiyat</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {activePanel !== "inventory" && (
                          <div className={`grid items-start gap-3 ${isStockEnabled ? "lg:grid-cols-2" : ""}`}>
                            {isStockEnabled && activePanel === "stock-group" && (
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                {isOfferRefreshing && (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-24 rounded-lg" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                  </div>
                                )}
                                {!isOfferRefreshing && (
                                  <>
                                <div className="mt-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
                                  <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Stok grubu</label>
                                    <div
                                      className={`mt-1 flex flex-wrap items-center gap-2 ${
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
                                        className="min-w-[160px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-9 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                                          className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-9 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
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
                                          className="rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-9 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          KAYDET
                                        </button>
                                      )}
                                      {groupId && canManageGroups && (
                                        <button
                                          type="button"
                                          onClick={() => handleGroupDelete(offerId, groupId)}
                                          className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-9 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                        >
                                          {confirmGroupDelete === groupId ? "ONAYLA" : "SİL"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {canManageGroups && (
                                    <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Yeni grup</label>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <input
                                          type="text"
                                          value={groupDraftValue}
                                          onChange={(event) => handleGroupDraftChange(offerId, event.target.value)}
                                          placeholder="Yeni grup adı"
                                          disabled={!canManageGroups}
                                          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 h-9 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleGroupCreate(offerId)}
                                          disabled={!canManageGroups || !groupDraftValue.trim()}
                                          className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-9 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                {isOfferRefreshing ? (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-28 rounded-lg" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                  </div>
                                ) : (
                                  <>
                                <div className="mt-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                <div className="mt-1 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
                                  <div className="rounded-lg border border-white/10 bg-ink-900/50 p-4">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Fiyat gir</label>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={priceDraft.base}
                                        onChange={(event) =>
                                          handlePriceDraftChange(offerId, "base", event.target.value)
                                        }
                                        placeholder="Baz fiyat"
                                        disabled={!canManagePrices}
                                        className="min-w-[160px] flex-1 rounded-md border border-white/10 bg-ink-900/60 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                                      />
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
                                        disabled={priceResult === "" || !offerId || !canManagePrices}
                                        className="rounded-md border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-8 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        KAYDET
                                      </button>
                                    </div>
                                  </div>
                                  {canViewPriceDetails && (
                                    <div className="rounded-lg border border-white/10 bg-ink-900/50 p-4">
                                      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{"Y\u00fczdelik"}</label>
                                      <div className="mt-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <input
                                            type="text"
                                            value={priceDraft.percent}
                                            onChange={(event) =>
                                              handlePriceDraftChange(offerId, "percent", event.target.value)
                                            }
                                            placeholder="%"
                                            disabled={!canManagePrices}
                                            className="min-w-[120px] flex-1 rounded-md border border-white/10 bg-ink-900/60 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-md border border-accent-400/40 bg-accent-500/10 px-3 py-2 text-[12px] font-semibold text-accent-50">
                                          <span className="text-[10px] font-semibold text-accent-100/80">
                                            {"Sonu\u00e7"}
                                          </span>
                                          <span>{priceResult === "" ? "-" : priceResult.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {activePanel === "automation" && isAutomationEnabled && (
                              <div className="relative -mt-2 overflow-x-hidden rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-4 shadow-card lg:col-span-2 sm:p-5 animate-panelFade">
                                <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                                  <div className="space-y-3">
                                    <section className="rounded-2xl border border-white/10 bg-[#0b0f1980] p-3.5">
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
                                      <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.85fr)_minmax(130px,0.45fr)_auto]">
                                        <input
                                          type="text"
                                          value={visibleDraftAutomationUrl}
                                          onChange={(event) =>
                                            handleAutomationTargetDraftChange(offerId, "url", event.target.value)
                                          }
                                          placeholder="https://site.com/urun"
                                          disabled={!canManageAutomationTargets || isAutomationTargetSaving}
                                          className="h-9 rounded-md border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <select
                                          value={visibleDraftAutomationBackend}
                                          onChange={(event) =>
                                            handleAutomationTargetDraftChange(offerId, "backend", event.target.value)
                                          }
                                          disabled={
                                            !canManageAutomationTargets || automationBackendOptions.length === 0
                                          }
                                          className="h-9 appearance-none rounded-md border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <option value="">
                                            {automationBackendOptions.length === 0
                                              ? "Backend map yok"
                                              : "Backend sec"}
                                          </option>
                                          {automationBackendOptions.map((option) => {
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

                                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f1980]">
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
                                                  className={`group w-full cursor-pointer overflow-hidden rounded-xl border px-3 py-3 transition-colors ${
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
                                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                                                    <span className="max-w-full truncate rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                                                      {isStarred ? `\u2605 ${backendLabelDisplay}` : backendLabelDisplay}
                                                    </span>
                                                    <div className="ml-auto flex items-center gap-1.5">
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
                                                          <svg
                                                            viewBox="0 0 20 20"
                                                            className="h-3.5 w-3.5"
                                                            fill={isStarred ? "currentColor" : "none"}
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            aria-hidden="true"
                                                          >
                                                            <path d="M10 2.8 12.3 7.5l5.2.8-3.8 3.8.9 5.2L10 14.9 5.4 17.3l.9-5.2-3.8-3.8 5.2-.8z" />
                                                          </svg>
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
                                                  <div className="mt-2 min-w-0">
                                                    {canViewAutomationTargetDetails ? (
                                                      <a
                                                        href={targetRow.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="inline-flex max-w-full items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                                                        title={targetRow.url}
                                                      >
                                                        <span className="inline-block max-w-full truncate">
                                                          {urlDisplay}
                                                        </span>
                                                      </a>
                                                    ) : (
                                                      <span
                                                        className="inline-flex max-w-full items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
                                                        title={urlDisplay}
                                                      >
                                                        <span className="inline-block max-w-full truncate">
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

                                  <aside className="rounded-2xl border border-white/10 bg-[#0b0f1980] p-3.5">
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
                                      <div className="no-scrollbar h-[300px] overflow-y-auto overflow-x-hidden bg-ink-950/35 px-3 py-3 font-mono text-[11px] leading-5 sm:h-[336px] sm:text-[12px] sm:leading-6">
                                        <div className="space-y-0.5">
                                          {hasAutomationTwoFactorPrompt && (
                                            <div className="mb-2 border-b border-white/10 pb-1.5">
                                              <div className="flex min-w-0 flex-wrap items-center gap-2 text-slate-300 sm:flex-nowrap">
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
                                                  className="h-7 min-w-[140px] flex-1 border-0 border-b border-white/20 bg-transparent px-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-0"
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
                            {activePanel === "note" && (
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                {isOfferRefreshing ? (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-28 rounded-lg" />
                                    <SkeletonBlock className="h-44 w-full rounded-xl" />
                                    <div className="flex justify-end gap-2">
                                      <SkeletonBlock className="h-8 w-20 rounded-lg" />
                                      <SkeletonBlock className="h-8 w-20 rounded-lg" />
                                    </div>
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                      <SkeletonBlock className="h-24 w-full rounded-xl" />
                                      <SkeletonBlock className="h-24 w-full rounded-xl" />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      rows={9}
                                      value={noteInputValue ?? ""}
                                      onChange={(event) => handleNoteDraftChange(offerId, event.target.value)}
                                      placeholder="Ürün notu ekle"
                                      readOnly={!canEditNoteText}
                                      className={`block min-h-[220px] w-full rounded-xl border border-white/10 bg-ink-900/50 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 read-only:bg-ink-900/40 read-only:text-slate-300 ${noteGroupFlashByOffer?.[offerId] ? "animate-noteSwap" : ""}`}
                                    />
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                      {canManageNotes && (
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteEdit(offerId)}
                                          className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                                        >
                                          {isNoteEditing ? "VAZGEÇ" : "DÜZENLE"}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleNoteSave(offerId)}
                                        disabled={!canSaveNote}
                                        className="flex h-9 items-center justify-center rounded-lg border border-accent-400/60 bg-accent-500/15 px-4 text-[11px] font-semibold uppercase tracking-wide text-accent-50 transition hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        KAYDET
                                      </button>
                                    </div>
                                    <div className="mt-5 border-t border-white/10 pt-5">
                                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                        <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Not grubu</label>
                                          <div
                                            className={`mt-2 flex items-center gap-2 ${
                                              selectFlashByKey[`${offerId}:note-group`] ? "animate-noteSwap" : ""
                                            }`}
                                          >
                                            <select
                                              value={noteGroupSelectionValue}
                                              onChange={(event) =>
                                                setNoteGroupSelectionDrafts((prev) => ({
                                                  ...prev,
                                                  [offerId]: event.target.value,
                                                }))
                                              }
                                              disabled={!canManageNotes}
                                              className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 h-9 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              <option value="">Bağımsız not</option>
                                              {noteGroups.map((groupOption) => (
                                                <option key={groupOption.id} value={groupOption.id}>
                                                  {groupOption.name}
                                                </option>
                                              ))}
                                            </select>
                                            {noteGroupSelectionValue && canManageNotes && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  {
                                                    setNoteGroupSelectionDrafts((prev) => ({
                                                      ...prev,
                                                      [offerId]: "",
                                                    }))
                                                    triggerSelectFlash(offerId, "note-group")
                                                  }
                                                }
                                                className="rounded-md border border-amber-300/50 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-9 transition hover:border-amber-200 hover:bg-amber-500/20"
                                              >
                                                KALDIR
                                              </button>
                                            )}
                                            {noteGroupSelectionValue && canManageNotes && (
                                              <button
                                                type="button"
                                                onClick={() => handleNoteGroupDelete(noteGroupId)}
                                                disabled={!canManageNotes}
                                                className="rounded-md border border-rose-300/50 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-9 transition hover:border-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {confirmNoteGroupDelete === noteGroupId ? "ONAYLA" : "SİL"}
                                              </button>
                                            )}
                                            {canManageNotes && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleNoteGroupAssign(offerId, noteGroupSelectionValue)
                                                  triggerSelectFlash(offerId, "note-group")
                                                }}
                                                disabled={!isNoteGroupSelectionDirty}
                                                className="rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-9 transition hover:border-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                KAYDET
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {canManageNotes && (
                                          <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Yeni not grubu</label>
                                            <div className="mt-2 flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={noteGroupDraftValue}
                                                onChange={(event) =>
                                                  handleNoteGroupDraftChange(offerId, event.target.value)
                                                }
                                                placeholder="Yeni not grubu"
                                                disabled={!canManageNotes}
                                                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 h-9 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleNoteGroupCreate(offerId)}
                                                disabled={!canManageNotes || !noteGroupDraftValue.trim()}
                                                className="rounded-md border border-sky-300/50 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-9 transition hover:border-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                OLUŞTUR
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          )}
                          {activePanel === "inventory" && (
                            <div className="grid items-start gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#141826] p-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.2fr)]">
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
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
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
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
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























