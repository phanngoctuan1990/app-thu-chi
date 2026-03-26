import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useCurrency } from '../hooks/useCurrency'
import { getCachedSummary, generateInviteCode } from '../services/api'
import { formatVNDShort } from '../utils/formatCurrency'
import { useAuth } from '../hooks/useAuth'

interface Props {
  onClose: () => void
}

type Platform = 'ios' | 'android'

// ─── Widget Preview Card ──────────────────────────────────────────────────────
function WidgetPreview() {
  const now = new Date()
  const month = now.getMonth() + 1
  const summary = getCachedSummary(month)
  const spent = summary?.totalSpent ?? 3_200_000
  const income = summary?.income ?? 10_000_000
  const pct = income > 0 ? Math.min((spent / income) * 100, 100) : 32

  const topCats = Object.entries(summary?.categories ?? {
    'Ăn uống sinh hoạt': 1_200_000,
    'Mua hàng': 800_000,
    'Chi tiêu bắt buộc': 600_000,
  })
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  const catColors: Record<string, string> = {
    'Ăn uống sinh hoạt': '#2e7d32',
    'Mua hàng': '#e65100',
    'Phương tiện di chuyển': '#006064',
    'Chi tiêu bắt buộc': '#455a64',
    'Đi chơi': '#1565c0',
    'Đầu tư': '#6a1b9a',
    'Tiết kiệm': '#558b2f',
    'Thu nhập': '#880e4f',
    'Chi tiêu khác': '#f57f17',
  }

  return (
    <div
      className="relative rounded-[22px] p-4 overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #1e1f14 0%, #2a2b20 100%)',
        width: 160,
        height: 160,
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-[6px] bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[11px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
              account_balance_wallet
            </span>
          </div>
          <span className="font-headline font-bold text-[10px] text-white/70">Thu Chi</span>
          <span className="ml-auto font-label text-[8px] text-white/40">T{month}</span>
        </div>

        {/* Amount */}
        <div className="flex-1">
          <p className="font-label text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Chi tiêu</p>
          <p className="font-label font-black text-xl leading-tight text-white">
            {formatVNDShort(spent)}
          </p>
          <p className="font-label text-[8px] text-white/40 mt-0.5">VND</p>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {topCats.map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-0.5">
                <div className="w-1 h-1 rounded-full" style={{ background: catColors[cat] ?? '#82826e' }} />
                <span className="font-label text-[7px] text-white/40 truncate max-w-[52px]">{cat.split(' ')[0]}</span>
                <span className="font-label text-[7px] text-white/60">{formatVNDShort(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Platform instructions ────────────────────────────────────────────────────
const IOS_STEPS = [
  { icon: 'ios_share',    text: 'Mở Safari, nhấn nút Chia sẻ (□↑) dưới thanh địa chỉ' },
  { icon: 'add_box',      text: 'Cuộn xuống và chọn "Thêm vào Màn hình chính"' },
  { icon: 'edit',         text: 'Đặt tên "Thu Chi" rồi nhấn Thêm' },
  { icon: 'check_circle', text: 'App xuất hiện trên màn hình chính như app thường!' },
]
const ANDROID_STEPS = [
  { icon: 'more_vert',    text: 'Mở Chrome, nhấn menu ⋮ góc trên phải' },
  { icon: 'add_to_home_screen', text: 'Chọn "Thêm vào màn hình chính" hoặc "Cài đặt ứng dụng"' },
  { icon: 'touch_app',    text: 'Nhấn Thêm để xác nhận' },
  { icon: 'check_circle', text: 'App được ghim trên màn hình chính với icon riêng!' },
]

export default function SettingsSheet({ onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [platform, setPlatform] = useState<Platform>('ios')
  const { theme, toggleTheme } = useTheme()
  const { currency, setCurrency, exchangeRate } = useCurrency()
  const { user, sheetConfig, logout } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isDark = theme === 'dark'
  const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setMounted(false)
    setTimeout(onClose, 300)
  }

  const handleGenerateCode = useCallback(async () => {
    if (!sheetConfig?.sheetId) return
    setInviteLoading(true)
    try {
      const code = await generateInviteCode(sheetConfig.sheetId)
      setInviteCode(code)
    } catch {}
    setInviteLoading(false)
  }, [sheetConfig])

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteCode])

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[90] bg-inverse-surface/40 backdrop-blur-[2px]"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-[100] rounded-t-[28px] pb-safe overflow-hidden"
        style={{
          background: 'var(--sheet-bg)',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-outline/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[14px] bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                settings
              </span>
            </div>
            <h2 className="font-headline font-black text-xl text-on-surface">Tiện ích</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[78dvh] px-6 pb-6 flex flex-col gap-5">

          {/* ── 0. Account & Sharing ── */}
          {user && (
            <section>
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline mb-3">Tài khoản</p>
              <div className="bg-surface-container rounded-[20px] p-4 flex flex-col gap-4">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <img src={user.picture} alt={user.name}
                    className="w-11 h-11 rounded-full bento-shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-sm text-on-surface truncate">{user.name}</p>
                    <p className="font-label text-[10px] text-outline truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { handleClose(); logout() }}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-high font-label text-xs text-outline active:opacity-60 transition-opacity"
                  >
                    Đăng xuất
                  </button>
                </div>

                {/* Invite code (only for owners) */}
                {sheetConfig?.role === 'owner' && (
                  <div className="border-t border-outline-variant/10 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-body text-sm font-semibold text-on-surface">Mời vợ/chồng dùng chung</p>
                        <p className="font-label text-[10px] text-outline mt-0.5">Tạo mã để chia sẻ Sheet gia đình</p>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                        group_add
                      </span>
                    </div>

                    {inviteCode ? (
                      <button
                        onClick={handleCopyCode}
                        className="w-full bg-surface-container-lowest rounded-[14px] px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform duration-150 bento-shadow-sm"
                      >
                        <div className="text-left">
                          <p className="font-label text-[10px] text-outline uppercase tracking-wider mb-0.5">Mã mời</p>
                          <p className="font-headline font-black text-2xl tracking-[0.15em] text-on-surface">{inviteCode}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors duration-200 ${copied ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                          <span className="material-symbols-outlined text-[14px]"
                            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                            {copied ? 'check' : 'content_copy'}
                          </span>
                          <span className="font-label text-xs font-bold">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateCode}
                        disabled={inviteLoading}
                        className="w-full py-3 rounded-[14px] font-label font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150 disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #bf2a02, #ff6b3d)' }}
                      >
                        {inviteLoading ? (
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                            generating_tokens
                          </span>
                        )}
                        {inviteLoading ? 'Đang tạo...' : 'Tạo mã mời'}
                      </button>
                    )}

                    <p className="font-label text-[10px] text-outline mt-2 text-center">
                      Chia sẻ mã qua Zalo/Messenger. Mã dùng 1 lần.
                    </p>
                  </div>
                )}

                {/* Member badge */}
                {sheetConfig?.role === 'member' && (
                  <div className="border-t border-outline-variant/10 pt-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>group</span>
                    <p className="font-body text-xs text-outline">Bạn đang dùng Sheet gia đình chung</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 1. Dark Mode ── */}
          <section>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline mb-3">Giao diện</p>
            <div className="bg-surface-container rounded-[20px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated icon */}
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center transition-colors duration-500"
                  style={{ background: isDark ? '#1a1b12' : '#fff3e0' }}
                >
                  <span
                    className="material-symbols-outlined text-[22px] transition-all duration-500"
                    style={{
                      color: isDark ? '#fbe449' : '#f57f17',
                      fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                      animation: 'theme-switch 0.4s ease',
                    }}
                  >
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-on-surface">
                    {isDark ? 'Giao diện tối' : 'Giao diện sáng'}
                  </p>
                  <p className="font-label text-[10px] text-outline mt-0.5">
                    {isDark ? 'Roasted Ember dark theme' : 'Sunset Bento light theme'}
                  </p>
                </div>
              </div>

              {/* Toggle pill */}
              <button
                onClick={toggleTheme}
                className="relative w-14 h-7 rounded-full transition-colors duration-400 active:scale-95 shrink-0"
                style={{ background: isDark ? '#bf2a02' : '#e5e4c8' }}
                aria-label="Toggle dark mode"
              >
                <span
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300"
                  style={{ left: isDark ? 'calc(100% - 26px)' : '2px' }}
                />
              </button>
            </div>
          </section>

          {/* ── 2. Currency ── */}
          <section>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline mb-3">Tiền tệ</p>
            <div className="bg-surface-container rounded-[20px] p-4 flex flex-col gap-3">
              {/* Segmented control */}
              <div className="bg-surface-container-lowest rounded-[14px] p-1 flex gap-1">
                {(['VND', 'USD'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="flex-1 py-2.5 rounded-[11px] font-label font-bold text-sm transition-all duration-250 active:scale-98"
                    style={{
                      background: currency === c
                        ? 'linear-gradient(135deg, #bf2a02, #ff7a5a)'
                        : 'transparent',
                      color: currency === c ? '#ffffff' : 'rgb(var(--c-outline))',
                      boxShadow: currency === c ? '0 2px 8px rgba(191,42,2,0.25)' : 'none',
                    }}
                  >
                    {c === 'VND' ? '₫ VND' : '$ USD'}
                  </button>
                ))}
              </div>

              {/* Rate info */}
              <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-[14px] text-outline"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  currency_exchange
                </span>
                <p className="font-label text-xs text-outline">
                  1 USD = {new Intl.NumberFormat('vi-VN').format(exchangeRate)} VND
                  <span className="ml-1 text-outline/60">(tỷ giá tham khảo)</span>
                </p>
              </div>

              {/* Examples */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { vnd: 50_000,    label: 'Cà phê' },
                  { vnd: 3_000_000, label: 'Chi tháng' },
                ].map(({ vnd, label }) => (
                  <div key={label} className="bg-surface-container-low rounded-[12px] px-3 py-2">
                    <p className="font-label text-[10px] text-outline">{label}</p>
                    <p className="font-label font-bold text-sm text-on-surface">
                      {currency === 'USD'
                        ? `$${(vnd / exchangeRate).toFixed(2)}`
                        : new Intl.NumberFormat('vi-VN').format(vnd)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 3. Widget ── */}
          <section>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline mb-3">Màn hình chính</p>
            <div className="bg-surface-container rounded-[20px] p-4 flex flex-col gap-4">

              {/* Widget preview */}
              <div className="flex items-center gap-4">
                <WidgetPreview />
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-sm text-on-surface mb-1">Widget Thu Chi</p>
                  <p className="font-body text-xs text-outline leading-relaxed">
                    Thêm app vào màn hình chính để truy cập nhanh và xem chi tiêu ngay trên màn hình chờ.
                  </p>
                </div>
              </div>

              {/* Platform tabs */}
              <div className="bg-surface-container-lowest rounded-[14px] p-1 flex gap-1">
                {(['ios', 'android'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="flex-1 py-2 rounded-[11px] font-label font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95"
                    style={{
                      background: platform === p ? 'rgb(var(--c-sc-lowest))' : 'transparent',
                      color: platform === p ? 'rgb(var(--c-on-surface))' : 'rgb(var(--c-outline))',
                      boxShadow: platform === p ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      {p === 'ios' ? 'phone_iphone' : 'phone_android'}
                    </span>
                    {p === 'ios' ? 'iOS' : 'Android'}
                  </button>
                ))}
              </div>

              {/* Step-by-step */}
              <div className="flex flex-col gap-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-outline"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                        {step.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="font-label text-[10px] font-bold text-primary mr-1.5">
                        {i + 1}.
                      </span>
                      <span className="font-body text-xs text-on-surface-variant leading-relaxed">
                        {step.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note about widget */}
              <div className="bg-secondary/10 rounded-[12px] px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-[14px] mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  info
                </span>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  App sẽ chạy toàn màn hình như app bình thường. Widget thực sự (iOS 14+, Android) cần phiên bản native app trong tương lai.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
