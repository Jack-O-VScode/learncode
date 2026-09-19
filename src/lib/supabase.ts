import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig'

/**
 * The app has two ways of running:
 *
 *  - **Cloud mode** (what you want): a Supabase URL + anon key are available,
 *    so accounts and progress live in Postgres and follow you between your
 *    phone and your PC.
 *  - **Local mode**: no keys configured. Everything still works, but the
 *    account and progress are stored in this browser only. This keeps the app
 *    usable before Supabase is wired up — see SETUP.md.
 *
 * The keys come from `.env` if it exists, otherwise from the values committed
 * in `supabaseConfig.ts`. `.env` winning means a local checkout can be pointed
 * at a different project without editing a tracked file.
 */

const url = (import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || '').trim()

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
  if (!url && !anonKey) {
    return 'No Supabase keys found in .env or src/lib/supabaseConfig.ts'
  }
  return 'The Supabase keys are still the placeholder values'
}
