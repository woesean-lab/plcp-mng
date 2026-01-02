import { useMemo, useState } from "react"

export default function ProductsTab({ panelClass = "" }) {
  const [query, setQuery] = useState("")
  const sampleProducts = [
    {
      id: "sample-1",
      name: "Cyber Drift DLC",
      note: "Hizli teslim paketi",
    },
    {
      id: "sample-2",
      name: "Galaxy Pass",
      note: "Deneme surumu",
    },
    {
      id: "sample-3",
      name: "Indie Bundle",
      note: "Hediye kuponu",
    },
    {
      id: "sample-4",
      name: "Support Plus",
      note: "Oncelikli destek",
    },
  ]
  const list = sampleProducts
  const normalizedQuery = query.trim().toLowerCase()
  const filteredList = useMemo(() => {
    if (!normalizedQuery) return list
    return list.filter((product) => {
      const name = String(product?.name ?? "").toLowerCase()
      const note = String(product?.note ?? "").toLowerCase()
      return name.includes(normalizedQuery) || note.includes(normalizedQuery)
    })
  }, [list, normalizedQuery])

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
              Ornek veri
            </span>
          </div>
        </div>
      </header>

      <div className={`${panelClass} bg-ink-900/60`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
              Urun listesi
            </p>
            <p className="text-sm text-slate-400">Urun detaylarini gor.</p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-2">
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
                  placeholder="Urun veya not"
                  className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredList.length === 0 ? (
            <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Gosterilecek urun bulunamadi.
            </div>
          ) : (
            filteredList.map((product, index) => {
              const name = String(product?.name ?? "").trim() || "Isimsiz urun"
              const note = String(product?.note ?? "").trim() || "Not eklenmedi."
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
                  <p className="text-sm text-slate-300/80">{note}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
