import { PERMISSION_GROUPS } from "../../constants/appConstants"

function AdminSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-56 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export default function AdminTab({
  isLoading,
  panelClass,
  canManageRoles,
  canManageUsers,
  eldoradoLogs,
  isEldoradoLogsLoading,
  onRefreshEldoradoLogs,
  activeUser,
  roles,
  users,
  roleDraft,
  setRoleDraft,
  userDraft,
  setUserDraft,
  confirmRoleDelete,
  confirmUserDelete,
  handleRoleEditStart,
  handleRoleEditCancel,
  toggleRolePermission,
  handleRoleSave,
  handleRoleDeleteWithConfirm,
  handleUserEditStart,
  handleUserEditCancel,
  handleUserSave,
  handleUserDeleteWithConfirm,
}) {
  if (isLoading) {
    return <AdminSkeleton panelClass={panelClass} />
  }

  const isRoleEditing = Boolean(roleDraft?.id)
  const isUserEditing = Boolean(userDraft?.id)
  const canShowLogs = canManageRoles || canManageUsers

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Admin
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Kullanici ve Rol Yonetimi
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Rolleri tanimla, yetkileri tikla ve kullanicilara ata.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageRoles && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Roller: {roles.length}
              </span>
            )}
            {canManageUsers && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Kullanicilar: {users.length}
              </span>
            )}
          </div>
        </div>
      </header>

      {canShowLogs && (
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Eldorado Tarama Logu
              </p>
              <p className="text-xs text-slate-400">Son tarama ciktilari burada gorunur.</p>
            </div>
            <button
              type="button"
              onClick={() => onRefreshEldoradoLogs?.()}
              disabled={isEldoradoLogsLoading}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                isEldoradoLogsLoading
                  ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-400"
                  : "border-accent-300/60 bg-accent-500/15 text-accent-50 hover:border-accent-300 hover:bg-accent-500/25"
              }`}
            >
              {isEldoradoLogsLoading ? "Yukleniyor" : "Yenile"}
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/70 p-3 shadow-inner">
            {isEldoradoLogsLoading ? (
              <div className="h-28 w-full rounded-lg bg-white/5" />
            ) : eldoradoLogs.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                Log bulunamadi.
              </div>
            ) : (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950/60 p-3 text-[11px] text-slate-200">
                {eldoradoLogs.join("\n")}
              </pre>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canManageRoles && (
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  {isRoleEditing ? "Rol duzenle" : "Yeni rol"}
                </p>
                <p className="text-sm text-slate-400">Rol adi ve yetkiler.</p>
              </div>
              {isRoleEditing && (
                <button
                  type="button"
                  onClick={handleRoleEditCancel}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                >
                  Iptal
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="role-name">
                  Rol adi
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={roleDraft.name}
                  onChange={(e) => setRoleDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Orn: Destek"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-xl border border-white/10 bg-ink-900/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {group.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const isActive = roleDraft.permissions.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                              isActive
                                ? "border-accent-300 bg-accent-500/20 text-accent-50"
                                : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300/60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleRolePermission(item.id)}
                              className="h-3.5 w-3.5 rounded border-white/30 bg-transparent text-accent-400 focus:ring-accent-400/50"
                            />
                            {item.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRoleSave}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                {isRoleEditing ? "Rol guncelle" : "Rol ekle"}
              </button>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Roller</p>
            <div className="mt-4 space-y-3">
              {roles.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Rol bulunamadi.
                </div>
              )}
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{role.name}</p>
                    <p className="text-xs text-slate-400">{role.permissions.length} yetki</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleEditStart(role)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleDeleteWithConfirm(role.id)}
                      className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                        confirmRoleDelete === role.id
                          ? "border-rose-300 bg-rose-500/25 text-rose-50"
                          : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {confirmRoleDelete === role.id ? "Emin misin?" : "Sil"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {canManageUsers && (
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  {isUserEditing ? "Kullanici duzenle" : "Yeni kullanici"}
                </p>
                <p className="text-sm text-slate-400">Kullanici adi, sifre ve rol.</p>
              </div>
              {isUserEditing && (
                <button
                  type="button"
                  onClick={handleUserEditCancel}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50"
                >
                  Iptal
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-name">
                  Kullanici adi
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={userDraft.username}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Orn: ayse"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-password">
                  Sifre {isUserEditing ? "(bos birakilirsa degismez)" : ""}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={userDraft.password}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={isUserEditing ? "Yeni sifre" : "Sifre"}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="user-role">
                  Rol
                </label>
                <select
                  id="user-role"
                  value={userDraft.roleId}
                  onChange={(e) => setUserDraft((prev) => ({ ...prev, roleId: e.target.value }))}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                >
                  <option value="">Rol secin</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleUserSave}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                {isUserEditing ? "Kullanici guncelle" : "Kullanici ekle"}
              </button>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kullanicilar</p>
            <div className="mt-4 space-y-3">
              {users.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Kullanici bulunamadi.
                </div>
              )}
              {users.map((user) => {
                const isCurrent = activeUser?.id === user.id
                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{user.username}</p>
                      <p className="text-xs text-slate-400">
                        {user.role?.name || "Rol yok"}
                        {isCurrent ? " · aktif" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUserEditStart(user)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                      >
                        Duzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUserDeleteWithConfirm(user.id)}
                        disabled={isCurrent}
                        className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          confirmUserDelete === user.id
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {confirmUserDelete === user.id ? "Emin misin?" : "Sil"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
