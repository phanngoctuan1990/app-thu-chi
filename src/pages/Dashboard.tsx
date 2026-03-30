import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import BudgetAlert from '../components/BudgetAlert'
import NotificationSheet from '../components/NotificationSheet'
import { formatVNDShort } from '../utils/formatCurrency'
import {
  fetchSummary, fetchTransactions,
  getCachedSummary, getCachedTransactions,
  type Summary, type TxRecord,
} from '../services/api'
import { useBudget } from '../hooks/useBudget'
import { useSavingsGoal } from '../hooks/useSavingsGoal'
import { useCurrency } from '../hooks/useCurrency'

// ─── AnimatedNumber ───────────────────────────────────────────────────────────
function AnimatedNumber({
  value, className, fmt, style,
}: { value: number; className?: string; fmt?: (n: number) => string; style?: React.CSSProperties }) {
  const [displayed, setDisplayed] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = Date.now()
    const duration = 700
    const from = displayed
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(from + (value - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])
  return <span className={className} style={style}>{(fmt ?? formatVNDShort)(displayed)}</span>
}

// ─── Animated Sparkline (mini, for invest card) ───────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-8 mt-4">
      {values.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${Math.max((h / max) * 32, 4)}px`,
            animation: 'bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: `${i * 80}ms`,
            transformOrigin: 'bottom',
          }}
          className={`flex-1 rounded-sm ${
            i === values.length - 1 ? 'bg-secondary' :
            i === values.length - 2 ? 'bg-secondary/60' : 'bg-secondary/20'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyBarChart({ txs, month, fmt }: { txs: TxRecord[]; month: number; fmt: (n: number) => string }) {
  const now = new Date()
  const currentWeek = Math.floor((now.getDate() - 1) / 7)

  // Group spending by week (0-indexed: week0 = days 1–7, etc.)
  // Exclude Tiết kiệm & Đầu tư to match "Tổng chi tiêu" definition
  // Both Vietnamese (old GAS) and English (new GAS) names
  const NON_SPENDING = new Set(['Tiết kiệm', 'Đầu tư', 'Savings', 'Invest'])
  const weekly = [0, 0, 0, 0, 0]
  txs.filter(tx => tx.amount < 0 && !NON_SPENDING.has(tx.category)).forEach(tx => {
    const w = Math.min(Math.floor((tx.day - 1) / 7), 4)
    weekly[w] += Math.abs(tx.amount)
  })

  // Only show weeks that exist in the month
  const year = now.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()
  const numWeeks = Math.ceil(daysInMonth / 7)
  const weeks = weekly.slice(0, numWeeks)

  const max = Math.max(...weeks, 1)
  const weekLabels = ['T1', 'T2', 'T3', 'T4', 'T5']

  // Date range for each week column, e.g. "22–28"
  const weekRanges = weeks.map((_, i) => {
    const start = i * 7 + 1
    const end = Math.min(start + 6, daysInMonth)
    return `${start}–${end}`
  })

  return (
    <div className="flex items-end gap-2 h-28">
      {weeks.map((val, i) => {
        const isCurrent = i === currentWeek && month === now.getMonth() + 1
        const isMax = val === max && max > 0
        const heightPct = Math.max((val / max) * 100, 6)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {/* Amount label above bar */}
            <span
              className="font-label text-[9px] font-bold leading-none transition-opacity duration-300"
              style={{ color: isCurrent ? '#bf2a02' : '#38392960', opacity: val > 0 ? 1 : 0 }}
            >
              {fmt(val)}
            </span>
            {/* Bar */}
            <div className="w-full flex-1 flex items-end overflow-hidden relative"
              style={{ minHeight: 56 }}
            >
              <div
                className="w-full rounded-[6px] relative overflow-hidden"
                style={{
                  height: `${heightPct}%`,
                  background: isCurrent
                    ? 'linear-gradient(180deg, #bf2a02 0%, #ffac99 100%)'
                    : isMax
                    ? 'linear-gradient(180deg, #e57a65 0%, #ffcfc2 100%)'
                    : '#38392914',
                  animation: 'bar-grow 0.7s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: `${i * 100}ms`,
                  transformOrigin: 'bottom',
                  minHeight: val > 0 ? 6 : 4,
                }}
              >
                {isCurrent && (
                  <div className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)' }} />
                )}
              </div>
            </div>
            {/* Week label + date range */}
            <span
              className="font-label text-[10px] font-semibold leading-tight"
              style={{ color: isCurrent ? '#bf2a02' : '#38392970' }}
            >
              {weekLabels[i]}
            </span>
            <span
              className="font-label text-[8px] leading-none"
              style={{ color: isCurrent ? '#bf2a0290' : '#38392940' }}
            >
              {weekRanges[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Animated Donut Chart ─────────────────────────────────────────────────────
function DonutChart({ compulsory, lifestyle, invest, total }: {
  compulsory: number; lifestyle: number; invest: number; total: number
}) {
  const r = 15.9155
  const circ = 2 * Math.PI * r
  const compPct  = total > 0 ? compulsory / total : 0
  const lifePct  = total > 0 ? lifestyle / total : 0
  const invPct   = total > 0 ? invest / total : 0
  const compDash = circ * compPct
  const lifeDash = circ * lifePct
  const invDash  = circ * invPct
  const percent  = total > 0 ? Math.round((compulsory + lifestyle + invest) / total * 100) : 0

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e4c8" strokeWidth="4" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#82826e" strokeWidth="4"
          strokeDasharray={`${compDash} ${circ}`}
          strokeLinecap="round"
          style={{
            strokeDashoffset: circ,
            animation: 'stroke-draw 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards',
            ['--circ' as string]: circ,
          }}
        />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#bf2a02" strokeWidth="4"
          strokeDasharray={`${lifeDash} ${circ}`}
          strokeDashoffset={-compDash}
          strokeLinecap="round"
          style={{
            strokeDashoffset: circ - compDash,
            animation: `stroke-draw 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s forwards`,
            ['--circ' as string]: circ - compDash,
          }}
        />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#007075" strokeWidth="4"
          strokeDasharray={`${invDash} ${circ}`}
          strokeDashoffset={-(compDash + lifeDash)}
          strokeLinecap="round"
          style={{
            strokeDashoffset: circ - compDash - lifeDash,
            animation: `stroke-draw 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s forwards`,
            ['--circ' as string]: circ - compDash - lifeDash,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-label font-bold text-lg leading-none">{percent}%</span>
        <span className="font-label text-[8px] text-outline uppercase tracking-wider mt-0.5">Đã dùng</span>
      </div>
    </div>
  )
}

// ─── Top 3 Categories bar list ────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  'Ăn uống sinh hoạt':    '#2e7d32',
  'Mua hàng':             '#e65100',
  'Phương tiện di chuyển':'#006064',
  'Chi tiêu bắt buộc':    '#455a64',
  'Đi chơi':              '#1565c0',
  'Đầu tư':               '#6a1b9a',
  'Tiết kiệm':            '#558b2f',
  'Thu nhập':             '#880e4f',
  'Chi tiêu khác':        '#f57f17',
}
const CAT_ICON: Record<string, string> = {
  'Ăn uống sinh hoạt':    'restaurant',
  'Mua hàng':             'shopping_bag',
  'Phương tiện di chuyển':'directions_car',
  'Chi tiêu bắt buộc':    'receipt_long',
  'Đi chơi':              'celebration',
  'Đầu tư':               'trending_up',
  'Tiết kiệm':            'savings',
  'Thu nhập':             'payments',
  'Chi tiêu khác':        'more_horiz',
}

function TopCategoriesCard({ categories, fmt }: { categories: Record<string, number>; fmt: (n: number) => string }) {
  const top3 = Object.entries(categories)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (top3.length === 0) return null

  const maxVal = top3[0][1]
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow animate-fade-up delay-250">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-headline font-bold text-base">Top danh mục</h3>
        <span className="font-label text-[10px] text-outline uppercase tracking-wider bg-surface-container px-2 py-1 rounded-full">
          Chi nhiều nhất
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {top3.map(([cat, val], i) => {
          const color = CAT_COLOR[cat] ?? '#383929'
          const icon = CAT_ICON[cat] ?? 'category'
          const barPct = (val / maxVal) * 100

          return (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{medals[i]}</span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: color + '18' }}
                  >
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ color, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                    >
                      {icon}
                    </span>
                  </div>
                  <span className="font-body text-sm text-on-surface font-medium">{cat}</span>
                </div>
                <AnimatedNumber value={val} fmt={fmt} className="font-label text-sm font-bold" style={{ color } as React.CSSProperties} />
              </div>
              {/* Animated progress bar */}
              <div className="h-1.5 bg-surface-container rounded-full overflow-hidden ml-[52px]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barPct}%`,
                    background: `linear-gradient(90deg, ${color}80, ${color})`,
                    animation: 'bar-grow 0.8s cubic-bezier(0.16,1,0.3,1) both',
                    animationDelay: `${i * 150 + 100}ms`,
                    transformOrigin: 'left',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skeleton Grid ────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 rounded-[24px] p-6 bg-surface-container-lowest bento-shadow">
        <div className="skeleton h-4 w-24 mb-4" />
        <div className="skeleton h-8 w-40 mb-2" />
        <div className="skeleton h-2 w-full mt-4" />
      </div>
      <div className="rounded-[24px] p-5 bg-surface-container-lowest bento-shadow-sm">
        <div className="skeleton h-6 w-6 rounded-full mb-3" />
        <div className="skeleton h-3 w-16 mb-2" />
        <div className="skeleton h-7 w-24" />
      </div>
      <div className="rounded-[24px] p-5 bg-surface-container-lowest bento-shadow-sm">
        <div className="skeleton h-6 w-6 rounded-full mb-3" />
        <div className="skeleton h-3 w-16 mb-2" />
        <div className="skeleton h-7 w-24" />
      </div>
      {/* Weekly chart skeleton */}
      <div className="col-span-2 rounded-[24px] p-6 bg-surface-container-lowest bento-shadow">
        <div className="skeleton h-4 w-36 mb-5" />
        <div className="flex items-end gap-2 h-24">
          {[60, 85, 40, 100].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="skeleton w-full rounded-[6px]" style={{ height: `${h * 0.6}px` }} />
              <div className="skeleton h-2.5 w-4" />
            </div>
          ))}
        </div>
      </div>
      {/* Compare + peak day skeleton */}
      <div className="rounded-[24px] p-5 bg-surface-container-lowest bento-shadow-sm">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-5 w-16 mb-1" />
        <div className="skeleton h-5 w-16" />
      </div>
      <div className="rounded-[24px] p-5 bg-surface-container-lowest bento-shadow-sm">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-10 w-10 rounded-full mb-1" />
        <div className="skeleton h-3 w-16" />
      </div>
      {/* Donut skeleton */}
      <div className="col-span-2 rounded-[24px] p-6 bg-surface-container-lowest bento-shadow">
        <div className="skeleton h-4 w-32 mb-5" />
        <div className="flex gap-6">
          <div className="skeleton w-32 h-32 shrink-0" style={{ borderRadius: '50%' }} />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
          </div>
        </div>
      </div>
      {/* Top categories skeleton */}
      <div className="col-span-2 rounded-[24px] p-6 bg-surface-container-lowest bento-shadow">
        <div className="skeleton h-4 w-28 mb-5" />
        <div className="flex flex-col gap-4">
          {[80, 55, 35].map((w, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className="skeleton h-1.5 rounded-full ml-12" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 rounded-[24px] p-6 bg-inverse-surface">
        <div className="skeleton h-3 w-20 mb-2 opacity-30" />
        <div className="skeleton h-8 w-36 opacity-30" />
      </div>
    </div>
  )
}

const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1

  const [summary, setSummary] = useState<Summary | null>(() => getCachedSummary())
  const [txs, setTxs] = useState<TxRecord[] | null>(() => getCachedTransactions(currentMonth))
  const [lastSummary, setLastSummary] = useState<Summary | null>(() => getCachedSummary(lastMonth))
  const [loading, setLoading] = useState(() => getCachedSummary() === null)
  const [showNotifSheet, setShowNotifSheet] = useState(false)
  const { threshold } = useBudget()
  const { goal } = useSavingsGoal()
  const { formatShort, currency } = useCurrency()

  useEffect(() => {
    fetchSummary().then(s => { setSummary(s); setLoading(false) }).catch(() => setLoading(false))
    fetchTransactions(currentMonth).then(setTxs).catch(console.error)
    fetchSummary(lastMonth).then(setLastSummary).catch(console.error)
  }, [])

  const year = now.getFullYear()
  const month = summary?.month ?? currentMonth

  const income     = summary?.income ?? 0
  const spent      = summary?.totalSpent ?? 0
  const invest     = summary?.categories['Đầu tư'] ?? 0
  const savings    = summary?.categories['Tiết kiệm'] ?? 0
  const compulsory = (summary?.categories['Chi tiêu bắt buộc'] ?? 0) + (summary?.categories['Phương tiện di chuyển'] ?? 0)
  const lifestyle  = (summary?.categories['Ăn uống sinh hoạt'] ?? 0) + (summary?.categories['Mua hàng'] ?? 0)
    + (summary?.categories['Chi tiêu khác'] ?? 0) + (summary?.categories['Đi chơi'] ?? 0)

  const spentPct = income > 0 ? Math.min((spent / income) * 100, 100) : 0

  // ── Derived stats from transactions ────────────────────────────────────────
  const lastSpent = lastSummary?.totalSpent ?? 0
  const monthDelta = lastSpent > 0 ? ((spent - lastSpent) / lastSpent) * 100 : 0
  const isSpendingMore = monthDelta > 0

  // Peak spending day
  const daySpend: Record<number, number> = {}
  ;(txs ?? []).filter(tx => tx.amount < 0).forEach(tx => {
    daySpend[tx.day] = (daySpend[tx.day] ?? 0) + Math.abs(tx.amount)
  })
  const topDayEntry = Object.entries(daySpend).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const peakDay = topDayEntry ? { day: Number(topDayEntry[0]), amount: topDayEntry[1] } : null

  return (
    <>
      <TopAppBar title="Tổng quan" subtitle={`${MONTH_NAMES[month]}, ${year}`} onBellPress={() => setShowNotifSheet(true)} />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-5">

        {/* ── Editorial header ── */}
        <div className="pt-3 pb-2 animate-fade-up">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] text-outline mb-2">Kỳ tài chính</p>
          <h2 className="font-headline font-black leading-[0.9] text-on-surface">
            <span className="text-[52px] block">Tổng kết</span>
            <span className="text-4xl text-primary">{MONTH_NAMES[month]}</span>
            <span className="text-2xl text-outline font-medium ml-2">{year}</span>
          </h2>
        </div>

        {/* ── Budget alert ── */}
        {!loading && threshold > 0 && (
          <BudgetAlert spent={spent} threshold={threshold} onEdit={() => setShowNotifSheet(true)} />
        )}

        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4">

            {/* Income card — full width */}
            <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow relative overflow-hidden animate-fade-up delay-50">
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-primary/6 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 text-primary p-2 rounded-full">
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      account_balance_wallet
                    </span>
                  </div>
                  <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-label text-[10px] font-medium">
                    Tháng này
                  </span>
                </div>
                <p className="font-body font-medium text-outline text-sm">Tổng thu nhập</p>
                <p className="font-label font-bold text-[28px] tracking-tight mt-1 leading-none">
                  <AnimatedNumber value={income} fmt={formatShort} />
                  <span className="text-sm font-normal text-outline ml-1">{currency}</span>
                </p>
                <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700"
                    style={{ width: `${spentPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="font-label text-[10px] text-outline">
                    {Math.round(spentPct)}% thu nhập đã chi tiêu
                  </p>
                  <button
                    onClick={() => setShowNotifSheet(true)}
                    className="flex items-center gap-1 font-label text-[10px] text-primary/70 hover:text-primary transition-colors active:opacity-70"
                  >
                    <span className="material-symbols-outlined text-[13px]">tune</span>
                    {threshold > 0 ? `Ngưỡng: ${formatShort(threshold)}` : 'Đặt ngưỡng'}
                  </button>
                </div>
              </div>
            </div>

            {/* Total Spent */}
            <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost animate-fade-up delay-100">
              <div>
                <span className="material-symbols-outlined text-inverse-primary text-[22px] mb-2 block"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  shopping_cart
                </span>
                <p className="font-body text-xs text-outline">Tổng chi tiêu</p>
                <p className="font-label font-bold text-xl mt-1 text-on-surface">
                  <AnimatedNumber value={spent} fmt={formatShort} />
                </p>
                {income > 0 && (
                  <p className="font-label text-[10px] text-outline mt-0.5">
                    {Math.round((spent / income) * 100)}% thu nhập
                  </p>
                )}
              </div>
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-inverse-primary rounded-full transition-all duration-700"
                  style={{ width: `${spentPct}%` }}
                />
              </div>
            </div>

            {/* Investments */}
            <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost animate-fade-up delay-150">
              <div>
                <span className="material-symbols-outlined text-secondary text-[22px] mb-2 block"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  trending_up
                </span>
                <p className="font-body text-xs text-outline">Đầu tư</p>
                <p className="font-label font-bold text-xl mt-1 text-on-surface">
                  <AnimatedNumber value={invest} fmt={formatShort} />
                </p>
              </div>
              <Sparkline values={[2, 3, 5, 4, invest > 0 ? 6 : 2]} />
            </div>

            {/* ── Weekly bar chart ── */}
            {txs && txs.length > 0 && (
              <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow animate-fade-up delay-200">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-headline font-bold text-base">Chi tiêu theo tuần</h3>
                  <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-label text-[10px] text-outline">Tuần hiện tại</span>
                  </div>
                </div>
                <WeeklyBarChart txs={txs} month={month} fmt={formatShort} />
              </div>
            )}

            {/* ── Month comparison + Peak day ── */}
            {/* Month vs last month */}
            <div className="bg-surface-container-lowest rounded-[24px] p-5 bento-shadow animate-fade-up delay-200 flex flex-col justify-between">
              <div>
                <p className="font-label text-[10px] uppercase tracking-wider text-outline mb-3">So sánh tháng</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-label text-[10px] text-outline w-16 shrink-0">Tháng {lastMonth}</span>
                    <span className="font-label font-bold text-sm text-on-surface/60">
                      {formatShort(lastSpent)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-label text-[10px] text-outline w-16 shrink-0">Tháng {month}</span>
                    <span className="font-label font-bold text-sm text-on-surface">
                      {formatShort(spent)}
                    </span>
                  </div>
                </div>
              </div>
              {lastSpent > 0 && (
                <div
                  className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-[12px]"
                  style={{
                    background: isSpendingMore ? '#bf2a0210' : '#2e7d3210',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{
                      color: isSpendingMore ? '#bf2a02' : '#2e7d32',
                      fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {isSpendingMore ? 'trending_up' : 'trending_down'}
                  </span>
                  <span
                    className="font-label text-xs font-bold"
                    style={{ color: isSpendingMore ? '#bf2a02' : '#2e7d32' }}
                  >
                    {isSpendingMore ? '+' : ''}{Math.round(monthDelta)}%
                  </span>
                  <span className="font-label text-[10px] text-outline">so với tháng trước</span>
                </div>
              )}
            </div>

            {/* Peak spending day */}
            <div className="bg-surface-container-lowest rounded-[24px] p-5 bento-shadow animate-fade-up delay-250 flex flex-col justify-between">
              <p className="font-label text-[10px] uppercase tracking-wider text-outline mb-3">Ngày chi nhiều</p>
              {peakDay ? (
                <>
                  <div className="flex-1 flex flex-col justify-center">
                    <div
                      className="w-14 h-14 rounded-[16px] flex flex-col items-center justify-center mb-2 relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #bf2a0215, #ffac9920)' }}
                    >
                      <span className="font-label font-black text-2xl leading-none text-primary">
                        {peakDay.day}
                      </span>
                      <span className="font-label text-[8px] text-outline uppercase tracking-wider">
                        Tháng {month}
                      </span>
                    </div>
                    <p className="font-label font-bold text-sm text-on-surface">
                      {formatShort(peakDay.amount)}
                    </p>
                    <p className="font-label text-[10px] text-outline mt-0.5">chi trong một ngày</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-label text-xs text-outline">Chưa có dữ liệu</span>
                </div>
              )}
            </div>

            {/* Spending Allocation */}
            <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow border-ghost animate-fade-up delay-300">
              <h3 className="font-headline font-bold text-base mb-5">Phân bổ chi tiêu</h3>
              <div className="flex items-center justify-between gap-6">
                <DonutChart compulsory={compulsory} lifestyle={lifestyle} invest={invest} total={spent} />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Bắt buộc', value: compulsory, color: 'bg-outline' },
                    { label: 'Sinh hoạt', value: lifestyle, color: 'bg-primary' },
                    { label: 'Đầu tư', value: invest, color: 'bg-secondary' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-4 rounded-full ${color} shrink-0`} />
                        <span className="font-body text-xs font-medium text-on-surface">{label}</span>
                      </div>
                      <AnimatedNumber value={value} fmt={formatShort} className="font-label text-xs font-bold" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 3 Categories */}
            {summary?.categories && (
              <TopCategoriesCard categories={summary.categories} fmt={formatShort} />
            )}

            {/* Savings card — dark */}
            <div className="col-span-2 bg-inverse-surface rounded-[24px] p-6 relative overflow-hidden animate-fade-up delay-350">
              <div
                className="absolute inset-0 pointer-events-none opacity-100"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <span
                className="absolute bottom-0 right-2 font-black leading-none pointer-events-none select-none"
                style={{ fontSize: 80, color: 'rgba(255,255,255,0.05)' }}
              >
                {month}
              </span>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-[#feffd5]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      savings
                    </span>
                  </div>
                  {goal > 0 && (
                    <span className="font-label text-[10px] text-white/50 uppercase tracking-wider">
                      Mục tiêu: {formatShort(goal)}
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-outline-variant mb-1">Tổng tiết kiệm</p>
                <p className="font-label font-bold text-2xl leading-none text-[#feffd5]">
                  <AnimatedNumber value={savings} fmt={formatShort} />
                  <span className="text-sm font-normal text-outline-variant ml-1">{currency}</span>
                </p>
                {goal > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((savings / goal) * 100, 100)}%`,
                          background: savings >= goal ? '#7cb342' : 'rgba(255,255,255,0.5)',
                        }}
                      />
                    </div>
                    <p className="font-label text-[10px] text-white/40 mt-1">
                      {savings >= goal
                        ? 'Đã đạt mục tiêu!'
                        : `${Math.round((savings / goal) * 100)}% — còn ${formatShort(goal - savings)}`
                      }
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowNotifSheet(true)}
                  className="mt-4 bg-white/15 text-white px-4 py-2 rounded-full text-xs font-bold font-headline flex items-center gap-2 active:scale-95 transition-transform"
                >
                  {goal > 0 ? 'Sửa mục tiêu' : 'Đặt mục tiêu'}
                  <span className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    {goal > 0 ? 'edit' : 'add_circle'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      <FAB />

      {showNotifSheet && (
        <NotificationSheet onClose={() => setShowNotifSheet(false)} />
      )}
    </>
  )
}
