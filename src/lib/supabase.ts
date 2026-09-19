import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The app has two ways of running:
 *
 *  - **Cloud mode** (what you want): `.env` has a Supabase URL + anon key, so
 *    accounts and progress live in Postgres and follow you between your phone
 *    and your PC.
 *  - **Local mode**: no keys configured. Everything still works, but the
 *    account and progress are stored in this browser only. This keeps the app
 *    usable before Supabase is wired up — see SETUP.md.
 */

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const looksConfigured =
  url.startsWith('http') &&
  !url.includes('YOUR-PROJECT-REF') &&
  anonKey.length > 20 &&
  !anonKey.includes('YOUR-ANON')

export const isCloudMode = looksConfigured

export const supabase: SupabaseClient | null = looksConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'learncode.auth',
      },
    })
  : null

/** Human-readable reason the app is running without a cloud, for the UI. */
export function cloudModeNote(): string {
  if (looksConfigured) return ''
  if (!url && !anonKey) return 'No Supabase keys found in .env'
  return 'Supabase keys in .env look like placeholders'
}
