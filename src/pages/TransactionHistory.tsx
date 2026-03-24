import { useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Transaction {
  id: number
  title: string
  subtitle: string   // "Category • HH:MM"
  amount: number     // negative = chi tiêu, positive = thu nhập
  icon: string
  iconBg: string
  iconColor: string
}

interface DayGroup {
  label: string      // "Hôm nay" | "Hôm qua" | "DD/MM"
  dot: string        // tailwind color class for the dot
  transactions: Transaction[]
}

// ─── Mock data per month ─────────────────────────────────────────────────────

const MONTHS = [
  { label: 'Tháng 1, 2026', spent: 11_200_000, income: 25_000_000, savings: 2_100_000 },
  { label: 'Tháng 2, 2026', spent: 14_800_000, income: 25_000_000, savings: 1_500_000 },
  { label: 'Tháng 3, 2026', spent: 12_450_000, income: 25_000_000, savings: 3_200_000 },
]

const MOCK_GROUPS: DayGroup[] = [
  {
    label: 'Hôm nay',
    dot: 'bg-primary',
    transactions: [
      {
        id: 1,
        title: 'Phở Thìn Lò Đúc',
        subtitle: 'Ăn uống • 12:30',
        amount: -95_000,
        icon: 'restaurant',
        iconBg: 'bg-surface-container',
        iconColor: 'text-primary',
      },
      {
        id: 2,
        title: 'Grab Bike',
        subtitle: 'Di chuyển • 08:15',
        amount: -32_000,
        icon: 'directions_car',
        iconBg: 'bg-secondary-container/30',
        iconColor: 'text-secondary',
      },
    ],
  },
  {
    label: 'Hôm qua',
    dot: 'bg-outline',
    transactions: [
      {
        id: 3,
        title: 'Lương tháng 10',
        subtitle: 'Thu nhập • 17:00',
        amount: 25_000_000,
        icon: 'payments',
        iconBg: 'bg-tertiary-container/40',
        iconColor: 'text-tertiary',
      },
      {
        id: 4,
        title: 'Uniqlo Vincom',
        subtitle: 'Mua sắm • 15:45',
        amount: -1_250_000,
        icon: 'shopping_bag',
        iconBg: 'bg-inverse-primary/10',
        iconColor: 'text-inverse-primary',
      },
      {
        id: 5,
        title: 'The Coffee House',
        subtitle: 'Ăn uống • 09:30',
        amount: -45_000,
        icon: 'coffee',
        iconBg: 'bg-on-tertiary-fixed-variant/10',
        iconColor: 'text-on-tertiary-fixed-variant',
      },
    ],
  },
]

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.amount >= 0
  return (
    <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-[20px] bento-shadow-sm group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${tx.iconBg} flex items-center justify-center ${tx.iconColor} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="material-symbols-outlined text-[20px]">{tx.icon}</span>
        </div>
        <div>
          <p className="font-body font-semibold text-on-surface text-sm">{tx.title}</p>
          <p className="font-body text-xs text-outline mt-0.5">{tx.subtitle}</p>
        </div>
      </div>
      <p className={`font-label font-bold text-sm shrink-0 ml-3 ${isIncome ? 'text-secondary' : 'text-primary'}`}>
        {isIncome ? '+' : ''}{formatVND(tx.amount)}
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TransactionHistory() {
  const [monthIdx, setMonthIdx] = useState(2) // default: most recent
  const current = MONTHS[monthIdx]

  function prev() { setMonthIdx((i) => Math.max(0, i - 1)) }
  function next() { setMonthIdx((i) => Math.min(MONTHS.length - 1, i + 1)) }

  return (
    <>
      <TopAppBar title="Giao dịch gần đây" />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-6">

        {/* ── Month picker ── */}
        <div className="flex items-center justify-between bg-surface-container-low p-4 rounded-[20px] border-ghost mt-2">
          <button
            onClick={prev}
            disabled={monthIdx === 0}
            className="text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="font-headline font-bold text-on-surface">{current.label}</span>
            <span className="font-label text-[9px] uppercase tracking-[0.18em] text-outline mt-0.5">
              Xem báo cáo chi tiết
            </span>
          </div>
          <button
            onClick={next}
            disabled={monthIdx === MONTHS.length - 1}
            className="text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* ── Bento stats 2-col ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Tổng chi tiêu — square, primary red */}
          <div className="bg-primary rounded-[24px] p-5 flex flex-col justify-between aspect-square">
            <span className="material-symbols-outlined text-on-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              account_balance_wallet
            </span>
            <div>
              <p className="font-headline text-xs text-on-primary/80 mb-1">Tổng chi tiêu</p>
              <p className="font-label text-xl font-bold text-on-primary leading-none">
                {formatVNDShort(current.spent)}
              </p>
            </div>
          </div>

          {/* Thu nhập + Tiết kiệm — stacked */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center border-ghost bento-shadow-sm">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">
                Thu nhập
              </p>
              <p className="font-label text-lg font-bold text-secondary leading-none">
                +{formatVNDShort(current.income)}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center border-ghost bento-shadow-sm">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">
                Tiết kiệm
              </p>
              <p className="font-label text-lg font-bold text-primary leading-none">
                {formatVNDShort(current.savings)}
              </p>
            </div>
          </div>

        </div>

        {/* ── Timeline grouped by day ── */}
        <div className="flex flex-col gap-8">
          {MOCK_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <h3 className="font-headline font-bold text-on-surface-variant mb-4 flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${group.dot}`} />
                {group.label}
              </h3>
              {/* Rows — no dividers, tonal spacing */}
              <div className="flex flex-col gap-3">
                {group.transactions.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </div>
            </div>
          ))}
        </div>

      </main>

      <FAB />
    </>
  )
}
