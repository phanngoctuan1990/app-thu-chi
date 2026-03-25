import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVNDShort } from '../utils/formatCurrency'
import { fetchSummary, getCachedSummary, type Summary } from '../services/api'

// ─── AnimatedNumber ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
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
  return <span className={className}>{formatVNDShort(displayed)}</span>
}

// ─── Animated Sparkline ───────────────────────────────────────────────────────
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
        {/* Track */}
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e4c8" strokeWidth="4" />
        {/* Compulsory arc */}
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
        {/* Lifestyle arc */}
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
        {/* Invest arc */}
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
      <div className="col-span-2 rounded-[24px] p-6 bg-surface-container-lowest bento-shadow">
        <div className="skeleton h-4 w-32 mb-5" />
        <div className="flex gap-6">
          <div className="skeleton w-32 h-32 rounded-full shrink-0" style={{ borderRadius: '50%' }} />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
          </div>
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
  const [summary, setSummary] = useState<Summary | null>(() => getCachedSummary())
  const [loading, setLoading] = useState(() => getCachedSummary() === null)

  useEffect(() => {
    fetchSummary()
      .then(s => { setSummary(s); setLoading(false) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const year = now.getFullYear()
  const month = summary?.month ?? (now.getMonth() + 1)

  const income     = summary?.income ?? 0
  const spent      = summary?.totalSpent ?? 0
  const invest     = summary?.categories['Đầu tư'] ?? 0
  const savings    = summary?.categories['Tiết kiệm'] ?? 0
  const compulsory = (summary?.categories['Chi tiêu bắt buộc'] ?? 0) + (summary?.categories['Phương tiện di chuyển'] ?? 0)
  const lifestyle  = (summary?.categories['Ăn uống sinh hoạt'] ?? 0) + (summary?.categories['Mua hàng'] ?? 0)
    + (summary?.categories['Chi tiêu khác'] ?? 0) + (summary?.categories['Đi chơi'] ?? 0)

  const spentPct = income > 0 ? Math.min((spent / income) * 100, 100) : 0

  return (
    <>
      <TopAppBar title="Tổng quan" subtitle={`${MONTH_NAMES[month]}, ${year}`} />

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
                  <AnimatedNumber value={income} />
                  <span className="text-sm font-normal text-outline ml-1">VND</span>
                </p>
                <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700"
                    style={{ width: `${spentPct}%` }}
                  />
                </div>
                <p className="font-label text-[10px] text-outline mt-1.5">
                  {Math.round(spentPct)}% thu nhập đã chi tiêu
                </p>
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
                  <AnimatedNumber value={spent} />
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
                  <AnimatedNumber value={invest} />
                </p>
              </div>
              <Sparkline values={[2, 3, 5, 4, invest > 0 ? 6 : 2]} />
            </div>

            {/* Spending Allocation */}
            <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow border-ghost animate-fade-up delay-200">
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
                      <AnimatedNumber value={value} className="font-label text-xs font-bold" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Savings card — dark */}
            <div className="col-span-2 bg-inverse-surface rounded-[24px] p-6 relative overflow-hidden animate-fade-up delay-300">
              {/* CSS dot-grid decorative background */}
              <div
                className="absolute inset-0 pointer-events-none opacity-100"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              {/* Month number watermark */}
              <span
                className="absolute bottom-0 right-2 font-black leading-none pointer-events-none select-none"
                style={{ fontSize: 80, color: 'rgba(255,255,255,0.05)' }}
              >
                {month}
              </span>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px] text-[#feffd5]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    savings
                  </span>
                </div>
                <p className="font-body text-xs text-outline-variant mb-1">Tổng tiết kiệm</p>
                <p className="font-label font-bold text-2xl leading-none text-[#feffd5]">
                  <AnimatedNumber value={savings} />
                  <span className="text-sm font-normal text-outline-variant ml-1">VND</span>
                </p>
                <button className="mt-4 bg-white/15 text-white px-4 py-2 rounded-full text-xs font-bold font-headline flex items-center gap-2 active:scale-95 transition-transform">
                  Đặt mục tiêu
                  <span className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    add_circle
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      <FAB />
    </>
  )
}
