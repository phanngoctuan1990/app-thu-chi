import { useState } from 'react'

const STORAGE_KEY = 'savings_goal'

export function useSavingsGoal() {
  const [goal, setGoalState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? parseInt(raw, 10) : 0
    } catch { return 0 }
  })

  function setGoal(val: number) {
    setGoalState(val)
    try { localStorage.setItem(STORAGE_KEY, String(val)) } catch {}
  }

  function clearGoal() {
    setGoalState(0)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return { goal, setGoal, clearGoal }
}
