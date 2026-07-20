import { queryOptions } from '@tanstack/react-query'
import { listFactories, getFactory } from './factoryApi'

export const factoryQueries = {
  list: (siteId?: number) =>
    queryOptions({
      queryKey: ['factory', 'list', siteId ?? null],
      queryFn: () => listFactories(siteId),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['factory', 'detail', id],
      queryFn: () => getFactory(id),
      enabled: Number.isFinite(id) && id > 0,
    }),
}
