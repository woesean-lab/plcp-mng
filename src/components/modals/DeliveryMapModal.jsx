import { createPortal } from "react-dom"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

export default function DeliveryMapModal({
  isOpen,
  onClose,
  productName,
  templates,
  products,
  splitStocks,
  draft,
  setDraft,
  onSave,
  isSaving = false,
}) {
  if (!isOpen) return null

  const safeTemplates = Array.isArray(templates) ? templates : []
  const selectedTemplate = safeTemplates.find((tpl) => tpl.label === draft.template)
  const hasTemplate = Boolean(selectedTemplate?.value)
  const safeProducts = Array.isArray(products) ? products : []
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showStockPicker, setShowStockPicker] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [messageTokens, setMessageTokens] = useState([])
  const [stockTokens, setStockTokens] = useState([])

  const handleChange = (key) => (event) => {
    const value = event.target.value
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const parseJsonArray = (value) => {
    if (!value) return null
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
    } catch (error) {
      return null
    }
  }

  const buildMessageTokens = (value) => {
    const parsed = parseJsonArray(value)
    if (parsed) {
      return parsed
        .map((item) => ({
          label: String(item?.label ?? "").trim() || "Mesaj",
          value: String(item?.value ?? "").trim(),
        }))
        .filter((item) => item.value)
    }
    const raw = String(value ?? "").trim()
    return raw ? [{ label: "Mesaj", value: raw }] : []
  }

  const buildStockTokens = (value) => {
    const parsed = parseJsonArray(value)
    if (parsed) {
      return parsed
        .map((item) => ({
          productId: String(item?.productId ?? "").trim(),
          productName: String(item?.productName ?? "").trim() || "Stok",
          codes: Array.isArray(item?.codes) ? item.codes.filter(Boolean) : [],
        }))
        .filter((item) => item.codes.length > 0)
    }
    const raw = String(value ?? "").trim()
    const codes = raw ? raw.split(/\r?\n/).filter(Boolean) : []
    return codes.length > 0 ? [{ productId: "", productName: "Stok", codes }] : []
  }

  useEffect(() => {
    setMessageTokens(buildMessageTokens(draft.message))
    setStockTokens(buildStockTokens(draft.stock))
    setShowTemplatePicker(false)
    setShowStockPicker(false)
    setSelectedProductId("")
  }, [draft.message, draft.stock])

  const persistMessageTokens = (tokens) => {
    const value = tokens.length > 0 ? JSON.stringify(tokens) : ""
    setDraft((prev) => ({ ...prev, message: value }))
  }

  const persistStockTokens = (tokens) => {
    const value = tokens.length > 0 ? JSON.stringify(tokens) : ""
    setDraft((prev) => ({ ...prev, stock: value }))
  }

  const handleTemplateInsert = () => {
    if (!selectedTemplate?.value) return
    const next = [
      ...messageTokens,
      { label: selectedTemplate.label, value: selectedTemplate.value },
    ]
    setMessageTokens(next)
    persistMessageTokens(next)
    setShowTemplatePicker(false)
  }

  const handleTemplateRemove = (index) => {
    const next = messageTokens.filter((_, idx) => idx !== index)
    setMessageTokens(next)
    persistMessageTokens(next)
  }

  const handleStockInsert = () => {
    const target = safeProducts.find((item) => item.id === selectedProductId)
    if (!target) {
      toast.error("Stok urunu secmelisin.")
      return
    }
    const list = Array.isArray(target.stocks) ? target.stocks : []
    const available = splitStocks ? splitStocks(list).available : list.filter((stk) => stk?.status !== "used")
    const codes = available.map((stk) => String(stk?.code ?? "").trim()).filter(Boolean)
    if (codes.length === 0) {
      toast.error("Secilen urunde kullanilabilir stok yok.")
      return
    }
    const next = [
      ...stockTokens,
      { productId: target.id, productName: target.name || "Stok", codes },
    ]
    setStockTokens(next)
    persistStockTokens(next)
    setShowStockPicker(false)
  }

  const handleStockRemove = (index) => {
    const next = stockTokens.filter((_, idx) => idx !== index)
    setStockTokens(next)
    persistStockTokens(next)
  }

  const handleCopy = async (text) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Kopyalandi.")
    } catch (error) {
      toast.error("Kopyalanamadi.")
    }
  }

  const stockOptions = useMemo(
    () =>
      safeProducts
        .map((product) => ({
          id: String(product?.id ?? ""),
          name: String(product?.name ?? "").trim(),
        }))
        .filter((item) => item.id && item.name),
    [safeProducts],
  )

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
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Ozel islev ekle
                </p>
                <p className="text-xs text-slate-500">Secilenler editor icinde buton olarak gorunur.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplatePicker((prev) => !prev)
                    setShowStockPicker(false)
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                >
                  Mesaj ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockPicker((prev) => !prev)
                    setShowTemplatePicker(false)
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                >
                  Stok dosyasi getir
                </button>
              </div>
            </div>

            {showTemplatePicker && (
              <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
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
              </div>
            )}

            {showStockPicker && (
              <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(event) => setSelectedProductId(event.target.value)}
                    className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                  >
                    <option value="">Urun sec</option>
                    {stockOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleStockInsert}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                  >
                    Getir
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {messageTokens.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {messageTokens.map((token, index) => (
                    <div
                      key={`${token.label}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-xs text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(token.value)}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-100"
                      >
                        {token.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateRemove(index)}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                      >
                        Kaldir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {stockTokens.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stockTokens.map((token, index) => (
                    <div
                      key={`${token.productId || token.productName}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-xs text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(token.codes.join("\n"))}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100"
                      >
                        {token.productName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStockRemove(index)}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                      >
                        Kaldir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                rows={12}
                value={draft.note}
                onChange={handleChange("note")}
                placeholder="Teslimat notunu buraya yaz..."
                className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
              />
            </div>
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
