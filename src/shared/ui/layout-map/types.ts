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
  live?: MapPinLive
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
  onPinClick?: (pinId: number | string) => void
  onImageUpload?: (base64: string, width: number, height: number) => Promise<void>
  onImageDelete?: () => Promise<void>
  onPinMove?: (pinId: number | string, position: { x: number; y: number }) => Promise<void>
}
