import { useEffect, useMemo, useState } from "react"

const DOC_ENTRIES = [
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

export default function KnowledgeBaseTab({ panelClass }) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("Hepsi")
  const [activeDocId, setActiveDocId] = useState(DOC_ENTRIES[0]?.id ?? "")

  const categories = useMemo(() => {
    const unique = Array.from(new Set(DOC_ENTRIES.map((entry) => entry.category)))
    return ["Hepsi", ...unique]
  }, [])

  const categoryCounts = useMemo(() => {
    return DOC_ENTRIES.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {})
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredDocs = useMemo(() => {
    return DOC_ENTRIES.filter((entry) => {
      if (activeCategory !== "Hepsi" && entry.category !== activeCategory) return false
      if (!normalizedQuery) return true
      const haystack = [
        entry.title,
        entry.summary,
        entry.tags.join(" "),
        entry.category,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [activeCategory, normalizedQuery])

  useEffect(() => {
    if (!filteredDocs.some((doc) => doc.id === activeDocId)) {
      setActiveDocId(filteredDocs[0]?.id ?? "")
    }
  }, [activeDocId, filteredDocs])

  const activeDoc =
    filteredDocs.find((doc) => doc.id === activeDocId) ||
    DOC_ENTRIES.find((doc) => doc.id === activeDocId) ||
    filteredDocs[0]

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
          <div className="grid w-full max-w-[280px] grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 md:w-auto">
            <div className="border border-white/10 bg-white/5 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Dokuman</span>
              <span className="text-sm font-semibold text-slate-100">{DOC_ENTRIES.length}</span>
            </div>
            <div className="border border-white/10 bg-white/5 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Kategori</span>
              <span className="text-sm font-semibold text-slate-100">
                {categories.length - 1}
              </span>
            </div>
            <div className="border border-white/10 bg-white/5 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Sonuc</span>
              <span className="text-sm font-semibold text-slate-100">{filteredDocs.length}</span>
            </div>
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
              <p className="text-sm text-slate-400">
                Baslik, kategori veya etiket ile filtrele.
              </p>
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
              const count = category === "Hepsi" ? DOC_ENTRIES.length : categoryCounts[category]
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
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveDocId(doc.id)}
                    className={`group w-full border px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/5 ${
                      isActive ? "border-accent-300/60 bg-white/10" : "border-white/10 bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex w-14 shrink-0 flex-col gap-1 border border-white/10 bg-ink-900 px-2 py-2 text-[10px] uppercase text-slate-500">
                        <span className="text-slate-300 tracking-[0.32em]">{orderLabel}</span>
                        <span className="tracking-[0.2em]">DOC</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                            {doc.title}
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
                          <span>Guncel: {doc.updatedAt}</span>
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
          {activeDoc ? (
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
                  <span>Guncelleme: {activeDoc.updatedAt}</span>
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  Bu dokumanlar lokal orneklerdir, veritabani baglantisi yoktur.
                </div>
              </div>

              <div className="space-y-4">
                {activeDoc.sections.map((section) => (
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
