import { env } from "@/env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: env.NODE_ENV === "production" ? "turso" : "sqlite",
  dbCredentials:
    env.NODE_ENV === "production"
      ?
      {
        url: env.DATABASE_URL!,
        authToken: env.DATABASE_AUTH_TOKEN!,
      }
      :
      {
        url: "sqlite.db",
      },
});
