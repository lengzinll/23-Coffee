import { hc } from "hono/client";
import { AppType } from "../server/index";

const client = hc<AppType>("/");
export const rpc = client.api;
