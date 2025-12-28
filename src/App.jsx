import { useEffect, useMemo, useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import ProfileModal from "./components/modals/ProfileModal"
import NoteModal from "./components/modals/NoteModal"
import StockModal from "./components/modals/StockModal"
import TaskDetailModal from "./components/modals/TaskDetailModal"
import TaskEditModal from "./components/modals/TaskEditModal"
import LoadingIndicator from "./components/LoadingIndicator"
import ListsTab from "./components/tabs/ListsTab"
import MessagesTab from "./components/tabs/MessagesTab"
import ProblemsTab from "./components/tabs/ProblemsTab"
import StockTab from "./components/tabs/StockTab"
import TasksTab from "./components/tabs/TasksTab"
import AdminTab from "./components/tabs/AdminTab"
import useAppData from "./hooks/useAppData"
import { PERMISSIONS } from "./constants/appConstants"

function App() {
  const {
    isAuthChecking,
    isAuthed,
    isAuthBusy,
    isAuthLoading,
    isLogoutLoading,
    activeUser,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    handleAuthSubmit,
    handleLogout,
    themeToggleButton,
    isProfileOpen,
    isProfileSaving,
    profileDraft,
    setProfileDraft,
    openProfileModal,
    closeProfileModal,
    handleProfileSave,
    hasPermission,
    hasAnyPermission,
    toastStyle,
    toastIconTheme,
    activeTab,
    setActiveTab,
    showLoading,
    panelClass,
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
    isTasksTabLoading,
    taskCountText,
    taskStats,
    taskStatusMeta,
    taskGroups,
    taskDragState,
    setTaskDragState,
    handleTaskDragOver,
    handleTaskDrop,
    handleTaskDragStart,
    handleTaskDragEnd,
    isTaskDueToday,
    getTaskDueLabel,
    handleTaskAdvance,
    openTaskDetail,
    openTaskEdit,
    handleTaskReopen,
    handleTaskDeleteWithConfirm,
    confirmTaskDelete,
    taskForm,
    setTaskForm,
    taskUsers,
    openNoteModal,
    taskDueTypeOptions,
    taskFormRepeatLabels,
    taskRepeatDays,
    normalizeRepeatDays,
    toggleRepeatDay,
    handleTaskAdd,
    resetTaskForm,
    focusTask,
    isListsTabLoading,
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
    isStockTabLoading,
    stockSummary,
    products,
    productSearch,
    setProductSearch,
    filteredProducts,
    splitStocks,
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    lastDeleted,
    handleUndoDelete,
    openStockModal,
    openProducts,
    toggleProductOpen,
    templates,
    handleProductCopyMessage,
    editingProduct,
    handleEditStart,
    handleEditChange,
    handleEditSave,
    handleEditCancel,
    confirmProductTarget,
    confirmStockTarget,
    handleProductDeleteWithConfirm,
    bulkCount,
    setBulkCount,
    handleBulkCopyAndMarkUsed,
    handleBulkCopyAndDelete,
    deletingStocks,
    usingStocks,
    highlightStocks,
    isStockTextSelectingRef,
    editingStocks,
    savingStocks,
    handleStockEditChange,
    handleStockEditSave,
    handleStockEditCancel,
    handleStockCopy,
    handleStockEditStart,
    handleStockStatusUpdate,
    handleStockDeleteWithConfirm,
    STOCK_STATUS,
    usedBulkCount,
    setUsedBulkCount,
    handleUsedBulkDelete,
    productForm,
    setProductForm,
    handleProductAdd,
    stockForm,
    setStockForm,
    handleStockAdd,
    resetStockForm,
    isProblemsTabLoading,
    openProblems,
    resolvedProblems,
    problems,
    handleProblemCopy,
    handleProblemResolve,
    handleProblemDeleteWithConfirm,
    confirmProblemTarget,
    handleProblemReopen,
    problemUsername,
    setProblemUsername,
    problemIssue,
    setProblemIssue,
    handleProblemAdd,
    roles,
    users,
    isAdminLoading,
    isAdminTabLoading,
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
    isTaskEditOpen,
    taskEditDraft,
    setTaskEditDraft,
    closeTaskEdit,
    handleTaskEditSave,
    taskEditRepeatLabels,
    isNoteModalOpen,
    handleNoteModalClose,
    noteModalDraft,
    noteLineRef,
    noteModalLineCount,
    noteTextareaRef,
    handleNoteScroll,
    setNoteModalDraft,
    handleNoteModalSave,
    isStockModalOpen,
    handleStockModalClose,
    stockModalDraft,
    setStockModalDraft,
    stockModalTarget,
    stockModalLineRef,
    stockModalLineCount,
    stockModalTextareaRef,
    handleStockModalScroll,
    handleStockModalSave,
    taskDetailTarget,
    closeTaskDetail,
    detailNoteText,
    detailNoteLineCount,
    detailNoteLineRef,
    detailNoteRef,
    handleDetailNoteScroll
  } = useAppData()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const prevTabRef = useRef(activeTab)
  const hasMountedRef = useRef(false)
  const userInitial = (activeUser?.username || "?").trim().charAt(0).toUpperCase() || "?"
  const userName = activeUser?.username ?? ""

  useEffect(() => {
    if (!isUserMenuOpen) return
    const handleClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === "Escape") setIsUserMenuOpen(false)
    }
    window.addEventListener("click", handleClick)
    window.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("click", handleClick)
      window.removeEventListener("keydown", handleKey)
    }
  }, [isUserMenuOpen])

  useEffect(() => {
    hasMountedRef.current = true
  }, [])

  useEffect(() => {
    prevTabRef.current = activeTab
  }, [activeTab])

  const canViewMessages = hasPermission(PERMISSIONS.messagesView)
  const canCreateMessages = hasAnyPermission([PERMISSIONS.messagesCreate, PERMISSIONS.messagesEdit])
  const canEditMessages = hasAnyPermission([PERMISSIONS.messagesTemplateEdit, PERMISSIONS.messagesEdit])
  const canDeleteMessages = hasAnyPermission([PERMISSIONS.messagesDelete, PERMISSIONS.messagesEdit])
  const canManageMessageCategories = hasAnyPermission([
    PERMISSIONS.messagesCategoryManage,
    PERMISSIONS.messagesEdit,
  ])
  const canViewTasks = hasPermission(PERMISSIONS.tasksView)
  const canCreateTasks = hasAnyPermission([PERMISSIONS.tasksCreate, PERMISSIONS.tasksEdit])
  const canUpdateTasks = hasAnyPermission([PERMISSIONS.tasksUpdate, PERMISSIONS.tasksEdit])
  const canProgressTasks = hasAnyPermission([PERMISSIONS.tasksProgress, PERMISSIONS.tasksEdit])
  const canDeleteTasks = hasAnyPermission([PERMISSIONS.tasksDelete, PERMISSIONS.tasksEdit])
  const canViewProblems = hasPermission(PERMISSIONS.problemsView)
  const canCreateProblems = hasAnyPermission([PERMISSIONS.problemsCreate, PERMISSIONS.problemsManage])
  const canResolveProblems = hasAnyPermission([PERMISSIONS.problemsResolve, PERMISSIONS.problemsManage])
  const canDeleteProblems = hasAnyPermission([PERMISSIONS.problemsDelete, PERMISSIONS.problemsManage])
  const canViewLists = hasPermission(PERMISSIONS.listsView)
  const canCreateLists = hasAnyPermission([PERMISSIONS.listsCreate, PERMISSIONS.listsEdit])
  const canRenameLists = hasAnyPermission([PERMISSIONS.listsRename, PERMISSIONS.listsEdit])
  const canDeleteLists = hasAnyPermission([PERMISSIONS.listsDelete, PERMISSIONS.listsEdit])
  const canEditListCells = hasAnyPermission([PERMISSIONS.listsCellsEdit, PERMISSIONS.listsEdit])
  const canEditListStructure = hasAnyPermission([
    PERMISSIONS.listsStructureEdit,
    PERMISSIONS.listsEdit,
  ])
  const canViewStock = hasPermission(PERMISSIONS.stockView)
  const canCreateProducts = hasAnyPermission([PERMISSIONS.stockProductCreate, PERMISSIONS.stockManage])
  const canEditProducts = hasAnyPermission([PERMISSIONS.stockProductEdit, PERMISSIONS.stockManage])
  const canDeleteProducts = hasAnyPermission([PERMISSIONS.stockProductDelete, PERMISSIONS.stockManage])
  const canReorderProducts = hasAnyPermission([
    PERMISSIONS.stockProductReorder,
    PERMISSIONS.stockManage,
  ])
  const canAddStocks = hasAnyPermission([PERMISSIONS.stockStockAdd, PERMISSIONS.stockManage])
  const canEditStocks = hasAnyPermission([PERMISSIONS.stockStockEdit, PERMISSIONS.stockManage])
  const canDeleteStocks = hasAnyPermission([PERMISSIONS.stockStockDelete, PERMISSIONS.stockManage])
  const canChangeStockStatus = hasAnyPermission([
    PERMISSIONS.stockStockStatus,
    PERMISSIONS.stockManage,
  ])
  const canCopyStocks = hasAnyPermission([PERMISSIONS.stockStockCopy, PERMISSIONS.stockManage])
  const canBulkStocks = hasAnyPermission([PERMISSIONS.stockStockBulk, PERMISSIONS.stockManage])
  const canManageRoles = hasAnyPermission([PERMISSIONS.adminRolesManage, PERMISSIONS.adminManage])
  const canManageUsers = hasAnyPermission([PERMISSIONS.adminUsersManage, PERMISSIONS.adminManage])
  const canViewAdmin = canManageRoles || canManageUsers
  const tabOrder = useMemo(() => {
    const order = []
    if (canViewMessages) order.push("messages")
    if (canViewTasks) order.push("tasks")
    if (canViewProblems) order.push("problems")
    if (canViewLists) order.push("lists")
    if (canViewStock) order.push("stock")
    if (canViewAdmin) order.push("admin")
    return order
  }, [canViewAdmin, canViewLists, canViewMessages, canViewProblems, canViewStock, canViewTasks])
  const slideDirection = (() => {
    const prevIndex = tabOrder.indexOf(prevTabRef.current)
    const nextIndex = tabOrder.indexOf(activeTab)
    if (prevIndex === -1 || nextIndex === -1) return "forward"
    return nextIndex >= prevIndex ? "forward" : "backward"
  })()
  const getTabSlideClass = (tabKey) => {
    if (!hasMountedRef.current || activeTab !== tabKey) return ""
    return slideDirection === "backward" ? "tab-slide-in-left" : "tab-slide-in-right"
  }
  if (isAuthChecking) {
    return null
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
        {isAuthLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 px-4 backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 px-5 py-4 shadow-card">
              <LoadingIndicator label="Giriş yapılıyor" />
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-ink-900/80 px-4 py-3 shadow-card backdrop-blur">
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 shadow-inner">
                <span className="h-6 w-1 rounded-full bg-accent-400/80 shadow-glow" />
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-200">
                    Pulcip
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
                    Manage
                  </span>
                </div>
              </div>
              <h1 className="font-display text-2xl font-semibold text-white">Giris paneli</h1>
            </div>
            {themeToggleButton}
          </div>

          <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-6 shadow-card">
            <p className="text-sm text-slate-200/80">Paneli acmak icin kullanici adi ve sifre gir.</p>

            <form className="mt-4 space-y-4" onSubmit={handleAuthSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="auth-username">
                  Kullanici adi
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={authUsername}
                  onChange={(e) => {
                    setAuthUsername(e.target.value)
                    if (authError) setAuthError("")
                  }}
                  autoComplete="username"
                  disabled={isAuthBusy}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="auth-password">
                  Sifre
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value)
                    if (authError) setAuthError("")
                  }}
                  autoComplete="current-password"
                  disabled={isAuthBusy}
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              {authError && (
                <div className="rounded-lg border border-rose-200/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={isAuthBusy}
                className="w-full rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Giris yap
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-400">Hesabin yoksa yoneticine sor.</p>
          </div>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: toastStyle,
            success: {
              iconTheme: {
                primary: toastIconTheme.primary,
                secondary: toastIconTheme.secondary,
              },
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
      {isLogoutLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 px-4 backdrop-blur">
          <div className="rounded-2xl border border-white/10 bg-ink-900/80 px-5 py-4 shadow-card">
            <LoadingIndicator label="Çıkış yapılıyor" />
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="sticky top-4 z-30 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-ink-900/80 px-3 py-2 shadow-card backdrop-blur">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 shadow-inner">
            <span className="h-6 w-1 rounded-full bg-accent-400/80 shadow-glow" />
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-200">
                Pulcip
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
                Manage
              </span>
            </div>
          </div>
          <span className="hidden h-7 w-px bg-white/10 sm:block" />
          {canViewMessages && (
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "messages"
                  ? "bg-accent-500/20 text-accent-50 shadow-glow"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Mesajlar
            </button>
          )}
          {canViewTasks && (
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "tasks"
                  ? "bg-accent-500/20 text-accent-50 shadow-glow"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {"G\u00f6rev"}
            </button>
          )}
          {canViewProblems && (
            <button
              type="button"
              onClick={() => setActiveTab("problems")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "problems"
                  ? "bg-accent-500/20 text-accent-50 shadow-glow"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {"Problemli M\u00fc\u015fteriler"}
            </button>
          )}
          {canViewLists && (
            <button
              type="button"
              onClick={() => setActiveTab("lists")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "lists"
                  ? "bg-accent-500/20 text-accent-50 shadow-glow"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Listeler
            </button>
          )}
          {canViewStock && (
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "stock"
                  ? "bg-accent-500/20 text-accent-50 shadow-glow"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Stok
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {canViewAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "admin"
                    ? "bg-accent-500/20 text-accent-50 shadow-glow"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                Admin
              </button>
            )}
            {themeToggleButton}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/5 px-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 ${
                  isUserMenuOpen ? "bg-white/10" : ""
                }`}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-label={"Kullan\u0131c\u0131 men\u00fc\u00fc"}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/20 text-[11px] font-semibold uppercase text-accent-50 shadow-glow">
                  {userInitial}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 transition ${isUserMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-card backdrop-blur"
                  role="menu"
                >
                  <div className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                      {"Ho\u015f geldin"}
                    </p>
                    <p className="text-sm font-semibold text-slate-100" title={userName}>
                      {userName}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      openProfileModal()
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    role="menuitem"
                  >
                    {"Profil d\u00fczenle"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleLogout()
                    }}
                    disabled={isLogoutLoading}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    role="menuitem"
                  >
                    {"\u00C7\u0131k\u0131\u015F"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === "messages" && canViewMessages && (
          <div className={getTabSlideClass("messages")}>
            <MessagesTab
              isLoading={showLoading}
              panelClass={panelClass}
              canCreateTemplates={canCreateMessages}
              canEditTemplates={canEditMessages}
              canDeleteTemplates={canDeleteMessages}
              canManageCategories={canManageMessageCategories}
              templateCountText={templateCountText}
              categoryCountText={categoryCountText}
              selectedCategoryText={selectedCategoryText}
              activeTemplate={activeTemplate}
              selectedCategory={selectedCategory}
              getCategoryClass={getCategoryClass}
              isEditingActiveTemplate={isEditingActiveTemplate}
              handleActiveTemplateEditCancel={handleActiveTemplateEditCancel}
              handleActiveTemplateEditStart={handleActiveTemplateEditStart}
              handleDeleteWithConfirm={handleDeleteWithConfirm}
              confirmTarget={confirmTarget}
              selectedTemplate={selectedTemplate}
              isTemplateSaving={isTemplateSaving}
              activeTemplateDraft={activeTemplateDraft}
              setActiveTemplateDraft={setActiveTemplateDraft}
              activeTemplateLength={activeTemplateLength}
              handleActiveTemplateEditSave={handleActiveTemplateEditSave}
              categories={categories}
              groupedTemplates={groupedTemplates}
              openCategories={openCategories}
              setOpenCategories={setOpenCategories}
              handleTemplateChange={handleTemplateChange}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              handleCategoryAdd={handleCategoryAdd}
              confirmCategoryTarget={confirmCategoryTarget}
              handleCategoryDeleteWithConfirm={handleCategoryDeleteWithConfirm}
              title={title}
              setTitle={setTitle}
              messageLength={messageLength}
              message={message}
              setMessage={setMessage}
              handleAdd={handleAdd}
              setSelectedCategory={setSelectedCategory}
            />
          </div>
        )}

        {activeTab === "tasks" && canViewTasks && (
          <div className={getTabSlideClass("tasks")}>
            <TasksTab
              isLoading={isTasksTabLoading}
              panelClass={panelClass}
              canCreateTasks={canCreateTasks}
              canUpdateTasks={canUpdateTasks}
              canProgressTasks={canProgressTasks}
              canDeleteTasks={canDeleteTasks}
              taskCountText={taskCountText}
              taskStats={taskStats}
              taskStatusMeta={taskStatusMeta}
              taskGroups={taskGroups}
              taskDragState={taskDragState}
              setTaskDragState={setTaskDragState}
              handleTaskDragOver={handleTaskDragOver}
              handleTaskDrop={handleTaskDrop}
              handleTaskDragStart={handleTaskDragStart}
              handleTaskDragEnd={handleTaskDragEnd}
              isTaskDueToday={isTaskDueToday}
              getTaskDueLabel={getTaskDueLabel}
              handleTaskAdvance={handleTaskAdvance}
              openTaskDetail={openTaskDetail}
              openTaskEdit={openTaskEdit}
              handleTaskReopen={handleTaskReopen}
              handleTaskDeleteWithConfirm={handleTaskDeleteWithConfirm}
              confirmTaskDelete={confirmTaskDelete}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              activeUser={activeUser}
              taskUsers={taskUsers}
              openNoteModal={openNoteModal}
              taskDueTypeOptions={taskDueTypeOptions}
              taskFormRepeatLabels={taskFormRepeatLabels}
              taskRepeatDays={taskRepeatDays}
              normalizeRepeatDays={normalizeRepeatDays}
              toggleRepeatDay={toggleRepeatDay}
              handleTaskAdd={handleTaskAdd}
              resetTaskForm={resetTaskForm}
              focusTask={focusTask}
            />
          </div>
        )}

        {activeTab === "lists" && canViewLists && (
          <div className={getTabSlideClass("lists")}>
            <ListsTab
              isLoading={isListsTabLoading}
              panelClass={panelClass}
              canCreateList={canCreateLists}
              canRenameList={canRenameLists}
              canDeleteList={canDeleteLists}
              canEditCells={canEditListCells}
              canEditStructure={canEditListStructure}
              canSaveList={canEditListCells}
              listCountText={listCountText}
              activeList={activeList}
              activeListId={activeListId}
              lists={lists}
              DEFAULT_LIST_COLS={DEFAULT_LIST_COLS}
              handleListSelect={handleListSelect}
              listSavedAt={listSavedAt}
              selectedListRows={selectedListRows}
              selectedListCols={selectedListCols}
              handleListDeleteSelectedRows={handleListDeleteSelectedRows}
              handleListDeleteSelectedColumns={handleListDeleteSelectedColumns}
              handleListSaveNow={handleListSaveNow}
              isListSaving={isListSaving}
              activeListColumnLabels={activeListColumnLabels}
              handleListColumnSelect={handleListColumnSelect}
              handleListContextMenu={handleListContextMenu}
              handleListRowSelect={handleListRowSelect}
              selectedListCell={selectedListCell}
              activeListRows={activeListRows}
              activeListColumns={activeListColumns}
              getListCellData={getListCellData}
              editingListCell={editingListCell}
              setEditingListCell={setEditingListCell}
              setSelectedListCell={setSelectedListCell}
              getListCellDisplayValue={getListCellDisplayValue}
              LIST_CELL_TONE_CLASSES={LIST_CELL_TONE_CLASSES}
              handleListCellChange={handleListCellChange}
              handleListPaste={handleListPaste}
              listName={listName}
              setListName={setListName}
              handleListCreate={handleListCreate}
              listRenameDraft={listRenameDraft}
              setListRenameDraft={setListRenameDraft}
              handleListRename={handleListRename}
              confirmListDelete={confirmListDelete}
              setConfirmListDelete={setConfirmListDelete}
              handleListDelete={handleListDelete}
              canDeleteListRow={canDeleteListRow}
              canDeleteListColumn={canDeleteListColumn}
              listContextMenu={listContextMenu}
              handleListInsertRow={handleListInsertRow}
              handleListContextMenuClose={handleListContextMenuClose}
              handleListDeleteRow={handleListDeleteRow}
              handleListInsertColumn={handleListInsertColumn}
              handleListDeleteColumn={handleListDeleteColumn}
            />
          </div>
        )}

        {activeTab === "stock" && canViewStock && (
          <div className={getTabSlideClass("stock")}>
            <StockTab
              isLoading={isStockTabLoading}
              panelClass={panelClass}
              canCreateProducts={canCreateProducts}
              canEditProducts={canEditProducts}
              canDeleteProducts={canDeleteProducts}
              canReorderProducts={canReorderProducts}
              canAddStocks={canAddStocks}
              canEditStocks={canEditStocks}
              canDeleteStocks={canDeleteStocks}
              canChangeStockStatus={canChangeStockStatus}
              canCopyStocks={canCopyStocks}
              canBulkStocks={canBulkStocks}
              stockSummary={stockSummary}
              products={products}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              filteredProducts={filteredProducts}
              splitStocks={splitStocks}
              dragState={dragState}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
              lastDeleted={lastDeleted}
              handleUndoDelete={handleUndoDelete}
              openStockModal={openStockModal}
              openProducts={openProducts}
              toggleProductOpen={toggleProductOpen}
              templates={templates}
              handleProductCopyMessage={handleProductCopyMessage}
              editingProduct={editingProduct}
              handleEditStart={handleEditStart}
              handleEditChange={handleEditChange}
              handleEditSave={handleEditSave}
              handleEditCancel={handleEditCancel}
              confirmProductTarget={confirmProductTarget}
              confirmStockTarget={confirmStockTarget}
              handleProductDeleteWithConfirm={handleProductDeleteWithConfirm}
              bulkCount={bulkCount}
              setBulkCount={setBulkCount}
              handleBulkCopyAndMarkUsed={handleBulkCopyAndMarkUsed}
              handleBulkCopyAndDelete={handleBulkCopyAndDelete}
              deletingStocks={deletingStocks}
              usingStocks={usingStocks}
              highlightStocks={highlightStocks}
              isStockTextSelectingRef={isStockTextSelectingRef}
              editingStocks={editingStocks}
              savingStocks={savingStocks}
              handleStockEditChange={handleStockEditChange}
              handleStockEditSave={handleStockEditSave}
              handleStockEditCancel={handleStockEditCancel}
              handleStockCopy={handleStockCopy}
              handleStockEditStart={handleStockEditStart}
              handleStockStatusUpdate={handleStockStatusUpdate}
              handleStockDeleteWithConfirm={handleStockDeleteWithConfirm}
              STOCK_STATUS={STOCK_STATUS}
              usedBulkCount={usedBulkCount}
              setUsedBulkCount={setUsedBulkCount}
              handleUsedBulkDelete={handleUsedBulkDelete}
              productForm={productForm}
              setProductForm={setProductForm}
              handleProductAdd={handleProductAdd}
              stockForm={stockForm}
              setStockForm={setStockForm}
              handleStockAdd={handleStockAdd}
              resetStockForm={resetStockForm}
            />
          </div>
        )}

        {activeTab === "problems" && canViewProblems && (
          <div className={getTabSlideClass("problems")}>
            <ProblemsTab
              isLoading={isProblemsTabLoading}
              panelClass={panelClass}
              canCreate={canCreateProblems}
              canResolve={canResolveProblems}
              canDelete={canDeleteProblems}
              openProblems={openProblems}
              resolvedProblems={resolvedProblems}
              problems={problems}
              handleProblemCopy={handleProblemCopy}
              handleProblemResolve={handleProblemResolve}
              handleProblemDeleteWithConfirm={handleProblemDeleteWithConfirm}
              confirmProblemTarget={confirmProblemTarget}
              handleProblemReopen={handleProblemReopen}
              problemUsername={problemUsername}
              setProblemUsername={setProblemUsername}
              problemIssue={problemIssue}
              setProblemIssue={setProblemIssue}
              handleProblemAdd={handleProblemAdd}
            />
          </div>
        )}

        {activeTab === "admin" && canViewAdmin && (
          <div className={getTabSlideClass("admin")}>
            <AdminTab
              isLoading={isAdminTabLoading}
              panelClass={panelClass}
              canManageRoles={canManageRoles}
              canManageUsers={canManageUsers}
              activeUser={activeUser}
              roles={roles}
              users={users}
              roleDraft={roleDraft}
              setRoleDraft={setRoleDraft}
              userDraft={userDraft}
              setUserDraft={setUserDraft}
              confirmRoleDelete={confirmRoleDelete}
              confirmUserDelete={confirmUserDelete}
              handleRoleEditStart={handleRoleEditStart}
              handleRoleEditCancel={handleRoleEditCancel}
              toggleRolePermission={toggleRolePermission}
              handleRoleSave={handleRoleSave}
              handleRoleDeleteWithConfirm={handleRoleDeleteWithConfirm}
              handleUserEditStart={handleUserEditStart}
              handleUserEditCancel={handleUserEditCancel}
              handleUserSave={handleUserSave}
              handleUserDeleteWithConfirm={handleUserDeleteWithConfirm}
            />
          </div>
        )}

        <TaskEditModal
          isOpen={isTaskEditOpen}
          draft={taskEditDraft}
          onClose={closeTaskEdit}
          onSave={handleTaskEditSave}
          openNoteModal={openNoteModal}
          setDraft={setTaskEditDraft}
          taskUsers={taskUsers}
          taskDueTypeOptions={taskDueTypeOptions}
          taskRepeatDays={taskRepeatDays}
          normalizeRepeatDays={normalizeRepeatDays}
          toggleRepeatDay={toggleRepeatDay}
          taskEditRepeatLabels={taskEditRepeatLabels}
        />
        <ProfileModal
          isOpen={isProfileOpen}
          isSaving={isProfileSaving}
          draft={profileDraft}
          setDraft={setProfileDraft}
          onClose={closeProfileModal}
          onSave={handleProfileSave}
        />
        <NoteModal
          isOpen={isNoteModalOpen}
          onClose={handleNoteModalClose}
          draft={noteModalDraft}
          lineRef={noteLineRef}
          lineCount={noteModalLineCount}
          textareaRef={noteTextareaRef}
          onScroll={handleNoteScroll}
          setDraft={setNoteModalDraft}
          onSave={handleNoteModalSave}
        />
        <StockModal
          isOpen={isStockModalOpen}
          onClose={handleStockModalClose}
          draft={stockModalDraft}
          setDraft={setStockModalDraft}
          targetName={stockModalTarget?.name}
          lineRef={stockModalLineRef}
          lineCount={stockModalLineCount}
          textareaRef={stockModalTextareaRef}
          onScroll={handleStockModalScroll}
          onSave={handleStockModalSave}
        />
        <TaskDetailModal
          target={taskDetailTarget}
          onClose={closeTaskDetail}
          onEdit={openTaskEdit}
          canEdit={canUpdateTasks}
          taskStatusMeta={taskStatusMeta}
          getTaskDueLabel={getTaskDueLabel}
          detailNoteText={detailNoteText}
          detailNoteLineCount={detailNoteLineCount}
          detailNoteLineRef={detailNoteLineRef}
          detailNoteRef={detailNoteRef}
          handleDetailNoteScroll={handleDetailNoteScroll}
        />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: {
            iconTheme: {
              primary: toastIconTheme.primary,
              secondary: toastIconTheme.secondary,
            },
          },
        }}
      />
    </div>
  )
}

export default App

