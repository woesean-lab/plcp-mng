import { createPortal } from "react-dom"

export default function DeliveryMapModal({
  isOpen,
  onClose,
  productName,
  templates,
  draft,
  setDraft,
  onSave,
  isSaving = false,
}) {
  if (!isOpen) return null

  const safeTemplates = Array.isArray(templates) ? templates : []
  const selectedTemplate = safeTemplates.find((tpl) => tpl.label === draft.template)
  const hasTemplate = Boolean(selectedTemplate?.value)

  const handleChange = (key) => (event) => {
    const value = event.target.value
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleTemplateInsert = () => {
    if (!selectedTemplate?.value) return
    setDraft((prev) => {
      const message = String(prev.message ?? "")
      const next = message ? `${message}\n${selectedTemplate.value}` : selectedTemplate.value
      return { ...prev, message: next }
    })
  }

  const handleStockFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? "").trim()
      if (!content) return
      setDraft((prev) => {
        const current = String(prev.stock ?? "").trim()
        return { ...prev, stock: current ? `${current}\n${content}` : content }
      })
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const modal = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">
              Teslimat haritasi
            </p>
            <p className="text-xs text-slate-400">{productName || "Urun"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
          >
            Kapat
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Not
              </p>
              <textarea
                rows={7}
                value={draft.note}
                onChange={handleChange("note")}
                placeholder="Teslimat notu yaz..."
                className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Mesaj sablonu
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={draft.template}
                  onChange={handleChange("template")}
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                >
                  <option value="">Sablon sec</option>
                  {safeTemplates.map((tpl) => (
                    <option key={tpl.id ?? tpl.label} value={tpl.label}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleTemplateInsert}
                  disabled={!hasTemplate}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ekle
                </button>
              </div>
              <textarea
                rows={7}
                value={draft.message}
                onChange={handleChange("message")}
                placeholder="Mesaj icerigi..."
                className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Stok dosyasi
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".txt"
                onChange={handleStockFileChange}
                className="w-full max-w-xs rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/20"
              />
              <p className="text-xs text-slate-500">TXT dosyasi secip stok ekleyebilirsin.</p>
            </div>
            <textarea
              rows={5}
              value={draft.stock}
              onChange={handleChange("stock")}
              placeholder="Her satir bir stok kodu"
              className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Esc ile kapat</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Kaydet
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
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
