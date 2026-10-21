import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key && import.meta.env.VITE_DEMO_MODE !== 'true')
export const supabase: SupabaseClient | null = supabaseConfigured && url && key
  ? createClient(url, key, {
    auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true },
  })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export function subscribeToWorkspace(onChange: () => void): () => void {
  const client = requireSupabase()
  const channel = client.channel('quickly-workspace')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'course_enrollments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe()
  return () => { void client.removeChannel(channel) }
}
