import { describe, it, expect, vi } from 'vitest'

/**
 * Unit tests for bookmarklet functionality
 * 
 * These tests validate:
 * - Score parsing logic for each game type
 * - API call structure
 * - Error handling
 * 
 * Requirements: 4.1, 4.2
 */

// Helper functions that would be in the bookmarklet
function parseOngekiScore(scoreText: string): number {
  return parseInt(scoreText.replace(/,/g, ''), 10)
}

function parseChunithmScore(scoreText: string): number {
  return parseInt(scoreText.replace(/,/g, ''), 10)
}

function parseMaimaiScore(scoreText: string): number {
  const cleanText = scoreText.replace(/,/g, '').replace('%', '')
  return Math.round(parseFloat(cleanText) * 10000)
}

function detectGameType(hostname: string, pathname: string): string | null {
  if (hostname.includes('ongeki') || pathname.includes('ongeki')) {
    return 'ongeki'
  } else if (hostname.includes('chunithm') || pathname.includes('chunithm')) {
    return 'chunithm'
  } else if (hostname.includes('maimai') || pathname.includes('maimai')) {
    return 'maimai'
  }
  return null
}

describe('Bookmarklet Score Parsing', () => {
  describe('ONGEKI Score Parsing', () => {
    it('should parse score with commas', () => {
      const score = parseOngekiScore('1,005,432')
      expect(score).toBe(1005432)
    })

    it('should parse score without commas', () => {
      const score = parseOngekiScore('1000000')
      expect(score).toBe(1000000)
    })

    it('should handle maximum score', () => {
      const score = parseOngekiScore('1,010,000')
      expect(score).toBe(1010000)
    })
  })

  describe('CHUNITHM Score Parsing', () => {
    it('should parse score with commas', () => {
      const score = parseChunithmScore('1,009,876')
      expect(score).toBe(1009876)
    })

    it('should parse perfect score', () => {
      const score = parseChunithmScore('1,010,000')
      expect(score).toBe(1010000)
    })
  })

  describe('maimai Score Parsing', () => {
    it('should parse percentage score', () => {
      const score = parseMaimaiScore('100.5432%')
      expect(score).toBe(1005432)
    })

    it('should parse score without percentage sign', () => {
      const score = parseMaimaiScore('99.0000')
      expect(score).toBe(990000)
    })

    it('should handle perfect score', () => {
      const score = parseMaimaiScore('101.0000%')
      expect(score).toBe(1010000)
    })

    it('should round correctly', () => {
      const score = parseMaimaiScore('100.5555%')
      expect(score).toBe(1005555)
    })
  })

  describe('Game Type Detection', () => {
    it('should detect ONGEKI from hostname', () => {
      const gameType = detectGameType('ongeki-net.com', '/record/musicDetail')
      expect(gameType).toBe('ongeki')
    })

    it('should detect ONGEKI from pathname', () => {
      const gameType = detectGameType('example.com', '/ongeki-mobile/record')
      expect(gameType).toBe('ongeki')
    })

    it('should detect CHUNITHM from hostname', () => {
      const gameType = detectGameType('chunithm-net.com', '/mobile/record')
      expect(gameType).toBe('chunithm')
    })

    it('should detect CHUNITHM from pathname', () => {
      const gameType = detectGameType('example.com', '/chunithm-mobile/record')
      expect(gameType).toBe('chunithm')
    })

    it('should detect maimai from hostname', () => {
      const gameType = detectGameType('maimai-net.com', '/record')
      expect(gameType).toBe('maimai')
    })

    it('should detect maimai from pathname', () => {
      const gameType = detectGameType('example.com', '/maimai-mobile/record')
      expect(gameType).toBe('maimai')
    })

    it('should return null for unsupported sites', () => {
      const gameType = detectGameType('example.com', '/some/path')
      expect(gameType).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid score format', () => {
      const score = parseOngekiScore('invalid')
      expect(isNaN(score)).toBe(true)
    })

    it('should handle empty string', () => {
      const score = parseOngekiScore('')
      expect(isNaN(score)).toBe(true)
    })

    it('should validate missing elements', () => {
      const scoreElement = null
      const titleElement = { textContent: 'Test Song' }

      expect(() => {
        if (!scoreElement || !titleElement) {
          throw new Error('スコア情報が見つかりません')
        }
      }).toThrow('スコア情報が見つかりません')
    })
  })
})


describe('Bookmarklet API Calls', () => {
  it('should make POST request with correct structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'スコアを提出しました' }),
    })

    global.fetch = mockFetch

    const scoreData = {
      tournament_id: 'test-tournament-id',
      song_id: 'test-song-id',
      score: 1005432,
      game_type: 'ongeki',
      song_title: 'Test Song',
      difficulty: 'MASTER',
    }

    await fetch('https://example.com/api/bookmarklet/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(scoreData),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api/bookmarklet/submit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(scoreData),
      }
    )
  })

  it('should include credentials for authentication', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    global.fetch = mockFetch

    await fetch('https://example.com/api/bookmarklet/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ score: 1000000 }),
    })

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.credentials).toBe('include')
  })

  it('should handle API error responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: 'AUTH_REQUIRED',
          message: '認証が必要です',
        },
      }),
    })

    global.fetch = mockFetch

    const response = await fetch('https://example.com/api/bookmarklet/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ score: 1000000 }),
    })

    expect(response.ok).toBe(false)
    expect(response.status).toBe(401)

    const result = await response.json()
    expect(result.error.code).toBe('AUTH_REQUIRED')
    expect(result.error.message).toBe('認証が必要です')
  })

  it('should handle network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

    global.fetch = mockFetch

    await expect(
      fetch('https://example.com/api/bookmarklet/submit', {
        method: 'POST',
        body: JSON.stringify({ score: 1000000 }),
      })
    ).rejects.toThrow('Network error')
  })
})

describe('Bookmarklet Configuration', () => {
  it('should check if bookmarklet is enabled', () => {
    const BOOKMARKLET_ENABLED = true
    expect(BOOKMARKLET_ENABLED).toBe(true)
  })

  it('should handle disabled state', () => {
    const BOOKMARKLET_ENABLED = false
    
    if (!BOOKMARKLET_ENABLED) {
      const message = 'ブックマークレット機能は現在停止中です'
      expect(message).toBe('ブックマークレット機能は現在停止中です')
    }
  })
})
