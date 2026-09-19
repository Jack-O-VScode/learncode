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

const urlLooksReal = url.startsWith('http') && !url.includes('YOUR-PROJECT-REF')

/**
 * A Supabase publishable key is either a three-part JWT (the legacy `anon`
 * key) or an `sb_publishable_…` string. Checking the shape catches the easy
 * mistake of pasting only part of a very long key: without this, a truncated
 * key sails through and fails later as an opaque "Invalid API key" on the
 * first sign-in attempt, which is a horrible thing to debug.
 */
function keyLooksReal(key: string): boolean {
  if (!key || key.includes('YOUR-ANON')) return false
  if (key.startsWith('sb_publishable_')) return key.length > 25
  // A JWT is header.payload.signature — three non-empty dot-separated parts.
  const parts = key.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0) && key.length > 100
}

const anonKeyIsReal = keyLooksReal(anonKey)
const looksConfigured = urlLooksReal && anonKeyIsReal

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
  if (!urlLooksReal) return 'The Supabase project URL is still a placeholder'
  if (!anonKey || anonKey.includes('YOUR-ANON')) {
    return 'The Supabase anon key has not been filled in yet'
  }
  // Almost always a part-copied key: the real one is long and wraps in the UI.
  return `That anon key does not look complete (${anonKey.length} characters, ${
    anonKey.split('.').length
  } of the 3 parts a JWT needs) — copy the whole key with the dashboard's Copy button`
}
