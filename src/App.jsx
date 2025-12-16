import { useMemo, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'

const initialTemplates = [
  { label: 'HoÅŸ geldin', value: 'HoÅŸ geldin! Burada herkese yer var.' },
  { label: 'Bilgilendirme', value: 'Son durum: GÃ¶rev planlandÄ±ÄŸÄ± gibi ilerliyor.' },
  { label: 'HatÄ±rlatma', value: 'Unutma: AkÅŸam 18:00 toplantÄ±sÄ±na hazÄ±r ol.' },
]

const panelClass =
  'rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-card backdrop-blur-sm'

function App() {
  const [title, setTitle] = useState('Pulcip Message')
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
          toast.success('Åablon kopyalandÄ±', { duration: 1400, position: 'top-right' })
        } catch (error) {
          console.error('Copy failed', error)
          toast.error('KopyalanamadÄ±', { duration: 1600, position: 'top-right' })
        }
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('KopyalandÄ±', {
        duration: 1500,
        position: 'top-right',
      })
    } catch (error) {
      console.error('Copy failed', error)
      toast.error('KopyalanamadÄ±', {
        duration: 1800,
        position: 'top-right',
      })
    }
  }

  const handleAdd = () => {
    if (!title.trim() && !message.trim()) {
      toast.error('BaÅŸlÄ±k veya mesaj ekleyin.')
      return
    }

    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()

    const exists = templates.some((tpl) => tpl.label === safeTitle)
    if (!exists) {
      const nextTemplates = [...templates, { label: safeTitle, value: safeMessage }]
      setTemplates(nextTemplates)
      toast.success('Yeni ÅŸablon eklendi')
    } else {
      toast('Var olan ÅŸablon aktif edildi', { position: 'top-right' })
    }
    setSelectedTemplate(safeTitle)
  }

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) {
      toast.error('En az bir ÅŸablon kalmalÄ±.')
      return
    }
    const nextTemplates = templates.filter((tpl) => tpl.label !== selectedTemplate)
    const fallback = nextTemplates[0]
    setTemplates(nextTemplates)
    setSelectedTemplate(fallback.label)
    setMessage(fallback.value)
    toast.success('Åablon silindi')
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
                  Kendi tonunu bul, hazÄ±r ÅŸablonlarÄ± hÄ±zlÄ±ca dÃ¼zenle ve tek tÄ±kla ekibinle paylaÅŸ.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-accent-400" />
                  Åablon: {templates.length}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Karakter: {messageLength}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-accent-200">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
                  BaÅŸlÄ±k: {title.trim() ? title : 'Pulcip Message'}
                </span>
              </div>
            </div>

            <div className="relative w-full max-w-sm">
              <div className="absolute inset-x-6 -bottom-16 h-40 rounded-full bg-accent-400/30 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                  Aktif Åablon
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                  {activeTemplate?.label || 'Yeni ÅŸablon'}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-200/90">
                  {activeTemplate?.value || 'MesajÄ±nÄ± dÃ¼zenleyip kaydetmeye baÅŸla.'}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-300/80">
                  <span>{messageLength} karakter</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-accent-100">
                    HazÄ±r
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
                    Åablon listesi
                  </p>
                  <p className="text-sm text-slate-400">
                    BaÅŸlÄ±klarÄ±na dokunarak dÃ¼zenlemek istediÄŸini seÃ§ ve kopyala.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {templates.length} seÃ§enek
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
                        ? 'border-accent-400 bg-accent-500/10 text-accent-100 shadow-glow'
                        : 'border-white/10 bg-ink-900 text-slate-200 hover:border-accent-500/60 hover:text-accent-100'
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
                    Mesaj AlanÄ±
                  </p>
                  <p className="text-sm text-slate-400">BaÅŸlÄ±ÄŸÄ± seÃ§, metni gÃ¼ncelle, ekle ya da temizi Ã§ek.</p>
                </div>
                <span className="rounded-full bg-accent-500/20 px-3 py-1 text-xs font-semibold text-accent-100">
                  CanlÄ±
                </span>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="title">
                    BaÅŸlÄ±k
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ã–rn: KarÅŸÄ±lama notu"
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-100">
                    <label htmlFor="message">Mesaj</label>
                    <span className="text-xs text-slate-400">AnlÄ±k karakter: {messageLength}</span>
                  </div>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    placeholder="Mesaj iÃ§eriÄŸi..."
                    className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
                    <span>Listeden tÄ±kladÄ±ÄŸÄ±nda otomatik kopyalanÄ±r.</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300">
                      KÄ±sayol: Ctrl/Cmd + C
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 min-w-[180px] rounded-xl border border-accent-400/70 bg-accent-500/15 px-5 py-3 text-center text-sm font-semibold uppercase tracking-wide text-accent-50 shadow-glow transition hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-500/25"
                  >
                    Åablona Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage('')}
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
                    Åablon SeÃ§ &amp; Kopyala
                  </p>
                  <p className="text-sm text-slate-400">Aktif ÅŸablonu kopyala ya da sil.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {messageLength} karakter
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-slate-100">
                  <span>Sablon sec</span>
                  <span className="text-xs text-accent-200">Kayan liste</span>
                </div>
                <div
                  role="listbox"
                  aria-label="Sablon sec"
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-2 shadow-inner"
                >
                  <div className="flex max-h-52 flex-col gap-2 overflow-auto pr-1">
                    {templates.map((tpl) => {
                      const isActive = tpl.label === selectedTemplate
                      return (
                        <button
                          key={tpl.label}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleTemplateChange(tpl.label)}
                          className={`group flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-accent-400/80 bg-accent-500/10 text-accent-50 shadow-glow'
                              : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent-400/60 hover:bg-white/10'
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="font-display text-sm leading-tight">{tpl.label}</p>
                            <p className="text-xs text-slate-400 line-clamp-2">{tpl.value}</p>
                          </div>
                          <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                              isActive
                                ? 'border-accent-300/70 bg-accent-400/20 text-accent-50'
                                : 'border-white/10 bg-white/5 text-slate-300 group-hover:border-accent-300/70 group-hover:text-accent-50'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Sec'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
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
                    Ã–nizleme
                  </span>
                </div>
                <p className="mt-2 text-slate-300">{message || activeTemplate?.value}</p>
              </div>
            </div>

            <div className={`${panelClass} bg-ink-800/60`}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                HÄ±zlÄ± ipuÃ§larÄ±
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>â€¢ BaÅŸlÄ±ÄŸÄ± boÅŸ bÄ±rakÄ±rsan otomatik bir isimle kaydedilir.</li>
                <li>â€¢ Kopyala tuÅŸu gÃ¼ncel metni panoya gÃ¶nderir.</li>
                <li>â€¢ TÃ¼m alanlar canlÄ±; deÄŸiÅŸtirince hemen Ã¶nizlenir.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f1625',
            color: '#e5ecff',
            border: '1px solid #1d2534',
          },
          success: {
            iconTheme: {
              primary: '#3ac7ff',
              secondary: '#0f1625',
            },
          },
        }}
      />
    </div>
  )
}

export default App




