import { queryOptions } from '@tanstack/react-query'
import { listEquipments } from './equipmentApi'

export const equipmentQueries = {
  list: (lineId?: number) =>
    queryOptions({
      queryKey: ['equipment', 'list', lineId ?? null],
      queryFn: () => listEquipments(lineId),
    }),
}
