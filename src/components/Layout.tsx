import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useProgress } from '../lib/progress'

function SyncPill() {
  const { sync } = useProgress()
  const label: Record<typeof sync, string> = {
    idle: 'Ready',
    saving: 'Saving…',
    saved: 'Saved to cloud',
    offline: 'Saved on device',
    local: 'Local only',
    setup: 'Set up needed',
  }
  const title: Record<typeof sync, string> = {
    idle: 'Connected',
    saving: 'Writing your progress to Supabase',
    saved: 'Your progress is safe in the cloud',
    offline: 'No connection to Supabase — progress is kept here and will sync later',
    local: 'No Supabase keys configured, so progress lives in this browser only',
    setup:
      'Connected to Supabase, but the tables are missing. ' +
      'Run supabase/schema.sql in the SQL editor. Progress is safe here meanwhile.',
  }
  return (
    <span className={`sync-pill ${sync}`} title={title[sync]}>
      <i />
      {label[sync]}
    </span>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const atHome = pathname === '/'

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="LearnCode home">
          <span className="brand-mark">{'</>'}</span>
          <span className="brand-name">LearnCode</span>
        </Link>
        <div className="topbar-right">
          <SyncPill />
          <Link to="/me" className={`icon-link ${pathname === '/me' ? 'on' : ''}`}>
            My progress
          </Link>
          <button type="button" className="ghost tiny" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className={atHome ? 'page home' : 'page'}>{children}</main>

      <footer className="footbar">
        <span>{user?.email}</span>
        <Link to="/install">Install as an app</Link>
      </footer>
    </div>
  )
}
