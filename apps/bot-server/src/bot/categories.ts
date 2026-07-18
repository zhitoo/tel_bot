import { Markup } from "telegraf";
import { prisma } from "../lib/prisma.js";

export async function getActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function buildCategoryKeyboard(categories: { id: string; title: string }[]) {
  const buttons = categories.map((c) => Markup.button.callback(c.title, `cat:${c.id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return Markup.inlineKeyboard(rows);
}
