import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

export default function TaskDetailModal({
  target,
  onClose,
  onEdit,
  canEdit,
  detailComments,
  onDetailCommentAdd,
  onDetailCommentDelete,
  taskStatusMeta,
  getTaskDueLabel,
  detailNoteText,
  detailNoteImages,
  detailNoteLineCount,
  detailNoteLineRef,
  detailNoteRef,
  handleDetailNoteScroll,
}) {
  if (!target) return null
  const comments = Array.isArray(detailComments) ? detailComments : []
  const [detailDraft, setDetailDraft] = useState("")
  const [pendingImages, setPendingImages] = useState([])
  const [zoomImage, setZoomImage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const canAddComment = Boolean(canEdit && onDetailCommentAdd)
  const canDeleteComment = Boolean(canEdit && onDetailCommentDelete)
  const hasContent = detailDraft.trim().length > 0 || pendingImages.length > 0
  const isDirty = hasContent
  const maxImages = 10
  const maxImageBytes = 2_000_000

  useEffect(() => {
    setDetailDraft("")
    setPendingImages([])
  }, [target?.id])

  const handleDetailCommentSave = async () => {
    if (!canAddComment || !target?.id) return
    setIsSaving(true)
    const saved = await onDetailCommentAdd(target.id, detailDraft, pendingImages)
    if (saved) {
      setDetailDraft("")
      setPendingImages([])
    }
    setIsSaving(false)
  }

  const handleCommentPaste = (event) => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const imageItems = items.filter((item) => item.type?.startsWith("image/"))
    if (imageItems.length === 0) return
    event.preventDefault()
    const pastedText = event.clipboardData?.getData("text") || ""
    if (pastedText) {
      setDetailDraft((prev) => (prev ? `${prev}\n${pastedText}` : pastedText))
    }
    const availableSlots = maxImages - pendingImages.length
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
        setPendingImages((prev) => [...prev, result])
      }
      reader.readAsDataURL(file)
    })
    if (imageItems.length > availableSlots) {
      toast.error("En fazla 10 görsel ekleyebilirsin.")
    }
  }

  const handleRemovePendingImage = (index) => {
    setPendingImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleZoomOpen = (src) => {
    setZoomImage(src)
  }

  const handleZoomClose = (event) => {
    event.stopPropagation()
    setZoomImage("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/10 bg-ink-900/95 p-6 shadow-card backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300/80">
              Görev detayı
            </p>
            <p className="text-lg font-semibold text-slate-100">{target.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(target)
                onClose()
              }}
              className="rounded-lg border border-accent-300/70 bg-accent-500/15 px-3 py-1 text-xs font-semibold text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25"
            >
              Düzenle
            </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
            >
              Kapat
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {target.owner && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
              Sorumlu: {target.owner}
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
            Durum: {taskStatusMeta[target.status]?.label || "Yapılacak"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
            Bitiş: {getTaskDueLabel(target)}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded border border-white/10 bg-ink-900 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notlar</p>
            <span className="text-xs text-slate-400">{detailNoteText.length} karakter</span>
          </div>
          <div className="flex max-h-[420px] overflow-hidden">
            <div
              ref={detailNoteLineRef}
              className="w-12 shrink-0 overflow-hidden border-r border-white/10 bg-ink-800 px-2 py-3 text-right font-mono text-[11px] leading-6 text-slate-500"
            >
              {Array.from({ length: detailNoteLineCount }, (_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <div
              ref={detailNoteRef}
              onScroll={handleDetailNoteScroll}
              className="flex-1 overflow-auto bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 whitespace-pre-wrap"
            >
              {detailNoteText || "Not eklenmedi."}
            </div>
          </div>
          {Array.isArray(detailNoteImages) && detailNoteImages.length > 0 && (
            <div className="border-t border-white/10 bg-ink-900 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Not görselleri</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {detailNoteImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => handleZoomOpen(src)}
                    className="group relative overflow-hidden rounded-lg border border-white/10"
                    aria-label="Görseli büyüt"
                  >
                    <img
                      src={src}
                      alt={`Not görseli ${index + 1}`}
                      className="h-28 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 opacity-0 transition group-hover:opacity-100">
                      Buyut
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded border border-white/10 bg-ink-900 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Görevi detaylandır (yorum)</p>
            <span className="text-xs text-slate-400">{detailDraft.length} karakter</span>
          </div>
          <textarea
            rows={6}
            value={detailDraft}
            onChange={(event) => setDetailDraft(event.target.value)}
            onPaste={handleCommentPaste}
            placeholder="Görevi detaylandır..."
            readOnly={!canAddComment}
            className="w-full resize-none bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {pendingImages.length > 0 && (
            <div className="border-t border-white/10 bg-ink-900 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Eklenen görseller ({pendingImages.length}/{maxImages})
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {pendingImages.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="group relative overflow-hidden rounded-lg border border-white/10 bg-ink-900/70"
                  >
                    <button
                      type="button"
                      onClick={() => handleZoomOpen(src)}
                      className="block w-full"
                      aria-label="Görseli büyüt"
                    >
                      <img
                        src={src}
                        alt={`Yorum görseli ${index + 1}`}
                        className="h-20 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingImage(index)}
                      className="absolute right-2 top-2 rounded-full border border-white/10 bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 opacity-0 transition group-hover:opacity-100"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-3 text-xs">
            <span className="text-slate-400">
              {canAddComment ? "Yorumlar notlardan ayrı tutulur." : "Düzenleme yetkisi gerekli."}
            </span>
            <button
              type="button"
              onClick={handleDetailCommentSave}
              disabled={!canAddComment || !isDirty || isSaving}
              className={`min-w-[120px] rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                !canAddComment || !isDirty || isSaving
                  ? "border-white/10 bg-white/5 text-slate-500"
                  : "border-accent-300/70 bg-accent-500/15 text-accent-50 hover:border-accent-200 hover:bg-accent-500/25"
              }`}
            >
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
          <div className="border-t border-white/10 bg-ink-900 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Yorumlar</p>
            <div className="mt-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400">Henüz yorum yok.</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 text-xs text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap">{comment.text}</p>
                        {Array.isArray(comment.images) && comment.images.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {comment.images.map((src, index) => (
                              <button
                                key={`${comment.id}-image-${index}`}
                                type="button"
                                onClick={() => handleZoomOpen(src)}
                                className="group relative overflow-hidden rounded-lg border border-white/10"
                                aria-label="Görseli büyüt"
                              >
                                <img
                                  src={src}
                                  alt={`Yorum görseli ${index + 1}`}
                                  className="h-24 w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 opacity-0 transition group-hover:opacity-100">
                                  Buyut
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          <span>{comment.authorName || "Bilinmiyor"}</span>
                          {comment.createdAt && (
                            <span>{new Date(comment.createdAt).toLocaleString("tr-TR")}</span>
                          )}
                        </div>
                      </div>
                      {canDeleteComment && (
                        <button
                          type="button"
                          onClick={() => onDetailCommentDelete(target.id, comment.id)}
                          className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
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



