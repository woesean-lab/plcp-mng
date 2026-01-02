export default function ProductsTab() {
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
        </div>
      </header>
    </div>
  )
}
