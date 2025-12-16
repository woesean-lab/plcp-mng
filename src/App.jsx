import { useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "react-hot-toast"

const initialTemplates = [
  { label: "Hoş geldin", value: "Hoş geldin! Burada herkese yer var.", category: "Karşılama" },
  {
    label: "Bilgilendirme",
    value: "Son durum: Görev planlandığı gibi ilerliyor.",
    category: "Bilgilendirme",
  },
  { label: "Hatırlatma", value: "Unutma: Akşam 18:00 toplantısına hazır ol.", category: "Hatırlatma" },
]

const initialCategories = Array.from(new Set(["Genel", ...initialTemplates.map((tpl) => tpl.category || "Genel")]))

const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

function App() {
  const [title, setTitle] = useState("Pulcip Message")
  const [message, setMessage] = useState(initialTemplates[0].value)
  const [selectedCategory, setSelectedCategory] = useState(initialTemplates[0].category || "Genel")
  const [newCategory, setNewCategory] = useState("")
  const [categories, setCategories] = useState(initialCategories)
  const [templates, setTemplates] = useState(initialTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplates[0].label)
  const [openCategories, setOpenCategories] = useState(() =>
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {}),
  )
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmCategoryTarget, setConfirmCategoryTarget] = useState(null)

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.label === selectedTemplate),
    [selectedTemplate, templates],
  )

  const messageLength = message.trim().length

  const groupedTemplates = useMemo(() => {
    return templates.reduce((acc, tpl) => {
      const cat = tpl.category || "Genel"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(tpl)
      return acc
    }, {})
  }, [templates])

  useEffect(() => {
    setOpenCategories((prev) => {
      const next = { ...prev }
      categories.forEach((cat) => {
        if (!(cat in next)) next[cat] = true
      })
      Object.keys(next).forEach((cat) => {
        if (!categories.includes(cat)) delete next[cat]
      })
      return next
    })
  }, [categories])

  const handleTemplateChange = async (nextTemplate, options = {}) => {
    setSelectedTemplate(nextTemplate)
    const tpl = templates.find((item) => item.label === nextTemplate)
    if (tpl) {
      setMessage(tpl.value)
      setSelectedCategory(tpl.category || "Genel")
      if (options.shouldCopy) {
        try {
          await navigator.clipboard.writeText(tpl.value)
          toast.success("Şablon kopyalandı", { duration: 1400, position: "top-right" })
        } catch (error) {
          console.error("Copy failed", error)
          toast.error("Kopyalanamadı", { duration: 1600, position: "top-right" })
        }
      }
    }
  }

  const handleAdd = () => {
    if (!title.trim() && !message.trim()) {
      toast.error("Başlık veya mesaj ekleyin.")
      return
    }

    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()
    const safeCategory = selectedCategory.trim() || "Genel"

    const exists = templates.some((tpl) => tpl.label === safeTitle)
    if (!exists) {
      const nextTemplates = [...templates, { label: safeTitle, value: safeMessage, category: safeCategory }]
      setTemplates(nextTemplates)
      if (!categories.includes(safeCategory)) {
        setCategories((prev) => [...prev, safeCategory])
      }
      toast.success("Yeni şablon eklendi")
    } else {
      toast("Var olan şablon aktif edildi", { position: "top-right" })
    }
    setSelectedTemplate(safeTitle)
    setSelectedCategory(safeCategory)
  }

  const handleDeleteTemplate = (targetLabel = selectedTemplate) => {
    if (templates.length <= 1) {
      toast.error("En az bir şablon kalmalı.")
      return
    }
    const nextTemplates = templates.filter((tpl) => tpl.label !== targetLabel)
    const fallback = nextTemplates[0]
    setTemplates(nextTemplates)
    const nextSelected = selectedTemplate === targetLabel ? fallback?.label ?? selectedTemplate : selectedTemplate
    if (nextSelected) {
      setSelectedTemplate(nextSelected)
      const nextTpl = nextTemplates.find((tpl) => tpl.label === nextSelected)
      if (nextTpl) {
        setMessage(nextTpl.value)
        setSelectedCategory(nextTpl.category || "Genel")
      }
    }
    toast.success("Şablon silindi")
  }

  const handleDeleteWithConfirm = (targetLabel) => {
    if (confirmTarget === targetLabel) {
      handleDeleteTemplate(targetLabel)
      setConfirmTarget(null)
      return
    }
    setConfirmTarget(targetLabel)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  const handleCategoryAdd = () => {
    const next = newCategory.trim()
    if (!next) {
      toast.error("Kategori girin.")
      return
    }
    if (categories.includes(next)) {
      toast("Kategori zaten mevcut", { position: "top-right" })
      setSelectedCategory(next)
      setNewCategory("")
      return
    }
    const nextCategories = [...categories, next]
    setCategories(nextCategories)
    setSelectedCategory(next)
    setNewCategory("")
    toast.success("Kategori eklendi")
  }

  const handleCategoryDelete = (cat) => {
    if (cat === "Genel") {
      toast.error("Genel kategorisi silinemez.")
      return
    }
    const nextCategories = categories.filter((item) => item !== cat)
    const safeCategories = nextCategories.length ? nextCategories : ["Genel"]
    setCategories(safeCategories)
    setTemplates((prev) => prev.map((tpl) => (tpl.category === cat ? { ...tpl, category: "Genel" } : tpl)))
    if (selectedCategory === cat) {
      setSelectedCategory(safeCategories[0])
    }
    toast.success("Kategori silindi")
  }

  const handleCategoryDeleteWithConfirm = (cat) => {
    if (confirmCategoryTarget === cat) {
      setConfirmCategoryTarget(null)
      handleCategoryDelete(cat)
      return
    }
    setConfirmCategoryTarget(cat)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-8 shadow-card">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                Pulcip Message
              </span>
              <div className="space-y-2">
                <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
                  Pulcip Message
                </h1>
                <p className="max-w-2xl text-base text-slate-200/80">
                  Kendi tonunu bul, hazır şablonlarını hızla düzenle ve tek tıkla ekibinle paylaş.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-accent-400" />
                  Şablon: {templates.length}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Karakter: {messageLength}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
                  Başlık: {title.trim() ? title : "Pulcip Message"}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Kategori: {selectedCategory.trim() || "Genel"}
                </span>
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">Aktif şablon</p>
                <div className="mt-3 flex items-center gap-3">
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {activeTemplate?.label || "Yeni şablon"}
                  </h3>
                  <span className="rounded-full border border-accent-300/60 bg-accent-500/15 px-3 py-1 text-xs font-semibold text-accent-50">
                    {activeTemplate?.category || selectedCategory || "Genel"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                  {activeTemplate?.value || "Mesajını düzenleyip kaydetmeye başla."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-300/80">
                  <span>{messageLength} karakter</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">Hazır</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className={`${panelClass} bg-ink-800/60`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    Şablon listesi
                  </p>
                  <p className="text-sm text-slate-400">Başlıklarına dokunarak düzenlemek istediğini seç ve kopyala.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {templates.length} seçenek
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {categories.map((cat) => {
                  const list = groupedTemplates[cat] || []
                  const isOpen = openCategories[cat] ?? true
                  return (
                    <div key={cat} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setOpenCategories((prev) => ({ ...prev, [cat]: !(prev[cat] ?? true) }))}
                        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm font-semibold text-slate-100"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                            {cat}
                          </span>
                          <span className="text-xs text-slate-400">{list.length} şablon</span>
                        </span>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 transition ${
                            isOpen ? "rotate-180 border-accent-300/60 bg-white/10 text-accent-200" : ""
                          }`}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {list.length === 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                              Bu kategoride şablon yok.
                            </div>
                          )}
                          {list.map((tpl) => (
                            <div key={tpl.label} className="relative">
                              <button
                                type="button"
                                onClick={() => handleTemplateChange(tpl.label, { shouldCopy: true })}
                                className={`h-full w-full rounded-xl border px-4 py-3 text-left transition ${
                                  tpl.label === selectedTemplate
                                    ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                                    : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                                }`}
                              >
                                <p className="font-display text-lg">{tpl.label}</p>
                                <p className="mt-1 h-[54px] overflow-hidden text-sm text-slate-400">{tpl.value}</p>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteWithConfirm(tpl.label)
                                }}
                                className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                                  confirmTarget === tpl.label
                                    ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                    : "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-300 hover:bg-rose-500/25"
                                }`}
                              >
                                {confirmTarget === tpl.label ? "Emin misin?" : "Sil"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Mesaj Alanı</p>
                  <p className="text-sm text-slate-400">Başlığını seç, metni güncelle, ekle ya da temizle.</p>
                </div>
                <span className="rounded-full bg-accent-500/20 px-3 py-1 text-xs font-semibold text-accent-100">
                  Canlı
                </span>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="title">
                    Başlık
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Karşılama notu"
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="category-select">
                    Kategori seç
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-100">
                    <label htmlFor="message">Mesaj</label>
                    <span className="text-xs text-slate-400">Anlık karakter: {messageLength}</span>
                  </div>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    placeholder="Mesaj içeriği..."
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
                    <span>Listeden tıkladığında otomatik kopyalanır.</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300">
                      Kısayol: Ctrl/Cmd + C
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 min-w-[180px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-5 py-3 text-center text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Şablona Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="min-w-[140px] rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${panelClass} bg-ink-800/60`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kategori ekle</p>
                  <p className="text-sm text-slate-400">Yeni kategori ekle, ardından mesaj alanından seç.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {categories.length} kategori
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  id="category-new"
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Örn: Duyuru"
                  className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                />
                <button
                  type="button"
                  onClick={handleCategoryAdd}
                  className="min-w-[140px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                >
                  Ekle
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                  >
                    <span className="font-semibold">{cat}</span>
                    {cat !== "Genel" && (
                      <button
                        type="button"
                        onClick={() => handleCategoryDeleteWithConfirm(cat)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                          confirmCategoryTarget === cat
                            ? "border-rose-300 bg-rose-500/20 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        }`}
                      >
                        {confirmCategoryTarget === cat ? "Emin misin?" : "Sil"}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Hızlı ipuçları</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Başlığını boş bırakırsan otomatik bir isimle kaydedilir.</li>
                <li>• Kopyala tuşu güncel metni panoya gönderir.</li>
                <li>• Tüm alanlar canlı; değiştirince hemen önizlenir.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f1625",
            color: "#e5ecff",
            border: "1px solid #1d2534",
          },
          success: {
            iconTheme: {
              primary: "#3ac7ff",
              secondary: "#0f1625",
            },
          },
        }}
      />
    </div>
  )
}

export default App
