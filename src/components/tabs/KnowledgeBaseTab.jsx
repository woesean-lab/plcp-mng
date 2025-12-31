import { useEffect, useMemo, useRef, useState } from "react"
import { KNOWLEDGE_DOCS_STORAGE_KEY } from "../../constants/appConstants"

const createDocId = () => `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`

const parseTags = (raw) => {
  if (!raw) return []
  return String(raw)
    .split(",")
    .map((tag) => tag.replace(/#/g, "").trim())
    .filter(Boolean)
}

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

const formatDocDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

const normalizeDocs = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const title = String(entry?.title ?? "").trim()
      const category = String(entry?.category ?? "Genel").trim() || "Genel"
      const summary = String(entry?.summary ?? "").trim()
      const tags = Array.isArray(entry?.tags) ? entry.tags.map((tag) => String(tag ?? "").trim()) : []
      const updatedAt = toIsoDate(entry?.updatedAt)
      const sections = Array.isArray(entry?.sections)
        ? entry.sections
            .map((section) => {
              const sectionTitle = String(section?.title ?? "").trim() || "Detaylar"
              const bullets = Array.isArray(section?.bullets)
                ? section.bullets.map((item) => String(item ?? "").trim()).filter(Boolean)
                : []
              return { title: sectionTitle, bullets }
            })
            .filter((section) => section.bullets.length > 0)
        : []
      return {
        id: String(entry?.id ?? createDocId()),
        title,
        category,
        summary,
        tags: tags.filter(Boolean),
        updatedAt,
        sections,
        isCustom: Boolean(entry?.isCustom),
      }
    })
    .filter((entry) => entry.title || entry.summary || entry.sections.length > 0)
}

const DEFAULT_DOCS = [
  {
    id: "baslangic",
    title: "Baslangic",
    category: "Temel",
    summary: "Yeni kullanicilar icin hizli giris ve profil ayarlari.",
    tags: ["giris", "profil", "tema"],
    updatedAt: "2024-08-12",
    sections: [
      {
        title: "Giris ve profil",
        bullets: [
          "Kullanici adinla giris yap, profil bilgilerini guncelle.",
          "Tema degisimini sag ustten yapabilirsin.",
        ],
      },
      {
        title: "Kisayollar",
        bullets: [
          "Ust menuden sekmeler arasinda gecis yap.",
          "Profil menusunden cikis islemi yapilabilir.",
        ],
      },
    ],
  },
  {
    id: "mesaj-sablonlari",
    title: "Mesaj sablonlari",
    category: "Mesaj",
    summary: "Hazir mesajlari kategori ile yonet, duzenle ve kopyala.",
    tags: ["sablon", "kategori", "kopya"],
    updatedAt: "2024-08-20",
    sections: [
      {
        title: "Sablon ekleme",
        bullets: [
          "Baslik ve kategori sec, mesaji kaydet.",
          "Yeni sablonlar listeye otomatik eklenir.",
        ],
      },
      {
        title: "Duzenleme ve silme",
        bullets: [
          "Aktif sablonu guncelleyebilir veya kaldirabilirsin.",
          "Kategori silinirse sablonlar Genel'e tasinir.",
        ],
      },
    ],
  },
  {
    id: "gorev-akisi",
    title: "Gorev akisi",
    category: "Gorev",
    summary: "Gorevleri planla, durum degistir ve ekip takibini yap.",
    tags: ["gorev", "durum", "takip"],
    updatedAt: "2024-08-28",
    sections: [
      {
        title: "Gorev olusturma",
        bullets: [
          "Baslik, not ve sahip bilgisi girerek yeni gorev ekle.",
          "Tarih zorunlu degil, sureli ya da suresiz ayarlanabilir.",
        ],
      },
      {
        title: "Durum akisi",
        bullets: [
          "Yapilacak - Devam - Tamamlandi adimlarini kullan.",
          "Surukle-birak ile gorev tasiyabilirsin.",
        ],
      },
    ],
  },
  {
    id: "liste-yonetimi",
    title: "Liste yonetimi",
    category: "Liste",
    summary: "Excel benzeri listeleri olustur, guncelle ve hizli kaydet.",
    tags: ["liste", "hucre", "excel"],
    updatedAt: "2024-09-04",
    sections: [
      {
        title: "Hucre islemleri",
        bullets: [
          "Hucre secip hizli duzenle, kopyala, yapistir.",
          "Satir ve sutun ekleme/silme islemleri desteklenir.",
        ],
      },
      {
        title: "Kaydetme",
        bullets: [
          "Otomatik kayit aktif, manual kaydet ile hizlandir.",
          "Liste ismini degistirerek versiyon takibi yapabilirsin.",
        ],
      },
    ],
  },
  {
    id: "stok-yonetimi",
    title: "Stok yonetimi",
    category: "Stok",
    summary: "Urun ve stoklari takip et, anahtar kopyalama ve toplu islemler yap.",
    tags: ["stok", "urun", "toplu"],
    updatedAt: "2024-09-10",
    sections: [
      {
        title: "Urun ve stok",
        bullets: [
          "Urun ekleyip stok kodlarini gir.",
          "Stoklari kullanilmis/aktif olarak isaretle.",
        ],
      },
      {
        title: "Toplu islemler",
        bullets: [
          "Toplu kopyala + kullan yaparak hizli cikis sagla.",
          "Kullanilmis stoklari toplu silebilirsin.",
        ],
      },
    ],
  },
  {
    id: "problem-takibi",
    title: "Problem takibi",
    category: "Problem",
    summary: "Problemli musterileri kaydet, durum degistir ve arsivle.",
    tags: ["problem", "musteri", "cozum"],
    updatedAt: "2024-09-18",
    sections: [
      {
        title: "Kayit ve durum",
        bullets: [
          "Problem kaydi olustur, acik/cozuldu olarak guncelle.",
          "Cozulen sorunlar arsive tasinir.",
        ],
      },
      {
        title: "Hizli aksiyonlar",
        bullets: [
          "Kullanici adini tek tikla kopyalayabilirsin.",
          "Silme islemi icin tekrar tiklama onayi gerekir.",
        ],
      },
    ],
  },
  {
    id: "satis-takibi",
    title: "Satis takibi",
    category: "Satis",
    summary: "Satis kaydi ekle, grafiklerden genel durumu izle.",
    tags: ["satis", "grafik", "rapor"],
    updatedAt: "2024-09-25",
    sections: [
      {
        title: "Satis kaydi",
        bullets: [
          "Tarih ve tutar ile yeni kayit ekle.",
          "Gunluk, haftalik veya aylik gorunumu sec.",
        ],
      },
      {
        title: "Analiz",
        bullets: [
          "Grafikler trendleri gosterir.",
          "Son 7 gun performansi ozetlenir.",
        ],
      },
    ],
  },
]

const CATEGORY_STYLES = {
  Temel: "border-emerald-300/40 bg-emerald-500/5 text-emerald-100",
  Mesaj: "border-indigo-300/40 bg-indigo-500/5 text-indigo-100",
  Gorev: "border-sky-300/40 bg-sky-500/5 text-sky-100",
  Liste: "border-slate-300/40 bg-slate-500/5 text-slate-100",
  Stok: "border-amber-300/40 bg-amber-500/5 text-amber-100",
  Problem: "border-rose-300/40 bg-rose-500/5 text-rose-100",
  Satis: "border-emerald-300/40 bg-emerald-500/5 text-emerald-100",
}

const getCategoryClass = (category) =>
  CATEGORY_STYLES[category] || "border-white/10 bg-white/5 text-slate-200"

const getInitialDocs = () => {
  if (typeof window === "undefined") return DEFAULT_DOCS
  try {
    const stored = localStorage.getItem(KNOWLEDGE_DOCS_STORAGE_KEY)
    if (!stored) return DEFAULT_DOCS
    const parsed = JSON.parse(stored)
    const normalized = normalizeDocs(parsed)
    return normalized.length > 0 ? normalized : DEFAULT_DOCS
  } catch (error) {
    console.warn("Could not read knowledge docs", error)
    return DEFAULT_DOCS
  }
}

const buildDraftFromDoc = (doc) => {
  if (!doc) {
    return { title: "", category: "Genel", summary: "", tags: "", body: "" }
  }
  const body = Array.isArray(doc.sections)
    ? doc.sections.flatMap((section) => section.bullets || []).join("\n")
    : ""
  return {
    title: doc.title || "",
    category: doc.category || "Genel",
    summary: doc.summary || "",
    tags: Array.isArray(doc.tags) ? doc.tags.join(", ") : "",
    body,
  }
}

const buildDocFromDraft = (draft, now) => {
  const title = draft.title.trim()
  const category = draft.category.trim() || "Genel"
  const summary = draft.summary.trim()
  const tags = parseTags(draft.tags)
  const bullets = draft.body
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)
  const sections = bullets.length > 0 ? [{ title: "Detaylar", bullets }] : []
  return {
    title,
    category,
    summary,
    tags,
    updatedAt: now,
    sections,
  }
}

export default function KnowledgeBaseTab({ panelClass }) {
  const [docs, setDocs] = useState(() => getInitialDocs())
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("Hepsi")
  const [activeDocId, setActiveDocId] = useState(() => getInitialDocs()[0]?.id ?? "")
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingDocId, setEditingDocId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [draft, setDraft] = useState(() => buildDraftFromDoc(null))
  const lineRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(KNOWLEDGE_DOCS_STORAGE_KEY, JSON.stringify(docs))
    } catch (error) {
      console.warn("Could not persist knowledge docs", error)
    }
  }, [docs])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(docs.map((entry) => entry.category).filter(Boolean)))
    return ["Hepsi", ...unique]
  }, [docs])

  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime()
      const bTime = new Date(b.updatedAt || 0).getTime()
      return bTime - aTime
    })
  }, [docs])

  const normalizedQuery = query.trim().toLowerCase()
  const docsByQuery = useMemo(() => {
    return sortedDocs.filter((entry) => {
      if (!normalizedQuery) return true
      const haystack = [entry.title, entry.summary, entry.tags.join(" "), entry.category]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery, sortedDocs])

  const visibleDocs = useMemo(() => {
    if (activeCategory === "Hepsi") return docsByQuery
    return docsByQuery.filter((entry) => entry.category === activeCategory)
  }, [activeCategory, docsByQuery])

  const categoryCounts = useMemo(() => {
    return docsByQuery.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {})
  }, [docsByQuery])

  useEffect(() => {
    if (!visibleDocs.some((doc) => doc.id === activeDocId)) {
      setActiveDocId(visibleDocs[0]?.id ?? "")
    }
  }, [activeDocId, visibleDocs])

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.id === activeDocId) || visibleDocs[0],
    [activeDocId, docs, visibleDocs],
  )
  const activeSections = Array.isArray(activeDoc?.sections) ? activeDoc.sections : []
  const isEditing = Boolean(editingDocId)
  const canEditActive = Boolean(activeDoc?.isCustom)
  const canSaveDoc = Boolean(draft.title.trim())
  const lineCount = useMemo(() => Math.max(1, draft.body.split("\n").length), [draft.body])
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount],
  )

  const handleDocSelect = (docId) => {
    setActiveDocId(docId)
    setIsEditorOpen(false)
    setEditingDocId(null)
    setDeleteConfirmId(null)
  }

  const handleCreateOpen = () => {
    const defaultCategory = activeCategory !== "Hepsi" ? activeCategory : "Genel"
    setDraft({ title: "", category: defaultCategory, summary: "", tags: "", body: "" })
    setIsEditorOpen(true)
    setEditingDocId(null)
    setDeleteConfirmId(null)
  }

  const handleEditOpen = () => {
    if (!activeDoc || !activeDoc.isCustom) return
    setDraft(buildDraftFromDoc(activeDoc))
    setIsEditorOpen(true)
    setEditingDocId(activeDoc.id)
    setDeleteConfirmId(null)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setEditingDocId(null)
    setDeleteConfirmId(null)
  }

  const handleEditorScroll = () => {
    if (!lineRef.current || !textareaRef.current) return
    lineRef.current.scrollTop = textareaRef.current.scrollTop
  }

  const handleSave = () => {
    if (!canSaveDoc) return
    const now = new Date().toISOString()
    const payload = buildDocFromDraft(draft, now)
    if (isEditing) {
      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === editingDocId
            ? {
              ...doc,
              ...payload,
              id: doc.id,
              isCustom: doc.isCustom ?? true,
            }
            : doc,
        ),
      )
      setActiveDocId(editingDocId)
    } else {
      const nextDoc = {
        id: createDocId(),
        ...payload,
        isCustom: true,
      }
      setDocs((prev) => [nextDoc, ...prev])
      setActiveDocId(nextDoc.id)
    }
    setIsEditorOpen(false)
    setEditingDocId(null)
    setDeleteConfirmId(null)
  }

  const handleDeleteRequest = () => {
    if (!activeDoc || !activeDoc.isCustom) return
    if (deleteConfirmId === activeDoc.id) {
      setDocs((prev) => {
        const next = prev.filter((doc) => doc.id !== activeDoc.id)
        setActiveDocId(next[0]?.id ?? "")
        return next
      })
      setIsEditorOpen(false)
      setEditingDocId(null)
      setDeleteConfirmId(null)
      return
    }
    setDeleteConfirmId(activeDoc.id)
  }

  return (
    <div className="space-y-5">
      <header className="border border-white/10 bg-ink-900/50 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Bilgi bankasi</p>
            <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
              Bilgi bankasi
            </h1>
            <p className="max-w-2xl text-xs text-slate-400">
              Surecler, ipuclari ve module ozel notlar. Icerikler lokal calisir, veritabani yoktur.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                Dokuman <span className="text-slate-100">{docs.length}</span>
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span>
                Kategori <span className="text-slate-100">{Math.max(0, categories.length - 1)}</span>
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span>
                Sonuc <span className="text-slate-100">{visibleDocs.length}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleCreateOpen}
              className="border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-accent-300/60 hover:bg-white/10"
            >
              Yeni dokuman
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.9fr)_minmax(0,0.7fr)]">
        <aside className={`${panelClass} bg-ink-900/50 px-4 py-4 lg:sticky lg:top-6`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100">Dokumanlar</p>
              <p className="text-xs text-slate-400">Ara ve filtrele.</p>
            </div>
            <span className="text-xs text-slate-400">{visibleDocs.length} sonuc</span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex h-9 items-center gap-2 rounded border border-white/10 bg-ink-900 px-3">
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
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Dokuman ara"
                className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
                >
                  Temizle
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400" htmlFor="knowledge-category-filter">
                Kategori
              </label>
              <select
                id="knowledge-category-filter"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="h-9 flex-1 rounded border border-white/10 bg-ink-900 px-2 text-sm text-slate-100 focus:border-accent-400 focus:outline-none"
              >
                {categories.map((category) => {
                  const count =
                    category === "Hepsi" ? docsByQuery.length : categoryCounts[category] || 0
                  return (
                    <option key={`kb-category-${category}`} value={category}>
                      {category} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {visibleDocs.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                Eslesen dokuman bulunamadi.
              </div>
            ) : (
              visibleDocs.map((doc) => {
                const isActive = doc.id === activeDoc?.id
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDocSelect(doc.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-accent-300/60 bg-white/10 text-white"
                        : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {doc.title || "Basliksiz dokuman"}
                      </span>
                      {doc.isCustom && <span className="text-[10px] text-slate-500">Lokal</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{doc.category}</span>
                      <span className="h-3 w-px bg-white/10" />
                      <span>{formatDocDate(doc.updatedAt)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className={`${panelClass} bg-ink-900/50 px-4 py-4`}>
          {isEditorOpen ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Dokuman editoru</p>
                  <h2 className="text-lg font-semibold text-white">
                    {isEditing ? "Dokuman duzenle" : "Yeni dokuman"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Baslik, kategori, ozet ve icerik bilgilerini gir.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSaveDoc}
                    className="min-w-[120px] border border-accent-400/70 bg-accent-500/10 px-3 py-2 text-center text-xs font-semibold text-accent-50 transition hover:border-accent-300 hover:bg-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing ? "Guncelle" : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        title: "",
                        summary: "",
                        tags: "",
                        body: "",
                      }))
                    }
                    className="min-w-[100px] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleEditorClose}
                    className="min-w-[100px] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Vazgec
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="doc-title">
                      Baslik
                    </label>
                    <input
                      id="doc-title"
                      type="text"
                      value={draft.title}
                      onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Orn: Yeni baslik"
                      className="w-full rounded border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="doc-category">
                      Kategori
                    </label>
                    <input
                      id="doc-category"
                      type="text"
                      list="knowledge-categories"
                      value={draft.category}
                      onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
                      placeholder="Orn: Temel"
                      className="w-full rounded border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                    <datalist id="knowledge-categories">
                      {categories
                        .filter((category) => category !== "Hepsi")
                        .map((category) => (
                          <option key={`category-${category}`} value={category} />
                        ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="doc-tags">
                      Etiketler
                    </label>
                    <input
                      id="doc-tags"
                      type="text"
                      value={draft.tags}
                      onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="Orn: onemli, ipucu"
                      className="w-full rounded border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500">Etiketleri virgul ile ayir.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200" htmlFor="doc-summary">
                      Ozet
                    </label>
                    <textarea
                      id="doc-summary"
                      rows={3}
                      value={draft.summary}
                      onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
                      placeholder="Kisa aciklama"
                      className="w-full resize-none rounded border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-200">
                    <label htmlFor="doc-body">Icerik editoru</label>
                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                      <span>{lineCount} satir</span>
                      <span>{draft.body.length} karakter</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded border border-white/10 bg-ink-900/80">
                    <div className="flex max-h-[320px] min-h-[220px] overflow-hidden">
                      <div
                        ref={lineRef}
                        className="w-10 shrink-0 overflow-hidden border-r border-white/10 bg-ink-900 px-2 py-2 text-right font-mono text-[10px] leading-5 text-slate-500"
                      >
                        {lineNumbers.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                      <textarea
                        ref={textareaRef}
                        id="doc-body"
                        rows={10}
                        value={draft.body}
                        onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                        onScroll={handleEditorScroll}
                        placeholder="Her satir yeni madde olarak kaydedilir."
                        className="flex-1 resize-none overflow-auto bg-ink-900 px-3 py-2 font-mono text-[12px] leading-5 text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-400">
                    <span>Her satir = madde</span>
                    <span>Otomatik liste</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeDoc ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Dokuman</p>
                  <h2 className="text-xl font-semibold text-white">{activeDoc.title}</h2>
                  {activeDoc.summary ? (
                    <p className="text-sm text-slate-400">{activeDoc.summary}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEditActive ? (
                    <>
                      <button
                        type="button"
                        onClick={handleEditOpen}
                        className="border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-accent-300/60 hover:bg-white/10"
                      >
                        Duzenle
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteRequest}
                        className={`border px-3 py-2 text-xs font-semibold transition ${
                          deleteConfirmId === activeDoc.id
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        }`}
                      >
                        {deleteConfirmId === activeDoc.id ? "Emin misin?" : "Sil"}
                      </button>
                    </>
                  ) : (
                    <span className="border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-300">
                      Ornek dokuman
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span
                  className={`rounded border px-2 py-0.5 text-[11px] font-medium ${getCategoryClass(
                    activeDoc.category,
                  )}`}
                >
                  {activeDoc.category}
                </span>
                {activeDoc.tags.map((tag) => (
                  <span
                    key={`${activeDoc.id}-tag-${tag}`}
                    className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
                <span className="text-[11px] text-slate-500">
                  Guncelleme: {formatDocDate(activeDoc.updatedAt)}
                </span>
              </div>

              {activeSections.length > 0 ? (
                <div className="space-y-3">
                  {activeSections.map((section) => (
                    <div
                      key={`${activeDoc.id}-${section.title}`}
                      className="border border-white/10 bg-ink-900/50 px-3 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-100">{section.title}</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                        {section.bullets.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-2 h-1 w-1 rounded-full bg-slate-400" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                  Bu dokuman icin detay bulunmuyor.
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
              Dokuman secimi yapilmadi.
            </div>
          )}
        </section>

        <aside className={`${panelClass} bg-ink-900/50 px-4 py-4 hidden xl:block xl:sticky xl:top-6`}>
          {isEditorOpen ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">Editor ipuclari</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>Baslik zorunludur, bos kayit olmaz.</li>
                  <li>Her satir bir madde olarak kaydedilir.</li>
                  <li>Etiketleri virgul ile ayirabilirsin.</li>
                </ul>
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Dokumanlar tarayicida saklanir, veritabani yoktur.
              </div>
            </div>
          ) : activeDoc ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">Icindekiler</p>
                {activeSections.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {activeSections.map((section) => (
                      <li key={`${activeDoc.id}-toc-${section.title}`} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                        <span>{section.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">Detay bulunmuyor.</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Meta</p>
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>Kategori</span>
                    <span className="text-slate-100">{activeDoc.category}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Guncelleme</span>
                    <span className="text-slate-100">{formatDocDate(activeDoc.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Durum</span>
                    <span className="text-slate-100">{activeDoc.isCustom ? "Lokal" : "Ornek"}</span>
                  </div>
                </div>
                {activeDoc.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeDoc.tags.map((tag) => (
                      <span
                        key={`${activeDoc.id}-meta-${tag}`}
                        className="border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                Icerikler tarayicida saklanir, paylasim yoktur.
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
              Dokuman secimi yapilmadi.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
