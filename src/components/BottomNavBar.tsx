import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', icon: 'home', label: 'Trang chủ' },
  { path: '/input', icon: 'add_circle', label: 'Nhập' },
  { path: '/history', icon: 'receipt_long', label: 'Lịch sử' },
]

export default function BottomNavBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 w-full max-w-[430px] z-50 rounded-t-[24px] glass-panel border-t border-ghost shadow-[0_-4px_32px_rgba(56,57,41,0.06)]">
      <div className="flex justify-around items-center px-6 pt-3 nav-safe">
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all duration-200 active:scale-90 ${
                isActive ? 'text-primary' : 'text-outline hover:bg-surface-container'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
              >
                {icon}
              </span>
              <span className={`font-label text-[9px] uppercase tracking-widest transition-all duration-200 ${isActive ? 'font-bold text-primary' : ''}`}>
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-2 w-8 h-0.5 rounded-full bg-primary"
                  style={{ animation: 'nav-indicator-in 0.2s ease both' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
