import { useEffect, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'
import { fetchSummary, type Summary } from '../services/api'

// ─── Donut chart SVG ─────────────────────────────────────────────────────────
function DonutChart({ compulsory, lifestyle, total }: { compulsory: number; lifestyle: number; total: number }) {
  const r = 15.9155
  const circ = 2 * Math.PI * r
  const compPct = total > 0 ? compulsory / total : 0
  const lifePct = total > 0 ? lifestyle / total : 0
  const compDash = circ * compPct
  const lifeDash = circ * lifePct
  const percent = total > 0 ? Math.round((compulsory + lifestyle) / total * 100) : 0

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f6f4e4" strokeWidth="4" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#82826e" strokeWidth="4"
          strokeDasharray={`${compDash} ${circ}`}
          strokeLinecap="round"
        />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#bf2a02" strokeWidth="4"
          strokeDasharray={`${lifeDash} ${circ}`}
          strokeDashoffset={-compDash}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-label font-bold text-lg leading-none">{percent}%</span>
        <span className="font-label text-[8px] text-outline uppercase tracking-wider mt-0.5">Đã dùng</span>
      </div>
    </div>
  )
}

// ─── Sparkline bars ──────────────────────────────────────────────────────────
function Sparkline() {
  const bars = [2, 3, 5, 4, 6]
  return (
    <div className="flex items-end gap-1 h-6 mt-4">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h * 4}px` }}
          className={`w-2 rounded-sm ${i === bars.length - 1 ? 'bg-secondary' : i === bars.length - 2 ? 'bg-secondary/60' : 'bg-secondary/20'}`}
        />
      ))}
    </div>
  )
}

const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const year = new Date().getFullYear()
  const monthLabel = summary ? `${MONTH_NAMES[summary.month]}, ${year}` : `${MONTH_NAMES[new Date().getMonth() + 1]}, ${year}`

  const income     = summary?.income ?? 0
  const spent      = summary?.totalSpent ?? 0
  const invest     = summary?.categories['Đầu tư'] ?? 0
  const savings    = summary?.categories['Tiết kiệm'] ?? 0
  const compulsory = (summary?.categories['Chi tiêu bắt buộc'] ?? 0) + (summary?.categories['Phương tiện di chuyển'] ?? 0)
  const lifestyle  = (summary?.categories['Ăn uống sinh hoạt'] ?? 0) + (summary?.categories['Mua hàng'] ?? 0)
    + (summary?.categories['Chi tiêu khác'] ?? 0) + (summary?.categories['Đi chơi'] ?? 0)

  return (
    <>
      <TopAppBar title="Tổng quan" />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-5">

        {/* ── Month summary header ── */}
        <div className="pt-2">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-outline mb-1">
            Kỳ tài chính
          </p>
          <h2 className="font-headline font-extrabold text-3xl text-on-background leading-tight">
            Tổng kết tháng
          </h2>
          <p className="font-headline font-semibold text-primary mt-0.5">
            {monthLabel}
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 text-outline text-sm">
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-4">

            {/* Income card — full width */}
            <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 text-primary p-2 rounded-full">
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      account_balance_wallet
                    </span>
                  </div>
                </div>
                <p className="font-body font-medium text-outline text-sm">Tổng thu nhập</p>
                <p className="font-label font-bold text-[28px] tracking-tight mt-1 leading-none">
                  {formatVND(income)}{' '}
                  <span className="text-sm font-normal text-outline">VND</span>
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Total Spent */}
            <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost">
              <div>
                <span className="material-symbols-outlined text-inverse-primary text-[22px] mb-2 block"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  shopping_cart
                </span>
                <p className="font-body text-xs text-outline">Tổng chi tiêu</p>
                <p className="font-label font-bold text-xl mt-1 text-on-surface">
                  {formatVNDShort(spent)}
                </p>
              </div>
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-inverse-primary rounded-full transition-all duration-700"
                  style={{ width: `${income > 0 ? Math.min((spent / income) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Investments */}
            <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost">
              <div>
                <span className="material-symbols-outlined text-secondary text-[22px] mb-2 block"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                  trending_up
                </span>
                <p className="font-body text-xs text-outline">Đầu tư</p>
                <p className="font-label font-bold text-xl mt-1 text-on-surface">
                  {formatVNDShort(invest)}
                </p>
              </div>
              <Sparkline />
            </div>

            {/* Spending Allocation */}
            <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow border-ghost">
              <h3 className="font-headline font-bold text-base mb-5">Phân bổ chi tiêu</h3>
              <div className="flex items-center justify-between gap-6">
                <DonutChart compulsory={compulsory} lifestyle={lifestyle} total={spent} />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-outline shrink-0" />
                      <span className="font-body text-xs font-medium text-on-surface">Bắt buộc</span>
                    </div>
                    <span className="font-label text-xs font-bold">{formatVNDShort(compulsory)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="font-body text-xs font-medium text-on-surface">Sinh hoạt</span>
                    </div>
                    <span className="font-label text-xs font-bold">{formatVNDShort(lifestyle)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Savings */}
            <div className="col-span-2 bg-inverse-surface rounded-[24px] p-6 relative overflow-hidden">
              <div className="relative z-10">
                <p className="font-body text-xs text-outline-variant mb-1">Tổng tiết kiệm</p>
                <p className="font-label font-bold text-2xl text-surface leading-none">
                  {formatVND(savings)}{' '}
                  <span className="text-sm font-normal text-outline-variant">VND</span>
                </p>
                <button className="mt-4 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold font-headline flex items-center gap-2 active:scale-95 transition-transform">
                  Đặt mục tiêu
                  <span className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    add_circle
                  </span>
                </button>
              </div>
              <div className="absolute -right-8 top-0 h-full w-1/2 opacity-20 pointer-events-none">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                  <defs>
                    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#bf2a02" />
                      <stop offset="100%" stopColor="#0e0f09" />
                    </linearGradient>
                  </defs>
                  <path d="M0,100 C20,80 40,90 60,40 C80,-10 100,20 100,0 L100,100 Z" fill="url(#waveGrad)" />
                </svg>
              </div>
            </div>

          </div>
        )}

      </main>

      <FAB />
    </>
  )
}
