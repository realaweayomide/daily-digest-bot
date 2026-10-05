// daily-digest-bot — pull your sources on a schedule, summarize with an LLM, post the digest.
//
//   npm run dry     → run once, print to console, send nothing  (start here)
//   npm run once    → run once and actually deliver
//   npm start       → stay running on the cron schedule

import cron from 'node-cron'
import { readFileSync, existsSync } from 'node:fs'
import { fetchItems } from './sources.js'
import { summarize } from './summarize.js'
import { deliver } from './deliver.js'

const args = process.argv.slice(2)
const RUN_ONCE = args.includes('--once')
const DRY = args.includes('--dry')

function loadConfig() {
  const path = existsSync('config.json') ? 'config.json' : 'config.example.json'
  if (!existsSync(path)) {
    console.error('[digest] no config found — copy config.example.json to config.json')
    process.exit(1)
  }
  console.log(`[digest] config: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function run() {
  const started = Date.now()
  const cfg = loadConfig()

  console.log(`[digest] gathering from ${cfg.sources.length} source(s)…`)
  const items = await fetchItems(cfg.sources, cfg.lookbackHours ?? 24, cfg.maxItems ?? 20)

  if (!items.length) {
    console.log('[digest] nothing new in the lookback window — skipping.')
    return
  }

  console.log(`[digest] ${items.length} item(s) → summarizing…`)
  const digest = await summarize(items, cfg)
  await deliver(digest, { dry: DRY })

  console.log(`[digest] done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

if (RUN_ONCE) {
  run().catch((err) => {
    console.error('[digest] run failed:', err)
    process.exit(1)
  })
} else {
  const schedule = process.env.CRON_SCHEDULE || '0 8 * * *'
  const timezone = process.env.TIMEZONE || 'Africa/Lagos'

  if (!cron.validate(schedule)) {
    console.error(`[digest] invalid CRON_SCHEDULE: "${schedule}"`)
    process.exit(1)
  }

  cron.schedule(schedule, () => run().catch((e) => console.error('[digest] run failed:', e)), { timezone })
  console.log(`[digest] scheduled "${schedule}" (${timezone}) — waiting.`)
  console.log('[digest] tip: `npm run dry` fires once and prints without sending.')
}
