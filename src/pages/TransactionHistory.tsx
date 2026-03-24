import { useEffect, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'
import { fetchSummary, fetchTransactions, type TxRecord, type Summary } from '../services/api'

// ─── Category meta ────────────────────────────────────────────────────────────
const CAT_META: Record<string, { icon: string; iconBg: string; iconColor: string; label: string }> = {
  'Ăn uống sinh hoạt':     { icon: 'restaurant',          iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', label: 'Ăn uống' },
  'Mua hàng':               { icon: 'shopping_bag',         iconBg: 'bg-orange-100',  iconColor: 'text-orange-700',  label: 'Mua hàng' },
  'Chi tiêu bắt buộc':     { icon: 'receipt_long',          iconBg: 'bg-slate-200',   iconColor: 'text-slate-700',   label: 'Bắt buộc' },
  'Chi tiêu khác':         { icon: 'more_horiz',            iconBg: 'bg-yellow-100',  iconColor: 'text-yellow-700',  label: 'Khác' },
  'Phương tiện di chuyển': { icon: 'directions_car',        iconBg: 'bg-cyan-100',    iconColor: 'text-cyan-700',    label: 'Di chuyển' },
  'Đi chơi':               { icon: 'celebration',           iconBg: 'bg-sky-100',     iconColor: 'text-sky-700',     label: 'Vui chơi' },
  'Đầu tư':                { icon: 'trending_up',           iconBg: 'bg-green-100',   iconColor: 'text-green-700',   label: 'Đầu tư' },
  'Tiết kiệm':             { icon: 'account_balance_wallet',iconBg: 'bg-neutral-200', iconColor: 'text-neutral-700', label: 'Tiết kiệm' },
  'Thu nhập':              { icon: 'payments',              iconBg: 'bg-rose-100',    iconColor: 'text-rose-700',    label: 'Thu nhập' },
}
const DEFAULT_META = { icon: 'receipt', iconBg: 'bg-surface-container', iconColor: 'text-outline', label: 'Khác' }

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: TxRecord }) {
  const isIncome = tx.amount >= 0
  const meta = CAT_META[tx.category] ?? DEFAULT_META
  return (
    <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-[20px] bento-shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${meta.iconBg} flex items-center justify-center ${meta.iconColor} shrink-0`}>
          <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
        </div>
        <div>
          <p className="font-body font-semibold text-on-surface text-sm">{tx.note}</p>
          <p className="font-body text-xs text-outline mt-0.5">{meta.label}</p>
        </div>
      </div>
      <p className={`font-label font-bold text-sm shrink-0 ml-3 ${isIncome ? 'text-secondary' : 'text-primary'}`}>
        {isIncome ? '+' : ''}{formatVND(Math.abs(tx.amount))}
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR  = new Date().getFullYear()

function monthLabel(m: number) {
  return `Tháng ${m}, ${CURRENT_YEAR}`
}

export default function TransactionHistory() {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txList, setTxList] = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    setTxList([])
    Promise.all([fetchSummary(month), fetchTransactions(month)])
      .then(([s, txs]) => { setSummary(s); setTxList(txs) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month])

  // Today's spending (only for current month)
  const today = new Date().getDate()
  const todaySpent = month === CURRENT_MONTH
    ? txList.filter(tx => tx.day === today && tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
    : null
  const yesterday = today - 1
  const groups = txList.reduce<Record<number, TxRecord[]>>((acc, tx) => {
    if (!acc[tx.day]) acc[tx.day] = []
    acc[tx.day].push(tx)
    return acc
  }, {})
  const sortedDays = Object.keys(groups).map(Number).sort((a, b) => b - a)

  function dayLabel(d: number) {
    if (d === today)     return 'Hôm nay'
    if (d === yesterday) return 'Hôm qua'
    return `Ngày ${d}`
  }

  return (
    <>
      <TopAppBar title="Giao dịch gần đây" />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-6">

        {/* ── Month picker ── */}
        <div className="flex items-center justify-between bg-surface-container-low p-4 rounded-[20px] border-ghost mt-2">
          <button
            onClick={() => setMonth(m => Math.max(1, m - 1))}
            disabled={month === 1}
            className="text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="font-headline font-bold text-on-surface">{monthLabel(month)}</span>
            <span className="font-label text-[9px] uppercase tracking-[0.18em] text-outline mt-0.5">
              Xem báo cáo chi tiết
            </span>
          </div>
          <button
            onClick={() => setMonth(m => Math.min(CURRENT_MONTH, m + 1))}
            disabled={month === CURRENT_MONTH}
            className="text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* ── Bento stats ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            <div className="bg-primary rounded-[24px] p-5 flex flex-col justify-between aspect-square">
              <span className="material-symbols-outlined text-on-primary text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                account_balance_wallet
              </span>
              <div>
                <p className="font-headline text-xs text-on-primary/80 mb-1">Tổng chi tiêu</p>
                <p className="font-label text-xl font-bold text-on-primary leading-none">
                  {loading ? '...' : formatVNDShort(summary?.totalSpent ?? 0)}
                </p>
              </div>
            </div>
            {todaySpent !== null && (
              <div className="bg-primary/10 rounded-[20px] p-4 flex flex-col justify-center border-ghost bento-shadow-sm">
                <p className="font-headline text-[10px] text-primary uppercase tracking-wider mb-1">Hôm nay</p>
                <p className="font-label text-lg font-bold text-primary leading-none">
                  {loading ? '...' : formatVNDShort(todaySpent)}
                </p>
              </div>
            )}
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center border-ghost bento-shadow-sm">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">Thu nhập</p>
              <p className="font-label text-lg font-bold text-secondary leading-none">
                {loading ? '...' : `+${formatVNDShort(summary?.income ?? 0)}`}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center border-ghost bento-shadow-sm">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">Tiết kiệm</p>
              <p className="font-label text-lg font-bold text-primary leading-none">
                {loading ? '...' : formatVNDShort(summary?.categories?.['Tiết kiệm'] ?? 0)}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center border-ghost bento-shadow-sm">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">Đầu tư</p>
              <p className="font-label text-lg font-bold text-on-surface leading-none">
                {loading ? '...' : formatVNDShort(summary?.categories?.['Đầu tư'] ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        {loading && (
          <p className="text-center text-outline text-sm py-4">Đang tải...</p>
        )}

        {!loading && sortedDays.length === 0 && (
          <p className="text-center text-outline text-sm py-8">Chưa có giao dịch nào trong tháng này</p>
        )}

        {!loading && (
          <div className="flex flex-col gap-8">
            {sortedDays.map(day => (
              <div key={day}>
                <h3 className="font-headline font-bold text-on-surface-variant mb-4 flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${day === today ? 'bg-primary' : 'bg-outline'}`} />
                  {dayLabel(day)}
                </h3>
                <div className="flex flex-col gap-3">
                  {groups[day].map((tx, i) => <TxRow key={i} tx={tx} />)}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <FAB />
    </>
  )
}
