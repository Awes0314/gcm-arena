import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: notificationId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "認証が必要です" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { is_read } = body;

    if (typeof is_read !== "boolean") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_INVALID_FORMAT",
            message: "is_readはboolean型である必要があります",
          },
        },
        { status: 400 }
      );
    }

    // Update notification (RLS will ensure user owns this notification)
    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ is_read })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update notification:", error);
      return NextResponse.json(
        {
          error: {
            code: "EXTERNAL_SUPABASE_ERROR",
            message: "通知の更新に失敗しました",
          },
        },
        { status: 500 }
      );
    }

    if (!notification) {
      return NextResponse.json(
        {
          error: {
            code: "AUTHZ_FORBIDDEN",
            message: "この通知を更新する権限がありません",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/notifications/[id]:", error);
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
