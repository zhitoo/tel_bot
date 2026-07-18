import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret } from "./crypto.js";

const IS_ACTIVE_KEY = "is_active";
const BOT_TOKEN_KEY = "bot_token";

export async function getIsActive(): Promise<boolean> {
  const row = await prisma.botSetting.findUnique({ where: { key: IS_ACTIVE_KEY } });
  return row ? row.value === "true" : true;
}

export async function setIsActive(value: boolean): Promise<void> {
  await prisma.botSetting.upsert({
    where: { key: IS_ACTIVE_KEY },
    update: { value: String(value) },
    create: { key: IS_ACTIVE_KEY, value: String(value) },
  });
}

export async function getBotToken(): Promise<string | null> {
  const row = await prisma.botSetting.findUnique({ where: { key: BOT_TOKEN_KEY } });
  if (!row) return null;
  return decryptSecret(row.value);
}

export async function setBotToken(token: string): Promise<void> {
  const encrypted = encryptSecret(token);
  await prisma.botSetting.upsert({
    where: { key: BOT_TOKEN_KEY },
    update: { value: encrypted },
    create: { key: BOT_TOKEN_KEY, value: encrypted },
  });
}
