import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-6 shadow-card">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-64" />
        <SkeletonBlock className="mt-2 h-4 w-3/4 max-w-2xl" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonBlock key={`automation-hero-skeleton-${idx}`} className="h-20 w-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-4 h-12 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-40" />
          <SkeletonBlock className="mt-4 h-28 w-full" />
          <SkeletonBlock className="mt-3 h-44 w-full" />
        </div>
        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="mt-4 h-12 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
        </div>
      </div>
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
  const lastSuccessLog = useMemo(
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

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 hover:border-white/20"
  const primaryButtonClass =
    "rounded-xl border border-emerald-300/70 bg-emerald-500/20 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const secondaryButtonClass =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"

  const statusBadge = isRunning
    ? {
        text: "Calisiyor",
        tone: "border-amber-300/60 bg-amber-500/15 text-amber-100",
      }
    : lastRunId
      ? {
          text: "Son calisma basarili",
          tone: "border-emerald-300/60 bg-emerald-500/15 text-emerald-100",
        }
      : {
          text: "Beklemede",
          tone: "border-white/10 bg-white/5 text-slate-300",
        }

  const modalContent = isConfirmOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-card">
        <div className="border-b border-white/10 bg-white/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Onay</p>
          <p className="mt-2 text-base font-semibold text-white">Secilen otomasyon calistirilsin mi?</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secim</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {automations.find((item) => item.id === confirmRunId)?.title ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const selected = automations.find((item) => item.id === confirmRunId)
                setIsConfirmOpen(false)
                setConfirmRunId("")
                if (!selected) return
                runAutomation(selected)
              }}
              className={`flex-1 ${primaryButtonClass}`}
            >
              Evet, calistir
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmOpen(false)
                setConfirmRunId("")
              }}
              className={`flex-1 ${secondaryButtonClass}`}
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
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-6 shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(59,130,246,0.25),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(16,185,129,0.22),transparent_36%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
                  Otomasyon Merkezi
                </span>
                <h1 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
                  Is Akisi Kontrol Paneli
                </h1>
                <p className="mt-2 text-sm text-slate-200/80">
                  Mevcut otomasyonlari sec, calistir ve temel ayarlari tek noktadan yonet.
                </p>
              </div>
              <div
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadge.tone}`}
              >
                {statusBadge.text}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Toplam Otomasyon</p>
                <p className="mt-2 text-2xl font-semibold text-white">{automations.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Aktif Secim</p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-100">
                  {selectedAutomation?.title ?? "Otomasyon secilmedi"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Son Basarili Calisma</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {lastSuccessLog?.time ?? "Kayit bulunmuyor"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Otomasyon Calistir
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Listeden secip tek tusla calistir ve ciktilari izle.
                </p>
              </div>
              <span className="rounded-full border border-emerald-300/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Canli
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedAutomationId}
                onChange={(event) => setSelectedAutomationId(event.target.value)}
                className={inputClass}
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
                className={`min-w-[140px] ${primaryButtonClass}`}
              >
                {isRunning ? "Calisiyor..." : "Calistir"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Template</p>
                <p className="mt-1 truncate text-sm text-slate-100">
                  {selectedAutomation?.template ?? "/templates/..."}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Durum</p>
                <p className="mt-1 text-sm text-slate-100">
                  {isRunning
                    ? "Calisma devam ediyor"
                    : lastRunId
                      ? "Son calisma tamamlandi"
                      : "Calisma bekleniyor"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Cikti Akisi</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {runLog.length} kayit
                </span>
              </div>
              <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
                {runLog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/50 px-4 py-8 text-center text-xs text-slate-500">
                    Cikti olustugunda burada listelenecek.
                  </div>
                ) : (
                  runLog.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-4 py-3 text-xs text-slate-200"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 flex-none rounded-full ${
                            entry.status === "success" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <span className="truncate">{entry.message}</span>
                      </div>
                      <span className="flex-none text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {entry.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Websocket Baglanti Ayarlari
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Otomasyon bildirimleri icin websocket sunucu adresini gir.
              </p>
              <div className="mt-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300" htmlFor="ws-url">
                  Websocket URL
                </label>
                <input
                  id="ws-url"
                  type="text"
                  placeholder="wss://ornek.com/ws"
                  className={inputClass}
                />
                <button type="button" className={`w-full ${secondaryButtonClass}`}>
                  Kaydet
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Yeni Otomasyon Ekle
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Baslik ve kullanilacak template yolunu belirterek yeni kayit ekle.
              </p>
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
                  className={inputClass}
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
                  className={inputClass}
                />
                {templateWarning ? (
                  <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {templateWarning}
                  </div>
                ) : null}
                <button
                  type="button"
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
                    setAutomations((prev) => [
                      { id: `auto-${Date.now()}`, title, template },
                      ...prev,
                    ])
                    setAutomationForm({ title: "", template: "" })
                    toast.success("Otomasyon eklendi", { style: toastStyle, position: "top-right" })
                  }}
                  className={`w-full ${primaryButtonClass}`}
                >
                  Kaydet
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Duzenle / Sil
                </p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {automations.length} kayit
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Secilen otomasyonu hizlica duzenle veya kaldir.
              </p>
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
                  className={inputClass}
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
                  value={editingDraft.title}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Otomasyon basligi"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={editingDraft.template}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, template: event.target.value }))
                  }
                  placeholder="/templates/..."
                  className={inputClass}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
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
                    className={primaryButtonClass}
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingId) return
                      setAutomations((prev) => prev.filter((entry) => entry.id !== editingId))
                      setEditingId("")
                      setEditingDraft({ title: "", template: "" })
                      toast("Otomasyon silindi", { style: toastStyle, position: "top-right" })
                    }}
                    className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-500/20"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  )
}
