import { useState } from "react"

export default function TaskDetailModal({
  target,
  onClose,
  onEdit,
  canEdit,
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

  const [zoomImage, setZoomImage] = useState("")

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
              GÃ¶rev detayÄ±
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
                className="rounded-lg border border-sky-300/60 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-100 transition hover:border-sky-200 hover:bg-sky-500/25"
              >
                DÃ¼zenle
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
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
            Durum: {taskStatusMeta[target.status]?.label || "YapÄ±lacak"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
            BitiÅŸ: {getTaskDueLabel(target)}
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
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Not gÃ¶rselleri</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {detailNoteImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => handleZoomOpen(src)}
                    className="group relative overflow-hidden rounded-lg border border-white/10"
                    aria-label="GÃ¶rseli bÃ¼yÃ¼t"
                  >
                    <img
                      src={src}
                      alt={`Not gÃ¶rseli ${index + 1}`}
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
              className="absolute right-4 top-4 rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
