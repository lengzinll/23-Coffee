import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { scanHistory } from "@/db/schema";

export const scanHistorySchema = createInsertSchema(scanHistory);
export type ScanHistorySchema = z.infer<typeof scanHistorySchema>;

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number"),
});
