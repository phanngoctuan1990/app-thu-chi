import { useState } from 'react'

const STORAGE_KEY = 'budget_threshold'

export function useBudget() {
  const [threshold, setThresholdState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? parseInt(raw, 10) : 0
    } catch { return 0 }
  })

  function setThreshold(val: number) {
    setThresholdState(val)
    try { localStorage.setItem(STORAGE_KEY, String(val)) } catch {}
  }

  function clearThreshold() {
    setThresholdState(0)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // 0 = not set, 1 = safe (<70%), 2 = warning (70-99%), 3 = danger (>=100%)
  function getAlertLevel(spent: number): 0 | 1 | 2 | 3 {
    if (!threshold || threshold <= 0) return 0
    const pct = spent / threshold
    if (pct < 0.7) return 1
    if (pct < 1.0) return 2
    return 3
  }

  return { threshold, setThreshold, clearThreshold, getAlertLevel }
}
