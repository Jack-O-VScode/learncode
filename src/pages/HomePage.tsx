import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LANGUAGES, TRACKS } from '../content'
import { LEVEL_META } from '../content/types'
import { useProgress } from '../lib/progress'
import { trackStats } from '../lib/stats'
import { ProgressRing } from '../components/ProgressBar'
import { useAuth } from '../lib/auth'

/** Finds the most recently touched level so we can offer a one-tap resume. */
function useResumePoint() {
  const { progress } = useProgress()
  let best: { track: string; level: string; at: string } | null = null
  for (const [key, value] of Object.entries(progress)) {
    if (value.completed.length === 0 && value.stepIndex === 0) continue
    if (!best || value.updatedAt > best.at) {
      const [track, level] = key.split(':')
      best = { track, level, at: value.updatedAt }
    }
  }
  return best
}

export function HomePage() {
  const navigate = useNavigate()
  const { progress } = useProgress()
  const { user } = useAuth()
  const resume = useResumePoint()
  const resumeTrack = resume ? TRACKS[resume.track as keyof typeof TRACKS] : null

  const name = user?.email.split('@')[0] ?? 'there'

  return (
    <div className="home-wrap">
      <section className="hero">
        <p className="eyebrow">Welcome back, {name}</p>
        <h1>What do you want to learn?</h1>
        <p className="hero-sub">
          Every level works the same way: <strong>read</strong> a short explanation,{' '}
          <strong>study</strong> a worked sample, then <strong>answer</strong> a question. Your
          place is saved after every single answer.
        </p>
      </section>

      {resume && resumeTrack && (
        <button
          type="button"
          className="resume-card"
          onClick={() => navigate(`/track/${resume.track}/${resume.level}`)}
        >
          <div>
            <span className="resume-kicker">Pick up where you left off</span>
            <strong>
              {resumeTrack.name} · {LEVEL_META[resume.level as keyof typeof LEVEL_META].name}
            </strong>
          </div>
          <span className="resume-go" aria-hidden="true">
            →
          </span>
        </button>
      )}

      <div className="lang-grid">
        {LANGUAGES.map((lang) => {
          const isMulti = lang.tracks.length > 1
          const stats = lang.tracks.map((id) => trackStats(TRACKS[id], progress))
          const done = stats.reduce((sum, s) => sum + s.done, 0)
          const total = stats.reduce((sum, s) => sum + s.total, 0)
          const pct = total === 0 ? 0 : Math.round((done / total) * 100)
          const href = isMulti ? '/cpp' : `/track/${lang.tracks[0]}`

          return (
            <Link
              key={lang.id}
              to={href}
              className="lang-card"
              style={{ '--accent': lang.accent } as CSSProperties}
            >
              <div className="lang-card-top">
                <span className="lang-badge">{lang.name}</span>
                <ProgressRing pct={pct} accent={lang.accent} />
              </div>
              <p className="lang-blurb">{lang.blurb}</p>
              <div className="lang-foot">
                <span>
                  {done} / {total} steps
                </span>
                <span className="lang-go">{isMulti ? 'Choose a mode →' : 'Choose a level →'}</span>
              </div>
            </Link>
          )
        })}
      </div>

      <section className="how">
        <h2>How the course is built</h2>
        <div className="how-grid">
          <div>
            <span className="how-num">1</span>
            <h3>Pick a language</h3>
            <p>
              Python, HTML or C++. C++ then asks whether you want plain C++ or the OpenGL mode,
              where every idea is taught by drawing something on screen.
            </p>
          </div>
          <div>
            <span className="how-num">2</span>
            <h3>Pick a difficulty</h3>
            <p>
              Beginner assumes you have never written a line of code in your life. Pro goes all
              the way to the parts most people never learn.
            </p>
          </div>
          <div>
            <span className="how-num">3</span>
            <h3>Read → sample → answer</h3>
            <p>
              Each level is a long chain of those three beats. Answer a question and your progress
              is written to the cloud immediately.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
