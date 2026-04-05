import { useState } from "react"
import { toast } from "react-hot-toast"

export default function NoteModal({
  isOpen,
  onClose,
  draft,
  images,
  lineRef,
  lineCount,
  textareaRef,
  onScroll,
  setDraft,
  setImages,
  onSave,
}) {
  if (!isOpen) return null
  const safeImages = Array.isArray(images) ? images : []
  const [zoomImage, setZoomImage] = useState("")
  const maxImages = 10
  const maxImageBytes = 2_000_000

  const handlePaste = (event) => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const imageItems = items.filter((item) => item.type?.startsWith("image/"))
    if (imageItems.length === 0) return
    event.preventDefault()
    const pastedText = event.clipboardData?.getData("text") || ""
    if (pastedText) {
      setDraft((prev) => (prev ? `${prev}\n${pastedText}` : pastedText))
    }
    const availableSlots = maxImages - safeImages.length
    if (availableSlots <= 0) {
      toast.error("En fazla 10 görsel ekleyebilirsin.")
      return
    }
    const toProcess = imageItems.slice(0, availableSlots)
    toProcess.forEach((item) => {
      const file = item.getAsFile()
      if (!file) return
      if (file.size > maxImageBytes) {
        toast.error("Görsel 2MB sınırını aşıyor.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== "string") return
        setImages((prev) => [...prev, result])
      }
      reader.readAsDataURL(file)
    })
    if (imageItems.length > availableSlots) {
      toast.error("En fazla 10 görsel ekleyebilirsin.")
    }
  }

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleZoomClose = (event) => {
    event.stopPropagation()
    setZoomImage("")
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">
              Not editörü
            </p>
            <p className="text-xs text-slate-400">{draft.length} karakter</p>
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
            id="task-note-modal"
            rows={12}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onScroll={onScroll}
            onPaste={handlePaste}
            placeholder="Detaylı notunu buraya yaz..."
            className="flex-1 resize-none overflow-auto bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        {safeImages.length > 0 && (
          <div className="border-t border-white/10 bg-ink-900 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Eklenen görseller ({safeImages.length}/{maxImages})
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {safeImages.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="group relative overflow-hidden rounded-lg border border-white/10 bg-ink-900/70"
                >
                  <button
                    type="button"
                    onClick={() => setZoomImage(src)}
                    className="block w-full"
                    aria-label="Görseli büyüt"
                  >
                    <img
                      src={src}
                      alt={`Not görseli ${index + 1}`}
                      className="h-20 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-2 top-2 rounded-full border border-white/10 bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 opacity-0 transition group-hover:opacity-100"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
      {zoomImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4"
          onClick={handleZoomClose}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={zoomImage}
              alt="Buyutulmus gorsel"
              className="max-h-[90vh] w-full rounded-2xl border border-white/10 object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomImage("")}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
