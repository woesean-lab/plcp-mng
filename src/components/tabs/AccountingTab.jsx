export default function AccountingTab({ panelClass, isLoading }) {
  if (isLoading) {
    return (
      <div className={`${panelClass} bg-ink-900/60`}>
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-24 w-full rounded-xl bg-white/5" />
      </div>
    )
  }

  return (
    <section className={`${panelClass} bg-ink-900/60`}>
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Muhasebe
        </span>
        <h2 className="font-display text-xl font-semibold text-white">Yerel Muhasebe</h2>
        <p className="text-sm text-slate-300/80">
          Bu alan local olarak calisacak. Veritabani baglantisi su an yok.
        </p>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        <p className="font-semibold text-slate-100">Plan</p>
        <p className="mt-2 text-slate-300/80">
          Muhasebe ekraninin ilk surumunu birlikte tanimlayabiliriz. Hangi alanlar lazim
          olacak (gelir/gider, kasa, raporlar vb.)?
        </p>
      </div>
    </section>
  )
}
