import { queryOptions } from '@tanstack/react-query'
import { listSites, getSite } from './siteApi'

export const siteQueries = {
  list: (companyId?: number) =>
    queryOptions({
      queryKey: ['site', 'list', companyId ?? null],
      queryFn: () => listSites(companyId),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['site', 'detail', id],
      queryFn: () => getSite(id),
      enabled: Number.isFinite(id) && id > 0,
    }),
}
