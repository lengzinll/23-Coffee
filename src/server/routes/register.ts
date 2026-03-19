import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../../db";
import {
  register,
  event,
  socialMediaEvent,
  challenge,
  challengeScore,
} from "../../db/schema";
import { del } from "@vercel/blob";
import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import { registerSchema, idParamSchema } from "../../lib/validations";
import { verifyImageProof } from "../services/ai-verification";
import { sendTelegramAlert } from "../services/telegram";

const registerApp = new Hono({ strict: false })
  .post(
    "/",
    zValidator("json", registerSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          { success: false, data: null, message: "Validation failed" },
          400,
        );
      }
    }),
    async (c) => {
      const data = c.req.valid("json");

      try {
        // Find Active Event
        const activeEvent = await db
          .select()
          .from(event)
          .where(eq(event.status, "active"))
          .get();

        if (!activeEvent) {
          return c.json(
            { success: false, data: null, message: "No active event found" },
            400,
          );
        }

        // 0. Check for duplicate registration (phone + eventId)
        const existing = await db
          .select()
          .from(register)
          .where(
            and(
              eq(register.phone, data.phone),
              eq(register.eventId, activeEvent.id),
            ),
          )
          .get();

        if (existing) {
          return c.json(
            {
              success: false,
              data: null,
              message:
                "លេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយសម្រាប់កម្មវិធីនេះ។ (This phone number is already registered for this event.)",
            },
            400,
          );
        }

        // 1. Verify Dynamic Tasks
        const tasksInDb = await db
          .select()
          .from(socialMediaEvent)
          .where(eq(socialMediaEvent.eventId, activeEvent.id));

        if (tasksInDb.length > 0) {
          if (
            !data.socialProofs ||
            data.socialProofs === "{}" ||
            data.socialProofs === "null"
          ) {
            return c.json(
              {
                success: false,
                data: null,
                message:
                  "សូមផ្តល់ Screenshot សម្រាប់ផ្ទៀងផ្ទាត់ការងារ។ (Social proofs are required.)",
              },
              400,
            );
          }

          const proofs = JSON.parse(data.socialProofs) as Record<
            string,
            string
          >;
          const providedTaskIds = Object.keys(proofs).map((id) =>
            parseInt(id, 10),
          );
          const missingTasks = tasksInDb.filter(
            (task) => !providedTaskIds.includes(task.id),
          );

          if (missingTasks.length > 0) {
            const taskErrors: Record<string, string> = {};
            missingTasks.forEach((task) => {
              taskErrors[task.id.toString()] =
                "សូមផ្តល់ Screenshot សម្រាប់ផ្ទៀងផ្ទាត់ការងារនេះ។";
            });
            return c.json(
              {
                success: false,
                data: null,
                message:
                  "សូមផ្តល់ Screenshot ដែលនៅខ្វះ។ (Missing required social proofs.)",
                taskErrors,
              },
              400,
            );
          }

          // Ask Gemini to verify every screenshot and collect per-task results
          const verificationResults = await Promise.all(
            tasksInDb.map(async (task) => {
              const proofUrl = proofs[task.id.toString()];
              if (proofUrl) {
                const result = await verifyImageProof(
                  proofUrl,
                  task.type,
                  task.url,
                );
                return { taskId: task.id.toString(), ...result };
              }
              return { taskId: task.id.toString(), passed: true, reason: "" };
            }),
          );

          const failedTasks = verificationResults.filter((r) => !r.passed);
          if (failedTasks.length > 0) {
            console.warn(
              "Registration rejected: Social proof verification failed.",
            );
            // Build a map of taskId -> reason for the client to display under the right input
            const taskErrors: Record<string, string> = {};
            failedTasks.forEach(({ taskId, reason }) => {
              taskErrors[taskId] =
                reason || "Screenshot did not pass verification";
            });
            return c.json(
              {
                success: false,
                data: null,
                message:
                  "Social proof verification failed. Please check the highlighted tasks.",
                taskErrors,
              },
              400,
            );
          }
        }

        // 2. Generate Sequential Player ID
        const existingCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(register)
          .where(eq(register.eventId, activeEvent.id))
          .get();

        const nextNumber = (existingCount?.count ?? 0) + 1;
        const playerId = `NPL-${String(nextNumber).padStart(3, "0")}`;

        const [result] = await db
          .insert(register)
          .values({
            fullName: data.fullName,
            age: data.age,
            phone: data.phone,
            position: data.position,
            agreedTerms: data.agreedTerms,
            profileImage: data.profileImage || null,
            socialProofs: data.socialProofs || null,
            scanned: false,
            eventId: activeEvent?.id || null,
            playerId: playerId,
          })
          .returning();

        // Send Telegram Alert
        try {
          await sendTelegramAlert({
            fullName: data.fullName,
            age: data.age,
            phone: data.phone,
            position: data.position ?? null,
            eventName: activeEvent.name,
            socialProofs: data.socialProofs || null,
          });
        } catch (alertError) {
          console.error(
            "Failed to send Telegram alert (non-blocking):",
            alertError,
          );
        }

        return c.json({ success: true, data: result, message: "Success" }, 201);
      } catch (e: unknown) {
        const error = e as Error;
        console.error("Registration failed:", error.message || error);
        return c.json(
          {
            success: false,
            data: null,
            message: "Failed to complete registration",
          },
          400,
        );
      }
    },
  )

  // Get total registration count across all events (public)
  .get("/count", async (c) => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(register)
      .get();

    const count = result?.count ?? 0;
    return c.json({ count });
  })

  // List all registrations for dashboard
  .get("/", async (c) => {
    // ... same code
    const allRegistrations = await db
      .select({
        id: register.id,
        fullName: register.fullName,
        age: register.age,
        phone: register.phone,
        position: register.position,
        profileImage: register.profileImage,
        scanned: register.scanned,
        socialProofs: register.socialProofs,
        eventName: event.name,
        eventDate: event.date,
        eventId: register.eventId,
        playerId: register.playerId,
        totalScore: register.totalScore,
        isLive: register.isLive,
        createdAt: register.createdAt,
      })
      .from(register)
      .leftJoin(event, eq(register.eventId, event.id))
      .orderBy(desc(register.createdAt));

    return c.json({ data: allRegistrations });
  })

  // Get current "Live" player
  .get("/live", async (c) => {
    try {
      const livePlayer = await db
        .select({
          id: register.id,
          fullName: register.fullName,
          age: register.age,
          position: register.position,
          profileImage: register.profileImage,
          totalScore: register.totalScore,
          playerId: register.playerId,
          eventId: register.eventId,
        })
        .from(register)
        .where(eq(register.isLive, true))
        .get();

      if (!livePlayer) return c.json({ success: true, data: null });

      // Fetch all possible challenges for this event
      const allEventChallenges = await db
        .select({ id: challenge.id, name: challenge.name })
        .from(challenge)
        .where(eq(challenge.eventId, livePlayer.eventId!))
        .all();

      // Fetch existing scores for this player
      const recordedScores = await db
        .select({
          challengeId: challengeScore.challengeId,
          score: challengeScore.score,
        })
        .from(challengeScore)
        .where(eq(challengeScore.registerId, livePlayer.id))
        .all();

      const scoreMap = new Map(
        recordedScores.map((s) => [s.challengeId, s.score]),
      );

      // Merge: ensure every challenge exists with at least score 0
      const mergedChallenges = allEventChallenges.map((ch) => ({
        name: ch.name,
        score: scoreMap.get(ch.id) ?? 0,
      }));

      return c.json({
        success: true,
        data: {
          ...livePlayer,
          challenges: mergedChallenges,
        },
      });
    } catch (err) {
      console.error("Failed to fetch live player:", err);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  })

  // Get single registration by ID (For QR Scan)
  .get("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    const record = await db
      .select({
        id: register.id,
        fullName: register.fullName,
        age: register.age,
        phone: register.phone,
        position: register.position,
        profileImage: register.profileImage,
        scanned: register.scanned,
        socialProofs: register.socialProofs,
        eventName: event.name,
        eventDate: event.date,
        eventId: register.eventId,
        playerId: register.playerId,
        totalScore: register.totalScore,
        isLive: register.isLive,
        createdAt: register.createdAt,
      })
      .from(register)
      .leftJoin(event, eq(register.eventId, event.id))
      .where(eq(register.id, id))
      .get();

    if (!record) return c.json({ error: "Registration not found" }, 404);

    return c.json({ data: record });
  })

  // Set a registration as the active "Live" player
  .patch("/:id/live", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    try {
      // 1. Reset all others (we can do this in one query)
      await db.update(register).set({ isLive: false });

      // 2. Set the target one as live
      const [updated] = await db
        .update(register)
        .set({ isLive: true })
        .where(eq(register.id, id))
        .returning();

      if (!updated) {
        return c.json({ success: false, message: "Player not found" }, 404);
      }

      // 3. Get full details + challenges for broadcast
      const fullData = await db
        .select({
          id: register.id,
          fullName: register.fullName,
          age: register.age,
          position: register.position,
          profileImage: register.profileImage,
          totalScore: register.totalScore,
          playerId: register.playerId,
          eventId: register.eventId,
        })
        .from(register)
        .where(eq(register.id, id))
        .get();

      if (!fullData) throw new Error("Broadcast data fetch failed");

      const scores = await db
        .select({
          name: challenge.name,
          score: challengeScore.score,
        })
        .from(challengeScore)
        .innerJoin(challenge, eq(challengeScore.challengeId, challenge.id))
        .where(eq(challengeScore.registerId, id))
        .all();

      // 4. Broadcast via WebSocket
      const { broadcast } = await import("./ws");
      broadcast({
        type: "LIVE_PLAYER_CHANGED",
        player: {
          ...fullData,
          challenges: scores,
        },
      });

      return c.json({
        success: true,
        data: updated,
        message: "Player is now LIVE",
      });
    } catch (err) {
      console.error("Failed to set live player:", err);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  })

  // Mark as scanned/verified
  .patch("/:id/scan", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    const record = await db
      .select()
      .from(register)
      .where(eq(register.id, id))
      .get();

    if (!record) return c.json({ error: "Registration not found" }, 404);
    if (record.scanned)
      return c.json({ error: "This QR code has already been used!" }, 400);

    const [result] = await db
      .update(register)
      .set({ scanned: true })
      .where(eq(register.id, id))
      .returning();

    return c.json({ success: true, data: result, message: "Success" }, 201);
  })
  // Delete registration
  .delete("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    try {
      // 1. Fetch the registration to get screenshot URLs
      const record = await db
        .select()
        .from(register)
        .where(eq(register.id, id))
        .get();

      if (!record) {
        return c.json(
          {
            success: false,
            message: "Registration not found",
            error: "Not Found",
          },
          404,
        );
      }

      // 2. Extract URLs from socialProofs
      const urlsToDelete: string[] = [];
      if (record.socialProofs) {
        try {
          const proofs = JSON.parse(record.socialProofs) as Record<
            string,
            string
          >;
          Object.values(proofs).forEach((url) => {
            if (url && url.startsWith("http")) {
              urlsToDelete.push(url);
            }
          });
        } catch (e) {
          console.error("Failed to parse socialProofs for deletion:", e);
        }
      }

      if (record.profileImage && record.profileImage.startsWith("http")) {
        urlsToDelete.push(record.profileImage);
      }

      // 3. Delete screenshots from Vercel Blob
      if (urlsToDelete.length > 0) {
        console.log(
          `Deleting ${urlsToDelete.length} screenshots for registration ${id}`,
        );
        await del(urlsToDelete);
      }

      // 4. Delete from database
      const [deleted] = await db
        .delete(register)
        .where(eq(register.id, id))
        .returning();

      if (!deleted) {
        throw new Error("Deletion failed: No record returned");
      }

      // 5. Re-sequence Player IDs for the same event to fill the gap
      // Use record.eventId since it was fetched at the start of the function
      const targetEventId = record.eventId || deleted.eventId;

      if (targetEventId) {
        console.log(`Re-sequencing Player IDs for event ${targetEventId}...`);
        const remainingRegs = await db
          .select()
          .from(register)
          .where(eq(register.eventId, targetEventId))
          .orderBy(asc(register.createdAt), asc(register.id)) // Added ID tie-breaker
          .all();

        console.log(`Found ${remainingRegs.length} registrations to check.`);

        for (let i = 0; i < remainingRegs.length; i++) {
          const reg = remainingRegs[i];
          const newPlayerId = `NPL-${String(i + 1).padStart(3, "0")}`;

          if (reg.playerId !== newPlayerId) {
            console.log(
              `  Updating ID ${reg.id}: ${reg.playerId} -> ${newPlayerId}`,
            );
            await db
              .update(register)
              .set({ playerId: newPlayerId })
              .where(eq(register.id, reg.id));
          }
        }
        console.log("Re-sequencing completed.");
      }

      return c.json({
        success: true,
        data: deleted,
        message: "Registration deleted and IDs re-sequenced",
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.error("Delete registration failed:", error.message || error);
      return c.json(
        {
          success: false,
          message: "Failed to delete registration",
          error: error.message,
        },
        500,
      );
    }
  });

export default registerApp;
