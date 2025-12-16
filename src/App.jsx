import { useMemo, useState } from "react"
import { Toaster, toast } from "react-hot-toast"

const initialTemplates = [
  { label: "Hoş geldin", value: "Hoş geldin! Burada herkese yer var." },
  { label: "Bilgilendirme", value: "Son durum: Görev planlandığı gibi ilerliyor." },
  { label: "Hatırlatma", value: "Unutma: Akşam 18:00 toplantısına hazır ol." },
]

const panelClass =
  "rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm"

function App() {
  const [title, setTitle] = useState("Pulcip Message")
  const [message, setMessage] = useState(initialTemplates[0].value)
  const [templates, setTemplates] = useState(initialTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplates[0].label)

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.label === selectedTemplate),
    [selectedTemplate, templates],
  )

  const messageLength = message.trim().length

  const handleTemplateChange = async (nextTemplate, options = {}) => {
    setSelectedTemplate(nextTemplate)
    const tpl = templates.find((item) => item.label === nextTemplate)
    if (tpl) {
      setMessage(tpl.value)
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast.success("Kopyalandı", {
        duration: 1500,
        position: "top-right",
      })
    } catch (error) {
      console.error("Copy failed", error)
      toast.error("Kopyalanamadı", {
        duration: 1800,
        position: "top-right",
      })
    }
  }

  const handleAdd = () => {
    if (!title.trim() && !message.trim()) {
      toast.error("Başlık veya mesaj ekleyin.")
      return
    }

    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()

    const exists = templates.some((tpl) => tpl.label === safeTitle)
    if (!exists) {
      const nextTemplates = [...templates, { label: safeTitle, value: safeMessage }]
      setTemplates(nextTemplates)
      toast.success("Yeni şablon eklendi")
    } else {
      toast("Var olan şablon aktif edildi", { position: "top-right" })
    }
    setSelectedTemplate(safeTitle)
  }

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) {
      toast.error("En az bir şablon kalmalı.")
      return
    }
    const nextTemplates = templates.filter((tpl) => tpl.label !== selectedTemplate)
    const fallback = nextTemplates[0]
    setTemplates(nextTemplates)
    setSelectedTemplate(fallback.label)
    setMessage(fallback.value)
    toast.success("Şablon silindi")
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
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                  Aktif şablon
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                  {activeTemplate?.label || "Yeni şablon"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                  {activeTemplate?.value || "Mesajını düzenleyip kaydetmeye başla."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-300/80">
                  <span>{messageLength} karakter</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">
                    Hazır
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => handleTemplateChange(tpl.label, { shouldCopy: true })}
                    className={`h-full rounded-xl border px-4 py-3 text-left transition ${
                      tpl.label === selectedTemplate
                        ? "border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow"
                        : "border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100"
                    }`}
                  >
                    <p className="font-display text-lg">{tpl.label}</p>
                    <p className="mt-1 h-[54px] overflow-hidden text-sm text-slate-400">{tpl.value}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    Mesaj Alanı
                  </p>
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                    Şablon Seç &amp; Kopyala
                  </p>
                  <p className="text-sm text-slate-400">Aktif şablonu kopyala ya da sil.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {messageLength} karakter
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-slate-100">
                  <span>Şablon seç</span>
                  <span className="text-xs text-accent-200">Kart düzeni</span>
                </div>
                <div role="radiogroup" aria-label="Şablon seç" className="grid gap-3 sm:grid-cols-2">
                  {templates.map((tpl) => {
                    const isActive = tpl.label === selectedTemplate
                    return (
                      <button
                        key={tpl.label}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => handleTemplateChange(tpl.label)}
                        className={`group relative h-full rounded-xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-accent-400/80 bg-accent-500/10 text-accent-50 shadow-glow"
                            : "border-white/10 bg-white/5 text-slate-100 hover:border-accent-300/80 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-base leading-tight">{tpl.label}</p>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                              isActive
                                ? "border-accent-300/70 bg-accent-400/20 text-accent-50"
                                : "border-white/10 bg-white/5 text-slate-300 group-hover:border-accent-300/70 group-hover:text-accent-50"
                            }`}
                          >
                            {isActive ? "Aktif" : "Seç"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm text-slate-400">{tpl.value}</p>
                        <div className="pointer-events-none absolute inset-x-0 -bottom-2 h-1 rounded-b-xl bg-gradient-to-r from-accent-500/0 via-accent-400/40 to-accent-500/0 opacity-0 transition group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Önizleme</p>
                      <p className="font-display text-lg text-slate-100">
                        {activeTemplate?.label || "Yeni şablon"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                      {messageLength} karakter
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {message || activeTemplate?.value || "Mesajını düzenleyip kaydetmeye başla."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 min-w-[140px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Kopyala
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    className="min-w-[120px] rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-400 hover:bg-rose-500/20"
                  >
                    Sil
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{activeTemplate?.label}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                    Önizleme
                  </span>
                </div>
                <p className="mt-2 text-slate-300">{message || activeTemplate?.value}</p>
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Hızlı ipuçları
              </p>
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
