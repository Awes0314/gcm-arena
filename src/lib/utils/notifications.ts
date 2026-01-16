import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a notification for a user
 */
export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  message: string,
  options?: {
    tournamentId?: string;
    linkUrl?: string;
  }
) {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        message,
        is_read: false,
        tournament_id: options?.tournamentId || null,
        link_url: options?.linkUrl || null,
      });

    if (error) {
      console.error("Failed to create notification:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notifications for all participants of a tournament
 */
export async function notifyTournamentParticipants(
  supabase: SupabaseClient,
  tournamentId: string,
  message: string,
  excludeUserId?: string
) {
  try {
    // Get all participants
    const { data: participants, error: fetchError } = await supabase
      .from("participants")
      .select("user_id")
      .eq("tournament_id", tournamentId);

    if (fetchError) {
      console.error("Failed to fetch participants:", fetchError);
      return;
    }

    if (!participants || participants.length === 0) {
      return;
    }

    // Filter out excluded user if specified
    const userIds = participants
      .map((p) => p.user_id)
      .filter((id) => id !== excludeUserId);

    if (userIds.length === 0) {
      return;
    }

    // Create notifications for all participants
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      message,
      is_read: false,
      tournament_id: tournamentId,
      link_url: `/tournaments/${tournamentId}`,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Failed to create notifications:", insertError);
    }
  } catch (error) {
    console.error("Error notifying tournament participants:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Notify tournament organizer
 */
export async function notifyTournamentOrganizer(
  supabase: SupabaseClient,
  tournamentId: string,
  message: string
) {
  try {
    // Get tournament organizer
    const { data: tournament, error: fetchError } = await supabase
      .from("tournaments")
      .select("organizer_id")
      .eq("id", tournamentId)
      .single();

    if (fetchError || !tournament) {
      console.error("Failed to fetch tournament:", fetchError);
      return;
    }

    await createNotification(supabase, tournament.organizer_id, message, {
      tournamentId,
      linkUrl: `/my/tournaments/${tournamentId}/manage`,
    });
  } catch (error) {
    console.error("Error notifying tournament organizer:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Notify all users (for system-wide announcements like terms updates)
 */
export async function notifyAllUsers(
  supabase: SupabaseClient,
  message: string
) {
  try {
    // Get all active users
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Failed to fetch profiles:", fetchError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      return;
    }

    // Create notifications for all users
    const notifications = profiles.map((profile) => ({
      user_id: profile.id,
      message,
      is_read: false,
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(batch);

      if (insertError) {
        console.error("Failed to create notification batch:", insertError);
      }
    }
  } catch (error) {
    console.error("Error notifying all users:", error);
    // Don't throw - notifications are non-critical
  }
}
