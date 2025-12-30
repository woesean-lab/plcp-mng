import { createPortal } from "react-dom"

export default function DeliveryNoteModal({
  isOpen,
  onClose,
  onSave,
  draft,
  setDraft,
  canSave,
}) {
  if (!isOpen) return null
  if (typeof document === "undefined") return null
  const safeDraft = draft || { title: "", body: "", tags: "" }
  const hasDraft = Boolean(
    safeDraft.title.trim() || safeDraft.body.trim() || safeDraft.tags.trim(),
  )

  const modal = (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card sm:my-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">Yeni not</p>
            <p className="text-xs text-slate-400">
              {hasDraft ? "Taslak hazir" : "Baslik ve icerik gir"}
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

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (typeof onSave === "function") onSave()
          }}
          className="space-y-4 px-4 py-5"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="delivery-modal-title">
              Not basligi
            </label>
            <input
              id="delivery-modal-title"
              type="text"
              value={safeDraft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Orn: Musteri teslimati"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="delivery-modal-body">
              Not icerigi
            </label>
            <textarea
              id="delivery-modal-body"
              rows={8}
              value={safeDraft.body}
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              placeholder="Teslimat adimlari, uyarilar veya kontrol listesi"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="delivery-modal-tags">
              Etiketler
            </label>
            <input
              id="delivery-modal-tags"
              type="text"
              value={safeDraft.tags}
              onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="Orn: kargo, kritik"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
            <p className="text-xs text-slate-500">Etiketleri virgul ile ayir.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Esc ile kapat</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canSave}
                className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Not olustur
              </button>
              <button
                type="button"
                onClick={() => setDraft({ title: "", body: "", tags: "" })}
                className="min-w-[120px] rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[120px] rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
              >
                Iptal
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
