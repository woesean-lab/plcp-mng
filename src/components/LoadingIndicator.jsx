export default function LoadingIndicator({ label = "Yükleniyor..." }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
      {label}
    </span>
  )
}
