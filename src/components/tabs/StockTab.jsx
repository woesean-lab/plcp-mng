function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function StockSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-32 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
          <SkeletonBlock className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`stock-metric-${idx}`}
            className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card"
          >
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-6 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBlock key={`stock-card-${idx}`} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StockTab({
  isLoading,
  panelClass,
  canCreateProducts,
  canEditProducts,
  canDeleteProducts,
  canReorderProducts,
  canAddStocks,
  canEditStocks,
  canDeleteStocks,
  canChangeStockStatus,
  canCopyStocks,
  canBulkStocks,
  stockSummary,
  products,
  productSearch,
  setProductSearch,
  filteredProducts,
  splitStocks,
  dragState,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  lastDeleted,
  handleUndoDelete,
  openStockModal,
  openProducts,
  toggleProductOpen,
  templates,
  handleProductCopyMessage,
  editingProduct,
  handleEditStart,
  handleEditChange,
  handleEditSave,
  handleEditCancel,
  confirmProductTarget,
  confirmStockTarget,
  handleProductDeleteWithConfirm,
  bulkCount,
  setBulkCount,
  handleBulkCopyAndMarkUsed,
  handleBulkCopyAndDelete,
  deletingStocks,
  usingStocks,
  highlightStocks,
  isStockTextSelectingRef,
  editingStocks,
  savingStocks,
  handleStockEditChange,
  handleStockEditSave,
  handleStockEditCancel,
  handleStockCopy,
  handleStockEditStart,
  handleStockStatusUpdate,
  handleStockDeleteWithConfirm,
  STOCK_STATUS,
  usedBulkCount,
  setUsedBulkCount,
  handleUsedBulkDelete,
  productForm,
  setProductForm,
  handleProductAdd,
  stockForm,
  setStockForm,
  handleStockAdd,
  resetStockForm,
}) {
  const isStockTabLoading = isLoading

  if (isStockTabLoading) {
    return <StockSkeleton panelClass={panelClass} />
  }

  return (            <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Stok
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Dijital Anahtar Stoku</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Anahtarları görsel olarak tut, kopyala, ekle ve sil. Bu bölüm veri tabanına bağlı çalışır.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Kullanılabilir stok: {stockSummary.total}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Ürün: {products.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">
                    Tükenen: {stockSummary.empty}
                  </span>
                  {stockSummary.used > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                      Kullanıldı: {stockSummary.used}
                    </span>
                  )}
                </div>
                )}
              </div>
            </header>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Toplam ürün</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{products.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Kayıtlı ürün sayısı</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.12),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Kullanılabilir stok</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stockSummary.total}</p>
                  <p className="mt-1 text-xs text-slate-400">Tüm ürünlerdeki anahtar</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(244,63,94,0.18),transparent)]" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stoksuz ürün</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stockSummary.empty}</p>
                  <p className="mt-1 text-xs text-slate-400">Stok bekleyen ürün</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                        Ürün kataloğu
                      </p>
                      <p className="text-sm text-slate-400">Stokları satır bazında yönet, toplu işlem yap.</p>
                    </div>
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex h-11 w-full items-center gap-3 rounded-[6px] border border-white/10 bg-ink-900 px-4 shadow-inner">
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
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Ürün ya da kod"
                            className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {isStockTabLoading ? (
                      <>
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div
                            key={`product-skeleton-${idx}`}
                            className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner"
                          >
                            <div className="flex items-center justify-between">
                              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                              <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                            </div>
                            <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {filteredProducts.length === 0 && (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Henüz ürün yok.
                          </div>
                        )}
                    {filteredProducts.map((product) => {
                      const { available: availableStocks, used: usedStocks } = splitStocks(product.stocks)
                      const availableCount = availableStocks.length
                      const usedCount = usedStocks.length
                      return (
                        <div
                        key={product.id}
                        draggable={canReorderProducts}
                        onDragStart={canReorderProducts ? (event) => handleDragStart(event, product.id) : undefined}
                        onDragOver={canReorderProducts ? (event) => handleDragOver(event, product.id) : undefined}
                        onDrop={canReorderProducts ? (event) => handleDrop(event, product.id) : undefined}
                        onDragEnd={canReorderProducts ? handleDragEnd : undefined}
                        title="Sürükle ve sırala"
                        className={`rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition hover:border-accent-400/60 hover:bg-ink-800/80 hover:shadow-card ${
                          dragState.activeId === product.id ? "opacity-60" : ""
                        } ${dragState.overId === product.id ? "ring-2 ring-accent-300/60" : ""} ${canReorderProducts ? "cursor-grab" : "cursor-default"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => toggleProductOpen(product.id)}
                            className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-white">{product.name}</span>
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
                                    Kullanıldı: {usedCount}
                                  </span>
                                )}
                                {product.note?.trim() && product.note.trim().toLowerCase() !== "null" && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
                                    {product.note}
                                  </span>
                                )}
                              </div>
                              
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5">
                            {lastDeleted?.productId === product.id && (
                              <button
                                type="button"
                                onClick={handleUndoDelete}
                                className="flex h-8 items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/15"
                              >
                                Geri al
                              </button>
                            )}
                            {canAddStocks && (
                              <button
                                type="button"
                                onClick={() => openStockModal(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300/60 hover:bg-white/10 hover:text-accent-100"
                                aria-label="Stok ekle"
                              >
                                +
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProductOpen(product.id)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                                openProducts[product.id]
                                  ? "rotate-180 border-accent-300/60 bg-white/10 text-accent-200"
                                  : ""
                              }`}
                              aria-label="Ürün detaylarını aç/kapat"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        {openProducts[product.id] && (
                          <div className="mt-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-slate-300">
                              {canCopyStocks &&
                                product.deliveryTemplate?.trim() &&
                                templates.some((tpl) => tpl.label === product.deliveryTemplate) &&
                                product.deliveryMessage?.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => handleProductCopyMessage(product.id)}
                                    className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50"
                                  >
                                    Teslimat mesajını kopyala
                                  </button>
                                )}
                              {canEditProducts && !canEditProducts && editingProduct[product.id] && (
                                <button
                                  type="button"
                                  onClick={() => handleEditStart(product)}
                                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                                >
                                  Düzenle
                                </button>
                              )}
                              {canDeleteProducts && (
                              <button
                                type="button"
                                onClick={() => handleProductDeleteWithConfirm(product.id)}
                                className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                  confirmProductTarget === product.id
                                    ? "border-rose-300 bg-rose-500/20 text-rose-50"
                                    : "border-rose-400/60 bg-rose-500/10 text-rose-50 hover:border-rose-300 hover:bg-rose-500/20"
                                }`}
                              >
                                {confirmProductTarget === product.id ? "Silmek için tekrar tıkla" : "Ürünü sil"}
                              </button>
                              )}
                            </div>
                            {canEditProducts && editingProduct[product.id] && (
                              <div className="space-y-2 rounded-xl border border-white/10 bg-ink-900/70 p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <label
                                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-300"
                                      htmlFor={`edit-name-${product.id}`}
                                    >
                                      Ürün adı
                                    </label>
                                    <input
                                      id={`edit-name-${product.id}`}
                                      type="text"
                                      value={editingProduct[product.id]?.name || ""}
                                      onChange={(e) => handleEditChange(product.id, "name", e.target.value)}
                                      className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label
                                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-300"
                                      htmlFor={`edit-note-${product.id}`}
                                    >
                                      Teslimat şablonu
                                    </label>
                                    <select
                                      id={`edit-note-${product.id}`}
                                      value={editingProduct[product.id]?.deliveryTemplate || ""}
                                      onChange={(e) => handleEditChange(product.id, "deliveryTemplate", e.target.value)}
                                      className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                                    >
                                      <option value="">Seçin</option>
                                      {templates.map((tpl) => (
                                        <option key={tpl.label} value={tpl.label}>
                                          {tpl.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSave(product.id)}
                                    className="flex h-8 items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5"
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditCancel(product.id)}
                                    className="flex h-8 items-center justify-center rounded-md border border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                                  >
                                    İptal
                                  </button>
                                </div>
                              </div>
                            )}
                            {availableCount === 0 && (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                                Bu üründe kullanılabilir stok yok.
                              </div>
                            )}
                            {availableCount > 0 && (
                              <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                {canBulkStocks && (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                    Toplu kopyala & sil
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-2 py-1">
                                      <input
                                        id={`bulk-${product.id}`}
                                        type="text"
                                        value={bulkCount[product.id] ?? availableCount}
                                        onChange={(e) =>
                                          setBulkCount((prev) => ({
                                            ...prev,
                                            [product.id]: e.target.value.replace(/\D/g, ""),
                                          }))
                                        }
                                        inputMode="numeric"
                                        className="w-16 appearance-none bg-transparent text-xs text-slate-100 focus:outline-none"
                                      />
                                      <span className="text-[11px] text-slate-500">/ {availableCount}</span>
                                    </div>
                                    {canCopyStocks && canChangeStockStatus && (
                                    <button
                                      type="button"
                                      onClick={() => handleBulkCopyAndMarkUsed(product.id)}
                                      className="rounded-md border border-amber-300/60 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/20"
                                    >
                                      Kopyala & kullanıldı
                                    </button>
                                    )}
                                    {canCopyStocks && canDeleteStocks && (
                                    <button
                                      type="button"
                                      onClick={() => handleBulkCopyAndDelete(product.id)}
                                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                                    >
                                      Kopyala & sil
                                    </button>
                                    )}
                                  </div>
                                </div>
                                )}
                                <div className="space-y-2">
                                  {availableStocks.map((stk, idx) => {
                                    const isEditingStock = Object.prototype.hasOwnProperty.call(
                                      editingStocks,
                                      stk.id,
                                    )
                                    const isSavingStock = Boolean(savingStocks[stk.id])
                                    return (
                                      <div
                                        data-no-drag="true"
                                        key={stk.id}
                                        className={`group flex flex-col items-start gap-3 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 transition-all duration-300 hover:border-emerald-200/70 hover:bg-emerald-500/15 cursor-default sm:flex-row sm:items-center ${
                                          deletingStocks[stk.id] ? "opacity-50 scale-[0.98]" : ""
                                        } ${
                                          usingStocks[stk.id] ? "opacity-60 -translate-y-0.5 scale-[0.97]" : ""
                                        } ${
                                          highlightStocks[stk.id]
                                            ? "ring-2 ring-emerald-200/70 shadow-glow"
                                            : ""
                                        }`}
                                        onDragStart={(event) => event.preventDefault()}
                                        onMouseDown={(event) => {
                                          event.stopPropagation()
                                          isStockTextSelectingRef.current = true
                                        }}
                                        onMouseUp={() => {
                                          isStockTextSelectingRef.current = false
                                        }}
                                        onMouseLeave={() => {
                                          isStockTextSelectingRef.current = false
                                        }}
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 transition group-hover:border-accent-300 group-hover:text-accent-100">
                                          #{idx + 1}
                                        </span>
                                        {isEditingStock ? (
                                          <div className="w-full flex-1">
                                            <input
                                              type="text"
                                              value={editingStocks[stk.id] ?? ""}
                                              onChange={(event) =>
                                                handleStockEditChange(stk.id, event.target.value)
                                              }
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                  event.preventDefault()
                                                  handleStockEditSave(product.id, stk.id)
                                                }
                                                if (event.key === "Escape") {
                                                  event.preventDefault()
                                                  handleStockEditCancel(stk.id)
                                                }
                                              }}
                                              disabled={isSavingStock}
                                              autoFocus
                                              className="w-full rounded-md border border-white/10 bg-ink-900 px-2.5 py-1.5 font-mono text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                          </div>
                                        ) : (
                                          <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100 group-hover:text-accent-50">
                                            {stk.code}
                                          </p>
                                        )}
                                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                                          {isEditingStock ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditSave(product.id, stk.id)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Kaydet
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditCancel(stk.id)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                İptal
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              {canCopyStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockCopy(stk.code)}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                aria-label="Stoku kopyala"
                                              >
                                                Kopyala
                                              </button>
                                              )}
                                              {canEditStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditStart(stk.id, stk.code)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Düzenle
                                              </button>
                                              )}
                                              {canChangeStockStatus && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleStockStatusUpdate(product.id, stk.id, STOCK_STATUS.used)
                                                }
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-amber-300/60 bg-amber-500/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/20 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                aria-label="Stoku kullanıldı yap"
                                              >
                                                Kullanıldı
                                              </button>
                                              )}
                                              {canDeleteStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockDeleteWithConfirm(product.id, stk.id)}
                                                disabled={isSavingStock}
                                                className={`flex h-7 w-full items-center justify-center rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60 ${
                                                  confirmStockTarget === `${product.id}-${stk.id}`
                                                    ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                                    : "border-rose-400/60 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-500/20"
                                                }`}
                                                aria-label="Stoku sil"
                                              >
                                                Sil
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
                            {usedCount > 0 && (
                              <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                    Kullanılan stoklar
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {canBulkStocks && (
                                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-2 py-1">
                                      <input
                                        id={`used-bulk-${product.id}`}
                                        type="text"
                                        value={usedBulkCount[product.id] ?? usedCount}
                                        onChange={(e) =>
                                          setUsedBulkCount((prev) => ({
                                            ...prev,
                                            [product.id]: e.target.value.replace(/\D/g, ""),
                                          }))
                                        }
                                        inputMode="numeric"
                                        className="w-16 appearance-none bg-transparent text-xs text-slate-100 focus:outline-none"
                                      />
                                      <span className="text-[11px] text-slate-500">/ {usedCount}</span>
                                    </div>
                                    )}
                                    {canBulkStocks && canDeleteStocks && (
                                    <button
                                      type="button"
                                      onClick={() => handleUsedBulkDelete(product.id)}
                                      className="rounded-md border border-rose-300/60 bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-50 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25"
                                    >
                                      Toplu sil
                                    </button>
                                    )}
                                    <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
                                      {usedCount} adet
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {usedStocks.map((stk, idx) => {
                                    const isEditingStock = Object.prototype.hasOwnProperty.call(
                                      editingStocks,
                                      stk.id,
                                    )
                                    const isSavingStock = Boolean(savingStocks[stk.id])
                                    return (
                                      <div
                                        data-no-drag="true"
                                        key={stk.id}
                                        className={`group flex flex-col items-start gap-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 transition-all duration-300 hover:border-rose-200/70 hover:bg-rose-500/15 cursor-default sm:flex-row sm:items-center ${
                                          deletingStocks[stk.id] ? "opacity-50 scale-[0.98]" : ""
                                        } ${
                                          highlightStocks[stk.id]
                                            ? "ring-2 ring-rose-200/70 shadow-glow"
                                            : ""
                                        }`}
                                        onDragStart={(event) => event.preventDefault()}
                                        onMouseDown={(event) => {
                                          event.stopPropagation()
                                          isStockTextSelectingRef.current = true
                                        }}
                                        onMouseUp={() => {
                                          isStockTextSelectingRef.current = false
                                        }}
                                        onMouseLeave={() => {
                                          isStockTextSelectingRef.current = false
                                        }}
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-300 transition group-hover:border-amber-300 group-hover:text-amber-100">
                                          #{idx + 1}
                                        </span>
                                        {isEditingStock ? (
                                          <div className="w-full flex-1">
                                            <input
                                              type="text"
                                              value={editingStocks[stk.id] ?? ""}
                                              onChange={(event) =>
                                                handleStockEditChange(stk.id, event.target.value)
                                              }
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                  event.preventDefault()
                                                  handleStockEditSave(product.id, stk.id)
                                                }
                                                if (event.key === "Escape") {
                                                  event.preventDefault()
                                                  handleStockEditCancel(stk.id)
                                                }
                                              }}
                                              disabled={isSavingStock}
                                              autoFocus
                                              className="w-full rounded-md border border-white/10 bg-ink-900 px-2.5 py-1.5 font-mono text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                          </div>
                                        ) : (
                                          <p className="w-full flex-1 select-text break-all font-mono text-sm text-slate-100 group-hover:text-amber-50">
                                            {stk.code}
                                          </p>
                                        )}
                                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                                          {isEditingStock ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditSave(product.id, stk.id)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/20 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Kaydet
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditCancel(stk.id)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                İptal
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              {canCopyStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockCopy(stk.code)}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/15 hover:text-indigo-50 sm:w-auto"
                                                aria-label="Stoku kopyala"
                                              >
                                                Kopyala
                                              </button>
                                              )}
                                              {canEditStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockEditStart(stk.id, stk.code)}
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Düzenle
                                              </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleStockStatusUpdate(
                                                    product.id,
                                                    stk.id,
                                                    STOCK_STATUS.available,
                                                  )
                                                }
                                                disabled={isSavingStock}
                                                className="flex h-7 w-full items-center justify-center rounded-md border border-emerald-300/60 bg-emerald-500/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/20 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                                                aria-label="Stoku geri al"
                                              >
                                                Geri al
                                              </button>
                                              {canDeleteStocks && (
                                              <button
                                                type="button"
                                                onClick={() => handleStockDeleteWithConfirm(product.id, stk.id)}
                                                disabled={isSavingStock}
                                                className={`flex h-7 w-full items-center justify-center rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60 ${
                                                  confirmStockTarget === `${product.id}-${stk.id}`
                                                    ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                                    : "border-rose-400/60 bg-rose-500/10 hover:border-rose-300 hover:bg-rose-500/20"
                                                }`}
                                                aria-label="Stoku sil"
                                              >
                                                Sil
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
                          </div>
                        )}
                        </div>
                      )
                    })}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:sticky lg:top-6">
                {canCreateProducts && (
                <div className={`${panelClass} relative overflow-hidden bg-ink-900/70`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.12),transparent)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni ürün ekle</p>
                        <p className="text-sm text-slate-400">Sağdan ürün yarat, solda stokları görün.</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {products.length} ürün
                      </span>
                    </div>

                    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="prd-name">
                          Ürün adı
                        </label>
                        <input
                          id="prd-name"
                          type="text"
                          value={productForm.name}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Örn: Deluxe Edition"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="prd-delivery">
                          Teslimat şablonu (opsiyonel)
                        </label>
                        <select
                          id="prd-delivery"
                          value={productForm.deliveryTemplate}
                          onChange={(e) => setProductForm((prev) => ({ ...prev, deliveryTemplate: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        >
                          <option value="">Seç (opsiyonel)</option>
                          {templates.map((tpl) => (
                            <option key={tpl.label} value={tpl.label}>
                              {tpl.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleProductAdd}
                          className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                        >
                          Ürün ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductForm({ name: "", deliveryTemplate: "" })}
                          className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {canAddStocks && (
                <div className={`${panelClass} relative overflow-hidden bg-ink-900/70`}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(58,199,255,0.08),transparent)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Stok ekle</p>
                        <p className="text-sm text-slate-400">Seçilen ürüne anahtar ekle.</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        Kullanılabilir: {stockSummary.total}
                      </span>
                    </div>

                    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-product">
                          Ürün seç
                        </label>
                        <select
                          id="stock-product"
                          value={stockForm.productId}
                          onChange={(e) => setStockForm((prev) => ({ ...prev, productId: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        >
                          {products.map((prd) => (
                            <option key={prd.id} value={prd.id}>
                              {prd.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-code">
                          Anahtar / Kod
                        </label>
                        <textarea
                          id="stock-code"
                          rows={4}
                          value={stockForm.code}
                          onChange={(e) => setStockForm((prev) => ({ ...prev, code: e.target.value }))}
                          placeholder="Her satır bir anahtar / kod, örn: XXXX-XXXX-XXXX-XXXX"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleStockAdd}
                          className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                        >
                          Stok ekle
                        </button>
                        <button
                          type="button"
                          onClick={resetStockForm}
                          className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
  )
}






