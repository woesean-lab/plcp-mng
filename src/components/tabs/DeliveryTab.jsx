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
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Teslimat
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Teslimat Nasil Yapilir?
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Urun bazli teslimat haritalari olustur, adim adim takip et.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Harita: {maps.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Adim: {activeStepsCount}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Guncelleme: {activeUpdatedAt || "-"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className={`${panelClass} bg-ink-900/55`}>
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Urunler
                </p>
                <p className="text-xs text-slate-400">Eklenen haritalar</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                {maps.length} kayit
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 flex-1 items-center gap-3 rounded border border-white/10 bg-ink-900 px-3">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ara</span>
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(event) => setListSearch(event.target.value)}
                    placeholder="Baslik veya adim ara"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 rounded border border-white/10 bg-ink-900/60 p-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {[
                    { value: "recent", label: "Son" },
                    { value: "title", label: "A-Z" },
                    { value: "oldest", label: "Eski" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setListSort(option.value)}
                      className={`rounded px-2 py-1 text-[10px] transition ${
                        listSort === option.value
                          ? "bg-white/10 text-slate-100"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {filteredMaps.length} / {maps.length} kayit
                </span>
                {listSearch && <span>Arama aktif</span>}
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/50">
                {maps.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400">Henuz urun haritasi yok.</div>
                ) : filteredMaps.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400">Eslesme bulunamadi.</div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1 sm:max-h-[520px]">
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
                          className={`group flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-left text-sm transition last:border-b-0 ${
                            isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? "bg-slate-200" : "bg-slate-600"
                                }`}
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                            </div>
                            {isActive && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                Guncelleme: {displayDate}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            {item.steps.length} adim
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${panelClass} bg-ink-900/55`}>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Teslimat haritasi
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
              {activeMap && !isEditing && (
                <button
                  type="button"
                  onClick={handleEditStart}
                  className="border border-cyan-300/60 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-500/20"
                >
                  Duzenle
                </button>
              )}
            </div>

            <div className="mt-4">
              {!activeMap ? (
                <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                  Soldan bir urun sec veya sagdan yeni harita ekle.
                </div>
              ) : isEditing ? (
                <div className="space-y-3">
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
                      className="w-full border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"
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
                      className="w-full resize-none border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleEditSave}
                      disabled={!canSave}
                      className="min-w-[120px] border border-cyan-300/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCancel}
                      className="min-w-[120px] border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:text-slate-100"
                    >
                      Vazgec
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMap.steps.length === 0 ? (
                    <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                      Bu harita icin adim yok.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeMap.steps.map((step, index) => (
                        <div
                          key={`${activeMap.id}-step-${index}`}
                          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/15 bg-white/10 text-[11px] font-semibold text-slate-100">
                            {index + 1}
                          </span>
                          <span className="text-sm leading-relaxed text-slate-200">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${panelClass} bg-ink-900/55`}>
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Yeni urun haritasi
                </p>
                <p className="text-xs text-slate-400">Sag panelden ekle</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Lokal</span>
            </div>
            <div className="mt-4 space-y-3">
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
                  className="w-full border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200" htmlFor="create-steps">
                  Teslimat adimlari
                </label>
                <textarea
                  id="create-steps"
                  rows={8}
                  value={createDraft.steps}
                  onChange={(event) =>
                    setCreateDraft((prev) => ({ ...prev, steps: event.target.value }))
                  }
                  placeholder="Her satir yeni adim"
                  className="w-full resize-none border border-white/15 bg-ink-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="w-full border border-cyan-300/70 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Harita ekle
              </button>
              <div className="border border-dashed border-white/10 bg-ink-900/60 px-3 py-2 text-[11px] text-slate-400">
                Ipucu: Her satir yeni bir teslimat adimi olarak kaydedilir.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
