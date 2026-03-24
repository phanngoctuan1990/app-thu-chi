import { useNavigate } from 'react-router-dom'

export default function FAB() {
  const navigate = useNavigate()

  return (
    <div
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      className="fixed right-6 z-50 w-14 h-14"
    >
      {/* Ping ring */}
      <span
        className="absolute inset-0 rounded-full bg-primary/20"
        style={{ animation: 'ping-slow 2.4s ease-out infinite' }}
      />
      <button
        onClick={() => navigate('/input')}
        className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-fab flex items-center justify-center active:scale-90 transition-transform duration-200"
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}
        >
          add
        </span>
      </button>
    </div>
  )
}
