import { useEffect, useMemo, useState } from "react"

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
  const filteredList = useMemo(() => {
    if (!normalizedQuery) return list
    return list.filter((product) => {
      const name = String(product?.name ?? "").toLowerCase()
      return name.includes(normalizedQuery)
    })
  }, [list, normalizedQuery])

  useEffect(() => {
    if (!categories.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey(categories[0]?.key ?? "items")
    }
  }, [activeCategoryKey, categories])

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              {"\u00dcr\u00fcnler"}
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {"\u00dcr\u00fcnler"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam: {list.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Gosterilen: {filteredList.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              Kategori: {activeCategory?.label ?? "Items"}
            </span>
          </div>
        </div>
      </header>

      <div className={`${panelClass} bg-ink-900/60`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
              Urun listesi
            </p>
            <p className="text-sm text-slate-400">Urun adlarini gor.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <div className="flex h-11 items-center rounded border border-white/10 bg-ink-900 px-2 shadow-inner">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setActiveCategoryKey(category.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${
                    activeCategoryKey === category.key
                      ? "bg-accent-400 text-ink-900 shadow-glow"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{`${category.label} (${category.items.length})`}</span>
                </button>
              ))}
            </div>
            {canRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition ${
                  isRefreshing
                    ? "cursor-not-allowed text-slate-600"
                    : "hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
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
          <div className="flex w-full items-center gap-2">
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Urunler yukleniyor...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Gosterilecek urun bulunamadi.
            </div>
          ) : (
            filteredList.map((product, index) => {
              const name = String(product?.name ?? "").trim() || "Isimsiz urun"
              const key = product?.id ?? `${name}-${index}`
              return (
                <div
                  key={key}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Urun
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">{name}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
