interface GISTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  error?: string
}

interface GISTokenClientConfig {
  client_id: string
  scope: string
  callback: (response: GISTokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

interface GISTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void
}

interface GoogleOAuth2 {
  initTokenClient(config: GISTokenClientConfig): GISTokenClient
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface GoogleGIS {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google: GoogleGIS
  }
}

export {}
