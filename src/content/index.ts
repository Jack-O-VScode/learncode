import type { Level, LevelId, Track, TrackId } from './types'
import { LEVEL_ORDER } from './types'

import pythonBeginner from './python/beginner'
import pythonAmateur from './python/amateur'
import pythonIntermediate from './python/intermediate'
import pythonSkilled from './python/skilled'
import pythonPro from './python/pro'

import htmlBeginner from './html/beginner'
import htmlAmateur from './html/amateur'
import htmlIntermediate from './html/intermediate'
import htmlSkilled from './html/skilled'
import htmlPro from './html/pro'

import cppBeginner from './cpp/beginner'
import cppAmateur from './cpp/amateur'
import cppIntermediate from './cpp/intermediate'
import cppSkilled from './cpp/skilled'
import cppPro from './cpp/pro'

import glBeginner from './cpp-gl/beginner'
import glAmateur from './cpp-gl/amateur'
import glIntermediate from './cpp-gl/intermediate'
import glSkilled from './cpp-gl/skilled'
import glPro from './cpp-gl/pro'

function levels(list: Level[]): Record<LevelId, Level> {
  return {
    beginner: list[0],
    amateur: list[1],
    intermediate: list[2],
    skilled: list[3],
    pro: list[4],
  }
}

export const TRACKS: Record<TrackId, Track> = {
  python: {
    id: 'python',
    name: 'Python',
    language: 'python',
    accent: '#38bdf8',
    tagline: 'The friendliest place to start',
    description:
      'Reads almost like English. Great first language, and the one used for automation, data, AI and back-ends.',
    levels: levels([
      pythonBeginner,
      pythonAmateur,
      pythonIntermediate,
      pythonSkilled,
      pythonPro,
    ]),
  },
  html: {
    id: 'html',
    name: 'HTML',
    language: 'html',
    accent: '#fb923c',
    tagline: 'Build pages you can actually see',
    description:
      'The language of every web page. You will see results instantly in a browser — and pick up CSS and a little JavaScript along the way.',
    levels: levels([htmlBeginner, htmlAmateur, htmlIntermediate, htmlSkilled, htmlPro]),
  },
  cpp: {
    id: 'cpp',
    name: 'C++ · Normal',
    language: 'cpp',
    accent: '#a78bfa',
    tagline: 'Fast, powerful, close to the machine',
    description:
      'The language behind games, engines and high-performance software. You control the memory, and nothing is hidden from you.',
    levels: levels([cppBeginner, cppAmateur, cppIntermediate, cppSkilled, cppPro]),
  },
  'cpp-gl': {
    id: 'cpp-gl',
    name: 'C++ · OpenGL',
    language: 'cpp',
    accent: '#f472b6',
    tagline: 'Same C++, but you draw things on screen',
    description:
      'Every C++ idea is taught through graphics: open a window, push triangles to the GPU, animate them, and end up with a 3D scene you fly through.',
    levels: levels([glBeginner, glAmateur, glIntermediate, glSkilled, glPro]),
  },
}

/** The three choices on the home page. C++ then asks for a mode. */
export interface LanguageCard {
  id: 'python' | 'html' | 'cpp'
  name: string
  blurb: string
  accent: string
  /** Tracks this card leads to (more than one means a mode chooser first). */
  tracks: TrackId[]
}

export const LANGUAGES: LanguageCard[] = [
  {
    id: 'python',
    name: 'Python',
    blurb: 'Start here if you have never coded. Clear, readable, useful everywhere.',
    accent: '#38bdf8',
    tracks: ['python'],
  },
  {
    id: 'html',
    name: 'HTML',
    blurb: 'Make real web pages. Instant visual feedback, plus CSS and a taste of JavaScript.',
    accent: '#fb923c',
    tracks: ['html'],
  },
  {
    id: 'cpp',
    name: 'C++',
    blurb: 'Serious performance. Choose plain C++, or the OpenGL mode that draws graphics.',
    accent: '#a78bfa',
    tracks: ['cpp', 'cpp-gl'],
  },
]

export function getTrack(id: string | undefined): Track | null {
  if (!id) return null
  return (TRACKS as Record<string, Track>)[id] ?? null
}

export function getLevel(track: Track, levelId: string | undefined): Level | null {
  if (!levelId) return null
  if (!LEVEL_ORDER.includes(levelId as LevelId)) return null
  return track.levels[levelId as LevelId] ?? null
}

export function totalStepsInTrack(track: Track): number {
  return LEVEL_ORDER.reduce((sum, id) => sum + track.levels[id].steps.length, 0)
}

export const ALL_TRACK_IDS: TrackId[] = ['python', 'html', 'cpp', 'cpp-gl']
