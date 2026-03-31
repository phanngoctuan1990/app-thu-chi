// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = (import.meta.env.VITE_GAS_URL as string | undefined)
  || 'https://script.google.com/macros/s/AKfycbzTj8OzpfRMgYGIUccq33Zf7r_x-nJlr0cdkPWmiKd75hOGe-mI5V-irynEY5moOuYUQw/exec'

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
  category: string   // English ID
  note: string
  amount: number     // negative = expense, positive = income
  user?: string      // who entered this (multi-tenant)
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

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000

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
  const sheetId = getSheetId()
  localStorage.removeItem(`summary_${sheetId}_${month}`)
  localStorage.removeItem(`transactions_${sheetId}_${month}`)
}

export function cacheRemoveTx(month: number, tx: TxRecord) {
  const sheetId = getSheetId()
  const key = `transactions_${sheetId}_${month}`
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

export function getCachedSummary(month?: number): Summary | null {
  const m = month ?? new Date().getMonth() + 1
  const sheetId = getSheetId()
  return cacheGet<Summary>(`summary_${sheetId}_${m}`)
}

export function getCachedTransactions(month: number): TxRecord[] | null {
  const sheetId = getSheetId()
  return cacheGet<TxRecord[]>(`transactions_${sheetId}_${month}`)
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchSummary(month?: number): Promise<Summary> {
  const m = month ?? new Date().getMonth() + 1
  const sheetId = getSheetId()
  const key = `summary_${sheetId}_${m}`
  const cached = cacheGet<Summary>(key)
  if (cached) return cached

  const params = new URLSearchParams({ action: 'summary', month: String(m) })
  if (sheetId) params.set('sheetId', sheetId)
  const res = await fetch(`${API_URL}?${params}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  cacheSet(key, json)
  return json as Summary
}

export async function fetchTransactions(month: number): Promise<TxRecord[]> {
  const sheetId = getSheetId()
  const key = `transactions_${sheetId}_${month}`
  const cached = cacheGet<TxRecord[]>(key)
  if (cached) return cached

  const params = new URLSearchParams({ action: 'transactions', month: String(month) })
  if (sheetId) params.set('sheetId', sheetId)
  const res = await fetch(`${API_URL}?${params}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  const txs = (json.transactions ?? []) as TxRecord[]
  cacheSet(key, txs)
  return txs
}

export async function addTransaction(data: Transaction): Promise<void> {
  const sheetId = getSheetId()
  const payload = {
    date:      data.date,
    amount:    data.amount,
    category:  CATEGORY_VI[data.category] ?? data.category,
    note:      data.note,
    sheetId,
    userName:  getUserName(),
    timestamp: new Date().toISOString(),
  }
  await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
    mode:    'no-cors',
  })
}

export async function deleteTransaction(tx: TxRecord, month: number): Promise<void> {
  const sheetId = getSheetId()
  const payload = {
    action:   'delete',
    month,
    category: tx.category,
    day:      tx.day,
    note:     tx.note,
    amount:   Math.abs(tx.amount),
    sheetId,
  }
  await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
    mode:    'no-cors',
  })
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
