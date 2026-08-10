export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="app-shell-bg flex min-h-full items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        <p className="mt-3 text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  )
}
