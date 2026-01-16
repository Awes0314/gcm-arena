'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export interface RankingEntry {
  user_id: string
  display_name: string
  total_score: number
  rank: number
}

interface RankingTableProps {
  rankings: RankingEntry[]
  currentUserId?: string | null
}

export function RankingTable({ rankings, currentUserId }: RankingTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const sortedRankings = [...rankings].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.rank - b.rank
    } else {
      return b.rank - a.rank
    }
  })

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          まだランキングデータがありません
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ランキング</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th 
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-muted/50"
                  onClick={toggleSort}
                >
                  順位 {sortOrder === 'asc' ? '↑' : '↓'}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  プレイヤー名
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  合計スコア
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRankings.map((entry) => (
                <tr 
                  key={entry.user_id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-semibold">
                    {entry.rank}
                  </td>
                  <td className="px-4 py-3">
                    <Link 
                      href={entry.user_id === currentUserId ? '/my' : `/users/${entry.user_id}`}
                      className="hover:underline"
                    >
                      {entry.display_name || '名無しプレイヤー'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {entry.total_score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
