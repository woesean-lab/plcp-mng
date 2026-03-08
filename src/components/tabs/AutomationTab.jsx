import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-hot-toast"

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#19142a] via-[#111b2f] to-[#0f1f28] p-5 shadow-card">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="mt-3 h-9 w-56" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-40" />
          <SkeletonBlock className="mt-4 h-56 w-full" />
        </div>
        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-4 h-10 w-full" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-4 w-24" />
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

  const selectedAutomation = useMemo(
    () => automations.find((item) => item.id === selectedAutomationId) ?? null,
    [automations, selectedAutomationId],
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
    "w-full rounded-lg border border-white/10 bg-[#131a2b] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
  const primaryButtonClass =
    "rounded-lg border border-emerald-300/70 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  const secondaryButtonClass =
    "rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/20 hover:bg-white/10"

  const modalContent = isConfirmOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111a2c] p-5 shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Onay</p>
        <p className="mt-2 text-base font-semibold text-white">Otomasyon calistirilsin mi?</p>
        <p className="mt-2 text-sm text-slate-300">
          {automations.find((item) => item.id === confirmRunId)?.title ?? ""}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              const selected = automations.find((item) => item.id === confirmRunId)
              setIsConfirmOpen(false)
              setConfirmRunId("")
              if (!selected) return
              runAutomation(selected)
            }}
          >
            Evet
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              setIsConfirmOpen(false)
              setConfirmRunId("")
            }}
          >
            Iptal
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="space-y-5">
        <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#19142a] via-[#111b2f] to-[#0f1f28] p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Otomasyon
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-white">Otomasyon Paneli</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                {automations.length} kayit
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  isRunning
                    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                    : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {isRunning ? "Calisiyor" : "Hazir"}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <section className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Calistir</p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Son: {lastSuccess?.time ?? "--:--"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedAutomationId}
                onChange={(event) => setSelectedAutomationId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Otomasyon sec</option>
                {automations.map((item) => (
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
                className={`min-w-[130px] ${primaryButtonClass}`}
              >
                {isRunning ? "Calisiyor..." : "Calistir"}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Secili Otomasyon</p>
              <p className="mt-1 truncate text-sm text-slate-100">
                {selectedAutomation?.title ?? "Secim yok"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {selectedAutomation?.template ?? "/templates/..."}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#0d1424] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Cikti</p>
              <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
                {runLog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/60 px-4 py-8 text-center text-xs text-slate-500">
                    Cikti yok
                  </div>
                ) : (
                  runLog.slice(0, 20).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-ink-900/70 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 flex-none rounded-full ${
                            entry.status === "success" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <span className="truncate text-xs text-slate-200">{entry.message}</span>
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

          <aside className="space-y-4">
            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Websocket</p>
              <div className="mt-3 space-y-3">
                <input id="ws-url" type="text" placeholder="wss://ornek.com/ws" className={fieldClass} />
                <button type="button" className={`w-full ${secondaryButtonClass}`}>
                  Kaydet
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Yeni Ekle</p>
              <div className="mt-3 space-y-3">
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
                    setAutomations((prev) => [{ id: `auto-${Date.now()}`, title, template }, ...prev])
                    setAutomationForm({ title: "", template: "" })
                    toast.success("Otomasyon eklendi", { style: toastStyle, position: "top-right" })
                  }}
                  className={`w-full ${primaryButtonClass}`}
                >
                  Ekle
                </button>
              </div>
            </section>

            <section className={`${panelClass} bg-ink-900/60`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Duzenle / Sil</p>
              <div className="mt-3 space-y-3">
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
                  {automations.map((item) => (
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
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={editingDraft.template}
                  onChange={(event) =>
                    setEditingDraft((prev) => ({ ...prev, template: event.target.value }))
                  }
                  placeholder="/templates/..."
                  className={fieldClass}
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
                      if (selectedAutomationId === editingId) setSelectedAutomationId("")
                      toast("Otomasyon silindi", { style: toastStyle, position: "top-right" })
                    }}
                    className="rounded-lg border border-rose-300/60 bg-rose-500/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
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
