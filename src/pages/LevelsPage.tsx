import type { CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getTrack } from '../content'
import { LEVEL_META, LEVEL_ORDER } from '../content/types'
import { useProgress } from '../lib/progress'
import { levelStats } from '../lib/stats'
import { ProgressBar } from '../components/ProgressBar'

export function LevelsPage() {
  const { trackId } = useParams()
  const track = getTrack(trackId)
  const { progress } = useProgress()

  if (!track) return <Navigate to="/" replace />

  const isCpp = track.id === 'cpp' || track.id === 'cpp-gl'

  return (
    <div className="levels-wrap" style={{ '--accent': track.accent } as CSSProperties}>
      <nav className="crumbs">
        <Link to="/">Languages</Link>
        {isCpp && (
          <>
            <span>/</span>
            <Link to="/cpp">C++</Link>
          </>
        )}
        <span>/</span>
        <strong>{track.name}</strong>
      </nav>

      <header className="section-head">
        <h1>{track.name}</h1>
        <p>{track.description}</p>
      </header>

      <h2 className="levels-title">Choose your difficulty</h2>
      <p className="levels-sub">
        Levels are independent — start wherever you like. If you have never written code, start at
        Beginner; it assumes nothing at all.
      </p>

      <ul className="level-list">
        {LEVEL_ORDER.map((levelId, index) => {
          const level = track.levels[levelId]
          const meta = LEVEL_META[levelId]
          const stats = levelStats(track, levelId, progress)
          return (
            <li key={levelId}>
              <Link
                to={`/track/${track.id}/${levelId}`}
                className={`level-card ${stats.finished ? 'done' : ''}`}
                style={{ '--accent': meta.accent } as CSSProperties}
              >
                <div className="level-rank">{index + 1}</div>
                <div className="level-main">
                  <div className="level-head">
                    <h3>{meta.name}</h3>
                    {stats.finished && <span className="chip done">Complete</span>}
                    {!stats.finished && stats.started && (
                      <span className="chip">Resume at step {stats.resumeAt + 1}</span>
                    )}
                  </div>
                  <p className="level-tag">{meta.tag}</p>
                  <p className="level-title">{level.title}</p>
                  <p className="level-summary">{level.summary}</p>
                  <ProgressBar
                    pct={stats.pct}
                    accent={meta.accent}
                    label={`${stats.done} / ${stats.total} steps`}
                    thin
                  />
                </div>
                <span className="level-go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
