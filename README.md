# tel_bot

ربات تلگرام معرفی حوزه‌های فعالیت + پنل ادمین. اسپک کامل در [SPEC.md](./SPEC.md).

## ساختار

```
apps/
├── bot-server/     # Fastify API + Telegraf bot (Node.js, TypeScript, Prisma/PostgreSQL)
└── admin-panel/    # Vue 3 + Vuetify (ریسپانسیو/موبایل‌فرندلی)
```

## پیش‌نیازها

- Node.js 20+
- PostgreSQL در دسترس

## راه‌اندازی

```bash
npm install

# بک‌اند
cp apps/bot-server/.env.example apps/bot-server/.env
# مقادیر DATABASE_URL, JWT_SECRET, TOKEN_ENCRYPTION_KEY را در .env تنظیم کنید

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # یک ادمین پیش‌فرض می‌سازد (ADMIN_DEFAULT_USERNAME/PASSWORD در .env)

npm run dev:server    # http://localhost:3000

# پنل ادمین (در ترمینال دیگر)
cp apps/admin-panel/.env.example apps/admin-panel/.env
npm run dev:admin     # http://localhost:5173
```

با یوزر/پسورد seed‌شده وارد پنل ادمین شوید و از صفحه‌ی «تنظیمات ربات»، توکن ربات تلگرام (از BotFather) را وارد کنید — ربات بدون نیاز به ری‌استارت سرور، با توکن جدید راه‌اندازی می‌شود.

## نکات امنیتی

- توکن ربات و رمز ادمین هرگز در کد یا `.env` نمونه قرار نمی‌گیرند؛ توکن به‌صورت رمزنگاری‌شده (`AES-256-GCM`) در دیتابیس ذخیره می‌شود.
- بعد از اولین ورود، رمز ادمین seed‌شده را تغییر دهید (فعلاً از طریق دیتابیس یا با افزودن endpoint تغییر رمز در فاز بعد).

## اجرا روی Production با Docker

پیش‌نیاز: Docker + Docker Compose. کل استک (Postgres + بک‌اند + پنل ادمین) با یک دستور بالا می‌آید.

```bash
cp .env.example .env
# مقادیر POSTGRES_PASSWORD, JWT_SECRET, TOKEN_ENCRYPTION_KEY, ADMIN_DEFAULT_PASSWORD را
# با مقادیر واقعی و امن جایگزین کنید (برای secret‌ها: openssl rand -base64 48)

docker compose build
docker compose up -d
```

- پنل ادمین: `http://<server-ip>:8080` (پورت با `ADMIN_PANEL_PORT` در `.env` قابل تغییر است)
- بک‌اند هیچ پورتی روی هاست باز نمی‌کند؛ پنل ادمین (nginx) درخواست‌های `/api/*` را داخل شبکه‌ی داکر به سرویس `bot-server` پروکسی می‌کند — نیازی به تنظیم CORS یا آدرس API جداگانه نیست.
- سرویس `bot-server` هنگام استارت به‌صورت خودکار migration های Prisma را اجرا می‌کند (`prisma migrate deploy`) و ادمین پیش‌فرض را seed می‌کند (idempotent — اگر از قبل وجود داشته باشد، رد می‌شود).
- فایل‌های آپلودی هر حوزه در volume نام‌دار `bot_uploads` نگه‌داری می‌شوند تا با ری‌استارت/آپدیت کانتینر از بین نروند.
- برای دیدن لاگ‌ها: `docker compose logs -f bot-server`
- برای متوقف کردن: `docker compose down` (دیتا و آپلودها با `down` پاک نمی‌شوند؛ فقط با `docker compose down -v` volume‌ها هم حذف می‌شوند — با احتیاط استفاده شود).
- برای آپدیت بعد از تغییر کد: `docker compose up -d --build`

بعد از بالا آمدن، وارد پنل ادمین شوید و طبق [بخش ۴.۴ اسپک](./SPEC.md#۴۴-تنظیمات-ربات-bot-settings) توکن ربات را از صفحه‌ی تنظیمات وارد کنید.
