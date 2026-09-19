import { Fragment, type ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'
import { isHighlightable } from '../lib/highlight'
import type { CodeLang } from '../content/types'

/**
 * A deliberately small Markdown subset for lesson text — enough to write clear
 * lessons, small enough to render straight to React elements (so no HTML is
 * ever injected).
 *
 * Supported:  ## heading   ### sub-heading   paragraphs   - bullets
 *             1. numbered   > callout   ```lang fenced code```
 *             **bold**   *italic*   `inline code`
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const parts = text.split(INLINE)
  parts.forEach((part, index) => {
    if (!part) return
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push(<strong key={key}>{part.slice(2, -2)}</strong>)
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      out.push(
        <code className="inline-code" key={key}>
          {part.slice(1, -1)}
        </code>,
      )
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      out.push(<em key={key}>{part.slice(1, -1)}</em>)
    } else {
      out.push(<Fragment key={key}>{part}</Fragment>)
    }
  })
  return out
}

type Block =
  | { kind: 'h'; level: 2 | 3; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: CodeLang; source: string }

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    if (line.startsWith('```')) {
      // A fence may name a language we have no scanner for (toml, json,
      // cmake, …). Fall back to plain text rather than rendering nothing.
      const label = line.slice(3).trim().toLowerCase()
      const lang = (isHighlightable(label) ? label : 'text') as CodeLang
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ kind: 'code', lang, source: body.join('\n') })
      continue
    }

    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h', level: 3, text: line.slice(4) })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ kind: 'h', level: 2, text: line.slice(3) })
      i++
      continue
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    if (line.startsWith('> ')) {
      const body: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        body.push(lines[i].slice(2))
        i++
      }
      blocks.push({ kind: 'quote', text: body.join(' ') })
      continue
    }

    // Plain paragraph: keep consuming until a blank line or a new block starts.
    const body: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('> ') &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      body.push(lines[i])
      i++
    }
    blocks.push({ kind: 'p', text: body.join(' ') })
  }

  return blocks
}

export function Markdown({ text }: { text: string }) {
  const blocks = parse(text)
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const key = `b${index}`
        switch (block.kind) {
          case 'h':
            return block.level === 2 ? (
              <h3 key={key}>{renderInline(block.text, key)}</h3>
            ) : (
              <h4 key={key}>{renderInline(block.text, key)}</h4>
            )
          case 'p':
            return <p key={key}>{renderInline(block.text, key)}</p>
          case 'ul':
            return (
              <ul key={key}>
                {block.items.map((item, n) => (
                  <li key={n}>{renderInline(item, `${key}-${n}`)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key}>
                {block.items.map((item, n) => (
                  <li key={n}>{renderInline(item, `${key}-${n}`)}</li>
                ))}
              </ol>
            )
          case 'quote':
            return (
              <blockquote key={key}>{renderInline(block.text, key)}</blockquote>
            )
          case 'code':
            return <CodeBlock key={key} lang={block.lang} code={block.source} compact />
        }
      })}
    </div>
  )
}
