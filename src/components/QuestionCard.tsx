import { useEffect, useRef, useState } from 'react'
import { CodeBlock } from './CodeBlock'
import { Markdown } from './Markdown'
import { gradeAnswer } from '../lib/grade'
import type { Question } from '../content/types'
import type { AnswerOutcome } from '../lib/progress'

interface Props {
  question: Question
  /** Fires on every submission; `wrong` may fire many times for one step. */
  onResolve: (outcome: AnswerOutcome) => void
  /** True once this step has been cleared before (revisiting an old step). */
  alreadyDone: boolean
  /** Called when the learner is ready to move on. */
  onContinue: () => void
  isLastStep: boolean
}

type Status = 'idle' | 'wrong' | 'correct' | 'revealed'

export function QuestionCard({
  question,
  onResolve,
  alreadyDone,
  onContinue,
  isLastStep,
}: Props) {
  const [choice, setChoice] = useState<number | null>(null)
  const [text, setText] = useState(question.kind === 'code' ? (question.starter ?? '') : '')
  const [status, setStatus] = useState<Status>('idle')
  const [wrongCount, setWrongCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const continueRef = useRef<HTMLButtonElement | null>(null)
  // Freeze on mount: answering now shouldn't make the badge claim you had
  // already answered this step before. The parent remounts us per step.
  const seenBefore = useRef(alreadyDone).current

  // Reset whenever the parent swaps in a different question.
  useEffect(() => {
    setChoice(null)
    setText(question.kind === 'code' ? (question.starter ?? '') : '')
    setStatus('idle')
    setWrongCount(0)
    setShowHint(false)
  }, [question])

  useEffect(() => {
    if (status === 'correct' || status === 'revealed') continueRef.current?.focus()
  }, [status])

  const resolved = status === 'correct' || status === 'revealed'

  function submit() {
    if (resolved) return
    const raw = question.kind === 'mcq' ? (choice ?? -1) : text
    if (question.kind === 'mcq' && choice === null) return
    if (question.kind !== 'mcq' && !text.trim()) return

    if (gradeAnswer(question, raw)) {
      setStatus('correct')
      onResolve('correct')
    } else {
      setStatus('wrong')
      setWrongCount((n) => n + 1)
      onResolve('wrong')
    }
  }

  function reveal() {
    setStatus('revealed')
    onResolve('revealed')
  }

  const revealable = question.kind === 'code' || question.kind === 'fill' || question.kind === 'mcq'
  const revealedAnswer =
    question.kind === 'mcq'
      ? question.options[question.answer]
      : question.kind === 'fill'
        ? question.accept[0]
        : question.solution

  return (
    <section className={`qcard ${status}`}>
      <header className="qcard-head">
        <span className="q-badge">Your turn</span>
        {seenBefore && <span className="q-done">Answered before ✓</span>}
      </header>

      <div className="q-prompt">
        <Markdown text={question.prompt} />
      </div>

      {question.kind !== 'code' && question.code && (
        <CodeBlock lang={question.code.lang} code={question.code.source} showLineNumbers={false} />
      )}

      {question.kind === 'mcq' && (
        <ul className="options">
          {question.options.map((option, index) => {
            const isPicked = choice === index
            const isAnswer = index === question.answer
            let state = ''
            if (resolved && isAnswer) state = 'right'
            else if (status === 'wrong' && isPicked) state = 'miss'
            else if (isPicked) state = 'picked'
            return (
              <li key={index}>
                <button
                  type="button"
                  className={`option ${state}`}
                  disabled={resolved}
                  onClick={() => {
                    setChoice(index)
                    if (status === 'wrong') setStatus('idle')
                  }}
                >
                  <span className="option-key">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {question.kind === 'fill' && (
        <input
          className="answer-input"
          type="text"
          value={text}
          placeholder={question.placeholder ?? 'Type your answer'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={resolved}
          onChange={(e) => {
            setText(e.target.value)
            if (status === 'wrong') setStatus('idle')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
      )}

      {question.kind === 'code' && (
        <textarea
          className="answer-code"
          value={text}
          rows={Math.max(5, text.split('\n').length + 1)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          disabled={resolved}
          placeholder="Write your code here"
          onChange={(e) => {
            setText(e.target.value)
            if (status === 'wrong') setStatus('idle')
          }}
          onKeyDown={(e) => {
            // Tab should indent, not jump to the next control.
            if (e.key === 'Tab') {
              e.preventDefault()
              const el = e.currentTarget
              const start = el.selectionStart
              const end = el.selectionEnd
              const next = `${text.slice(0, start)}    ${text.slice(end)}`
              setText(next)
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 4
              })
            }
          }}
        />
      )}

      <div className="qcard-actions">
        {!resolved && (
          <button type="button" className="primary" onClick={submit}>
            Check my answer
          </button>
        )}
        {!resolved && question.hint && !showHint && (
          <button type="button" className="ghost" onClick={() => setShowHint(true)}>
            Give me a hint
          </button>
        )}
        {!resolved && revealable && wrongCount >= 1 && (
          <button type="button" className="ghost" onClick={reveal}>
            Show me the answer
          </button>
        )}
        {resolved && (
          <button type="button" className="primary" ref={continueRef} onClick={onContinue}>
            {isLastStep ? 'Finish this level' : 'Next step'}
          </button>
        )}
      </div>

      {showHint && !resolved && question.hint && (
        <p className="hint">💡 {question.hint}</p>
      )}

      {status === 'wrong' && (
        <p className="feedback miss">
          Not quite — have another go.
          {wrongCount >= 2 && ' Re-read the sample above; the answer is in there.'}
        </p>
      )}

      {resolved && (
        <div className={`feedback ${status === 'correct' ? 'right' : 'shown'}`}>
          <p className="feedback-title">
            {status === 'correct' ? '✅ Correct' : '👀 Here is the answer'}
          </p>
          {status === 'revealed' && (
            <CodeBlock
              lang={question.kind === 'code' ? question.lang : (question.code?.lang ?? 'text')}
              code={revealedAnswer}
              showLineNumbers={false}
              compact
            />
          )}
          <Markdown text={question.explain} />
        </div>
      )}
    </section>
  )
}
