import { LEVEL_ORDER, type LevelId, type Track } from '../content/types'
import { emptyProgress, progressKey, type ProgressMap } from './progress'

export interface LevelStats {
  done: number
  total: number
  pct: number
  finished: boolean
  /** Index to resume on, clamped to a real step. */
  resumeAt: number
  started: boolean
}

export interface TrackStats {
  done: number
  total: number
  pct: number
  levels: Record<LevelId, LevelStats>
  /** The level the learner should carry on with. */
  nextLevel: LevelId
}

export function levelStats(
  track: Track,
  levelId: LevelId,
  progress: ProgressMap,
): LevelStats {
  const level = track.levels[levelId]
  const record = progress[progressKey(track.id, levelId)] ?? emptyProgress()
  const stepIds = new Set(level.steps.map((s) => s.id))
  // Ignore ids from an older version of the course so percentages stay sane.
  const done = record.completed.filter((id) => stepIds.has(id)).length
  const total = level.steps.length
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    finished: done >= total,
    resumeAt: Math.min(Math.max(record.stepIndex, 0), Math.max(total - 1, 0)),
    started: done > 0 || record.stepIndex > 0,
  }
}

export function trackStats(track: Track, progress: ProgressMap): TrackStats {
  const levels = {} as Record<LevelId, LevelStats>
  let done = 0
  let total = 0
  for (const id of LEVEL_ORDER) {
    const stats = levelStats(track, id, progress)
    levels[id] = stats
    done += stats.done
    total += stats.total
  }
  const nextLevel =
    LEVEL_ORDER.find((id) => levels[id].started && !levels[id].finished) ??
    LEVEL_ORDER.find((id) => !levels[id].finished) ??
    'pro'
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    levels,
    nextLevel,
  }
}
