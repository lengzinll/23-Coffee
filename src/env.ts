import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    JWT_SECRET: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string(),
  },
  client: {
    // PUBLIC_VAR: z.string().min(1),
  },
  // If you're using Next.js < 13.4.4, you'll need to use runtimeEnv instead of experimental__runtimeEnv
  runtimeEnv: {
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
