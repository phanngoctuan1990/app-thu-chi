import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'
import { cacheInvalidate, cacheRemoveTx, deleteTransaction, fetchSummary, fetchTransactions, type TxRecord, type Summary } from '../services/api'

// ─── Category meta ────────────────────────────────────────────────────────────
const CAT_META: Record<string, { icon: string; iconBg: string; iconColor: string; label: string }> = {
  'Ăn uống sinh hoạt':     { icon: 'restaurant',           iconBg: 'bg-[#eef6ef]', iconColor: 'text-[#2e7d32]', label: 'Ăn uống' },
  'Mua hàng':               { icon: 'shopping_bag',          iconBg: 'bg-[#fff3e0]', iconColor: 'text-[#e65100]', label: 'Mua hàng' },
  'Chi tiêu bắt buộc':     { icon: 'receipt_long',           iconBg: 'bg-[#eceff1]', iconColor: 'text-[#455a64]', label: 'Bắt buộc' },
  'Chi tiêu khác':         { icon: 'more_horiz',             iconBg: 'bg-[#fffde7]', iconColor: 'text-[#f57f17]', label: 'Khác' },
  'Phương tiện di chuyển': { icon: 'directions_car',         iconBg: 'bg-[#e0f7fa]', iconColor: 'text-[#006064]', label: 'Di chuyển' },
  'Đi chơi':               { icon: 'celebration',            iconBg: 'bg-[#e3f2fd]', iconColor: 'text-[#1565c0]', label: 'Vui chơi' },
  'Đầu tư':                { icon: 'trending_up',            iconBg: 'bg-[#f3e5f5]', iconColor: 'text-[#6a1b9a]', label: 'Đầu tư' },
  'Tiết kiệm':             { icon: 'savings',                iconBg: 'bg-[#f9fbe7]', iconColor: 'text-[#558b2f]', label: 'Tiết kiệm' },
  'Thu nhập':              { icon: 'payments',               iconBg: 'bg-[#fce4ec]', iconColor: 'text-[#880e4f]', label: 'Thu nhập' },
}
const DEFAULT_META = { icon: 'receipt', iconBg: 'bg-surface-container', iconColor: 'text-outline', label: 'Khác' }

// ─── Transaction row (swipe-to-delete) ───────────────────────────────────────
const SWIPE_REVEAL = 72
const SWIPE_THRESHOLD = 48

function TxRow({ tx, onDelete, index }: { tx: TxRecord; onDelete: () => void; index: number }) {
  const isIncome = tx.amount >= 0
  const meta = CAT_META[tx.category] ?? DEFAULT_META
  const [offsetX, setOffsetX] = useState(0)
  const [open, setOpen] = useState(false)
  const startXRef = useRef(0)
  const draggingRef = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    draggingRef.current = true
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return
    const dx = e.touches[0].clientX - startXRef.current
    const base = open ? -SWIPE_REVEAL : 0
    const next = Math.min(0, Math.max(-SWIPE_REVEAL, base + dx))
    setOffsetX(next)
  }

  function onTouchEnd() {
    draggingRef.current = false
    const shouldOpen = offsetX < -SWIPE_THRESHOLD
    setOpen(shouldOpen)
    setOffsetX(shouldOpen ? -SWIPE_REVEAL : 0)
  }

  function handleDelete() {
    setOffsetX(-120)
    setTimeout(onDelete, 200)
  }

  return (
    <div
      className="relative rounded-[20px] overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Delete button */}
      <div className="absolute inset-y-0 right-0 w-[72px] bg-error flex items-center justify-center">
        <button onClick={handleDelete} className="flex flex-col items-center gap-0.5 active:opacity-70">
          <span className="material-symbols-outlined text-white text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
            delete
          </span>
          <span className="text-white font-label text-[10px]">Xóa</span>
        </button>
      </div>
      {/* Row */}
      <div
        style={{ transform: `translateX(${offsetX}px)`, transition: draggingRef.current ? 'none' : 'transform 0.2s ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-[20px] bento-shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${meta.iconBg} flex items-center justify-center ${meta.iconColor} shrink-0`}>
            <span className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              {meta.icon}
            </span>
          </div>
          <div>
            <p className="font-body font-semibold text-on-surface text-sm">{tx.note || meta.label}</p>
            <p className="font-body text-xs text-outline mt-0.5">{meta.label}</p>
          </div>
        </div>
        <p className={`font-label font-bold text-sm shrink-0 ml-3 ${isIncome ? 'text-secondary' : 'text-primary'}`}>
          {isIncome ? '+' : ''}{formatVND(Math.abs(tx.amount))}
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const CURRENT_MONTH = new Date().getMonth() + 1
const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_DAY   = new Date().getDate()

export default function TransactionHistory() {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txList, setTxList] = useState<TxRecord[]>([])
  const [loading, setLoading] = useState(true)

  function handleDelete(tx: TxRecord) {
    setTxList(prev => prev.filter(t =>
      !(t.day === tx.day && t.note === tx.note && t.amount === tx.amount && t.category === tx.category)
    ))
    cacheRemoveTx(month, tx)
    cacheInvalidate(month)
    deleteTransaction(tx, month).catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    setTxList([])
    Promise.all([fetchSummary(month), fetchTransactions(month)])
      .then(([s, txs]) => { setSummary(s); setTxList(txs) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month])

  const todaySpent = month === CURRENT_MONTH
    ? txList.filter(tx => tx.day === CURRENT_DAY && tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
    : null

  const groups = txList.reduce<Record<number, TxRecord[]>>((acc, tx) => {
    if (!acc[tx.day]) acc[tx.day] = []
    acc[tx.day].push(tx)
    return acc
  }, {})
  const sortedDays = Object.keys(groups).map(Number).sort((a, b) => b - a)

  function dayLabel(d: number) {
    if (d === CURRENT_DAY && month === CURRENT_MONTH) return 'Hôm nay'
    if (d === CURRENT_DAY - 1 && month === CURRENT_MONTH) return 'Hôm qua'
    return `Thứ ${d}`
  }

  // Month dot strip
  const dotCount = 12
  const dots = Array.from({ length: dotCount }, (_, i) => i + 1)

  return (
    <>
      <TopAppBar title="Lịch sử" subtitle={`Tháng ${month}, ${CURRENT_YEAR}`} />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-6">

        {/* ── Month picker ── */}
        <div className="flex items-center justify-between mt-2 gap-3">
          <button
            onClick={() => setMonth(m => Math.max(1, m - 1))}
            disabled={month === 1}
            className="w-10 h-10 rounded-full bg-surface-container-low bento-shadow-sm flex items-center justify-center text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>

          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="font-headline font-bold text-on-surface text-sm">
              Tháng {month}, {CURRENT_YEAR}
            </span>
            <div className="flex gap-1">
              {dots.map(d => (
                <div
                  key={d}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    d === month
                      ? 'w-4 bg-primary'
                      : 'w-1 bg-outline/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setMonth(m => Math.min(CURRENT_MONTH, m + 1))}
            disabled={month === CURRENT_MONTH}
            className="w-10 h-10 rounded-full bg-surface-container-low bento-shadow-sm flex items-center justify-center text-outline disabled:opacity-30 active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>

        {/* ── Bento stats (re-animate on month change) ── */}
        <div key={`stats-${month}`} className="grid grid-cols-2 gap-4">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-br from-primary to-[#881a00] rounded-[24px] p-5 flex flex-col justify-between aspect-square relative overflow-hidden animate-fade-up">
              <span
                className="absolute bottom-0 right-1 font-black leading-none pointer-events-none select-none text-white/[0.07]"
                style={{ fontSize: 64 }}
              >
                {month}
              </span>
              <span className="material-symbols-outlined text-on-primary text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                account_balance_wallet
              </span>
              <div>
                <p className="font-headline text-xs text-on-primary/80 mb-1">Tổng chi tiêu</p>
                <p className="font-label text-xl font-bold text-on-primary leading-none">
                  {loading
                    ? <span className="skeleton h-5 w-16 inline-block opacity-30" />
                    : formatVNDShort(summary?.totalSpent ?? 0)
                  }
                </p>
              </div>
            </div>

            {todaySpent !== null && (
              <div className="bg-primary/10 rounded-[20px] p-4 flex flex-col justify-center bento-shadow-sm animate-fade-up delay-50">
                <p className="font-headline text-[10px] text-primary uppercase tracking-wider mb-1">Hôm nay</p>
                <p className="font-label text-lg font-bold text-primary leading-none">
                  {loading
                    ? <span className="skeleton h-5 w-14 inline-block" />
                    : formatVNDShort(todaySpent)
                  }
                </p>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {[
              { label: 'Thu nhập', value: summary?.income ?? 0, color: 'text-secondary', delay: 'delay-100' },
              { label: 'Tiết kiệm', value: summary?.categories?.['Tiết kiệm'] ?? 0, color: 'text-primary', delay: 'delay-150' },
              { label: 'Đầu tư', value: summary?.categories?.['Đầu tư'] ?? 0, color: 'text-on-surface', delay: 'delay-200' },
            ].map(({ label, value, color, delay }) => (
              <div key={label} className={`bg-surface-container-lowest rounded-[20px] p-4 flex-1 flex flex-col justify-center bento-shadow-sm animate-fade-up ${delay}`}>
                <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-label text-lg font-bold ${color} leading-none`}>
                  {loading
                    ? <span className="skeleton h-5 w-16 inline-block" />
                    : formatVNDShort(value)
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Timeline (re-animate on month change) ── */}
        <div key={`timeline-${month}`}>
          {loading && (
            <div className="flex flex-col gap-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-[20px] bento-shadow-sm">
                  <div className="skeleton w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                  <div className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          )}

          {!loading && sortedDays.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-[24px] bg-surface-container flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[40px] text-outline/50"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' -25, 'opsz' 48" }}
                >
                  receipt_long
                </span>
              </div>
              <p className="font-headline font-bold text-on-surface-variant">Tháng {month} chưa có giao dịch</p>
              <p className="font-body text-sm text-outline text-center">Thêm giao dịch đầu tiên bằng nút + bên dưới</p>
            </div>
          )}

          {!loading && sortedDays.length > 0 && (
            <div className="flex flex-col gap-8 animate-fade-up">
              {sortedDays.map(day => {
                const isToday = day === CURRENT_DAY && month === CURRENT_MONTH
                const daySpend = groups[day]
                  .filter(tx => tx.amount < 0)
                  .reduce((s, tx) => s + Math.abs(tx.amount), 0)
                return (
                  <div key={day}>
                    {/* Date badge header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                        isToday ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'
                      }`}>
                        <span className="font-label font-bold text-sm leading-none">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-headline font-bold text-sm ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {dayLabel(day)}
                        </p>
                        {daySpend > 0 && (
                          <p className="font-label text-[10px] text-outline">
                            {formatVNDShort(daySpend)} chi tiêu
                          </p>
                        )}
                      </div>
                      <div className="h-px flex-1 bg-outline-variant/20" />
                    </div>

                    <div className="flex flex-col gap-3">
                      {groups[day].map((tx, i) => (
                        <TxRow key={i} tx={tx} index={i} onDelete={() => handleDelete(tx)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>

      <FAB />
    </>
  )
}
