export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Run any pending schema migrations before starting the app
        await runMigrations();

        const { initCron } = await import('./lib/cron');
        initCron();
    }
}

/** Safely apply schema changes that may not exist on older databases. */
async function runMigrations() {
    const { db } = await import('./db');

    // ── Migration 1: telegram_message_id ──────────────────────────────────────
    try {
        await db.run(
            "ALTER TABLE scan_history ADD COLUMN telegram_message_id INTEGER" as any
        );
        console.log("✅ [Migration] Added telegram_message_id column to scan_history");
    } catch (e: any) {
        const combined = (e?.message ?? "") + " " + (e?.cause?.message ?? "");
        if (combined.includes("duplicate column") || combined.includes("already exists")) {
            console.log("✅ [Migration] telegram_message_id already exists, skipping.");
        } else {
            console.error("❌ [Migration Error] telegram_message_id:", e);
        }
    }

    // ── Migration 2: stamps_per_cycle ─────────────────────────────────────────
    // Snapshot of STAMPS_PER_CYCLE at time of redemption so historical cycles
    // are never broken when the global setting is changed in the future.
    try {
        await db.run(
            "ALTER TABLE scan_history ADD COLUMN stamps_per_cycle INTEGER" as any
        );
        console.log("✅ [Migration] Added stamps_per_cycle column to scan_history");
    } catch (e: any) {
        const combined = (e?.message ?? "") + " " + (e?.cause?.message ?? "");
        if (combined.includes("duplicate column") || combined.includes("already exists")) {
            console.log("✅ [Migration] stamps_per_cycle already exists, skipping.");
        } else {
            console.error("❌ [Migration Error] stamps_per_cycle:", e);
        }
    }
}
