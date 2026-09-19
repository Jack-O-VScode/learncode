import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { CppModePage } from './pages/CppModePage'
import { LevelsPage } from './pages/LevelsPage'
import { LessonPage } from './pages/LessonPage'
import { ProfilePage } from './pages/ProfilePage'
import { InstallPage } from './pages/InstallPage'

export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-mark">{'</>'}</div>
        <p>Loading your progress…</p>
      </div>
    )
  }

  // Everything behind the sign-in wall, exactly as asked.
  if (!user) return <AuthPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cpp" element={<CppModePage />} />
        <Route path="/track/:trackId" element={<LevelsPage />} />
        <Route path="/track/:trackId/:levelId" element={<LessonPage />} />
        <Route path="/me" element={<ProfilePage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
