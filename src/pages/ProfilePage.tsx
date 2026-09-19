import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ALL_TRACK_IDS, TRACKS } from '../content'
import { LEVEL_META, LEVEL_ORDER } from '../content/types'
import { useAuth } from '../lib/auth'
import { useProgress } from '../lib/progress'
import { trackStats } from '../lib/stats'
import { ProgressBar, ProgressRing } from '../components/ProgressBar'
import { isCloudMode } from '../lib/supabase'

export function ProfilePage() {
  const { user } = useAuth()
  const { progress, sync } = useProgress()

  const all = ALL_TRACK_IDS.map((id) => ({ track: TRACKS[id], stats: trackStats(TRACKS[id], progress) }))
  const done = all.reduce((sum, t) => sum + t.stats.done, 0)
  const total = all.reduce((sum, t) => sum + t.stats.total, 0)
  const answers = Object.values(progress).reduce((sum, p) => sum + p.attempts, 0)
  const correct = Object.values(progress).reduce((sum, p) => sum + p.correct, 0)

  return (
    <div className="profile-wrap">
      <nav className="crumbs">
        <Link to="/">Languages</Link>
        <span>/</span>
        <strong>My progress</strong>
      </nav>

      <header className="profile-head">
        <ProgressRing pct={total ? (done / total) * 100 : 0} size={88} accent="#38bdf8" />
        <div>
          <h1>{user?.email}</h1>
          <p>
            {done} of {total} steps finished across all four tracks · {correct} correct first try
            out of {answers} answers
          </p>
          <p className={`storage-note ${isCloudMode ? 'cloud' : 'local'}`}>
            {isCloudMode
              ? sync === 'offline'
                ? 'Cloud save is configured but unreachable right now — progress is being kept on this device and will sync when you are back online.'
                : 'Progress is saved to your Supabase project, so it follows you between your phone and your PC.'
              : 'Running in local mode: progress is saved in this browser only. Add Supabase keys to .env to sync across devices.'}
          </p>
        </div>
      </header>

      <div className="profile-tracks">
        {all.map(({ track, stats }) => (
          <section
            key={track.id}
            className="profile-track"
            style={{ '--accent': track.accent } as CSSProperties}
          >
            <div className="profile-track-head">
              <h2>{track.name}</h2>
              <Link to={`/track/${track.id}`} className="ghost btnish tiny">
                Open
              </Link>
            </div>
            <ProgressBar
              pct={stats.pct}
              accent={track.accent}
              label={`${stats.done} / ${stats.total}`}
            />
            <ul className="profile-levels">
              {LEVEL_ORDER.map((levelId) => {
                const ls = stats.levels[levelId]
                return (
                  <li key={levelId}>
                    <Link to={`/track/${track.id}/${levelId}`}>
                      <span className="pl-name">{LEVEL_META[levelId].name}</span>
                      <span className={`pl-state ${ls.finished ? 'done' : ls.started ? 'on' : ''}`}>
                        {ls.finished
                          ? 'Complete'
                          : ls.started
                            ? `${ls.done}/${ls.total}`
                            : 'Not started'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
