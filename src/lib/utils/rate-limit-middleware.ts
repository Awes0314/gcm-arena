/**
 * Rate Limit Middleware
 * 
 * Helper functions to apply rate limiting to API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from './rate-limiter'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

/**
 * Apply rate limiting to an API route
 * Returns null if allowed, or a NextResponse with 429 status if rate limited
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): NextResponse | null {
  const clientId = getClientIdentifier(request, userId)
  const result = checkRateLimit(clientId, config)

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result.remaining, result.resetAt)
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。',
        },
      },
      {
        status: 429,
        headers,
      }
    )
  }

  return null
}

/**
 * Wrapper function to easily add rate limiting to API route handlers
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: RateLimitConfig,
  getUserId?: (request: NextRequest, ...args: T) => Promise<string | undefined>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Get user ID if function provided
    const userId = getUserId ? await getUserId(request, ...args) : undefined

    // Check rate limit
    const rateLimitResponse = applyRateLimit(request, config, userId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Call the original handler
    return handler(request, ...args)
  }
}

// Export rate limit configurations for convenience
export { RATE_LIMITS }
