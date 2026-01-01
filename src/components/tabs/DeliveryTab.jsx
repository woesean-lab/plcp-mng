import { useEffect, useMemo, useState } from "react"
import { DELIVERY_MAPS_STORAGE_KEY } from "../../constants/appConstants"

const createMapId = () => `map-${Date.now()}-${Math.random().toString(16).slice(2)}`

const buildSteps = (raw) =>
  String(raw || "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)

const normalizeStoredMaps = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const title = String(item?.title ?? "").trim()
      const steps = Array.isArray(item?.steps)
        ? item.steps.map((step) => String(step ?? "").trim()).filter(Boolean)
        : []
      const createdAt = typeof item?.createdAt === "string" ? item.createdAt : new Date().toISOString()
      const updatedAt = typeof item?.updatedAt === "string" ? item.updatedAt : createdAt
      return {
        id: String(item?.id ?? createMapId()),
        title,
        steps,
        createdAt,
        updatedAt,
      }
    })
    .filter((map) => map.title || map.steps.length > 0)
}

const formatMapDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

const getInitialMaps = () => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(DELIVERY_MAPS_STORAGE_KEY)
    if (!stored) return []
    return normalizeStoredMaps(JSON.parse(stored))
  } catch (error) {
    console.warn("Could not read delivery maps", error)
    return []
  }
}

export default function DeliveryTab({ panelClass }) {
  const [maps, setMaps] = useState(() => getInitialMaps())
  const [activeId, setActiveId] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [listSearch, setListSearch] = useState("")
  const [listSort, setListSort] = useState("recent")
  const [createDraft, setCreateDraft] = useState({ title: "", steps: "" })
  const [editDraft, setEditDraft] = useState({ title: "", steps: "" })

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(DELIVERY_MAPS_STORAGE_KEY, JSON.stringify(maps))
    } catch (error) {
      console.warn("Could not persist delivery maps", error)
    }
  }, [maps])

  useEffect(() => {
    if (activeId && maps.some((item) => item.id === activeId)) return
    setActiveId(maps[0]?.id ?? "")
  }, [activeId, maps])

  const activeMap = useMemo(() => maps.find((item) => item.id === activeId) || null, [activeId, maps])
  const filteredMaps = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    const source = query
      ? maps.filter((item) => {
          const titleMatch = item.title.toLowerCase().includes(query)
          if (titleMatch) return true
          return item.steps.some((step) => step.toLowerCase().includes(query))
        })
      : maps
    const getTimestamp = (item) => {
      const value = item.updatedAt || item.createdAt
      const time = Date.parse(value)
      return Number.isNaN(time) ? 0 : time
    }
    const sorted = [...source].sort((a, b) => {
      if (listSort === "title") {
        return a.title.localeCompare(b.title)
      }
      if (listSort === "oldest") {
        return getTimestamp(a) - getTimestamp(b)
      }
      return getTimestamp(b) - getTimestamp(a)
    })
    return sorted
  }, [listSearch, listSort, maps])

  useEffect(() => {
    if (!activeMap || isEditing) return
    setEditDraft({
      title: activeMap.title,
      steps: activeMap.steps.join("\n"),
    })
  }, [activeMap, isEditing])

  const activeStepsCount = activeMap?.steps.length ?? 0
  const activeUpdatedAt = activeMap
    ? formatMapDate(activeMap.updatedAt || activeMap.createdAt)
    : ""

  const handleCreate = () => {
    const title = createDraft.title.trim()
    if (!title) return
    const steps = buildSteps(createDraft.steps)
    const now = new Date().toISOString()
    const nextMap = {
      id: createMapId(),
      title,
      steps,
      createdAt: now,
      updatedAt: now,
    }
    setMaps((prev) => [nextMap, ...prev])
    setActiveId(nextMap.id)
    setIsEditing(false)
    setEditDraft({ title: nextMap.title, steps: nextMap.steps.join("\n") })
    setCreateDraft({ title: "", steps: "" })
  }

  const handleEditStart = () => {
    if (!activeMap) return
    setIsEditing(true)
    setEditDraft({
      title: activeMap.title,
      steps: activeMap.steps.join("\n"),
    })
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    if (!activeMap) return
    setEditDraft({
      title: activeMap.title,
      steps: activeMap.steps.join("\n"),
    })
  }

  const handleEditSave = () => {
    if (!activeMap) return
    const title = editDraft.title.trim()
    if (!title) return
    const steps = buildSteps(editDraft.steps)
    const now = new Date().toISOString()
    setMaps((prev) =>
      prev.map((item) =>
        item.id === activeMap.id ? { ...item, title, steps, updatedAt: now } : item,
      ),
    )
    setIsEditing(false)
  }

  const canCreate = Boolean(createDraft.title.trim())
  const canSave = Boolean(editDraft.title.trim())

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/95 via-ink-900/70 to-ink-900/50 p-6 shadow-card">
        <div
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-accent-400/40 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-accent-200">
              Teslimat
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Teslimat Akislari
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Urun bazli teslimat haritalari olustur, adimlari ekiple standartlastir.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Harita</p>
              <p className="mt-1 text-lg font-semibold text-white">{maps.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Adim</p>
              <p className="mt-1 text-lg font-semibold text-white">{activeStepsCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Son guncelleme
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{activeUpdatedAt || "-"}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.6fr)_minmax(0,0.95fr)] lg:items-start">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Harita listesi
                </p>
                <p className="text-xs text-slate-400">Kayitli teslimat akislari</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  {maps.length} kayit
                </span>
                {listSearch && (
                  <span className="inline-flex items-center rounded-full border border-accent-200/40 bg-accent-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-accent-100">
                    Filtre
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Ara
                <div className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-ink-900 px-3">
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
                    value={listSearch}
                    onChange={(event) => setListSearch(event.target.value)}
                    placeholder="Baslik veya adim"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Sirala
                <select
                  value={listSort}
                  onChange={(event) => setListSort(event.target.value)}
                  className="h-11 rounded-lg border border-white/10 bg-ink-900 px-3 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="recent">Son guncellenen</option>
                  <option value="title">Basliga gore</option>
                  <option value="oldest">En eski</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {filteredMaps.length} / {maps.length} kayit
              </span>
              <span className="uppercase tracking-[0.2em] text-slate-600">
                {listSort === "recent"
                  ? "Son guncellenen"
                  : listSort === "title"
                    ? "Basliga gore"
                    : "En eski"}
              </span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-ink-900/40">
              {maps.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  Henuz urun haritasi yok.
                </div>
              ) : filteredMaps.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  Eslesme bulunamadi.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto sm:max-h-[520px]">
                  {filteredMaps.map((item) => {
                    const isActive = item.id === activeId
                    const displayDate = formatMapDate(item.updatedAt || item.createdAt) || "-"
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveId(item.id)
                          setIsEditing(false)
                        }}
                        className={`group relative flex w-full items-start justify-between gap-3 border-b border-white/10 px-4 py-3 text-left text-sm transition last:border-b-0 ${
                          isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-0 h-full w-0.5 ${
                            isActive ? "bg-accent-400" : "bg-transparent"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isActive ? "bg-accent-200" : "bg-slate-600"
                              }`}
                            />
                            <span className="min-w-0 truncate font-semibold">{item.title}</span>
                          </div>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                            {item.steps.length} adim
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-slate-500">
                          <span>{displayDate}</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                              isActive
                                ? "border-accent-200/50 bg-accent-500/15 text-accent-100"
                                : "border-white/10 bg-white/5 text-slate-400"
                            }`}
                          >
                            {isActive ? "Secili" : "Harita"}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${panelClass} bg-ink-900/60`}>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Teslimat akisi
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {activeMap ? activeMap.title : "Secili urun yok"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>{activeStepsCount} adim</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span>Guncelleme: {activeUpdatedAt || "-"}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isEditing && (
                  <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                    Duzenleme
                  </span>
                )}
                {activeMap && !isEditing && (
                  <button
                    type="button"
                    onClick={handleEditStart}
                    className="rounded-lg border border-accent-200/60 bg-accent-500/10 px-3 py-2 text-xs font-semibold text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/20"
                  >
                    Duzenle
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5">
              {!activeMap ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-slate-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-ink-900/70">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
                      <path d="M9 3v15" />
                      <path d="M15 6v15" />
                    </svg>
                  </div>
                  <p>Listeden bir urun sec, yeni harita ekle.</p>
                </div>
              ) : isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="edit-title">
                        Urun basligi
                      </label>
                      <input
                        id="edit-title"
                        type="text"
                        value={editDraft.title}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, title: event.target.value }))
                        }
                        className="w-full rounded-lg border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="edit-steps">
                        Teslimat adimlari
                      </label>
                      <textarea
                        id="edit-steps"
                        rows={8}
                        value={editDraft.steps}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, steps: event.target.value }))
                        }
                        placeholder="Her satir yeni adim"
                        className="w-full resize-none rounded-lg border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={!canSave}
                      className="min-w-[140px] rounded-lg border border-accent-200/70 bg-accent-500/15 px-4 py-2 text-xs font-semibold text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCancel}
                      className="min-w-[140px] rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:text-slate-100"
                    >
                      Vazgec
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMap.steps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-400">
                      Bu harita icin adim yok.
                    </div>
                  ) : (
                    <div className="relative space-y-4">
                      <span
                        className="absolute left-4 top-4 bottom-4 w-px bg-white/10"
                        aria-hidden="true"
                      />
                      {activeMap.steps.map((step, index) => (
                        <div key={`${activeMap.id}-step-${index}`} className="relative pl-12">
                          <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-ink-900/80 text-[11px] font-semibold text-accent-100">
                            {index + 1}
                          </span>
                          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                            <p className="text-sm leading-relaxed text-slate-200">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${panelClass} bg-ink-900/60`}>
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Yeni harita
                </p>
                <p className="text-xs text-slate-400">Urun teslimat akisi ekle</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Lokal</span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="create-title">
                    Urun basligi
                  </label>
                  <input
                    id="create-title"
                    type="text"
                    value={createDraft.title}
                    onChange={(event) =>
                      setCreateDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Orn: Pro surum teslimat"
                    className="w-full rounded-lg border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="create-steps">
                    Teslimat adimlari
                  </label>
                  <textarea
                    id="create-steps"
                    rows={7}
                    value={createDraft.steps}
                    onChange={(event) =>
                      setCreateDraft((prev) => ({ ...prev, steps: event.target.value }))
                    }
                    placeholder="Her satir yeni adim"
                    className="w-full resize-none rounded-lg border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="w-full rounded-lg border border-accent-200/70 bg-accent-500/15 px-4 py-2 text-xs font-semibold text-accent-50 transition hover:border-accent-200 hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Harita ekle
              </button>
              <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/70 px-4 py-3 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Ipucu:</span> Her satir yeni bir
                teslimat adimi olarak kaydedilir.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


