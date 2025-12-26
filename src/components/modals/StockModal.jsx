export default function StockModal({
  isOpen,
  onClose,
  draft,
  setDraft,
  targetName,
  lineRef,
  lineCount,
  textareaRef,
  onScroll,
  onSave,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">Stok ekle</p>
            <p className="text-xs text-slate-400">
              {targetName || "Ürün"} · {draft.length} karakter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
          >
            Kapat
          </button>
        </div>

        <div className="flex max-h-[420px] overflow-hidden">
          <div
            ref={lineRef}
            className="w-12 shrink-0 overflow-hidden border-r border-white/10 bg-ink-800 px-2 py-3 text-right font-mono text-[11px] leading-6 text-slate-500"
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            id="product-stock-modal"
            rows={12}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onScroll={onScroll}
            placeholder="Her satır bir anahtar / kod"
            className="flex-1 resize-none overflow-auto bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Esc ile kapat</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[120px] rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
