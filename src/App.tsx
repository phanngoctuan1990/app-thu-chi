import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNavBar from './components/BottomNavBar'
import SplashScreen from './components/SplashScreen'
import Dashboard from './pages/Dashboard'
import QuickInput from './pages/QuickInput'
import TransactionHistory from './pages/TransactionHistory'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import { useAuth } from './hooks/useAuth'
import type { SheetConfig } from './hooks/useAuth'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const { user, sheetConfig, setSheetConfig } = useAuth()
  const [accessToken, setAccessToken] = useState('')

  function handleLoggedIn(token: string) {
    setAccessToken(token)
  }

  function handleOnboardingComplete(config: SheetConfig) {
    setSheetConfig(config)
  }

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {/* Auth gate */}
      {!user ? (
        <LoginPage onLoggedIn={handleLoggedIn} />
      ) : !sheetConfig ? (
        <OnboardingPage
          user={user}
          accessToken={accessToken}
          onComplete={handleOnboardingComplete}
        />
      ) : (
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
      )}
    </>
  )
}
