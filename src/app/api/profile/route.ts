import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeDisplayName } from '@/lib/utils/sanitization'
import { validateDisplayName } from '@/lib/utils/validation'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { display_name } = body

    // Sanitize input
    const sanitizedDisplayName = sanitizeDisplayName(display_name)

    // Validation
    const validation = validateDisplayName(sanitizedDisplayName)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_FORMAT',
            message: validation.error,
          },
        },
        { status: 400 }
      )
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: sanitizedDisplayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: 'プロフィールの更新に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'SYSTEM_INTERNAL_ERROR',
          message: 'システムエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}
