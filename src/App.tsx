import { useCallback, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNavBar from './components/BottomNavBar'
import SplashScreen from './components/SplashScreen'
import Dashboard from './pages/Dashboard'
import QuickInput from './pages/QuickInput'
import TransactionHistory from './pages/TransactionHistory'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import { useAuth, getStoredUser } from './hooks/useAuth'
import type { AuthUser, SheetConfig } from './hooks/useAuth'
import { SyncContext } from './contexts/SyncContext'
import { syncAllData } from './services/api'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const { sheetConfig, setSheetConfig } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [accessToken, setAccessToken] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(0)

  const triggerSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      await syncAllData()
      setLastSync(Date.now())
    } catch { /* silent */ } finally {
      setSyncing(false)
    }
  }, [syncing])

  function handleLoggedIn(authUser: AuthUser, token: string) {
    setUser(authUser)
    setAccessToken(token)
  }

  function handleOnboardingComplete(config: SheetConfig) {
    setSheetConfig(config)
  }

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => { setSplashDone(true); setLastSync(Date.now()) }} />}

      {/* Auth gate */}
      {!user ? (
        <LoginPage onLoggedIn={(u, t) => handleLoggedIn(u, t)} />
      ) : !sheetConfig ? (
        <OnboardingPage
          user={user}
          accessToken={accessToken}
          onComplete={handleOnboardingComplete}
        />
      ) : (
        <SyncContext.Provider value={{ syncing, lastSync, triggerSync }}>
          <BrowserRouter>
            <div className="app-container">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/input" element={<QuickInput />} />
                <Route path="/history" element={<TransactionHistory />} />
                <Route path="*" element={<Navigate to="/input" replace />} />
              </Routes>
              <BottomNavBar />
            </div>
          </BrowserRouter>
        </SyncContext.Provider>
      )}
    </>
  )
}
