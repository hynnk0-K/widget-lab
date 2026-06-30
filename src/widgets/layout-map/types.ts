export interface MapPinLive {
  hasData: boolean
  lastValue?: number
  lastValueLabel?: string
}

export interface MapPin {
  id: number | string
  code: string
  name: string
  position: { x: number; y: number } | null
  /** 'card' 스타일에서만 사용 — 없으면 기본 사이즈 */
  size?: { width: number; height: number }
  live?: {
    hasData: boolean
    lastValueLabel?: string
  }
  alarmStatus?: 'critical' | 'warning' | null // ← 추가
  selected?: boolean
}

export interface MapImage {
  base64: string | null
  width: number
  height: number
}

export interface LayoutMapProps {
  image: MapImage | null
  pins: MapPin[]
  editMode?: boolean
  /** 'dot'(기본) = 작은 원형 핀, 'card' = 이름이 보이는 드래그 가능한 사각 카드 */
  pinStyle?: 'dot' | 'card'
  onPinClick?: (pinId: number | string) => void
  onImageUpload?: (base64: string, width: number, height: number) => Promise<void>
  onImageDelete?: () => Promise<void>
  onPinMove?: (pinId: number | string, position: { x: number; y: number }) => Promise<void>
  /** 'card' 스타일 핀의 모서리 드래그로 크기 조절 (없으면 리사이즈 핸들 숨김) */
  onPinResize?: (pinId: number | string, size: { width: number; height: number }) => Promise<void>
}
