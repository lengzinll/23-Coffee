import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "../env";
import * as schema from "./schema";

const client =
  env.NODE_ENV === "production" && env.DATABASE_URL
    ?
    createClient({
      url: env.DATABASE_URL!,
      authToken: env.DATABASE_AUTH_TOKEN,
    })
    :
    createClient({ url: "file:sqlite.db" });
export const db = drizzle(client, { schema });
