# Image Cleanup Cron Job

## Overview

This cron job automatically deletes images from ended tournaments to free up storage space and comply with data retention policies.

## Functionality

The cleanup process:

1. **Finds ended tournaments**: Queries all tournaments where `end_at < now()`
2. **Locates images**: Finds all score records with `image_url` from ended tournaments
3. **Deletes from storage**: Removes image files from Supabase Storage bucket `score-images`
4. **Updates database**: Sets `image_url` to `null` in the scores table

## Configuration

### Vercel Cron

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-images",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight (00:00 UTC).

### Authentication

The endpoint requires a `CRON_SECRET` environment variable for security:

```bash
CRON_SECRET=your-secret-key
```

Requests must include the authorization header:

```
Authorization: Bearer your-secret-key
```

## Manual Execution

You can manually trigger the cleanup:

```bash
curl -X GET https://your-domain.com/api/cron/cleanup-images \
  -H "Authorization: Bearer your-secret-key"
```

## Response Format

Success response:

```json
{
  "success": true,
  "message": "5件の画像を削除しました",
  "deletedCount": 5,
  "processedTournaments": 3
}
```

Error response:

```json
{
  "error": {
    "code": "SYSTEM_DATABASE_ERROR",
    "message": "終了した大会の取得に失敗しました",
    "details": { ... }
  }
}
```

## Testing

Property-based tests are available in:
- `src/lib/supabase/__tests__/image-cleanup.property.test.ts`

Run tests:

```bash
npm run test -- src/lib/supabase/__tests__/image-cleanup.property.test.ts
```

## Requirements

Validates requirement 5.4:
> WHEN 大会が終了する、THE システム SHALL 関連するすべての画像を自動的に削除する

## Notes

- Images are permanently deleted and cannot be recovered
- The cleanup runs automatically on Vercel's schedule
- Database records (scores) are preserved, only `image_url` is nullified
- Failed deletions are logged but don't stop the process
