// sources.js — pulls recent items from every configured RSS/Atom feed.
// One bad feed should never kill the whole run, so each source is wrapped in its own try/catch.

import Parser from 'rss-parser'

const parser = new Parser({ timeout: 10000 })

/**
 * @param {Array<{name?:string,url:string}>} sources
 * @param {number} lookbackHours  only keep items newer than this
 * @param {number} maxItems       hard cap after sorting newest-first
 */
export async function fetchItems(sources, lookbackHours = 24, maxItems = 20) {
  const cutoff = Date.now() - lookbackHours * 3600 * 1000
  const collected = []

  // fetch all feeds in parallel — a slow feed shouldn't block the others
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const feed = await parser.parseURL(src.url)
      return { src, feed }
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn(`[digest] source failed: ${result.reason?.message || result.reason}`)
      continue
    }
    const { src, feed } = result.value
    for (const item of feed.items || []) {
      const ts = Date.parse(item.isoDate || item.pubDate || '') || Date.now()
      if (ts < cutoff) continue
      const title = (item.title || '').trim()
      if (!title || !item.link) continue
      collected.push({
        source: src.name || feed.title || 'feed',
        title,
        link: item.link,
        snippet: (item.contentSnippet || '').replace(/\s+/g, ' ').trim().slice(0, 280),
        ts,
      })
    }
  }

  // de-duplicate by link, newest first, then cap
  const seen = new Set()
  return collected
    .filter((i) => (seen.has(i.link) ? false : seen.add(i.link)))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxItems)
}
