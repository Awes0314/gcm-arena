import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyTournamentParticipants } from "@/lib/utils/notifications";

/**
 * Cron job endpoint to send tournament start/end notifications
 * This should be called periodically (e.g., every hour) by a cron service
 * 
 * For Vercel, you can set up a cron job in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/tournament-notifications",
 *     "schedule": "0 * * * *"
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find tournaments that started in the last hour
    const { data: startedTournaments, error: startError } = await supabase
      .from("tournaments")
      .select("id, title")
      .gte("start_at", oneHourAgo.toISOString())
      .lte("start_at", now.toISOString());

    if (startError) {
      console.error("Failed to fetch started tournaments:", startError);
    } else if (startedTournaments && startedTournaments.length > 0) {
      for (const tournament of startedTournaments) {
        await notifyTournamentParticipants(
          supabase,
          tournament.id,
          `大会「${tournament.title}」が開始しました！スコアを提出してください。`
        );
      }
    }

    // Find tournaments that ended in the last hour
    const { data: endedTournaments, error: endError } = await supabase
      .from("tournaments")
      .select("id, title")
      .gte("end_at", oneHourAgo.toISOString())
      .lte("end_at", now.toISOString());

    if (endError) {
      console.error("Failed to fetch ended tournaments:", endError);
    } else if (endedTournaments && endedTournaments.length > 0) {
      for (const tournament of endedTournaments) {
        await notifyTournamentParticipants(
          supabase,
          tournament.id,
          `大会「${tournament.title}」が終了しました。ランキングをご確認ください。`
        );
      }
    }

    return NextResponse.json({
      success: true,
      started: startedTournaments?.length || 0,
      ended: endedTournaments?.length || 0,
    });
  } catch (error) {
    console.error("Error in tournament notifications cron:", error);
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
