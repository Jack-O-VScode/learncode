import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getLevel, getTrack } from '../content'
import { LEVEL_META, LEVEL_ORDER, type LevelId } from '../content/types'
import { useProgress, type AnswerOutcome } from '../lib/progress'
import { levelStats } from '../lib/stats'
import { Markdown } from '../components/Markdown'
import { CodeBlock } from '../components/CodeBlock'
import { QuestionCard } from '../components/QuestionCard'
import { ProgressBar } from '../components/ProgressBar'

export function LessonPage() {
  const { trackId, levelId } = useParams()
  const navigate = useNavigate()
  const track = getTrack(trackId)
  const level = track ? getLevel(track, levelId) : null
  const { progress, ready, get, recordAnswer, setStepIndex, resetLevel } = useProgress()

  const [index, setIndex] = useState(0)
  const [restored, setRestored] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const topRef = useRef<HTMLDivElement | null>(null)

  const key = `${trackId}:${levelId}`
  const record = track && level ? get(track.id, level.id) : null
  const stats = useMemo(
    () => (track && level ? levelStats(track, level.id, progress) : null),
    [track, level, progress],
  )

  // Drop the learner back exactly where they stopped — this is the whole point
  // of saving after every answer. Runs once per level, after progress loads.
  useEffect(() => {
    setRestored(false)
    setCelebrating(false)
  }, [key])

  useEffect(() => {
    if (restored || !ready || !track || !level) return
    const saved = get(track.id, level.id)
    const target = Math.min(Math.max(saved.stepIndex, 0), level.steps.length - 1)
    setIndex(target)
    setRestored(true)
  }, [restored, ready, track, level, get])

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [index, celebrating])

  const onResolve = useCallback(
    (outcome: AnswerOutcome) => {
      if (!track || !level) return
      recordAnswer({
        track: track.id,
        level: level.id,
        stepId: level.steps[index].id,
        stepIndex: index,
        outcome,
        totalSteps: level.steps.length,
      })
    },
    [track, level, index, recordAnswer],
  )

  const goTo = useCallback(
    (next: number) => {
      if (!track || !level) return
      const clamped = Math.min(Math.max(next, 0), level.steps.length - 1)
      setIndex(clamped)
      setStepIndex(track.id, level.id, clamped)
      setShowMap(false)
    },
    [track, level, setStepIndex],
  )

  if (!track || !level) return <Navigate to="/" replace />

  const step = level.steps[index]
  const meta = LEVEL_META[level.id]
  const isLast = index === level.steps.length - 1
  const stepDone = record?.completed.includes(step.id) ?? false
  const levelPosition = LEVEL_ORDER.indexOf(level.id)
  const nextLevel: LevelId | null =
    levelPosition < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[levelPosition + 1] : null

  if (celebrating) {
    return (
      <div className="lesson-wrap" style={{ '--accent': meta.accent } as CSSProperties}>
        <div ref={topRef} />
        <section className="complete-card">
          <span className="complete-mark">🎉</span>
          <h1>
            {track.name} · {meta.name} complete
          </h1>
          <p>
            You finished all {level.steps.length} steps of <strong>{level.title}</strong>.
          </p>
          <ul className="outcomes">
            {level.outcomes.map((outcome) => (
              <li key={outcome}>✓ {outcome}</li>
            ))}
          </ul>
          <div className="complete-stats">
            <div>
              <strong>{record?.correct ?? 0}</strong>
              <span>first-time correct</span>
            </div>
            <div>
              <strong>{record?.attempts ?? 0}</strong>
              <span>answers submitted</span>
            </div>
            <div>
              <strong>{stats?.pct ?? 0}%</strong>
              <span>of the level done</span>
            </div>
          </div>
          <div className="complete-actions">
            {nextLevel && (
              <button
                type="button"
                className="primary"
                onClick={() => navigate(`/track/${track.id}/${nextLevel}`)}
              >
                Start {LEVEL_META[nextLevel].name} →
              </button>
            )}
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setCelebrating(false)
                goTo(0)
              }}
            >
              Review from the start
            </button>
            <Link to={`/track/${track.id}`} className="ghost btnish">
              Back to levels
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="lesson-wrap" style={{ '--accent': meta.accent } as CSSProperties}>
      <div ref={topRef} />

      <nav className="crumbs">
        <Link to="/">Languages</Link>
        {(track.id === 'cpp' || track.id === 'cpp-gl') && (
          <>
            <span>/</span>
            <Link to="/cpp">C++</Link>
          </>
        )}
        <span>/</span>
        <Link to={`/track/${track.id}`}>{track.name}</Link>
        <span>/</span>
        <strong>{meta.name}</strong>
      </nav>

      <header className="lesson-head">
        <div className="lesson-head-top">
          <div>
            <p className="lesson-kicker">
              {track.name} · {meta.name}
            </p>
            <h1>{level.title}</h1>
          </div>
          <button type="button" className="ghost tiny" onClick={() => setShowMap((s) => !s)}>
            {showMap ? 'Hide steps' : `Step ${index + 1} of ${level.steps.length}`}
          </button>
        </div>
        <ProgressBar
          pct={stats?.pct ?? 0}
          accent={meta.accent}
          label={`${stats?.done ?? 0} / ${level.steps.length} done`}
          thin
        />
      </header>

      {showMap && (
        <ol className="step-map">
          {level.steps.map((s, i) => {
            const done = record?.completed.includes(s.id) ?? false
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`map-item ${i === index ? 'on' : ''} ${done ? 'done' : ''}`}
                  onClick={() => goTo(i)}
                >
                  <span className="map-num">{done ? '✓' : i + 1}</span>
                  <span className="map-title">{s.title}</span>
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="map-item reset"
              onClick={() => {
                if (
                  window.confirm(
                    `Reset all progress for ${track.name} · ${meta.name}? This cannot be undone.`,
                  )
                ) {
                  resetLevel(track.id, level.id)
                  setIndex(0)
                  setShowMap(false)
                }
              }}
            >
              <span className="map-num">↺</span>
              <span className="map-title">Reset this level</span>
            </button>
          </li>
        </ol>
      )}

      <article className="step">
        <div className="step-stage">
          <span className="stage-dot on">1 · Read</span>
          <span className="stage-dot on">2 · Sample</span>
          <span className="stage-dot on">3 · Answer</span>
        </div>

        <h2 className="step-title">
          <span className="step-index">{index + 1}</span>
          {step.title}
        </h2>

        <section className="read">
          <Markdown text={step.read} />
        </section>

        <section className="sample">
          <h3 className="mini-head">Worked sample</h3>
          <CodeBlock
            lang={step.sample.lang}
            code={step.sample.code}
            caption={step.sample.caption}
            output={step.sample.output}
          />
        </section>

        <QuestionCard
          key={step.id}
          question={step.question}
          alreadyDone={stepDone}
          onResolve={onResolve}
          isLastStep={isLast}
          onContinue={() => {
            if (isLast) setCelebrating(true)
            else goTo(index + 1)
          }}
        />
      </article>

      <nav className="step-nav">
        <button
          type="button"
          className="ghost"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          ← Previous
        </button>
        <span className="step-count">
          {index + 1} / {level.steps.length}
        </span>
        <button
          type="button"
          className="ghost"
          disabled={isLast}
          onClick={() => goTo(index + 1)}
        >
          Skip ahead →
        </button>
      </nav>
    </div>
  )
}
