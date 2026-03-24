import { useEffect, useState } from 'react'
import { fetchSummary, fetchTransactions } from '../services/api'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Đang khởi động...')
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const month = new Date().getMonth() + 1

    // Animate progress 0 → 90% over ~2.7s, jumps to 100% when done
    const ticker = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(ticker); return 90 }
        return p + 1
      })
    }, 30)

    // Fetch real data
    setStatus('Đang tải dữ liệu...')
    const MIN_DURATION = 3000

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
          setTimeout(onDone, 400)
        }, 300)
      })

    return () => clearInterval(ticker)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #feffd5 0%, #f6f4e4 50%, #ffac99 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-primary-container/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 rounded-full bg-secondary-container/20 blur-[80px] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-8 px-8">

        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-[24px] blur-2xl" />
          <div className="relative w-24 h-24 bg-surface-container-lowest rounded-[24px] flex items-center justify-center bento-shadow">
            <span
              className="material-symbols-outlined text-primary text-5xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}
            >
              account_balance_wallet
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-headline font-extrabold text-4xl text-on-surface tracking-tighter">
            Thu Chi
          </h1>
          <p className="font-label text-outline text-[10px] uppercase tracking-[0.3em] font-medium">
            Sổ quản lý tài chính
          </p>
        </div>

        {/* Glass card */}
        <div
          className="max-w-xs w-full p-6 rounded-[24px] shadow-[0_32px_32px_-4px_rgba(56,57,41,0.06)]"
          style={{
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <p className="font-body text-on-surface-variant text-sm leading-relaxed">
            Nhập nhanh từng khoản chi, nắm rõ dòng tiền — để mỗi đồng đều có ý nghĩa.
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 flex flex-col items-center gap-3">
          <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(191,42,2,0.4)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-label text-[10px] text-outline uppercase tracking-widest">
            {status}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2">
        <div className="h-px w-8 bg-outline/20 mb-2" />
        <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-outline">
          Quản lý tài chính cá nhân
        </p>
      </div>
    </div>
  )
}
