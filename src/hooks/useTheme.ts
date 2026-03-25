import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function applyTheme(t: Theme) {
  if (t === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme') as Theme | null
    return saved ?? 'light'
  })

  // Keep DOM in sync if another tab changes the theme
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'app_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue)
        applyTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('app_theme', t)
    applyTheme(t)
  }

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return { theme, setTheme, toggleTheme }
}
