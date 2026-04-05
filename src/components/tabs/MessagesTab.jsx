import { useMemo, useState } from "react"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function MessagesSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-64" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-36 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBlock key={`msg-main-${idx}`} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-24 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonBlock key={`msg-side-${idx}`} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessagesTab({
  isLoading,
  panelClass,
  canCreateTemplates,
  canEditTemplates,
  canDeleteTemplates,
  canManageCategories,
  templateCountText,
  categoryCountText,
  selectedCategoryText,
  activeTemplate,
  selectedCategory,
  getCategoryClass,
  isEditingActiveTemplate,
  handleActiveTemplateEditCancel,
  handleActiveTemplateEditStart,
  handleDeleteWithConfirm,
  confirmTarget,
  selectedTemplate,
  isTemplateSaving,
  activeTemplateDraft,
  setActiveTemplateDraft,
  activeTemplateLength,
  handleActiveTemplateEditSave,
  categories,
  groupedTemplates,
  handleTemplateStarToggle,
  openCategories,
  setOpenCategories,
  handleTemplateChange,
  newCategory,
  setNewCategory,
  handleCategoryAdd,
  confirmCategoryTarget,
  handleCategoryDeleteWithConfirm,
  title,
  setTitle,
  messageLength,
  message,
  setMessage,
  handleAdd,
  setSelectedCategory,
}) {
  const showLoading = isLoading
  const showEditMode = Boolean(canEditTemplates && isEditingActiveTemplate)
  const [templateQuery, setTemplateQuery] = useState("")
  const normalizedTemplateQuery = templateQuery.trim().toLowerCase()
  const filteredTemplateCount = useMemo(() => {
    if (!normalizedTemplateQuery) return 0
    return categories.reduce((sum, cat) => {
      const list = groupedTemplates[cat] || []
      return (
        sum +
        list.filter((tpl) =>
          String(tpl?.label ?? "").toLowerCase().includes(normalizedTemplateQuery),
        ).length
      )
    }, 0)
  }, [categories, groupedTemplates, normalizedTemplateQuery])
  const visibleCategories = useMemo(() => {
    if (!normalizedTemplateQuery) return categories
    return categories.filter((cat) => {
      const list = groupedTemplates[cat] || []
      return list.some((tpl) =>
        String(tpl?.label ?? "").toLowerCase().includes(normalizedTemplateQuery),
      )
    })
  }, [categories, groupedTemplates, normalizedTemplateQuery])

  if (showLoading) {
    return <MessagesSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 sm:space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Mesajlar
            </span>
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                Mesajlar
              </h1>
              <p className="max-w-2xl text-sm text-slate-200/80 md:text-base">
                Kendi tonunu bul, hazır şablonlarını hızla düzenle ve tek tıkla ekibinle paylaş.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                <span className="h-2 w-2 rounded-full bg-accent-400" />
                Şablon: {templateCountText}
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                Kategori sayısı: {categoryCountText}
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                Kategori: {selectedCategoryText}
              </span>
            </div>
          </div>

          <div className="relative hidden w-full max-w-sm sm:block">
            <div className="absolute inset-x-4 -bottom-12 h-32 rounded-full bg-accent-400/30 blur-3xl sm:inset-x-6 sm:-bottom-16 sm:h-40" />
            <div className="relative rounded-2xl border border-white/10 bg-white/10 p-4 shadow-glow backdrop-blur-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                    Aktif şablon
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
                      {activeTemplate?.label || (showLoading ? "Yükleniyor..." : "Yeni şablon")}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getCategoryClass(
                        activeTemplate?.category || selectedCategory || "Genel",
                      )}`}
                    >
                      {activeTemplate?.category || selectedCategory || "Genel"}
                    </span>
                  </div>
                </div>
                {(canEditTemplates || canDeleteTemplates) && (
                  <div className="flex shrink-0 items-center gap-2">
                    {canEditTemplates && (
                      <button
                        type="button"
                        onClick={
                          isEditingActiveTemplate
                            ? handleActiveTemplateEditCancel
                            : handleActiveTemplateEditStart
                        }
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          isEditingActiveTemplate
                            ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-50"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300 hover:bg-accent-500/15 hover:text-accent-50"
                        }`}
                        disabled={!activeTemplate || showLoading || isTemplateSaving}
                      >
                        {isEditingActiveTemplate ? "Vazgeç" : "Mesajı düzenle"}
                      </button>
                    )}
                    {canDeleteTemplates && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWithConfirm(selectedTemplate)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          confirmTarget === selectedTemplate
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-300 hover:bg-rose-500/25"
                        }`}
                        disabled={!selectedTemplate || isTemplateSaving}
                      >
                        {confirmTarget === selectedTemplate ? "Emin misin?" : "Sil"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {showEditMode ? (
                <textarea
                  value={activeTemplateDraft}
                  onChange={(e) => setActiveTemplateDraft(e.target.value)}
                  rows={4}
                  autoFocus
                  disabled={isTemplateSaving}
                  placeholder="Mesaj içeriğini güncelle"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                  {activeTemplate?.value ||
                    (showLoading ? "Veriler yükleniyor..." : "Mesajını düzenleyip kaydetmeye başla.")}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300/80">
                <span>{activeTemplateLength} karakter</span>
                {showEditMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleActiveTemplateEditSave}
                      disabled={isTemplateSaving}
                      className="rounded-full border border-emerald-300/70 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isTemplateSaving ? "Kaydediliyor" : "Kaydet"}
                    </button>
                    <button
                      type="button"
                      onClick={handleActiveTemplateEditCancel}
                      disabled={isTemplateSaving}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/15 hover:text-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">
                    {showLoading ? "Bekle" : "Hazır"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Şablon listesi</p>
                <p className="text-sm text-slate-400">Başlıklarına dokunarak düzenle ve kopyala.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {showLoading && <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />}
                {normalizedTemplateQuery
                  ? `${filteredTemplateCount} sonuc`
                  : `${templateCountText} ${showLoading ? "" : "seçenek"}`}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-11 w-full items-center gap-3 rounded border border-white/10 bg-ink-900 px-4 shadow-inner">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ara</span>
                <div className="flex flex-1 items-center gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </svg>
                  <input
                    type="text"
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder="Sablon ara"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  {templateQuery && (
                    <button
                      type="button"
                      onClick={() => setTemplateQuery("")}
                      className="inline-flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                      title="Temizle"
                      aria-label="Temizle"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                        Temizle
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {showLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                      <div className="mb-3 h-4 w-24 animate-pulse rounded-full bg-white/10" />
                      <div className="grid gap-2">
                        {Array.from({ length: 2 }).map((__, jdx) => (
                          <div
                            key={`${idx}-${jdx}`}
                            className="h-20 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300"
                          >
                            <div className="h-full animate-pulse rounded-xl bg-ink-800/80" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                visibleCategories.map((cat) => {
                  const list = groupedTemplates[cat] || []
                  const filteredList = normalizedTemplateQuery
                    ? list.filter((tpl) =>
                        String(tpl?.label ?? "").toLowerCase().includes(normalizedTemplateQuery),
                      )
                    : list
                  const isOpen = normalizedTemplateQuery ? true : openCategories[cat] ?? true
                  const listCount = normalizedTemplateQuery ? filteredList.length : list.length
                  return (
                    <div key={cat} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setOpenCategories((prev) => ({ ...prev, [cat]: !(prev[cat] ?? true)}))}
                        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm font-semibold text-slate-100"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] ${getCategoryClass(cat)}`}
                          >
                            {cat}
                          </span>
                          <span className="text-xs text-slate-400">{listCount} şablon</span>
                        </span>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                            isOpen ? "rotate-180 border-accent-300/60 bg-white/10 text-accent-200" : ""
                          }`}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredList.length === 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                              Bu kategoride şablon yok.
                            </div>
                          )}
                          {filteredList.map((tpl) => {
                            const isStarred = Boolean(tpl.starred)
                            const clickCount = typeof tpl.clickCount === "number" ? tpl.clickCount : 0
                            return (
                              <div key={tpl.label} className="relative">
                                <button
                                  type="button"
                                  onClick={() => handleTemplateChange(tpl.label, { shouldCopy: true })}
                                  className={`h-full w-full rounded-xl border px-4 py-3 text-left transition ${
                                    tpl.label === selectedTemplate
                                      ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                                      : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                                  }`}
                                >
                                  <p className="font-display text-lg">{tpl.label}</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleTemplateStarToggle(tpl.label)
                                  }}
                                  aria-label={isStarred ? "Yildizi kaldir" : "Yildiz ekle"}
                                  aria-pressed={isStarred}
                                  className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                                    isStarred
                                      ? "border-amber-300/70 bg-amber-500/20 text-amber-100"
                                      : "border-white/10 bg-white/5 text-slate-400 hover:border-amber-300/60 hover:text-amber-100"
                                  }`}
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill={isStarred ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 3.5l2.9 5.88 6.5.94-4.7 4.58 1.1 6.45L12 18.7l-5.8 3.05 1.1-6.45-4.7-4.58 6.5-.94L12 3.5z" />
                                  </svg>
                                </button>
                                <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-slate-500">
                                  {clickCount} tiklama
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canManageCategories && (
            <div className={`${panelClass} bg-ink-800/60`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kategori ekle</p>
                <p className="text-sm text-slate-400">Yeni kategori ekle, ardından mesaj alanından seç.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {categoryCountText} kategori
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id="category-new"
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Örn: Duyuru"
                className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              />
              <button
                type="button"
                onClick={handleCategoryAdd}
                className="w-full min-w-[140px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 sm:w-auto"
              >
                Ekle
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${getCategoryClass(cat)}`}
                >
                  <span className="font-semibold">{cat}</span>
                  {cat !== "Genel" && (
                    <button
                      type="button"
                      onClick={() => handleCategoryDeleteWithConfirm(cat)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                        confirmCategoryTarget === cat
                          ? "border-rose-300 bg-rose-500/20 text-rose-50"
                          : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {confirmCategoryTarget === cat ? "Emin misin?" : "Sil"}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
          )}

          {canCreateTemplates && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Şablon ekle</p>
                <p className="text-sm text-slate-400">Başlık, kategori ve mesajı ekleyip kaydet.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Hızlı ekle</span>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="title-mini">
                  Başlık
                </label>
                <input
                  id="title-mini"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Karşılama notu"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="category-mini">
                  Kategori
                </label>
                <select
                  id="category-mini"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <label htmlFor="message-mini">Mesaj</label>
                  <span className="text-[11px] text-slate-400">Anlık karakter: {messageLength}</span>
                </div>
                <textarea
                  id="message-mini"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Mesaj içeriği..."
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>
          )}

          <div className={`${panelClass} bg-ink-800/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Hızlı ipuçları</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>- Başlık boş kalırsa otomatik bir isimle kaydedilir.</li>
              <li>- Şablona tıklamak metni panoya kopyalar.</li>
              <li>- Kategori silince şablonlar "Genel"e taşınır.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


