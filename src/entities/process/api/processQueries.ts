import { queryOptions } from '@tanstack/react-query'
import { listProcesses, getProcess } from './processApi'

export const processQueries = {
  list: (factoryId?: number) =>
    queryOptions({
      queryKey: ['process', 'list', factoryId ?? null],
      queryFn: () => listProcesses(factoryId),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['process', 'detail', id],
      queryFn: () => getProcess(id),
      enabled: Number.isFinite(id) && id > 0,
    }),
}
