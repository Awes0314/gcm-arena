/**
 * CSRF Protection Utilities
 * 
 * Additional CSRF protection beyond Next.js built-in protections.
 * Next.js already provides:
 * - SameSite cookies (via Supabase Auth)
 * - Automatic origin checking
 * 
 * This module provides additional verification for defense-in-depth.
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify that the request origin matches the expected origin
 * This is an additional layer of CSRF protection
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // If no origin header, check referer (for older browsers)
  if (!origin) {
    const referer = request.headers.get('referer')
    if (!referer) {
      // No origin or referer - this is suspicious for state-changing requests
      // but we'll allow it since Next.js and Supabase Auth provide other protections
      return true
    }

    try {
      const refererUrl = new URL(referer)
      return refererUrl.host === host
    } catch {
      return false
    }
  }

  // Verify origin matches host
  try {
    const originUrl = new URL(origin)
    return originUrl.host === host
  } catch {
    return false
  }
}

/**
 * Create a CSRF error response
 */
export function createCsrfErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'リクエストの検証に失敗しました',
      },
    },
    { status: 403 }
  )
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  // GET, HEAD, and OPTIONS are safe methods that don't change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  return !safeMethods.includes(method.toUpperCase())
}

/**
 * Apply CSRF protection to a request
 * Returns null if validation passes, or an error response if it fails
 */
export function applyCsrfProtection(request: NextRequest): NextResponse | null {
  // Only check state-changing methods
  if (!requiresCsrfProtection(request.method)) {
    return null
  }

  // Verify origin
  if (!verifyOrigin(request)) {
    console.warn('CSRF validation failed: origin mismatch', {
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
    })
    return createCsrfErrorResponse()
  }

  return null
}

/**
 * Wrapper to add CSRF protection to API route handlers
 */
export function withCsrfProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Check CSRF protection
    const csrfResponse = applyCsrfProtection(request)
    if (csrfResponse) {
      return csrfResponse
    }

    // Call the original handler
    return handler(request, ...args)
  }
}
