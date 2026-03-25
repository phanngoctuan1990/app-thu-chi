import { useEffect, useState } from 'react'
import { formatVNDShort } from '../utils/formatCurrency'

export type Currency = 'VND' | 'USD'
export const EXCHANGE_RATE = 25_000 // 1 USD ≈ 25,000 VND

function dispatchCurrencyChange(c: Currency) {
  // Notify same-window listeners (StorageEvent only fires on OTHER tabs)
  window.dispatchEvent(new StorageEvent('storage', { key: 'app_currency', newValue: c }))
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(() =>
    (localStorage.getItem('app_currency') as Currency) ?? 'VND'
  )

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'app_currency' && (e.newValue === 'VND' || e.newValue === 'USD')) {
        setCurrencyState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function setCurrency(c: Currency) {
    setCurrencyState(c)
    localStorage.setItem('app_currency', c)
    dispatchCurrencyChange(c)
  }

  /** Short formatted string — "1.2M" / "$48" */
  function formatShort(vnd: number): string {
    if (currency === 'USD') {
      const usd = vnd / EXCHANGE_RATE
      if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`
      if (usd >= 100)  return `$${Math.round(usd)}`
      if (usd >= 10)   return `$${usd.toFixed(1)}`
      return `$${usd.toFixed(2)}`
    }
    return formatVNDShort(vnd)
  }

  /** Full formatted string — "1.250.000 VND" / "$50.00" */
  function formatFull(vnd: number): string {
    if (currency === 'USD') {
      const usd = vnd / EXCHANGE_RATE
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 2,
      }).format(usd)
    }
    return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND'
  }

  const symbol = currency === 'USD' ? '$' : '₫'

  return { currency, setCurrency, formatShort, formatFull, symbol, exchangeRate: EXCHANGE_RATE }
}
