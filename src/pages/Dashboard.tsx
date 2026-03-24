import { useNavigate } from 'react-router-dom'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'

// ─── Mock data (will be replaced with real API data later) ───────────────────
const MOCK = {
  month: 'Tháng 3, 2026',
  income: 67_000_000,
  spent: 17_100_000,
  investments: 750_000,
  savings: 0,
  incomeGrowth: '+12% so T2',
  spentPercent: 74,
  compulsory: 12_200_000,
  lifestyle: 4_900_000,
  recentTransactions: [
    { id: 1, title: 'Grab Transport', subtitle: 'HÔM NAY, 08:30', amount: -45_000, icon: 'commute', iconBg: 'bg-secondary-container/30', iconColor: 'text-secondary' },
    { id: 2, title: 'Cộng Cà Phê', subtitle: 'HÔM QUA, 16:15', amount: -68_000, icon: 'coffee', iconBg: 'bg-tertiary-container/30', iconColor: 'text-on-tertiary-fixed-variant' },
  ],
}

// ─── Donut chart SVG ─────────────────────────────────────────────────────────
function DonutChart({ percent }: { percent: number }) {
  const r = 15.9155
  const circ = 2 * Math.PI * r  // ≈ 100
  const compDash = circ * 0.65
  const lifeDash = circ * 0.35

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f6f4e4" strokeWidth="4" />
        {/* Compulsory — taupe */}
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="#82826e" strokeWidth="4"
          strokeDasharray={`${compDash} ${circ}`}
          strokeLinecap="round"
        />
        {/* Lifestyle — primary red */}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

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
            {MOCK.month}
          </p>
        </div>

        {/* ── Bento grid ── */}
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
                <span className="font-label text-[10px] bg-primary-container/30 text-on-primary-container px-3 py-1 rounded-full">
                  {MOCK.incomeGrowth}
                </span>
              </div>
              <p className="font-body font-medium text-outline text-sm">Tổng thu nhập</p>
              <p className="font-label font-bold text-[28px] tracking-tight mt-1 leading-none">
                {formatVND(MOCK.income)}{' '}
                <span className="text-sm font-normal text-outline">VND</span>
              </p>
            </div>
            {/* Blur decoration */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          </div>

          {/* Total Spent — half width */}
          <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost">
            <div>
              <span className="material-symbols-outlined text-inverse-primary text-[22px] mb-2 block"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                shopping_cart
              </span>
              <p className="font-body text-xs text-outline">Tổng chi tiêu</p>
              <p className="font-label font-bold text-xl mt-1 text-on-surface">
                {formatVNDShort(MOCK.spent)}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-inverse-primary rounded-full transition-all duration-700"
                style={{ width: `${Math.min((MOCK.spent / MOCK.income) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Investments — half width */}
          <div className="bg-surface-container-low rounded-[24px] p-5 flex flex-col justify-between border-ghost">
            <div>
              <span className="material-symbols-outlined text-secondary text-[22px] mb-2 block"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                trending_up
              </span>
              <p className="font-body text-xs text-outline">Đầu tư</p>
              <p className="font-label font-bold text-xl mt-1 text-on-surface">
                {formatVNDShort(MOCK.investments)}
              </p>
            </div>
            <Sparkline />
          </div>

          {/* Spending Allocation — full width */}
          <div className="col-span-2 bg-surface-container-lowest rounded-[24px] p-6 bento-shadow border-ghost">
            <h3 className="font-headline font-bold text-base mb-5">Phân bổ chi tiêu</h3>
            <div className="flex items-center justify-between gap-6">
              <DonutChart percent={MOCK.spentPercent} />
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-outline shrink-0" />
                    <span className="font-body text-xs font-medium text-on-surface">Bắt buộc</span>
                  </div>
                  <span className="font-label text-xs font-bold">{formatVNDShort(MOCK.compulsory)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="font-body text-xs font-medium text-on-surface">Sinh hoạt</span>
                  </div>
                  <span className="font-label text-xs font-bold">{formatVNDShort(MOCK.lifestyle)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Savings — full width dark card */}
          <div className="col-span-2 bg-inverse-surface rounded-[24px] p-6 relative overflow-hidden">
            <div className="relative z-10">
              <p className="font-body text-xs text-outline-variant mb-1">Tổng tiết kiệm</p>
              <p className="font-label font-bold text-2xl text-surface leading-none">
                {formatVND(MOCK.savings)}{' '}
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
            {/* Decorative wave */}
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

        {/* ── Quick Insights ── */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-headline font-bold text-xl">Giao dịch gần đây</h3>
            <button
              onClick={() => navigate('/history')}
              className="font-headline text-sm font-bold text-primary active:opacity-70 transition-opacity"
            >
              Xem lịch sử
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {MOCK.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-surface-container-low rounded-[20px] border-ghost"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${tx.iconBg} flex items-center justify-center ${tx.iconColor} shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]">{tx.icon}</span>
                  </div>
                  <div>
                    <p className="font-body font-semibold text-sm text-on-surface">{tx.title}</p>
                    <p className="font-label text-[10px] text-outline uppercase tracking-wider mt-0.5">
                      {tx.subtitle}
                    </p>
                  </div>
                </div>
                <p className={`font-label font-bold text-sm ${tx.amount >= 0 ? 'text-secondary' : 'text-on-surface'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatVND(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

      </main>

      <FAB />
    </>
  )
}
