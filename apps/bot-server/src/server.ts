import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import usersRoutes from "./routes/users.js";
import settingsRoutes from "./routes/settings.js";
import { handleWebhookUpdate, startBot, WEBHOOK_PATH } from "./lib/botManager.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.ADMIN_PANEL_ORIGIN ?? true });
await app.register(multipart);
await app.register(authPlugin);

await app.register(authRoutes);
await app.register(categoriesRoutes);
await app.register(usersRoutes);
await app.register(settingsRoutes);

app.get("/api/health", async () => ({ ok: true }));

app.post(WEBHOOK_PATH, async (req, reply) => {
  const result = await handleWebhookUpdate(req.body, req.headers["x-telegram-bot-api-secret-token"] as string | undefined);
  if (result === "forbidden") return reply.code(403).send();
  return reply.code(200).send();
});

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: "0.0.0.0" });
  await startBot();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
