const API_URL =
  'https://script.google.com/macros/s/AKfycbzcGLXvKyeJ3zUQxBwYH9gqCfciHHOKjWwM7e3yECximAdtHW6eO3S1EcuiKlQjtZo7XA/exec'

export interface Transaction {
  date: string     // "YYYY-MM-DD"
  amount: number   // 95000
  category: string // "Meals" (English ID from app)
  note: string     // "Phở sáng"
}

// Maps English category IDs → Vietnamese names expected by Google Apps Script columnMap
const CATEGORY_VI: Record<string, string> = {
  Meals:       'Ăn uống sinh hoạt',
  Shopping:    'Mua hàng',
  Transport:   'Phương tiện di chuyển',
  Compulsory:  'Chi tiêu bắt buộc',
  Fun:         'Đi chơi',
  Invest:      'Đầu tư',
  Savings:     'Tiết kiệm',
  Income:      'Thu nhập',
  Other:       'Chi tiêu khác',
}

export interface Summary {
  month: number
  income: number
  totalSpent: number
  categories: Record<string, number>
}

export interface TxRecord {
  day: number
  category: string
  note: string
  amount: number  // negative = chi tiêu, positive = thu nhập
}

// ─── Local cache (stale-while-revalidate) ────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data as T
  } catch { return null }
}

function cacheSet(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function cacheInvalidate(month: number) {
  localStorage.removeItem(`summary_${month}`)
  localStorage.removeItem(`transactions_${month}`)
}

export function cacheRemoveTx(month: number, tx: TxRecord) {
  const key = `transactions_${month}`
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const { data, ts } = JSON.parse(raw)
    const filtered = (data as TxRecord[]).filter(t =>
      !(t.day === tx.day && t.note === tx.note && t.amount === tx.amount && t.category === tx.category)
    )
    localStorage.setItem(key, JSON.stringify({ data: filtered, ts }))
  } catch {}
}

// ─── Fetchers with cache ──────────────────────────────────────────────────────

export async function fetchSummary(month?: number): Promise<Summary> {
  const m = month ?? new Date().getMonth() + 1
  const key = `summary_${m}`
  const cached = cacheGet<Summary>(key)
  if (cached) return cached
  const res = await fetch(`${API_URL}?action=summary&month=${m}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  cacheSet(key, json)
  return json as Summary
}

export async function fetchTransactions(month: number): Promise<TxRecord[]> {
  const key = `transactions_${month}`
  const cached = cacheGet<TxRecord[]>(key)
  if (cached) return cached
  const res = await fetch(`${API_URL}?action=transactions&month=${month}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  const txs = (json.transactions ?? []) as TxRecord[]
  cacheSet(key, txs)
  return txs
}

export async function deleteTransaction(tx: TxRecord, month: number): Promise<void> {
  const payload = {
    action:   'delete',
    month,
    category: tx.category,
    day:      tx.day,
    note:     tx.note,
    amount:   Math.abs(tx.amount),
  }
  await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
    mode:    'no-cors',
  })
}

export async function addTransaction(data: Transaction): Promise<void> {
  const payload = {
    date:     data.date,
    amount:   data.amount,
    category: CATEGORY_VI[data.category] ?? data.category,
    note:     data.note,
  }

  // Must use text/plain — application/json triggers CORS preflight
  // which Google Apps Script does not support.
  // GAS reads body via: JSON.parse(e.postData.contents)
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    mode: 'no-cors',
  })
}
