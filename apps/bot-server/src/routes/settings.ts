import type { FastifyInstance } from "fastify";
import { maskToken } from "../lib/crypto.js";
import { getBotToken, getIsActive, setBotToken, setIsActive } from "../lib/settingsService.js";
import { restartBotWithToken, verifyBotToken } from "../lib/botManager.js";

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/api/settings", async () => {
    const [isActive, token] = await Promise.all([getIsActive(), getBotToken()]);
    return {
      isActive,
      botTokenMasked: token ? maskToken(token) : null,
      botTokenConfigured: Boolean(token),
    };
  });

  app.patch<{ Body: { isActive: boolean } }>("/api/settings", async (req, reply) => {
    const { isActive } = req.body ?? {};
    if (typeof isActive !== "boolean") {
      return reply.code(400).send({ error: "isActive must be a boolean" });
    }
    await setIsActive(isActive);
    return { isActive };
  });

  app.patch<{ Body: { botToken: string } }>("/api/settings/bot-token", async (req, reply) => {
    const { botToken } = req.body ?? {};
    if (!botToken?.trim()) {
      return reply.code(400).send({ error: "botToken is required" });
    }

    const verification = await verifyBotToken(botToken.trim());
    if (!verification.ok) {
      return reply.code(400).send({ error: "توکن نامعتبر است یا با تلگرام تایید نشد." });
    }

    await setBotToken(botToken.trim());
    await restartBotWithToken(botToken.trim());

    return {
      botTokenMasked: maskToken(botToken.trim()),
      botUsername: verification.username,
    };
  });
}
