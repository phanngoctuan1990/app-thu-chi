import { useEffect, useRef, useState } from 'react'
import TopAppBar from '../components/TopAppBar'
import { addTransaction, cacheInvalidate, fetchSummary, fetchTransactions, getCachedSummary, getCachedTransactions } from '../services/api'
import { formatVNDShort } from '../utils/formatCurrency'
import BudgetAlert from '../components/BudgetAlert'
import NotificationSheet from '../components/NotificationSheet'
import { useBudget } from '../hooks/useBudget'

// ─── Category definitions ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'Meals',      label: 'Ăn uống',  icon: 'restaurant',    bg: 'bg-[#eef6ef]', iconBg: 'bg-[#c8e6c9]/60', iconColor: 'text-[#2e7d32]', textColor: 'text-[#1b5e20]', ringColor: 'ring-[#66bb6a]' },
  { id: 'Shopping',   label: 'Mua hàng', icon: 'shopping_bag',  bg: 'bg-[#fff3e0]', iconBg: 'bg-[#ffe0b2]/60', iconColor: 'text-[#e65100]', textColor: 'text-[#bf360c]', ringColor: 'ring-[#ffa726]' },
  { id: 'Transport',  label: 'Di chuyển',icon: 'directions_car', bg: 'bg-[#e0f7fa]', iconBg: 'bg-[#b2ebf2]/60', iconColor: 'text-[#006064]', textColor: 'text-[#004d40]', ringColor: 'ring-[#26c6da]' },
  { id: 'Compulsory', label: 'Bắt buộc', icon: 'receipt_long',  bg: 'bg-[#eceff1]', iconBg: 'bg-[#cfd8dc]/60', iconColor: 'text-[#455a64]', textColor: 'text-[#263238]', ringColor: 'ring-[#78909c]' },
  { id: 'Fun',        label: 'Vui chơi', icon: 'celebration',   bg: 'bg-[#e3f2fd]', iconBg: 'bg-[#bbdefb]/60', iconColor: 'text-[#1565c0]', textColor: 'text-[#0d47a1]', ringColor: 'ring-[#42a5f5]' },
  { id: 'Invest',     label: 'Đầu tư',   icon: 'trending_up',   bg: 'bg-[#f3e5f5]', iconBg: 'bg-[#e1bee7]/60', iconColor: 'text-[#6a1b9a]', textColor: 'text-[#4a148c]', ringColor: 'ring-[#ab47bc]' },
  { id: 'Savings',    label: 'Tiết kiệm',icon: 'savings',       bg: 'bg-[#f9fbe7]', iconBg: 'bg-[#f0f4c3]/60', iconColor: 'text-[#558b2f]', textColor: 'text-[#33691e]', ringColor: 'ring-[#aed581]' },
  { id: 'Income',     label: 'Thu nhập', icon: 'payments',      bg: 'bg-[#fce4ec]', iconBg: 'bg-[#f8bbd0]/60', iconColor: 'text-[#880e4f]', textColor: 'text-[#4a0072]', ringColor: 'ring-[#ec407a]' },
  { id: 'Other',      label: 'Khác',     icon: 'more_horiz',    bg: 'bg-[#fffde7]', iconBg: 'bg-[#fff9c4]/60', iconColor: 'text-[#f57f17]', textColor: 'text-[#e65100]', ringColor: 'ring-[#ffca28]' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

// ─── Note suggestions ─────────────────────────────────────────────────────────

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
  { label: 'Bánh ngọt',        keys: ['banh ngot'] },
  { label: 'Đổ xăng',         keys: ['do xang', 'do', 'xang'] },
  { label: 'Grab',             keys: ['grab'] },
  { label: 'Taxi',             keys: ['taxi', 'ta'] },
  { label: 'Xe buýt',          keys: ['xe buyt', 'xe'] },
  { label: 'Gửi xe',           keys: ['gui xe'] },
  { label: 'Siêu thị',        keys: ['sieu thi', 'sieu'] },
  { label: 'Winmart',          keys: ['winmart', 'win'] },
  { label: 'Tạp hóa',         keys: ['tap hoa'] },
  { label: 'Mua hàng',        keys: ['mua hang', 'mua'] },
  { label: 'Quần áo',         keys: ['quan ao'] },
  { label: 'Giày dép',        keys: ['giay dep'] },
  { label: 'Mỹ phẩm',         keys: ['my pham'] },
  { label: 'Tiền nhà',        keys: ['tien nha'] },
  { label: 'Tiền điện',       keys: ['tien dien'] },
  { label: 'Tiền nước',       keys: ['tien nuoc'] },
  { label: 'Tiền internet',   keys: ['tien internet', 'inet'] },
  { label: 'Tiền điện thoại', keys: ['tien dien thoai'] },
  { label: 'Bảo hiểm',        keys: ['bao hiem'] },
  { label: 'Xem phim',        keys: ['xem phim', 'phim'] },
  { label: 'Karaoke',         keys: ['karaoke', 'kara'] },
  { label: 'Du lịch',         keys: ['du lich'] },
  { label: 'Gym',             keys: ['gym'] },
  { label: 'Đám cưới',        keys: ['dam cuoi', 'dam'] },
  { label: 'Momo',            keys: ['momo', 'mo'] },
  { label: 'ZaloPay',         keys: ['zalopay', 'zalo'] },
  { label: 'Lương',           keys: ['luong'] },
  { label: 'Thưởng',          keys: ['thuong'] },
  { label: 'Freelance',       keys: ['freelance', 'free'] },
  { label: 'Thuốc',           keys: ['thuoc'] },
  { label: 'Khám bệnh',       keys: ['kham benh', 'kham'] },
]

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ─── Web Speech API minimal types ─────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

// ─── Voice: parse amount + note from transcript ───────────────────────────────

function parseVoiceInput(raw: string): { amount: number; note: string } {
  const text = raw.trim()
  let amount = 0
  let amountMatch = ''

  function tryMatch(re: RegExp, compute: (m: RegExpMatchArray) => number) {
    if (amount) return
    const m = text.match(re)
    if (m) { amount = Math.round(compute(m)); amountMatch = m[0] }
  }

  // "X triệu Y nghìn"
  tryMatch(/(\d+(?:[,.]\d+)?)\s*triệu\s+(\d+)\s*(?:nghìn|ngàn|k)?/i,
    m => parseFloat(m[1].replace(',', '.')) * 1_000_000 + parseInt(m[2]) * 1_000)
  // "X triệu rưỡi"
  tryMatch(/(\d+)\s*triệu\s*rưỡi/i,
    m => parseInt(m[1]) * 1_000_000 + 500_000)
  // "X triệu"
  tryMatch(/(\d+(?:[,.]\d+)?)\s*(?:triệu|tr)\b/i,
    m => parseFloat(m[1].replace(',', '.')) * 1_000_000)
  // "X nghìn / ngàn / k"
  tryMatch(/(\d+(?:[,.]\d+)?)\s*(?:nghìn|ngàn|k)\b/i,
    m => parseFloat(m[1].replace(',', '.')) * 1_000)
  // "X trăm"
  tryMatch(/(\d+)\s*trăm\b/i, m => parseInt(m[1]) * 100)
  // Vietnamese dot-separated number: 29.100, 1.500.000
  tryMatch(/\b(\d{1,3}(?:\.\d{3})+)\b/, m => parseInt(m[1].replace(/\./g, '')))
  // bare 4+ digit number
  tryMatch(/\b(\d{4,})\b/, m => parseInt(m[1]))

  const note = amountMatch
    ? text.replace(amountMatch, '').replace(/\s+/g, ' ').trim()
    : text

  return { amount, note }
}

// ─── Voice: category auto-detect from note ───────────────────────────────────

const CAT_KEYWORDS: Array<{ kw: string[]; cat: CategoryId }> = [
  { kw: ['ăn', 'cơm', 'phở', 'bún', 'bánh', 'cà phê', 'cafe', 'trà', 'nước uống', 'sinh tố', 'bữa', 'quán', 'nhà hàng', 'đồ ăn'], cat: 'Meals' },
  { kw: ['xăng', 'grab', 'taxi', 'xe buýt', 'gửi xe', 'uber', 'di chuyển'], cat: 'Transport' },
  { kw: ['mua', 'siêu thị', 'winmart', 'shop', 'quần áo', 'giày', 'mỹ phẩm', 'tạp hóa'], cat: 'Shopping' },
  { kw: ['tiền nhà', 'tiền điện', 'tiền nước', 'internet', 'bảo hiểm', 'điện thoại', 'hóa đơn'], cat: 'Compulsory' },
  { kw: ['phim', 'karaoke', 'chơi', 'du lịch', 'gym', 'đám cưới', 'game', 'giải trí'], cat: 'Fun' },
  { kw: ['đầu tư', 'chứng khoán', 'crypto', 'coin', 'quỹ'], cat: 'Invest' },
  { kw: ['tiết kiệm', 'để dành'], cat: 'Savings' },
  { kw: ['lương', 'thưởng', 'freelance', 'thu nhập', 'doanh thu'], cat: 'Income' },
]

function detectCategory(note: string): CategoryId | null {
  const n = note.toLowerCase()
  for (const { kw, cat } of CAT_KEYWORDS) {
    if (kw.some(k => n.includes(k))) return cat
  }
  return null
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = Date.now()
    const duration = 600
    const from = displayed
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.round(from + (value - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])
  return <span className={className}>{formatVNDShort(displayed)}</span>
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed top-20 left-1/2 z-[100] px-5 py-3 rounded-[16px] glass-panel border border-outline-variant/15 font-label font-medium text-sm shadow-lg ${
        type === 'success' ? 'text-on-surface' : 'bg-error/90 text-on-error border-error/20'
      }`}
      style={{ animation: 'toast-in 0.25s cubic-bezier(0.16,1,0.3,1) both', transform: 'translateX(-50%)' }}
    >
      {message}
    </div>
  )
}

// ─── Submit states ────────────────────────────────────────────────────────────
type SubmitState = 'idle' | 'loading' | 'success' | 'error'
type VoiceState  = 'idle' | 'listening' | 'unsupported'

// ─── Waveform bars (shown while listening) ────────────────────────────────────
function VoiceWave() {
  const speeds = [0.7, 1.1, 0.85, 1.3, 0.95]
  const delays = [0, 0.15, 0.05, 0.22, 0.1]
  return (
    <div className="flex items-center gap-[3px] h-6">
      {speeds.map((s, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white"
          style={{
            height: 24,
            transformOrigin: 'center',
            animation: `voice-bar ${s}s ease-in-out ${delays[i]}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuickInput() {
  const [rawAmount, setRawAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null)
  const [justSelected, setJustSelected] = useState<CategoryId | null>(null)
  const [note, setNote] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [shake, setShake] = useState(false)
  const [showNotifSheet, setShowNotifSheet] = useState(false)
  const { threshold } = useBudget()
  const todayDay = new Date().getDate()
  const currentMonth = new Date().getMonth() + 1
  const today = new Date().toISOString().split('T')[0]

  // Voice input state
  const [voiceState, setVoiceState] = useState<VoiceState>(() =>
    (window.SpeechRecognition ?? window.webkitSpeechRecognition) ? 'idle' : 'unsupported'
  )
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const [totalSpent, setTotalSpent] = useState<number | null>(() =>
    getCachedSummary(currentMonth)?.totalSpent ?? null
  )
  const [todaySpent, setTodaySpent] = useState<number | null>(() => {
    const txs = getCachedTransactions(currentMonth)
    if (!txs) return null
    return txs.filter(tx => tx.day === new Date().getDate() && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  })
  const [selectedDate, setSelectedDate] = useState(() => today)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function loadStats() {
    Promise.all([fetchSummary(), fetchTransactions(currentMonth)])
      .then(([s, txs]) => {
        setTotalSpent(s.totalSpent)
        const todayTotal = txs
          .filter(tx => tx.day === todayDay && tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        setTodaySpent(todayTotal)
      })
      .catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  const amount = rawAmount ? parseInt(rawAmount, 10) : 0
  const formatted = amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : ''
  const amountSize = formatted.length <= 6 ? 'text-7xl'
    : formatted.length <= 9  ? 'text-5xl'
    : formatted.length <= 12 ? 'text-4xl'
    : 'text-3xl'

  const suggestions: number[] = rawAmount
    ? [1000, 10000, 100000, 1000000]
        .map(m => parseInt(rawAmount, 10) * m)
        .filter(v => v <= 100000000)
    : []

  const noteSuggestions = note.trim().length >= 1
    ? NOTE_SUGGESTIONS
        .filter(({ label, keys }) => {
          const q = normalize(note.trim())
          return normalize(label).startsWith(q) || keys.some(k => k.startsWith(q))
        })
        .map(({ label }) => label)
        .slice(0, 6)
    : []

  function formatSuggestion(n: number) {
    if (n >= 1000000) {
      const m = n / 1000000
      return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
    }
    return `${n / 1000}k`
  }

  function formatDateLabel(dateStr: string) {
    if (dateStr === today) return 'Hôm nay'
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  function handleCategoryTap(id: CategoryId) {
    setSelectedCategory(prev => prev === id ? null : id)
    setJustSelected(id)
    setTimeout(() => setJustSelected(null), 400)
  }

  // ── Voice ────────────────────────────────────────────────────────────────────

  function startVoice() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final = e.results[i][0].transcript
        else interim = e.results[i][0].transcript
      }
      if (interim) setInterimText(interim)
      if (final) {
        const { amount: parsedAmount, note: parsedNote } = parseVoiceInput(final)
        if (parsedAmount > 0) setRawAmount(String(parsedAmount))
        if (parsedNote) setNote(parsedNote)
        const cat = detectCategory(parsedNote || final)
        if (cat) {
          setSelectedCategory(cat)
          setJustSelected(cat)
          setTimeout(() => setJustSelected(null), 400)
        }
        setInterimText('')
        setVoiceState('idle')
        showToast(parsedAmount > 0 ? `Nhận: "${final}"` : 'Không nhận ra số tiền', parsedAmount > 0 ? 'success' : 'error')
      }
    }

    recognition.onend = () => {
      setVoiceState('idle')
      setInterimText('')
    }

    recognition.onerror = (e) => {
      setVoiceState('idle')
      setInterimText('')
      if (e.error !== 'aborted') showToast('Không thể dùng mic, thử lại!', 'error')
    }

    recognitionRef.current = recognition
    recognition.start()
    setVoiceState('listening')
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setVoiceState('idle')
    setInterimText('')
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (amount <= 0) {
      triggerShake()
      showToast('Vui lòng nhập số tiền', 'error')
      return
    }
    if (!selectedCategory) {
      showToast('Vui lòng chọn danh mục', 'error')
      return
    }

    setSubmitState('loading')
    try {
      await addTransaction({ date: selectedDate, amount, category: selectedCategory, note })
      setSubmitState('success')
      showToast('Đã lưu! 🎉', 'success')
      setRawAmount('')
      setSelectedCategory(null)
      setNote('')
      cacheInvalidate(currentMonth)
      loadStats()
      setTimeout(() => setSubmitState('idle'), 1200)
    } catch {
      setSubmitState('error')
      showToast('Lỗi kết nối, thử lại!', 'error')
      setTimeout(() => setSubmitState('idle'), 1200)
    }
  }

  return (
    <>
      <TopAppBar title="Thu Chi" onBellPress={() => setShowNotifSheet(true)} />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        value={rawAmount}
        onChange={(e) => setRawAmount(e.target.value.replace(/\D/g, '').slice(0, 12))}
        className="sr-only"
        aria-hidden="true"
      />

      <main className="pt-20 pb-36 px-5 w-full flex flex-col gap-5">

        {/* ── Header summary card ── */}
        <section className="bg-surface-container-lowest rounded-[24px] px-6 py-5 bento-shadow relative overflow-hidden animate-fade-up">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <p className="font-body text-on-surface-variant text-sm font-medium mb-3">Xin chào!</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-label text-[10px] text-outline uppercase tracking-wider mb-1">Hôm nay</p>
              {todaySpent === null ? (
                <span className="skeleton h-7 w-20 inline-block" />
              ) : (
                <p className="font-label font-bold text-2xl text-primary leading-none">
                  <AnimatedNumber value={todaySpent} />
                  <span className="font-body text-xs text-outline font-normal ml-1">VND</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-label text-[10px] text-outline uppercase tracking-wider mb-1">Tháng này</p>
              {totalSpent === null ? (
                <span className="skeleton h-5 w-16 inline-block" />
              ) : (
                <p className="font-label font-semibold text-base text-on-surface-variant leading-none">
                  <AnimatedNumber value={totalSpent} />
                  <span className="font-body text-xs text-outline font-normal ml-1">VND</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Budget alert ── */}
        {totalSpent !== null && threshold > 0 && (
          <BudgetAlert
            spent={totalSpent}
            threshold={threshold}
            onEdit={() => setShowNotifSheet(true)}
          />
        )}

        {/* ── Amount display ── */}
        <section
          onClick={() => hiddenInputRef.current?.focus()}
          className={`bg-surface-container-lowest rounded-[24px] py-8 px-6 flex flex-col items-center justify-center gap-3 border border-outline-variant/10 cursor-pointer transition-all bento-shadow-sm ${
            shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          {amount === 0 ? (
            <div className="flex items-baseline gap-3">
              <span className="font-headline text-outline/40 text-xl">Nhập số tiền</span>
              <div
                className="w-0.5 h-8 bg-primary/50 rounded-full"
                style={{ animation: 'blink 1s steps(1) infinite' }}
              />
            </div>
          ) : (
            <div className="flex items-baseline gap-2 w-full justify-center overflow-hidden">
              <span className={`font-label font-bold ${amountSize} tracking-tighter text-on-surface leading-none truncate`}>
                {formatted}
              </span>
              <span className="font-label text-xl font-medium text-outline shrink-0">VND</span>
            </div>
          )}
          <div className={`h-1 rounded-full transition-all duration-300 ${amount > 0 ? 'w-16 bg-primary/40' : 'w-12 bg-primary/15'}`} />
        </section>

        {/* ── Amount suggestions ── */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none animate-fade-in delay-100">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setRawAmount(String(s))}
                className="shrink-0 px-4 py-2 rounded-full bg-surface-container-lowest border border-primary/25 text-primary font-label font-semibold text-sm active:scale-95 transition-transform duration-150 bento-shadow-sm"
              >
                {formatSuggestion(s)}
              </button>
            ))}
          </div>
        )}

        {/* ── Voice input ── */}
        {voiceState !== 'unsupported' && (
          <div className="animate-fade-up delay-50">
            {voiceState === 'idle' ? (
              <button
                onClick={startVoice}
                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-full bg-surface-container border border-outline-variant/15 active:scale-[0.98] transition-all duration-150 group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-active:bg-primary/20 transition-colors">
                  <span
                    className="material-symbols-outlined text-primary text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                  >
                    mic
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-body text-sm font-medium text-on-surface">Nhập bằng giọng nói</p>
                  <p className="font-label text-[10px] text-outline">VD: "ăn sáng 40 nghìn" hoặc "2 triệu rưỡi"</p>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
              </button>
            ) : (
              /* ─ Listening state ─ */
              <div
                className="flex items-center gap-4 px-5 py-4 rounded-[20px] overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, #bf2a02, #e84020)' }}
              >
                {/* Pulse rings */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-white text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                    >
                      mic
                    </span>
                  </div>
                  <span className="absolute inset-0 rounded-full bg-white/30"
                    style={{ animation: 'ping-slow 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span className="absolute inset-0 rounded-full bg-white/15"
                    style={{ animation: 'ping-slow 1.4s cubic-bezier(0,0,0.2,1) 0.4s infinite' }} />
                </div>

                {/* Text + waveform */}
                <div className="flex-1 min-w-0">
                  <p className="font-label font-bold text-[11px] text-white/70 uppercase tracking-wider mb-1">
                    Đang nghe...
                  </p>
                  {interimText ? (
                    <p className="font-body text-sm text-white truncate">{interimText}</p>
                  ) : (
                    <VoiceWave />
                  )}
                </div>

                {/* Stop button */}
                <button
                  onClick={stopVoice}
                  className="shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/35 transition-colors"
                >
                  <span className="material-symbols-outlined text-white text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>
                    stop
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Date picker ── */}
        <div className="relative bg-surface-container-lowest border border-outline-variant/10 rounded-full px-5 py-3 flex items-center justify-between active:scale-[0.98] transition-all overflow-hidden bento-shadow-sm">
          <div className="flex items-center gap-3 pointer-events-none">
            <span className="material-symbols-outlined text-outline text-xl"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              calendar_today
            </span>
            <span className="font-body text-sm text-on-surface">
              {formatDateLabel(selectedDate)}
            </span>
          </div>
          <span className="material-symbols-outlined text-outline text-base pointer-events-none">expand_more</span>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* ── Category grid 3×3 ── */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((cat, i) => {
            const isActive = selectedCategory === cat.id
            const isJust = justSelected === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryTap(cat.id)}
                className={`
                  ${cat.bg} p-4 rounded-[20px] flex flex-col items-center justify-center gap-2
                  transition-all duration-200 hover:scale-[1.03] active:scale-95
                  ${isActive ? `ring-2 ${cat.ringColor} scale-[1.03] bento-shadow-sm` : 'shadow-sm'}
                  animate-fade-up
                `}
                style={{
                  animationDelay: `${i * 40}ms`,
                  ...(isJust ? { animation: 'cat-select 0.35s ease' } : {}),
                }}
              >
                <div className={`w-10 h-10 rounded-full ${cat.iconBg} flex items-center justify-center`}>
                  <span
                    className={`material-symbols-outlined ${cat.iconColor} text-[22px]`}
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                  >
                    {cat.icon}
                  </span>
                </div>
                <span className={`font-headline font-bold text-[9px] uppercase tracking-wider ${cat.textColor}`}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Note input ── */}
        <div className="flex flex-col gap-2">
          <div className="bg-surface-container-lowest border border-outline-variant/10 focus-within:ring-1 focus-within:ring-primary/30 rounded-full px-5 py-4 flex items-center gap-3 transition-all bento-shadow-sm">
            <span className="material-symbols-outlined text-outline text-xl">edit_note</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú? (Phở sáng, Grab đi làm...)"
              className="bg-transparent border-none outline-none w-full font-body text-on-surface placeholder:text-outline/60 text-base"
            />
          </div>

          {noteSuggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none px-1">
              {noteSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setNote(s)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 font-body text-sm text-on-surface-variant active:scale-95 transition-transform duration-150 bento-shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Confirm button ── */}
        <button
          onClick={handleConfirm}
          disabled={submitState === 'loading'}
          className={`w-full py-5 rounded-full font-headline font-bold text-lg shadow-lg active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            submitState === 'success'
              ? 'bg-gradient-to-r from-secondary to-secondary-container text-on-secondary'
              : submitState === 'error'
              ? 'bg-error text-on-error opacity-90'
              : 'bg-gradient-to-r from-primary to-primary-container text-on-primary'
          }`}
          style={submitState === 'success' ? { animation: 'success-burst 0.4s ease' } : undefined}
        >
          {submitState === 'loading' ? (
            <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang lưu...</>
          ) : submitState === 'success' ? (
            <><span className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>check_circle</span>Đã lưu!</>
          ) : submitState === 'error' ? (
            <><span className="material-symbols-outlined text-xl">error</span>Lỗi, thử lại!</>
          ) : (
            'Xác nhận chi tiêu'
          )}
        </button>

      </main>

      {showNotifSheet && (
        <NotificationSheet onClose={() => setShowNotifSheet(false)} />
      )}
    </>
  )
}
