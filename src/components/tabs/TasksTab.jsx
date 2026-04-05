import { useEffect, useState } from "react"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function TasksSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-40" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`task-board-${idx}`}
                  className="rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner"
                >
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="mt-2 h-2 w-16 rounded-full" />
                  <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-3 h-20 w-full rounded-xl" />
          </div>
          <div className={`${panelClass} bg-ink-800/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-3 h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TasksTab({
  isLoading,
  panelClass,
  canCreateTasks,
  canUpdateTasks,
  canDeleteTasks,
  canProgressTasks,
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
  activeUser,
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
}) {
  const isTasksTabLoading = isLoading
  const [viewMode, setViewMode] = useState("list")
  const [hideStaffTasks, setHideStaffTasks] = useState(false)

  useEffect(() => {
    try {
      const storedHideStaff = localStorage.getItem("tasks.hideStaff")
      if (storedHideStaff !== null) {
        setHideStaffTasks(storedHideStaff === "true")
      }
      const storedViewMode = localStorage.getItem("tasks.viewMode")
      if (storedViewMode === "board" || storedViewMode === "list") {
        setViewMode(storedViewMode)
      }
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("tasks.hideStaff", String(hideStaffTasks))
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
  }, [hideStaffTasks])

  useEffect(() => {
    try {
      localStorage.setItem("tasks.viewMode", viewMode)
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
  }, [viewMode])

  const shouldShowTask = (task) => {
    if (!hideStaffTasks) {
      return true
    }
    if (!activeUser?.username) {
      return true
    }
    if (!task.owner) {
      return true
    }
    return task.owner === activeUser.username
  }

  const getVisibleTasks = (status) =>
    Array.isArray(taskGroups?.[status]) ? taskGroups[status].filter(shouldShowTask) : []

  if (isTasksTabLoading) {
    return <TasksSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              {"G\u00f6revler"}
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {"G\u00f6revler"}
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Not ve tarih ile gorevlerini takipe al. Hepsi lokal tutulur.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Toplam: {taskCountText}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                Acik: {taskStats.todo + taskStats.doing}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">{"G\u00f6rev panosu"}</p>
                <p className="text-sm text-slate-400">Kartlari surukleyip yeni duruma birak.</p>
              </div>
              <div className="space-y-2 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    Tamamlanan: {taskStats.done}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    Devam: {taskStats.doing}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("board")}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        viewMode === "board"
                          ? "bg-accent-400 text-ink-900 shadow-glow"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      Pano
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                        viewMode === "list"
                          ? "bg-accent-400 text-ink-900 shadow-glow"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      Liste
                    </button>
                  </div>
                  <label className="inline-flex h-[34px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-[1px] text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={hideStaffTasks}
                      onChange={(event) => setHideStaffTasks(event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-ink-900 text-accent-400 focus:ring-accent-400/40"
                    />
                    {"Bana ait g\u00f6revler"}
                  </label>
                </div>
              </div>
            </div>

            {viewMode === "board" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {isTasksTabLoading
                  ? Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`task-skeleton-${idx}`}
                      className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                          <div className="mt-2 h-2 w-16 animate-pulse rounded-full bg-white/10" />
                        </div>
                        <div className="h-6 w-10 animate-pulse rounded-full bg-white/10" />
                      </div>
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((__, jdx) => (
                          <div
                            key={`task-skel-card-${idx}-${jdx}`}
                            className="rounded-xl border border-white/10 bg-ink-800/70 p-3 shadow-inner"
                          >
                            <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
                            <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-white/10" />
                            <div className="mt-2 h-2 w-1/2 animate-pulse rounded-full bg-white/10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                  : Object.entries(taskStatusMeta).map(([status, meta]) => {
                    const visibleTasks = getVisibleTasks(status)
                    return (
                      <div
                        key={status}
                        onDragOver={canProgressTasks ? (event) => handleTaskDragOver(event, status) : undefined}
                        onDrop={canProgressTasks ? (event) => handleTaskDrop(event, status) : undefined}
                        onDragLeave={
                          canProgressTasks
                            ? () =>
                              setTaskDragState((prev) =>
                                prev.overStatus === status ? { ...prev, overStatus: null } : prev,
                              )
                            : undefined
                        }
                        className={`flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition ${
                          taskDragState.overStatus === status
                            ? "border-accent-400/60 ring-2 ring-accent-400/30"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${meta.accent}`}>{meta.label}</p>
                            <p className="text-xs text-slate-400">{meta.helper}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                            {visibleTasks.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {visibleTasks.length === 0 && (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                              Bu kolon bos.
                            </div>
                          )}
                          {visibleTasks.map((task) => {
                            const isOwner = activeUser?.username && task.owner === activeUser.username
                            const isExpanded = true
                            return (
                              <div
                                key={task.id}
                                draggable={canProgressTasks}
                                onDragStart={
                                  canProgressTasks ? (event) => handleTaskDragStart(event, task.id) : undefined
                                }
                                onDragEnd={canProgressTasks ? handleTaskDragEnd : undefined}
                                className={`flex flex-col gap-3 rounded-xl border p-3 shadow-inner transition hover:shadow-glow cursor-grab ${
                                  isOwner
                                    ? status === "todo"
                                      ? "border-amber-300/60 bg-amber-500/15 hover:border-amber-200/70 hover:bg-amber-500/20"
                                      : status === "doing"
                                        ? "border-sky-300/60 bg-sky-500/15 hover:border-sky-200/70 hover:bg-sky-500/20"
                                        : "border-emerald-300/60 bg-emerald-500/15 hover:border-emerald-200/70 hover:bg-emerald-500/20"
                                    : "border-white/10 bg-ink-800/70 hover:border-accent-300/40 hover:bg-ink-800/80"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                                    {task.note && (
                                      <p
                                        className="text-xs text-slate-400 break-words"
                                        style={{
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                          overflowWrap: "anywhere",
                                          wordBreak: "break-word",
                                        }}
                                        title={task.note}
                                      >
                                        {task.note}
                                      </p>
                                    )}
                                    {isExpanded && task.owner && (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                          isOwner
                                            ? "bg-accent-500/20 text-accent-50"
                                            : "bg-white/5 text-slate-300"
                                        }`}
                                      >
                                        @{task.owner}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs ${
                                    isTaskDueToday(task)
                                      ? "bg-rose-500/15 text-rose-100"
                                      : "bg-white/5 text-slate-300"
                                  }`}
                                >
                                  {"Biti\u015f:"} {getTaskDueLabel(task)}
                                </span>
                                {isExpanded && (
                                  <>
                                    <div className="flex flex-wrap gap-2">
                                      {canProgressTasks && status !== "done" && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleTaskAdvance(task.id)
                                          }}
                                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                        >
                                          {status === "todo" ? "Ba\u015flat" : "Tamamla"}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          openTaskDetail(task)
                                        }}
                                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                      >
                                        Detay
                                      </button>
                                      {(canUpdateTasks || canProgressTasks || canDeleteTasks) && (
                                        <>
                                          {canUpdateTasks && (
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                openTaskEdit(task)
                                              }}
                                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                            >
                                              {"D\u00fczenle"}
                                            </button>
                                          )}
                                          {canProgressTasks && status === "done" && (
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                handleTaskReopen(task.id)
                                              }}
                                              className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                                            >
                                              Geri al
                                            </button>
                                          )}
                                          {canDeleteTasks && (
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                handleTaskDeleteWithConfirm(task.id)
                                              }}
                                              className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                                confirmTaskDelete === task.id
                                                  ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                                  : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                                              }`}
                                            >
                                              {confirmTaskDelete === task.id ? "Emin misin?" : "Sil"}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {Object.entries(taskStatusMeta).map(([status, meta]) => {
                  const visibleTasks = getVisibleTasks(status)
                  return (
                    <div
                      key={status}
                      onDragOver={canProgressTasks ? (event) => handleTaskDragOver(event, status) : undefined}
                      onDrop={canProgressTasks ? (event) => handleTaskDrop(event, status) : undefined}
                      onDragLeave={
                        canProgressTasks
                          ? () =>
                            setTaskDragState((prev) =>
                              prev.overStatus === status ? { ...prev, overStatus: null } : prev,
                            )
                          : undefined
                      }
                      className={`rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition ${
                        taskDragState.overStatus === status
                          ? "border-accent-400/60 ring-2 ring-accent-400/30"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${meta.accent}`}>{meta.label}</p>
                          <p className="text-xs text-slate-400">{meta.helper}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                          {visibleTasks.length}
                        </span>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/60">
                        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] gap-4 border-b border-white/10 bg-ink-900/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:grid">
                          <span>Görev</span>
                          <span>Sorumlu</span>
                          <span>Bitiş</span>
                          <span>Durum</span>
                          <span>İşlem</span>
                        </div>
                        {visibleTasks.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400">
                            {"Bu listede g\u00f6rev yok."}
                          </div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {visibleTasks.map((task) => {
                              const isOwner = activeUser?.username && task.owner === activeUser.username
                              return (
                                <div key={task.id}>
                                  <div
                                    draggable={canProgressTasks}
                                    onDragStart={
                                      canProgressTasks ? (event) => handleTaskDragStart(event, task.id) : undefined
                                    }
                                    onDragEnd={canProgressTasks ? handleTaskDragEnd : undefined}
                                    className="group flex flex-col gap-1.5 px-3 py-2 transition hover:bg-ink-900/70 cursor-grab active:cursor-grabbing sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-[13px] font-semibold text-slate-100">
                                          {task.title}
                                        </p>
                                      </div>
                                      {task.note && (
                                        <p
                                          className="mt-1 text-[11px] text-slate-400"
                                          style={{
                                            display: "-webkit-box",
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            overflowWrap: "anywhere",
                                            wordBreak: "break-word",
                                          }}
                                          title={task.note}
                                        >
                                          {task.note}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-300">
                                      {task.owner ? `@${task.owner}` : "-"}
                                    </div>
                                    <span
                                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${
                                        isTaskDueToday(task)
                                          ? "bg-rose-500/15 text-rose-100"
                                          : "bg-white/5 text-slate-300"
                                      }`}
                                    >
                                      {getTaskDueLabel(task)}
                                    </span>
                                    <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                                      {meta.label}
                                    </span>
                                    <div className="flex flex-wrap items-center justify-start gap-1 text-[10px] font-semibold uppercase tracking-wide">
                                      {canProgressTasks && status !== "done" && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleTaskAdvance(task.id)
                                          }}
                                          className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                        >
                                          {status === "todo" ? "Başlat" : "Tamamla"}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          openTaskDetail(task)
                                        }}
                                        className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                      >
                                        Detay
                                      </button>
                                      {canUpdateTasks && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            openTaskEdit(task)
                                          }}
                                          className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-slate-200 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                                        >
                                          Düzenle
                                        </button>
                                      )}
                                      {canProgressTasks && status === "done" && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleTaskReopen(task.id)
                                          }}
                                          className="rounded-md border border-amber-300/70 bg-amber-500/15 px-2 py-0.5 text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                                        >
                                          Geri al
                                        </button>
                                      )}
                                      {canDeleteTasks && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleTaskDeleteWithConfirm(task.id)
                                          }}
                                          className={`rounded-md border px-2 py-0.5 transition ${
                                            confirmTaskDelete === task.id
                                              ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                              : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                                          }`}
                                        >
                                          {confirmTaskDelete === task.id ? "Emin misin?" : "Sil"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          {canCreateTasks && (
          <div className={`${panelClass} bg-ink-900/70`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">{"G\u00f6rev ekle"}</p>
                <p className="text-sm text-slate-400">Yeni isleri listeye ekle.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {taskCountText}
              </span>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="task-title">
                  {"G\u00f6rev ad\u0131"}
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Orn: Stok raporunu gonder"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <label htmlFor="task-note">Not</label>
                  <button
                    type="button"
                    onClick={() =>
                      openNoteModal(
                        { text: taskForm.note, images: taskForm.noteImages },
                        ({ text, images }) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            note: text,
                            noteImages: Array.isArray(images) ? images : [],
                          })),
                      )
                    }
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-accent-300 hover:text-accent-100"
                  >
                    {"Geni\u015flet"}
                  </button>
                </div>
                <textarea
                  id="task-note"
                  rows={3}
                  value={taskForm.note}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Kisa not veya kontrol listesi"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="task-owner">
                  Sorumlu
                </label>
                <select
                  id="task-owner"
                  value={taskForm.owner}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, owner: e.target.value }))}
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
                <label className="text-xs font-semibold text-slate-200" htmlFor="task-due-type">
                  {"Biti\u015f tarihi"}
                </label>
                <select
                  id="task-due-type"
                  value={taskForm.dueType}
                  onChange={(e) => {
                    const nextType = e.target.value
                    setTaskForm((prev) => ({
                      ...prev,
                      dueType: nextType,
                      repeatDays:
                        nextType === "repeat" && (!prev.repeatDays || prev.repeatDays.length === 0)
                          ? ["1"]
                          : prev.repeatDays ?? [],
                    }))
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

              {taskForm.dueType === "repeat" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    {"Tekrarlanabilir g\u00fcn"}
                    <span className="text-[11px] text-slate-400">
                      {taskFormRepeatLabels.length} {"g\u00fcn se\u00e7ili"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {taskRepeatDays.map((day) => {
                      const isActive = normalizeRepeatDays(taskForm.repeatDays).includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleRepeatDay(day.value, setTaskForm)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            isActive
                              ? "border-accent-300 bg-accent-500/20 text-accent-50 shadow-glow"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-accent-300/60 hover:text-accent-100"
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-400">
                    {taskFormRepeatLabels.length > 0
                      ? `Se\u00e7ilen g\u00fcnler: ${taskFormRepeatLabels.join(", ")}`
                      : "G\u00fcn se\u00e7ilmedi."}
                  </p>
                </div>
              )}

              {taskForm.dueType === "date" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="task-due-date">
                    {"\u00d6zel tarih"}
                  </label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTaskAdd}
                  className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  {"G\u00f6rev ekle"}
                </button>
                <button
                  type="button"
                  onClick={resetTaskForm}
                  className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>

          )}

          <div className={`${panelClass} bg-ink-800/60`}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
              {"G\u00f6rev \u00f6zeti"}
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>- Acik gorev: {taskStats.todo + taskStats.doing}</p>
              <p>- Tamamlanan: {taskStats.done}</p>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-200 shadow-inner">
              {focusTask ? (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Siradaki odak</p>
                  <p className="mt-1 text-sm text-slate-100">{focusTask.title}</p>
                </>
              ) : (
                <p>{"G\u00f6rev kalmad\u0131. Yeni g\u00f6rev ekleyebilirsin."}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}













