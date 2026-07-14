import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'

export interface SystemConnection {
  code: string
  name?: string
  conn_type?: string
  endpoint?: string
  node_count?: number
  last_seen?: string
  status: 'CONNECTED' | 'DISCONNECTED' | string
}

const POLL_MS = 10_000

export function useSystemConnections() {
  const [rows, setRows] = useState<SystemConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [apiDown, setApiDown] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await api.get<SystemConnection[]>('/system/connections')
        if (!active) return
        setRows(data)
        setApiDown(false)
        setUpdatedAt(new Date())
      } catch {
        if (!active) return
        setApiDown(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [])

  return { rows, loading, apiDown, updatedAt }
}
