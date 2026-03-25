import { useEffect, useRef, useState } from 'react'
import { addTransaction, cacheInvalidate, deleteTransaction, type TxRecord } from '../services/api'

// ─── Note suggestions (same as QuickInput) ────────────────────────────────────
const NOTE_SUGGESTIONS: { label: string; keys: string[] }[] = [
  { label: 'Ăn sáng',          keys: ['an sang'] },
  { label: 'Ăn trưa',          keys: ['an trua'] },
  { label: 'Ăn tối',           keys: ['an toi'] },
  { label: 'Ăn vặt',           keys: ['an vat'] },
  { label: 'Ăn ngoài',         keys: ['an ngoai'] },
  { label: 'Cà phê',           keys: ['ca phe', 'cf'] },
  { label: 'Trà sữa',          keys: ['tra sua', 'ts'] },
  { label: 'Sinh tố',          keys: ['sinh to'] },
  { label: 'Nước uống',        keys: ['nuoc uong', 'nuoc'] },
  { label: 'Phở',              keys: ['pho'] },
  { label: 'Bún',              keys: ['bun'] },
  { label: 'Cơm',              keys: ['com'] },
  { label: 'Bánh mì',          keys: ['banh mi', 'banh'] },
  { label: 'Đổ xăng',         keys: ['do xang', 'xang'] },
  { label: 'Grab',             keys: ['grab'] },
  { label: 'Taxi',             keys: ['taxi', 'ta'] },
  { label: 'Winmart',          keys: ['winmart', 'win'] },
  { label: 'Siêu thị',        keys: ['sieu thi', 'sieu'] },
  { label: 'Mua hàng',        keys: ['mua hang', 'mua'] },
  { label: 'Tiền nhà',        keys: ['tien nha'] },
  { label: 'Tiền điện',       keys: ['tien dien'] },
  { label: 'Tiền nước',       keys: ['tien nuoc'] },
  { label: 'Tiền internet',   keys: ['tien internet', 'inet'] },
  { label: 'Bảo hiểm',        keys: ['bao hiem'] },
  { label: 'Xem phim',        keys: ['xem phim', 'phim'] },
  { label: 'Karaoke',         keys: ['karaoke', 'kara'] },
  { label: 'Gym',             keys: ['gym'] },
  { label: 'Đám cưới',        keys: ['dam cuoi', 'dam'] },
  { label: 'Momo',            keys: ['momo', 'mo'] },
  { label: 'Lương',           keys: ['luong'] },
  { label: 'Thưởng',          keys: ['thuong'] },
  { label: 'Freelance',       keys: ['freelance', 'free'] },
  { label: 'Thuốc',           keys: ['thuoc'] },
  { label: 'Khám bệnh',       keys: ['kham benh', 'kham'] },
]

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function formatSuggestion(n: number) {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  return `${n / 1000}k`
}

// ─── Category definitions (shared visual config) ───────────────────────────
const CATEGORIES = [
  { id: 'Meals',      viName: 'Ăn uống sinh hoạt',     label: 'Ăn uống',   icon: 'restaurant',          bg: '#eef6ef', iconColor: '#2e7d32', selBg: '#c8e6c9' },
  { id: 'Shopping',   viName: 'Mua hàng',               label: 'Mua hàng',  icon: 'shopping_bag',         bg: '#fff3e0', iconColor: '#e65100', selBg: '#ffe0b2' },
  { id: 'Transport',  viName: 'Phương tiện di chuyển',  label: 'Di chuyển', icon: 'directions_car',        bg: '#e0f7fa', iconColor: '#006064', selBg: '#b2ebf2' },
  { id: 'Compulsory', viName: 'Chi tiêu bắt buộc',      label: 'Bắt buộc',  icon: 'receipt_long',          bg: '#eceff1', iconColor: '#455a64', selBg: '#cfd8dc' },
  { id: 'Fun',        viName: 'Đi chơi',                label: 'Vui chơi',  icon: 'celebration',           bg: '#e3f2fd', iconColor: '#1565c0', selBg: '#bbdefb' },
  { id: 'Invest',     viName: 'Đầu tư',                 label: 'Đầu tư',    icon: 'trending_up',           bg: '#f3e5f5', iconColor: '#6a1b9a', selBg: '#e1bee7' },
  { id: 'Savings',    viName: 'Tiết kiệm',              label: 'Tiết kiệm', icon: 'savings',               bg: '#f9fbe7', iconColor: '#558b2f', selBg: '#dcedc8' },
  { id: 'Income',     viName: 'Thu nhập',               label: 'Thu nhập',  icon: 'payments',              bg: '#fce4ec', iconColor: '#880e4f', selBg: '#f8bbd0' },
  { id: 'Other',      viName: 'Chi tiêu khác',          label: 'Khác',      icon: 'more_horiz',            bg: '#fffde7', iconColor: '#f57f17', selBg: '#fff9c4' },
] as const

type CatId = (typeof CATEGORIES)[number]['id']

// Map Vietnamese category name → English ID
const VI_TO_ID: Record<string, CatId> = Object.fromEntries(
  CATEGORIES.map(c => [c.viName, c.id])
) as Record<string, CatId>

interface Props {
  tx: TxRecord
  month: number
  onClose: () => void
  onUpdated: (oldTx: TxRecord, newTx: TxRecord) => void
  onDeleted: (tx: TxRecord) => void
}

type SaveState = 'idle' | 'saving' | 'success' | 'error'

export default function EditTransactionSheet({ tx, month, onClose, onUpdated, onDeleted }: Props) {
  const isIncome = tx.amount > 0
  const initCatId = VI_TO_ID[tx.category] ?? 'Other'
  const initAmount = Math.abs(tx.amount)

  const [rawAmount, setRawAmount] = useState(String(initAmount))
  const [catId, setCatId] = useState<CatId>(initCatId)
  const [note, setNote] = useState(tx.note === tx.category ? '' : tx.note)
  const [day, setDay] = useState(tx.day)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const year = new Date().getFullYear()
  const maxDay = new Date(year, month, 0).getDate()
  const today = new Date().getDate()
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  const amount = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : ''
  const amountSize = formatted.length <= 7 ? 'text-5xl'
    : formatted.length <= 10 ? 'text-4xl'
    : 'text-3xl'

  const selectedCat = CATEGORIES.find(c => c.id === catId)!

  // Amount suggestions
  const amountSuggestions: number[] = rawAmount
    ? [1000, 10000, 100000, 1000000]
        .map(m => parseInt(rawAmount, 10) * m)
        .filter(v => v <= 100_000_000)
    : []

  // Note suggestions
  const noteSuggestions = note.trim().length >= 1
    ? NOTE_SUGGESTIONS
        .filter(({ label, keys }) => {
          const q = normalize(note.trim())
          return normalize(label).startsWith(q) || keys.some(k => k.startsWith(q))
        })
        .map(({ label }) => label)
        .slice(0, 5)
    : []
  const hasChanged = amount !== initAmount
    || catId !== initCatId
    || note !== (tx.note === tx.category ? '' : tx.note)
    || day !== tx.day

  function handleClose() {
    setMounted(false)
    setTimeout(onClose, 300)
  }

  async function handleSave() {
    if (amount <= 0 || saveState !== 'idle') return
    setSaveState('saving')
    try {
      // Delete old → add new
      await deleteTransaction(tx, month)
      await addTransaction({ date: dateStr, amount, category: catId, note })
      cacheInvalidate(month)

      const newTx: TxRecord = {
        day,
        category: selectedCat.viName,
        note: note || selectedCat.viName,
        amount: catId === 'Income' ? amount : -amount,
      }
      setSaveState('success')
      setTimeout(() => { onUpdated(tx, newTx); handleClose() }, 600)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 1500)
    }
  }

  async function handleDelete() {
    setSaveState('saving')
    try {
      await deleteTransaction(tx, month)
      cacheInvalidate(month)
      onDeleted(tx)
      handleClose()
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 1500)
    }
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
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-[100] rounded-t-[28px] pb-safe overflow-hidden"
        style={{
          background: 'var(--sheet-bg)',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 -8px 40px rgba(56,57,41,0.14)',
        }}
      >
        {/* Tinted top strip based on current category */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${selectedCat.bg} 0%, transparent 100%)`, transition: 'background 0.3s ease' }}
        />

        {/* Handle */}
        <div className="relative flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-outline/20" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-2 pb-3">
          <div>
            <h2 className="font-headline font-black text-xl text-on-surface">Chỉnh sửa</h2>
            <p className="font-body text-xs text-outline mt-0.5">
              {isIncome ? 'Khoản thu nhập' : 'Khoản chi tiêu'} · Tháng {month}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-outline active:scale-90 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Amount ── */}
        <div
          className="relative flex flex-col items-center justify-center py-5 px-6 cursor-pointer"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-baseline gap-2 justify-center overflow-hidden w-full">
            {amount > 0 ? (
              <>
                <span className={`font-label font-bold ${amountSize} tracking-tighter text-on-surface leading-none truncate`}>
                  {formatted}
                </span>
                <span className="font-label text-lg font-medium text-outline shrink-0">VND</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-headline text-outline/40 text-lg">Nhập số tiền</span>
                <div className="w-0.5 h-7 bg-primary/50 rounded-full"
                  style={{ animation: 'blink 1s steps(1) infinite' }} />
              </div>
            )}
          </div>
          <div
            className="h-1 rounded-full mt-2 transition-all duration-300"
            style={{
              width: amount > 0 ? 56 : 36,
              backgroundColor: amount > 0 ? selectedCat.iconColor + '60' : '#38392920',
            }}
          />
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={rawAmount}
          onChange={(e) => setRawAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
          className="sr-only"
          aria-hidden="true"
        />

        {/* ── Amount suggestion chips ── */}
        {amountSuggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none px-6 mb-3 animate-fade-in">
            {amountSuggestions.map(v => (
              <button
                key={v}
                onClick={() => setRawAmount(String(v))}
                className="shrink-0 px-4 py-2 rounded-full border border-primary/25 bg-surface-container-lowest text-primary font-label font-semibold text-sm active:scale-95 transition-transform duration-150 shadow-sm"
              >
                {formatSuggestion(v)}
              </button>
            ))}
          </div>
        )}

        {/* ── Category horizontal scroll ── */}
        <div className="px-6 mb-4">
          <p className="font-label text-[10px] text-outline uppercase tracking-wider mb-2">Danh mục</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {CATEGORIES.map(cat => {
              const active = catId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setCatId(cat.id)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full font-label text-xs font-semibold transition-all duration-200 active:scale-95 border"
                  style={{
                    background: active ? cat.selBg : cat.bg,
                    color: cat.iconColor,
                    borderColor: active ? cat.iconColor + '60' : 'transparent',
                    transform: active ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: active ? `0 2px 8px ${cat.iconColor}25` : 'none',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24", color: cat.iconColor }}
                  >
                    {cat.icon}
                  </span>
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Note + Date row ── */}
        <div className="px-6 mb-4 flex flex-col gap-3">
          <div className="bg-surface-container-low rounded-[16px] px-4 py-3 flex items-center gap-3 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <span className="material-symbols-outlined text-outline text-[18px]">edit_note</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú..."
              className="bg-transparent border-none outline-none w-full font-body text-on-surface placeholder:text-outline/50 text-sm"
            />
          </div>

          {/* Note suggestion chips */}
          {noteSuggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none animate-fade-in">
              {noteSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setNote(s)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 font-body text-sm text-on-surface-variant active:scale-95 transition-transform duration-150 shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Day selector */}
          <div className="bg-surface-container-low rounded-[16px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline text-[18px]">calendar_today</span>
              <span className="font-body text-sm text-on-surface">
                Ngày {day}, Tháng {month}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDay(d => Math.max(1, d - 1))}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="font-label font-bold text-sm text-on-surface w-6 text-center">{day}</span>
              <button
                onClick={() => setDay(d => Math.min(Math.min(maxDay, today), d + 1))}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={amount <= 0 || saveState === 'saving' || !hasChanged}
            className={`w-full py-4 rounded-full font-headline font-bold text-base shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              saveState === 'success' ? 'bg-[#558b2f] text-white'
              : saveState === 'error' ? 'bg-error text-on-error'
              : 'text-white'
            }`}
            style={
              saveState === 'idle' || saveState === 'saving'
                ? { background: `linear-gradient(135deg, ${selectedCat.iconColor}, ${selectedCat.iconColor}99)` }
                : undefined
            }
          >
            {saveState === 'saving' ? (
              <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang lưu...</>
            ) : saveState === 'success' ? (
              <><span className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>check_circle</span>Đã cập nhật!</>
            ) : saveState === 'error' ? (
              <><span className="material-symbols-outlined text-xl">error</span>Lỗi, thử lại!</>
            ) : (
              <><span className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>check</span>Cập nhật</>
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={saveState === 'saving'}
            className="w-full py-3 rounded-full font-body text-sm text-error/80 flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Xóa giao dịch
          </button>
        </div>
      </div>
    </>
  )
}
