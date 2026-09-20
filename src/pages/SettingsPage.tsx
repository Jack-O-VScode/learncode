import { Link } from 'react-router-dom'
import { LANGUAGES, TRACKS } from '../content'
import { useAuth } from '../lib/auth'
import { useProgress } from '../lib/progress'
import { useTheme } from '../lib/theme'
import { trackStats } from '../lib/stats'
import { isCloudMode } from '../lib/supabase'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { progress, resetTrack, resetAll } = useProgress()

  const anyProgress = Object.values(progress).some(
    (p) => p.completed.length > 0 || p.attempts > 0,
  )

  const onResetTrack = (trackId: keyof typeof TRACKS, name: string) => {
    if (window.confirm(`Reset all progress for “${name}”? This cannot be undone.`)) {
      resetTrack(trackId)
    }
  }

  const onResetAll = () => {
    if (
      window.confirm(
        'Reset ALL progress across every track and start completely fresh? This cannot be undone.',
      )
    ) {
      resetAll()
    }
  }

  return (
    <div className="settings-wrap">
      <nav className="crumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <strong>Settings</strong>
      </nav>

      <header className="profile-head" style={{ display: 'block' }}>
        <h1>Settings</h1>
        <p className="auth-sub">Appearance, your data, and your account.</p>
      </header>

      {/* ---------------------------- Appearance ---------------------------- */}
      <section className="settings-section">
        <h2>Appearance</h2>
        <p className="section-note">
          Choose a colour theme. Your choice is remembered on this device.
        </p>
        <div className="theme-toggle" role="group" aria-label="Colour theme">
          <button
            type="button"
            className={theme === 'light' ? 'on' : ''}
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            ☀︎ Light
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'on' : ''}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            ☾ Dark
          </button>
        </div>
      </section>

      {/* ------------------------------- Data ------------------------------- */}
      <section className="settings-section">
        <h2>Your progress</h2>
        <p className="section-note">
          Reset a single track to redo it from the beginning, or wipe everything for a
          clean slate. {isCloudMode ? 'Changes sync to your account.' : 'Saved on this device.'}
        </p>

        {LANGUAGES.map((card) => (
          <div key={card.id} style={{ marginTop: '0.4rem' }}>
            {card.tracks.map((trackId) => {
              const track = TRACKS[trackId]
              const stats = trackStats(track, progress)
              const started = stats.done > 0
              return (
                <div className="reset-row" key={trackId}>
                  <span className="rr-name">
                    <span className="rr-dot" style={{ background: track.accent }} />
                    <span>
                      {track.name}
                      <span className="rr-state">
                        {' · '}
                        {started ? `${stats.done}/${stats.total} done` : 'not started'}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={!started}
                    onClick={() => onResetTrack(trackId, track.name)}
                  >
                    Reset
                  </button>
                </div>
              )
            })}
          </div>
        ))}

        <div className="reset-row" style={{ marginTop: '0.8rem', borderTopStyle: 'dashed' }}>
          <span className="rr-name">
            <strong>Reset everything</strong>
            <span className="rr-state"> · start completely fresh</span>
          </span>
          <button
            type="button"
            className="btn-danger strong"
            disabled={!anyProgress}
            onClick={onResetAll}
          >
            Reset all
          </button>
        </div>
      </section>

      {/* ------------------------------ Account ----------------------------- */}
      <section className="settings-section">
        <h2>Account</h2>
        <div className="settings-account">
          <span className="sa-email">{user?.email}</span>
          <button type="button" className="ghost btnish" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </section>

      {/* -------------------------------- App ------------------------------- */}
      <section className="settings-section">
        <h2>App</h2>
        <p className="section-note">Install LearnCode as a real app on your phone or PC.</p>
        <Link to="/install" className="ghost btnish">
          Install as an app
        </Link>
      </section>
    </div>
  )
}
