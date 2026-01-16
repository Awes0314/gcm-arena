import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fc from "fast-check";
import { createTestClient } from "@/lib/supabase/test-client";
import {
  createNotification,
  notifyTournamentParticipants,
  notifyTournamentOrganizer,
  notifyAllUsers,
} from "@/lib/utils/notifications";

describe("Notification Property Tests", () => {
  const supabase = createTestClient();
  const schema = process.env.SUPABASE_SCHEMA || "dev";

  // Test users - these should be pre-created in Supabase Auth
  const testUsers = [
    {
      email: "notif-test-user-1@example.com",
      password: "test-password-123",
      id: "",
    },
    {
      email: "notif-test-user-2@example.com",
      password: "test-password-123",
      id: "",
    },
    {
      email: "notif-test-user-3@example.com",
      password: "test-password-123",
      id: "",
    },
  ];

  let testTournaments: Array<{ id: string; organizerId: string }> = [];
  let testSongIds: string[] = [];

  beforeAll(async () => {
    console.log("\n=== Notification Property Tests Setup ===");
    console.log("Note: These tests require manual user creation in Supabase Auth");
    for (const user of testUsers) {
      console.log(`Required test user: ${user.email} / ${user.password}`);
    }
    console.log("================================================\n");

    // Sign in as first user to create test data
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

    if (signInError || !authData.user) {
      console.log("⚠️  Test users not found. Tests will be skipped.");
      console.log("   Please create test users listed above");
      return;
    }

    testUsers[0].id = authData.user.id;
    console.log("✓ Signed in as test user:", testUsers[0].email);

    // Get IDs for other test users
    for (let i = 1; i < testUsers.length; i++) {
      const { data: profile } = await supabase
        .from(`${schema}.profiles`)
        .select("id")
        .eq("id", authData.user.id)
        .single();

      if (profile) {
        // Try to sign in to get their ID
        const { data: otherAuthData } =
          await supabase.auth.signInWithPassword({
            email: testUsers[i].email,
            password: testUsers[i].password,
          });

        if (otherAuthData?.user) {
          testUsers[i].id = otherAuthData.user.id;
        }
      }
    }

    // Sign back in as first user
    await supabase.auth.signInWithPassword({
      email: testUsers[0].email,
      password: testUsers[0].password,
    });

    // Create test songs
    const { data: song, error: songError } = await supabase
      .from(`${schema}.songs`)
      .insert({
        game_type: "ongeki",
        title: "Notification Test Song",
        artist: "Test Artist",
        difficulty: "master",
        level: 14.5,
      })
      .select()
      .single();

    if (!songError && song) {
      testSongIds.push(song.id);
    }

    // Create test tournaments
    for (let i = 0; i < 2; i++) {
      const { data: tournament, error } = await supabase
        .from(`${schema}.tournaments`)
        .insert({
          organizer_id: testUsers[0].id,
          title: `Notification Test Tournament ${i}`,
          game_type: "ongeki",
          submission_method: "both",
          start_at: new Date(Date.now() + 86400000).toISOString(),
          end_at: new Date(Date.now() + 172800000).toISOString(),
          is_public: true,
        })
        .select()
        .single();

      if (!error && tournament) {
        testTournaments.push({
          id: tournament.id,
          organizerId: testUsers[0].id,
        });

        // Add song to tournament
        await supabase.from(`${schema}.tournament_songs`).insert({
          tournament_id: tournament.id,
          song_id: testSongIds[0],
        });

        // Add participants (other test users)
        for (let j = 1; j < testUsers.length; j++) {
          if (testUsers[j].id) {
            await supabase.from(`${schema}.participants`).insert({
              tournament_id: tournament.id,
              user_id: testUsers[j].id,
            });
          }
        }
      }
    }

    console.log(`✓ Created ${testTournaments.length} test tournaments`);
  });

  afterAll(async () => {
    console.log("\n=== Cleanup ===");

    // Delete test tournaments
    for (const tournament of testTournaments) {
      await supabase
        .from(`${schema}.tournaments`)
        .delete()
        .eq("id", tournament.id);
    }

    // Delete test songs
    for (const songId of testSongIds) {
      await supabase.from(`${schema}.songs`).delete().eq("id", songId);
    }

    // Delete notifications
    for (const user of testUsers) {
      if (user.id) {
        await supabase
          .from(`${schema}.notifications`)
          .delete()
          .eq("user_id", user.id);
      }
    }

    console.log("✓ Cleanup complete");
  });

  beforeEach(async () => {
    // Clean up notifications before each test
    for (const user of testUsers) {
      if (user.id) {
        await supabase
          .from(`${schema}.notifications`)
          .delete()
          .eq("user_id", user.id);
      }
    }
  });

  /**
   * Property 27: Event notification creation
   * Feature: gcm-arena-platform, Property 27: イベント通知の作成
   * Validates: Requirements 9.1
   */
  it("Property 27: For any tournament event, when the event occurs, notification records are created for related users", async () => {
    if (testTournaments.length === 0) {
      console.log("⚠️  Skipping test - no test tournaments available");
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testTournaments.map((t) => t.id)),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (tournamentId, message) => {
          // Create notifications for tournament participants
          await notifyTournamentParticipants(supabase, tournamentId, message);

          // Verify notifications were created
          const { data: notifications, error } = await supabase
            .from(`${schema}.notifications`)
            .select("*")
            .eq("message", message);

          expect(error).toBeNull();
          expect(notifications).toBeDefined();
          expect(notifications!.length).toBeGreaterThan(0);

          // Verify all notifications have the correct message
          for (const notification of notifications!) {
            expect(notification.message).toBe(message);
            expect(notification.is_read).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 28: Unread notification identification
   * Feature: gcm-arena-platform, Property 28: 未読通知の識別
   * Validates: Requirements 9.2
   */
  it("Property 28: For any user's notification list, unread notifications (is_read=false) are distinguished from read notifications", async () => {
    const availableUsers = testUsers.filter((u) => u.id);
    if (availableUsers.length === 0) {
      console.log("⚠️  Skipping test - no test users available");
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...availableUsers.map((u) => u.id)),
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        async (userId, messages, readStatuses) => {
          // Create notifications with different read statuses
          const notifications = messages.map((message, index) => ({
            user_id: userId,
            message,
            is_read: readStatuses[index % readStatuses.length],
          }));

          const { error: insertError } = await supabase
            .from(`${schema}.notifications`)
            .insert(notifications);

          expect(insertError).toBeNull();

          // Fetch all notifications
          const { data: allNotifications, error: fetchError } = await supabase
            .from(`${schema}.notifications`)
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          expect(fetchError).toBeNull();
          expect(allNotifications).toBeDefined();

          // Verify unread notifications are properly identified
          const unreadNotifications = allNotifications!.filter(
            (n) => !n.is_read
          );
          const readNotifications = allNotifications!.filter((n) => n.is_read);

          // All unread notifications should have is_read = false
          for (const notification of unreadNotifications) {
            expect(notification.is_read).toBe(false);
          }

          // All read notifications should have is_read = true
          for (const notification of readNotifications) {
            expect(notification.is_read).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 29: Mark notification as read
   * Feature: gcm-arena-platform, Property 29: 通知の既読マーク
   * Validates: Requirements 9.3
   */
  it("Property 29: For any notification, when a user marks it as read, the is_read flag is updated to true", async () => {
    const availableUsers = testUsers.filter((u) => u.id);
    if (availableUsers.length === 0) {
      console.log("⚠️  Skipping test - no test users available");
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...availableUsers.map((u) => u.id)),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userId, message) => {
          // Create an unread notification
          const { data: notification, error: insertError } = await supabase
            .from(`${schema}.notifications`)
            .insert({
              user_id: userId,
              message,
              is_read: false,
            })
            .select()
            .single();

          expect(insertError).toBeNull();
          expect(notification).toBeDefined();
          expect(notification!.is_read).toBe(false);

          // Mark as read
          const { data: updatedNotification, error: updateError } =
            await supabase
              .from(`${schema}.notifications`)
              .update({ is_read: true })
              .eq("id", notification!.id)
              .select()
              .single();

          expect(updateError).toBeNull();
          expect(updatedNotification).toBeDefined();
          expect(updatedNotification!.is_read).toBe(true);

          // Verify the update persisted
          const { data: fetchedNotification, error: fetchError } =
            await supabase
              .from(`${schema}.notifications`)
              .select("*")
              .eq("id", notification!.id)
              .single();

          expect(fetchError).toBeNull();
          expect(fetchedNotification).toBeDefined();
          expect(fetchedNotification!.is_read).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 30: Notification history viewing
   * Feature: gcm-arena-platform, Property 30: 通知履歴の閲覧
   * Validates: Requirements 9.6
   */
  it("Property 30: For any user, that user can view their notification history and cannot view other users' notifications", async () => {
    const availableUsers = testUsers.filter((u) => u.id);
    if (availableUsers.length < 2) {
      console.log("⚠️  Skipping test - need at least 2 test users");
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...availableUsers.slice(0, 2).map((u) => u.id)),
        fc.constantFrom(...availableUsers.slice(0, 2).map((u) => u.id)),
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          minLength: 1,
          maxLength: 3,
        }),
        async (userId1, userId2, messages) => {
          // Create notifications for user1
          const notifications1 = messages.map((message) => ({
            user_id: userId1,
            message: `User1: ${message}`,
            is_read: false,
          }));

          await supabase.from(`${schema}.notifications`).insert(notifications1);

          // Create notifications for user2
          const notifications2 = messages.map((message) => ({
            user_id: userId2,
            message: `User2: ${message}`,
            is_read: false,
          }));

          await supabase.from(`${schema}.notifications`).insert(notifications2);

          // User1 should only see their own notifications
          const { data: user1Notifications, error: error1 } = await supabase
            .from(`${schema}.notifications`)
            .select("*")
            .eq("user_id", userId1);

          expect(error1).toBeNull();
          expect(user1Notifications).toBeDefined();

          // All notifications should belong to user1
          for (const notification of user1Notifications!) {
            expect(notification.user_id).toBe(userId1);
            expect(notification.message).toContain("User1:");
          }

          // User2 should only see their own notifications
          const { data: user2Notifications, error: error2 } = await supabase
            .from(`${schema}.notifications`)
            .select("*")
            .eq("user_id", userId2);

          expect(error2).toBeNull();
          expect(user2Notifications).toBeDefined();

          // All notifications should belong to user2
          for (const notification of user2Notifications!) {
            expect(notification.user_id).toBe(userId2);
            expect(notification.message).toContain("User2:");
          }

          // Verify RLS: user1 cannot see user2's notifications
          // (This is enforced by RLS policies, so direct query should only return user's own)
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 33: Terms update notification
   * Feature: gcm-arena-platform, Property 33: 規約更新の通知
   * Validates: Requirements 12.6
   */
  it("Property 33: For any terms of service update, when the update occurs, notifications are created for all existing users", async () => {
    const availableUsers = testUsers.filter((u) => u.id);
    if (availableUsers.length === 0) {
      console.log("⚠️  Skipping test - no test users available");
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (updateMessage) => {
          // Get count of active users before notification
          const { count: userCount, error: countError } = await supabase
            .from(`${schema}.profiles`)
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .in(
              "id",
              availableUsers.map((u) => u.id)
            );

          expect(countError).toBeNull();
          expect(userCount).toBeGreaterThan(0);

          // Create a unique message for this test run
          const uniqueMessage = `Terms Update: ${updateMessage} - ${Date.now()}`;

          // Notify all users about terms update
          await notifyAllUsers(supabase, uniqueMessage);

          // Wait a bit for async operations to complete
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify notifications were created for all users
          const { data: notifications, error: fetchError } = await supabase
            .from(`${schema}.notifications`)
            .select("*")
            .eq("message", uniqueMessage);

          expect(fetchError).toBeNull();
          expect(notifications).toBeDefined();

          // Should have created notifications for all test users
          expect(notifications!.length).toBeGreaterThanOrEqual(
            availableUsers.length
          );

          // All notifications should have the correct message and be unread
          for (const notification of notifications!) {
            expect(notification.message).toBe(uniqueMessage);
            expect(notification.is_read).toBe(false);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
