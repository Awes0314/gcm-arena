import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAllUsers } from "@/lib/utils/notifications";

/**
 * Admin endpoint to notify all users about terms of service updates
 * This should be called manually by an admin when terms are updated
 * 
 * In production, you should add proper admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET;

    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Parse request body for custom message (optional)
    const body = await request.json().catch(() => ({}));
    const customMessage = body.message;

    const message =
      customMessage ||
      "利用規約が更新されました。内容をご確認ください。";

    await notifyAllUsers(supabase, message);

    return NextResponse.json({
      success: true,
      message: "All users have been notified",
    });
  } catch (error) {
    console.error("Error in notify terms update:", error);
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
