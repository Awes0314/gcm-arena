/**
 * Input Sanitization Utilities
 * 
 * This module provides utilities for sanitizing user input to prevent XSS attacks.
 * Note: React automatically escapes content in JSX, but we need additional
 * sanitization for:
 * - User-generated HTML content (if any)
 * - Content that might be rendered with dangerouslySetInnerHTML
 * - Data stored in the database that might contain malicious scripts
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text by removing all HTML tags
 * Use this for fields that should never contain HTML
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Remove all HTML tags
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize and validate display name
 * - Removes HTML tags
 * - Trims whitespace
 * - Validates length
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }

  // Remove HTML tags and trim
  const sanitized = sanitizePlainText(name).trim()

  // Limit length
  return sanitized.slice(0, 50)
}

/**
 * Sanitize tournament title
 * - Removes HTML tags
 * - Trims whitespace
 * - Validates length
 */
export function sanitizeTournamentTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return ''
  }

  const sanitized = sanitizePlainText(title).trim()
  return sanitized.slice(0, 100)
}

/**
 * Sanitize tournament description
 * - Allows basic formatting tags
 * - Removes dangerous content
 * - Validates length
 */
export function sanitizeTournamentDescription(description: string): string {
  if (!description || typeof description !== 'string') {
    return ''
  }

  const sanitized = sanitizeHtml(description).trim()
  return sanitized.slice(0, 5000)
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''
    }
  }

  // Only allow http, https, and relative URLs
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return ''
  }

  return trimmed
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Remove HTML tags and trim
  const sanitized = sanitizePlainText(email).trim().toLowerCase()

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize JSON object by recursively sanitizing all string values
 */
export function sanitizeJsonObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizePlainText(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonObject)
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeJsonObject(obj[key])
      }
    }
    return sanitized
  }

  return obj
}

/**
 * Escape special characters for use in SQL LIKE patterns
 * Note: This is a defense-in-depth measure. Primary SQL injection
 * protection comes from parameterized queries (which Supabase uses)
 * and RLS policies.
 */
export function escapeSqlLike(value: string): string {
  if (!value || typeof value !== 'string') {
    return ''
  }

  // Escape special LIKE characters
  return value.replace(/[%_\\]/g, '\\$&')
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(value: any, min?: number, max?: number): number | null {
  const num = Number(value)

  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  if (min !== undefined && num < min) {
    return null
  }

  if (max !== undefined && num > max) {
    return null
  }

  return num
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUuid(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') {
    return ''
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    return ''
  }

  return uuid.toLowerCase()
}

/**
 * Sanitize search query
 * - Removes HTML tags
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  const sanitized = sanitizePlainText(query).trim()
  return sanitized.slice(0, 200)
}
