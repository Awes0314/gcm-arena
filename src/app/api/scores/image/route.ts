import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTournamentOrganizer } from '@/lib/utils/notifications'
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit-middleware'
import { sanitizeUuid } from '@/lib/utils/sanitization'
import { validateUuid } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    // Apply rate limiting (per user)
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.IMAGE_UPLOAD, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse form data
    const formData = await request.formData()
    const tournamentId = formData.get('tournament_id') as string
    const songId = formData.get('song_id') as string
    const imageFile = formData.get('image') as File

    // Sanitize inputs
    const sanitizedTournamentId = sanitizeUuid(tournamentId)
    const sanitizedSongId = sanitizeUuid(songId)

    // Validation
    const tournamentIdValidation = validateUuid(sanitizedTournamentId)
    if (!tournamentIdValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '大会IDの形式が不正です' } },
        { status: 400 }
      )
    }

    const songIdValidation = validateUuid(sanitizedSongId)
    if (!songIdValidation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '楽曲IDの形式が不正です' } },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_REQUIRED_FIELD', message: '画像ファイルは必須です' } },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: '画像ファイルを選択してください' } },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_INVALID_FORMAT', message: 'ファイルサイズは5MB以下にしてください' } },
        { status: 400 }
      )
    }

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('tournament_id', sanitizedTournamentId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHZ_FORBIDDEN',
            message: 'この大会に参加していません',
          },
        },
        { status: 403 }
      )
    }

    // Check if song is part of tournament
    const { data: tournamentSong, error: tournamentSongError } = await supabase
      .from('tournament_songs')
      .select('id')
      .eq('tournament_id', sanitizedTournamentId)
      .eq('song_id', sanitizedSongId)
      .single()

    if (tournamentSongError || !tournamentSong) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'この楽曲は大会の対象ではありません',
          },
        },
        { status: 400 }
      )
    }

    // Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${sanitizedTournamentId}/${user.id}/${sanitizedSongId}_${Date.now()}.${fileExt}`
    
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('score-images')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json(
        {
          error: {
            code: 'EXTERNAL_STORAGE_ERROR',
            message: '画像のアップロードに失敗しました',
            details: uploadError,
          },
        },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('score-images')
      .getPublicUrl(fileName)

    // Create pending score record
    const { data: scoreRecord, error: insertError } = await supabase
      .from('scores')
      .insert({
        tournament_id: sanitizedTournamentId,
        user_id: user.id,
        song_id: sanitizedSongId,
        score: 0, // Will be set by organizer upon approval
        status: 'pending',
        submitted_via: 'image',
        image_url: urlData.publicUrl,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating score record:', insertError)
      
      // Clean up uploaded image if score record creation fails
      await supabase.storage.from('score-images').remove([fileName])
      
      return NextResponse.json(
        {
          error: {
            code: 'SYSTEM_DATABASE_ERROR',
            message: 'スコアレコードの作成に失敗しました',
            details: insertError,
          },
        },
        { status: 500 }
      )
    }

    // Notify tournament organizer about image submission
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('title, organizer_id')
      .eq('id', sanitizedTournamentId)
      .single()

    if (tournament) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const { data: song } = await supabase
        .from('songs')
        .select('title')
        .eq('id', sanitizedSongId)
        .single()

      const displayName = userProfile?.display_name || 'ユーザー'
      const songTitle = song?.title || '楽曲'

      await notifyTournamentOrganizer(
        supabase,
        sanitizedTournamentId,
        `${displayName}さんが「${tournament.title}」に画像を提出しました（${songTitle}）`
      )
    }

    return NextResponse.json(
      {
        message: '画像を提出しました。開催者の承認をお待ちください。',
        score: scoreRecord,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/scores/image:', error)
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
