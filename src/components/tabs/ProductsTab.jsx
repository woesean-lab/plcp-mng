import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-hot-toast"
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
  const segment = path.split("?")[0].split("#")[0].split("/").filter(Boolean)[0]
  return normalizeCategoryKey(segment)
}
const getCategoryKey = (product) => {
  const direct = normalizeCategoryKey(product?.category)
  if (direct) return direct
  const derived = getCategoryKeyFromHref(product?.href)
  return derived || "diger"
}
function ProductsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-3 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-full" />
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`product-metric-${idx}`}
            className="min-h-[88px] rounded-2xl border border-white/20 bg-ink-900/70 p-4 shadow-inner"
          >
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-3 h-6 w-16 rounded-full" />
            <SkeletonBlock className="mt-3 h-3 w-24 rounded-full" />
          </div>
        ))}
      </div>
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
  stockEnabledByOffer = {},
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
  onSavePrice,
  onTogglePrice,
  onToggleOfferStar,
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
  canViewLinks = false,
  canStarOffers: canStarOffersProp,
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
  const [priceEnabledByOffer, setPriceEnabledByOffer] = useState(
    priceEnabledByOfferProp && typeof priceEnabledByOfferProp === "object"
      ? priceEnabledByOfferProp
      : {},
  )
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
      label: key === "diger" ? "Diger" : formatCategoryLabel(key),
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
      stockDisabled: 0,
      outOfStock: 0,
      totalStock: 0,
      usedStock: 0,
    }
    const countedGroups = new Set()
    allProducts.forEach((product) => {
      const offerId = String(product?.id ?? "").trim()
      const isStockEnabled = Boolean(stockEnabledByOffer?.[offerId])
      if (isStockEnabled) {
        totals.stockEnabled += 1
      } else {
        totals.stockDisabled += 1
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
  }, [allProducts, groupAssignments, keysByOffer, stockEnabledByOffer])
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
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])
  if (isLoading) {
    return <ProductsSkeleton panelClass={panelClass} />
  }
  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
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
          <div className="flex w-full justify-start md:w-auto md:justify-end">
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Kategori
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {activeCategory?.label ?? "Tümü"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>{list.length} ürün</span>
                <span>{paginatedList.length} g?sterilen</span>
                <span>
                  {page}/{totalPages}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Toplam Ürün
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{productStats.totalOffers}</p>
            <p className="mt-1 text-xs text-slate-400">Katalogdaki teklifler</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(59,130,246,0.18),transparent)]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Stok açık
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{productStats.stockEnabled}</p>
            <p className="mt-1 text-xs text-slate-400">Stok takibi açık ürün</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.18),transparent)]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Toplam stok
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{productStats.totalStock}</p>
            <p className="mt-1 text-xs text-slate-400">Kayıtlı anahtar</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(245,158,11,0.18),transparent)]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Kullanılan stok
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{productStats.usedStock}</p>
            <p className="mt-1 text-xs text-slate-400">İşaretlenen anahtar</p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className={`${panelClass} bg-ink-900/80`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Kategoriler
              </p>
              <p className="mt-1 text-xs text-slate-500">Ürünleri filtrele.</p>
            </div>
            {canRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition ${
                  isRefreshing
                    ? "cursor-not-allowed border-white/5 text-slate-600"
                    : "hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
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
          <div className="mt-4 space-y-2">
            {categories.map((category) => {
              const isActive = activeCategoryKey === category.key
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => {
                    setActiveCategoryKey(category.key)
                    setPage(1)
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                    isActive
                      ? "border-accent-400/60 bg-accent-500/15 text-accent-50 shadow-glow"
                      : "border-white/10 bg-ink-900/60 text-slate-200 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{category.label}</span>
                  <span
                    className={`text-[11px] ${
                      isActive ? "text-accent-100" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    ({category.key === "missing" ? missingTotal : category.items.length})
                  </span>
                </button>
              )
            })}
          </div>
        </aside>
        <div className={`${panelClass} bg-ink-800/60`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Ürün kataloğu
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {activeCategory?.label ?? "Tümü"} - {list.length} ürün
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs text-slate-200">
                  Toplam: {list.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs text-slate-200">
                  Gösterilen: {paginatedList.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs text-slate-200">
                  Sayfa: {page}/{totalPages}
                </span>
              </div>
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
                    categoryKey === "diger" ? "Diger" : formatCategoryLabel(categoryKey)
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
                  if (isStockEnabled) {
                    availablePanels.push("stock-group")
                  }
                  if (isPriceEnabled) {
                    availablePanels.push("price")
                  }
                  const tabCount = availablePanels.length
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
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border border-white/10 p-4 shadow-inner transition hover:border-accent-400/60 hover:shadow-card ${
                        isMissing
                          ? "border-rose-400/40 bg-rose-500/10"
                          : isOutOfStock
                            ? "border-rose-300/30 bg-ink-900/70"
                            : "bg-ink-900/70"
                      } ${isOpen ? "border-accent-400/60 shadow-card" : ""}`}
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
                            <span
                              className={`min-w-0 flex-1 break-words font-display text-[13px] font-semibold leading-snug text-white sm:text-sm ${
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
                          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#ffffff1a] bg-[#ffffff0d] px-2.5 py-1 shadow-inner sm:h-[36px] sm:w-[192px] sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleStockToggle(offerId)}
                              disabled={!canManageStock || !offerId}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                              onClick={() => toggleStarred(offerId)}
                              disabled={!offerId || !canStarOffers}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                            {href && canViewLinks && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white"
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
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-200/80 transition hover:bg-white/10 hover:text-white ${
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
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
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
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
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
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
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
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#161a25] p-4 pt-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                {isOfferRefreshing && (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-24 rounded-lg" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                    <SkeletonBlock className="h-28 w-full rounded-xl" />
                                  </div>
                                )}
                                {!isOfferRefreshing && (
                                  <>
                                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
                                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <label className="text-[11px] font-semibold text-slate-300">Stok grubu</label>
                                    <div
                                      className={`mt-2 flex flex-wrap items-center gap-2 ${
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
                                        className="min-w-[160px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-10 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                                          className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-8 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
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
                                          className="rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-8 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          KAYDET
                                        </button>
                                      )}
                                      {groupId && canManageGroups && (
                                        <button
                                          type="button"
                                          onClick={() => handleGroupDelete(offerId, groupId)}
                                          className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-8 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                        >
                                          {confirmGroupDelete === groupId ? "ONAYLA" : "SİL"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {canManageGroups && (
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                      <label className="text-[11px] font-semibold text-slate-300">Yeni grup</label>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <input
                                          type="text"
                                          value={groupDraftValue}
                                          onChange={(event) => handleGroupDraftChange(offerId, event.target.value)}
                                          placeholder="Yeni grup adı"
                                          disabled={!canManageGroups}
                                          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleGroupCreate(offerId)}
                                          disabled={!canManageGroups || !groupDraftValue.trim()}
                                          className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-8 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#161a25] p-4 pt-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                {isOfferRefreshing ? (
                                  <div className="space-y-3">
                                    <SkeletonBlock className="h-4 w-28 rounded-lg" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                    <SkeletonBlock className="h-24 w-full rounded-xl" />
                                  </div>
                                ) : (
                                  <>
                                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <label className="text-[11px] font-semibold text-slate-300">Mesaj grubu</label>
                                    <div
                                      className={`mt-2 flex flex-wrap items-center gap-2 ${
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
                                        className="min-w-[160px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-10 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                                          className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-8 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
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
                                          className="rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-8 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          KAYDET
                                        </button>
                                      )}
                                      {messageGroupId && canDeleteMessageGroup && (
                                        <button
                                          type="button"
                                          onClick={() => handleMessageGroupDelete(messageGroupId)}
                                          className="rounded-lg border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-8 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                        >
                                          {confirmMessageGroupDelete === messageGroupId ? "ONAYLA" : "SİL"}
                                        </button>
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={messageGroupDraftValue}
                                        onChange={(event) => handleMessageGroupDraftChange(offerId, event.target.value)}
                                        placeholder="Yeni grup adı"
                                        disabled={!canManageMessages}
                                        className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleMessageGroupCreate(offerId)}
                                        disabled={!canManageMessages || !messageGroupDraftValue.trim()}
                                        className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-8 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        OLUŞTUR
                                      </button>
                                    </div>
                                  </div>
                                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <label className="text-[11px] font-semibold text-slate-300">Mesaj şablonu</label>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        list={`message-template-${offerId}`}
                                        value={messageTemplateDraftValue}
                                        onChange={(event) => handleMessageTemplateDraftChange(offerId, event.target.value)}
                                        placeholder={templates.length === 0 ? "Şablon yok" : "Şablon seç"}
                                        disabled={!canManageMessages || templates.length === 0}
                                        className="min-w-[220px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-10 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                                        className="rounded-lg border border-sky-300/60 bg-sky-500/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-8 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        EKLE
                                      </button>
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-500">Şablon ekledikçe kopyalama listesinde görünür.</p>
                                  </div>
                                </div>
                                  </>
                                )}
                              </div>
                            )}
                            {activePanel === "price" && isPriceEnabled && (
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#161a25] p-4 pt-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
                                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                    <label className="text-[10px] font-semibold text-slate-300">Fiyat gir</label>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
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
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
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
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                      <label className="text-[10px] font-semibold text-slate-300">{"Y\u00fczdelik"}</label>
                                      <div className="mt-2 space-y-2">
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
                            {activePanel === "note" && (
                              <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#161a25] p-4 pt-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
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
                                    <div
                                      className={`mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 p-0 ${
                                        noteGroupFlashByOffer?.[offerId] ? "animate-noteSwap" : ""
                                      }`}
                                    >
                                      <textarea
                                        rows={9}
                                        value={noteInputValue ?? ""}
                                        onChange={(event) =>
                                          handleNoteDraftChange(offerId, event.target.value)
                                        }
                                        placeholder="Ürün notu ekle"
                                        readOnly={!canEditNoteText}
                                        className="block min-h-[240px] w-full rounded-xl bg-ink-900/40 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 read-only:bg-ink-900/30 read-only:text-slate-300"
                                      />
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                      {canManageNotes && (
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteEdit(offerId)}
                                          className="flex h-8 items-center justify-center rounded-lg border border-sky-300/60 bg-sky-500/15 px-4 text-[11px] font-semibold uppercase tracking-wide text-sky-50 shadow-glow transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25"
                                        >
                                          {isNoteEditing ? "VAZGEÇ" : "DÜZENLE"}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleNoteSave(offerId)}
                                        disabled={!canSaveNote}
                                        className="flex h-8 items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        KAYDET
                                      </button>
                                    </div>
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                          <label className="text-[11px] font-semibold text-slate-300">Not grubu</label>
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
                                              className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 h-10 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                                                className="rounded-md border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 h-8 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                                              >
                                                KALDIR
                                              </button>
                                            )}
                                            {noteGroupSelectionValue && canManageNotes && (
                                              <button
                                                type="button"
                                                onClick={() => handleNoteGroupDelete(noteGroupId)}
                                                disabled={!canManageNotes}
                                                className="rounded-md border border-rose-300/60 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 h-8 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
                                                className="rounded-md border border-emerald-300/60 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 h-8 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                KAYDET
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {canManageNotes && (
                                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                            <label className="text-[11px] font-semibold text-slate-300">Yeni not grubu</label>
                                            <div className="mt-2 flex items-center gap-2">
                                              <input
                                                type="text"
                                                value={noteGroupDraftValue}
                                                onChange={(event) =>
                                                  handleNoteGroupDraftChange(offerId, event.target.value)
                                                }
                                                placeholder="Yeni not grubu"
                                                disabled={!canManageNotes}
                                                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-100 h-10 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleNoteGroupCreate(offerId)}
                                                disabled={!canManageNotes || !noteGroupDraftValue.trim()}
                                                className="rounded-md border border-sky-300/60 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-50 h-8 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
                            <div className="rounded-2xl rounded-t-none border border-white/10 bg-[#161a25] p-4 pt-5 shadow-card -mt-2 lg:col-span-2 animate-panelFade">
                              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)]">
                          <div className="space-y-4">
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
                                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-card">
                                  {canCopyKeys && (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <span className="text-[13px] font-semibold text-slate-100">Stoklar</span>
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
                                            className="rounded-md border border-amber-300/60 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/20"
                                          >
                                            Kopyala + kullan?ld?
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
                                          <div className="flex w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:w-auto">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditSave(offerId, item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  KAYDET
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditCancel(item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
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
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                  >
                                                    Kopyala
                                                  </button>
                                                )}
                                                {canEditKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyEditStart(item.id, item.code)}
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-sky-300/60 bg-sky-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 sm:w-auto"
                                                  >
                                                    DÜZENLE</button>
                                                )}
                                                {canUpdateKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleKeyStatusUpdate(offerId, item.id, "used")
                                                    }
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                                  >
                                                    Kullanıldı
                                                  </button>
                                                )}
                                                {canDeleteKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyDelete(offerId, item.id)}
                                                    disabled={isDeleting}
                                                    className={`flex h-7 w-full items-center justify-center rounded-md border px-2 text-[11px] font-semibold uppercase tracking-wide transition hover:-translate-y-0.5 sm:w-auto ${
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
                              {!isKeysLoading && usedKeys.length > 0 && (
                                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-card">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-[13px] font-semibold text-slate-100">Kullanılan Stoklar</span>
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
                                          className={`group flex flex-col items-start gap-3 rounded-xl border border-rose-300/30 bg-rose-500/5 px-3 py-2 transition-all duration-300 hover:border-rose-200/60 hover:bg-rose-500/10 sm:flex-row sm:items-center animate-panelFade ${
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
                                          <div className="flex w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:w-auto">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditSave(offerId, item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                  KAYDET
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleKeyEditCancel(item.id)}
                                                  disabled={isSaving}
                                                  className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
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
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                  >
                                                    Kopyala
                                                  </button>
                                                )}
                                                {canEditKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyEditStart(item.id, item.code)}
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-sky-300/60 bg-sky-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-500/25 sm:w-auto"
                                                  >
                                                    DÜZENLE</button>
                                                )}
                                                {canUpdateKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleKeyStatusUpdate(offerId, item.id, "available")
                                                    }
                                                    className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                                  >
                                                    GERİ AL
                                                  </button>
                                                )}
                                                {canDeleteKeys && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleKeyDelete(offerId, item.id)}
                                                    disabled={isDeleting}
                                                    className={`flex h-7 w-full items-center justify-center rounded-md border px-2 text-[11px] font-semibold uppercase tracking-wide transition hover:-translate-y-0.5 sm:w-auto ${
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
                          <div className="self-start rounded-2xl border border-white/10 bg-white/5 p-4 shadow-card">
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
    </div>
  )
}


























