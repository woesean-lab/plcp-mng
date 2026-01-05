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
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-5 shadow-card">
            <SkeletonBlock className="h-3 w-16 rounded-full" />
            <SkeletonBlock className="mt-3 h-7 w-40" />
            <SkeletonBlock className="mt-3 h-4 w-56" />
            <div className="mt-4 flex flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-28 rounded-xl" />
              <SkeletonBlock className="h-8 w-32 rounded-xl" />
              <SkeletonBlock className="h-8 w-36 rounded-xl" />
            </div>
            <SkeletonBlock className="mt-4 h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
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
}) {
  const [query, setQuery] = useState("")
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

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-5 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Kategori
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {activeCategory?.label ?? "Tumu"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{list.length} urun bu kategoride.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Toplam: {list.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Gosterilen: {paginatedList.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Kategori: {activeCategory?.label ?? "Tumu"}
                </span>
              </div>
            </div>
            <div className="mt-4">
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

          <div key={activeCategoryKey} className="space-y-2">
            {filteredList.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Gosterilecek urun bulunamadi.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 shadow-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,140px)] items-center gap-4 border-b border-white/10 bg-ink-900/80 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 sm:grid">
                  <span>Urun</span>
                  <span className="text-right">Fiyat</span>
                </div>
                <div className="divide-y divide-white/10">
                  {paginatedList.map((product, index) => {
                    const name = String(product?.name ?? "").trim() || "Isimsiz urun"
                    const price = String(product?.price ?? "").trim()
                    const isMissing = Boolean(product?.missing)
                    const key = product?.id ?? `${name}-${index}`
                    return (
                      <div
                        key={key}
                        className={`grid gap-3 px-5 py-3 transition sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)] sm:items-center ${
                          isMissing
                            ? "bg-rose-950/40 hover:bg-rose-950/55"
                            : "odd:bg-ink-900/40 even:bg-ink-900/60 hover:bg-ink-800/70"
                        }`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`line-clamp-2 text-sm font-semibold ${
                              isMissing ? "text-rose-100" : "text-white"
                            }`}
                          >
                            {name}
                          </p>
                          {isMissing ? (
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/80">
                              Eksik urun
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-[0.2em] sm:hidden ${
                              isMissing ? "text-rose-200/80" : "text-slate-400"
                            }`}
                          >
                            Fiyat
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              isMissing ? "text-rose-100" : "text-white"
                            }`}
                          >
                            {price || "-"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          {filteredList.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
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
