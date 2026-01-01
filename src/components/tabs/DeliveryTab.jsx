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

  useEffect(() => {
    if (!activeMap || isEditing) return
    setEditDraft({
      title: activeMap.title,
      steps: activeMap.steps.join("\n"),
    })
  }, [activeMap, isEditing])

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
      <header className="relative overflow-hidden border border-white/10 bg-ink-900/50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,233,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_90%_0%,rgba(56,189,248,0.15),transparent)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 border-l-2 border-cyan-300/70 pl-4">
            <p className="text-[10px] uppercase tracking-[0.42em] text-slate-400">Teslimat</p>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Teslimat Nasil Yapilir?
            </h1>
            <p className="max-w-2xl text-sm text-slate-300/80">
              Urun bazli teslimat haritalari olustur, adim adim takip et.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="border border-white/10 bg-ink-900/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">
              Harita <span className="text-slate-100">{maps.length}</span>
            </span>
            <span className="border border-white/10 bg-ink-900/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">
              Secili <span className="text-slate-100">{activeMap ? "1" : "0"}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className={`${panelClass} rounded-none border-dashed border-white/15 bg-ink-900/45 shadow-none backdrop-blur-none`}>
          <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Urunler
              </p>
              <p className="text-xs text-slate-400">Eklenen haritalar</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {maps.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                Henuz urun haritasi yok.
              </div>
            ) : (
              maps.map((item, index) => {
                const isActive = item.id === activeId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id)
                      setIsEditing(false)
                    }}
                    className={`w-full border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-cyan-300/70 bg-cyan-500/10 text-white"
                        : "border-white/10 bg-ink-900/60 text-slate-300 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.steps.length} adim
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className={`${panelClass} rounded-none border-white/15 bg-ink-900/55 shadow-none backdrop-blur-none`}>
          <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Teslimat haritasi
              </p>
              <p className="text-xs text-slate-400">
                {activeMap ? activeMap.title : "Secili urun yok"}
              </p>
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
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />
                    <ol className="space-y-3 text-sm text-slate-200">
                      {activeMap.steps.map((step, index) => (
                        <li key={`${activeMap.id}-step-${index}`} className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 bg-ink-900/70 text-[11px] font-semibold text-slate-200">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`${panelClass} rounded-none border-dashed border-white/15 bg-ink-900/45 shadow-none backdrop-blur-none`}>
          <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Yeni urun haritasi
              </p>
              <p className="text-xs text-slate-400">Sag panelden ekle</p>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  )
}
