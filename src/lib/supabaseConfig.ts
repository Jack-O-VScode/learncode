/**
 * Supabase connection details, committed so the app needs no setup.
 *
 * Clone the repo, `npm install`, `npm run dev` — it connects. Deploy it
 * anywhere — it connects. Nobody ever types a key: these two values are
 * compiled into the JavaScript at build time, and your friends only ever see
 * the email and password box.
 *
 * ---------------------------------------------------------------------------
 * Is it safe to have these in the repo?
 *
 * The anon key is the PUBLIC key. It is designed to sit inside browser apps,
 * and anyone who visits the deployed site can read it straight out of the
 * JavaScript bundle — so committing it changes nothing about who can see it.
 *
 * What actually protects the data is Row Level Security, which
 * `supabase/schema.sql` switches on for every table: each person can only
 * ever read and write their own rows, and the key does not change that.
 *
 * What the key DOES allow is creating an account. If you ever want to stop
 * that, it is one toggle and no code change:
 *   Dashboard -> Authentication -> Sign In / Providers -> Email
 *   -> turn "Allow new users to sign up" OFF
 * Existing accounts keep working.
 *
 * NEVER put the `service_role` key here. That one bypasses every security
 * rule and must stay on a server.
 * ---------------------------------------------------------------------------
 *
 * A `.env` file still wins over these values when present, so you can point a
 * local checkout at a different project without editing this file.
 */

export const SUPABASE_URL = 'https://gsqshsxlnpcmccoqnogp.supabase.co'

/**
 * Still to fill in. Dashboard -> Project Settings -> API Keys, and use the
 * **Copy** button rather than selecting the text — the key is long and gets
 * truncated easily.
 *
 * It will look like one of these two shapes:
 *   eyJhbGci....eyJpc3Mi....<signature>   (legacy anon key: THREE dot-separated
 *                                          parts, 200+ characters)
 *   sb_publishable_xxxxxxxxxxxxxxxxxxxx   (newer publishable key)
 *
 * Both work. Do NOT use the `service_role` or `secret` key.
 */
export const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY'
