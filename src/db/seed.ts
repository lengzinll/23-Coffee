import { db } from './index';
import { user } from './schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

const password = 'admin123456';

async function main() {
    console.log('Seeding database...');
    const existingAdmin = await db.select().from(user).where(eq(user.username, 'admin'));
    if (existingAdmin.length === 0) {
        // Note: In a real production app, password should be hashed.
        // For this simple seed script requested in guild.md, we use plain text 'admin'
        const argonHash = await argon2.hash(password);
        await db.insert(user).values({
            username: 'admin',
            password: argonHash, // As per guild.md requirement
            role: 'admin',
        });
        console.log('Created default admin user.');
    } else {
        console.log('Admin user already exists.');
    }

    console.log('Seeding complete.');
}

main().catch((e) => {
    console.error('Seed failed');
    console.error(e);
    process.exit(1);
});
