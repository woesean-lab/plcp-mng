import { useEffect, useMemo, useState } from "react"
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
  Temel: "border-emerald-300/60 bg-emerald-500/15 text-emerald-50",
  Mesaj: "border-indigo-300/60 bg-indigo-500/15 text-indigo-50",
  Gorev: "border-sky-300/60 bg-sky-500/15 text-sky-50",
  Liste: "border-slate-300/60 bg-slate-500/15 text-slate-100",
  Stok: "border-amber-300/60 bg-amber-500/15 text-amber-50",
  Problem: "border-rose-300/60 bg-rose-500/15 text-rose-50",
  Satis: "border-emerald-300/60 bg-emerald-500/15 text-emerald-50",
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
    .map((line) => line.trim())
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

  const categoryCounts = useMemo(() => {
    return docs.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {})
  }, [docs])

  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime()
      const bTime = new Date(b.updatedAt || 0).getTime()
      return bTime - aTime
    })
  }, [docs])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredDocs = useMemo(() => {
    return sortedDocs.filter((entry) => {
      if (activeCategory !== "Hepsi" && entry.category !== activeCategory) return false
      if (!normalizedQuery) return true
      const haystack = [entry.title, entry.summary, entry.tags.join(" "), entry.category]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [activeCategory, normalizedQuery, sortedDocs])

  useEffect(() => {
    if (!filteredDocs.some((doc) => doc.id === activeDocId)) {
      setActiveDocId(filteredDocs[0]?.id ?? "")
    }
  }, [activeDocId, filteredDocs])

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.id === activeDocId) || filteredDocs[0],
    [activeDocId, docs, filteredDocs],
  )
  const activeSections = Array.isArray(activeDoc?.sections) ? activeDoc.sections : []
  const isEditing = Boolean(editingDocId)
  const canEditActive = Boolean(activeDoc?.isCustom)
  const canSaveDoc = Boolean(draft.title.trim())
  const lineCount = useMemo(() => Math.max(1, draft.body.split("\n").length), [draft.body])

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
    <div className="space-y-6">
      <header className="border border-white/10 bg-ink-900/60 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 sm:space-y-3">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Docs</p>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Bilgi bankasi
            </h1>
            <p className="max-w-2xl text-sm text-slate-300/80">
              Surecler, ipuclari ve module ozel notlar. Icerikler lokal calisir, veritabani yoktur.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto">
            <div className="grid w-full max-w-[320px] grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <div className="border border-white/10 bg-white/5 px-3 py-2">
                <span className="block text-[10px] text-slate-500">Dokuman</span>
                <span className="text-sm font-semibold text-slate-100">{docs.length}</span>
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2">
                <span className="block text-[10px] text-slate-500">Kategori</span>
                <span className="text-sm font-semibold text-slate-100">
                  {Math.max(0, categories.length - 1)}
                </span>
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2">
                <span className="block text-[10px] text-slate-500">Sonuc</span>
                <span className="text-sm font-semibold text-slate-100">{filteredDocs.length}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateOpen}
              className="border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100 transition hover:border-accent-300/60 hover:bg-white/10"
            >
              Yeni dokuman
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Dokumanlar
              </p>
              <p className="text-sm text-slate-400">Baslik, kategori veya etiket ile filtrele.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {filteredDocs.length} kayit
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Arama yap"
                  className="w-full min-w-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-w-[110px] border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
              >
                Temizle
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category
              const count = category === "Hepsi" ? docs.length : categoryCounts[category] || 0
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`inline-flex items-center gap-2 border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? "border-accent-300/60 bg-accent-500/15 text-accent-50"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                  }`}
                >
                  {category}
                  <span className="border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 space-y-3">
            {filteredDocs.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                Eslesen dokuman bulunamadi.
              </div>
            ) : (
              filteredDocs.map((doc, index) => {
                const isActive = doc.id === activeDoc?.id
                const orderLabel = String(index + 1).padStart(2, "0")
                const displayDate = formatDocDate(doc.updatedAt) || "Tarih yok"
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDocSelect(doc.id)}
                    className={`group w-full border px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/5 ${
                      isActive ? "border-accent-300/60 bg-white/10" : "border-white/10 bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex w-16 shrink-0 flex-col gap-1 border border-white/10 bg-ink-900 px-2 py-2 text-[10px] uppercase text-slate-500">
                        <span className="text-slate-300 tracking-[0.32em]">{orderLabel}</span>
                        <span className="tracking-[0.2em]">{displayDate}</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                            {doc.title || "Basliksiz dokuman"}
                          </p>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getCategoryClass(
                              doc.category,
                            )}`}
                          >
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{doc.summary}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {doc.tags.map((tag) => (
                            <span key={`${doc.id}-tag-${tag}`}>#{tag}</span>
                          ))}
                          {doc.isCustom && <span>Lokal</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className={`space-y-6 ${panelClass} bg-ink-900/60 lg:sticky lg:top-6`}>
          {isEditorOpen ? (
            <div>
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    {isEditing ? "Dokuman duzenle" : "Yeni dokuman"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Baslik, kategori, ozet ve icerik bilgilerini gir.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSaveDoc}
                    className="min-w-[140px] border border-accent-400/70 bg-accent-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 transition hover:border-accent-300 hover:bg-accent-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="min-w-[120px] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleEditorClose}
                    className="min-w-[120px] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-300/60 hover:text-slate-100"
                  >
                    Vazgec
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
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
                      className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
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
                      className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                    />
                    <datalist id="knowledge-categories">
                      {categories
                        .filter((category) => category !== "Hepsi")
                        .map((category) => (
                          <option key={`category-${category}`} value={category} />
                        ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="doc-summary">
                    Ozet
                  </label>
                  <textarea
                    id="doc-summary"
                    rows={2}
                    value={draft.summary}
                    onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
                    placeholder="Kisa aciklama"
                    className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                  />
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
                    className="w-full border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500">Etiketleri virgul ile ayir.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <label htmlFor="doc-body">Icerik</label>
                    <span className="text-[11px] font-medium text-slate-500">
                      {lineCount} satir / {draft.body.length} karakter
                    </span>
                  </div>
                  <textarea
                    id="doc-body"
                    rows={8}
                    value={draft.body}
                    onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                    placeholder="Her satir yeni madde olarak kaydedilir."
                    className="w-full resize-none border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : activeDoc ? (
            <>
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">{activeDoc.title}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getCategoryClass(
                      activeDoc.category,
                    )}`}
                  >
                    {activeDoc.category}
                  </span>
                </div>
                <p className="text-sm text-slate-300/80">{activeDoc.summary}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {activeDoc.tags.map((tag) => (
                    <span key={`${activeDoc.id}-tag-main-${tag}`}>#{tag}</span>
                  ))}
                  <span>Guncelleme: {formatDocDate(activeDoc.updatedAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEditActive && (
                    <>
                      <button
                        type="button"
                        onClick={handleEditOpen}
                        className="border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-accent-300/60 hover:bg-white/10"
                      >
                        Duzenle
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteRequest}
                        className={`border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                          deleteConfirmId === activeDoc.id
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        }`}
                      >
                        {deleteConfirmId === activeDoc.id ? "Emin misin?" : "Sil"}
                      </button>
                    </>
                  )}
                  {!canEditActive && (
                    <span className="border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                      Ornek dokuman
                    </span>
                  )}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  Bu dokumanlar lokal orneklerdir, veritabani baglantisi yoktur.
                </div>
              </div>

              {activeSections.length > 0 ? (
                <div className="space-y-4">
                  {activeSections.map((section) => (
                    <div key={`${activeDoc.id}-${section.title}`} className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300/80">
                        {section.title}
                      </p>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {section.bullets.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent-300" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  Bu dokuman icin detay bulunmuyor.
                </div>
              )}
            </>
          ) : (
            <div className="border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              Dokuman secimi yapilmadi.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
