import { useMemo, useState } from 'react'
import { highlight } from '../lib/highlight'
import type { CodeLang } from '../content/types'

const LANG_LABEL: Record<CodeLang, string> = {
  python: 'Python',
  cpp: 'C++',
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  glsl: 'GLSL',
  bash: 'Terminal',
  text: 'Output',
  json: 'JSON',
  toml: 'TOML',
  cmake: 'CMake',
  powershell: 'PowerShell',
  sql: 'SQL',
}

interface Props {
  code: string
  lang: CodeLang
  caption?: string
  /** Program output shown underneath, the way a terminal would print it. */
  output?: string
  /** Smaller, chrome-free variant used inside lesson prose. */
  compact?: boolean
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  lang,
  caption,
  output,
  compact = false,
  showLineNumbers = !compact,
}: Props) {
  const [copied, setCopied] = useState(false)
  const source = code.replace(/\s+$/, '')
  const tokens = useMemo(() => highlight(source, lang), [source, lang])
  const lineCount = source.split('\n').length

  async function copy() {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked (http, or an old iOS webview) — nothing to do */
    }
  }

  return (
    <figure className={compact ? 'code compact' : 'code'}>
      {!compact && (
        <figcaption className="code-head">
          <span className="code-lang">{LANG_LABEL[lang] ?? lang}</span>
          {caption && <span className="code-caption">{caption}</span>}
          <button type="button" className="ghost tiny" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </figcaption>
      )}
      <div className="code-body">
        {showLineNumbers && (
          <div className="gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, n) => (
              <span key={n}>{n + 1}</span>
            ))}
          </div>
        )}
        <pre>
          <code>
            {tokens.map((token, index) => (
              <span key={index} className={`t-${token.type}`}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {output && (
        <div className="code-output">
          <span className="out-label">Output</span>
          <pre>{output.replace(/\s+$/, '')}</pre>
        </div>
      )}
    </figure>
  )
}
