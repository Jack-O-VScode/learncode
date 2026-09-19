#!/usr/bin/env node
/**
 * Checks the whole course for the mistakes that are invisible until a learner
 * hits them — most importantly, that every question's own model answer
 * actually passes its own grader.
 *
 * A `code` question whose regexes don't match its published solution would
 * tell a correct learner they are wrong, so this runs in CI.
 *
 *   npm run verify-content
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const KNOWN_LANGS = new Set([
  'python', 'cpp', 'html', 'css', 'js', 'glsl', 'text', 'bash',
  'json', 'toml', 'cmake', 'powershell', 'sql',
])
const LEVELS = ['beginner', 'amateur', 'intermediate', 'skilled', 'pro']

/* -- compile the TypeScript content to CommonJS so we can actually run it -- */

const outDir = mkdtempSync(join(tmpdir(), 'learncode-verify-'))
try {
  execFileSync(
    'npx',
    [
      'tsc',
      'src/content/index.ts',
      'src/lib/grade.ts',
      '--outDir', outDir,
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--target', 'es2022',
      '--skipLibCheck',
      '--esModuleInterop',
    ],
    { cwd: ROOT, stdio: 'inherit' },
  )
} catch {
  console.error('\n✗ content failed to compile')
  process.exit(1)
}

const require = createRequire(pathToFileURL(join(outDir, 'placeholder.cjs')))
const { TRACKS, ALL_TRACK_IDS } = require(join(outDir, 'content', 'index.js'))
const { gradeAnswer } = require(join(outDir, 'lib', 'grade.js'))

/* --------------------------------- checks -------------------------------- */

const errors = []
const warnings = []
const seenStepIds = new Map()

let stepCount = 0
let questionCounts = { mcq: 0, fill: 0, code: 0 }

for (const trackId of ALL_TRACK_IDS) {
  const track = TRACKS[trackId]
  if (!track) {
    errors.push(`track "${trackId}" is missing from TRACKS`)
    continue
  }

  for (const levelId of LEVELS) {
    const level = track.levels[levelId]
    const where = `${trackId}/${levelId}`

    if (!level) {
      errors.push(`${where}: level missing`)
      continue
    }
    if (level.id !== levelId) {
      errors.push(`${where}: level.id is "${level.id}" but it is filed under "${levelId}"`)
    }
    if (!level.title?.trim()) errors.push(`${where}: empty title`)
    if (!level.summary?.trim()) errors.push(`${where}: empty summary`)
    if (!Array.isArray(level.outcomes) || level.outcomes.length === 0) {
      errors.push(`${where}: no outcomes listed`)
    }
    if (!Array.isArray(level.steps) || level.steps.length === 0) {
      errors.push(`${where}: no steps`)
      continue
    }
    if (level.steps.length < 8) {
      warnings.push(`${where}: only ${level.steps.length} steps`)
    }

    for (const [index, step] of level.steps.entries()) {
      stepCount++
      const at = `${where}#${index + 1} (${step.id})`

      if (!step.id?.trim()) errors.push(`${at}: missing id`)
      else if (seenStepIds.has(step.id)) {
        errors.push(`${at}: duplicate step id, also used by ${seenStepIds.get(step.id)}`)
      } else {
        seenStepIds.set(step.id, at)
      }

      if (!step.title?.trim()) errors.push(`${at}: empty title`)
      if (!step.read?.trim()) errors.push(`${at}: empty read text`)
      if (step.read && step.read.length < 200) {
        warnings.push(`${at}: read text is only ${step.read.length} characters`)
      }
      // The markdown subset has no table support, so a pipe row renders as prose.
      if (/^\s*\|.*\|\s*$/m.test(step.read ?? '')) {
        errors.push(`${at}: read text contains a markdown table, which does not render`)
      }
      // Unbalanced fences leave the rest of the lesson inside a code block.
      const fences = (step.read?.match(/^```/gm) ?? []).length
      if (fences % 2 !== 0) {
        errors.push(`${at}: read text has an unclosed \`\`\` fence`)
      }
      // A fence language with no scanner used to crash the whole lesson.
      // It now degrades to plain text, but flag it so it can be labelled well.
      for (const fence of step.read?.match(/^```(\w+)/gm) ?? []) {
        const label = fence.slice(3).toLowerCase()
        if (!KNOWN_LANGS.has(label)) {
          warnings.push(`${at}: fence language "${label}" renders as plain text`)
        }
      }

      if (!step.sample) {
        errors.push(`${at}: no worked sample`)
      } else {
        if (!step.sample.code?.trim()) errors.push(`${at}: sample has no code`)
        if (!KNOWN_LANGS.has(step.sample.lang)) {
          errors.push(`${at}: unknown sample language "${step.sample.lang}"`)
        }
      }

      const question = step.question
      if (!question) {
        errors.push(`${at}: no question`)
        continue
      }
      if (!question.prompt?.trim()) errors.push(`${at}: question has no prompt`)
      if (!question.explain?.trim()) errors.push(`${at}: question has no explanation`)

      questionCounts[question.kind] = (questionCounts[question.kind] ?? 0) + 1

      switch (question.kind) {
        case 'mcq': {
          if (!Array.isArray(question.options) || question.options.length < 2) {
            errors.push(`${at}: mcq needs at least two options`)
            break
          }
          if (question.options.length > 6) {
            warnings.push(`${at}: ${question.options.length} options is a lot`)
          }
          if (
            !Number.isInteger(question.answer) ||
            question.answer < 0 ||
            question.answer >= question.options.length
          ) {
            errors.push(
              `${at}: answer index ${question.answer} is out of range (0-${question.options.length - 1})`,
            )
            break
          }
          if (new Set(question.options).size !== question.options.length) {
            errors.push(`${at}: mcq has duplicate options`)
          }
          if (!gradeAnswer(question, question.answer)) {
            errors.push(`${at}: grader rejects the mcq's own answer index`)
          }
          for (let wrong = 0; wrong < question.options.length; wrong++) {
            if (wrong !== question.answer && gradeAnswer(question, wrong)) {
              errors.push(`${at}: grader accepts wrong option ${wrong}`)
            }
          }
          break
        }

        case 'fill': {
          if (!Array.isArray(question.accept) || question.accept.length === 0) {
            errors.push(`${at}: fill question accepts nothing`)
            break
          }
          for (const answer of question.accept) {
            if (!gradeAnswer(question, answer)) {
              errors.push(`${at}: grader rejects its own accepted answer ${JSON.stringify(answer)}`)
            }
          }
          // A blank answer must never pass.
          if (gradeAnswer(question, '')) {
            errors.push(`${at}: grader accepts an empty answer`)
          }
          break
        }

        case 'code': {
          if (!question.solution?.trim()) {
            errors.push(`${at}: code question has no solution`)
            break
          }
          if (!KNOWN_LANGS.has(question.lang)) {
            errors.push(`${at}: unknown code language "${question.lang}"`)
          }
          if (!question.mustInclude?.length && !question.accept?.length) {
            errors.push(`${at}: code question has no grading criteria`)
            break
          }
          for (const pattern of question.mustInclude ?? []) {
            try {
              new RegExp(pattern)
            } catch (error) {
              errors.push(`${at}: invalid regex ${JSON.stringify(pattern)} — ${error.message}`)
            }
          }
          // The big one: the published solution must pass its own grader.
          if (!gradeAnswer(question, question.solution)) {
            errors.push(`${at}: the grader REJECTS this question's own solution`)
            for (const pattern of question.mustInclude ?? []) {
              if (!new RegExp(pattern).test(question.solution)) {
                errors.push(`${at}:   unmatched pattern ${JSON.stringify(pattern)}`)
              }
            }
          }
          if (gradeAnswer(question, '')) {
            errors.push(`${at}: grader accepts an empty answer`)
          }
          break
        }

        default:
          errors.push(`${at}: unknown question kind "${question.kind}"`)
      }
    }
  }
}

/* --------------------------------- report -------------------------------- */

rmSync(outDir, { recursive: true, force: true })

console.log('')
for (const trackId of ALL_TRACK_IDS) {
  const track = TRACKS[trackId]
  if (!track) continue
  const counts = LEVELS.map((id) => track.levels[id]?.steps.length ?? 0)
  const total = counts.reduce((sum, n) => sum + n, 0)
  console.log(`  ${track.name.padEnd(16)} ${String(total).padStart(3)} steps  [${counts.join(' ')}]`)
}
console.log('')
console.log(`  ${stepCount} steps total`)
console.log(
  `  questions: ${questionCounts.mcq ?? 0} multiple choice, ` +
    `${questionCounts.fill ?? 0} short answer, ${questionCounts.code ?? 0} code`,
)
console.log('')

for (const warning of warnings) console.log(`  ! ${warning}`)
if (warnings.length > 0) console.log('')

if (errors.length > 0) {
  for (const error of errors) console.error(`  ✗ ${error}`)
  console.error(`\n${errors.length} problem(s) found.\n`)
  process.exit(1)
}

console.log('  ✓ every question passes its own grader\n')
