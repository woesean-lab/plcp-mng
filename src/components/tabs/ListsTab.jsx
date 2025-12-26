import { toast } from "react-hot-toast"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function ListsSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-40" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-32 rounded-full" />
          <SkeletonBlock className="h-7 w-40 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`list-card-${idx}`}
                  className="rounded-xl border border-white/10 bg-ink-900/60 p-4 shadow-inner"
                >
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="mt-2 h-2 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonBlock key={`list-row-${idx}`} className="h-8 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/70`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListsTab({
  isLoading,
  panelClass,
  canCreateList,
  canRenameList,
  canDeleteList,
  canEditCells,
  canEditStructure,
  canSaveList,
  listCountText,
  activeList,
  activeListId,
  lists,
  DEFAULT_LIST_COLS,
  handleListSelect,
  listSavedAt,
  selectedListRows,
  selectedListCols,
  handleListDeleteSelectedRows,
  handleListDeleteSelectedColumns,
  handleListSaveNow,
  isListSaving,
  activeListColumnLabels,
  handleListColumnSelect,
  handleListContextMenu,
  handleListRowSelect,
  selectedListCell,
  activeListRows,
  activeListColumns,
  getListCellData,
  editingListCell,
  setEditingListCell,
  setSelectedListCell,
  getListCellDisplayValue,
  LIST_CELL_TONE_CLASSES,
  handleListCellChange,
  handleListPaste,
  listName,
  setListName,
  handleListCreate,
  listRenameDraft,
  setListRenameDraft,
  handleListRename,
  confirmListDelete,
  setConfirmListDelete,
  handleListDelete,
  canDeleteListRow,
  canDeleteListColumn,
  listContextMenu,
  handleListInsertRow,
  handleListContextMenuClose,
  handleListDeleteRow,
  handleListInsertColumn,
  handleListDeleteColumn,
}) {
  const isListsTabLoading = isLoading

  if (isListsTabLoading) {
    return <ListsSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Listeler
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Listeler</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Yeni liste oluştur, listeleri görüntüle ve hücreleri Excel benzeri biçimde düzenle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Toplam liste: {listCountText}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Aktif: {activeList?.name || "Seçilmedi"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">


          <div className={`${panelClass} bg-ink-800/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Listeler</p>
                <p className="text-sm text-slate-400">Listeye tıkla ve tabloyu aç.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {listCountText} liste
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isListsTabLoading ? (
                <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={`list-skeleton-${idx}`}
                      className="rounded-xl border border-white/10 bg-ink-900/60 p-4 shadow-inner"
                    >
                      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                      <div className="mt-2 h-2 w-16 animate-pulse rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {lists.length === 0 && (
                    <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                      Henüz liste yok.
                    </div>
                  )}
                  {lists.map((list) => {
                    const rowCount = list.rows?.length ?? 0
                    const colCount =
                      list.rows?.reduce((acc, row) => Math.max(acc, row.length), 0) || DEFAULT_LIST_COLS
                    const isActive = list.id === activeListId
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => handleListSelect(list.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                            : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                        }`}
                      >
                        <p className="text-sm font-semibold">{list.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {rowCount} satır · {colCount} sütun
                        </p>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Liste içeriği</p>
                <p className="text-sm text-slate-400">Hücreleri seçip düzenleyebilirsin.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>Başlıklara sağ tıkla: ekle/sil</span>
                  {listSavedAt ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                      Kaydedildi
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Otomatik kaydedilir</span>
                  )}
                </div>
                {canEditStructure &&
                  activeList &&
                  (selectedListRows.size > 0 || selectedListCols.size > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedListRows.size > 0 && (
                      <button
                        type="button"
                        onClick={handleListDeleteSelectedRows}
                        className="rounded-lg border border-rose-300/70 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/20"
                      >
                        Satirlari sil ({selectedListRows.size})
                      </button>
                    )}
                    {selectedListCols.size > 0 && (
                      <button
                        type="button"
                        onClick={handleListDeleteSelectedColumns}
                        className="rounded-lg border border-rose-300/70 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-200 hover:bg-rose-500/20"
                      >
                        Sutunlari sil ({selectedListCols.size})
                      </button>
                    )}
                  </div>
                )}
                {canSaveList && (
                  <button
                    type="button"
                    onClick={handleListSaveNow}
                    disabled={!activeList || isListSaving || isListsTabLoading}
                    className="inline-flex items-center rounded-[0.5rem] border border-emerald-300/70 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isListSaving ? "Kaydediliyor" : "Kaydet"}
                  </button>
                )}
              </div>
            </div>

            {isListsTabLoading ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/80">
                <div className="p-4">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={`list-table-skel-${idx}`} className="h-8 rounded-lg bg-white/5">
                        <div className="h-full w-full animate-pulse rounded-lg bg-ink-800/80" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : !activeList ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Bir liste seçin veya yeni liste oluşturun.
              </div>
            ) : (
              <>
                <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-ink-900/80">
                  <table className="min-w-[640px] w-full border-collapse text-xs text-slate-200">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        <th className="w-10 border border-white/10 px-2 py-1 text-center text-[11px] font-semibold text-slate-400">
                          #
                        </th>
                        {activeListColumnLabels.map((label, colIndex) => {
                          const isSelected =
                            selectedListCols.has(colIndex) || selectedListCell.col === colIndex
                          return (
                            <th
                              key={label}
                              onClick={
                                canEditStructure
                                  ? (event) => handleListColumnSelect(event, colIndex)
                                  : undefined
                              }
                              onContextMenu={
                                canEditStructure
                                  ? (event) => handleListContextMenu(event, "column", colIndex)
                                  : undefined
                              }
                              className={`cursor-pointer border border-white/10 px-2 py-1 text-center text-[11px] font-semibold ${
                                isSelected ? "bg-white/10 text-white" : ""
                              }`}
                            >
                              {label}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeListRows.map((row, rowIndex) => (
                        <tr key={`${activeList.id}-${rowIndex}`}>
                          <td
                            onClick={
                              canEditStructure ? (event) => handleListRowSelect(event, rowIndex) : undefined
                            }
                            onContextMenu={
                              canEditStructure
                                ? (event) => handleListContextMenu(event, "row", rowIndex)
                                : undefined
                            }
                            className={`cursor-pointer border border-white/10 px-2 py-1 text-center text-[11px] ${
                              selectedListRows.has(rowIndex) || selectedListCell.row === rowIndex
                                ? "bg-white/10 text-white"
                                : "text-slate-400"
                            }`}
                          >
                            {rowIndex + 1}
                          </td>
                          {activeListColumns.map((colIndex) => {
                            const cellData = getListCellData(rowIndex, colIndex)
                            const rawValue = cellData.value ?? ""
                            const isEditingCell =
                              editingListCell.row === rowIndex && editingListCell.col === colIndex
                            const displayValue = isEditingCell
                              ? rawValue
                              : getListCellDisplayValue(rowIndex, colIndex)
                            const alignClass =
                              cellData.format?.align === "center"
                                ? "text-center"
                                : cellData.format?.align === "right"
                                  ? "text-right"
                                  : "text-left"
                            const cellToneClass =
                              LIST_CELL_TONE_CLASSES[cellData.format?.tone || "none"] || ""
                            const cellTextClass = [
                              alignClass,
                              cellData.format?.bold ? "font-semibold" : "",
                              cellData.format?.italic ? "italic" : "",
                              cellData.format?.underline ? "underline" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")
                            return (
                              <td
                                key={`${rowIndex}-${colIndex}`}
                                className={`border border-white/10 p-0 ${cellToneClass}`}
                              >
                                <input
                                  value={displayValue}
                                  onFocus={() => {
                                    if (!canEditCells) return
                                    setEditingListCell({ row: rowIndex, col: colIndex })
                                    setSelectedListCell({ row: rowIndex, col: colIndex })
                                  }}
                                  onBlur={() => {
                                    if (!canEditCells) return
                                    setEditingListCell((prev) =>
                                      prev.row === rowIndex && prev.col === colIndex
                                        ? { row: null, col: null }
                                        : prev,
                                    )
                                  }}
                                  onChange={(e) => {
                                    if (!canEditCells) return
                                    handleListCellChange(rowIndex, colIndex, e.target.value)
                                  }}
                                  onPaste={(e) => {
                                    if (!canEditCells) return
                                    handleListPaste(e, rowIndex, colIndex)
                                  }}
                                  readOnly={!canEditCells}
                                  spellCheck={false}
                                  className={`h-8 w-full bg-transparent px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-400/60 ${cellTextClass}`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canCreateList && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni liste</p>
                <p className="text-sm text-slate-400">Liste adını girip oluştur.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {listCountText} liste
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="list-name">
                  Liste adı
                </label>
                <input
                  id="list-name"
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleListCreate()
                    }
                  }}
                  placeholder="Örn: Haftalık rapor"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>
              <button
                type="button"
                onClick={handleListCreate}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
              >
                Liste oluştur
              </button>
            </div>
          </div>
          )}

          {(canRenameList || canDeleteList) && (
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Listeyi düzenle
                </p>
                <p className="text-sm text-slate-400">Aktif listenin adını değiştir ya da sil.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {activeList?.name || "Seçilmedi"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {canRenameList && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="list-rename">
                  Liste adı
                </label>
                <input
                  id="list-rename"
                  type="text"
                  value={listRenameDraft}
                  onChange={(e) => setListRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleListRename()
                    }
                  }}
                  placeholder="Liste adı"
                  disabled={!activeList}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              )}
              <div className="flex flex-wrap gap-3">
                {canRenameList && (
                <button
                  type="button"
                  onClick={handleListRename}
                  disabled={!activeList}
                  className="flex-1 min-w-[140px] rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Güncelle
                </button>
                )}
                {canDeleteList && (
                <button
                  type="button"
                  onClick={() => {
                    if (!activeList) return
                    if (confirmListDelete === activeList.id) {
                      handleListDelete(activeList.id)
                      return
                    }
                    setConfirmListDelete(activeList.id)
                    toast("Silmek i\u00E7in tekrar t\u0131kla", { position: "top-right" })
                  }}
                  disabled={!activeList}
                  className={`min-w-[140px] rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                    confirmListDelete === activeList?.id
                      ? "border-rose-300 bg-rose-500/25 text-rose-50"
                      : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {confirmListDelete === activeList?.id ? "Emin misin?" : "Listeyi sil"}
                </button>
                )}
              </div>
            </div>
          </div>

          )}
          <div className={`${panelClass} bg-ink-800/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">İpuçları</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>- Yeni liste varsayılan bir tabloyla başlar.</li>
              <li>- Satır/sütun ekleyerek tabloyu genişlet.</li>
              <li>- Bir hucreye cok satir yapistirinca asagiya yayilir.</li>
              <li>- Formül için "=" ile başla (örn: =SUM(A1:A5)).</li>
              <li>- Desteklenenler: SUM, AVERAGE, MIN, MAX, COUNT.</li>
              <li>- Satır/sütun başlığına sağ tıkla: ekle/sil.</li>
              <li>- Satir/sutun secmek icin basliga tikla; Shift aralik, Ctrl tek tek.</li>
              <li>- Veriler veritabanında saklanır.</li>
            </ul>
          </div>
        </div>
      </div>
      {canEditStructure && listContextMenu.open && (
        <div
          className="fixed z-50"
          style={{ left: listContextMenu.x, top: listContextMenu.y }}
        >
          <div className="min-w-[180px] rounded-xl border border-white/10 bg-ink-900/95 p-2 text-xs text-slate-100 shadow-card backdrop-blur">
            {listContextMenu.type === "row" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleListInsertRow(listContextMenu.index)
                    handleListContextMenuClose()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  Satır ekle
                  <span className="text-[10px] text-slate-400">Altına</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleListDeleteRow(listContextMenu.index)
                    handleListContextMenuClose()
                  }}
                  disabled={!canDeleteListRow}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Satır sil
                  <span className="text-[10px] text-rose-200/70">Seçili</span>
                </button>
                {selectedListRows.size > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleListDeleteSelectedRows()
                      handleListContextMenuClose()
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10"
                  >
                    Secili satirlari sil
                    <span className="text-[10px] text-rose-200/70">{selectedListRows.size}</span>
                  </button>
                )}
              </>
            )}
            {listContextMenu.type === "column" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleListInsertColumn(listContextMenu.index)
                    handleListContextMenuClose()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  Sütun ekle
                  <span className="text-[10px] text-slate-400">Sağına</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleListDeleteColumn(listContextMenu.index)
                    handleListContextMenuClose()
                  }}
                  disabled={!canDeleteListColumn}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sütun sil
                  <span className="text-[10px] text-rose-200/70">Seçili</span>
                </button>
                {selectedListCols.size > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleListDeleteSelectedColumns()
                      handleListContextMenuClose()
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/10"
                  >
                    Secili sutunlari sil
                    <span className="text-[10px] text-rose-200/70">{selectedListCols.size}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}




