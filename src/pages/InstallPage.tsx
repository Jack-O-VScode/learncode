import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/** The event Chrome/Edge fire when a PWA is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPage() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return (
    <div className="install-wrap">
      <nav className="crumbs">
        <Link to="/">Languages</Link>
        <span>/</span>
        <strong>Install</strong>
      </nav>

      <header className="section-head">
        <h1>Install LearnCode as an app</h1>
        <p>
          This is a Progressive Web App, so it installs from the browser onto both an iPhone and a
          Windows PC — its own icon, its own window, no app store. Lessons are cached, so you can
          keep learning with no signal; answers sync to the cloud when you are back online.
        </p>
      </header>

      {installed && <p className="installed-note">✅ You are already running the installed app.</p>}

      {deferred && !installed && (
        <button
          type="button"
          className="primary"
          onClick={async () => {
            await deferred.prompt()
            await deferred.userChoice
            setDeferred(null)
          }}
        >
          Install now
        </button>
      )}

      <div className="install-grid">
        <section className="install-card">
          <h2>iPhone / iPad</h2>
          <ol>
            <li>Open the site in <strong>Safari</strong> (Chrome on iOS cannot install apps).</li>
            <li>
              Tap the <strong>Share</strong> button — the square with an arrow pointing up.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong>. LearnCode now sits on your home screen like any other app.
            </li>
          </ol>
        </section>

        <section className="install-card">
          <h2>Windows</h2>
          <ol>
            <li>
              Open the site in <strong>Edge</strong> or <strong>Chrome</strong>.
            </li>
            <li>
              Click the <strong>install icon</strong> in the address bar (a screen with a down
              arrow), or open the ⋯ menu → <strong>Apps</strong> → <strong>Install this site as an
              app</strong>.
            </li>
            <li>
              Click <strong>Install</strong>. It gets a Start-menu entry and can be pinned to the
              taskbar.
            </li>
          </ol>
        </section>

        <section className="install-card">
          <h2>Android / Mac</h2>
          <ol>
            <li>Chrome on Android shows an “Install app” banner, or use ⋮ → Install app.</li>
            <li>
              On macOS use Chrome or Edge (⋯ → Cast, Save and Share → Install), or Safari 17+ via
              File → Add to Dock.
            </li>
          </ol>
        </section>
      </div>

      <p className="install-foot">
        Installation only works over <strong>https</strong> (or <code>localhost</code>), which is
        automatic if you deploy to Vercel, Netlify or Cloudflare Pages.
      </p>
    </div>
  )
}
