export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-surface">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        <p className="mt-3 text-sm text-slate-600">{label}</p>
      </div>
    </div>
  )
}
