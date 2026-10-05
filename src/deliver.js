// deliver.js — sends the finished digest wherever you want it.
// Configure a webhook via .env; with none set it just prints to the console,
// which makes the bot runnable with zero setup.

const DISCORD = process.env.DISCORD_WEBHOOK_URL
const SLACK = process.env.SLACK_WEBHOOK_URL

const DISCORD_LIMIT = 1900 // real limit is 2000; leave headroom
const SLACK_LIMIT = 3000

export async function deliver(text, { dry = false } = {}) {
  if (dry) {
    console.log(`\n────────── DRY RUN ──────────\n${text}\n─────────────────────────────\n`)
    return
  }

  if (!DISCORD && !SLACK) {
    console.log(`\n[digest] no webhook configured — printing instead:\n\n${text}\n`)
    return
  }

  if (DISCORD) await post(DISCORD, { content: truncate(text, DISCORD_LIMIT) }, 'Discord')
  if (SLACK) await post(SLACK, { text: truncate(text, SLACK_LIMIT) }, 'Slack')
}

async function post(url, body, label) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[digest] ${label} post failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
    } else {
      console.log(`[digest] posted to ${label}.`)
    }
  } catch (err) {
    console.error(`[digest] ${label} error: ${err.message}`)
  }
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}
