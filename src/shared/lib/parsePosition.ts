// master 엔티티(공정/라인/설비 등)의 position 컬럼 — JSON 문자열 {x, y, w?, h?}
// w/h는 카드 스타일 핀의 크기(LayoutMap pinStyle="card")용, 없으면 기본 크기 사용
export interface ParsedPosition {
  x: number
  y: number
  width?: number
  height?: number
}

export function parsePosition(raw: string | null | undefined): ParsedPosition | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') {
      return {
        x: p.x,
        y: p.y,
        width: typeof p?.w === 'number' ? p.w : undefined,
        height: typeof p?.h === 'number' ? p.h : undefined,
      }
    }
  } catch {
    /* ignore */
  }
  return null
}
