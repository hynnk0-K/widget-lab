import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { useAuthStore } from '@/entities/user/model/authStore'
import type { DashboardLayout, Widget } from '@/entities/widget/model/types'

interface UserDashboard {
  userId: number
  username: string
  displayName: string
  layout: string
  updatedAt: string
}

function nextPosition(widgets: Widget[]) {
  if (widgets.length === 0) return { x: 0, y: 0 }
  const maxY = Math.max(...widgets.map((wg) => wg.y + wg.h))
  return { x: 0, y: maxY }
}

function parseLayout(raw: string): DashboardLayout {
  try {
    const first = JSON.parse(raw)
    return typeof first === 'string' ? JSON.parse(first) : first
  } catch {
    return { version: 1, widgets: [] }
  }
}

export function useHomeDashboard() {
  const username = useAuthStore((s) => s.user?.username ?? '')
  const [layout, setLayout] = useState<DashboardLayout | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!username) return
    api
      .get<UserDashboard>(`/dashboards/${username}`)
      .then((data) => setLayout(parseLayout(data.layout)))
      .catch(() => setLayout({ version: 1, widgets: [] }))
  }, [username, refreshKey])

  async function handleSave() {
    if (!layout) return
    setSaving(true)
    setSaveError('')
    try {
      await api.putString<UserDashboard>(`/dashboards/${username}`, JSON.stringify(layout))
      setEditMode(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditMode(false)
    setSaveError('')
    setLayout(null)
    setRefreshKey((k) => k + 1)
  }

  function handleRemove(id: string) {
    setLayout((prev) =>
      prev ? { ...prev, widgets: prev.widgets.filter((w) => w.id !== id) } : prev,
    )
  }

  function handleLayoutChange(updatedWidgets: Widget[]) {
    setLayout((prev) => (prev ? { ...prev, widgets: updatedWidgets } : prev))
  }

  function handleAddWidget(partial: Omit<Widget, 'id'>) {
    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const { x, y } = nextPosition(layout?.widgets ?? [])
    const widget: Widget = { ...partial, id, x, y }
    setLayout((prev) => (prev ? { ...prev, widgets: [...prev.widgets, widget] } : prev))
    setShowModal(false)
    if (!editMode) setEditMode(true)
  }

  return {
    layout,
    editMode,
    setEditMode,
    showModal,
    setShowModal,
    saving,
    saveError,
    handleSave,
    handleCancelEdit,
    handleRemove,
    handleLayoutChange,
    handleAddWidget,
  }
}
