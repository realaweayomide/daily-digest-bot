# Daily Digest Bot

Pulls your sources on a schedule, has an LLM summarize them, and posts the digest to Discord or Slack.
The "stop opening 20 tabs every morning" bot.

Built by [Ayomide Awe](https://github.com/realaweayomide)

## Try it in 30 seconds

```bash
npm install
npm run dry
```

That's it. No API key, no config, no webhook needed — it pulls real feeds and prints a digest
to your console. Add a key and a webhook when you want the good version.

## What it does

```
  ┌──────────┐     ┌───────────┐     ┌───────────┐     ┌──────────────┐
  │   cron   │ ──▶ │  sources  │ ──▶ │ summarize │ ──▶ │   deliver    │
  │ 8am daily│     │ RSS/Atom  │     │    LLM    │     │Discord/Slack │
  └──────────┘     └───────────┘     └───────────┘     └──────────────┘
```

1. **Schedule** — `node-cron`, timezone-aware (so "8am" means *your* 8am).
2. **Gather** — fetches every feed in parallel, keeps items from the last N hours, de-dupes by link, sorts newest-first.
3. **Summarize** — sends them to an LLM with a strict prompt: group related stories, 3–6 bullets, keep the links, invent nothing.
4. **Deliver** — posts to a Discord and/or Slack webhook (or prints to console).

## Designed to degrade gracefully

This is the part I care about most. Every optional piece has a fallback:

| If this is missing | What happens |
|---|---|
| No `LLM_API_KEY` | Still works — sends a clean headline list instead of a summary |
| LLM call fails | Catches it, falls back to headlines, keeps going |
| One feed is down | That source is skipped with a warning; the rest still run |
| No webhook set | Prints the digest to the console |

A bot that silently dies at 8am is worse than no bot. This one always produces *something*.

## Configure

**Sources** — copy `config.example.json` → `config.json` and put your own feeds in:

```json
{
  "title": "Morning AI Digest",
  "lookbackHours": 24,
  "maxItems": 15,
  "instructions": "Lead with anything about AI agents or automation.",
  "sources": [
    { "name": "Hacker News", "url": "https://hnrss.org/frontpage" }
  ]
}
```

`instructions` is passed straight to the LLM — it's how you steer the editorial voice.

**Keys & delivery** — copy `.env.example` → `.env`:
- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` — any OpenAI-compatible provider (OpenAI, xAI/Grok, …)
- `DISCORD_WEBHOOK_URL` and/or `SLACK_WEBHOOK_URL`
- `CRON_SCHEDULE` (default `0 8 * * *`) and `TIMEZONE`

> Getting a Discord webhook: Server Settings → Integrations → Webhooks → New Webhook → Copy URL.

## Commands

| Command | What it does |
|---|---|
| `npm run dry` | Run once, print to console, send nothing. **Start here.** |
| `npm run once` | Run once and actually deliver |
| `npm start` | Stay running, fire on the cron schedule |

## Deploy

Any Node host. Free options:
- **Render** → Background Worker → Build `npm install`, Start `npm start` → add env vars in the dashboard.
- **Railway / Fly.io** → same shape.
- **A VPS** → `pm2 start src/index.js --name digest-bot`.

For a serverless setup, use a platform cron (e.g. Render Cron Job / GitHub Actions schedule) calling `npm run once` instead of keeping a process alive.

## Project structure

```
daily-digest-bot/
├── src/
│   ├── index.js       # schedule + orchestration
│   ├── sources.js     # fetch, filter, de-dupe feeds
│   ├── summarize.js   # LLM call + graceful fallback
│   └── deliver.js     # Discord / Slack / console
├── config.example.json
├── .env.example
└── package.json
```

## License

MIT
