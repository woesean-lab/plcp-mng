import { useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "react-hot-toast"

const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

const API_BASE = import.meta.env.VITE_API_BASE || "/api"

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || res.statusText)
  }
  return res.json()
}

function App() {
  const [title, setTitle] = useState("Pulcip Message Copy")
  const [message, setMessage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Genel")
  const [newCategory, setNewCategory] = useState("")
  const [categories, setCategories] = useState([{ id: null, name: "Genel" }])
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [openCategories, setOpenCategories] = useState({ Genel: true })
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmCategoryTarget, setConfirmCategoryTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplateId),
    [selectedTemplateId, templates],
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

  const normalizeCategories = (data = []) => {
    const names = new Set(data.map((c) => c.name))
    if (!names.has("Genel")) {
      return [...data, { id: null, name: "Genel" }]
    }
    return data
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: catData }, { data: tplData }] = await Promise.all([
          fetchJSON("/categories"),
          fetchJSON("/templates"),
        ])
        const safeCats = normalizeCategories(catData)
        setCategories(safeCats)
        setTemplates(tplData || [])
        const firstId = tplData?.[0]?.id ?? null
        setSelectedTemplateId(firstId)
        setOpenCategories((prev) => {
          const next = { ...prev }
          safeCats.forEach((cat) => {
            if (!(cat.name in next)) next[cat.name] = true
          })
          return next
        })
      } catch (error) {
        console.error(error)
        toast.error("Veriler alınamadı")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleTemplateChange = async (templateId, options = {}) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((item) => item.id === templateId)
    if (tpl && options.shouldCopy) {
      try {
        await navigator.clipboard.writeText(tpl.value)
        toast.success("Şablon kopyalandı", { duration: 1400, position: "top-right" })
      } catch (error) {
        console.error("Copy failed", error)
        toast.error("Kopyalanamadı", { duration: 1600, position: "top-right" })
      }
    }
  }

  const handleAdd = async () => {
    if (!title.trim() && !message.trim()) {
      toast.error("Başlık veya mesaj ekleyin.")
      return
    }

    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()
    const safeCategory = selectedCategory.trim() || "Genel"

    try {
      const { data } = await fetchJSON("/templates", {
        method: "POST",
        body: JSON.stringify({ label: safeTitle, value: safeMessage, category: safeCategory }),
      })
      setTemplates((prev) => {
        const exists = prev.find((tpl) => tpl.id === data.id)
        if (exists) {
          return prev.map((tpl) => (tpl.id === data.id ? data : tpl))
        }
        return [data, ...prev]
      })
      setCategories((prev) => {
        if (prev.some((cat) => cat.name === safeCategory)) return prev
        return [...prev, { id: data.category_id || null, name: safeCategory }]
      })
      setSelectedTemplateId(data.id)
      setSelectedCategory(safeCategory)
      toast.success("Yeni şablon eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Şablon eklenemedi")
    }
  }

  const handleDeleteTemplate = async (targetId = selectedTemplateId) => {
    if (!targetId) {
      toast.error("Silinecek şablon yok.")
      return
    }
    if (templates.length <= 1) {
      toast.error("En az bir şablon kalmalı.")
      return
    }
    try {
      await fetchJSON(`/templates/${targetId}`, { method: "DELETE" })
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== targetId))
      const remaining = templates.filter((tpl) => tpl.id !== targetId)
      const nextSelected = remaining[0]?.id ?? null
      setSelectedTemplateId(nextSelected)
      toast.success("Şablon silindi")
    } catch (error) {
      console.error(error)
      toast.error("Şablon silinemedi")
    }
  }

  const handleDeleteWithConfirm = (targetId) => {
    if (confirmTarget === targetId) {
      handleDeleteTemplate(targetId)
      setConfirmTarget(null)
      return
    }
    setConfirmTarget(targetId)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  const handleCategoryAdd = async () => {
    const next = newCategory.trim()
    if (!next) {
      toast.error("Kategori girin.")
      return
    }
    if (categories.some((cat) => cat.name === next)) {
      toast("Kategori zaten mevcut", { position: "top-right" })
      setSelectedCategory(next)
      setNewCategory("")
      return
    }
    try {
      const { data } = await fetchJSON("/categories", {
        method: "POST",
        body: JSON.stringify({ name: next }),
      })
      setCategories((prev) => [...prev, data])
      setSelectedCategory(data.name)
      setNewCategory("")
      toast.success("Kategori eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kategori eklenemedi")
    }
  }

  const handleCategoryDelete = async (catId, catName) => {
    if (!catId) {
      toast.error("Bu kategori silinemez.")
      return
    }
    try {
      await fetchJSON(`/categories/${catId}`, { method: "DELETE" })
      const nextCategories = categories.filter((item) => item.id !== catId)
      setCategories(normalizeCategories(nextCategories))
      setTemplates((prev) =>
        prev.map((tpl) => (tpl.category === catName ? { ...tpl, category: "Genel" } : tpl)),
      )
      if (selectedCategory === catName) {
        setSelectedCategory("Genel")
      }
      toast.success("Kategori silindi")
    } catch (error) {
      console.error(error)
      toast.error("Kategori silinemedi")
    }
  }

  const handleCategoryDeleteWithConfirm = (cat) => {
    if (confirmCategoryTarget === cat.id) {
      setConfirmCategoryTarget(null)
      handleCategoryDelete(cat.id, cat.name)
      return
    }
    setConfirmCategoryTarget(cat.id)
    toast("Silmek için tekrar tıkla", { position: "top-right" })
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                Pulcip Message Copy
              </span>
              <div className="space-y-1.5">
                <h1 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
                  Pulcip Message Copy
                </h1>
                <p className="max-w-2xl text-sm text-slate-200/80 md:text-base">
                  Kendi tonunu bul, hazır şablonlarını hızla düzenle ve tek tıkla ekibinle paylaş.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                  <span className="h-2 w-2 rounded-full bg-accent-400" />
                  Şablon: {templates.length}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Kategori sayısı: {categories.length}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Kategori: {selectedCategory.trim() || "Genel"}
                </span>
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                      Aktif şablon
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl font-semibold text-white">
                        {activeTemplate?.label || "Yeni şablon"}
                      </h3>
                      <span className="rounded-full border border-accent-300/60 bg-accent-500/15 px-3 py-1 text-[11px] font-semibold text-accent-50">
                        {activeTemplate?.category || selectedCategory || "Genel"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteWithConfirm(selectedTemplateId)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                      confirmTarget === selectedTemplateId
                        ? "border-rose-300 bg-rose-500/25 text-rose-50"
                        : "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-300 hover:bg-rose-500/25"
                    }`}
                  >
                    {confirmTarget === selectedTemplateId ? "Emin misin?" : "Sil"}
                  </button>
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
                  <p className="text-sm text-slate-400">
                    Başlıklarına dokunarak düzenlemek istediğini seç ve kopyala.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {templates.length} seçenek
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {categories.map((cat) => {
                  const list = groupedTemplates[cat.name] || []
                  const isOpen = openCategories[cat.name] ?? true
                  return (
                    <div key={cat.id ?? cat.name} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setOpenCategories((prev) => ({ ...prev, [cat.name]: !(prev[cat.name] ?? true) }))}
                        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-sm font-semibold text-slate-100"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                            {cat.name}
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
                            <div key={tpl.id} className="relative">
                              <button
                                type="button"
                                onClick={() => handleTemplateChange(tpl.id, { shouldCopy: true })}
                                className={`h-full w-full rounded-xl border px-4 py-3 text-left transition ${
                                  tpl.id === selectedTemplateId
                                    ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                                    : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                                }`}
                              >
                                <p className="font-display text-lg">{tpl.label}</p>
                                <p className="mt-1 h-[54px] overflow-hidden text-sm text-slate-400">{tpl.value}</p>
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
                    key={cat.id ?? cat.name}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                  >
                    <span className="font-semibold">{cat.name}</span>
                    {cat.name !== "Genel" && (
                      <button
                        type="button"
                        onClick={() => handleCategoryDeleteWithConfirm(cat)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                          confirmCategoryTarget === cat.id
                            ? "border-rose-300 bg-rose-500/20 text-rose-50"
                            : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                        }`}
                      >
                        {confirmCategoryTarget === cat.id ? "Emin misin?" : "Sil"}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Şablon ekle</p>
                  <p className="text-sm text-slate-400">Başlık, kategori ve mesajı ekleyip kaydet.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  Hızlı ekle
                </span>
              </div>

              <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="title-mini">
                    Başlık
                  </label>
                  <input
                    id="title-mini"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Karşılama notu"
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200" htmlFor="category-mini">
                    Kategori
                  </label>
                  <select
                    id="category-mini"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-3 text-sm text-slate-100 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id ?? cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <label htmlFor="message-mini">Mesaj</label>
                    <span className="text-[11px] text-slate-400">Anlık karakter: {messageLength}</span>
                  </div>
                  <textarea
                    id="message-mini"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Mesaj içeriği..."
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Hızlı ipuçları</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>- Başlığın boş kalırsa otomatik bir isimle kaydedilir.</li>
                <li>- Kopyala tuşu güncel metni panoya gönderir.</li>
                <li>- Tüm alanlar canlı; değiştirince hemen önizlenir.</li>
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
