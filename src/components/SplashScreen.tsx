import { useEffect, useState } from 'react'
import { fetchSummary, fetchTransactions } from '../services/api'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Đang khởi động...')
  const [fadeOut, setFadeOut] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Trigger entry animations after mount
    const t = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const month = new Date().getMonth() + 1
    const MIN_DURATION = 3000

    const ticker = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(ticker); return 90 }
        return p + 1
      })
    }, 30)

    setStatus('Đang tải dữ liệu...')

    Promise.all([
      fetchSummary(month),
      fetchTransactions(month),
      new Promise(resolve => setTimeout(resolve, MIN_DURATION)),
    ])
      .then(() => {
        clearInterval(ticker)
        setProgress(100)
        setStatus('Hoàn tất!')
      })
      .catch(() => {
        clearInterval(ticker)
        setProgress(100)
        setStatus('Sẵn sàng')
      })
      .finally(() => {
        setTimeout(() => {
          setFadeOut(true)
          setTimeout(onDone, 500)
        }, 300)
      })

    return () => clearInterval(ticker)
  }, [])

  return (
    <>
      <style>{`
        @keyframes splashBlobFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.7) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashLogoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(191,42,2,0.12); }
          50%       { box-shadow: 0 0 0 16px rgba(191,42,2,0); }
        }
        @keyframes splashSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes splashBarGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(191,42,2,0.3); }
          50%       { box-shadow: 0 0 20px rgba(191,42,2,0.6); }
        }
        .splash-logo {
          animation: splashLogoIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both,
                     splashLogoPulse 2.5s ease-in-out 0.8s infinite;
        }
        .splash-title {
          animation: splashSlideUp 0.5s ease-out 0.25s both;
        }
        .splash-tagline {
          animation: splashFadeIn 0.5s ease-out 0.45s both;
        }
        .splash-card {
          animation: splashSlideUp 0.5s ease-out 0.6s both;
        }
        .splash-progress {
          animation: splashFadeIn 0.5s ease-out 0.85s both;
        }
        .splash-bar-fill {
          animation: splashBarGlow 2s ease-in-out infinite;
        }
        .splash-blob-1 {
          animation: splashBlobFloat 7s ease-in-out infinite;
        }
        .splash-blob-2 {
          animation: splashBlobFloat 9s ease-in-out 1.5s infinite;
        }
      `}</style>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: 'linear-gradient(150deg, #feffd5 0%, #faf8e8 40%, #ffd4c2 80%, #ffac99 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="splash-blob-1 absolute top-[-15%] right-[-15%] w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,172,153,0.35) 0%, transparent 70%)' }} />
        <div className="splash-blob-2 absolute bottom-[-10%] left-[-10%] w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,112,117,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] left-[-5%] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(191,42,2,0.06) 0%, transparent 70%)' }} />

        {/* Main content */}
        <div className={`relative z-10 flex flex-col items-center text-center gap-7 px-8 transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}>

          {/* Logo */}
          <div className="splash-logo w-[88px] h-[88px] bg-white rounded-[24px] flex items-center justify-center"
            style={{ boxShadow: '0 24px 40px -8px rgba(56,57,41,0.12), 0 4px 12px rgba(56,57,41,0.06)' }}>
            <span
              className="material-symbols-outlined text-primary"
              style={{
                fontSize: 44,
                fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 48",
              }}
            >
              account_balance_wallet
            </span>
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="splash-title font-headline font-extrabold text-[42px] text-on-surface tracking-[-0.03em] leading-none">
              Thu Chi
            </h1>
            <p className="splash-tagline font-label text-[10px] text-outline/80 uppercase tracking-[0.35em]">
              Sổ quản lý tài chính
            </p>
          </div>

          {/* Glass card */}
          <div
            className="splash-card w-full max-w-[280px] px-6 py-5 rounded-[20px]"
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 8px 32px rgba(56,57,41,0.07)',
            }}
          >
            <p className="font-body text-on-surface-variant text-[13.5px] leading-loose text-center">
              Nhập nhanh từng khoản chi,<br />
              nắm rõ dòng tiền.<br />
              <span className="font-semibold text-on-surface">Để mỗi đồng đều có ý nghĩa.</span>
            </p>
          </div>

          {/* Progress */}
          <div className="splash-progress flex flex-col items-center gap-3 w-[180px]">
            <div className="h-[3px] w-full bg-surface-dim rounded-full overflow-hidden">
              <div
                className="splash-bar-fill h-full bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-label text-[9px] text-outline/70 uppercase tracking-[0.25em]">
              {status}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-50">
          <p className="font-label text-[9px] tracking-[0.25em] uppercase text-outline">
            Quản lý tài chính cá nhân
          </p>
        </div>
      </div>
    </>
  )
}
