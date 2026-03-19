import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../../db";
import { challenge, challengeScore, register, event } from "../../db/schema";
import { eq, and, sum } from "drizzle-orm";
import { z } from "zod";

const challengeApp = new Hono({ strict: false })
  // 1. Get all challenges for an event
  .get("/event/all", async (c) => {
    const challenges = await db
      .select({
        id: challenge.id,
        eventId: challenge.eventId,
        name: challenge.name,
        createdAt: challenge.createdAt,
        eventName: event.name,
      })
      .from(challenge)
      .leftJoin(event, eq(challenge.eventId, event.id));
    return c.json({ data: challenges });
  })
  // 1.1 get specific event challenges
  .get("/event/:eventId", async (c) => {
    const eventId = parseInt(c.req.param("eventId"), 10);
    if (isNaN(eventId)) return c.json({ error: "Invalid event ID" }, 400);

    const challenges = await db
      .select({
        id: challenge.id,
        eventId: challenge.eventId,
        name: challenge.name,
        createdAt: challenge.createdAt,
        eventName: event.name,
      })
      .from(challenge)
      .leftJoin(event, eq(challenge.eventId, event.id))
      .where(eq(challenge.eventId, eventId));

    return c.json({ data: challenges });
  })

  // 2. Create a challenge for an event
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        eventId: z.number(),
        name: z.string().min(1, "Name is required"),
      }),
    ),
    async (c) => {
      const data = c.req.valid("json");
      const [result] = await db
        .insert(challenge)
        .values({
          eventId: data.eventId,
          name: data.name,
        })
        .returning();

      return c.json({ success: true, data: result }, 201);
    },
  )

  // 3. Delete a challenge
  .delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid challenge ID" }, 400);

    const [deleted] = await db
      .delete(challenge)
      .where(eq(challenge.id, id))
      .returning();

    if (!deleted) return c.json({ error: "Challenge not found" }, 404);

    return c.json({ success: true, data: deleted });
  })

  // 3b. Update a challenge (name / eventId)
  .patch(
    "/:id",
    zValidator(
      "json",
      z.object({
        name: z.string().min(1, "Name is required").optional(),
        eventId: z.number().optional(),
      }),
    ),
    async (c) => {
      const id = parseInt(c.req.param("id"), 10);
      if (isNaN(id)) return c.json({ error: "Invalid challenge ID" }, 400);

      const data = c.req.valid("json");
      const [updated] = await db
        .update(challenge)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.eventId !== undefined && { eventId: data.eventId }),
        })
        .where(eq(challenge.id, id))
        .returning();

      if (!updated) return c.json({ error: "Challenge not found" }, 404);

      return c.json({ success: true, data: updated });
    },
  )

  // 4. Update or Insert a score
  .put(
    "/score",
    zValidator(
      "json",
      z.object({
        registerId: z.number(),
        challengeId: z.number(),
        score: z.number(),
      }),
    ),
    async (c) => {
      const data = c.req.valid("json");

      // Check if score exists
      const existing = await db
        .select()
        .from(challengeScore)
        .where(
          and(
            eq(challengeScore.registerId, data.registerId),
            eq(challengeScore.challengeId, data.challengeId),
          ),
        )
        .get();

      if (existing) {
        await db
          .update(challengeScore)
          .set({ score: data.score })
          .where(
            and(
              eq(challengeScore.registerId, data.registerId),
              eq(challengeScore.challengeId, data.challengeId),
            ),
          );
      } else {
        await db.insert(challengeScore).values({
          registerId: data.registerId,
          challengeId: data.challengeId,
          score: data.score,
        });
      }

      // Recalculate and update totalScore on the register row
      const [totals] = await db
        .select({ total: sum(challengeScore.score) })
        .from(challengeScore)
        .where(eq(challengeScore.registerId, data.registerId));

      const newTotal = Number(totals?.total ?? 0);

      const [updatedReg] = await db
        .update(register)
        .set({ totalScore: newTotal })
        .where(eq(register.id, data.registerId))
        .returning();

      // If this player is LIVE, broadcast the update with full context
      if (updatedReg && updatedReg.isLive) {
        // 1. Fetch all challenges for this event
        const allEventChallenges = await db
          .select({ id: challenge.id, name: challenge.name })
          .from(challenge)
          .where(eq(challenge.eventId, updatedReg.eventId!))
          .all();

        // 2. Fetch all current scores for this player
        const recordedScores = await db
          .select({
            challengeId: challengeScore.challengeId,
            score: challengeScore.score,
          })
          .from(challengeScore)
          .where(eq(challengeScore.registerId, data.registerId))
          .all();

        const scoreMap = new Map(
          recordedScores.map((s) => [s.challengeId, s.score]),
        );

        // 3. Merge: ensure every challenge exists with at least 0
        const mergedChallenges = allEventChallenges.map((ch) => ({
          name: ch.name,
          score: scoreMap.get(ch.id) ?? 0,
        }));

        const { broadcast } = await import("./ws");
        broadcast({
          type: "SCORE_UPDATED",
          player: {
            id: updatedReg.id,
            fullName: updatedReg.fullName,
            age: updatedReg.age,
            position: updatedReg.position,
            profileImage: updatedReg.profileImage,
            totalScore: newTotal,
            playerId: updatedReg.playerId,
            eventId: updatedReg.eventId,
            challenges: mergedChallenges,
          },
        });
      }

      return c.json({ success: true, totalScore: newTotal });
    },
  )

  // 5. Get all scores for a specific event
  .get("/scores/:eventId", async (c) => {
    const eventId = parseInt(c.req.param("eventId"), 10);
    if (isNaN(eventId)) return c.json({ error: "Invalid event ID" }, 400);

    // Get all scores for all users registered for this event
    const scores = await db
      .select({
        id: challengeScore.id,
        registerId: challengeScore.registerId,
        challengeId: challengeScore.challengeId,
        score: challengeScore.score,
      })
      .from(challengeScore)
      .innerJoin(challenge, eq(challengeScore.challengeId, challenge.id))
      .where(eq(challenge.eventId, eventId));

    return c.json({ data: scores });
  });

export default challengeApp;
