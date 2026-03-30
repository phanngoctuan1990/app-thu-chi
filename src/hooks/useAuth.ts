import { useState, useCallback } from 'react'

export interface AuthUser {
  sub: string
  email: string
  name: string
  picture: string
}

export interface SheetConfig {
  sheetId: string
  role: 'owner' | 'member'
}

const KEY_USER   = 'auth_user'
const KEY_SHEET  = 'sheet_config'

function load<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') }
  catch { return null }
}

export function getStoredUser(): AuthUser | null    { return load<AuthUser>(KEY_USER) }
export function getStoredSheet(): SheetConfig | null { return load<SheetConfig>(KEY_SHEET) }

export function useAuth() {
  const [user, setUser]             = useState<AuthUser | null>(getStoredUser)
  const [sheetConfig, setSheetState] = useState<SheetConfig | null>(getStoredSheet)

  /** Open Google OAuth popup → return user info + access token */
  const login = useCallback((): Promise<{ user: AuthUser; accessToken: string }> => {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Sign-In chưa tải xong, thử lại'))
        return
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        scope: [
          'openid', 'email', 'profile',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ].join(' '),
        callback: async (tokenRes) => {
          if (tokenRes.error) { reject(new Error(tokenRes.error)); return }
          try {
            const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenRes.access_token}` },
            }).then(r => r.json())
            const authUser: AuthUser = {
              sub: info.sub, email: info.email,
              name: info.name, picture: info.picture,
            }
            localStorage.setItem(KEY_USER, JSON.stringify(authUser))
            setUser(authUser)
            resolve({ user: authUser, accessToken: tokenRes.access_token })
          } catch (err) { reject(err) }
        },
      })
      client.requestAccessToken()
    })
  }, [])

  /** Get a fresh access token (for sheet setup operations). Silent if possible. */
  const getAccessToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Sign-In chưa tải xong'))
        return
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        scope: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ].join(' '),
        callback: (tokenRes) => {
          if (tokenRes.error) reject(new Error(tokenRes.error))
          else resolve(tokenRes.access_token)
        },
      })
      client.requestAccessToken({ prompt: '' })
    })
  }, [])

  const setSheetConfig = useCallback((config: SheetConfig) => {
    localStorage.setItem(KEY_SHEET, JSON.stringify(config))
    setSheetState(config)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(KEY_USER)
    localStorage.removeItem(KEY_SHEET)
    window.location.reload()
  }, [])

  return { user, sheetConfig, login, getAccessToken, setSheetConfig, logout }
}
