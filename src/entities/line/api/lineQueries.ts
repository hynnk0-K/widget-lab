import { queryOptions } from '@tanstack/react-query'
import { listLines, getLine } from './lineApi'

export const lineQueries = {
  list: (processId?: number) =>
    queryOptions({
      queryKey: ['line', 'list', processId ?? null],
      queryFn: () => listLines(processId),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['line', 'detail', id],
      queryFn: () => getLine(id),
      enabled: Number.isFinite(id) && id > 0,
    }),
}
