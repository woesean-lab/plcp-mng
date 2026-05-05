export default function TaskEditModal({
  isOpen,
  draft,
  onClose,
  onSave,
  openNoteModal,
  setDraft,
  taskUsers,
  taskDueTypeOptions,
  taskRepeatDays,
  normalizeRepeatDays,
  toggleRepeatDay,
  taskEditRepeatLabels,
}) {
  if (!isOpen || !draft) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">
              Görev düzenle
            </p>
            <p className="text-xs text-slate-400">{draft.title.length} karakter</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
          >
            Kapat
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="task-edit-title">
              Görev adı
            </label>
            <input
              id="task-edit-title"
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))
              }
              placeholder="Örn: Stok raporunu güncelle"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <label htmlFor="task-edit-note">Not</label>
              <button
                type="button"
                onClick={() =>
                  openNoteModal(
                    { text: draft.note, images: draft.noteImages },
                    ({ text, images }) =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, note: text, noteImages: Array.isArray(images) ? images : [] }
                          : prev,
                      ),
                  )
                }
                className="rounded-full border border-sky-300/60 bg-sky-500/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-sky-100 transition hover:border-sky-200 hover:bg-sky-500/25"
              >
                Genişlet
              </button>
            </div>
            <textarea
              id="task-edit-note"
              rows={3}
              value={draft.note}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, note: event.target.value } : prev))
              }
              placeholder="Kısa not veya kontrol listesi"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="task-edit-owner">
              Sorumlu
            </label>
            <select
              id="task-edit-owner"
              value={draft.owner}
              onChange={(event) =>
                setDraft((prev) => (prev ? { ...prev, owner: event.target.value } : prev))
              }
              className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            >
              <option value="" disabled>
                Sorumlu sec
              </option>
              {Array.isArray(taskUsers) &&
                taskUsers.map((user) => (
                  <option key={user.id ?? user.username} value={user.username}>
                    {user.username}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="task-edit-due-type">
              Bitiş tarihi
            </label>
            <select
              id="task-edit-due-type"
              value={draft.dueType}
              onChange={(event) => {
                const nextType = event.target.value
                setDraft((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    dueType: nextType,
                    repeatDays:
                      nextType === "repeat" && (!prev.repeatDays || prev.repeatDays.length === 0)
                        ? ["1"]
                        : prev.repeatDays ?? [],
                  }
                })
              }}
              className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            >
              {taskDueTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {draft.dueType === "repeat" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Tekrarlanabilir gün</span>
                <span className="text-[11px] text-slate-400">
                  {taskEditRepeatLabels.length} gün seçili
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {taskRepeatDays.map((day) => {
                  const isActive = normalizeRepeatDays(draft.repeatDays).includes(day.value)
                  return (
                    <label
                      key={day.value}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleRepeatDay(day.value, setDraft)}
                        className="h-3.5 w-3.5 rounded border-white/30 bg-transparent text-accent-400 focus:ring-accent-400/50"
                      />
                      {day.label}
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400">
                {taskEditRepeatLabels.length > 0
                  ? `Seçilen günler: ${taskEditRepeatLabels.join(", ")}`
                  : "Gün seçilmedi."}
              </p>
            </div>
          )}

          {draft.dueType === "date" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200" htmlFor="task-edit-due-date">
                Özel tarih
              </label>
              <input
                id="task-edit-due-date"
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, dueDate: event.target.value } : prev))
                }
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Esc ile kapat</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              className="min-w-[140px] rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:border-emerald-200 hover:bg-emerald-500/25"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

