import type { Telegraf } from "telegraf";
import { createBot } from "../bot/flow.js";
import { getBotToken } from "./settingsService.js";

let currentBot: Telegraf | null = null;

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
  bot.launch();
  const stop = () => bot.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log("[botManager] Telegram bot launched.");
}

export async function stopBot(): Promise<void> {
  if (currentBot) {
    currentBot.stop("token-rotated");
    currentBot = null;
  }
}
