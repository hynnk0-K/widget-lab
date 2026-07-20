import { queryOptions } from '@tanstack/react-query'
import { listCompanies } from './companyApi'

export const companyQueries = {
  list: () =>
    queryOptions({
      queryKey: ['company', 'list'],
      queryFn: () => listCompanies(),
    }),
}
