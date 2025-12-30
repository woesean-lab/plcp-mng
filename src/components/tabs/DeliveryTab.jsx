import { useEffect, useMemo, useState } from "react"
import { DELIVERY_NOTES_STORAGE_KEY } from "../../constants/appConstants"
import DeliveryNoteModal from "../modals/DeliveryNoteModal"

const createNoteId = () => `note-${Date.now()}-${Math.random().toString(16).slice(2)}`

const parseTags = (raw) => {
  if (!raw) return []
  return raw
    .split(",")
    .map((tag) => tag.replace(/#/g, "").trim())
    .filter(Boolean)
}

const formatNoteDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

const normalizeStoredNotes = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((note) => {
      const title = String(note?.title ?? "")
      const body = String(note?.body ?? "")
      const tags = Array.isArray(note?.tags)
        ? note.tags.map((tag) => String(tag ?? "").trim()).filter(Boolean)
        : []
      const createdAt = typeof note?.createdAt === "string" ? note.createdAt : new Date().toISOString()
      const updatedAt = typeof note?.updatedAt === "string" ? note.updatedAt : createdAt
      return {
        id: String(note?.id ?? createNoteId()),
        title,
        body,
        tags,
        createdAt,
        updatedAt,
      }
    })
    .filter((note) => note.title.trim() || note.body.trim())
}

export default function DeliveryTab({ panelClass }) {
  const [notes, setNotes] = useState(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(DELIVERY_NOTES_STORAGE_KEY)
      if (!stored) return []
      return normalizeStoredNotes(JSON.parse(stored))
    } catch (error) {
      console.warn("Could not read delivery notes", error)
      return []
    }
  })
  const [searchInput, setSearchInput] = useState("")
  const [createDraft, setCreateDraft] = useState({ title: "", body: "", tags: "" })
  const [editDraft, setEditDraft] = useState({ title: "", body: "", tags: "" })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(DELIVERY_NOTES_STORAGE_KEY, JSON.stringify(notes))
    } catch (error) {
      console.warn("Could not persist delivery notes", error)
    }
  }, [notes])

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bTime - aTime
    })
  }, [notes])

  const normalizedQuery = searchInput.trim().toLowerCase()
  const filteredNotes = useMemo(() => {
    if (!normalizedQuery) return sortedNotes
    return sortedNotes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(normalizedQuery)
      const tagMatch = note.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      return titleMatch || tagMatch
    })
  }, [normalizedQuery, sortedNotes])

  const tagStats = useMemo(() => {
    const counts = new Map()
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      })
    })
    return Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
  }, [notes])

  const isEditing = Boolean(editingNoteId)
  const activeDraft = isEditing ? editDraft : createDraft
  const setActiveDraft = isEditing ? setEditDraft : setCreateDraft
  const canSaveNote = Boolean(activeDraft.title.trim() || activeDraft.body.trim())
  const hasDraft = Boolean(
    createDraft.title.trim() || createDraft.body.trim() || createDraft.tags.trim(),
  )
  const handleSearchClear = () => {
    setSearchInput("")
  }

  const handleCreateSave = () => {
    const title = activeDraft.title.trim()
    const body = activeDraft.body.trim()
    if (!title && !body) return
    const now = new Date().toISOString()
    const tags = parseTags(activeDraft.tags)
    if (isEditing) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === editingNoteId
            ? {
              ...note,
              title,
              body,
              tags,
              updatedAt: now,
            }
            : note,
        ),
      )
      setEditDraft({ title: "", body: "", tags: "" })
      setEditingNoteId(null)
      setDeleteConfirmId(null)
    } else {
      const newNote = {
        id: createNoteId(),
        title,
        body,
        tags,
        createdAt: now,
        updatedAt: now,
      }
      setNotes((prev) => [newNote, ...prev])
      setCreateDraft({ title: "", body: "", tags: "" })
    }
    setIsCreateOpen(false)
  }

  const handleCreateOpen = () => {
    setEditingNoteId(null)
    setDeleteConfirmId(null)
    setIsCreateOpen(true)
  }
  const handleCreateClose = () => {
    setIsCreateOpen(false)
    setEditingNoteId(null)
    setDeleteConfirmId(null)
  }
  const handleNoteOpen = (note) => {
    setEditingNoteId(note.id)
    setDeleteConfirmId(null)
    setEditDraft({
      title: note.title || "",
      body: note.body || "",
      tags: note.tags.join(", "),
    })
    setIsCreateOpen(true)
  }
  const handleDeleteRequest = () => {
    if (!editingNoteId) return
    if (deleteConfirmId === editingNoteId) {
      setNotes((prev) => prev.filter((note) => note.id !== editingNoteId))
      setEditDraft({ title: "", body: "", tags: "" })
      setEditingNoteId(null)
      setDeleteConfirmId(null)
      setIsCreateOpen(false)
      return
    }
    setDeleteConfirmId(editingNoteId)
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Not
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Notlar</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              Evernote tarzinda not tut, etiketle ve baslik/etiket ile ara. Tum notlar lokal
              calisir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Not: {notes.length}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Sonuc: {filteredNotes.length}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Notlar
                </p>
                <p className="text-sm text-slate-400">
                  Baslik veya etiketle hizli arama yap.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-11 flex-1 items-center gap-3 rounded-[6px] border border-white/10 bg-ink-900 px-4 shadow-inner">
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
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Baslik veya etiket"
                      className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
                {searchInput.trim() && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {filteredNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  {notes.length === 0
                    ? "Henuz not yok. Yeni not olusturabilirsin."
                    : "Bu aramada not bulunamadi."}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/40">
                  {filteredNotes.map((note, index) => {
                    const visibleTags = note.tags.slice(0, 4)
                    const extraTagCount = Math.max(0, note.tags.length - visibleTags.length)
                    return (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNoteOpen(note)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            handleNoteOpen(note)
                          }
                        }}
                        className={`group flex flex-col gap-1.5 px-4 py-3 text-left transition hover:bg-ink-800/70 focus:outline-none focus:ring-2 focus:ring-accent-400/40 sm:px-5 ${
                          index !== 0 ? "border-t border-white/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-white">
                            {note.title || "Basliksiz not"}
                          </p>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                            {formatNoteDate(note.updatedAt) || "Tarih yok"}
                          </span>
                        </div>
                        {note.body && (
                          <p
                            className="text-xs text-slate-300"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                            title={note.body}
                          >
                            {note.body}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {visibleTags.length === 0 ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                              Etiket yok
                            </span>
                          ) : (
                            visibleTags.map((tag) => (
                              <span
                                key={`${note.id}-${tag}`}
                                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200"
                              >
                                #{tag}
                              </span>
                            ))
                          )}
                          {extraTagCount > 0 && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                              +{extraTagCount}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <div className={`${panelClass} bg-ink-900/70`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Yeni not
                </p>
                <p className="text-sm text-slate-400">Notu modalda olusturup listeye ekle.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {notes.length} not
              </span>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
              <p className="text-sm text-slate-300">Baslik, icerik ve etiket ekleyip kaydet.</p>
              <p className="text-xs text-slate-400">
                {hasDraft
                  ? "Taslak hazir. Modal acinca kaldigin yerden devam edersin."
                  : "Taslak bos. Yeni notu baslatmak icin ac."}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCreateOpen}
                  className="min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  Not olustur
                </button>
                {hasDraft && (
                  <button
                    type="button"
                    onClick={() => setCreateDraft({ title: "", body: "", tags: "" })}
                    className="min-w-[140px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                  >
                    Taslagi temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Etiketler
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                {tagStats.length} etiket
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tagStats.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                  Etiket ekleyince burada gorunecek.
                </div>
              ) : (
                tagStats.map(([tag, count]) => (
                  <button
                    key={`delivery-tag-${tag}`}
                    type="button"
                    onClick={() => {
                      setSearchInput(tag)
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200 transition hover:border-accent-300 hover:bg-accent-500/10 hover:text-accent-50"
                  >
                    #{tag}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                      {count}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <DeliveryNoteModal
        isOpen={isCreateOpen}
        onClose={handleCreateClose}
        onSave={handleCreateSave}
        draft={activeDraft}
        setDraft={setActiveDraft}
        canSave={canSaveNote}
        isEditing={isEditing}
        onDelete={handleDeleteRequest}
        deleteConfirm={deleteConfirmId === editingNoteId}
      />
    </div>
  )
}
