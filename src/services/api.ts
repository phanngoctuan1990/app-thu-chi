const API_URL =
  'https://script.google.com/macros/s/AKfycbzRm_JXjKdAE-tKJaxClQlEcwkGlPoe96d7tUItncUquLW5UgfQMein_30UxX8hbB-YGA/exec'

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

export async function fetchSummary(): Promise<Summary> {
  const res = await fetch(`${API_URL}?action=summary`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json as Summary
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
