'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ManagementActionsProps {
  tournamentId: string
}

export function ManagementActions({ tournamentId }: ManagementActionsProps) {
  const [isRecalculating, setIsRecalculating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/recalculate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'ランキングの再計算に失敗しました')
      }

      toast({
        title: '成功',
        description: 'ランキングを再計算しました',
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ランキングの再計算に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div className="mb-8">
      <Button 
        onClick={handleRecalculate} 
        disabled={isRecalculating}
        variant="default"
      >
        {isRecalculating ? 'ランキングを再計算中...' : 'ランキングを再計算'}
      </Button>
    </div>
  )
}
