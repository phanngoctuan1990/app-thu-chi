// Format số tiền kiểu Việt Nam — dấu chấm phân cách nghìn
// 95000 → "95.000"
// 1250000 → "1.250.000"
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount)
}

// Format rút gọn cho dashboard cards
// 1250000 → "1.25M" | 95000 → "95k"
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`
  }
  return String(amount)
}
