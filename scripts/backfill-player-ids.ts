import { db } from "../src/db";
import { register } from "../src/db/schema";
import { asc, eq } from "drizzle-orm";

async function backfill() {
  console.log("🚀 Starting Player ID backfill...");

  // 1. Fetch all unique eventIds
  const registrations = await db
    .select({ eventId: register.eventId })
    .from(register)
    .all();
  const eventIds = Array.from(
    new Set(
      registrations
        .map((r) => r.eventId)
        .filter((id): id is number => id !== null),
    ),
  );

  console.log(`Found ${eventIds.length} events to process.`);

  for (const eventId of eventIds) {
    console.log(`\nProcessing Event ID: ${eventId}`);

    // 2. Fetch all registrations for this event, sorted by creation time
    const eventRegs = await db
      .select()
      .from(register)
      .where(eq(register.eventId, eventId))
      .orderBy(asc(register.createdAt))
      .all();

    console.log(`Found ${eventRegs.length} registrations.`);

    // 3. Update each registration with a sequential Player ID
    for (let i = 0; i < eventRegs.length; i++) {
      const reg = eventRegs[i];
      const nextNumber = i + 1;
      const playerId = `NPL-${String(nextNumber).padStart(3, "0")}`;

      console.log(`  Updating ID ${reg.id} -> ${playerId}`);

      await db
        .update(register)
        .set({ playerId })
        .where(eq(register.id, reg.id));
    }
  }

  console.log("\n✅ Backfill completed successfully!");
  process.exit(0);
}

backfill().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
