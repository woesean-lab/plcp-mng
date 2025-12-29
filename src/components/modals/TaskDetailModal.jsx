import { useEffect, useState } from "react"

export default function TaskDetailModal({
  target,
  onClose,
  onEdit,
  canEdit,
  onDetailNoteSave,
  taskStatusMeta,
  getTaskDueLabel,
  detailNoteText,
  detailNoteLineCount,
  detailNoteLineRef,
  detailNoteRef,
  handleDetailNoteScroll,
}) {
  if (!target) return null
  const [detailDraft, setDetailDraft] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const canEditNote = Boolean(canEdit && onDetailNoteSave)
  const isDirty = detailDraft.trim().length > 0

  useEffect(() => {
    setDetailDraft("")
  }, [target?.id])

  const handleDetailNoteSave = async () => {
    if (!canEditNote || !target?.id) return
    setIsSaving(true)
    const saved = await onDetailNoteSave(target.id, detailDraft)
    if (saved) setDetailDraft("")
    setIsSaving(false)
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

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-inner">
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
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Görevi detaylandır (yorum)</p>
            <span className="text-xs text-slate-400">{detailDraft.length} karakter</span>
          </div>
          <textarea
            rows={6}
            value={detailDraft}
            onChange={(event) => setDetailDraft(event.target.value)}
            placeholder="Görevi detaylandır..."
            readOnly={!canEditNote}
            className="w-full resize-none bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-3 text-xs">
            <span className="text-slate-400">
              {canEditNote ? "Yorumlar mevcut notların altına eklenir." : "Düzenleme yetkisi gerekli."}
            </span>
            <button
              type="button"
              onClick={handleDetailNoteSave}
              disabled={!canEditNote || !isDirty || isSaving}
              className={`min-w-[120px] rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                !canEditNote || !isDirty || isSaving
                  ? "border-white/10 bg-white/5 text-slate-500"
                  : "border-accent-300/70 bg-accent-500/15 text-accent-50 hover:border-accent-200 hover:bg-accent-500/25"
              }`}
            >
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

