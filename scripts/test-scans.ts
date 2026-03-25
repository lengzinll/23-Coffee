import { db } from "../src/db";
import { scanHistory, user } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function runTest() {
    console.log("🚀 Starting test data script...");

    // 1. Get a user to associate scans with
    const testUser = await db.query.user.findFirst();

    if (!testUser) {
        console.error("❌ No users found in database. Please run seed first.");
        return;
    }

    console.log(`👤 Using user: ${testUser.username} (ID: ${testUser.id})`);

    // 2. Insert test data
    console.log("📥 Inserting 5 test scans...");
    const testScans = [
        { user_id: testUser.id, status: "pending" as const },
        { user_id: testUser.id, status: "approved" as const },
        { user_id: testUser.id, status: "rejected" as const },
        { user_id: testUser.id, status: "approved" as const },
        { user_id: testUser.id, status: "pending" as const },
    ];

    const inserted = await db.insert(scanHistory).values(testScans).returning();
    const insertedIds = inserted.map((s) => s.id);

    console.log(`✅ Successfully inserted scans with IDs: ${insertedIds.join(", ")}`);
    console.log("⏱️ Waiting 10 seconds before cleanup... (Check your dashboard now!)");

    console.log("✨ Test complete. Data has been removed.");
}

runTest().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
