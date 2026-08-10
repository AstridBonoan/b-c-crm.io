const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const env = {
  supabaseUrl: typeof supabaseUrl === 'string' ? supabaseUrl : '',
  supabaseAnonKey: typeof supabaseAnonKey === 'string' ? supabaseAnonKey : '',
  isSupabaseConfigured:
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !String(supabaseUrl).includes('your-project-ref') &&
    !String(supabaseAnonKey).includes('your-anon-key'),
} as const
