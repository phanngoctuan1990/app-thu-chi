import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  onLoggedIn: (accessToken: string) => void
}

export default function LoginPage({ onLoggedIn }: Props) {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gisReady, setGisReady] = useState(false)

  // Poll for GIS library readiness
  useEffect(() => {
    const check = () => {
      if (window.google?.accounts?.oauth2) { setGisReady(true); return }
      const t = setTimeout(check, 200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(check, 200)
    return () => clearTimeout(t)
  }, [])

  async function handleLogin() {
    if (!gisReady) { setError('Đang tải Google Sign-In...'); return }
    setLoading(true)
    setError('')
    try {
      const { accessToken } = await login()
      onLoggedIn(accessToken)
    } catch (err) {
      setError('Đăng nhập thất bại, thử lại')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 mb-12 animate-fade-up">
        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary/15 to-primary-container/30 bento-shadow flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary text-[44px]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}
          >
            account_balance_wallet
          </span>
        </div>
        <div className="text-center">
          <h1 className="font-headline font-black text-4xl text-on-surface tracking-tight">Thu Chi</h1>
          <p className="font-body text-sm text-outline mt-1">Quản lý chi tiêu cá nhân & gia đình</p>
        </div>
      </div>

      {/* Features */}
      <div className="w-full max-w-[340px] flex flex-col gap-3 mb-10 animate-fade-up delay-100">
        {[
          { icon: 'shield_person', text: 'Dữ liệu lưu trên Google Sheet của bạn' },
          { icon: 'group',         text: 'Chia sẻ với vợ/chồng hoặc gia đình' },
          { icon: 'mic',           text: 'Nhập nhanh bằng giọng nói' },
        ].map(({ icon, text }) => (
          <div key={icon} className="flex items-center gap-3 px-4 py-3 rounded-[16px] bg-surface-container">
            <span
              className="material-symbols-outlined text-primary text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              {icon}
            </span>
            <p className="font-body text-sm text-on-surface-variant">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-[340px] flex flex-col gap-3 animate-fade-up delay-200">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 rounded-full font-headline font-black text-base text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-transform duration-150 disabled:opacity-60"
          style={{ background: loading ? '#aaa' : 'linear-gradient(135deg, #bf2a02, #ff6b3d)' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
        </button>

        {error && (
          <p className="text-center font-label text-sm text-error animate-fade-in">{error}</p>
        )}

        <p className="text-center font-label text-[10px] text-outline px-4 leading-relaxed">
          Bằng cách đăng nhập, bạn đồng ý để app tạo Google Sheet trong Drive của bạn để lưu dữ liệu chi tiêu.
        </p>
      </div>
    </div>
  )
}
