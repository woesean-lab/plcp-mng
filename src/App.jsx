import { useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "react-hot-toast"

const fallbackTemplates = [
  { label: "HoÅŸ geldin", value: "HoÅŸ geldin! Burada herkese yer var.", category: "KarÅŸÄ±lama" },
  {
    label: "Bilgilendirme",
    value: "Son durum: GÃ¶rev planlandÄ±ÄŸÄ± gibi ilerliyor.",
    category: "Bilgilendirme",
  },
  { label: "HatÄ±rlatma", value: "Unutma: AkÅŸam 18:00 toplantÄ±sÄ±na hazÄ±r ol.", category: "HatÄ±rlatma" },
]

const fallbackCategories = Array.from(new Set(["Genel", ...fallbackTemplates.map((tpl) => tpl.category || "Genel")]))

const initialProblems = [
  { id: 1, username: "@ornek1", issue: "Ã–deme ekranda takÄ±ldÄ±, 2 kez kart denemiÅŸ.", status: "open" },
  { id: 2, username: "@ornek2", issue: "Teslimat gecikmesi ÅŸikayeti.", status: "open" },
]

const initialStockItems = [
  {
    id: 1,
    title: "Elden Ring: Shadow of the Erdtree",
    platform: "Steam",
    region: "Global",
    code: "ELDN-RNG-SHDE-GLBL-2025",
    stock: 6,
    price: "59.99 USD",
    note: "DLC + base bundle, 2025 aktivasyon.",
  },
  {
    id: 2,
    title: "FC 25 Ultimate Edition",
    platform: "Origin",
    region: "Global",
    code: "FC25-ULTM-GLBL-KEY-4488",
    stock: 12,
    price: "2.799 TL",
    note: "Team of the week bonuslu.",
  },
  {
    id: 3,
    title: "Red Dead Redemption 2",
    platform: "Rockstar",
    region: "EU",
    code: "RDR2-RCKS-EU-9921",
    stock: 3,
    price: "24.99 USD",
    note: "EU bÇ¬lge, indirimli seri.",
  },
  {
    id: 4,
    title: "Helldivers 2",
    platform: "Steam",
    region: "Global",
    code: "HLD2-GLBL-5561-X",
    stock: 9,
    price: "1.099 TL",
    note: "AnlZñk teslimat, ko-op.",
  },
]
const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

const categoryPalette = [
  "border-emerald-300/50 bg-emerald-500/15 text-emerald-50",
  "border-amber-300/50 bg-amber-500/15 text-amber-50",
  "border-sky-300/50 bg-sky-500/15 text-sky-50",
  "border-fuchsia-300/50 bg-fuchsia-500/15 text-fuchsia-50",
  "border-rose-300/50 bg-rose-500/15 text-rose-50",
  "border-indigo-300/50 bg-indigo-500/15 text-indigo-50",
]

function LoadingIndicator({ label = "YÃ¼kleniyor..." }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
      {label}
    </span>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState("messages")
  const [title, setTitle] = useState("Pulcip Message Copy")
  const [message, setMessage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Genel")
  const [newCategory, setNewCategory] = useState("")
  const [categories, setCategories] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [openCategories, setOpenCategories] = useState({})
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmCategoryTarget, setConfirmCategoryTarget] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [delayDone, setDelayDone] = useState(false)

  const [problems, setProblems] = useState([])
  const [problemUsername, setProblemUsername] = useState("")
  const [problemIssue, setProblemIssue] = useState("")
  const [confirmProblemTarget, setConfirmProblemTarget] = useState(null)

  const [stockItems, setStockItems] = useState(initialStockItems)
  const [stockDraft, setStockDraft] = useState({
    title: "",
    platform: "Steam",
    region: "Global",
    code: "",
    stock: "1",
    price: "",
    note: "",
  })

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
      if (categories.length === 0) return {}
      const next = { ...prev }
      categories.forEach((cat, idx) => {
        if (!(cat in next)) next[cat] = idx === 0
      })
      Object.keys(next).forEach((cat) => {
        if (!categories.includes(cat)) delete next[cat]
      })
      return next
    })
  }, [categories])

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch("/api/problems", { signal: controller.signal })
        if (!res.ok) throw new Error("api_error")
        const data = await res.json()
        setProblems(data ?? [])
      } catch (error) {
        if (error?.name === "AbortError") return
        setProblems(initialProblems)
        toast.error("Problem listesi alÄ±namadÄ± (API/DB kontrol edin)")
      }
    })()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayDone(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const startedAt = Date.now()
    let timeoutId = null

    setIsLoading(true)

    ;(async () => {
      try {
        const [catsRes, templatesRes] = await Promise.all([
          fetch("/api/categories", { signal: controller.signal }),
          fetch("/api/templates", { signal: controller.signal }),
        ])

        if (!catsRes.ok || !templatesRes.ok) throw new Error("api_error")

        const serverCategories = await catsRes.json()
        const serverTemplates = await templatesRes.json()

        const safeCategories = Array.from(new Set(["Genel", ...(serverCategories ?? [])]))
        setCategories(safeCategories)
        setTemplates(serverTemplates ?? [])

        const firstTemplate = serverTemplates?.[0]
        setSelectedTemplate(firstTemplate?.label ?? null)
        if (firstTemplate?.category) setSelectedCategory(firstTemplate.category)
      } catch (error) {
        if (error?.name === "AbortError") return
        setCategories(fallbackCategories)
        setTemplates(fallbackTemplates)
        setSelectedTemplate(fallbackTemplates[0]?.label ?? null)
        setSelectedCategory(fallbackTemplates[0]?.category ?? "Genel")
        toast.error("Sunucuya baÄŸlanÄ±lamadÄ±. (API/DB kontrol edin)")
      } finally {
        const elapsed = Date.now() - startedAt
        const delay = Math.max(0, 600 - elapsed)
        timeoutId = window.setTimeout(() => setIsLoading(false), delay)
      }
    })()

    return () => {
      controller.abort()
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const handleTemplateChange = async (nextTemplate, options = {}) => {
    setSelectedTemplate(nextTemplate)
    const tpl = templates.find((item) => item.label === nextTemplate)
    if (tpl && options.shouldCopy) {
      try {
        await navigator.clipboard.writeText(tpl.value)
        toast.success("Åablon kopyalandÄ±", { duration: 1600, position: "top-right" })
        toast(
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
              Kopyalanan mesaj
            </p>
            <p className="text-sm text-slate-50/90 whitespace-pre-wrap">{tpl.value}</p>
          </div>,
          { duration: 3200, position: "top-right" },
        )
      } catch (error) {
        console.error("Copy failed", error)
        toast.error("KopyalanamadÄ±", { duration: 1600, position: "top-right" })
      }
    }
  }

  const handleAdd = async () => {
    if (!title.trim() && !message.trim()) {
      toast.error("BaÅŸlÄ±k veya mesaj ekleyin.")
      return
    }

    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()
    const safeCategory = selectedCategory.trim() || "Genel"

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: safeTitle, value: safeMessage, category: safeCategory }),
      })

      if (res.status === 409) {
        toast("Var olan ÅŸablon aktif edildi", { position: "top-right" })
        setSelectedTemplate(safeTitle)
        setSelectedCategory(safeCategory)
        return
      }

      if (!res.ok) throw new Error("create_failed")

      const created = await res.json()
      setTemplates((prev) => [...prev, created])
      if (!categories.includes(safeCategory)) {
        setCategories((prev) => [...prev, safeCategory])
      }
      setSelectedTemplate(created.label)
      setSelectedCategory(created.category || safeCategory)
      toast.success("Yeni ÅŸablon eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Kaydedilemedi (API/DB kontrol edin).")
    }
  }

  const handleDeleteTemplate = async (targetLabel = selectedTemplate) => {
    if (templates.length <= 1) {
      toast.error("En az bir ÅŸablon kalmalÄ±.")
      return
    }
    const target = templates.find((tpl) => tpl.label === targetLabel)
    const targetId = target?.id
    if (!targetId) {
      toast.error("Silinecek ÅŸablon bulunamadÄ±.")
      return
    }

    try {
      const res = await fetch(`/api/templates/${targetId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 404) throw new Error("delete_failed")

      const nextTemplates = templates.filter((tpl) => tpl.label !== targetLabel)
      const fallback = nextTemplates[0]
      setTemplates(nextTemplates)
      const nextSelected = selectedTemplate === targetLabel ? fallback?.label ?? selectedTemplate : selectedTemplate
      if (nextSelected) {
        setSelectedTemplate(nextSelected)
        const nextTpl = nextTemplates.find((tpl) => tpl.label === nextSelected)
        if (nextTpl) {
          setSelectedCategory(nextTpl.category || "Genel")
        }
      }
      toast.success("Åablon silindi")
    } catch (error) {
      console.error(error)
      toast.error("Silinemedi (API/DB kontrol edin).")
    }
  }

  const handleDeleteWithConfirm = (targetLabel) => {
    if (confirmTarget === targetLabel) {
      handleDeleteTemplate(targetLabel)
      setConfirmTarget(null)
      return
    }
    setConfirmTarget(targetLabel)
    toast("Silmek iÃ§in tekrar tÄ±kla", { position: "top-right" })
  }

  const handleCategoryAdd = async () => {
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
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      })
      if (!res.ok) throw new Error("category_create_failed")

      const nextCategories = [...categories, next]
      setCategories(nextCategories)
      setSelectedCategory(next)
      setNewCategory("")
      toast.success("Kategori eklendi")
      return
    } catch (error) {
      console.error(error)
      toast.error("Kategori eklenemedi (API/DB kontrol edin).")
    }

    const nextCategories = [...categories, next]
    setCategories(nextCategories)
    setSelectedCategory(next)
    setNewCategory("")
    toast.success("Kategori eklendi")
  }

  const handleCategoryDelete = async (cat) => {
    if (cat === "Genel") {
      toast.error("Genel kategorisi silinemez.")
      return
    }
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(cat)}`, { method: "DELETE" })
      if (!res.ok && res.status !== 404) throw new Error("category_delete_failed")

      const nextCategories = categories.filter((item) => item !== cat)
      const safeCategories = nextCategories.length ? nextCategories : ["Genel"]
      setCategories(safeCategories)
      setTemplates((prev) => prev.map((tpl) => (tpl.category === cat ? { ...tpl, category: "Genel" } : tpl)))
      if (selectedCategory === cat) {
        setSelectedCategory(safeCategories[0])
      }
      toast.success("Kategori silindi")
      return
    } catch (error) {
      console.error(error)
      toast.error("Kategori silinemedi (API/DB kontrol edin).")
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
    toast("Silmek iÃ§in tekrar tÄ±kla", { position: "top-right" })
  }

  const showLoading = isLoading || !delayDone
  const templateCountText = showLoading ? <LoadingIndicator label="YÃ¼kleniyor" /> : templates.length
  const categoryCountText = showLoading ? <LoadingIndicator label="YÃ¼kleniyor" /> : categories.length
  const selectedCategoryText = showLoading ? <LoadingIndicator label="YÃ¼kleniyor" /> : selectedCategory.trim() || "Genel"

  const categoryColors = useMemo(() => {
    const map = {}
    categories.forEach((cat, idx) => {
      map[cat] = categoryPalette[idx % categoryPalette.length]
    })
    return map
  }, [categories])

  const getCategoryClass = (cat) => categoryColors[cat] || "border-white/10 bg-white/5 text-slate-200"

  const stockStats = useMemo(() => {
    const totalUnits = stockItems.reduce((acc, item) => acc + (item.stock || 0), 0)
    const lowStock = stockItems.filter((item) => item.stock <= 3).length
    const platforms = Array.from(new Set(stockItems.map((item) => item.platform || "Bilinmiyor")))
    return { totalUnits, lowStock, platforms }
  }, [stockItems])

  const handleStockCopy = async (code, title) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Anahtar kopyaland?", { duration: 1500, position: "top-right" })
      toast(
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Kopyalanan kod</p>
          <p className="text-sm text-slate-50/90 whitespace-pre-wrap">{title}</p>
          <code className="block rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-xs text-accent-100">{code}</code>
        </div>,
        { duration: 3000, position: "top-right" },
      )
    } catch (error) {
      console.error(error)
      toast.error("Kopyalanamad?", { duration: 1600, position: "top-right" })
    }
  }

  const handleStockUse = (id) => {
    setStockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: Math.max(0, (item.stock || 0) - 1) } : item)),
    )
  }

  const handleStockArchive = (id) => {
    setStockItems((prev) => prev.filter((item) => item.id !== id))
    toast("Katalogdan ??kar?ld? (local)", { position: "top-right" })
  }

  const handleStockAdd = () => {
    const title = stockDraft.title.trim()
    const code = stockDraft.code.trim()
    if (!title || !code) {
      toast.error("Ba?l?k ve kod girin.")
      return
    }
    const nextItem = {
      id: Date.now(),
      title,
      platform: stockDraft.platform.trim() || "Steam",
      region: stockDraft.region.trim() || "Global",
      code,
      stock: Math.max(1, Number.parseInt(stockDraft.stock, 10) || 1),
      price: stockDraft.price.trim() || "TBD",
      note: stockDraft.note.trim(),
    }
    setStockItems((prev) => [...prev, nextItem])
    setStockDraft({
      title: "",
      platform: stockDraft.platform,
      region: stockDraft.region,
      code: "",
      stock: "1",
      price: "",
      note: "",
    })
    toast.success("Stok eklendi (local)")
  }


  const handleProblemAdd = async () => {
    const user = problemUsername.trim()
    const issue = problemIssue.trim()
    if (!user || !issue) {
      toast.error("KullanÄ±cÄ± adÄ± ve sorun girin.")
      return
    }
    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, issue }),
      })
      if (!res.ok) throw new Error("problem_create_failed")
      const created = await res.json()
      setProblems((prev) => [...prev, created])
      setProblemUsername("")
      setProblemIssue("")
      toast.success("Problem eklendi")
    } catch (error) {
      console.error(error)
      toast.error("Problem eklenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemResolve = async (id) => {
    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })
      if (!res.ok) throw new Error("problem_update_failed")
      const updated = await res.json()
      setProblems((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success("Problem Ã§Ã¶zÃ¼ldÃ¼")
    } catch (error) {
      console.error(error)
      toast.error("GÃ¼ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemReopen = async (id) => {
    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      })
      if (!res.ok) throw new Error("problem_reopen_failed")
      const updated = await res.json()
      setProblems((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success("Aktif probleme taÅŸÄ±ndÄ±")
    } catch (error) {
      console.error(error)
      toast.error("GÃ¼ncellenemedi (API/DB kontrol edin).")
    }
  }

  const handleProblemCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("KullanÄ±cÄ± adÄ± kopyalandÄ±", { duration: 1400, position: "top-right" })
    } catch (error) {
      console.error(error)
      toast.error("KopyalanamadÄ±", { duration: 1600, position: "top-right" })
    }
  }

  const handleProblemDeleteWithConfirm = async (id) => {
    if (confirmProblemTarget === id) {
      try {
        const res = await fetch(`/api/problems/${id}`, { method: "DELETE" })
        if (!res.ok && res.status !== 404) throw new Error("problem_delete_failed")
        setProblems((prev) => prev.filter((p) => p.id !== id))
        setConfirmProblemTarget(null)
        toast.success("Problem silindi")
        return
      } catch (error) {
        console.error(error)
        toast.error("Silinemedi (API/DB kontrol edin).")
        setConfirmProblemTarget(null)
        return
      }
    }
    setConfirmProblemTarget(id)
    toast("Silmek iÃ§in tekrar tÄ±kla", { position: "top-right" })
  }

  const openProblems = problems.filter((p) => p.status !== "resolved")
  const resolvedProblems = problems.filter((p) => p.status === "resolved")

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-ink-900/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "messages"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Message Copy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "stock"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Stok
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("problems")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "problems"
                ? "bg-accent-500/20 text-accent-50 shadow-glow"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            Problemli MÃ¼ÅŸteriler
          </button>
        </div>

        {activeTab === "messages" && (
          <>
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
                      Kendi tonunu bul, hazÄ±r ÅŸablonlarÄ±nÄ± hÄ±zla dÃ¼zenle ve tek tÄ±kla ekibinle paylaÅŸ.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-accent-400" />
                      Åablon: {templateCountText}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      Kategori sayÄ±sÄ±: {categoryCountText}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-accent-200 md:text-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                      Kategori: {selectedCategoryText}
                    </span>
                  </div>
                </div>

                <div className="relative w-full max-w-sm">
                  <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
                  <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                          Aktif ÅŸablon
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl font-semibold text-white">
                            {activeTemplate?.label || (showLoading ? "YÃ¼kleniyor..." : "Yeni ÅŸablon")}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getCategoryClass(
                              activeTemplate?.category || selectedCategory || "Genel",
                            )}`}
                          >
                            {activeTemplate?.category || selectedCategory || "Genel"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteWithConfirm(selectedTemplate)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          confirmTarget === selectedTemplate
                            ? "border-rose-300 bg-rose-500/25 text-rose-50"
                            : "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-300 hover:bg-rose-500/25"
                        }`}
                        disabled={!selectedTemplate}
                      >
                        {confirmTarget === selectedTemplate ? "Emin misin?" : "Sil"}
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                      {activeTemplate?.value ||
                        (showLoading ? "Veriler yÃ¼kleniyor..." : "MesajÄ±nÄ± dÃ¼zenleyip kaydetmeye baÅŸla.")}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-300/80">
                      <span>{messageLength} karakter</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">
                        {showLoading ? "Bekle" : "HazÄ±r"}
                      </span>
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
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Åablon listesi</p>
                      <p className="text-sm text-slate-400">BaÅŸlÄ±klarÄ±na dokunarak dÃ¼zenle ve kopyala.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {showLoading && <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />}
                      {templateCountText} {showLoading ? "" : "seÃ§enek"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {showLoading ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 shadow-inner">
                            <div className="mb-3 h-4 w-24 animate-pulse rounded-full bg-white/10" />
                            <div className="grid gap-2">
                              {Array.from({ length: 2 }).map((__, jdx) => (
                                <div
                                  key={`${idx}-${jdx}`}
                                  className="h-20 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300"
                                >
                                  <div className="h-full animate-pulse rounded-xl bg-ink-800/80" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      categories.map((cat) => {
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
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] ${getCategoryClass(cat)}`}
                                >
                                  {cat}
                                </span>
                                <span className="text-xs text-slate-400">{list.length} ÅŸablon</span>
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
                                    Bu kategoride ÅŸablon yok.
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
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Kategori ekle</p>
                      <p className="text-sm text-slate-400">Yeni kategori ekle, ardÄ±ndan mesaj alanÄ±ndan seÃ§.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {categoryCountText} kategori
                    </span>
                  </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="category-new"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ã–rn: Duyuru"
                    className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                  <button
                    type="button"
                    onClick={handleCategoryAdd}
                    className="w-full min-w-[140px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25 sm:w-auto"
                  >
                    Ekle
                  </button>
                </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${getCategoryClass(cat)}`}
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

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Åablon ekle</p>
                      <p className="text-sm text-slate-400">BaÅŸlÄ±k, kategori ve mesajÄ± ekleyip kaydet.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">HÄ±zlÄ± ekle</span>
                  </div>

                  <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="title-mini">
                        BaÅŸlÄ±k
                      </label>
                      <input
                        id="title-mini"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ã–rn: KarÅŸÄ±lama notu"
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
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <label htmlFor="message-mini">Mesaj</label>
                        <span className="text-[11px] text-slate-400">AnlÄ±k karakter: {messageLength}</span>
                      </div>
                      <textarea
                        id="message-mini"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Mesaj iÃ§eriÄŸi..."
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">HÄ±zlÄ± ipuÃ§larÄ±</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>- BaÅŸlÄ±k boÅŸ kalÄ±rsa otomatik bir isimle kaydedilir.</li>
                    <li>- Åablona tÄ±klamak metni panoya kopyalar.</li>
                    <li>- Kategori silince ÅŸablonlar â€œGenelâ€e taÅŸÄ±nÄ±r.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "stock" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-accent-200">
                    Dijital Stok
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Oyun Anahtar Stoku</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    Platforma g?re ay?r, stok adedini g?r, anahtar? kopyala ve yeni sat?r ekle. ?u an veriler local
                    state; API/DB ba?lant?s?n? sonraya b?rak?yoruz.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                      Toplam kalem: {stockItems.length}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                      Toplam stok: {stockStats.totalUnits}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-amber-200">
                      D???k stok: {stockStats.lowStock}
                    </span>
                  </div>
                </div>
                <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Platformlar</p>
                  <div className="flex flex-wrap gap-2">
                    {stockStats.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-1 text-xs font-semibold text-slate-100">
                        <span className="h-2 w-2 rounded-full bg-accent-400" />
                        {platform}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3 text-sm text-slate-300">
                    API/DB i?in TODO: Prisma model + CRUD ucu (stok, platform, b?lge, kod). ?u an yaln?zca UI/UX.
                  </div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Stoktaki anahtarlar</p>
                      <p className="text-sm text-slate-400">Kopyala, stok d???r veya katalogdan ??kar.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {stockItems.length} kalem
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {stockItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-ink-900 p-4 shadow-inner">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-300">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.platform}</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">B?lge: {item.region}</span>
                              <span
                                className={`rounded-full border px-2 py-0.5 ${
                                  item.stock <= 3
                                    ? "border-amber-300/70 bg-amber-500/15 text-amber-100"
                                    : "border-emerald-300/70 bg-emerald-500/10 text-emerald-100"
                                }`}
                              >
                                Stok: {item.stock}
                              </span>
                            </div>
                          </div>
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-accent-100">
                            {item.price || "TBD"}
                          </span>
                        </div>

                        <p className="rounded-lg border border-white/10 bg-ink-800/70 px-3 py-2 text-xs text-slate-200 shadow-inner">
                          {item.note || "Not eklenmedi."}
                        </p>

                        <code className="block rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-xs text-accent-100">
                          {item.code}
                        </code>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockCopy(item.code, item.title)}
                            className="rounded-lg border border-accent-400/70 bg-accent-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-50 transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25">
                            Kopyala
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockUse(item.id)}
                            className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25">
                            1 adet ??kar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockArchive(item.id)}
                            className="rounded-lg border border-rose-300/70 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-50 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/25">
                            Kald?r
                          </button>
                        </div>
                      </div>
                    ))}
                    {stockItems.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-300">
                        Hen?z stok kart? yok. Sa?daki formdan bir anahtar ekleyerek ba?layabilirsin.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Yeni anahtar ekle</p>
                      <p className="text-sm text-slate-400">?u an yaln?zca local state; DB/Prisma ad?m?n? ayr?.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      Demo
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="stock-title">
                        Ba?l?k
                      </label>
                      <input
                        id="stock-title"
                        type="text"
                        value={stockDraft.title}
                        onChange={(e) => setStockDraft((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="?rn: Steam - Helldivers 2"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-platform">
                          Platform
                        </label>
                        <input
                          id="stock-platform"
                          type="text"
                          value={stockDraft.platform}
                          onChange={(e) => setStockDraft((prev) => ({ ...prev, platform: e.target.value }))}
                          placeholder="Steam / Origin / Rockstar"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-region">
                          B?lge
                        </label>
                        <input
                          id="stock-region"
                          type="text"
                          value={stockDraft.region}
                          onChange={(e) => setStockDraft((prev) => ({ ...prev, region: e.target.value }))}
                          placeholder="Global / EU / TR"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <label htmlFor="stock-code">Anahtar</label>
                        <span className="text-[11px] text-slate-400">Kopyalanabilir metin</span>
                      </div>
                      <textarea
                        id="stock-code"
                        value={stockDraft.code}
                        onChange={(e) => setStockDraft((prev) => ({ ...prev, code: e.target.value }))}
                        rows={3}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-count">
                          Adet
                        </label>
                        <input
                          id="stock-count"
                          type="number"
                          min="1"
                          value={stockDraft.stock}
                          onChange={(e) => setStockDraft((prev) => ({ ...prev, stock: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-semibold text-slate-200" htmlFor="stock-price">
                          Fiyat (not)
                        </label>
                        <input
                          id="stock-price"
                          type="text"
                          value={stockDraft.price}
                          onChange={(e) => setStockDraft((prev) => ({ ...prev, price: e.target.value }))}
                          placeholder="?rn: 59.99 USD / 2.799 TL"
                          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="stock-note">
                        Not
                      </label>
                      <textarea
                        id="stock-note"
                        value={stockDraft.note}
                        onChange={(e) => setStockDraft((prev) => ({ ...prev, note: e.target.value }))}
                        rows={3}
                        placeholder="Ek bilgi, DRM, teslimat s?resi..."
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleStockAdd}
                        className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25">
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStockDraft({
                            title: "",
                            platform: "Steam",
                            region: "Global",
                            code: "",
                            stock: "1",
                            price: "",
                            note: "",
                          })
                        }
                        className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100">
                        Temizle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "problems" && (
          <div className="space-y-6">
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-6 shadow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                    Problemli MÃ¼ÅŸteriler
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-white">Problemli MÃ¼ÅŸteriler</h1>
                  <p className="max-w-2xl text-sm text-slate-200/80">
                    MÃ¼ÅŸteri kullanÄ±cÄ± adÄ± ve sorununu kaydet; Ã§Ã¶zÃ¼lÃ¼nce â€œProblem Ã§Ã¶zÃ¼ldÃ¼â€ ile kapat veya sil.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    AÃ§Ä±k problem: {openProblems.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Ã‡Ã¶zÃ¼len: {resolvedProblems.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
                    Toplam: {problems.length}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className={`${panelClass} bg-ink-800/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">AÃ§Ä±k problemler</p>
                      <p className="text-sm text-slate-400">KullanÄ±cÄ± adÄ± ve sorun bilgisi listelenir.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {openProblems.length} kayÄ±t
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {openProblems.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        AÃ§Ä±k problem yok.
                      </div>
                    )}
                    {openProblems.map((pb) => (
                      <div
                        key={pb.id}
                        className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-ink-900 p-4 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-accent-200 break-all">
                              {pb.username}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleProblemCopy(pb.username)}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                          >
                            Kopyala
                          </button>
                        </div>
                        <p className="rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-slate-200 shadow-inner">
                          {pb.issue}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProblemResolve(pb.id)}
                            className="rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/25"
                          >
                            Ã‡Ã¶zÃ¼ldÃ¼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                              confirmProblemTarget === pb.id
                                ? "border-rose-300 bg-rose-500/25 text-rose-50"
                                : "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300 hover:bg-rose-500/20"
                            }`}
                          >
                            {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Ã‡Ã¶zÃ¼len problemler</p>
                      <p className="text-sm text-slate-400">Ã‡Ã¶zÃ¼lmÃ¼ÅŸ kayÄ±tlarÄ± sakla ya da sil.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      {resolvedProblems.length} kayÄ±t
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {resolvedProblems.length === 0 && (
                      <div className="col-span-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        Ã‡Ã¶zÃ¼len kayÄ±t yok.
                      </div>
                    )}
                    {resolvedProblems.map((pb) => (
                      <div
                        key={pb.id}
                        className="flex h-full flex-col gap-3 rounded-xl border border-emerald-200/40 bg-emerald-950/50 p-4 shadow-inner"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex max-w-full flex-wrap rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-50 break-all">
                              {pb.username}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleProblemCopy(pb.username)}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-50"
                          >
                            Kopyala
                          </button>
                        </div>
                        <p className="rounded-lg border border-emerald-200/20 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-50/90 shadow-inner">
                          {pb.issue}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProblemReopen(pb.id)}
                            className="rounded-lg border border-amber-300/70 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-500/25"
                          >
                            Ã‡Ã¶zÃ¼lmedi
                          </button>
                        <button
                          type="button"
                          onClick={() => handleProblemDeleteWithConfirm(pb.id)}
                          className={`w-fit rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                            confirmProblemTarget === pb.id
                              ? "border-rose-200 bg-rose-500/25 text-rose-50"
                              : "border-rose-200/80 bg-rose-500/10 text-rose-50 hover:border-rose-100 hover:bg-rose-500/20"
                          }`}
                        >
                          {confirmProblemTarget === pb.id ? "Emin misin?" : "Sil"}
                        </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${panelClass} bg-ink-900/60`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">Problem ekle</p>
                      <p className="text-sm text-slate-400">KullanÄ±cÄ± adÄ± ve sorunu yazÄ±p kaydet.</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                      Toplam: {problems.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="pb-username">
                        KullanÄ±cÄ± adÄ±
                      </label>
                      <input
                        id="pb-username"
                        type="text"
                        value={problemUsername}
                        onChange={(e) => setProblemUsername(e.target.value)}
                        placeholder="@kullanici"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200" htmlFor="pb-issue">
                        Sorun
                      </label>
                      <textarea
                        id="pb-issue"
                        value={problemIssue}
                        onChange={(e) => setProblemIssue(e.target.value)}
                        rows={4}
                        placeholder="Sorunun kÄ±sa Ã¶zeti..."
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleProblemAdd}
                        className="flex-1 min-w-[140px] rounded-lg border border-accent-400/70 bg-accent-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProblemUsername("")
                          setProblemIssue("")
                        }}
                        className="min-w-[110px] rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-accent-400 hover:text-accent-100"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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



