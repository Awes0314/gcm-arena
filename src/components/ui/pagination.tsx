import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  hasNextPage,
  hasPreviousPage,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const createPageUrl = (page: number) => {
    const url = new URL(baseUrl, 'http://localhost')
    url.searchParams.set('page', page.toString())
    return `${url.pathname}${url.search}`
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={!hasPreviousPage}
      >
        {hasPreviousPage ? (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            前へ
          </Link>
        ) : (
          <span className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            前へ
          </span>
        )}
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            )
          }

          const pageNum = page as number
          const isActive = pageNum === currentPage

          return (
            <Button
              key={pageNum}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              asChild={!isActive}
              disabled={isActive}
              className="min-w-[40px]"
            >
              {isActive ? (
                <span>{pageNum}</span>
              ) : (
                <Link href={createPageUrl(pageNum)}>{pageNum}</Link>
              )}
            </Button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={!hasNextPage}
      >
        {hasNextPage ? (
          <Link href={createPageUrl(currentPage + 1)}>
            次へ
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <span className="flex items-center">
            次へ
            <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        )}
      </Button>
    </div>
  )
}
