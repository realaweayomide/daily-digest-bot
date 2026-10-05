// summarize.js — turns the raw item list into a readable digest using an LLM.
//
// Degrades gracefully: with no API key (or if the call fails) it still produces a
// clean headline list, so the bot is useful out of the box with zero configuration.

const API_KEY = process.env.LLM_API_KEY
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

export async function summarize(items, cfg = {}) {
  const header = `**${cfg.title || 'Daily Digest'}** · ${today()}`

  if (!API_KEY) {
    console.warn('[digest] no LLM_API_KEY set — using a plain headline list.')
    return `${header}\n\n${plainList(items)}`
  }

  const list = items
    .map((i, n) => `${n + 1}. [${i.source}] ${i.title}\n   ${i.link}\n   ${i.snippet}`)
    .join('\n\n')

  const system = `You write a short daily digest for a busy reader.
Rules:
- Group related stories under a bold one-line theme.
- 3-6 bullets total. One sentence each. No fluff, no preamble.
- Keep the source link on each bullet, as a markdown link on a few key words.
- If something genuinely matters more than the rest, put it first.
- Output markdown only. Never invent anything not in the list.`

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `${cfg.instructions ? cfg.instructions + '\n\n' : ''}Here are today's items:\n\n${list}`,
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`LLM returned ${res.status}`)
    const data = await res.json()
    const body = data.choices?.[0]?.message?.content?.trim()
    if (!body) throw new Error('empty response')
    return `${header}\n\n${body}`
  } catch (err) {
    console.warn(`[digest] summarization failed (${err.message}) — using headlines instead.`)
    return `${header}\n\n${plainList(items)}`
  }
}

function plainList(items) {
  return items.map((i) => `• [${i.title}](${i.link}) — _${i.source}_`).join('\n')
}

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
