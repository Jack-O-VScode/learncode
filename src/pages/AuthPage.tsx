import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { cloudModeNote, isCloudMode } from '../lib/supabase'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a real email address.')
      return
    }
    if (password.length < 6) {
      setError('Passwords need to be at least 6 characters.')
      return
    }
    if (mode === 'up' && password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else await signUp(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-glow" />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark big">{'</>'}</span>
          <h1>LearnCode</h1>
          <p className="auth-sub">
            Python, HTML and C++ — from your very first line of code to the deep end.
          </p>
        </div>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'in'}
            className={mode === 'in' ? 'tab on' : 'tab'}
            onClick={() => {
              setMode('in')
              setError('')
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'up'}
            className={mode === 'up' ? 'tab on' : 'tab'}
            onClick={() => {
              setMode('up')
              setError('')
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <div className="pw-row">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                required
              />
              <button type="button" className="ghost tiny" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {mode === 'up' && (
            <label>
              <span>Confirm password</span>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary block" disabled={busy}>
            {busy ? 'Just a moment…' : mode === 'in' ? 'Sign in' : 'Create my account'}
          </button>
        </form>

        <p className="auth-note">
          {mode === 'in'
            ? 'No account yet? Switch to "Create account" above.'
            : 'You are signed in straight away — there is no confirmation email to wait for.'}
        </p>

        {!isCloudMode && (
          <p className="auth-warn">
            <strong>Local mode:</strong> {cloudModeNote()}. Your account and progress will be
            saved in this browser only. Add your Supabase URL and anon key to <code>.env</code>{' '}
            (see <code>SETUP.md</code>) to sync across devices.
          </p>
        )}
      </div>
    </div>
  )
}
