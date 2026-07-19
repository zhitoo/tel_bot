import type { Telegraf } from "telegraf";
import { createBot } from "../bot/flow.js";
import { getBotToken } from "./settingsService.js";

let currentBot: Telegraf | null = null;

// Multi-replica note: polling (bot.launch()) only allows ONE consumer of getUpdates
// per token — with 2+ replicas they'd fight and throw 409 Conflict. Webhook mode lets
// every replica just handle whatever nginx routes to it, no leader election needed.
export const WEBHOOK_PATH = "/telegram/webhook";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const PUBLIC_URL = process.env.PUBLIC_URL ?? "";

export async function verifyBotToken(token: string): Promise<{ ok: true; username: string } | { ok: false }> {
  try {
    const { createBot: build } = await import("../bot/flow.js");
    const probe = build(token);
    const me = await probe.telegram.getMe();
    return { ok: true, username: me.username };
  } catch {
    return { ok: false };
  }
}

export async function startBot(): Promise<void> {
  const token = await getBotToken();
  if (!token) {
    console.warn("[botManager] No bot token configured yet — bot not started. Set it from the admin panel.");
    return;
  }
  await launchBot(token);
}

export async function restartBotWithToken(token: string): Promise<void> {
  await stopBot();
  await launchBot(token);
}

async function launchBot(token: string): Promise<void> {
  const bot = createBot(token);
  currentBot = bot;

  if (PUBLIC_URL) {
    await bot.telegram.setWebhook(`${PUBLIC_URL}${WEBHOOK_PATH}`, {
      secret_token: WEBHOOK_SECRET || undefined,
    });
    console.log(`[botManager] Telegram webhook set to ${PUBLIC_URL}${WEBHOOK_PATH}`);
  } else {
    // ponytail: polling fallback for local dev without a public URL — single instance only.
    bot.launch();
    const stop = () => bot.stop();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    console.log("[botManager] Telegram bot launched via polling (no PUBLIC_URL set).");
  }
}

export async function stopBot(): Promise<void> {
  if (currentBot) {
    if (!PUBLIC_URL) {
      currentBot.stop("token-rotated");
    }
    currentBot = null;
  }
}

/** Feeds a raw Telegram update into the currently active bot instance. Used by the webhook route. */
export async function handleWebhookUpdate(update: unknown, secretHeader: string | undefined): Promise<"ok" | "forbidden" | "no-bot"> {
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return "forbidden";
  }
  if (!currentBot) {
    return "no-bot";
  }
  await currentBot.handleUpdate(update as never);
  return "ok";
}
