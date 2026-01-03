import { useEffect, useMemo, useState } from "react"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={`product-card-${index}`} className="h-28 w-full rounded-2xl" />
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
  const categories = useMemo(
    () => [
      { key: "currency", label: "Currency", items: [] },
      { key: "accounts", label: "Accounts", items: [] },
      { key: "items", label: "Items", items },
      { key: "topups", label: "Top Ups", items: topups },
      { key: "gift-cards", label: "Gift Cards", items: [] },
    ],
    [items, topups],
  )
  const [activeCategoryKey, setActiveCategoryKey] = useState("items")
  const activeCategory = categories.find((category) => category.key === activeCategoryKey) ?? categories[0]
  const canRefresh = typeof onRefresh === "function"
  const list = activeCategory?.items ?? []
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
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => ({
        type: "page",
        value: index + 1,
      }))
    }
    const rawPages = [1, totalPages, page - 1, page, page + 1]
    const uniquePages = Array.from(new Set(rawPages.filter((value) => value >= 1 && value <= totalPages))).sort(
      (a, b) => a - b,
    )
    const items = []
    let prev = null
    uniquePages.forEach((value) => {
      if (prev && value - prev > 1) {
        items.push({ type: "ellipsis", value: `gap-${prev}` })
      }
      items.push({ type: "page", value })
      prev = value
    })
    return items
  }, [page, totalPages])
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
                  onClick={() => setActiveCategoryKey(category.key)}
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
                  Urunler
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Urun listesi</h1>
                <p className="mt-1 text-sm text-slate-400">Urun adlarini gor.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Toplam: {list.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Gosterilen: {paginatedList.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs text-slate-200">
                  Kategori: {activeCategory?.label ?? "Items"}
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.length === 0 ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Gosterilecek urun bulunamadi.
              </div>
            ) : (
              paginatedList.map((product, index) => {
                const name = String(product?.name ?? "").trim() || "Isimsiz urun"
                const key = product?.id ?? `${name}-${index}`
                return (
                  <div
                    key={key}
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/80 p-3 shadow-inner transition hover:border-accent-300/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Urun
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">{name}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {filteredList.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-xs text-slate-400 shadow-inner">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-white/10 bg-ink-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Sayfa
                </span>
                <span className="text-sm text-slate-200">
                  {pageStart}-{pageEnd} / {totalItems}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-xl border border-white/10 bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ilk
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-white/10 bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Geri
                </button>
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/80 p-1">
                  {paginationItems.map((item) => {
                    if (item.type === "ellipsis") {
                      return (
                        <span key={item.value} className="px-2 text-xs text-slate-500">
                          ...
                        </span>
                      )
                    }
                    const isActive = item.value === page
                    return (
                      <button
                        key={`page-${item.value}`}
                        type="button"
                        onClick={() => setPage(item.value)}
                        aria-current={isActive ? "page" : undefined}
                        className={`min-w-[32px] rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "bg-accent-400 text-ink-900 shadow-glow"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {item.value}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border border-white/10 bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ileri
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-xl border border-white/10 bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Son
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
