import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import NotificationSheet from '../components/NotificationSheet'
import EditTransactionSheet from '../components/EditTransactionSheet'
import FAB from '../components/FAB'
import { formatVND, formatVNDShort } from '../utils/formatCurrency'
import { deleteTransaction, fetchSummary, fetchTransactions, getCachedSummary, getCachedTransactions, type TxRecord, type Summary } from '../services/api'
import { useSyncContext } from '../contexts/SyncContext'
import { CAT_BY_VI } from '../constants/categories'

const DEFAULT_META = { icon: 'receipt', iconBg: 'bg-surface-container', iconColor: 'text-outline', label: 'Khác' }

function getCatMeta(category: string) {
  const c = CAT_BY_VI[category]
  if (!c) return DEFAULT_META
  return { icon: c.icon, iconBg: c.iconBg, iconColor: c.iconColor, label: c.label }
}

// ─── Transaction row (swipe-to-delete) ───────────────────────────────────────
const SWIPE_REVEAL = 72
const SWIPE_THRESHOLD = 48

function TxRow({ tx, onDelete, onTap, index }: { tx: TxRecord; onDelete: () => void; onTap: () => void; index: number }) {
  const isIncome = tx.amount >= 0
  const meta = getCatMeta(tx.category)
  const [offsetX, setOffsetX] = useState(0)
  const [open, setOpen] = useState(false)
  const startXRef = useRef(0)
  const draggingRef = useRef(false)
  const swipedRef = useRef(false)  // true khi swipe đủ xa → chặn click

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    draggingRef.current = true
    swipedRef.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return
    const dx = e.touches[0].clientX - startXRef.current
    if (Math.abs(dx) > 10) swipedRef.current = true
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

  function handleClick() {
    // Nếu đang mở (swipe state) → tap để đóng lại, không mở edit
    if (open) { setOpen(false); setOffsetX(0); return }
    // Nếu vừa swipe → không mở edit
    if (swipedRef.current) return
    onTap()
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
        onClick={handleClick}
        className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-[20px] bento-shadow-sm active:bg-surface-container transition-colors duration-150"
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
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <p className={`font-label font-bold text-sm ${isIncome ? 'text-secondary' : 'text-primary'}`}>
            {isIncome ? '+' : ''}{formatVND(Math.abs(tx.amount))}
          </p>
          <span className="material-symbols-outlined text-[16px] text-outline/40">chevron_right</span>
        </div>
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
  const [showNotifSheet, setShowNotifSheet] = useState(false)
  const [editingTx, setEditingTx] = useState<TxRecord | null>(null)
  const [summary, setSummary] = useState<Summary | null>(() => getCachedSummary(CURRENT_MONTH))
  const [txList, setTxList] = useState<TxRecord[]>(() => getCachedTransactions(CURRENT_MONTH) ?? [])
  const [loading, setLoading] = useState(() => getCachedSummary(CURRENT_MONTH) === null)

  const { lastSync } = useSyncContext()

  function handleDelete(tx: TxRecord) {
    setTxList(prev => prev.filter(t =>
      !(t.day === tx.day && t.note === tx.note && t.amount === tx.amount && t.category === tx.category)
    ))
    deleteTransaction(tx, month).catch(() => {})
    // Re-read updated summary from localStorage
    fetchSummary(month).then(setSummary).catch(() => {})
  }

  function handleUpdated(oldTx: TxRecord, newTx: TxRecord) {
    setTxList(prev => {
      const filtered = prev.filter(t =>
        !(t.day === oldTx.day && t.note === oldTx.note && t.amount === oldTx.amount && t.category === oldTx.category)
      )
      return [...filtered, newTx].sort((a, b) => b.day - a.day)
    })
    setEditingTx(null)
    fetchSummary(month).then(setSummary).catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    setTxList([])
    Promise.all([fetchSummary(month), fetchTransactions(month)])
      .then(([s, txs]) => { setSummary(s); setTxList(txs) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month, lastSync])

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
      <TopAppBar title="Lịch sử" subtitle={`Tháng ${month}, ${CURRENT_YEAR}`} onBellPress={() => setShowNotifSheet(true)} />

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

        {/* ── Stats (re-animate on month change) ── */}
        <div key={`stats-${month}`} className="flex flex-col gap-3">

          {/* Tổng chi tiêu — compact horizontal banner */}
          <div className="bg-gradient-to-r from-primary to-[#7a1700] rounded-[24px] px-5 py-4 flex items-center justify-between relative overflow-hidden animate-fade-up"
            style={{ boxShadow: '0 8px 24px -4px rgba(191,42,2,0.35)' }}>
            {/* Month watermark */}
            <span className="absolute right-4 inset-y-0 flex items-center font-black text-white/[0.06] pointer-events-none select-none leading-none" style={{ fontSize: 88 }}>
              {month}
            </span>
            {/* Left: icon + label */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-[10px] overflow-hidden shrink-0 bg-white shadow-sm">
                <img src="/icon.svg" alt="" className="w-full h-full object-cover" />
              </div>
              <span className="font-headline text-sm text-white/75 leading-tight">Tổng chi<br/>tiêu</span>
            </div>
            {/* Amount */}
            <span className="font-label font-bold text-[26px] text-white relative z-10 leading-none">
              {loading
                ? <span className="skeleton h-6 w-20 inline-block rounded opacity-30" />
                : formatVNDShort(summary?.totalSpent ?? 0)
              }
            </span>
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Thu nhập */}
            <div className="bg-surface-container-lowest rounded-[20px] p-4 bento-shadow-sm animate-fade-up delay-100">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1.5">Thu nhập</p>
              <p className="font-label text-lg font-bold text-secondary leading-none">
                {loading ? <span className="skeleton h-5 w-16 inline-block" /> : formatVNDShort(summary?.income ?? 0)}
              </p>
            </div>

            {/* Hôm nay (current month only) */}
            {todaySpent !== null ? (
              <div className="bg-primary/10 rounded-[20px] p-4 bento-shadow-sm animate-fade-up delay-150">
                <p className="font-headline text-[10px] text-primary uppercase tracking-wider mb-1.5">Hôm nay</p>
                <p className="font-label text-lg font-bold text-primary leading-none">
                  {loading ? <span className="skeleton h-5 w-14 inline-block" /> : formatVNDShort(todaySpent)}
                </p>
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-[20px] p-4 bento-shadow-sm animate-fade-up delay-150">
                <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1.5">Tiết kiệm</p>
                <p className="font-label text-lg font-bold text-primary leading-none">
                  {loading ? <span className="skeleton h-5 w-16 inline-block" /> : formatVNDShort(summary?.categories?.['Tiết kiệm'] ?? 0)}
                </p>
              </div>
            )}

            {/* Tiết kiệm (only alongside Hôm nay) */}
            {todaySpent !== null && (
              <div className="bg-surface-container-lowest rounded-[20px] p-4 bento-shadow-sm animate-fade-up delay-150">
                <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1.5">Tiết kiệm</p>
                <p className="font-label text-lg font-bold text-primary leading-none">
                  {loading ? <span className="skeleton h-5 w-16 inline-block" /> : formatVNDShort(summary?.categories?.['Tiết kiệm'] ?? 0)}
                </p>
              </div>
            )}

            {/* Đầu tư */}
            <div className="bg-surface-container-lowest rounded-[20px] p-4 bento-shadow-sm animate-fade-up delay-200">
              <p className="font-headline text-[10px] text-outline uppercase tracking-wider mb-1.5">Đầu tư</p>
              <p className="font-label text-lg font-bold text-on-surface leading-none">
                {loading ? <span className="skeleton h-5 w-16 inline-block" /> : formatVNDShort(summary?.categories?.['Đầu tư'] ?? 0)}
              </p>
            </div>
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
                        <TxRow key={`${tx.day}-${tx.category}-${tx.note}-${tx.amount}-${i}`} tx={tx} index={i} onDelete={() => handleDelete(tx)} onTap={() => setEditingTx(tx)} />
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

      {showNotifSheet && (
        <NotificationSheet onClose={() => setShowNotifSheet(false)} />
      )}

      {editingTx && (
        <EditTransactionSheet
          tx={editingTx}
          month={month}
          onClose={() => setEditingTx(null)}
          onUpdated={handleUpdated}
          onDeleted={(tx) => { handleDelete(tx); setEditingTx(null) }}
        />
      )}
    </>
  )
}
