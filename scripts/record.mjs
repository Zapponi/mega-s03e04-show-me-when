// Records the board in use (BRIEF A8, plan § 7) with a per-event timestamp log (mm:ss from video start).
//
//   node scripts/record.mjs --fake            rehearsal: local fake API, a new incident every 10 s, no real ack
//   node scripts/record.mjs --real            the evidence: the deployed board (verify.config.json boardUrl),
//                                             the real course API, ONE real ack (BRIEF "Outside actions" row 4)
//
// Flows shown: open-board (loader → rows), watch-board (a new incident lands on top, no reload),
// ack-incident (pointer on the Ack of row 3; a new incident lands and shifts the rows; the click at the
// same spot acks the incident that moved under the pointer). Output in recordings/<stamp>/ (git-ignored):
// board.webm, log.json (events, ack id + receipt, sha). Receipts are printed masked.
// The pointer dot and the caption strip are drawn by this recorder, not by the board.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, renameSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const REAL = args.includes('--real');
const FAKE = args.includes('--fake');
if (REAL === FAKE) throw new Error('record: pass exactly one of --fake (rehearsal) or --real (evidence)');
const LOCALE = 'en-NZ';
const TZ = 'Pacific/Auckland';
const root = new URL('..', import.meta.url);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = fileURLToPath(new URL(`recordings/${REAL ? 'real' : 'fake'}-${stamp}/`, root));
mkdirSync(out, { recursive: true });
const mask = (s) => (s && s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);

let url;
let fake;
let adder;
if (FAKE) {
  const { startFake } = await import('../test/fake-api.mjs');
  const now = Date.now();
  const seed = Array.from({ length: 8 }, (_, k) => ({
    id: `INC-${1000 + k}`, service: 'reminders', region: 'us-east', summary: `seeded ${k}`, severity: `sev${(k % 3) + 1}`,
    openedAt: new Date(now - (k + 1) * 7 * 60_000).toISOString(),
  }));
  fake = await startFake({ incidents: seed });
  let n = 0;
  adder = setInterval(() => {
    n += 1;
    fake.add({ id: `INC-${2000 + n}`, service: 'search', region: 'eu', summary: `arrived ${n}`, severity: 'sev2', openedAt: new Date().toISOString() });
  }, 10_000);
  url = fake.url;
} else {
  url = JSON.parse(readFileSync(new URL('verify.config.json', root), 'utf8')).boardUrl;
}

const events = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  locale: LOCALE, timezoneId: TZ, viewport: { width: 1100, height: 720 },
  recordVideo: { dir: out, size: { width: 1100, height: 720 } },
});
await context.addInitScript(() => {
  // Recorder-only overlay: a pointer dot (videos show no cursor) and a caption strip.
  window.addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.id = 'rec-pointer';
    dot.style.cssText = 'position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(220,0,90,.55);border:2px solid #c00050;pointer-events:none;z-index:99999;left:-50px;top:-50px';
    const cap = document.createElement('div');
    cap.id = 'rec-caption';
    cap.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:8px 16px;background:#111;color:#fff;font:14px system-ui;pointer-events:none;z-index:99998';
    cap.textContent = 'recording · caption and pink pointer drawn by the recorder';
    document.body.append(dot, cap);
    window.addEventListener('mousemove', (e) => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`; }, true);
  });
});
const t0 = Date.now(); // the video starts with the page, created right below
const page = await context.newPage();
const ackLogs = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('ack ')) ackLogs.push({ ms: Date.now() - t0, text: t });
});
const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const log = (flow, what, extra = {}) => {
  const ms = Date.now() - t0;
  events.push({ at: mmss(ms), ms, flow, what, ...extra });
  console.log(`${mmss(ms)}  ${flow.padEnd(12)} ${what}`);
};
const caption = (text) => page.evaluate((t) => { const c = document.getElementById('rec-caption'); if (c) c.textContent = t; }, text);
const rowIds = () => page.$$eval('[data-testid="incident-row"]', (els) => els.map((e) => e.dataset.id));
const waitNewTop = async (prevTop, timeout = 40_000) => {
  await page.waitForFunction((p) => document.querySelector('[data-testid="incident-row"]')?.dataset.id !== p, prevTop, { timeout, polling: 50 });
  return (await rowIds())[0];
};

try {
  // open-board
  await page.goto(url);
  if (await page.locator('[data-testid="loader"]').isVisible().catch(() => false)) log('open-board', 'loader shows');
  await page.waitForSelector('[data-testid="incident-row"]');
  await caption('open-board · tonight’s incidents, newest first');
  const sha = await page.getAttribute('meta[name="build"]', 'content');
  log('open-board', `rows shown (${(await rowIds()).length}); footer build ${sha.slice(0, 7)}`);
  await page.locator('[data-testid="build-sha"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));

  // watch-board
  await caption('watch-board · board left open; it refreshes itself every 2 s');
  let top = (await rowIds())[0];
  top = await waitNewTop(top);
  log('watch-board', `new incident ${top} lands on top, no reload`, { id: top });
  await caption(`watch-board · ${top} just landed on top`);

  // ack-incident: aim right after an arrival, so the next one is ~10 s away
  await page.waitForTimeout(1500);
  const ids = await rowIds();
  const intended = ids[2];
  const box = await page.locator(`[data-testid="incident-row"][data-id="${intended}"] [data-testid="ack"]`).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 15 });
  await caption(`ack-incident · pointer on the Ack of ${intended} (row 3) — waiting, as on-call reads the row`);
  log('ack-incident', `pointer on Ack of ${intended} (row 3)`, { id: intended });
  top = await waitNewTop(ids[0]);
  log('ack-incident', `new incident ${top} lands on top; rows shift down under the pointer`, { id: top });
  await page.mouse.click(x, y); // same spot, no move
  const clickedMs = Date.now() - t0;
  log('ack-incident', 'click Ack at the same spot');
  await page.waitForFunction(() => document.querySelector('[data-testid="acked"]'), null, { timeout: 10_000 });
  const ackedId = await page.$eval('[data-testid="acked"]', (el) => el.closest('[data-testid="incident-row"]').dataset.id);
  const line = ackLogs.find((l) => l.ms >= clickedMs - 50) ?? ackLogs.at(-1);
  const [, sentId, ackedAt, receipt] = line?.text.split(' ') ?? [];
  log('ack-incident', `row ${ackedId} shows Acked; ${intended} still has its Ack button`, { id: ackedId, intended });
  await caption(`ack-incident · aimed at ${intended}, acked ${ackedId} — the row moved under the pointer`);
  await page.waitForTimeout(6000);
  writeFileSync(`${out}log.json`, JSON.stringify({
    url, locale: LOCALE, timezoneId: TZ, sha, real: REAL, startedAt: new Date(t0).toISOString(), events,
    ack: { intended, acked: ackedId, sentId, ackedAt, receipt, at: mmss(clickedMs) },
  }, null, 2) + '\n');
  console.log(`ack: intended ${intended}, acked ${ackedId} (api.js sent ${sentId}), receipt ${mask(receipt)}`);
} finally {
  await context.close(); // flushes the video
  await browser.close();
  if (adder) clearInterval(adder);
  if (fake) await fake.close();
  const webm = readdirSync(out).find((f) => f.endsWith('.webm') && f !== 'board.webm');
  if (webm) renameSync(`${out}${webm}`, `${out}board.webm`);
  console.log(`record: ${out}`);
}
