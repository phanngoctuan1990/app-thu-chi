const HEADER_ROW = ['Date', 'Amount', 'Category', 'Note', 'User', 'Timestamp']

/** Create a new Google Sheet with the Transactions tab + header row */
export async function createNewSheet(accessToken: string, userName: string): Promise<string> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: `Thu Chi — ${userName}` },
      sheets: [{
        properties: { title: 'Transactions', index: 0 },
        data: [{
          startRow: 0, startColumn: 0,
          rowData: [{
            values: HEADER_ROW.map(v => ({ userEnteredValue: { stringValue: v } })),
          }],
        }],
      }],
    }),
  })
  const data = await res.json()
  if (!data.spreadsheetId) throw new Error(data.error?.message || 'Tạo Sheet thất bại')
  return data.spreadsheetId as string
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
        role: 'writer',
        type: 'user',
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
