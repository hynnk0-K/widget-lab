import { useEffect, useMemo, useState } from 'react'
import { getCompany, getCompanyImage, putCompanyImage, deleteCompanyImage } from '@/entities/company/api/companyApi'
import type { Company } from '@/entities/company/model/types'
import { listSites } from '@/entities/site/api/siteApi'
import type { MapPin } from '@/widgets/layout-map'

interface SiteItem { id: number; code: string; name: string }

export function useCompanyMap(companyId: number) {
  const [company, setCompany] = useState<Company | null>(null)
  const [image, setImage] = useState<{ base64: string; width: number; height: number } | null>(null)
  const [sites, setSites] = useState<SiteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!companyId || Number.isNaN(companyId)) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getCompany(companyId),
      getCompanyImage(companyId).catch(() => null),
      listSites(companyId),
    ])
      .then(([companyData, imgData, sitesData]) => {
        if (!active) return
        setCompany(companyData)
        setImage(imgData?.imageBase64 && imgData.width && imgData.height
          ? { base64: imgData.imageBase64, width: imgData.width, height: imgData.height }
          : null)
        setSites(sitesData)
      })
      .catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId])

  // ponytail: Site에는 아직 position 필드 없음 — backend에 추가되면 parsePosition(s.position)으로 교체
  const pins: MapPin[] = useMemo(() => {
    return sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      position: null,
      live: { hasData: false },
    }))
  }, [sites])

  async function handleImageUpload(base64: string, width: number, height: number) {
    await putCompanyImage(companyId, { imageBase64: base64, width, height })
    setImage({ base64, width, height })
  }

  async function handleImageDelete() {
    await deleteCompanyImage(companyId)
    setImage(null)
  }

  return {
    company, image, sites, loading, error,
    editMode, setEditMode,
    pins,
    handleImageUpload,
    handleImageDelete,
  }
}
