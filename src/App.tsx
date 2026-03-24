import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNavBar from './components/BottomNavBar'
import SplashScreen from './components/SplashScreen'
import Dashboard from './pages/Dashboard'
import QuickInput from './pages/QuickInput'
import TransactionHistory from './pages/TransactionHistory'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
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
    </>
  )
}
