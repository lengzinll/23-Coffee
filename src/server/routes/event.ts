import { Hono } from "hono";
import { db } from "../../db";
import { del } from "@vercel/blob";
import { event, register, socialMediaEvent, location } from "../../db/schema";
import { eq, desc, not, sql, and, lt } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import {
  eventSchema,
  idParamSchema,
  socialMediaEventSchema,
} from "../../lib/validations";

const eventApp = new Hono({ strict: false })
  // List all events with registration metrics
  .get("/", async (c) => {
    const allEvents = await db
      .select({
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        status: event.status,
        createdAt: event.createdAt,
        locationId: event.locationId,
        registrationCount: sql<number>`count(${register.id})`.mapWith(Number),
        scannedCount:
          sql<number>`count(case when ${register.scanned} = 1 then 1 end)`.mapWith(
            Number,
          ),
        pendingCount:
          sql<number>`count(case when ${register.scanned} = 0 then 1 end)`.mapWith(
            Number,
          ),
      })
      .from(event)
      .leftJoin(register, eq(register.eventId, event.id))
      .groupBy(event.id)
      .orderBy(desc(event.createdAt));

    return c.json({ data: allEvents });
  })

  // Get the currently active event with location details
  .get("/active", async (c) => {
    const [activeEvent] = await db
      .select({
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        status: event.status,
        locationId: event.locationId,
        locationName: location.name,
        locationMapUrl: location.mapUrl,
      })
      .from(event)
      .leftJoin(location, eq(event.locationId, location.id))
      .where(eq(event.status, "active"))
      .limit(1);

    return c.json({ data: activeEvent || null });
  })

  // Get tasks for the active event (Public)
  .get("/active/tasks", async (c) => {
    const activeEvent = await db
      .select()
      .from(event)
      .where(eq(event.status, "active"))
      .get();
    if (!activeEvent) return c.json({ data: [] });

    const tasks = await db
      .select()
      .from(socialMediaEvent)
      .where(eq(socialMediaEvent.eventId, activeEvent.id));

    return c.json({ data: tasks });
  })

  // Get tasks for a specific event (Admin)
  .get("/:id/tasks", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const tasks = await db
      .select()
      .from(socialMediaEvent)
      .where(eq(socialMediaEvent.eventId, parseInt(id, 10)));
    return c.json({ data: tasks });
  })

  // Add a social media task to an event
  .post("/tasks", zValidator("json", socialMediaEventSchema), async (c) => {
    const data = c.req.valid("json");
    const [result] = await db
      .insert(socialMediaEvent)
      .values({
        eventId: data.eventId,
        type: data.type,
        url: data.url,
        label: data.label,
      })
      .returning();

    return c.json({ success: true, data: result }, 201);
  })

  // Delete a social media task
  .delete("/tasks/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [deleted] = await db
      .delete(socialMediaEvent)
      .where(eq(socialMediaEvent.id, parseInt(id, 10)))
      .returning();
    if (!deleted) return c.json({ error: "Task not found" }, 404);

    return c.json({ success: true, data: deleted });
  })

  // Create a new event
  .post("/", zValidator("json", eventSchema), async (c) => {
    const body = c.req.valid("json");
    const [result] = await db
      .insert(event)
      .values({
        name: body.name,
        description: body.description,
        date: body.date,
        status: body.status,
        locationId: body.locationId,
      })
      .returning();

    return c.json({ success: true, data: result }, 201);
  })

  // Update an event
  .patch(
    "/:id",
    zValidator("param", idParamSchema),
    zValidator("json", eventSchema.partial()),
    async (c) => {
      const { id: idStr } = c.req.valid("param");
      const id = parseInt(idStr, 10);
      const body = c.req.valid("json");

      const [updated] = await db
        .update(event)
        .set({
          ...body,
          // Ensure date is handled if provided as ISO string (zValidator transform usually handles this but partial() might be tricky)
          date: body.date ? new Date(body.date) : undefined,
        })
        .where(eq(event.id, id))
        .returning();

      if (!updated) return c.json({ error: "Event not found" }, 404);

      return c.json({ success: true, data: updated });
    },
  )

  // Activate an event (and deactivate others)
  .post("/:id/activate", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    // Transactional update would be better, but for SQLite simplicity:
    await db
      .update(event)
      .set({ status: "inactive" })
      .where(not(eq(event.id, id)));
    const [updated] = await db
      .update(event)
      .set({ status: "active" })
      .where(eq(event.id, id))
      .returning();

    if (!updated) return c.json({ error: "Event not found" }, 404);

    return c.json({ success: true, data: updated });
  })

  // Delete an event
  .delete("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    try {
      // 1. Fetch all registrations to get screenshot URLs for deletion
      const registrations = await db
        .select({ socialProofs: register.socialProofs })
        .from(register)
        .where(eq(register.eventId, id));

      const urlsToDelete: string[] = [];
      registrations.forEach((reg) => {
        if (reg.socialProofs) {
          try {
            const proofs = JSON.parse(reg.socialProofs) as Record<
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
      });

      // 2. Delete screenshots from Vercel Blob
      if (urlsToDelete.length > 0) {
        console.log(
          `Deleting ${urlsToDelete.length} screenshots for event ${id}`,
        );
        await del(urlsToDelete);
      }

      // 3. Finally delete the event
      const [deleted] = await db
        .delete(event)
        .where(eq(event.id, id))
        .returning();

      if (!deleted) return c.json({ error: "Event not found" }, 404);

      return c.json({ success: true, data: deleted });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Delete event failed:", err);
      return c.json(
        {
          success: false,
          message:
            "Failed to delete event. Make sure all related records are cleared.",
          error: err.message,
        },
        500,
      );
    }
  });

export default eventApp;
