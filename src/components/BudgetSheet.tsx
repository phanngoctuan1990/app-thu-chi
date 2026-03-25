import { useEffect, useRef, useState } from 'react'

interface Props {
  current: number
  onSave: (val: number) => void
  onClear: () => void
  onClose: () => void
}

const PRESETS = [
  { label: '3M', value: 3_000_000 },
  { label: '5M', value: 5_000_000 },
  { label: '8M', value: 8_000_000 },
  { label: '10M', value: 10_000_000 },
  { label: '15M', value: 15_000_000 },
]

export default function BudgetSheet({ current, onSave, onClear, onClose }: Props) {
  const [rawAmount, setRawAmount] = useState(current > 0 ? String(current) : '')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Trigger slide-up
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  const amount = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = amount > 0
    ? new Intl.NumberFormat('vi-VN').format(amount)
    : ''

  const amountSize = formatted.length <= 7 ? 'text-6xl'
    : formatted.length <= 10 ? 'text-4xl'
    : 'text-3xl'

  function handleSave() {
    if (amount > 0) {
      onSave(amount)
      handleClose()
    }
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
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
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
            <h2 className="font-headline font-black text-xl text-on-surface">Ngưỡng chi tiêu</h2>
            <p className="font-body text-xs text-outline mt-0.5">
              App sẽ cảnh báo khi bạn sắp vượt mức
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-6 bg-outline-variant/15 my-2" />

        {/* Amount display */}
        <div
          className="flex flex-col items-center justify-center py-6 px-6 cursor-pointer"
          onClick={() => inputRef.current?.focus()}
        >
          {amount === 0 ? (
            <div className="flex items-center gap-3">
              <span className="font-headline text-outline/35 text-xl">Nhập số tiền</span>
              <div
                className="w-0.5 h-8 bg-primary/50 rounded-full"
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
          <div className={`h-1 rounded-full mt-3 transition-all duration-300 ${amount > 0 ? 'w-16 bg-primary/40' : 'w-10 bg-primary/15'}`} />
        </div>

        {/* Hidden input */}
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
                amount === value
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-primary/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Info row */}
        <div className="mx-6 mt-2 px-4 py-3 rounded-[14px] bg-surface-container flex items-start gap-3">
          <span className="material-symbols-outlined text-[16px] text-outline shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
            info
          </span>
          <p className="font-body text-xs text-outline leading-relaxed">
            Cảnh báo sẽ hiện khi chi tiêu đạt <span className="font-semibold text-on-surface">70%</span> ngưỡng. Vượt ngưỡng sẽ hiển thị cảnh báo đỏ.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pt-4 pb-6">
          <button
            onClick={handleSave}
            disabled={amount <= 0}
            className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-base shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Lưu ngưỡng
          </button>
          {current > 0 && (
            <button
              onClick={() => { onClear(); handleClose() }}
              className="w-full py-3 rounded-full font-body text-sm text-outline active:opacity-70 transition-opacity duration-150"
            >
              Xóa ngưỡng chi tiêu
            </button>
          )}
        </div>
      </div>
    </>
  )
}
