import type { Question } from '../content/types'

/** Squashes a one-line answer so spacing never decides right vs. wrong. */
export function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Same idea for multi-line code: keep line breaks, ignore indentation. */
export function normalizeCode(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim()
}

export function gradeAnswer(question: Question, raw: string | number): boolean {
  switch (question.kind) {
    case 'mcq':
      return raw === question.answer

    case 'fill': {
      if (typeof raw !== 'string') return false
      const given = normalizeLine(raw)
      if (!given) return false
      return question.accept.some((candidate) => {
        const want = normalizeLine(candidate)
        return question.caseSensitive
          ? want === given
          : want.toLowerCase() === given.toLowerCase()
      })
    }

    case 'code': {
      if (typeof raw !== 'string') return false
      const given = normalizeCode(raw)
      if (!given) return false
      if (question.accept?.some((candidate) => normalizeCode(candidate) === given)) {
        return true
      }
      if (question.mustInclude && question.mustInclude.length > 0) {
        return question.mustInclude.every((pattern) => new RegExp(pattern).test(raw))
      }
      return false
    }
  }
}
