import { useEffect, useState } from 'react'
import { useBudget } from '../hooks/useBudget'
import { useSavingsGoal } from '../hooks/useSavingsGoal'
import { getCachedSummary, getCachedTransactions } from '../services/api'
import { formatVNDShort } from '../utils/formatCurrency'
import BudgetSheet from './BudgetSheet'
import SavingsGoalSheet from './SavingsGoalSheet'

interface Props {
  onClose: () => void
}

export default function NotificationSheet({ onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [subSheet, setSubSheet] = useState<'budget' | 'goal' | null>(null)

  const { threshold, setThreshold, clearThreshold } = useBudget()
  const { goal, setGoal, clearGoal } = useSavingsGoal()

  // Read spending data from cache (no network call needed)
  const currentMonth = new Date().getMonth() + 1
  const summary = getCachedSummary(currentMonth)
  const txs = getCachedTransactions(currentMonth)

  const spent = summary?.totalSpent ?? 0
  const savings = summary?.categories?.['Tiết kiệm'] ?? 0
  const todaySpent = txs
    ? txs.filter(tx => tx.day === new Date().getDate() && tx.amount < 0)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0)
    : null

  const budgetPct = threshold > 0 ? Math.min((spent / threshold) * 100, 100) : 0
  const budgetOver = threshold > 0 && spent >= threshold
  const budgetWarn = threshold > 0 && spent >= threshold * 0.7 && spent < threshold
  const goalPct = goal > 0 ? Math.min((savings / goal) * 100, 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setMounted(false)
    setTimeout(onClose, 300)
  }

  if (subSheet === 'budget') {
    return (
      <BudgetSheet
        current={threshold}
        onSave={setThreshold}
        onClear={clearThreshold}
        onClose={() => setSubSheet(null)}
      />
    )
  }

  if (subSheet === 'goal') {
    return (
      <SavingsGoalSheet
        current={goal}
        saved={savings}
        onSave={setGoal}
        onClear={clearGoal}
        onClose={() => setSubSheet(null)}
      />
    )
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[90] bg-inverse-surface/40 backdrop-blur-[2px]"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-[100] bg-surface-container-lowest rounded-t-[28px] pb-safe"
        style={{
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 -8px 40px rgba(56,57,41,0.12)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-outline/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-4">
          <div>
            <h2 className="font-headline font-black text-xl text-on-surface">Theo dõi tài chính</h2>
            <p className="font-body text-xs text-outline mt-0.5">Ngưỡng chi tiêu & mục tiêu tiết kiệm</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6">

          {/* ── Budget threshold card ── */}
          <div
            className={`rounded-[20px] p-4 border transition-all ${
              budgetOver
                ? 'bg-[#fff0ee] border-[rgba(191,42,2,0.2)]'
                : budgetWarn
                ? 'bg-[#fffbeb] border-[rgba(217,119,6,0.2)]'
                : 'bg-surface-container border-outline-variant/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  budgetOver ? 'bg-primary/12' : budgetWarn ? 'bg-amber-500/12' : 'bg-surface-container-low'
                }`}>
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      budgetOver ? 'text-primary' : budgetWarn ? 'text-amber-600' : 'text-outline'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
                  >
                    {budgetOver ? 'crisis_alert' : budgetWarn ? 'warning' : 'tune'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-headline font-bold text-sm ${
                    budgetOver ? 'text-primary' : budgetWarn ? 'text-amber-800' : 'text-on-surface'
                  }`}>
                    Ngưỡng chi tiêu
                  </p>
                  <p className="font-body text-xs text-outline mt-0.5 truncate">
                    {threshold > 0
                      ? budgetOver
                        ? `Vượt ${formatVNDShort(spent - threshold)}`
                        : `${formatVNDShort(spent)} / ${formatVNDShort(threshold)}`
                      : 'Chưa đặt ngưỡng'
                    }
                  </p>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setSubSheet('budget')}
                className={`shrink-0 px-3 py-1.5 rounded-full font-label text-xs font-semibold transition-all active:scale-95 ${
                  threshold > 0
                    ? budgetOver
                      ? 'bg-primary/10 text-primary'
                      : budgetWarn
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-surface-container text-on-surface-variant'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {threshold > 0 ? 'Sửa' : 'Đặt ngưỡng'}
              </button>
            </div>

            {/* Progress bar */}
            {threshold > 0 && (
              <div className="mt-3">
                <div className={`h-1.5 rounded-full overflow-hidden ${
                  budgetOver ? 'bg-primary/10' : budgetWarn ? 'bg-amber-500/10' : 'bg-surface-container'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      budgetOver ? 'bg-primary' : budgetWarn ? 'bg-amber-500' : 'bg-secondary'
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                <p className={`font-label text-[10px] mt-1 ${
                  budgetOver ? 'text-primary/60' : budgetWarn ? 'text-amber-600/70' : 'text-outline'
                }`}>
                  {Math.round(budgetPct)}% đã dùng
                  {!budgetOver && threshold > 0 && (
                    <span className="ml-1">· còn {formatVNDShort(threshold - spent)}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Savings goal card ── */}
          <div className="rounded-[20px] p-4 border border-outline-variant/10 bg-surface-container">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#eef6ef] flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px] text-[#2e7d32]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
                  >
                    savings
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-sm text-on-surface">Mục tiêu tiết kiệm</p>
                  <p className="font-body text-xs text-outline mt-0.5 truncate">
                    {goal > 0
                      ? savings >= goal
                        ? '🎉 Đã đạt mục tiêu!'
                        : `${formatVNDShort(savings)} / ${formatVNDShort(goal)}`
                      : 'Chưa đặt mục tiêu'
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSubSheet('goal')}
                className="shrink-0 px-3 py-1.5 rounded-full bg-[#eef6ef] text-[#2e7d32] font-label text-xs font-semibold active:scale-95 transition-all"
              >
                {goal > 0 ? 'Sửa' : 'Đặt mục tiêu'}
              </button>
            </div>

            {goal > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-[#c8e6c9]/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7cb342] rounded-full transition-all duration-700"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
                <p className="font-label text-[10px] text-[#558b2f]/70 mt-1">
                  {Math.round(goalPct)}% đạt được
                  {savings < goal && <span className="ml-1">· còn {formatVNDShort(goal - savings)}</span>}
                </p>
              </div>
            )}
          </div>

          {/* ── Today's spending snapshot ── */}
          {todaySpent !== null && todaySpent > 0 && (
            <div className="rounded-[20px] p-4 border border-outline-variant/10 bg-surface-container flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    today
                  </span>
                </div>
                <div>
                  <p className="font-headline font-bold text-sm text-on-surface">Chi hôm nay</p>
                  <p className="font-body text-xs text-outline">Tổng các khoản đã nhập</p>
                </div>
              </div>
              <p className="font-label font-bold text-base text-primary shrink-0">
                {formatVNDShort(todaySpent)}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
