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
    try {
        const { db } = await import('./db');
        await db.run(
            "ALTER TABLE scan_history ADD COLUMN telegram_message_id INTEGER" as any
        );
        console.log("✅ [Migration] Added telegram_message_id column to scan_history");
    } catch (e: any) {
        // Check both the outer message and the underlying cause message
        const outerMsg: string = e?.message ?? "";
        const causeMsg: string = e?.cause?.message ?? "";
        const combined = outerMsg + " " + causeMsg;

        if (combined.includes("duplicate column") || combined.includes("already exists")) {
            console.log("✅ [Migration] telegram_message_id already exists, skipping.");
        } else {
            console.error("❌ [Migration Error]", e);
        }
    }
}
