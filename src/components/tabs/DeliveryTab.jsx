import { useEffect, useMemo, useRef, useState } from "react"
import { DELIVERY_NOTES_STORAGE_KEY } from "../../constants/appConstants"

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

export default function DeliveryTab() {
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
  const [draft, setDraft] = useState({ title: "", body: "", tags: "" })
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const lineRef = useRef(null)
  const textareaRef = useRef(null)

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

  const isEditing = Boolean(activeNoteId)
  const canSaveNote = Boolean(draft.title.trim() || draft.body.trim())
  const lineCount = useMemo(() => Math.max(1, draft.body.split("\n").length), [draft.body])
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount],
  )
  const handleSearchClear = () => {
    setSearchInput("")
  }

  const handleEditorScroll = () => {
    if (!lineRef.current || !textareaRef.current) return
    lineRef.current.scrollTop = textareaRef.current.scrollTop
  }

  const handleSave = () => {
    const title = draft.title.trim()
    const body = draft.body.trim()
    if (!title && !body) return
    const now = new Date().toISOString()
    const tags = parseTags(draft.tags)
    if (isEditing) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeNoteId
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
      setDraft({ title, body, tags: tags.join(", ") })
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
      setActiveNoteId(newNote.id)
      setDraft({ title, body, tags: tags.join(", ") })
    }
    setDeleteConfirmId(null)
    setIsEditorOpen(true)
  }

  const handleCreateOpen = () => {
    setActiveNoteId(null)
    setDeleteConfirmId(null)
    setDraft({ title: "", body: "", tags: "" })
    setIsEditorOpen(true)
  }
  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setActiveNoteId(null)
    setDeleteConfirmId(null)
  }
  const handleNoteOpen = (note) => {
    setActiveNoteId(note.id)
    setDeleteConfirmId(null)
    setDraft({
      title: note.title || "",
      body: note.body || "",
      tags: note.tags.join(", "),
    })
    setIsEditorOpen(true)
  }
  const handleDeleteRequest = () => {
    if (!activeNoteId) return
    if (deleteConfirmId === activeNoteId) {
      setNotes((prev) => prev.filter((note) => note.id !== activeNoteId))
      setDraft({ title: "", body: "", tags: "" })
      setActiveNoteId(null)
      setDeleteConfirmId(null)
      setIsEditorOpen(false)
      return
    }
    setDeleteConfirmId(activeNoteId)
  }

  return (
    <div className="space-y-6">
      <header className="border border-white/10 bg-ink-900/60 px-6 py-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Not</p>
            <h1 className="font-display text-3xl font-semibold text-white">Notlar</h1>
            <p className="max-w-2xl text-sm text-slate-300/80">
              Evernote tarzinda not tut, etiketle ve baslik/etiket ile ara. Tum notlar lokal
              calisir.
            </p>
          </div>
          <div className="grid w-full max-w-[260px] grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 md:w-auto">
            <div className="border border-white/10 bg-white/5 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Not</span>
              <span className="text-sm font-semibold text-slate-100">{notes.length}</span>
            </div>
            <div className="border border-white/10 bg-white/5 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Sonuc</span>
              <span className="text-sm font-semibold text-slate-100">
                {filteredNotes.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <div className="border border-white/10 bg-ink-900/60 px-6 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Notlar
                </p>
                <p className="text-sm text-slate-400">
                  Baslik veya etiketle hizli arama yap.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-11 flex-1 items-center gap-3 border border-white/10 bg-ink-900/80 px-4">
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
                    className="min-w-[110px] border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {filteredNotes.length === 0 ? (
                <div className="border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                  {notes.length === 0
                    ? "Henuz not yok. Yeni not olusturabilirsin."
                    : "Bu aramada not bulunamadi."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map((note, index) => {
                    const isActive = isEditorOpen && note.id === activeNoteId
                    const titleText = note.title || "Basliksiz not"
                    const displayDate = formatNoteDate(note.updatedAt) || "Tarih yok"
                    const visibleTags = note.tags.slice(0, 3)
                    const remainingTagCount = Math.max(0, note.tags.length - visibleTags.length)
                    const orderLabel = String(index + 1).padStart(2, "0")
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => handleNoteOpen(note)}
                        className={`group w-full border border-white/10 bg-transparent px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40 ${
                          isActive ? "border-accent-300/60 bg-white/10" : ""
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex w-24 shrink-0 flex-col gap-1 border border-white/10 bg-ink-900 px-2 py-2 text-[10px] uppercase text-slate-500">
                            <span className="text-slate-300 tracking-[0.32em]">
                              {orderLabel}
                            </span>
                            <span className="tracking-[0.2em]">{displayDate}</span>
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                                {titleText}
                              </p>
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                {note.tags.length} etiket
                              </span>
                            </div>
                            {note.body && (
                              <p
                                className="text-xs text-slate-400"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
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
                            {note.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                {visibleTags.map((tag) => (
                                  <span key={`${note.id}-tag-${tag}`}>#{tag}</span>
                                ))}
                                {remainingTagCount > 0 && <span>+{remainingTagCount}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <div className="border border-white/10 bg-ink-900/70 px-6 py-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                  Not editoru
                </p>
                <p className="text-sm text-slate-400">
                  {isEditorOpen
                    ? isEditing
                      ? "Secili notu guncelle"
                      : "Yeni not olustur"
                    : "Sag panelde notu ac"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateOpen}
                className="border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100 transition hover:border-accent-300/60 hover:bg-white/10"
              >
                Yeni not
              </button>
            </div>

            {isEditorOpen ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="note-title">
                      Not basligi
                    </label>
                    <input
                      id="note-title"
                      type="text"
                      value={draft.title}
                      onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Orn: Teslimat adimlari"
                      className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="note-tags">
                      Etiketler
                    </label>
                    <input
                      id="note-tags"
                      type="text"
                      value={draft.tags}
                      onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="Orn: kargo, kritik"
                      className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500">Etiketleri virgul ile ayir.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <label htmlFor="note-body">Not editoru</label>
                    <span className="text-[11px] font-medium text-slate-500">
                      {lineCount} satir / {draft.body.length} karakter
                    </span>
                  </div>
                  <div className="overflow-hidden border border-white/10 bg-ink-900/80">
                    <div className="flex max-h-[360px] min-h-[220px] overflow-hidden">
                      <div
                        ref={lineRef}
                        className="w-12 shrink-0 overflow-hidden border-r border-white/10 bg-ink-900 px-2 py-3 text-right font-mono text-[11px] leading-6 text-slate-500"
                      >
                        {lineNumbers.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                      <textarea
                        ref={textareaRef}
                        id="note-body"
                        rows={10}
                        value={draft.body}
                        onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                        onScroll={handleEditorScroll}
                        placeholder="Notunu buraya yaz..."
                        className="flex-1 resize-none overflow-auto bg-ink-900 px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleDeleteRequest}
                      className={`min-w-[120px] border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                        deleteConfirmId === activeNoteId
                          ? "border-rose-300 bg-rose-500/25 text-rose-50"
                          : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {deleteConfirmId === activeNoteId ? "Emin misin?" : "Sil"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSaveNote}
                    className="min-w-[140px] border border-accent-400/70 bg-accent-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 transition hover:border-accent-300 hover:bg-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing ? "Guncelle" : "Not olustur"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ title: "", body: "", tags: "" })}
                    className="min-w-[120px] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleEditorClose}
                    className="min-w-[120px] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Listeden bir not sec veya yeni not olustur.
              </div>
            )}
          </div>

          <div className="border border-white/10 bg-ink-900/60 px-6 py-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Etiketler
              </p>
              <span className="border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                {tagStats.length} etiket
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tagStats.length === 0 ? (
                <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
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
                    className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200 transition hover:border-accent-300/60 hover:bg-white/10"
                  >
                    #{tag}
                    <span className="border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                      {count}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
