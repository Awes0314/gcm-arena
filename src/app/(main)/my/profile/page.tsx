import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Log error for debugging
  if (error) {
    console.error('Profile fetch error:', error)
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">プロフィール編集</h1>
        <p className="text-muted-foreground">プロフィールの読み込みに失敗しました</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">プロフィール編集</h1>
      <div className="max-w-2xl">
        <ProfileEditForm profile={profile} />
      </div>
    </div>
  )
}
