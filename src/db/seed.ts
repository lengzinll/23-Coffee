import { db } from './index';
import { user, scanHistory } from './schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

const password = 'admin123456';

async function main() {
    console.log('Seeding database...');
    const existingAdmin = await db.select().from(user).where(eq(user.username, 'admin'));
    if (existingAdmin.length === 0) {
        const argonHash = await argon2.hash(password);
        await db.insert(user).values({
            username: 'admin',
            password: argonHash,
            role: 'admin',
        });
        console.log('Created default admin user.');
    }

    const testUsername = 'testuser';
    const existingUser = await db.select().from(user).where(eq(user.username, testUsername));

    if (existingUser.length === 0) {
        const argonHash = await argon2.hash(password);
        const [newUser] = await db.insert(user).values({
            username: testUsername,
            password: argonHash,
            role: 'user',
        }).returning();

        console.log(`Created test user: ${testUsername}`);

        // Add 13 scans for this user (2 full cycles + 1 pending)
        console.log(`Inserting 13 test scans for ${testUsername}...`);
        const statuses = ['approved', 'approved', 'approved', 'approved', 'approved', 'approved', // Cycle 1
            'approved', 'approved', 'approved', 'approved', 'approved', 'approved', // Cycle 2
            'pending']; // Cycle 3 starts

        await db.insert(scanHistory).values(
            statuses.map(status => ({
                user_id: newUser.id,
                status: status as 'approved' | 'pending' | 'rejected'
            }))
        );
        console.log('Inserted 13 test scans.');
    } else {
        console.log('Test user already exists.');
    }

    console.log('Seeding complete.');
}

main().catch((e) => {
    console.error('Seed failed');
    console.error(e);
    process.exit(1);
});
