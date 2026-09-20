import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Light / dark theme, remembered per device.
 *
 * The actual switch is a single `data-theme` attribute on <html>; the whole
 * palette lives in styles.css (dark tokens in `:root`, light overrides under
 * `:root[data-theme='light']`). index.html sets the attribute before the first
 * paint using the same rule as `initialTheme` here, so there is no flash.
 */

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'learncode.theme'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode — fall through to the OS preference */
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    /* no matchMedia — fall through to the default */
  }
  return 'dark'
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* nothing persisted this session, but the attribute is still applied */
    }
    // Keep the PWA / mobile status-bar colour in step with the theme.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f7fc' : '#0b1020')
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo<ThemeState>(
    () => ({ theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
