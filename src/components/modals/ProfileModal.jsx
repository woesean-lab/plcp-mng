export default function ProfileModal({
  isOpen,
  isSaving,
  draft,
  setDraft,
  onClose,
  onSave,
}) {
  if (!isOpen) return null

  const safeDraft = draft ?? { username: "", currentPassword: "", newPassword: "" }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">
              {"Profil d\u00fczenle"}
            </p>
            <p className="text-xs text-slate-400">
              {"De\u011fi\u015fiklik i\u00e7in mevcut \u015fifre gerekli."}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="profile-username">
              {"Kullan\u0131c\u0131 ad\u0131"}
            </label>
            <input
              id="profile-username"
              type="text"
              value={safeDraft.username}
              onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
              autoComplete="username"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="profile-current-password">
              {"Mevcut \u015fifre"}
            </label>
            <input
              id="profile-current-password"
              type="password"
              value={safeDraft.currentPassword}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200" htmlFor="profile-new-password">
              {"Yeni \u015fifre"}
            </label>
            <input
              id="profile-new-password"
              type="password"
              value={safeDraft.newPassword}
              onChange={(event) => setDraft((prev) => ({ ...prev, newPassword: event.target.value }))}
              autoComplete="new-password"
              placeholder={"Bo\u015f b\u0131rak\u0131rsan de\u011Fi\u015Fmez."}
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
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
              className="save-button min-w-[140px] rounded-lg border px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide transition hover:-translate-y-0.5"
            >
              {isSaving ? "Kaydediliyor" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
