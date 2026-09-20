import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import { ProgressProvider } from './lib/progress'
import { ThemeProvider } from './lib/theme'
import './styles.css'

// On GitHub Pages the app lives at /learncode/, not at the root. Vite exposes
// that as BASE_URL, and the router has to be told or every link 404s.
// React Router wants no trailing slash: '/learncode', or '' at the root.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <App />
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
