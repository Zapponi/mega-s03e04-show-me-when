// Local proof checks (BRIEF.md "Proof"), one test per check, against test/fake-api.mjs.
// They drive the pinned data-testid hooks the way the course replay does. Run: ./verify --local
import { test, expect } from 'playwright/test';
import { startFake } from './fake-api.mjs';

const at = (min) => new Date(Date.UTC(2026, 10, 12, 3, min)).toISOString();
// Ids deliberately not in openedAt order, so the order on screen comes from openedAt, not from the id.
const TONIGHT = [
  { id: 'INC-2001', service: 'sessions', region: 'eu-west', summary: 'login spikes', severity: 'sev2', openedAt: at(10) },
  { id: 'INC-1003', service: 'billing', region: 'us-east', summary: 'invoices stuck', severity: 'sev1', openedAt: at(40) },
  { id: 'INC-3002', service: 'search', region: 'ap-southeast', summary: 'slow queries', severity: 'sev3', openedAt: at(25) },
];
const NEWEST_FIRST = ['INC-1003', 'INC-3002', 'INC-2001'];

const fakes = [];
const fake = async (opts) => { const f = await startFake(opts); fakes.push(f); return f; };
test.afterEach(async () => { await Promise.all(fakes.splice(0).map((f) => f.close())); });

const hook = (page, id) => page.locator(`[data-testid="${id}"]`);
const rowIds = (page) => hook(page, 'incident-row').evaluateAll((els) => els.map((e) => e.dataset.id));
const incidentCalls = (f) => f.requests.filter((r) => r.path === '/api/incidents');

test('A2 open-board: loader until the first answer, then rows newest first; empty only when the board holds none', async ({ page }) => {
  await test.step('loader shows before a 1 s answer and is gone after it', async () => {
    const f = await fake({ incidents: TONIGHT, delayMs: 1000, sorted: false }); // unsorted: the board must sort
    const answered = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/incidents');
    await page.goto(f.url);
    await expect(hook(page, 'loader')).toBeVisible();
    expect(f.requests.filter((r) => r.path === '/api/incidents')).toHaveLength(1); // asked, not yet answered
    await answered;
    await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
    await expect(hook(page, 'loader')).toHaveCount(0);
    expect(await rowIds(page)).toEqual(NEWEST_FIRST);
    await expect(hook(page, 'empty')).toHaveCount(0);
  });

  await test.step('zero incidents: empty shows, loader gone, no rows', async () => {
    const f = await fake({ incidents: [], delayMs: 1000 });
    await page.goto(f.url);
    await expect(hook(page, 'loader')).toBeVisible();
    await expect(hook(page, 'empty')).toBeVisible();
    await expect(hook(page, 'loader')).toHaveCount(0);
    await expect(hook(page, 'incident-row')).toHaveCount(0);
  });

  await test.step('a later empty poll (delta page) keeps the rows, never shows empty, loader never returns', async () => {
    const f = await fake({ incidents: TONIGHT, mode: 'delta' });
    await page.goto(f.url);
    await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
    f.set({ delayMs: 1000 });
    // The board's own 2 s refresh makes the second request (no help from the test).
    await expect.poll(() => incidentCalls(f).length, { timeout: 5000 }).toBe(2);
    await expect(hook(page, 'loader')).toHaveCount(0); // not back while the poll is in flight
    expect(incidentCalls(f)[1].query.since).toBe('1'); // api.js sent the first cursor, so the fake answered a delta: []
    // A third request starts only after the second answer was applied (no overlap) and carries its cursor.
    await expect.poll(() => incidentCalls(f).length, { timeout: 5000 }).toBe(3);
    expect(incidentCalls(f)[2].query.since).toBe('2');
    expect(await rowIds(page)).toEqual(NEWEST_FIRST);
    await expect(hook(page, 'empty')).toHaveCount(0);
    await expect(hook(page, 'loader')).toHaveCount(0);
  });
});

test('A4 refresh: request starts every 2 s (median 1.9–2.1 s, each 1.5–3.0 s) over ~12 s, no reload', async ({ page }) => {
  test.setTimeout(30_000);
  const f = await fake({ incidents: TONIGHT, delayMs: 200 });
  let navigations = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });
  await page.goto(f.url);
  await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
  await page.evaluate(() => { window.__a4marker = 'still here'; });

  await page.waitForTimeout(12_000);

  const starts = incidentCalls(f).map((r) => r.start);
  const gaps = starts.slice(1).map((t, i) => (t - starts[i]) / 1000);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  console.log(`A4 gaps (s): ${gaps.map((g) => g.toFixed(3)).join(' ')} · median ${median.toFixed(3)} · n=${gaps.length}`);

  expect(gaps.length).toBeGreaterThanOrEqual(5); // ~12 s at 2 s
  expect(median).toBeGreaterThanOrEqual(1.9);
  expect(median).toBeLessThanOrEqual(2.1);
  for (const g of gaps) {
    expect(g).toBeGreaterThanOrEqual(1.5);
    expect(g).toBeLessThanOrEqual(3.0);
  }
  expect(navigations).toBe(1); // only the first load
  expect(await page.evaluate(() => window.__a4marker)).toBe('still here'); // same document, no reload
  await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
});

test('A7 hooks: the pinned data-testid hooks that exist so far', async ({ page }) => {
  // ack and acked arrive with SCHED-4511 (issue #6); this test grows with them.
  const f = await fake({ incidents: TONIGHT, delayMs: 500 });
  await page.goto(f.url);
  await expect(hook(page, 'loader')).toBeVisible();
  await expect(hook(page, 'board')).toBeVisible();
  await expect(hook(page, 'incident-list')).toHaveCount(1);
  await expect(hook(page, 'build-sha')).not.toBeEmpty();
  await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
  for (const id of await rowIds(page)) expect(TONIGHT.map((i) => i.id)).toContain(id);

  const none = await fake({ incidents: [] });
  await page.goto(none.url);
  await expect(hook(page, 'empty')).toBeVisible();
});
