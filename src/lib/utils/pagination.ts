/**
 * Pagination utilities for data fetching optimization
 */

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Calculate pagination offset and limit
 */
export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { from, to }
}

/**
 * Create pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  pageSize: number,
  totalCount: number
): PaginatedResult<never>['pagination'] {
  const totalPages = Math.ceil(totalCount / pageSize)
  
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Parse page number from search params
 */
export function parsePageParam(param: string | null | undefined, defaultPage = 1): number {
  if (!param) return defaultPage
  const parsed = parseInt(param, 10)
  return isNaN(parsed) || parsed < 1 ? defaultPage : parsed
}
