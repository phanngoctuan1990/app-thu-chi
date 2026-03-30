const GAS_URL = import.meta.env.VITE_GAS_URL as string

/** Create a new blank Google Sheet in user's Drive, then call GAS to initialize the template */
export async function createNewSheet(accessToken: string, userName: string): Promise<string> {
  // Step 1: Create blank spreadsheet via Sheets API (in user's Drive)
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title: `Thu Chi — ${userName}` } }),
  })
  const data = await res.json()
  if (!data.spreadsheetId) throw new Error(data.error?.message || 'Tạo Sheet thất bại')
  const sheetId = data.spreadsheetId as string

  // Step 2: Call GAS to initialize the block-format template (12 month tabs)
  if (GAS_URL) {
    const initRes = await fetch(`${GAS_URL}?action=initTemplate&sheetId=${sheetId}`)
    const initData = await initRes.json().catch(() => ({}))
    if ((initData as any).error) throw new Error((initData as any).error)
  }

  return sheetId
}

/** Share an existing Sheet with the GAS owner (editor permission) */
export async function shareSheetWithGASOwner(accessToken: string, sheetId: string): Promise<void> {
  const gasOwnerEmail = import.meta.env.VITE_GAS_OWNER_EMAIL as string | undefined
  if (!gasOwnerEmail) return // dev mode — skip

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'writer', type: 'user',
        emailAddress: gasOwnerEmail,
        sendNotificationEmail: false,
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error?.message || 'Không thể chia sẻ Sheet')
  }
}

/** Extract sheet ID from a Google Sheets URL */
export function extractSheetIdFromUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}
