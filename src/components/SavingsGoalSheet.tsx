import { useEffect, useRef, useState } from 'react'
import { formatVNDShort } from '../utils/formatCurrency'

interface Props {
  current: number    // mục tiêu hiện tại
  saved: number      // tiết kiệm thực tế tháng này
  onSave: (val: number) => void
  onClear: () => void
  onClose: () => void
}

const PRESETS = [
  { label: '1M', value: 1_000_000 },
  { label: '2M', value: 2_000_000 },
  { label: '3M', value: 3_000_000 },
  { label: '5M', value: 5_000_000 },
  { label: '10M', value: 10_000_000 },
]

export default function SavingsGoalSheet({ current, saved, onSave, onClear, onClose }: Props) {
  const [rawAmount, setRawAmount] = useState(current > 0 ? String(current) : '')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  const goal = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = goal > 0 ? new Intl.NumberFormat('vi-VN').format(goal) : ''
  const amountSize = formatted.length <= 7 ? 'text-6xl'
    : formatted.length <= 10 ? 'text-4xl'
    : 'text-3xl'

  const pct = goal > 0 ? Math.min((saved / goal) * 100, 100) : 0
  const remaining = goal - saved

  function handleSave() {
    if (goal > 0) { onSave(goal); handleClose() }
  }

  function handleClose() {
    setMounted(false)
    setTimeout(onClose, 300)
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
        <div className="flex items-center justify-between px-6 pt-3 pb-2">
          <div>
            <h2 className="font-headline font-black text-xl text-on-surface">Mục tiêu tiết kiệm</h2>
            <p className="font-body text-xs text-outline mt-0.5">
              Đặt số tiền bạn muốn tiết kiệm trong tháng
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="h-px mx-6 bg-outline-variant/15 my-2" />

        {/* Progress preview (chỉ hiện khi đã có saved > 0 hoặc goal > 0) */}
        {(saved > 0 || goal > 0) && (
          <div className="mx-6 my-3 px-4 py-3.5 rounded-[16px] bg-[#f9fbe7] border border-[#aed581]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label text-[10px] text-[#558b2f] uppercase tracking-wider">Tiến độ tháng này</span>
              <span className="font-label text-xs font-bold text-[#33691e]">
                {saved > 0 ? formatVNDShort(saved) : '0'} / {goal > 0 ? formatVNDShort(goal) : '—'}
              </span>
            </div>
            <div className="h-2 bg-[#c5e1a5]/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7cb342] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {goal > 0 && (
              <p className="font-body text-[10px] text-[#558b2f] mt-1.5">
                {saved >= goal
                  ? '🎉 Đã đạt mục tiêu!'
                  : `Còn ${formatVNDShort(remaining)} nữa là đạt mục tiêu`
                }
              </p>
            )}
          </div>
        )}

        {/* Amount display */}
        <div
          className="flex flex-col items-center justify-center py-5 px-6 cursor-pointer"
          onClick={() => inputRef.current?.focus()}
        >
          {goal === 0 ? (
            <div className="flex items-center gap-3">
              <span className="font-headline text-outline/35 text-xl">Nhập số tiền</span>
              <div
                className="w-0.5 h-8 bg-[#7cb342]/60 rounded-full"
                style={{ animation: 'blink 1s steps(1) infinite' }}
              />
            </div>
          ) : (
            <div className="flex items-baseline gap-2 justify-center overflow-hidden w-full">
              <span className={`font-label font-bold ${amountSize} tracking-tighter text-on-surface leading-none truncate`}>
                {formatted}
              </span>
              <span className="font-label text-xl font-medium text-outline shrink-0">VND</span>
            </div>
          )}
          <div className={`h-1 rounded-full mt-3 transition-all duration-300 ${goal > 0 ? 'w-16 bg-[#7cb342]/50' : 'w-10 bg-outline/15'}`} />
        </div>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={rawAmount}
          onChange={(e) => setRawAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
          className="sr-only"
          aria-hidden="true"
          autoFocus
        />

        {/* Preset chips */}
        <div className="flex gap-2 px-6 pb-2 overflow-x-auto scrollbar-none">
          {PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRawAmount(String(value))}
              className={`shrink-0 px-4 py-2 rounded-full font-label font-semibold text-sm transition-all duration-150 active:scale-95 border ${
                goal === value
                  ? 'bg-[#558b2f] text-white border-[#558b2f]'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pt-3 pb-6">
          <button
            onClick={handleSave}
            disabled={goal <= 0}
            className="w-full py-4 rounded-full font-headline font-bold text-base shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ background: goal > 0 ? 'linear-gradient(135deg, #558b2f, #7cb342)' : undefined, backgroundColor: goal <= 0 ? '#ccc' : undefined }}
          >
            Lưu mục tiêu
          </button>
          {current > 0 && (
            <button
              onClick={() => { onClear(); handleClose() }}
              className="w-full py-3 rounded-full font-body text-sm text-outline active:opacity-70 transition-opacity"
            >
              Xóa mục tiêu
            </button>
          )}
        </div>
      </div>
    </>
  )
}
