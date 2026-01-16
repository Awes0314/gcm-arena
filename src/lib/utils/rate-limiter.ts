/**
 * Rate Limiter Utility
 * 
 * Implements a sliding window rate limiter to prevent abuse of API endpoints.
 * 
 * Note: This is an in-memory implementation suitable for single-instance deployments.
 * For production with multiple instances, consider using Redis or a similar
 * distributed cache.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
   * @param config - Rate limit configuration
   * @returns Object with allowed status and remaining requests
   */
  check(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    // If no entry exists or entry has expired, create a new one
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + config.windowMs
      this.store.set(key, { count: 1, resetAt })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      }
    }

    // Check if limit has been exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    // Increment count
    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // General API endpoints - 100 requests per 15 minutes
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
  },
  // Authentication endpoints - 5 requests per 15 minutes
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Score submission - 30 requests per 5 minutes
  SCORE_SUBMISSION: {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000,
  },
  // Bookmarklet submission - 60 requests per 5 minutes (higher for automation)
  BOOKMARKLET: {
    maxRequests: 60,
    windowMs: 5 * 60 * 1000,
  },
  // Tournament creation - 5 requests per hour
  TOURNAMENT_CREATION: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  // Image upload - 20 requests per 10 minutes
  IMAGE_UPLOAD: {
    maxRequests: 20,
    windowMs: 10 * 60 * 1000,
  },
} as const

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimiter.check(key, config)
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  rateLimiter.reset(key)
}

/**
 * Get client identifier from request
 * Uses IP address or user ID if authenticated
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `ip:${realIp}`
  }

  // Fallback to a generic identifier
  return 'ip:unknown'
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
  }
}

// Export the rate limiter instance for testing
export { rateLimiter }
