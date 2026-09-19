import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { TRACKS } from '../content'
import { useProgress } from '../lib/progress'
import { trackStats } from '../lib/stats'
import { ProgressBar } from '../components/ProgressBar'
import type { TrackId } from '../content/types'

const MODES: {
  id: TrackId
  label: string
  headline: string
  points: string[]
}[] = [
  {
    id: 'cpp',
    label: 'Normal',
    headline: 'C++ on its own',
    points: [
      'Everything happens in a terminal window',
      'Variables, loops, functions, classes, memory, templates',
      'The standard route — pick this if you are unsure',
    ],
  },
  {
    id: 'cpp-gl',
    label: 'OpenGL',
    headline: 'C++ that draws on screen',
    points: [
      'Same C++ language, taught through graphics',
      'Open a window, push triangles to the GPU, animate them, go 3D',
      'How far you get depends on the difficulty you pick next',
    ],
  },
]

export function CppModePage() {
  const { progress } = useProgress()

  return (
    <div className="mode-wrap">
      <nav className="crumbs">
        <Link to="/">Languages</Link>
        <span>/</span>
        <strong>C++</strong>
      </nav>

      <header className="section-head">
        <h1>Which kind of C++?</h1>
        <p>
          C++ is the only language here with two modes. Both teach the same language — the OpenGL
          mode just makes every lesson produce something you can see. You can switch at any time,
          and each mode keeps its own progress.
        </p>
      </header>

      <div className="mode-grid">
        {MODES.map((mode) => {
          const track = TRACKS[mode.id]
          const stats = trackStats(track, progress)
          return (
            <Link
              key={mode.id}
              to={`/track/${mode.id}`}
              className="mode-card"
              style={{ '--accent': track.accent } as CSSProperties}
            >
              <span className="mode-label">{mode.label}</span>
              <h2>{mode.headline}</h2>
              <ul>
                {mode.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
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
