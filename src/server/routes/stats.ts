import { Hono } from "hono";
import { db } from "../../db";
import { user, scanHistory } from "../../db/schema";
import { count, eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const querySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

const app = new Hono().get("/", zValidator("query", querySchema), async (c) => {
    try {
        const jwtPayload = c.get("jwtPayload") as { role: string } | undefined;
        if (jwtPayload?.role !== "admin") {
            return c.json({ error: "Forbidden", success: false }, 403);
        }

        const { startDate, endDate } = c.req.valid("query");

        const dateFilters = [];
        if (startDate) {
            dateFilters.push(gte(scanHistory.timestamp, new Date(startDate)));
        }
        if (endDate) {
            // Ensure the end date covers the whole day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilters.push(lte(scanHistory.timestamp, end));
        }

        // Filters for scan status
        const pendingFilters = [eq(scanHistory.status, "pending"), ...dateFilters];
        const approvedFilters = [eq(scanHistory.status, "approved"), ...dateFilters];
        const rejectedFilters = [eq(scanHistory.status, "rejected"), ...dateFilters];

        const userDateFilters = [];
        if (startDate) {
            userDateFilters.push(gte(user.timestamp, new Date(startDate)));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            userDateFilters.push(lte(user.timestamp, end));
        }

        const totalUsers = await db
            .select({ count: count() })
            .from(user)
            .where(userDateFilters.length > 0 ? and(...userDateFilters) : undefined);

        const [pending, approved, rejected, activeCustomers, returningCustomersResult, topCustomers] = await Promise.all([
            db
                .select({ count: count() })
                .from(scanHistory)
                .where(and(...pendingFilters)),
            db
                .select({ count: count() })
                .from(scanHistory)
                .where(and(...approvedFilters)),
            db
                .select({ count: count() })
                .from(scanHistory)
                .where(and(...rejectedFilters)),
            db
                .select({ count: count(sql`DISTINCT ${scanHistory.user_id}`) })
                .from(scanHistory)
                .where(and(...approvedFilters)),
            db
                .select({ count: count(sql`DISTINCT ${scanHistory.user_id}`) })
                .from(scanHistory)
                .innerJoin(user, eq(scanHistory.user_id, user.id))
                .where(
                    and(
                        ...approvedFilters,
                        startDate ? lte(user.timestamp, new Date(startDate)) : undefined
                    )
                ),
            db
                .select({
                    id: user.id,
                    username: user.username,
                    stamps: count(scanHistory.id),
                })
                .from(scanHistory)
                .innerJoin(user, eq(scanHistory.user_id, user.id))
                .where(and(eq(scanHistory.status, "approved"), ...dateFilters))
                .groupBy(user.id, user.username)
                .orderBy(desc(count(scanHistory.id)))
                .limit(5)
        ]);

        const recentActivity = await db
            .select({
                id: scanHistory.id,
                status: scanHistory.status,
                timestamp: scanHistory.timestamp,
                username: user.username,
            })
            .from(scanHistory)
            .leftJoin(user, eq(scanHistory.user_id, user.id))
            .where(dateFilters.length > 0 ? and(...dateFilters) : undefined)
            .orderBy(desc(scanHistory.timestamp))
            .limit(50);

        const activeCount = Number(activeCustomers[0].count);
        const returningCount = startDate ? Number(returningCustomersResult[0].count) : 0;
        const newCount = startDate ? activeCount - returningCount : activeCount;

        return c.json({
            success: true,
            data: {
                totalUsers: totalUsers[0].count,
                activeCustomers: activeCount,
                newCustomers: newCount,
                returningCustomers: returningCount,
                isDateFiltered: !!startDate,
                stamps: {
                    pending: pending[0].count,
                    approved: approved[0].count,
                    rejected: rejected[0].count,
                    total: pending[0].count + approved[0].count + rejected[0].count,
                },
                recentActivity: recentActivity,
                topCustomers: topCustomers,
            },
        });
    } catch (error) {
        console.error("Stats fetch error:", error);
        return c.json({ error: "Failed to fetch stats", success: false }, 500);
    }
});

export default app;
