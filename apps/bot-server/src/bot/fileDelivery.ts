import { Input, type Telegram } from "telegraf";
import { prisma } from "../lib/prisma.js";

/** Sends the category's file to the user, caching the returned telegram file_id for faster future sends. */
export async function deliverCategoryFile(telegram: Telegram, chatId: number, categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { file: true },
  });

  if (!category?.file) {
    return;
  }

  const file = category.file;

  if (file.telegramFileId) {
    await telegram.sendDocument(chatId, file.telegramFileId);
    return;
  }

  const message = await telegram.sendDocument(chatId, Input.fromLocalFile(file.storagePath, file.originalName));
  const sentFileId = message.document?.file_id;
  if (sentFileId) {
    await prisma.file.update({ where: { id: file.id }, data: { telegramFileId: sentFileId } });
  }
}
