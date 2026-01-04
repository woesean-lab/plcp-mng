import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"

const createTokenNode = ({ type, label, value, productId }) => {
  const node = document.createElement("span")
  node.dataset.token = type
  if (label) node.dataset.label = label
  if (value) node.dataset.value = value
  if (productId) node.dataset.productId = productId
  node.setAttribute("contenteditable", "false")
  node.setAttribute("draggable", "true")
  node.className =
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200"
  node.textContent = label || "Islev"
  return node
}

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

  const editorRef = useRef(null)
  const hydratedRef = useRef(false)
  const draggingTokenRef = useRef(null)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showStockPicker, setShowStockPicker] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [stockPreview, setStockPreview] = useState(null)

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

  const getAvailableStockCodes = (productId) => {
    const target = safeProducts.find((item) => item.id === productId)
    if (!target) return []
    const list = Array.isArray(target.stocks) ? target.stocks : []
    const available = splitStocks ? splitStocks(list).available : list.filter((stk) => stk?.status !== "used")
    return available.map((stk) => String(stk?.code ?? "").trim()).filter(Boolean)
  }

  const updateEditorEmpty = () => {
    const editor = editorRef.current
    if (!editor) return
    const hasTokens = Boolean(editor.querySelector("[data-token]"))
    const text = editor.textContent?.trim() ?? ""
    setEditorEmpty(!hasTokens && !text)
  }

  const hydrateEditor = () => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = draft.note || ""
    updateEditorEmpty()
  }

  useEffect(() => {
    if (!isOpen) {
      hydratedRef.current = false
      setIsEditing(false)
      return
    }
    if (!hydratedRef.current) {
      hydrateEditor()
      hydratedRef.current = true
      if (!draft.note?.trim()) {
        setIsEditing(true)
      }
    }
  }, [draft.note, isOpen])

  useEffect(() => {
    if (!isEditing) {
      setShowTemplatePicker(false)
      setShowStockPicker(false)
    }
  }, [isEditing])

  const handleEditorInput = () => {
    if (!isEditing) return
    const editor = editorRef.current
    if (!editor) return
    setDraft((prev) => ({ ...prev, note: editor.innerHTML }))
    updateEditorEmpty()
  }

  const handleEditorClick = (event) => {
    const token = event.target?.closest?.("[data-token]")
    if (!token) return
    const type = token.dataset.token
    if (type === "message") {
      const value = token.dataset.value || ""
      if (!value) return
      navigator.clipboard
        .writeText(value)
        .then(() => toast.success("Mesaj kopyalandi."))
        .catch(() => toast.error("Kopyalanamadi."))
      return
    }
    if (type === "stock") {
      const productId = token.dataset.productId || ""
      const productLabel = token.dataset.label || "Stok"
      if (!productId) return
      const codes = getAvailableStockCodes(productId)
      setStockPreview({ productId, label: productLabel, codes })
    }
  }

  const handleEnableEditing = () => {
    setIsEditing(true)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const insertTokenAtCursor = (node) => {
    if (!isEditing) {
      toast.error("Once duzenlemeyi ac.")
      return
    }
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      editor.appendChild(node)
      editor.appendChild(document.createTextNode(" "))
      handleEditorInput()
      return
    }
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer)) {
      editor.appendChild(node)
      editor.appendChild(document.createTextNode(" "))
      handleEditorInput()
      return
    }
    range.deleteContents()
    range.insertNode(node)
    const spacer = document.createTextNode(" ")
    node.after(spacer)
    range.setStartAfter(spacer)
    range.setEndAfter(spacer)
    selection.removeAllRanges()
    selection.addRange(range)
    handleEditorInput()
  }

  const handleTemplateInsert = () => {
    if (!isEditing) {
      toast.error("Once duzenlemeyi ac.")
      return
    }
    if (!selectedTemplate?.value) return
    const token = createTokenNode({
      type: "message",
      label: selectedTemplate.label,
      value: selectedTemplate.value,
    })
    insertTokenAtCursor(token)
    setShowTemplatePicker(false)
  }

  const handleStockInsert = () => {
    if (!isEditing) {
      toast.error("Once duzenlemeyi ac.")
      return
    }
    const target = safeProducts.find((item) => item.id === selectedProductId)
    if (!target) {
      toast.error("Stok urunu secmelisin.")
      return
    }
    const token = createTokenNode({
      type: "stock",
      label: `Stok: ${target.name || "Urun"}`,
      productId: target.id,
    })
    insertTokenAtCursor(token)
    setShowStockPicker(false)
  }

  const handleEditorDragStart = (event) => {
    if (!isEditing) return
    const token = event.target?.closest?.("[data-token]")
    if (!token) return
    draggingTokenRef.current = token
    const payload = JSON.stringify({
      token: token.dataset.token,
      label: token.dataset.label,
      value: token.dataset.value,
      productId: token.dataset.productId,
    })
    event.dataTransfer?.setData("text/plain", payload)
  }

  const handleEditorDrop = (event) => {
    if (!isEditing) return
    event.preventDefault()
    const payload = event.dataTransfer?.getData("text/plain")
    if (!payload) return
    try {
      const parsed = JSON.parse(payload)
      if (!parsed?.token) return
      if (draggingTokenRef.current) {
        draggingTokenRef.current.remove()
        draggingTokenRef.current = null
      }
      const token = createTokenNode({
        type: parsed.token,
        label: parsed.label,
        value: parsed.value,
        productId: parsed.productId,
      })
      insertTokenAtCursor(token)
    } catch (error) {
      // ignore
    }
  }

  const handleEditorDragEnd = () => {
    draggingTokenRef.current = null
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
          <div className="rounded-2xl border border-white/12 bg-ink-950/60 p-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Ozel islevler
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnableEditing}
                  disabled={isEditing}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed ${
                    isEditing
                      ? "border-accent-400/60 bg-accent-500/15 text-accent-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300 hover:text-accent-100"
                  }`}
                >
                  {isEditing ? "Duzenleme acik" : "Duzenle"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplatePicker((prev) => !prev)
                    setShowStockPicker(false)
                  }}
                  disabled={!isEditing}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mesaj ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockPicker((prev) => !prev)
                    setShowTemplatePicker(false)
                  }}
                  disabled={!isEditing}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stok goster
                </button>
              </div>
            </div>

            {showTemplatePicker && (
              <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={draft.template}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, template: event.target.value }))
                    }
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
                    Ekle
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-3 shadow-inner focus-within:border-accent-400/60 focus-within:ring-1 focus-within:ring-accent-500/20">
                <div className="relative">
                  {editorEmpty && (
                    <div className="pointer-events-none absolute left-5 top-4 text-sm text-slate-500">
                      Teslimat notunu buraya yaz...
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    role="textbox"
                    contentEditable={isEditing}
                    aria-readonly={!isEditing}
                    onInput={handleEditorInput}
                    onClick={handleEditorClick}
                    onDragStart={handleEditorDragStart}
                    onDragEnd={handleEditorDragEnd}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleEditorDrop}
                    className={`min-h-[240px] rounded-xl px-4 py-3 text-sm leading-relaxed outline-none transition ${
                      isEditing
                        ? "bg-ink-900/70 text-slate-100"
                        : "bg-ink-900/40 text-slate-300"
                    }`}
                  />
                </div>
              </div>

              {stockPreview && (
                <div className="rounded-xl border border-white/10 bg-ink-900/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                      {stockPreview.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStockPreview(null)}
                      className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                    >
                      Kapat
                    </button>
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2 text-xs text-slate-200">
                    {stockPreview.codes.length > 0 ? (
                      <ul className="space-y-1">
                        {stockPreview.codes.map((code, index) => (
                          <li key={`${code}-${index}`} className="font-mono text-[11px] text-slate-200">
                            {code}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">Kullanilabilir stok yok.</p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (stockPreview.codes.length === 0) return
                        navigator.clipboard
                          .writeText(stockPreview.codes.join("\n"))
                          .then(() => toast.success("Stok kopyalandi."))
                          .catch(() => toast.error("Kopyalanamadi."))
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              )}
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
