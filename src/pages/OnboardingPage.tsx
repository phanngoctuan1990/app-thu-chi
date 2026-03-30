import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { AuthUser, SheetConfig } from '../hooks/useAuth'
import { createNewSheet, shareSheetWithGASOwner, extractSheetIdFromUrl } from '../services/setupSheet'
import { lookupInviteCode } from '../services/api'

type Flow = 'choose' | 'creating' | 'connecting' | 'joining' | 'done'

interface Props {
  user: AuthUser
  accessToken: string
  onComplete: (config: SheetConfig) => void
}

export default function OnboardingPage({ user, accessToken, onComplete }: Props) {
  const { setSheetConfig, getAccessToken } = useAuth()

  // Get a valid token: use prop if available (fresh login), otherwise request new one
  async function resolveToken(): Promise<string> {
    if (accessToken) return accessToken
    return getAccessToken()
  }
  const [flow, setFlow] = useState<Flow>('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  async function handleCreateNew() {
    setFlow('creating')
    setLoading(true)
    setError('')
    try {
      const token = await resolveToken()
      const sheetId = await createNewSheet(token, user.name)
      await shareSheetWithGASOwner(token, sheetId)
      const config: SheetConfig = { sheetId, role: 'owner' }
      setSheetConfig(config)
      onComplete(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo Sheet')
      setFlow('choose')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnectExisting() {
    setLoading(true)
    setError('')
    const sheetId = extractSheetIdFromUrl(sheetUrl) || sheetUrl.trim()
    if (!sheetId || sheetId.length < 20) {
      setError('URL Sheet không hợp lệ')
      setLoading(false)
      return
    }
    // For pre-existing sheets, Drive API scope `drive.file` cannot access files
    // created outside the app. Skip API share — user must share manually.
    const config: SheetConfig = { sheetId, role: 'owner' }
    setSheetConfig(config)
    setLoading(false)
    onComplete(config)
  }

  async function handleJoinByCode() {
    setLoading(true)
    setError('')
    const code = inviteCode.trim().toUpperCase()
    if (!code) { setError('Vui lòng nhập mã mời'); setLoading(false); return }
    try {
      const sheetId = await lookupInviteCode(code)
      const config: SheetConfig = { sheetId, role: 'member' }
      setSheetConfig(config)
      onComplete(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã mời không hợp lệ')
    } finally {
      setLoading(false)
    }
  }

  // ── Choose flow ───────────────────────────────────────────────────────────────
  if (flow === 'choose') {
    return (
      <div className="min-h-dvh flex flex-col px-5 pt-16 pb-10 bg-background animate-fade-in">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full bento-shadow-sm" />
            <div>
              <p className="font-headline font-black text-lg text-on-surface leading-tight">{user.name}</p>
              <p className="font-label text-[11px] text-outline">{user.email}</p>
            </div>
          </div>
          <h2 className="font-headline font-black text-2xl text-on-surface mb-1">Bắt đầu thế nào?</h2>
          <p className="font-body text-sm text-outline">Chọn cách thiết lập dữ liệu chi tiêu của bạn</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {[
            {
              icon: 'add_circle',
              title: 'Tạo Google Sheet mới',
              desc: 'App tự tạo và cấu hình sẵn, bắt đầu ngay',
              badge: 'Nhanh nhất',
              badgeColor: 'bg-primary/10 text-primary',
              action: handleCreateNew,
            },
            {
              icon: 'link',
              title: 'Dùng Sheet có sẵn',
              desc: 'Tôi đã có Google Sheet, muốn kết nối vào',
              badge: null,
              badgeColor: '',
              action: () => setFlow('connecting'),
            },
            {
              icon: 'group_add',
              title: 'Tham gia nhóm gia đình',
              desc: 'Dùng chung Sheet với vợ/chồng, nhập mã mời',
              badge: null,
              badgeColor: '',
              action: () => setFlow('joining'),
            },
          ].map((opt, i) => (
            <button
              key={opt.icon}
              onClick={opt.action}
              className="w-full text-left bg-surface-container-lowest rounded-[20px] p-5 bento-shadow-sm flex items-start gap-4 active:scale-[0.98] transition-transform duration-150 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-11 h-11 rounded-[14px] bg-surface-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  {opt.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-headline font-bold text-base text-on-surface">{opt.title}</p>
                  {opt.badge && (
                    <span className={`font-label text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-outline leading-relaxed">{opt.desc}</p>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px] shrink-0 mt-1">chevron_right</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-center font-label text-sm text-error animate-fade-in">{error}</p>}
      </div>
    )
  }

  // ── Creating (loading state) ─────────────────────────────────────────────────
  if (flow === 'creating') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background animate-fade-in px-6">
        <div className="w-16 h-16 rounded-[22px] bg-surface-container flex items-center justify-center bento-shadow">
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}>
            progress_activity
          </span>
        </div>
        <div className="text-center">
          <p className="font-headline font-bold text-xl text-on-surface mb-1">Đang tạo Google Sheet...</p>
          <p className="font-body text-sm text-outline">Cấu hình và chia sẻ quyền truy cập</p>
        </div>
      </div>
    )
  }

  // ── Connect existing ──────────────────────────────────────────────────────────
  if (flow === 'connecting') {
    return (
      <div className="min-h-dvh flex flex-col px-5 pt-16 pb-10 bg-background animate-fade-in">
        <button onClick={() => { setFlow('choose'); setError('') }} className="mb-6 flex items-center gap-1 text-outline active:opacity-60">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="font-body text-sm">Quay lại</span>
        </button>

        <div className="mb-8 animate-fade-up">
          <h2 className="font-headline font-black text-2xl text-on-surface mb-1">Kết nối Sheet có sẵn</h2>
          <p className="font-body text-sm text-outline">Dán URL Google Sheet của bạn</p>
        </div>

        <div className="flex flex-col gap-4 animate-fade-up delay-100">
          <div className="bg-surface-container-lowest rounded-[20px] px-5 py-4 bento-shadow-sm">
            <p className="font-label text-[10px] uppercase tracking-wider text-outline mb-2">URL Google Sheet</p>
            <input
              type="url"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-transparent border-none outline-none font-body text-sm text-on-surface placeholder:text-outline/50"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="bg-surface-container rounded-[16px] px-4 py-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[14px] text-outline mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>info</span>
              <p className="font-body text-xs text-outline leading-relaxed">
                Sheet cần có tab tên <strong>"Transactions"</strong> với cột: Date, Amount, Category, Note.
              </p>
            </div>
            {import.meta.env.VITE_GAS_OWNER_EMAIL && (
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>share</span>
                <p className="font-body text-xs text-outline leading-relaxed">
                  Chia sẻ Sheet với <strong className="text-on-surface">{import.meta.env.VITE_GAS_OWNER_EMAIL}</strong> (quyền Editor) trước khi kết nối.
                </p>
              </div>
            )}
          </div>

          {error && <p className="font-label text-sm text-error animate-fade-in">{error}</p>}

          <button
            onClick={handleConnectExisting}
            disabled={loading || !sheetUrl.trim()}
            className="w-full py-4 rounded-full font-headline font-black text-base text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #bf2a02, #ff6b3d)' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Đang kết nối...' : 'Kết nối Sheet'}
          </button>
        </div>
      </div>
    )
  }

  // ── Join by invite code ───────────────────────────────────────────────────────
  if (flow === 'joining') {
    return (
      <div className="min-h-dvh flex flex-col px-5 pt-16 pb-10 bg-background animate-fade-in">
        <button onClick={() => { setFlow('choose'); setError('') }} className="mb-6 flex items-center gap-1 text-outline active:opacity-60">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="font-body text-sm">Quay lại</span>
        </button>

        <div className="mb-8 animate-fade-up">
          <h2 className="font-headline font-black text-2xl text-on-surface mb-1">Tham gia nhóm</h2>
          <p className="font-body text-sm text-outline">Nhập mã mời từ vợ/chồng hoặc thành viên gia đình</p>
        </div>

        <div className="flex flex-col gap-4 animate-fade-up delay-100">
          <div className="bg-surface-container-lowest rounded-[20px] px-5 py-4 bento-shadow-sm">
            <p className="font-label text-[10px] uppercase tracking-wider text-outline mb-2">Mã mời</p>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="VD: X7K4"
              maxLength={6}
              className="w-full bg-transparent border-none outline-none font-headline font-black text-3xl text-on-surface tracking-[0.2em] placeholder:text-outline/30 placeholder:font-body placeholder:text-base placeholder:tracking-normal"
              style={{ fontSize: 16 }}
            />
          </div>

          {error && <p className="font-label text-sm text-error animate-fade-in">{error}</p>}

          <button
            onClick={handleJoinByCode}
            disabled={loading || !inviteCode.trim()}
            className="w-full py-4 rounded-full font-headline font-black text-base text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #bf2a02, #ff6b3d)' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Đang kiểm tra...' : 'Tham gia nhóm'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
