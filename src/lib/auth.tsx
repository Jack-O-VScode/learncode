import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isCloudMode, supabase } from './supabase'

export interface AppUser {
  id: string
  email: string
}

interface AuthState {
  user: AppUser | null
  /** True until we know whether there is an existing session. */
  loading: boolean
  cloud: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/* -------------------------------------------------------------------------- */
/*  Local (no-cloud) fallback                                                  */
/* -------------------------------------------------------------------------- */

const LOCAL_USERS_KEY = 'learncode.localUsers'
const LOCAL_SESSION_KEY = 'learncode.localSession'

interface LocalUser {
  id: string
  email: string
  /** SHA-256 of `${salt}:${password}` — never the password itself. */
  hash: string
  salt: string
}

function readLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    return raw ? (JSON.parse(raw) as LocalUser[]) : []
  } catch {
    return []
  }
}

function writeLocalUsers(users: LocalUser[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* -------------------------------------------------------------------------- */
/*  Error messages                                                             */
/* -------------------------------------------------------------------------- */

/** Turns Supabase's terse errors into something a human can act on. */
function friendlyError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'That email and password do not match an account. Check the spelling, or create an account instead.'
  }
  if (m.includes('email not confirmed')) {
    return 'Supabase is still set to require email confirmation. Open the dashboard → Authentication → Sign In / Providers → Email and turn "Confirm email" OFF, then try again.'
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'There is already an account with that email — sign in instead.'
  }
  if (m.includes('password should be at least')) {
    return 'That password is too short. Use at least 6 characters.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'That does not look like a valid email address.'
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'New sign-ups are switched off in Supabase. Dashboard → Authentication → Sign In / Providers → Email → enable "Allow new users to sign up".'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Could not reach Supabase. Check your internet connection, and that the project URL in src/lib/supabaseConfig.ts is still correct (a paused or deleted project fails the same way).'
  }
  if (m.includes('invalid api key') || m.includes('no api key')) {
    return 'Supabase rejected the API key. Copy the anon/public key again from Project Settings → API Keys, using the Copy button so it is not truncated.'
  }
  return message
}

/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  // Avoid re-running profile upserts for a session we have already seen.
  const lastProfileSync = useRef<string | null>(null)

  /** Keeps a readable copy of the account in a table we control. */
  const syncProfile = useCallback(async (u: AppUser) => {
    if (!supabase || lastProfileSync.current === u.id) return
    lastProfileSync.current = u.id
    // Best effort: a missing `profiles` table must never block signing in.
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: u.id, email: u.email }, { onConflict: 'id' })
    if (error) console.warn('[learncode] could not sync profile:', error.message)
  }, [])

  useEffect(() => {
    let active = true

    if (!supabase) {
      try {
        const raw = localStorage.getItem(LOCAL_SESSION_KEY)
        if (raw) setUser(JSON.parse(raw) as AppUser)
      } catch {
        /* corrupt storage — start signed out */
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const s = data.session
      if (s?.user) {
        const u = { id: s.user.id, email: s.user.email ?? '' }
        setUser(u)
        void syncProfile(u)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session?.user) {
        const u = { id: session.user.id, email: session.user.email ?? '' }
        setUser(u)
        void syncProfile(u)
      } else {
        setUser(null)
        lastProfileSync.current = null
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [syncProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()
    if (!supabase) {
      const users = readLocalUsers()
      const found = users.find((u) => u.email === cleanEmail)
      if (!found) throw new Error('No account on this device with that email.')
      if ((await sha256(`${found.salt}:${password}`)) !== found.hash) {
        throw new Error('Wrong password.')
      }
      const u = { id: found.id, email: found.email }
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(u))
      setUser(u)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error) throw new Error(friendlyError(error.message))
    if (data.user) {
      const u = { id: data.user.id, email: data.user.email ?? cleanEmail }
      setUser(u)
      void syncProfile(u)
    }
  }, [syncProfile])

  const signUp = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase()
      if (!supabase) {
        const users = readLocalUsers()
        if (users.some((u) => u.email === cleanEmail)) {
          throw new Error('An account with that email already exists on this device.')
        }
        const salt = randomId()
        const record: LocalUser = {
          id: randomId(),
          email: cleanEmail,
          salt,
          hash: await sha256(`${salt}:${password}`),
        }
        writeLocalUsers([...users, record])
        const u = { id: record.id, email: record.email }
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(u))
        setUser(u)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      })
      if (error) throw new Error(friendlyError(error.message))

      if (data.session?.user) {
        // Confirmation is off (what we want): we are signed in straight away.
        const u = { id: data.session.user.id, email: data.session.user.email ?? cleanEmail }
        setUser(u)
        void syncProfile(u)
        return
      }

      // No session back. Either confirmation is still enabled, or the email was
      // already registered (Supabase hides that fact on purpose). Try signing
      // in — it succeeds in the "already registered, correct password" case.
      const retry = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (retry.data.session?.user) {
        const u = {
          id: retry.data.session.user.id,
          email: retry.data.session.user.email ?? cleanEmail,
        }
        setUser(u)
        void syncProfile(u)
        return
      }
      throw new Error(
        'Account created, but Supabase did not sign you in — email confirmation is still switched on. In the Supabase dashboard go to Authentication → Sign In / Providers → Email and turn "Confirm email" OFF, then sign in.',
      )
    },
    [syncProfile],
  )

  const signOut = useCallback(async () => {
    if (!supabase) {
      localStorage.removeItem(LOCAL_SESSION_KEY)
      setUser(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
    lastProfileSync.current = null
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, cloud: isCloudMode, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
