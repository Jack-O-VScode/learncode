/**
 * The shape of every lesson in the course.
 *
 * A "step" is one full turn of the learning loop the app is built around:
 *
 *     read  ->  look at a worked sample  ->  answer a question
 *
 * A "level" is a difficulty (beginner ... pro) and is simply a long list of
 * steps. A "track" is a language — or, for C++, a language *mode* (plain C++ vs
 * C++ with OpenGL), because those are picked before the difficulty is.
 */

export type LevelId = 'beginner' | 'amateur' | 'intermediate' | 'skilled' | 'pro'

export const LEVEL_ORDER: LevelId[] = [
  'beginner',
  'amateur',
  'intermediate',
  'skilled',
  'pro',
]

export const LEVEL_META: Record<
  LevelId,
  { name: string; tag: string; accent: string }
> = {
  beginner: {
    name: 'Beginner',
    tag: 'Never written a line of code',
    accent: '#34d399',
  },
  amateur: {
    name: 'Amateur',
    tag: 'You know the basics, now build things',
    accent: '#38bdf8',
  },
  intermediate: {
    name: 'Intermediate',
    tag: 'Structure, data and real programs',
    accent: '#a78bfa',
  },
  skilled: {
    name: 'Skilled',
    tag: 'Design, performance and tooling',
    accent: '#fb923c',
  },
  pro: {
    name: 'Pro',
    tag: 'The deep end — how it really works',
    accent: '#f472b6',
  },
}

/** Languages the syntax highlighter understands. */
export type CodeLang =
  | 'python'
  | 'cpp'
  | 'html'
  | 'css'
  | 'js'
  | 'glsl'
  | 'text'
  | 'bash'
  | 'json'
  | 'toml'
  | 'cmake'

export type Question =
  | {
      kind: 'mcq'
      prompt: string
      /** Optional code the question refers to. */
      code?: { lang: CodeLang; source: string }
      options: string[]
      /** Index into `options`. */
      answer: number
      explain: string
      hint?: string
    }
  | {
      kind: 'fill'
      prompt: string
      code?: { lang: CodeLang; source: string }
      /** Placeholder shown in the input box. */
      placeholder?: string
      /** Any of these (whitespace-normalised) counts as correct. */
      accept: string[]
      /** Defaults to false — most short answers are graded loosely. */
      caseSensitive?: boolean
      explain: string
      hint?: string
    }
  | {
      kind: 'code'
      prompt: string
      /** Pre-filled starting point for the editor box. */
      starter?: string
      lang: CodeLang
      /**
       * Every regular expression here must match the learner's answer.
       * Written as regex source strings so content files stay plain data.
       */
      mustInclude?: string[]
      /** Exact (whitespace-normalised) answers that always pass. */
      accept?: string[]
      /** Shown by the "Show me" button and after a correct answer. */
      solution: string
      explain: string
      hint?: string
    }

export interface Sample {
  lang: CodeLang
  code: string
  /** One line above the code saying what to look at. */
  caption?: string
  /** What the program prints / renders, shown under the sample. */
  output?: string
}

export interface Step {
  /** Stable id — progress is keyed on it, so never renumber an existing step. */
  id: string
  title: string
  /** Markdown-lite: ##, paragraphs, - lists, 1. lists, > callouts, `code`, **bold**, ```fences``` */
  read: string
  sample: Sample
  question: Question
}

export interface Level {
  id: LevelId
  title: string
  summary: string
  /** What the learner can do once this level is finished. */
  outcomes: string[]
  steps: Step[]
}

export type TrackId =
  | 'python'
  | 'html'
  | 'cpp'
  | 'cpp-gl'
  // Defensive cybersecurity (blue team), one track per platform.
  | 'blue-linux'
  | 'blue-windows'
  | 'blue-network'
  | 'blue-web'
  // Offensive cybersecurity (red team), authorized-testing framed.
  | 'red-linux'
  | 'red-windows'
  | 'red-network'
  | 'red-web'

export interface Track {
  id: TrackId
  name: string
  /** The subject family. Informational only (not wired to anything yet). */
  language: 'python' | 'html' | 'cpp' | 'security'
  tagline: string
  description: string
  accent: string
  levels: Record<LevelId, Level>
}
