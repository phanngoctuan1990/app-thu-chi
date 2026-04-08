import { createContext, useContext } from 'react'

export interface SyncContextValue {
  syncing: boolean
  lastSync: number       // timestamp of last successful sync (0 = never)
  triggerSync: () => Promise<void>
}

export const SyncContext = createContext<SyncContextValue>({
  syncing: false,
  lastSync: 0,
  triggerSync: async () => {},
})

export const useSyncContext = () => useContext(SyncContext)
