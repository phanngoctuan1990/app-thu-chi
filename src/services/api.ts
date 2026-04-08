// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = (import.meta.env.VITE_GAS_URL as string | undefined)
  || 'https://script.google.com/macros/s/AKfycbwYQ-_BuspMzxqtacWJSMjSSS9iIXl8SYHhwP9c1ua4injO4vPUlpkb4CIKXIqWRdo6ag/exec'

// Maps English category IDs → Vietnamese names stored in GAS
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  date: string     // "YYYY-MM-DD"
  amount: number
  category: string // English ID
  note: string
}

export interface Summary {
  month: number
  income: number
  totalSpent: number
  categories: Record<string, number>
}

export interface TxRecord {
  day: number
  category: string   // Vietnamese name
  note: string
  amount: number     // negative = expense, positive = income
  user?: string
}

// ─── Auth context helpers ─────────────────────────────────────────────────────

function getSheetId(): string {
  try {
    const cfg = JSON.parse(localStorage.getItem('sheet_config') || 'null')
    return cfg?.sheetId || ''
  } catch { return '' }
}

function getUserName(): string {
  try {
    const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
    return u?.name || ''
  } catch { return '' }
}

// ─── Cache (no TTL — data is fresh only after explicit sync) ──────────────────

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Support both old {data, ts} format and new {data} format
    return (parsed.data !== undefined ? parsed.data : parsed) as T
  } catch { return null }
}

function cacheSet(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data })) } catch {}
}

export function getCachedSummary(month?: number): Summary | null {
  const m = month ?? new Date().getMonth() + 1
  const sheetId = getSheetId()
  return cacheGet<Summary>(`summary_${sheetId}_${m}`)
}

export function getCachedTransactions(month: number): TxRecord[] | null {
  const sheetId = getSheetId()
  return cacheGet<TxRecord[]>(`transactions_${sheetId}_${month}`)
}

// ─── No-ops kept for backward compat (optimistic updates handle cache now) ───

export function cacheInvalidate(_month: number) { /* no-op */ }
export function cacheRemoveTx(_month: number, _tx: TxRecord) { /* no-op */ }

// ─── Local-only reads (no network) ───────────────────────────────────────────

export async function fetchSummary(month?: number): Promise<Summary> {
  const m = month ?? new Date().getMonth() + 1
  return getCachedSummary(m) ?? { month: m, income: 0, totalSpent: 0, categories: {} }
}

export async function fetchTransactions(month: number): Promise<TxRecord[]> {
  return getCachedTransactions(month) ?? []
}

// ─── Sync all data from GAS (splash + manual sync button) ────────────────────

export async function syncAllData(
  onProgress?: (pct: number, status: string) => void
): Promise<void> {
  const sheetId = getSheetId()
  if (!sheetId) return

  onProgress?.(10, 'Đang kết nối...')

  const params = new URLSearchParams({ action: 'getAllData', sheetId })
  const res = await fetch(`${API_URL}?${params}`)
  onProgress?.(65, 'Đang tải dữ liệu...')

  const json = await res.json()
  if (json.error) throw new Error(json.error)

  onProgress?.(85, 'Đang lưu...')
  const months = json.months as Record<string, { summary: Summary; transactions: TxRecord[] }>

  for (const [m, data] of Object.entries(months)) {
    const month = Number(m)
    cacheSet(`summary_${sheetId}_${month}`, data.summary)
    cacheSet(`transactions_${sheetId}_${month}`, data.transactions)
  }

  onProgress?.(100, 'Hoàn tất!')
}

// ─── Compute summary from local transactions ──────────────────────────────────

function computeSummaryFromTransactions(txs: TxRecord[], month: number): Summary {
  const NON_SPENDING = new Set(['Tiết kiệm', 'Đầu tư'])
  const cats: Record<string, number> = {}
  let income = 0
  let totalSpent = 0

  txs.forEach(tx => {
    if (tx.amount > 0) {
      income += tx.amount
    } else {
      const abs = Math.abs(tx.amount)
      cats[tx.category] = (cats[tx.category] ?? 0) + abs
      if (!NON_SPENDING.has(tx.category)) totalSpent += abs
    }
  })

  return { month, income, totalSpent, categories: cats }
}

// ─── Add transaction (optimistic localStorage + async GAS) ───────────────────

export async function addTransaction(data: Transaction): Promise<void> {
  const sheetId = getSheetId()
  const month = parseInt(data.date.split('-')[1], 10)
  const day = parseInt(data.date.split('-')[2], 10)
  const catVi = CATEGORY_VI[data.category] ?? data.category
  const isIncome = data.category === 'Income'

  // Build local TxRecord
  const txRecord: TxRecord = {
    day,
    category: catVi,
    note: data.note || catVi,
    amount: isIncome ? data.amount : -data.amount,
  }

  // Optimistic: update localStorage immediately
  const existing = getCachedTransactions(month) ?? []
  const updated = [...existing, txRecord].sort((a, b) => b.day - a.day)
  cacheSet(`transactions_${sheetId}_${month}`, updated)
  cacheSet(`summary_${sheetId}_${month}`, computeSummaryFromTransactions(updated, month))

  // Async: fire-and-forget to GAS
  const payload = {
    date:      data.date,
    amount:    data.amount,
    category:  catVi,
    note:      data.note,
    sheetId,
    userName:  getUserName(),
    timestamp: new Date().toISOString(),
  }
  fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
    mode:    'no-cors',
  }).catch(() => {})
}

// ─── Delete transaction (optimistic localStorage + async GAS) ────────────────

export async function deleteTransaction(tx: TxRecord, month: number): Promise<void> {
  const sheetId = getSheetId()

  // Optimistic: remove from localStorage immediately
  const existing = getCachedTransactions(month) ?? []
  const updated = existing.filter(t =>
    !(t.day === tx.day && t.note === tx.note && t.amount === tx.amount && t.category === tx.category)
  )
  cacheSet(`transactions_${sheetId}_${month}`, updated)
  cacheSet(`summary_${sheetId}_${month}`, computeSummaryFromTransactions(updated, month))

  // Async: fire-and-forget to GAS
  const payload = {
    action:   'delete',
    month,
    category: tx.category,
    day:      tx.day,
    note:     tx.note,
    amount:   Math.abs(tx.amount),
    sheetId,
  }
  fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
    mode:    'no-cors',
  }).catch(() => {})
}

// ─── Invite codes ─────────────────────────────────────────────────────────────

export async function generateInviteCode(sheetId: string): Promise<string> {
  const params = new URLSearchParams({ action: 'generateCode', sheetId })
  const res = await fetch(`${API_URL}?${params}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.code as string
}

export async function lookupInviteCode(code: string): Promise<string> {
  const params = new URLSearchParams({ action: 'lookupCode', code })
  const res = await fetch(`${API_URL}?${params}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.sheetId as string
}
