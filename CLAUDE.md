# tel_bot — Agent Notes

## Architecture

- **2 replicas** under supervisor (`tel_bot_0` on port 4000, `tel_bot_1` on port 4001)
- nginx load-balances both via `upstream tel_bot_backend`
- **Webhook mode** (not polling) — required for multi-replica deployments

## Webhook / Multi-replica Rule

Telegram only allows **one** `setWebhook` call per token in quick succession (returns 429 if called multiple times at startup).

**Rule:** Only the primary replica (`INSTANCE_INDEX=0`) calls `setWebhook`. All replicas handle incoming webhook POST requests via nginx round-robin.

This is controlled by the `INSTANCE_INDEX` env var set in supervisor config:
```ini
environment=NODE_ENV="production",PORT="400%(process_num)s",INSTANCE_INDEX="%(process_num)s"
```

And in `apps/bot-server/src/lib/botManager.ts`:
```ts
const isPrimary = (process.env.INSTANCE_INDEX ?? "0") === "0";
if (isPrimary) {
  await bot.telegram.setWebhook(...);
} else {
  // skip — primary already registered the webhook
}
```

## DO NOT

- **Do not switch to polling** (`bot.launch()`) — with 2+ replicas it causes `409 Conflict`
- **Do not call `setWebhook` from all replicas** — causes `429 Too Many Requests` and process crash on startup
- **Do not remove `INSTANCE_INDEX`** from supervisor config

## Deployment

```bash
# build
npm --workspace=apps/bot-server run build

# restart
supervisorctl restart tel_bot:tel_bot_0 tel_bot:tel_bot_1

# status
supervisorctl status tel_bot:tel_bot_0 tel_bot:tel_bot_1
```

## Ports

| Service | Port |
|---------|------|
| tel_bot_0 | 4000 |
| tel_bot_1 | 4001 |
| nginx (bot.aizoome.ir) | 80/443 via Cloudflare |
| nginx (admin-bot.aizoome.ir) | 80/443 via Cloudflare |
