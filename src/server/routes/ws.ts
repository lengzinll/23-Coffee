import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import type { WSContext } from "hono/ws";
import { WebSocketMessage } from "../../lib/types";

const wsApp = new Hono();
const { upgradeWebSocket } = createNodeWebSocket({ app: wsApp });

const clients = new Set<WSContext>();

// Helper to broadcast to all connected clients - Type Safe
export const broadcast = (payload: WebSocketMessage) => {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    try {
      client.send(message);
    } catch (err) {
      console.error("Broadcast failed for a client:", err);
      clients.delete(client);
    }
  }
};

wsApp.get(
  "/",
  upgradeWebSocket(() => ({
    onOpen(_evt, ws) {
      clients.add(ws);
      console.log("client connected");
    },

    onMessage(event, ws) {
      console.log(`Message from client: ${event.data}`);
      // Simple echo/relay if needed, but we mostly use the 'broadcast' helper
    },

    onClose(_evt, ws) {
      clients.delete(ws);
      console.log("client disconnected");
    },
  })),
);

export default wsApp;
