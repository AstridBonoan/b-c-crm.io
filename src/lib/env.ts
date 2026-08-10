const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

function isPlaceholder(value: string) {
  return (
    value.includes('your-project-ref') ||
    value.includes('your-anon-key') ||
    value.includes('your-publishable-key')
  )
}

export const env = {
  supabaseUrl: typeof supabaseUrl === 'string' ? supabaseUrl : '',
  supabaseKey: typeof publishableKey === 'string' ? publishableKey : '',
  isSupabaseConfigured:
    Boolean(supabaseUrl) &&
    Boolean(publishableKey) &&
    !isPlaceholder(String(supabaseUrl)) &&
    !isPlaceholder(String(publishableKey)),
} as const
