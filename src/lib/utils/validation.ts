/**
 * Input Validation Utilities
 * 
 * This module provides validation functions for user input.
 * These work in conjunction with sanitization to ensure data integrity.
 */

import type { GameType, SubmissionMethod } from '@/lib/types/database'

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '表示名は必須です' }
  }

  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: '表示名を入力してください' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: '表示名は50文字以内で入力してください' }
  }

  return { valid: true }
}

/**
 * Validate tournament title
 */
export function validateTournamentTitle(title: string): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: '大会名は必須です' }
  }

  const trimmed = title.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: '大会名を入力してください' }
  }

  if (trimmed.length > 100) {
    return { valid: false, error: '大会名は100文字以内で入力してください' }
  }

  return { valid: true }
}

/**
 * Validate tournament description
 */
export function validateTournamentDescription(description: string): ValidationResult {
  if (!description) {
    return { valid: true } // Description is optional
  }

  if (typeof description !== 'string') {
    return { valid: false, error: '説明の形式が不正です' }
  }

  if (description.length > 5000) {
    return { valid: false, error: '説明は5000文字以内で入力してください' }
  }

  return { valid: true }
}

/**
 * Validate date range
 */
export function validateDateRange(startAt: string, endAt: string): ValidationResult {
  if (!startAt || !endAt) {
    return { valid: false, error: '開始日時と終了日時は必須です' }
  }

  const start = new Date(startAt)
  const end = new Date(endAt)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: '日時の形式が不正です' }
  }

  if (start >= end) {
    return { valid: false, error: '終了日時は開始日時より後に設定してください' }
  }

  return { valid: true }
}

/**
 * Validate game type
 */
export function validateGameType(gameType: string): ValidationResult {
  const validGameTypes: GameType[] = ['ongeki', 'chunithm', 'maimai']

  if (!validGameTypes.includes(gameType as GameType)) {
    return { valid: false, error: '無効なゲームタイプです' }
  }

  return { valid: true }
}

/**
 * Validate submission method
 */
export function validateSubmissionMethod(method: string): ValidationResult {
  const validMethods: SubmissionMethod[] = ['bookmarklet', 'image', 'both']

  if (!validMethods.includes(method as SubmissionMethod)) {
    return { valid: false, error: '無効な提出方式です' }
  }

  return { valid: true }
}

/**
 * Validate score value
 */
export function validateScore(score: number): ValidationResult {
  if (typeof score !== 'number') {
    return { valid: false, error: 'スコアは数値である必要があります' }
  }

  if (isNaN(score) || !isFinite(score)) {
    return { valid: false, error: '有効なスコアを入力してください' }
  }

  if (score < 0) {
    return { valid: false, error: 'スコアは0以上である必要があります' }
  }

  if (score > 1010000) {
    return { valid: false, error: 'スコアが範囲外です' }
  }

  return { valid: true }
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string): ValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'IDは必須です' }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'IDの形式が不正です' }
  }

  return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'メールアドレスは必須です' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'メールアドレスの形式が不正です' }
  }

  return { valid: true }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URLは必須です' }
  }

  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'HTTPまたはHTTPSのURLのみ許可されています' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'URLの形式が不正です' }
  }
}

/**
 * Validate array of song IDs
 */
export function validateSongIds(songIds: any): ValidationResult {
  if (!Array.isArray(songIds)) {
    return { valid: false, error: '楽曲IDは配列である必要があります' }
  }

  if (songIds.length === 0) {
    return { valid: false, error: '少なくとも1つの楽曲を選択してください' }
  }

  // Validate each song ID is a valid UUID
  for (const songId of songIds) {
    const result = validateUuid(songId)
    if (!result.valid) {
      return { valid: false, error: '楽曲IDの形式が不正です' }
    }
  }

  return { valid: true }
}

/**
 * Validate JSON object structure
 */
export function validateJsonObject(obj: any): ValidationResult {
  if (obj === null || obj === undefined) {
    return { valid: true }
  }

  if (typeof obj !== 'object') {
    return { valid: false, error: 'JSONオブジェクトである必要があります' }
  }

  try {
    // Try to stringify and parse to ensure it's valid JSON
    JSON.parse(JSON.stringify(obj))
    return { valid: true }
  } catch {
    return { valid: false, error: '無効なJSONオブジェクトです' }
  }
}
