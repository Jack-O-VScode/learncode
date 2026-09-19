import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { LevelId, TrackId } from '../content/types'

/**
 * Progress is saved after **every single answer**, so closing the tab halfway
 * through "Python · Beginner" and coming back later — on another device —
 * drops you on the exact step you stopped at.
 *
 * Two copies are kept:
 *   - `localStorage`, written synchronously, so the app is instant and works
 *     with no connection at all;
 *   - a `progress` row per (user, track, level) in Supabase, so it follows you
 *     between devices.
 * On sign-in the two are merged by "keep the most progress", never by blindly
 * overwriting, so an offline session can't wipe out cloud progress.
 */

export interface LevelProgress {
  /** Step the learner should be dropped back onto. */
  stepIndex: number
  /** Step ids answered correctly (order not meaningful). */
  completed: string[]
  attempts: number
  correct: number
  finished: boolean
  /** ISO timestamp of the last change. */
  updatedAt: string
}

export type ProgressMap = Record<string, LevelProgress>

export type AnswerOutcome = 'correct' | 'revealed' | 'wrong'

export const progressKey = (track: TrackId, level: LevelId) => `${track}:${level}`

export function emptyProgress(): LevelProgress {
  return {
    stepIndex: 0,
    completed: [],
    attempts: 0,
    correct: 0,
    finished: false,
    updatedAt: new Date(0).toISOString(),
  }
}

/** Keeps whichever value represents more work done, field by field. */
function mergeProgress(a: LevelProgress, b: LevelProgress): LevelProgress {
  const completed = [...new Set([...a.completed, ...b.completed])]
  return {
    stepIndex: Math.max(a.stepIndex, b.stepIndex),
    completed,
    attempts: Math.max(a.attempts, b.attempts),
    correct: Math.max(a.correct, b.correct),
    finished: a.finished || b.finished,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  }
}

type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'local'

interface ProgressState {
  progress: ProgressMap
  ready: boolean
  sync: SyncState
  get: (track: TrackId, level: LevelId) => LevelProgress
  /** Records the result of one answered question and saves immediately. */
  recordAnswer: (args: {
    track: TrackId
    level: LevelId
    stepId: string
    stepIndex: number
    /**
     * `correct`  — got it, counts towards the score.
     * `revealed` — looked at the answer; the step counts as done but not as a
     *              point, so the score stays honest and nobody gets stuck.
     * `wrong`    — a miss; the learner stays on the step and tries again.
     */
    outcome: AnswerOutcome
    totalSteps: number
  }) => void
  /** Moves the resume point without grading anything (plain navigation). */
  setStepIndex: (track: TrackId, level: LevelId, stepIndex: number) => void
  resetLevel: (track: TrackId, level: LevelId) => void
}

const ProgressContext = createContext<ProgressState | null>(null)

const localKey = (userId: string) => `learncode.progress.${userId}`

function readLocal(userId: string): ProgressMap {
  try {
    const raw = localStorage.getItem(localKey(userId))
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function writeLocal(userId: string, map: ProgressMap) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(map))
  } catch {
    /* private mode / quota — the cloud copy is still authoritative */
  }
}

interface ProgressRow {
  track: string
  level: string
  step_index: number
  completed_steps: string[] | null
  attempts: number | null
  correct: number | null
  finished: boolean | null
  updated_at: string | null
}

function rowToProgress(row: ProgressRow): LevelProgress {
  return {
    stepIndex: row.step_index ?? 0,
    completed: row.completed_steps ?? [],
    attempts: row.attempts ?? 0,
    correct: row.correct ?? 0,
    finished: row.finished ?? false,
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressMap>({})
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<SyncState>(supabase ? 'idle' : 'local')

  // Keys that failed to reach Supabase and should be retried on the next save.
  const pending = useRef<Set<string>>(new Set())
  // Serialises writes so two fast answers can't land out of order.
  const chain = useRef<Promise<void>>(Promise.resolve())
  const latest = useRef<ProgressMap>({})
  latest.current = progress

  /* ------------------------------- saving -------------------------------- */

  /** Pushes every key in `pending` up to Supabase in one upsert. */
  const flush = useCallback(async (userId: string, map: ProgressMap) => {
    if (!supabase) return
    const keys = [...pending.current]
    if (keys.length === 0) return
    const rows = keys
      .map((key) => {
        const value = map[key]
        if (!value) return null
        const [track, level] = key.split(':')
        return {
          user_id: userId,
          track,
          level,
          step_index: value.stepIndex,
          completed_steps: value.completed,
          attempts: value.attempts,
          correct: value.correct,
          finished: value.finished,
          updated_at: value.updatedAt,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length === 0) return
    setSync('saving')
    const { error } = await supabase
      .from('progress')
      .upsert(rows, { onConflict: 'user_id,track,level' })

    if (error) {
      console.warn('[learncode] progress save failed, will retry:', error.message)
      setSync('offline')
      return // keys stay in `pending` and go up with the next save
    }
    for (const key of keys) pending.current.delete(key)
    setSync('saved')
  }, [])

  /* ------------------------------ loading ------------------------------- */

  useEffect(() => {
    let active = true
    if (!user) {
      setProgress({})
      setReady(false)
      return
    }

    const local = readLocal(user.id)
    setProgress(local)

    if (!supabase) {
      setReady(true)
      setSync('local')
      return
    }

    void (async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('track, level, step_index, completed_steps, attempts, correct, finished, updated_at')
        .eq('user_id', user.id)

      if (!active) return

      if (error) {
        console.warn('[learncode] could not load cloud progress:', error.message)
        setSync('offline')
        setReady(true)
        return
      }

      const merged: ProgressMap = { ...local }
      for (const row of (data ?? []) as ProgressRow[]) {
        const key = `${row.track}:${row.level}`
        const cloud = rowToProgress(row)
        merged[key] = merged[key] ? mergeProgress(merged[key], cloud) : cloud
      }

      // Anything where the local copy knew more than the cloud gets pushed up.
      for (const [key, value] of Object.entries(merged)) {
        const row = (data ?? []).find(
          (r) => `${(r as ProgressRow).track}:${(r as ProgressRow).level}` === key,
        ) as ProgressRow | undefined
        const cloud = row ? rowToProgress(row) : null
        if (
          !cloud ||
          cloud.completed.length !== value.completed.length ||
          cloud.stepIndex !== value.stepIndex ||
          cloud.finished !== value.finished
        ) {
          pending.current.add(key)
        }
      }

      setProgress(merged)
      writeLocal(user.id, merged)
      setReady(true)
      setSync('saved')
      if (pending.current.size > 0) void flush(user.id, merged)
    })()

    return () => {
      active = false
    }
  }, [user, flush])

  const commit = useCallback(
    (key: string, update: (prev: LevelProgress) => LevelProgress) => {
      if (!user) return
      setProgress((prev) => {
        const next = {
          ...prev,
          [key]: { ...update(prev[key] ?? emptyProgress()), updatedAt: new Date().toISOString() },
        }
        latest.current = next
        writeLocal(user.id, next)
        return next
      })
      pending.current.add(key)
      // Queue the write behind any in-flight one so ordering is preserved.
      chain.current = chain.current
        .then(() => flush(user.id, latest.current))
        .catch(() => undefined)
    },
    [user, flush],
  )

  const recordAnswer = useCallback<ProgressState['recordAnswer']>(
    ({ track, level, stepId, stepIndex, outcome, totalSteps }) => {
      commit(progressKey(track, level), (prev) => {
        const done = outcome !== 'wrong'
        const alreadyDone = prev.completed.includes(stepId)
        const completed = done && !alreadyDone ? [...prev.completed, stepId] : prev.completed
        // Resume on the next unanswered step, but never walk backwards.
        const resumeAt = done ? Math.min(stepIndex + 1, totalSteps - 1) : stepIndex
        return {
          ...prev,
          completed,
          stepIndex: Math.max(prev.stepIndex, resumeAt),
          attempts: prev.attempts + 1,
          correct: prev.correct + (outcome === 'correct' && !alreadyDone ? 1 : 0),
          finished: completed.length >= totalSteps,
        }
      })
    },
    [commit],
  )

  const setStepIndex = useCallback<ProgressState['setStepIndex']>(
    (track, level, stepIndex) => {
      const key = progressKey(track, level)
      const current = latest.current[key]
      if (current && current.stepIndex === stepIndex) return
      commit(key, (prev) => ({ ...prev, stepIndex }))
    },
    [commit],
  )

  const resetLevel = useCallback<ProgressState['resetLevel']>(
    (track, level) => {
      commit(progressKey(track, level), () => emptyProgress())
    },
    [commit],
  )

  const get = useCallback<ProgressState['get']>(
    (track, level) => progress[progressKey(track, level)] ?? emptyProgress(),
    [progress],
  )

  // A save that failed while offline should go up as soon as we're back.
  useEffect(() => {
    if (!user || !supabase) return
    const onOnline = () => {
      if (pending.current.size > 0) void flush(user.id, latest.current)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user, flush])

  const value = useMemo<ProgressState>(
    () => ({ progress, ready, sync, get, recordAnswer, setStepIndex, resetLevel }),
    [progress, ready, sync, get, recordAnswer, setStepIndex, resetLevel],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressState {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>')
  return ctx
}
