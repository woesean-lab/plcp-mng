import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#1a1133] via-[#0f2037] to-[#12242f] p-6 shadow-card">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="mt-4 h-10 w-72" />
        <SkeletonBlock className="mt-2 h-4 w-4/5 max-w-2xl" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonBlock key={`automation-hero-${idx}`} className="h-20 w-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="space-y-6">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-4 h-12 w-full" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBlock key={`automation-list-${idx}`} className="h-28 w-full" />
              ))}
            </div>
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-4 h-56 w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-4 h-11 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricTile({ label, value, hint, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="truncate text-xl font-semibold text-white">{value}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-300/80">{hint}</p> : null}
    </div>
  )
}

function SectionHeader({ eyebrow, title, description, badge }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      </div>
      {badge ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
          {badge}
        </span>
      ) : null}
    </div>
  )
}

export default function AutomationTab({ panelClass, isLoading = false }) {
  const [automations, setAutomations] = useState([
    { id: "auto-1", title: "Siparis onay otomasyonu", template: "/templates/order-confirm" },
    { id: "auto-2", title: "Stok kontrol zinciri", template: "/templates/stock-check" },
    { id: "auto-3", title: "Problem eskalasyonu", template: "/templates/problem-escalation" },
  ])
  const [automationForm, setAutomationForm] = useState({ title: "", template: "" })
  const [editingId, setEditingId] = useState("")
  const [editingDraft, setEditingDraft] = useState({ title: "", template: "" })
  const [selectedAutomationId, setSelectedAutomationId] = useState("")
  const [runLog, setRunLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [lastRunId, setLastRunId] = useState("")
  const [templateWarning, setTemplateWarning] = useState("")
  const [confirmRunId, setConfirmRunId] = useState("")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [wsUrl, setWsUrl] = useState("")
  const [wsSavedLabel, setWsSavedLabel] = useState("")

  const toastStyle = {
    background: "rgba(15, 23, 42, 0.92)",
    color: "#e2e8f0",
    border: "1px solid rgba(148, 163, 184, 0.2)",
  }

  const filteredAutomations = automations

  const selectedAutomation = useMemo(
    () => automations.find((item) => item.id === selectedAutomationId) ?? null,
    [automations, selectedAutomationId],
  )

  const confirmTarget = useMemo(
    () => automations.find((item) => item.id === confirmRunId) ?? null,
    [automations, confirmRunId],
  )

  const runningCount = useMemo(
    () => runLog.filter((entry) => entry.status === "running").length,
    [runLog],
  )

  const successCount = useMemo(
    () => runLog.filter((entry) => entry.status === "success").length,
    [runLog],
  )

  const lastSuccess = useMemo(
    () => runLog.find((entry) => entry.status === "success") ?? null,
    [runLog],
  )

  const runAutomation = (selected) => {
    if (!selected) return
    const now = new Date()
    const time = now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setIsRunning(true)
    setLastRunId(selected.id)
    toast("Otomasyon baslatildi", { style: toastStyle, position: "top-right" })
    setRunLog((prev) => [
      {
        id: `log-${Date.now()}`,
        time,
        status: "running",
        message: `${selected.title} calisiyor...`,
      },
      ...prev,
    ])

    window.setTimeout(() => {
      const doneTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setRunLog((prev) => [
        {
          id: `log-${Date.now()}-done`,
          time: doneTime,
          status: "success",
          message: `${selected.title} tamamlandi.`,
        },
        ...prev,
      ])
      toast.success("Otomasyon tamamlandi", { style: toastStyle, position: "top-right" })
      setIsRunning(false)
    }, 1200)
  }

  if (isLoading) {
    return <AutomationSkeleton panelClass={panelClass} />
  }

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 hover:border-white/20"
  const primaryButtonClass =
    "rounded-xl border border-sky-300/60 bg-sky-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-sky-50 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const successButtonClass =
    "rounded-xl border border-emerald-300/60 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const dangerButtonClass =
    "rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const subtleButtonClass =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"

  const modalContent = isConfirmOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-[#141d32] to-[#10242b] shadow-card">
        <div className="border-b border-white/10 px-6 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Calistirma Onayi</p>
          <p className="mt-2 text-lg font-semibold text-white">Bu otomasyonu simdi calistir?</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Secilen Otomasyon</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{confirmTarget?.title ?? ""}</p>
            <p className="mt-1 text-xs text-slate-400">{confirmTarget?.template ?? ""}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={successButtonClass}
              onClick={() => {
                const selected = automations.find((item) => item.id === confirmRunId)
                setIsConfirmOpen(false)
                setConfirmRunId("")
                if (!selected) return
                runAutomation(selected)
              }}
            >
              Evet, calistir
            </button>
            <button
              type="button"
              className={subtleButtonClass}
              onClick={() => {
                setIsConfirmOpen(false)
                setConfirmRunId("")
              }}
            >
              Vazgec
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#1a1133] via-[#0f2037] to-[#12242f] p-6 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(14,165,233,0.35),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(251,191,36,0.2),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-100">
                  Operasyon Deck
                </span>
                <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                  Automation Command Grid
                </h1>
                <p className="mt-2 text-sm text-slate-200/90">
                  Otomasyonlari kart bazli yonet, calistirma akisini canli timeline ile izle.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    isRunning
                      ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                      : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                  }`}
                >
                  {isRunning ? "Calisiyor" : "Sistem Hazir"}
                </span>
                <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Taslak Modu
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Toplam Otomasyon"
                value={automations.length}
                hint="Katalogdaki aktif kayit"
                accent="bg-sky-400"
              />
              <MetricTile
                label="Calisma Kaydi"
                value={runLog.length}
                hint="Tum denemeler"
                accent="bg-amber-300"
              />
              <MetricTile
                label="Basarili Sonuc"
                value={successCount}
                hint={lastSuccess ? `Son: ${lastSuccess.time}` : "Henuz kayit yok"}
                accent="bg-emerald-400"
              />
              <MetricTile
                label="Secili Is"
                value={selectedAutomation?.title ?? "Secim yok"}
                hint={selectedAutomation?.template ?? "Calistirmak icin kart sec"}
                accent="bg-indigo-300"
              />
            </div>
          </div>
        </header>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="space-y-6">
            <section className={`${panelClass} relative overflow-hidden bg-ink-900/60`}>
              <div className="pointer-events-none absolute -right-24 -top-20 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
              <div className="relative">
                <SectionHeader
                  eyebrow="Calistirma"
                  title="Otomasyon Sec ve Tetikle"
                  description="Karttan secim yapabilir veya acilir listeden dogrudan hedef belirleyebilirsin."
                  badge={`${runningCount} running`}
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={selectedAutomationId}
                    onChange={(event) => setSelectedAutomationId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Otomasyon sec</option>
                    {filteredAutomations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedAutomationId || isRunning}
                    onClick={() => {
                      if (!selectedAutomationId || isRunning) return
                      setConfirmRunId(selectedAutomationId)
                      setIsConfirmOpen(true)
                    }}
                    className={`min-w-[160px] ${successButtonClass}`}
                  >
                    {isRunning ? "Calisiyor..." : "Seciliyi Calistir"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {filteredAutomations.map((item) => {
                    const isSelected = item.id === selectedAutomationId
                    const isLastRun = item.id === lastRunId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedAutomationId(item.id)}
                        className={`group rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-sky-300/70 bg-sky-500/10 shadow-glow"
                            : "border-white/10 bg-ink-900/70 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">{item.template}</p>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                              isLastRun
                                ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            {isLastRun ? "son run" : "hazir"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            ID: {item.id}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 transition group-hover:text-slate-200">
                            sec
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 transition group-hover:bg-sky-300" />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <SectionHeader
                eyebrow="Console"
                title="Calistirma Timeline"
                description="Tum calistirma olaylari burada kronolojik olarak tutulur."
                badge={`${runLog.length} event`}
              />

              <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4">
                {runLog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/80 px-4 py-10 text-center text-sm text-slate-500">
                    Cikti kaydi yok. Bir otomasyon calistirdiginda timeline dolacak.
                  </div>
                ) : (
                  <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                    {runLog.slice(0, 20).map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-3"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            entry.status === "success" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-100">{entry.message}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            event {runLog.length - idx}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                          {entry.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className={`${panelClass} bg-ink-900/60`}>
              <SectionHeader
                eyebrow="Baglanti"
                title="Websocket Ayarlari"
                description="Bildirim akisi icin endpoint degerini kaydet."
                badge={wsSavedLabel || "kayit yok"}
              />
              <div className="mt-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300" htmlFor="ws-url">
                  Websocket URL
                </label>
                <input
                  id="ws-url"
                  type="text"
                  placeholder="wss://ornek.com/ws"
                  value={wsUrl}
                  onChange={(event) => setWsUrl(event.target.value)}
                  className={fieldClass}
                />
                <button
                  type="button"
                  className={`w-full ${primaryButtonClass}`}
                  onClick={() => {
                    const now = new Date().toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    setWsSavedLabel(`kaydedildi ${now}`)
                    toast.success("Websocket ayari kaydedildi", {
                      style: toastStyle,
                      position: "top-right",
                    })
                  }}
                >
                  Kaydet
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <SectionHeader
                eyebrow="Katalog"
                title="Yeni Otomasyon Ekle"
                description="Baslik ve template yolu ile yeni kayit olustur."
              />
              <div className="mt-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300" htmlFor="automation-title">
                  Otomasyon basligi
                </label>
                <input
                  id="automation-title"
                  type="text"
                  placeholder="Otomasyon basligi"
                  value={automationForm.title}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className={fieldClass}
                />
                <label className="text-xs font-semibold text-slate-300" htmlFor="automation-template">
                  Template yolu
                </label>
                <input
                  id="automation-template"
                  type="text"
                  placeholder="/templates/..."
                  value={automationForm.template}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, template: event.target.value }))
                  }
                  className={fieldClass}
                />
                {templateWarning ? (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {templateWarning}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`w-full ${successButtonClass}`}
                  onClick={() => {
                    const title = automationForm.title.trim()
                    const template = automationForm.template.trim()
                    if (!title || !template) return
                    if (!template.startsWith("/templates/")) {
                      setTemplateWarning("Template yolu /templates/ ile baslamali.")
                      toast.error("Template yolu /templates/ ile baslamali.", {
                        style: toastStyle,
                        position: "top-right",
                      })
                      return
                    }
                    setTemplateWarning("")
                    setAutomations((prev) => [{ id: `auto-${Date.now()}`, title, template }, ...prev])
                    setAutomationForm({ title: "", template: "" })
                    toast.success("Otomasyon eklendi", { style: toastStyle, position: "top-right" })
                  }}
                >
                  Listeye Ekle
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <SectionHeader
                eyebrow="Yonetim"
                title="Duzenle / Sil"
                description="Kayit secip basligi veya template yolunu guncelle."
                badge={`${automations.length} kayit`}
              />

              <div className="mt-4 space-y-3">
                <select
                  value={editingId}
                  onChange={(event) => {
                    const value = event.target.value
                    setEditingId(value)
                    const selected = automations.find((entry) => entry.id === value)
                    setEditingDraft({
                      title: selected?.title ?? "",
                      template: selected?.template ?? "",
                    })
                  }}
                  className={fieldClass}
                >
                  <option value="">Otomasyon sec</option>
                  {filteredAutomations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Otomasyon basligi"
                  value={editingDraft.title}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className={fieldClass}
                />
                <input
                  type="text"
                  placeholder="/templates/..."
                  value={editingDraft.template}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, template: event.target.value }))
                  }
                  className={fieldClass}
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={successButtonClass}
                    onClick={() => {
                      const title = editingDraft.title.trim()
                      const template = editingDraft.template.trim()
                      if (!editingId || !title || !template) return
                      setAutomations((prev) =>
                        prev.map((entry) =>
                          entry.id === editingId ? { ...entry, title, template } : entry,
                        ),
                      )
                      toast.success("Otomasyon guncellendi", {
                        style: toastStyle,
                        position: "top-right",
                      })
                    }}
                  >
                    Guncelle
                  </button>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => {
                      if (!editingId) return
                      setAutomations((prev) => prev.filter((entry) => entry.id !== editingId))
                      setEditingId("")
                      setEditingDraft({ title: "", template: "" })
                      if (selectedAutomationId === editingId) setSelectedAutomationId("")
                      toast("Otomasyon silindi", { style: toastStyle, position: "top-right" })
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  )
}
