import { useNavigate } from 'react-router-dom'

export default function FAB() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/input')}
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-fab flex items-center justify-center active:scale-90 transition-transform duration-200"
    >
      <span className="material-symbols-outlined text-2xl">add</span>
    </button>
  )
}
