import type { CodeLang } from '../content/types'

/**
 * A tiny, dependency-free syntax highlighter.
 *
 * It scans source into tokens rather than running regexes over escaped HTML,
 * so the renderer can build plain React elements and we never have to reach for
 * `dangerouslySetInnerHTML`.
 */

export type TokenType =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'type'
  | 'preproc'
  | 'func'
  | 'tag'
  | 'attr'
  | 'punct'

export interface Token {
  type: TokenType
  text: string
}

const PY_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
  'import', 'in', 'is', 'lambda', 'match', 'case', 'nonlocal', 'not', 'or',
  'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
])
const PY_TYPES = new Set([
  'True', 'False', 'None', 'self', 'int', 'float', 'str', 'bool', 'list',
  'dict', 'set', 'tuple', 'bytes', 'object', 'Exception', 'ValueError',
  'TypeError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'print', 'len',
  'range', 'input', 'open', 'sum', 'min', 'max', 'sorted', 'enumerate', 'zip',
  'abs', 'round', 'type', 'isinstance', 'super',
])

const CPP_KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'asm', 'auto', 'break', 'case', 'catch', 'class',
  'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast',
  'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default',
  'delete', 'do', 'dynamic_cast', 'else', 'enum', 'explicit', 'export',
  'extern', 'false', 'for', 'friend', 'goto', 'if', 'inline', 'mutable',
  'namespace', 'new', 'noexcept', 'not', 'nullptr', 'operator', 'or',
  'override', 'private', 'protected', 'public', 'register', 'reinterpret_cast',
  'requires', 'return', 'sizeof', 'static', 'static_assert', 'static_cast',
  'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true',
  'try', 'typedef', 'typeid', 'typename', 'union', 'using', 'virtual',
  'volatile', 'while',
])
const CPP_TYPES = new Set([
  'bool', 'char', 'char8_t', 'char16_t', 'char32_t', 'double', 'float', 'int',
  'long', 'short', 'signed', 'unsigned', 'void', 'wchar_t', 'size_t',
  'string', 'vector', 'map', 'unordered_map', 'set', 'array', 'pair',
  'optional', 'unique_ptr', 'shared_ptr', 'std', 'ostream', 'istream',
  'uint32_t', 'int32_t', 'uint8_t', 'int64_t', 'uint64_t', 'GLuint', 'GLint',
  'GLfloat', 'GLchar', 'GLenum', 'GLsizei', 'GLboolean', 'GLFWwindow',
])

const GLSL_KEYWORDS = new Set([
  'attribute', 'break', 'case', 'const', 'continue', 'default', 'discard',
  'do', 'else', 'flat', 'for', 'if', 'in', 'inout', 'layout', 'location',
  'out', 'precision', 'return', 'smooth', 'struct', 'switch', 'uniform',
  'varying', 'while',
])
const GLSL_TYPES = new Set([
  'bool', 'bvec2', 'bvec3', 'bvec4', 'float', 'int', 'ivec2', 'ivec3', 'ivec4',
  'mat2', 'mat3', 'mat4', 'sampler2D', 'samplerCube', 'vec2', 'vec3', 'vec4',
  'void', 'gl_Position', 'gl_FragCoord', 'gl_FragColor', 'highp', 'mediump',
  'lowp', 'texture', 'mix', 'clamp', 'normalize', 'dot', 'cross', 'length',
])

const JS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
  'extends', 'finally', 'for', 'from', 'function', 'get', 'if', 'import',
  'in', 'instanceof', 'let', 'new', 'of', 'return', 'set', 'static', 'super',
  'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield',
])
const JS_TYPES = new Set([
  'Array', 'Boolean', 'Date', 'Error', 'JSON', 'Map', 'Math', 'Number',
  'Object', 'Promise', 'RegExp', 'Set', 'String', 'Symbol', 'WeakMap',
  'console', 'document', 'window', 'localStorage', 'sessionStorage',
  'navigator', 'crypto', 'true', 'false', 'null', 'undefined', 'NaN',
  'Infinity', 'FormData', 'URL', 'AbortController', 'IntersectionObserver',
  'MutationObserver', 'CustomEvent', 'Event', 'Element', 'HTMLElement',
])

const JSON_TYPES = new Set(['true', 'false', 'null'])

const TOML_KEYWORDS = new Set(['true', 'false'])

const CMAKE_KEYWORDS = new Set([
  'cmake_minimum_required', 'project', 'set', 'add_executable', 'add_library',
  'add_subdirectory', 'add_custom_command', 'add_test', 'target_link_libraries',
  'target_include_directories', 'target_compile_options',
  'target_compile_definitions', 'find_package', 'include', 'option', 'if',
  'else', 'elseif', 'endif', 'foreach', 'endforeach', 'function', 'endfunction',
  'message', 'enable_testing', 'install', 'FetchContent_Declare',
  'FetchContent_MakeAvailable',
])

const BASH_KEYWORDS = new Set([
  'cd', 'echo', 'export', 'if', 'then', 'else', 'fi', 'for', 'do', 'done',
  'while', 'sudo', 'apt', 'brew', 'pip', 'python', 'python3', 'g++', 'clang++',
  'cmake', 'make', 'npm', 'node', 'git',
])

interface LangConfig {
  lineComments: string[]
  blockComment?: [string, string]
  tripleQuotes?: boolean
  preprocessor?: boolean
  keywords: Set<string>
  types: Set<string>
}

const CONFIGS: Record<Exclude<CodeLang, 'html' | 'text'>, LangConfig> = {
  python: {
    lineComments: ['#'],
    tripleQuotes: true,
    keywords: PY_KEYWORDS,
    types: PY_TYPES,
  },
  cpp: {
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    preprocessor: true,
    keywords: CPP_KEYWORDS,
    types: CPP_TYPES,
  },
  glsl: {
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    preprocessor: true,
    keywords: GLSL_KEYWORDS,
    types: GLSL_TYPES,
  },
  js: {
    lineComments: ['//'],
    blockComment: ['/*', '*/'],
    keywords: JS_KEYWORDS,
    types: JS_TYPES,
  },
  css: {
    lineComments: [],
    blockComment: ['/*', '*/'],
    keywords: new Set(),
    types: new Set(),
  },
  bash: {
    lineComments: ['#'],
    keywords: BASH_KEYWORDS,
    types: new Set(),
  },
  json: {
    lineComments: [],
    keywords: new Set(),
    types: JSON_TYPES,
  },
  toml: {
    lineComments: ['#'],
    keywords: TOML_KEYWORDS,
    types: new Set(),
  },
  cmake: {
    lineComments: ['#'],
    keywords: CMAKE_KEYWORDS,
    types: new Set(),
  },
}

const STRING_PREFIXES = new Set(['f', 'r', 'b', 'u', 'rb', 'br', 'fr', 'rf', 'R', 'L', 'u8', 'U'])

const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c)
const isIdent = (c: string) => /[A-Za-z0-9_$]/.test(c)
const isDigit = (c: string) => c >= '0' && c <= '9'

function push(tokens: Token[], type: TokenType, text: string) {
  if (!text) return
  const last = tokens[tokens.length - 1]
  if (last && last.type === type) last.text += text
  else tokens.push({ type, text })
}

function scanGeneric(src: string, cfg: LangConfig): Token[] {
  const tokens: Token[] = []
  let i = 0
  let atLineStart = true

  while (i < src.length) {
    const c = src[i]

    // Preprocessor directives (#include, #version, ...) own the whole line.
    if (cfg.preprocessor && atLineStart && /^[ \t]*#/.test(src.slice(i, i + 40))) {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? src.length : end
      push(tokens, 'preproc', src.slice(i, stop))
      i = stop
      continue
    }

    if (c === '\n') {
      push(tokens, 'plain', c)
      i++
      atLineStart = true
      continue
    }
    if (c !== ' ' && c !== '\t') atLineStart = false

    // Line comments
    const lineComment = cfg.lineComments.find((token) => src.startsWith(token, i))
    if (lineComment) {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? src.length : end
      push(tokens, 'comment', src.slice(i, stop))
      i = stop
      continue
    }

    // Block comments
    if (cfg.blockComment && src.startsWith(cfg.blockComment[0], i)) {
      const end = src.indexOf(cfg.blockComment[1], i + cfg.blockComment[0].length)
      const stop = end === -1 ? src.length : end + cfg.blockComment[1].length
      push(tokens, 'comment', src.slice(i, stop))
      i = stop
      continue
    }

    // Triple-quoted strings / docstrings
    if (cfg.tripleQuotes && (src.startsWith('"""', i) || src.startsWith("'''", i))) {
      const quote = src.slice(i, i + 3)
      const end = src.indexOf(quote, i + 3)
      const stop = end === -1 ? src.length : end + 3
      push(tokens, 'string', src.slice(i, stop))
      i = stop
      continue
    }

    // Strings, including prefixed ones like f"..." or R"(...)"
    if (c === '"' || c === "'" || c === '`') {
      i = scanString(src, i, tokens)
      continue
    }
    if (isIdentStart(c)) {
      let j = i
      while (j < src.length && isIdent(src[j])) j++
      const word = src.slice(i, j)
      const next = src[j]
      if ((next === '"' || next === "'") && STRING_PREFIXES.has(word)) {
        push(tokens, 'string', word)
        i = scanString(src, j, tokens)
        continue
      }
      // Skip whitespace to see whether this identifier is being called.
      let k = j
      while (k < src.length && (src[k] === ' ' || src[k] === '\t')) k++
      if (cfg.keywords.has(word)) push(tokens, 'keyword', word)
      else if (cfg.types.has(word)) push(tokens, 'type', word)
      else if (src[k] === '(') push(tokens, 'func', word)
      else push(tokens, 'plain', word)
      i = j
      continue
    }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] ?? ''))) {
      let j = i
      while (j < src.length && /[0-9a-fA-FxXbBoO._']/.test(src[j])) j++
      // Trailing type suffixes: 1.0f, 10u, 3L
      while (j < src.length && /[fFuUlL]/.test(src[j])) j++
      push(tokens, 'number', src.slice(i, j))
      i = j
      continue
    }

    if (/[{}()[\];,.:<>=+\-*/%!&|^~?@]/.test(c)) {
      push(tokens, 'punct', c)
      i++
      continue
    }

    push(tokens, 'plain', c)
    i++
  }
  return tokens
}

/** Consumes a quoted string starting at `start`; returns the new index. */
function scanString(src: string, start: number, tokens: Token[]): number {
  const quote = src[start]
  // Template literals legitimately span lines; ordinary quotes do not.
  const multiline = quote === '`'
  let j = start + 1
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2
      continue
    }
    if (src[j] === quote) {
      j++
      break
    }
    // An unterminated string shouldn't swallow the rest of the file.
    if (src[j] === '\n' && !multiline) break
    j++
  }
  push(tokens, 'string', src.slice(start, j))
  return j
}

function scanHtml(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i)
      const stop = end === -1 ? src.length : end + 3
      push(tokens, 'comment', src.slice(i, stop))
      i = stop
      continue
    }
    if (src[i] === '<') {
      const end = src.indexOf('>', i)
      const stop = end === -1 ? src.length : end + 1
      const tag = src.slice(i, stop)
      tokens.push(...scanTag(tag))
      i = stop

      // Hand the body of <script>/<style> to the right scanner, so embedded
      // JavaScript and CSS are highlighted instead of coming out as flat text.
      const embedded = /^<(script|style)\b/i.exec(tag)
      if (embedded && !tag.endsWith('/>')) {
        const closing = `</${embedded[1].toLowerCase()}`
        const closeAt = src.toLowerCase().indexOf(closing, i)
        const bodyEnd = closeAt === -1 ? src.length : closeAt
        const body = src.slice(i, bodyEnd)
        if (body) {
          tokens.push(
            ...scanGeneric(body, CONFIGS[embedded[1].toLowerCase() === 'style' ? 'css' : 'js']),
          )
        }
        i = bodyEnd
      }
      continue
    }
    const next = src.indexOf('<', i)
    const stop = next === -1 ? src.length : next
    push(tokens, 'plain', src.slice(i, stop))
    i = stop
  }
  return tokens
}

/** Splits `<a href="x">` into punctuation / tag name / attribute / value. */
function scanTag(tag: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  push(tokens, 'punct', tag[i])
  i++
  if (tag[i] === '/' || tag[i] === '!') {
    push(tokens, 'punct', tag[i])
    i++
  }
  let j = i
  while (j < tag.length && /[A-Za-z0-9!_-]/.test(tag[j])) j++
  push(tokens, 'tag', tag.slice(i, j))
  i = j

  while (i < tag.length) {
    const c = tag[i]
    if (c === '"' || c === "'") {
      i = scanString(tag, i, tokens)
      continue
    }
    if (c === '>' || c === '/' || c === '=') {
      push(tokens, 'punct', c)
      i++
      continue
    }
    if (isIdentStart(c)) {
      let k = i
      while (k < tag.length && /[A-Za-z0-9_:-]/.test(tag[k])) k++
      push(tokens, 'attr', tag.slice(i, k))
      i = k
      continue
    }
    push(tokens, 'plain', c)
    i++
  }
  return tokens
}

/**
 * Never throws. A language we don't have a scanner for — or a fenced block
 * labelled `toml`, `json`, `cmake`, … — comes back as plain text rather than
 * taking the whole lesson down with it.
 */
export function highlight(code: string, lang: CodeLang | string): Token[] {
  if (lang === 'html') return scanHtml(code)
  const config = CONFIGS[lang as keyof typeof CONFIGS]
  if (!config) return [{ type: 'plain', text: code }]
  return scanGeneric(code, config)
}

/** True when `highlight` has a real scanner for this language. */
export function isHighlightable(lang: string): boolean {
  return lang === 'html' || lang === 'text' || lang in CONFIGS
}
