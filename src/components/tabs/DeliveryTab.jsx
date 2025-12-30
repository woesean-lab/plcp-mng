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

const mergeTags = (current, incoming) => {
  const seen = new Set(current.map((tag) => tag.toLowerCase()))
  const next = [...current]
  incoming.forEach((tag) => {
    const key = tag.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      next.push(tag)
    }
  })
  return next
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
  const [searchQuery, setSearchQuery] = useState("")
  const [draft, setDraft] = useState({ title: "", body: "", tags: "" })
  const [tagDrafts, setTagDrafts] = useState({})
  const [isCreateOpen, setIsCreateOpen] = useState(false)

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

  const normalizedQuery = searchQuery.trim().toLowerCase()
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

  const canCreateNote = Boolean(draft.title.trim() || draft.body.trim())
  const hasDraft = Boolean(draft.title.trim() || draft.body.trim() || draft.tags.trim())
  const handleSearch = (event) => {
    event.preventDefault()
    setSearchQuery(searchInput)
  }
  const handleSearchClear = () => {
    setSearchInput("")
    setSearchQuery("")
  }

  const handleCreateNote = () => {
    const title = draft.title.trim()
    const body = draft.body.trim()
    if (!title && !body) return false
    const now = new Date().toISOString()
    const tags = parseTags(draft.tags)
    const newNote = {
      id: createNoteId(),
      title,
      body,
      tags,
      createdAt: now,
      updatedAt: now,
    }
    setNotes((prev) => [newNote, ...prev])
    setDraft({ title: "", body: "", tags: "" })
    return true
  }

  const handleCreateSave = () => {
    if (handleCreateNote()) {
      setIsCreateOpen(false)
    }
  }

  const handleCreateOpen = () => setIsCreateOpen(true)
  const handleCreateClose = () => setIsCreateOpen(false)

  const handleTagAdd = (noteId) => {
    const raw = tagDrafts[noteId] || ""
    const nextTags = parseTags(raw)
    if (nextTags.length === 0) return
    const now = new Date().toISOString()
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
            ...note,
            tags: mergeTags(note.tags, nextTags),
            updatedAt: now,
          }
          : note,
      ),
    )
    setTagDrafts((prev) => ({ ...prev, [noteId]: "" }))
  }

  const handleTagRemove = (noteId, tagToRemove) => {
    const now = new Date().toISOString()
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
            ...note,
            tags: note.tags.filter((tag) => tag !== tagToRemove),
            updatedAt: now,
          }
          : note,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Teslimat
            </span>
            <h1 className="font-display text-3xl font-semibold text-white">Teslimat Notlari</h1>
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

              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="min-w-[110px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Ara
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleSearchClear}
                      className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </form>

              <div className="grid gap-4">
                {filteredNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                    {notes.length === 0
                      ? "Henuz not yok. Yeni not olusturabilirsin."
                      : "Bu aramada not bulunamadi."}
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-4 shadow-inner transition hover:border-accent-300/40 hover:bg-ink-800/80"
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent-400/60 via-white/10 to-transparent" />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-white">
                            {note.title || "Basliksiz not"}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                            Guncellendi: {formatNoteDate(note.updatedAt) || "Tarih yok"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                          {note.tags.length} etiket
                        </span>
                      </div>
                      {note.body && (
                        <p
                          className="mt-3 text-sm text-slate-200/90 break-words"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
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

                      <div className="mt-4 flex flex-wrap gap-2">
                        {note.tags.length === 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                            Etiket yok
                          </span>
                        ) : (
                          note.tags.map((tag) => (
                            <span
                              key={`${note.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() => handleTagRemove(note.id, tag)}
                                className="text-slate-400 transition hover:text-rose-200"
                                aria-label={`Etiketi kaldir: ${tag}`}
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={tagDrafts[note.id] ?? ""}
                          onChange={(event) =>
                            setTagDrafts((prev) => ({ ...prev, [note.id]: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              handleTagAdd(note.id)
                            }
                          }}
                          placeholder="Etiket ekle (virgul ile)"
                          className="w-full flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => handleTagAdd(note.id)}
                          disabled={!tagDrafts[note.id]?.trim()}
                          className="min-w-[120px] rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Etiket ekle
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                    onClick={() => setDraft({ title: "", body: "", tags: "" })}
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
                      setSearchQuery(tag)
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
        draft={draft}
        setDraft={setDraft}
        canSave={canCreateNote}
      />
    </div>
  )
}
