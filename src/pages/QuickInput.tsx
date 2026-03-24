import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import { addTransaction, fetchSummary } from '../services/api'
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSummary().then(s => setTotalSpent(s.totalSpent)).catch(() => {})
  }, [])

  const amount = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : '0'
  const amountSize = formatted.length <= 6 ? 'text-7xl'
    : formatted.length <= 9  ? 'text-5xl'
    : formatted.length <= 12 ? 'text-4xl'
    : 'text-3xl'
  const today = new Date().toISOString().split('T')[0]

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
          <h2 className="font-headline font-extrabold text-xl leading-tight mt-1">
            Tổng chi tháng này:{' '}
            <span className="font-label text-primary">
              {totalSpent === null ? '...' : `${formatVNDShort(totalSpent)} VND`}
            </span>
          </h2>
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

        {/* ── Date picker ── */}
        <div
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
          className="bg-surface-container-low border-ghost rounded-full px-5 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-outline text-xl"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              calendar_today
            </span>
            <span className="font-body text-sm text-on-surface">
              {formatDateLabel(selectedDate)}
            </span>
          </div>
          <span className="material-symbols-outlined text-outline text-base">expand_more</span>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="sr-only"
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
