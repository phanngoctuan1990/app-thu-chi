import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import { addTransaction, cacheInvalidate, fetchSummary, fetchTransactions } from '../services/api'
import { formatVNDShort } from '../utils/formatCurrency'

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'Meals',
    label: 'Ăn uống',
    icon: 'restaurant',
    bg: 'bg-emerald-100',
    iconBg: 'bg-emerald-200/50',
    iconColor: 'text-emerald-800',
    textColor: 'text-emerald-900',
    ringColor: 'ring-emerald-400',
  },
  {
    id: 'Shopping',
    label: 'Mua hàng',
    icon: 'shopping_bag',
    bg: 'bg-orange-100',
    iconBg: 'bg-orange-200/50',
    iconColor: 'text-orange-800',
    textColor: 'text-orange-900',
    ringColor: 'ring-orange-400',
  },
  {
    id: 'Transport',
    label: 'Di chuyển',
    icon: 'directions_car',
    bg: 'bg-cyan-100',
    iconBg: 'bg-cyan-200/50',
    iconColor: 'text-cyan-800',
    textColor: 'text-cyan-900',
    ringColor: 'ring-cyan-400',
  },
  {
    id: 'Compulsory',
    label: 'Bắt buộc',
    icon: 'receipt_long',
    bg: 'bg-slate-200',
    iconBg: 'bg-slate-300/50',
    iconColor: 'text-slate-800',
    textColor: 'text-slate-900',
    ringColor: 'ring-slate-400',
  },
  {
    id: 'Fun',
    label: 'Vui chơi',
    icon: 'celebration',
    bg: 'bg-sky-100',
    iconBg: 'bg-sky-200/50',
    iconColor: 'text-sky-800',
    textColor: 'text-sky-900',
    ringColor: 'ring-sky-400',
  },
  {
    id: 'Invest',
    label: 'Đầu tư',
    icon: 'trending_up',
    bg: 'bg-green-100',
    iconBg: 'bg-green-200/50',
    iconColor: 'text-green-800',
    textColor: 'text-green-900',
    ringColor: 'ring-green-400',
  },
  {
    id: 'Savings',
    label: 'Tiết kiệm',
    icon: 'account_balance_wallet',
    bg: 'bg-neutral-200',
    iconBg: 'bg-neutral-300/50',
    iconColor: 'text-neutral-800',
    textColor: 'text-neutral-900',
    ringColor: 'ring-neutral-400',
  },
  {
    id: 'Income',
    label: 'Thu nhập',
    icon: 'payments',
    bg: 'bg-rose-100',
    iconBg: 'bg-rose-200/50',
    iconColor: 'text-rose-800',
    textColor: 'text-rose-900',
    ringColor: 'ring-rose-400',
  },
  {
    id: 'Other',
    label: 'Khác',
    icon: 'more_horiz',
    bg: 'bg-yellow-100',
    iconBg: 'bg-yellow-200/50',
    iconColor: 'text-yellow-800',
    textColor: 'text-yellow-900',
    ringColor: 'ring-yellow-400',
  },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

// ─── Note suggestions ─────────────────────────────────────────────────────────

const NOTE_SUGGESTIONS: { label: string; keys: string[] }[] = [
  // Ăn uống
  { label: 'Ăn sáng',          keys: ['an sang'] },
  { label: 'Ăn trưa',          keys: ['an trua'] },
  { label: 'Ăn tối',           keys: ['an toi'] },
  { label: 'Ăn vặt',           keys: ['an vat'] },
  { label: 'Ăn ngoài',         keys: ['an ngoai'] },
  { label: 'Cà phê',           keys: ['ca phe', 'cf'] },
  { label: 'Trà sữa',          keys: ['tra sua', 'ts'] },
  { label: 'Sinh tố',          keys: ['sinh to'] },
  { label: 'Nước uống',        keys: ['nuoc uong', 'nuoc'] },
  { label: 'Phở',              keys: ['pho'] },
  { label: 'Bún',              keys: ['bun'] },
  { label: 'Cơm',              keys: ['com'] },
  { label: 'Bánh mì',          keys: ['banh mi', 'banh'] },
  { label: 'Bánh ngọt',        keys: ['banh ngot'] },
  // Di chuyển
  { label: 'Đổ xăng',         keys: ['do xang', 'do', 'xang'] },
  { label: 'Grab',             keys: ['grab'] },
  { label: 'Taxi',             keys: ['taxi', 'ta'] },
  { label: 'Xe buýt',          keys: ['xe buyt', 'xe'] },
  { label: 'Gửi xe',           keys: ['gui xe'] },
  // Mua sắm
  { label: 'Siêu thị',        keys: ['sieu thi', 'sieu'] },
  { label: 'Winmart',          keys: ['winmart', 'win'] },
  { label: 'Tạp hóa',         keys: ['tap hoa'] },
  { label: 'Mua hàng',        keys: ['mua hang', 'mua'] },
  { label: 'Quần áo',         keys: ['quan ao'] },
  { label: 'Giày dép',        keys: ['giay dep'] },
  { label: 'Mỹ phẩm',         keys: ['my pham'] },
  // Chi phí bắt buộc
  { label: 'Tiền nhà',        keys: ['tien nha'] },
  { label: 'Tiền điện',       keys: ['tien dien'] },
  { label: 'Tiền nước',       keys: ['tien nuoc'] },
  { label: 'Tiền internet',   keys: ['tien internet', 'inet'] },
  { label: 'Tiền điện thoại', keys: ['tien dien thoai'] },
  { label: 'Bảo hiểm',        keys: ['bao hiem'] },
  // Vui chơi
  { label: 'Xem phim',        keys: ['xem phim', 'phim'] },
  { label: 'Karaoke',         keys: ['karaoke', 'kara'] },
  { label: 'Du lịch',         keys: ['du lich'] },
  { label: 'Gym',             keys: ['gym'] },
  { label: 'Đám cưới',        keys: ['dam cuoi', 'dam'] },
  // Thanh toán
  { label: 'Momo',            keys: ['momo', 'mo'] },
  { label: 'ZaloPay',         keys: ['zalopay', 'zalo'] },
  // Thu nhập
  { label: 'Lương',           keys: ['luong'] },
  { label: 'Thưởng',          keys: ['thuong'] },
  { label: 'Freelance',       keys: ['freelance', 'free'] },
  // Sức khỏe
  { label: 'Thuốc',           keys: ['thuoc'] },
  { label: 'Khám bệnh',       keys: ['kham benh', 'kham'] },
]

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ─── Toast component ─────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full font-label font-medium text-sm shadow-lg transition-all ${
        type === 'success'
          ? 'bg-inverse-surface text-surface'
          : 'bg-error text-on-error'
      }`}
    >
      {message}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuickInput() {
  const [rawAmount, setRawAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [shake, setShake] = useState(false)
  const [totalSpent, setTotalSpent] = useState<number | null>(null)
  const [todaySpent, setTodaySpent] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const todayDay = new Date().getDate()
  const currentMonth = new Date().getMonth() + 1

  function loadStats() {
    Promise.all([fetchSummary(), fetchTransactions(currentMonth)])
      .then(([s, txs]) => {
        setTotalSpent(s.totalSpent)
        const todayTotal = txs
          .filter(tx => tx.day === todayDay && tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        setTodaySpent(todayTotal)
      })
      .catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  const amount = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : '0'
  const amountSize = formatted.length <= 6 ? 'text-7xl'
    : formatted.length <= 9  ? 'text-5xl'
    : formatted.length <= 12 ? 'text-4xl'
    : 'text-3xl'
  const today = new Date().toISOString().split('T')[0]

  // Amount suggestions: multiply digits by 10k, 100k, 1M, 10M
  const suggestions: number[] = rawAmount
    ? [1000, 10000, 100000, 1000000]
        .map(m => parseInt(rawAmount, 10) * m)
        .filter(v => v <= 100000000)
    : []

  const noteSuggestions = note.trim().length >= 1
    ? NOTE_SUGGESTIONS
        .filter(({ label, keys }) => {
          const q = normalize(note.trim())
          return normalize(label).startsWith(q) || keys.some(k => k.startsWith(q))
        })
        .map(({ label }) => label)
        .slice(0, 6)
    : []

  function formatSuggestion(n: number) {
    if (n >= 1000000) {
      const m = n / 1000000
      return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
    }
    return `${n / 1000}k`
  }

  function formatDateLabel(dateStr: string) {
    if (dateStr === today) return 'Hôm nay'
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  function handleAmountTap() {
    hiddenInputRef.current?.focus()
  }

  function handleRawInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
    setRawAmount(digits)
  }

  async function handleConfirm() {
    if (amount <= 0) {
      triggerShake()
      showToast('Vui lòng nhập số tiền', 'error')
      return
    }
    if (!selectedCategory) {
      showToast('Vui lòng chọn danh mục', 'error')
      return
    }

    setLoading(true)
    try {
      await addTransaction({ date: selectedDate, amount, category: selectedCategory, note })
      showToast('Đã lưu! 🎉', 'success')
      setRawAmount('')
      setSelectedCategory(null)
      setNote('')
      cacheInvalidate(currentMonth)
      loadStats()
    } catch {
      showToast('Lỗi kết nối, thử lại!', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <TopAppBar title="Tổng quan" />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        value={rawAmount}
        onChange={handleRawInput}
        className="sr-only"
        aria-hidden="true"
      />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-5">

        {/* ── Header summary card ── */}
        <section className="bg-surface-container-lowest rounded-[24px] px-6 py-5 bento-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
          <p className="font-body text-on-surface-variant text-sm font-medium">Xin chào!</p>
          <div className="flex items-end justify-between mt-2 gap-4">
            <div>
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-0.5">Hôm nay</p>
              <p className="font-label font-bold text-2xl text-primary leading-none">
                {todaySpent === null ? '...' : `${formatVNDShort(todaySpent)}`}
                <span className="font-body text-xs text-outline font-normal ml-1">VND</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-0.5">Tháng này</p>
              <p className="font-label font-semibold text-base text-on-surface-variant leading-none">
                {totalSpent === null ? '...' : `${formatVNDShort(totalSpent)}`}
                <span className="font-body text-xs text-outline font-normal ml-1">VND</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Amount display ── */}
        <section
          onClick={handleAmountTap}
          className={`bg-surface-container-low rounded-[24px] py-8 px-6 flex flex-col items-center justify-center gap-3 border-ghost cursor-pointer transition-all ${
            shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          <div className="flex items-baseline gap-2 w-full justify-center overflow-hidden">
            <span className={`font-label font-bold ${amountSize} tracking-tighter text-on-surface leading-none truncate`}>
              {formatted}
            </span>
            <span className="font-label text-xl font-medium text-outline shrink-0">VND</span>
          </div>
          <div className={`h-1 rounded-full transition-all duration-300 ${amount > 0 ? 'w-16 bg-primary/40' : 'w-12 bg-primary/20'}`} />
        </section>

        {/* ── Amount suggestions ── */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setRawAmount(String(s))}
                className="shrink-0 px-4 py-2 rounded-full bg-primary/10 text-primary font-label font-semibold text-sm active:scale-95 transition-transform duration-150"
              >
                {formatSuggestion(s)}
              </button>
            ))}
          </div>
        )}

        {/* ── Date picker ── */}
        <div className="relative bg-surface-container-low border-ghost rounded-full px-5 py-3 flex items-center justify-between active:scale-[0.98] transition-all overflow-hidden">
          <div className="flex items-center gap-3 pointer-events-none">
            <span className="material-symbols-outlined text-outline text-xl"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              calendar_today
            </span>
            <span className="font-body text-sm text-on-surface">
              {formatDateLabel(selectedDate)}
            </span>
          </div>
          <span className="material-symbols-outlined text-outline text-base pointer-events-none">expand_more</span>
          {/* Native input overlay — invisible but covers full row for iOS tap */}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* ── Category grid 3×3 ── */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                className={`
                  ${cat.bg} p-4 rounded-[20px] flex flex-col items-center justify-center gap-2
                  transition-all duration-200 hover:scale-[1.03] active:scale-95
                  ${isActive ? `ring-2 ${cat.ringColor} scale-[1.03] shadow-bento-sm` : 'shadow-sm'}
                `}
              >
                <div className={`w-10 h-10 rounded-full ${cat.iconBg} flex items-center justify-center`}>
                  <span
                    className={`material-symbols-outlined ${cat.iconColor} text-[22px]`}
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                  >
                    {cat.icon}
                  </span>
                </div>
                <span className={`font-headline font-bold text-[9px] uppercase tracking-wider ${cat.textColor}`}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Note input ── */}
        <div className="flex flex-col gap-2">
          <div className="bg-surface-container-low border-ghost rounded-full px-5 py-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-outline text-xl">edit_note</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú? (Phở sáng, Grab đi làm...)"
              className="bg-transparent border-none outline-none w-full font-body text-on-surface placeholder:text-outline/60 text-sm"
            />
          </div>

          {noteSuggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none px-1">
              {noteSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setNote(s)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container border-ghost font-body text-sm text-on-surface-variant active:scale-95 transition-transform duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Confirm button ── */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Xác nhận chi tiêu'
          )}
        </button>

      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </>
  )
}
