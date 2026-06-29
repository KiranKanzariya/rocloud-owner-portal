/**
 * Auto-translate the owner-portal UI (A+C workflow).
 *
 *   node scripts/translate-i18n.mjs
 *
 * What it does:
 *  1. EXTRACT — scans src for English-as-key usages ( '...' | translate , .instant('...') )
 *     and merges any new strings into en.json (the English source catalog).
 *  2. TRANSLATE — for every other language file, fills ONLY the keys it is missing,
 *     by calling an OpenAI-compatible chat API. Existing (human-reviewed) translations
 *     are preserved. Brand names and {{placeholders}} are kept intact.
 *
 * Config (env):
 *   LLM_API_KEY    (required)   API key
 *   LLM_BASE_URL   default https://api.openai.com/v1
 *   LLM_MODEL      default gpt-4o-mini
 *   I18N_LANGS     default hi,gu,mr,ta,te,kn,pa,bn
 *
 * Works with OpenAI, Azure OpenAI, OpenRouter, Ollama (set LLM_BASE_URL=http://localhost:11434/v1), etc.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const I18N = 'src/assets/i18n';
const SRC = 'src/app';
const LANG_NAMES = {
  hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', ta: 'Tamil',
  te: 'Telugu', kn: 'Kannada', pa: 'Punjabi (Gurmukhi)', bn: 'Bengali',
};
// v1 active languages = hi, gu (English is the source). To expand later, override e.g.
// I18N_LANGS=hi,gu,mr,ta,te,kn,pa,bn node scripts/translate-i18n.mjs
const LANGS = (process.env.I18N_LANGS || 'hi,gu').split(',');
const API_KEY = process.env.LLM_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const BATCH = 40;

const readJson = (f) => JSON.parse(readFileSync(join(I18N, f), 'utf8'));
const writeJson = (f, o) => writeFileSync(
  join(I18N, f),
  JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n',
);

// ── 1. EXTRACT English-as-key strings from templates/TS ──────────────────────
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const unquote = (quote, inner) => (quote === '"' ? JSON.parse(`"${inner}"`) : inner);
function extractKeys() {
  const keys = new Set();
  const pipe = /(['"])((?:\\.|(?!\1).)*?)\1\s*\|\s*translate/g;
  // Only .instant() — .get()/.stream() are too generic (HttpParams, Map, queryParamMap…).
  const fn = /\.instant\(\s*(['"])((?:\\.|(?!\1).)*?)\1/g;
  for (const file of walk(SRC)) {
    if (!['.html', '.ts'].includes(extname(file))) continue;
    const text = readFileSync(file, 'utf8');
    for (const re of [pipe, fn]) {
      for (const m of text.matchAll(re)) keys.add(unquote(m[1], m[2]));
    }
  }
  return keys;
}

// ── 2. TRANSLATE missing keys via the LLM ────────────────────────────────────
async function translateBatch(strings, langName) {
  const sys =
    `You are a professional UI localizer. Translate the JSON values from English into ${langName} ` +
    `for a SaaS app used by water-delivery businesses in India. Rules: keep it natural and concise; ` +
    `do NOT translate brand/technical tokens (ROCloud, Google, AMC, RO, GST); keep every {{placeholder}} ` +
    `exactly as-is; keep emojis and punctuation. Return ONLY a JSON object mapping each source string to ` +
    `its translation, with the same keys.`;
  const user = JSON.stringify(Object.fromEntries(strings.map((s) => [s, s])));
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function main() {
  // refresh en.json with any newly-used strings (identity values)
  const en = readJson('en.json');
  let added = 0;
  for (const k of extractKeys()) if (!(k in en)) { en[k] = k; added++; }
  writeJson('en.json', en);
  console.log(`en.json: ${Object.keys(en).length} strings (${added} new from scan).`);

  if (!API_KEY) {
    console.log('LLM_API_KEY not set — extracted en.json only. Set it to fill translations.');
    return;
  }

  const sources = Object.keys(en);
  for (const lang of LANGS) {
    let target = {};
    try { target = readJson(`${lang}.json`); } catch { /* new language */ }
    const missing = sources.filter((s) => !(s in target));
    if (missing.length === 0) { console.log(`${lang}: up to date.`); continue; }
    console.log(`${lang}: translating ${missing.length} string(s) → ${LANG_NAMES[lang]}…`);
    for (let i = 0; i < missing.length; i += BATCH) {
      const slice = missing.slice(i, i + BATCH);
      const out = await translateBatch(slice, LANG_NAMES[lang]);
      for (const s of slice) target[s] = out[s] ?? s;
    }
    writeJson(`${lang}.json`, target);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
