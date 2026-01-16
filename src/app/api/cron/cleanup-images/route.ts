import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cron job endpoint to clean up images from ended tournaments
 * This should be called periodically (e.g., daily) by a cron service
 * 
 * For Vercel, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-images",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const now = new Date();

    // Find tournaments that have ended
    const { data: endedTournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("id")
      .lt("end_at", now.toISOString());

    if (tournamentsError) {
      console.error("Failed to fetch ended tournaments:", tournamentsError);
      return NextResponse.json(
        {
          error: {
            code: "SYSTEM_DATABASE_ERROR",
            message: "終了した大会の取得に失敗しました",
            details: tournamentsError,
          },
        },
        { status: 500 }
      );
    }

    if (!endedTournaments || endedTournaments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "削除対象の画像はありません",
        deletedCount: 0,
      });
    }

    const tournamentIds = endedTournaments.map((t) => t.id);

    // Find all scores with images from ended tournaments
    const { data: scoresWithImages, error: scoresError } = await supabase
      .from("scores")
      .select("id, image_url")
      .in("tournament_id", tournamentIds)
      .not("image_url", "is", null);

    if (scoresError) {
      console.error("Failed to fetch scores with images:", scoresError);
      return NextResponse.json(
        {
          error: {
            code: "SYSTEM_DATABASE_ERROR",
            message: "画像付きスコアの取得に失敗しました",
            details: scoresError,
          },
        },
        { status: 500 }
      );
    }

    if (!scoresWithImages || scoresWithImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "削除対象の画像はありません",
        deletedCount: 0,
      });
    }

    // Extract file paths from image URLs
    const filePaths: string[] = [];
    for (const score of scoresWithImages) {
      if (score.image_url) {
        // Extract the file path from the public URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/score-images/{path}
        const urlParts = score.image_url.split("/score-images/");
        if (urlParts.length === 2) {
          filePaths.push(urlParts[1]);
        }
      }
    }

    // Delete images from Supabase Storage
    let deletedCount = 0;
    const errors: Array<{ path: string; error: any }> = [];

    if (filePaths.length > 0) {
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from("score-images")
        .remove(filePaths);

      if (deleteError) {
        console.error("Failed to delete images:", deleteError);
        errors.push({ path: "bulk", error: deleteError });
      } else {
        deletedCount = filePaths.length;
      }
    }

    // Update scores to remove image_url references
    const { error: updateError } = await supabase
      .from("scores")
      .update({ image_url: null })
      .in(
        "id",
        scoresWithImages.map((s) => s.id)
      );

    if (updateError) {
      console.error("Failed to update score records:", updateError);
      errors.push({ path: "database_update", error: updateError });
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount}件の画像を削除しました`,
      deletedCount,
      processedTournaments: endedTournaments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in cleanup-images cron:", error);
    return NextResponse.json(
      {
        error: {
          code: "SYSTEM_INTERNAL_ERROR",
          message: "システムエラーが発生しました",
        },
      },
      { status: 500 }
    );
  }
}
