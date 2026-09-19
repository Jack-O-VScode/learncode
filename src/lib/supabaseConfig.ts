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
 * The `anon` (public) key for the project above. Its payload decodes to
 * `{"iss":"supabase","ref":"gsqshsxlnpcmccoqnogp","role":"anon",…}` — note
 * `role: anon`, not `service_role`.
 *
 * To replace it: Dashboard -> Project Settings -> API Keys, and use the
 * **Copy** button rather than selecting the text; the key wraps across lines
 * and is easy to truncate. It must have three dot-separated parts (or start
 * with `sb_publishable_`), which `supabase.ts` checks before using it.
 */
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcXNoc3hsbnBjbWNjb3Fub2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDcwMjEsImV4cCI6MjEwNTMyMzAyMX0.artRvFHSGSlx0449zl42zkypHtRvA6NeHOzNXJAJ7uY'
