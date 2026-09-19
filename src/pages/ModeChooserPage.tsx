import type { CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getCard, TRACKS } from '../content'
import { useProgress } from '../lib/progress'
import { trackStats } from '../lib/stats'
import { ProgressBar } from '../components/ProgressBar'

/**
 * One page for every card that has more than one mode — C++ (Normal/OpenGL)
 * and the two cybersecurity cards (Linux/Windows/Networking/Web). All the
 * per-card wording lives in the card's `chooser` data in content/index.ts.
 */
export function ModeChooserPage() {
  const { cardId } = useParams()
  const card = getCard(cardId)
  const { progress } = useProgress()

  if (!card || !card.chooser) return <Navigate to="/" replace />

  return (
    <div className="mode-wrap" style={{ '--accent': card.accent } as CSSProperties}>
      <nav className="crumbs">
        <Link to="/">Languages</Link>
        <span>/</span>
        <strong>{card.name}</strong>
      </nav>

      <header className="section-head">
        <h1>{card.chooser.title}</h1>
        <p>{card.chooser.intro}</p>
      </header>

      <div className="mode-grid">
        {card.chooser.modes.map((mode) => {
          const track = TRACKS[mode.trackId]
          const stats = trackStats(track, progress)
          const style = { '--accent': track.accent } as CSSProperties
          const inner = (
            <>
              <span className="mode-label">{mode.label}</span>
              <h2>{mode.headline}</h2>
              <ul>
                {mode.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </>
          )

          // A track with no steps yet (content still being written) shows a
          // "Coming soon" card that cannot be entered, rather than an empty one.
          if (stats.total === 0) {
            return (
              <div key={mode.trackId} className="mode-card disabled" style={style}>
                {inner}
                <span className="mode-soon">Coming soon</span>
              </div>
            )
          }

          return (
            <Link
              key={mode.trackId}
              to={`/track/${mode.trackId}`}
              className="mode-card"
              style={style}
            >
              {inner}
              <ProgressBar
                pct={stats.pct}
                accent={track.accent}
                label={`${stats.done} / ${stats.total}`}
              />
              <span className="mode-go">Choose a difficulty →</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
