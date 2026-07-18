import { prisma } from "../lib/prisma.js";

export type BotStep =
  | "AWAITING_CATEGORY"
  | "AWAITING_FIRST_NAME"
  | "AWAITING_LAST_NAME"
  | "AWAITING_MOBILE_APPROVAL"
  | "AWAITING_MOBILE";

export interface SessionData {
  isExistingUser?: boolean;
  categoryId?: string;
  firstName?: string;
  lastName?: string;
}

export async function getSession(telegramUserId: bigint) {
  return prisma.botSession.findUnique({ where: { telegramUserId } });
}

export async function setSession(telegramUserId: bigint, step: BotStep, data: SessionData) {
  await prisma.botSession.upsert({
    where: { telegramUserId },
    update: { step, data: data as object },
    create: { telegramUserId, step, data: data as object },
  });
}

export async function clearSession(telegramUserId: bigint) {
  await prisma.botSession.deleteMany({ where: { telegramUserId } });
}
