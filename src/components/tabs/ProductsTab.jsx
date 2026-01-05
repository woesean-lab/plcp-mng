import { useEffect, useMemo, useState } from "react"

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
              <SkeletonBlock key={`product-card-${index}`} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
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
  keysSaving = {},
  keysDeleting = {},
  groups = [],
  groupAssignments = {},
  notesByOffer = {},
  stockEnabledByOffer = {},
  onLoadKeys,
  onAddKeys,
  onDeleteKey,
  onUpdateKeyStatus,
  onBulkCopy,
  onCopyKey,
  onCreateGroup,
  onAssignGroup,
  onSaveNote,
  onToggleStock,
  canAddKeys = false,
  canDeleteKeys = false,
  canCopyKeys = false,
}) {
  const [query, setQuery] = useState("")
  const [openOffers, setOpenOffers] = useState({})
  const [keyDrafts, setKeyDrafts] = useState({})
  const [confirmKeyTarget, setConfirmKeyTarget] = useState(null)
  const [groupDrafts, setGroupDrafts] = useState({})
  const [bulkCounts, setBulkCounts] = useState({})
  const [noteDrafts, setNoteDrafts] = useState({})
  const [noteTargets, setNoteTargets] = useState({})
  const canManageGroups = canAddKeys
  const canManageNotes = canAddKeys && typeof onSaveNote === "function"
  const canManageStock = canAddKeys && typeof onToggleStock === "function"
  const canUpdateKeys = typeof onUpdateKeyStatus === "function" && canCopyKeys
  const items = Array.isArray(catalog?.items) ? catalog.items : []
  const topups = Array.isArray(catalog?.topups) ? catalog.topups : []
  const allProducts = useMemo(() => [...items, ...topups], [items, topups])
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
    return [{ key: "all", label: "Tumu", items: allProducts }, ...list]
  }, [allProducts, categoryMap])
  const noteTargetOptions = useMemo(() => {
    const seen = new Set()
    return allProducts
      .map((product, index) => {
        const id = String(product?.id ?? "").trim()
        if (!id || seen.has(id)) return null
        seen.add(id)
        const name = String(product?.name ?? "").trim() || `Urun ${index + 1}`
        const categoryKey = getCategoryKey(product)
        const categoryLabel = categoryKey === "diger" ? "Diger" : formatCategoryLabel(categoryKey)
        return { id, label: `${name} (${categoryLabel})` }
      })
      .filter(Boolean)
  }, [allProducts])
  const [activeCategoryKey, setActiveCategoryKey] = useState("all")
  const activeCategory = categories.find((category) => category.key === activeCategoryKey) ?? categories[0]
  const canRefresh = typeof onRefresh === "function"
  const list =
    activeCategoryKey === "all"
      ? allProducts
      : categoryMap.get(activeCategoryKey) ?? activeCategory?.items ?? []
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
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const totalItems = filteredList.length
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, page, pageSize])
  const pageStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize)

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

  const handleKeyDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setKeyDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }

  const handleKeyAdd = async (offerId) => {
    if (typeof onAddKeys !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = keyDrafts[normalizedId] ?? ""
    const ok = await onAddKeys(normalizedId, draft)
    if (ok) {
      setKeyDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
    }
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

  const handleGroupDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setGroupDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }

  const handleGroupCreate = (offerId) => {
    if (typeof onCreateGroup !== "function" || typeof onAssignGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = groupDrafts[normalizedId] ?? ""
    const created = onCreateGroup(draft)
    if (!created) return
    setGroupDrafts((prev) => ({ ...prev, [normalizedId]: "" }))
    onAssignGroup(normalizedId, created.id)
  }

  const handleGroupAssign = (offerId, groupId) => {
    if (typeof onAssignGroup !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    onAssignGroup(normalizedId, groupId)
  }

  const handleNoteDraftChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteDrafts((prev) => ({ ...prev, [normalizedId]: value }))
  }

  const handleNoteTargetChange = (offerId, value) => {
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    setNoteTargets((prev) => ({ ...prev, [normalizedId]: value }))
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

  const handleNoteSave = (offerId) => {
    if (!canManageNotes) return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const draft = noteDrafts[normalizedId]
    const stored = notesByOffer?.[normalizedId] ?? ""
    const value = draft !== undefined ? draft : stored
    onSaveNote(normalizedId, value)
    handleNoteReset(normalizedId)
  }

  const handleNoteApply = (offerId) => {
    if (!canManageNotes) return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    const targetId = String(noteTargets?.[normalizedId] ?? "").trim()
    if (!targetId || targetId === normalizedId) return
    const draft = noteDrafts[normalizedId]
    const stored = notesByOffer?.[normalizedId] ?? ""
    const value = draft !== undefined ? draft : stored
    if (!String(value ?? "").trim()) return
    onSaveNote(targetId, value)
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
      onDeleteKey(normalizedOfferId, normalizedKeyId)
      return
    }
    setConfirmKeyTarget(target)
  }

  const handleKeyStatusUpdate = (offerId, keyId, nextStatus) => {
    if (typeof onUpdateKeyStatus !== "function") return
    const normalizedOfferId = String(offerId ?? "").trim()
    const normalizedKeyId = String(keyId ?? "").trim()
    if (!normalizedOfferId || !normalizedKeyId) return
    onUpdateKeyStatus(normalizedOfferId, normalizedKeyId, nextStatus)
  }

  const handleKeyCopy = (code) => {
    if (typeof onCopyKey !== "function") return
    onCopyKey(code)
  }

  const handleKeysRefresh = (offerId) => {
    if (typeof onLoadKeys !== "function") return
    const normalizedId = String(offerId ?? "").trim()
    if (!normalizedId) return
    onLoadKeys(normalizedId, { force: true })
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
              Urun listesi
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Urun listesi
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Urun adlarini gor ve filtrele.
            </p>
          </div>
          <div className="flex w-full justify-start md:w-auto md:justify-end">
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Kategori
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {activeCategory?.label ?? "Tumu"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>{list.length} urun</span>
                <span>{paginatedList.length} gosterilen</span>
                <span>
                  {page}/{totalPages}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className={`${panelClass} bg-ink-900/80`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Kategoriler
              </p>
              <p className="mt-1 text-xs text-slate-500">Urunleri filtrele.</p>
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
                title="Urunleri yenile"
                aria-label="Urunleri yenile"
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
                    ({category.items.length})
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
                Urun katalogu
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {activeCategory?.label ?? "Tumu"} - {list.length} urun
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs text-slate-200">
                  Toplam: {list.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs text-slate-200">
                  Gosterilen: {paginatedList.length}
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
                    placeholder="Urun adi ara"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div key={activeCategoryKey} className="mt-4 space-y-2">
            {filteredList.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Gosterilecek urun bulunamadi.
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedList.map((product, index) => {
                  const name = String(product?.name ?? "").trim() || "Isimsiz urun"
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
                  const categoryKey = getCategoryKey(product)
                  const categoryLabel =
                    categoryKey === "diger" ? "Diger" : formatCategoryLabel(categoryKey)
                  const isOpen = Boolean(openOffers[offerId])
                  const isStockEnabled = Boolean(stockEnabledByOffer?.[offerId])
                  const isKeysLoading = Boolean(keysLoading?.[offerId])
                  const isKeysSaving = Boolean(keysSaving?.[offerId])
                  const keyDraftValue = keyDrafts[offerId] ?? ""
                  const groupDraftValue = groupDrafts[offerId] ?? ""
                  const storedNote = String(notesByOffer?.[offerId] ?? "").trim()
                  const noteDraftValue = noteDrafts[offerId]
                  const noteInputValue = noteDraftValue !== undefined ? noteDraftValue : storedNote
                  const noteTargetValue = String(noteTargets?.[offerId] ?? "").trim()
                  const noteHasChanges = String(noteInputValue ?? "").trim() !== storedNote
                  const canSaveNote = Boolean(offerId) && canManageNotes && noteHasChanges
                  const canApplyNote =
                    Boolean(offerId) && canManageNotes && noteTargetValue && String(noteInputValue ?? "").trim()
                  const availableNoteTargets = noteTargetOptions.filter(
                    (option) => option.id !== offerId,
                  )
                  const rawHref = String(product?.href ?? "").trim()
                  const href = rawHref
                    ? rawHref.startsWith("http://") || rawHref.startsWith("https://")
                      ? rawHref
                      : `https://www.eldorado.gg${rawHref.startsWith("/") ? "" : "/"}${rawHref}`
                    : ""
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border p-4 shadow-inner transition ${
                        isMissing
                          ? "border-rose-300/30 bg-rose-500/5 hover:border-rose-300/50"
                          : "border-white/10 bg-ink-900/70 hover:border-white/20 hover:bg-ink-900/80"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => toggleOfferOpen(offerId)}
                          disabled={!offerId}
                          className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  isMissing ? "text-rose-100" : "text-white"
                                }`}
                              >
                                {name}
                              </span>
                              {isStockEnabled ? (
                                <>
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                      availableCount === 0
                                        ? "border border-rose-300/60 bg-rose-500/15 text-rose-50"
                                        : "border border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                                    }`}
                                  >
                                    {availableCount} stok
                                  </span>
                                  {usedCount > 0 && (
                                    <span className="rounded-full border border-amber-300/60 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
                                      Kullanildi: {usedCount}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
                                  Stok kapali
                                </span>
                              )}
                              {groupName && (
                                <span className="rounded-full border border-sky-300/60 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-50">
                                  Grup: {groupName}
                                </span>
                              )}
                              {isMissing && (
                                <span className="rounded-full border border-rose-300/60 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-50">
                                  Eksik urun
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{categoryLabel}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5">
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                              aria-label="Urun linki"
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
                          <button
                            type="button"
                            onClick={() => toggleOfferOpen(offerId)}
                            disabled={!offerId}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                              isOpen ? "rotate-180 border-white/20 bg-white/10 text-white" : ""
                            } ${!offerId ? "cursor-not-allowed opacity-60" : ""}`}
                            aria-label="Urun detaylarini ac/kapat"
                          >
                            &gt;
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                            <div className="flex flex-wrap items-center gap-3">
                              <span>Kategori: {categoryLabel}</span>
                              <span>Grup: {groupName || "Yok"}</span>
                              <span>Stok: {isStockEnabled ? "Acik" : "Kapali"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleKeysRefresh(offerId)}
                              disabled={!offerId || isKeysLoading || !isStockEnabled}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {!isStockEnabled ? "Stok kapali" : isKeysLoading ? "Yukleniyor..." : "Yenile"}
                            </button>
                          </div>

                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)]">
                            <div className="space-y-4">
                              {isStockEnabled ? (
                                <>
                              {isKeysLoading && (
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                                  Stoklar yukleniyor...
                                </div>
                              )}
                              {!isKeysLoading && availableKeys.length === 0 && (
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                                  Bu urunde kullanilabilir stok yok.
                                </div>
                              )}
                              {!isKeysLoading && availableKeys.length > 0 && (
                                <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                  {canCopyKeys && (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                        Toplu kopyala
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-2 py-1">
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
                                            Kopyala + kullanildi
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleBulkCopy(offerId, false)}
                                          className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                                        >
                                          Kopyala
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {availableKeys.map((item, index) => {
                                      const isDeleting = Boolean(keysDeleting?.[item.id])
                                      return (
                                        <div
                                          key={item.id}
                                          className={`group flex flex-col items-start gap-3 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 transition-all duration-300 hover:border-emerald-200/70 hover:bg-emerald-500/15 sm:flex-row sm:items-center ${
                                            isDeleting ? "opacity-60" : ""
                                          }`}
                                        >
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 transition group-hover:border-accent-300 group-hover:text-accent-100">
                                            #{index + 1}
                                          </span>
                                          <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100">
                                            {item.code}
                                          </p>
                                          <div className="flex w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:w-auto">
                                            {canCopyKeys && (
                                              <button
                                                type="button"
                                                onClick={() => handleKeyCopy(item.code)}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                              >
                                                Kopyala
                                              </button>
                                            )}
                                            {canUpdateKeys && (
                                              <button
                                                type="button"
                                                onClick={() => handleKeyStatusUpdate(offerId, item.id, "used")}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                              >
                                                Kullanildi
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
                                                    : "border-rose-400/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                                }`}
                                              >
                                                {confirmKeyTarget === `${offerId}-${item.id}` ? "Onayla" : "Sil"}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {!isKeysLoading && usedKeys.length > 0 && (
                                <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                      Kullanilan stoklar
                                    </span>
                                    <span className="rounded-full border border-rose-300/60 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-50">
                                      {usedKeys.length} adet
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {usedKeys.map((item, index) => {
                                      const isDeleting = Boolean(keysDeleting?.[item.id])
                                      return (
                                        <div
                                          key={item.id}
                                          className={`group flex flex-col items-start gap-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 transition-all duration-300 hover:border-rose-200/70 hover:bg-rose-500/15 sm:flex-row sm:items-center ${
                                            isDeleting ? "opacity-60" : ""
                                          }`}
                                        >
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 transition group-hover:border-amber-300 group-hover:text-amber-100">
                                            #{index + 1}
                                          </span>
                                          <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100">
                                            {item.code}
                                          </p>
                                          <div className="flex w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:w-auto">
                                            {canCopyKeys && (
                                              <button
                                                type="button"
                                                onClick={() => handleKeyCopy(item.code)}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                              >
                                                Kopyala
                                              </button>
                                            )}
                                            {canUpdateKeys && (
                                              <button
                                                type="button"
                                                onClick={() => handleKeyStatusUpdate(offerId, item.id, "available")}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/15 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 sm:w-auto"
                                              >
                                                Geri al
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
                                                    : "border-rose-400/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                                }`}
                                              >
                                                {confirmKeyTarget === `${offerId}-${item.id}` ? "Onayla" : "Sil"}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {canAddKeys && (
                                <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Stok ekle
                                  </p>
                                  <textarea
                                    rows={4}
                                    value={keyDraftValue}
                                    onChange={(event) => handleKeyDraftChange(offerId, event.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="mt-3 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                                  />
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleKeyAdd(offerId)}
                                      disabled={!keyDraftValue.trim() || isKeysSaving || isKeysLoading}
                                      className="rounded-lg border border-accent-300/70 bg-accent-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isKeysSaving ? "Kaydediliyor..." : "Stok ekle"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleKeyDraftChange(offerId, "")}
                                      className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                                    >
                                      Temizle
                                    </button>
                                  </div>
                                </div>
                              )}
                              </>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                                Bu urunde stok kapali. Aktif etmek icin sagdan stok ayarini acin.
                              </div>
                            )}
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-400">Stok ayari</p>
                                    <p className="text-xs text-slate-500">
                                      Sadece secilen urunlerde stok yonet.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStockToggle(offerId)}
                                    disabled={!canManageStock || !offerId}
                                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                                      isStockEnabled
                                        ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-50"
                                        : "border-white/10 bg-white/5 text-slate-200"
                                    } ${!canManageStock || !offerId ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    {isStockEnabled ? "Acik" : "Kapali"}
                                  </button>
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-400">
                                      Stok grubu (opsiyonel)
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {isStockEnabled
                                        ? "Grup secmezsen stoklar urune ozeldir."
                                        : "Stok acilinca grup secilebilir."}
                                    </p>
                                  </div>
                                  {groupId && canManageGroups && isStockEnabled && (
                                    <button
                                      type="button"
                                      onClick={() => handleGroupAssign(offerId, "")}
                                      className="rounded-md border border-rose-400/60 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
                                    >
                                      Kaldir
                                    </button>
                                  )}
                                </div>
                                <div className="mt-3 space-y-2">
                                    <select
                                      value={groupId}
                                      onChange={(event) => handleGroupAssign(offerId, event.target.value)}
                                      disabled={!canManageGroups || !isStockEnabled}
                                      className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                    <option value="">Grup sec</option>
                                    {groups.map((groupOption) => (
                                      <option key={groupOption.id} value={groupOption.id}>
                                        {groupOption.name}
                                      </option>
                                    ))}
                                  </select>
                                  {canManageGroups && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={groupDraftValue}
                                        onChange={(event) => handleGroupDraftChange(offerId, event.target.value)}
                                        placeholder="Yeni grup adi"
                                        disabled={!isStockEnabled}
                                        className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleGroupCreate(offerId)}
                                        disabled={!groupDraftValue.trim() || !isStockEnabled}
                                        className="rounded-lg border border-accent-300/70 bg-accent-500/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Grup olustur
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-400">Urun notu</p>
                                    <p className="text-xs text-slate-500">Not urun bazinda saklanir.</p>
                                  </div>
                                  {storedNote && !noteHasChanges && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                      Kayitli
                                    </span>
                                  )}
                                </div>
                                <textarea
                                  rows={3}
                                  value={noteInputValue ?? ""}
                                  onChange={(event) => handleNoteDraftChange(offerId, event.target.value)}
                                  placeholder="Urun notu ekle"
                                  disabled={!canManageNotes}
                                  className="mt-3 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleNoteSave(offerId)}
                                    disabled={!canSaveNote}
                                    className="rounded-lg border border-accent-300/70 bg-accent-500/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleNoteReset(offerId)}
                                    disabled={noteDraftValue === undefined}
                                    className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Sifirla
                                  </button>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <select
                                    value={noteTargetValue}
                                    onChange={(event) => handleNoteTargetChange(offerId, event.target.value)}
                                    disabled={!canManageNotes || availableNoteTargets.length === 0}
                                    className="min-w-[180px] flex-1 appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <option value="">Notu baska urune uygula</option>
                                    {availableNoteTargets.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleNoteApply(offerId)}
                                    disabled={!canApplyNote}
                                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Uygula
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
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
                  aria-label="Onceki sayfa"
                  title="Onceki sayfa"
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

    </div>
  )
}

