import { Markup, Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "../lib/prisma.js";
import { getIsActive } from "../lib/settingsService.js";
import { isValidIranMobile, normalizeIranMobile } from "../lib/mobile.js";
import { buildCategoryKeyboard, getActiveCategories } from "./categories.js";
import { deliverCategoryFile } from "./fileDelivery.js";
import { clearSession, getSession, setSession, type SessionData } from "./session.js";

const SHARE_CONTACT_LABEL = "بله، همین شماره";
const DECLINE_CONTACT_LABEL = "خیر، شماره دیگری وارد می‌کنم";

export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const active = await getIsActive();
    if (!active) {
      await ctx.reply("در حال حاضر ربات غیرفعال است.");
      return;
    }

    const telegramUserId = BigInt(ctx.from.id);
    const existingUser = await prisma.user.findUnique({ where: { telegramUserId } });
    await clearSession(telegramUserId);

    const categories = await getActiveCategories();
    if (categories.length === 0) {
      await ctx.reply("در حال حاضر هیچ حوزه فعالیتی تعریف نشده است.");
      return;
    }

    await setSession(telegramUserId, "AWAITING_CATEGORY", { isExistingUser: Boolean(existingUser) });
    await ctx.reply("لطفاً حوزه فعالیت خود را انتخاب کنید:", buildCategoryKeyboard(categories));
  });

  bot.action(/^cat:(.+)$/, async (ctx) => {
    const telegramUserId = BigInt(ctx.from.id);
    const session = await getSession(telegramUserId);
    if (!session || session.step !== "AWAITING_CATEGORY") {
      await ctx.answerCbQuery();
      return;
    }

    const categoryId = ctx.match[1];
    const category = await prisma.category.findFirst({ where: { id: categoryId, isActive: true } });
    if (!category) {
      await ctx.answerCbQuery("این حوزه دیگر در دسترس نیست.");
      return;
    }

    const data = session.data as SessionData;
    data.categoryId = category.id;
    await setSession(telegramUserId, "AWAITING_FIRST_NAME", data);
    await ctx.answerCbQuery();
    await ctx.reply(`حوزه «${category.title}» انتخاب شد.\nلطفاً نام خود را وارد کنید:`);
  });

  bot.on(message("contact"), async (ctx) => {
    const telegramUserId = BigInt(ctx.from.id);
    const session = await getSession(telegramUserId);
    if (!session || session.step !== "AWAITING_MOBILE_APPROVAL") {
      return;
    }

    const contact = ctx.message.contact;
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply("لطفاً از دکمه‌ها استفاده کنید.", Markup.removeKeyboard());
      return;
    }

    const mobile = normalizeIranMobile(contact.phone_number);
    if (!isValidIranMobile(mobile)) {
      await ctx.reply(
        "شماره موبایل تلگرام شما معتبر (ایرانی) نیست. لطفاً شماره را به‌صورت دستی وارد کنید:",
        Markup.removeKeyboard(),
      );
      const data = session.data as SessionData;
      await setSession(telegramUserId, "AWAITING_MOBILE", data);
      return;
    }

    await finalizeRegistration(ctx, telegramUserId, mobile, "telegram_contact");
  });

  bot.hears(DECLINE_CONTACT_LABEL, async (ctx) => {
    const telegramUserId = BigInt(ctx.from.id);
    const session = await getSession(telegramUserId);
    if (!session || session.step !== "AWAITING_MOBILE_APPROVAL") {
      return;
    }
    const data = session.data as SessionData;
    await setSession(telegramUserId, "AWAITING_MOBILE", data);
    await ctx.reply("لطفاً شماره موبایل خود را وارد کنید (مثال: 09123456789):", Markup.removeKeyboard());
  });

  bot.on(message("text"), async (ctx) => {
    const telegramUserId = BigInt(ctx.from.id);
    const session = await getSession(telegramUserId);
    if (!session) return;

    const data = session.data as SessionData;
    const text = ctx.message.text.trim();

    switch (session.step) {
      case "AWAITING_FIRST_NAME": {
        if (!text) {
          await ctx.reply("نام نمی‌تواند خالی باشد. لطفاً دوباره وارد کنید:");
          return;
        }
        data.firstName = text;
        await setSession(telegramUserId, "AWAITING_LAST_NAME", data);
        await ctx.reply("لطفاً نام خانوادگی خود را وارد کنید:");
        return;
      }

      case "AWAITING_LAST_NAME": {
        if (!text) {
          await ctx.reply("نام خانوادگی نمی‌تواند خالی باشد. لطفاً دوباره وارد کنید:");
          return;
        }
        data.lastName = text;

        if (data.isExistingUser) {
          await setSession(telegramUserId, "AWAITING_MOBILE_APPROVAL", data);
          await ctx.reply(
            "آیا مایلید همان شماره موبایلی که با آن در تلگرام عضو هستید ثبت شود؟",
            Markup.keyboard([
              [Markup.button.contactRequest(SHARE_CONTACT_LABEL)],
              [DECLINE_CONTACT_LABEL],
            ])
              .resize()
              .oneTime(),
          );
          return;
        }

        await setSession(telegramUserId, "AWAITING_MOBILE", data);
        await ctx.reply("لطفاً شماره موبایل خود را وارد کنید (مثال: 09123456789):");
        return;
      }

      case "AWAITING_MOBILE": {
        if (!isValidIranMobile(text)) {
          await ctx.reply("شماره موبایل معتبر نیست. لطفاً یک شماره موبایل ایرانی معتبر وارد کنید (مثال: 09123456789):");
          return;
        }
        await finalizeRegistration(ctx, telegramUserId, normalizeIranMobile(text), "manual");
        return;
      }

      default:
        return;
    }
  });

  return bot;
}

async function finalizeRegistration(
  ctx: Context,
  telegramUserId: bigint,
  mobile: string,
  mobileSource: "manual" | "telegram_contact",
) {
  const session = await getSession(telegramUserId);
  if (!session) return;
  const data = session.data as SessionData;

  if (!data.categoryId || !data.firstName || !data.lastName) {
    await ctx.reply("خطایی رخ داد. لطفاً دوباره با /start شروع کنید.", Markup.removeKeyboard());
    await clearSession(telegramUserId);
    return;
  }

  const username = ctx.from?.username ?? null;

  await prisma.user.upsert({
    where: { telegramUserId },
    update: {
      telegramUsername: username,
      firstName: data.firstName,
      lastName: data.lastName,
      mobile,
      mobileSource,
      categoryId: data.categoryId,
    },
    create: {
      telegramUserId,
      telegramUsername: username,
      firstName: data.firstName,
      lastName: data.lastName,
      mobile,
      mobileSource,
      categoryId: data.categoryId,
    },
  });

  await clearSession(telegramUserId);
  await ctx.reply("اطلاعات شما با موفقیت ثبت شد. در حال ارسال فایل...", Markup.removeKeyboard());
  if (ctx.chat) {
    await deliverCategoryFile(ctx.telegram, ctx.chat.id, data.categoryId);
  }
}
