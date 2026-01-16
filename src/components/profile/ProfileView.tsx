'use client'

import { Profile } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ProfileViewProps {
  profile: Profile
  isOwnProfile?: boolean
}

export function ProfileView({ profile, isOwnProfile = false }: ProfileViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>プロフィール</CardTitle>
          {isOwnProfile && (
            <Button asChild variant="outline" size="sm">
              <Link href="/my/profile">編集</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">表示名</p>
          <p className="text-lg font-medium">
            {profile.display_name || '未設定'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">登録日</p>
          <p className="text-sm">
            {new Date(profile.created_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">最終更新</p>
          <p className="text-sm">
            {new Date(profile.updated_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
