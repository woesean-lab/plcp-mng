function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />
}

function AutomationSkeleton({ panelClass }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card sm:p-6">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-52" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-44" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonBlock key={`automation-skeleton-${idx}`} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-3 h-16 w-full rounded-2xl" />
          </div>
          <div className={`${panelClass} bg-ink-900/60`}>
            <SkeletonBlock className="h-3 w-16 rounded-full" />
            <SkeletonBlock className="mt-3 h-12 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AutomationTab({ panelClass, isLoading = false }) {
  if (isLoading) {
    return <AutomationSkeleton panelClass={panelClass} />
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent-200">
              Otomasyon
            </span>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Akış Planlama
            </h1>
            <p className="max-w-2xl text-sm text-slate-200/80">
              DB bağlantısı gelene kadar otomasyon fikirlerini taslak olarak topla.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-accent-200">
              Durum: Taslak
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className={`${panelClass} bg-ink-900/60`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Yakinda
              </p>
              <p className="mt-1 text-sm text-slate-300">Planlanan otomasyon bloklari.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Taslak
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                title: "Siparis onay otomasyonu",
                detail: "Yeni satis girisi oldugunda otomatik takip notu olustur.",
              },
              {
                title: "Stok kontrol zinciri",
                detail: "Stok azaldiginda bildirim ve alternatif tedarik listesi goster.",
              },
              {
                title: "Problem eskalasyonu",
                detail: "Problem 24 saat icinde kapanmazsa yoneticiyi uyar.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-slate-200"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className={`${panelClass} bg-ink-900/60`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Notlar
            </p>
            <p className="mt-2 text-sm text-slate-300">
              DB baglantisi eklenince bu alandan kural setleri kaydedilecek. Simdilik
              ekip icinde alinacak kararlar icin bu listeyi kullanabilirsin.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                Tetikleyici: satis girisi, stok seviyesi, problem durumu.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                Aksiyon: mesaj gonderme, gorev olusturma, bildirim gosterme.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                Hedef: is akisini otomatiklestirip manuel adimlari azaltmak.
              </li>
            </ul>
          </div>

          <div className={`${panelClass} bg-ink-900/60`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Durum
              </p>
              <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                Hazirlik
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Bu sekme yalnizca arayuz taslagi. Backend baglantisi talep edildiginde
              is kurallari ve tetikleyiciler eklenecek.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
