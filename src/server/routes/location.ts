import { Hono } from "hono";
import { db } from "@/db";
import { location } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { locationSchema, idParamSchema } from "@/lib/validations";

const app = new Hono()
  // List all locations
  .get("/", async (c) => {
    const allLocations = await db.query.location.findMany({
      orderBy: [desc(location.createdAt)],
    });
    return c.json({ data: allLocations });
  })

  // Get a single location
  .get("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [found] = await db
      .select()
      .from(location)
      .where(eq(location.id, parseInt(id)));

    if (!found) return c.json({ message: "Location not found" }, 404);
    return c.json({ data: found });
  })

  // Create a location
  .post("/", zValidator("json", locationSchema), async (c) => {
    const values = c.req.valid("json");
    const [newLocation] = await db.insert(location).values(values).returning();
    return c.json({ data: newLocation, message: "Location created" });
  })

  // Update a location
  .patch(
    "/:id",
    zValidator("param", idParamSchema),
    zValidator("json", locationSchema.partial()),
    async (c) => {
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const [updated] = await db
        .update(location)
        .set(values)
        .where(eq(location.id, parseInt(id)))
        .returning();

      if (!updated) return c.json({ message: "Location not found" }, 404);
      return c.json({ data: updated, message: "Location updated" });
    },
  )

  // Delete a location
  .delete("/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [deleted] = await db
      .delete(location)
      .where(eq(location.id, parseInt(id)))
      .returning();

    if (!deleted) return c.json({ message: "Location not found" }, 404);
    return c.json({ message: "Location deleted" });
  });

export default app;
