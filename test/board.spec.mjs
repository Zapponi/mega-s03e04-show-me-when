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
// Fetch one more page through the board's own module (same instance the page runs). Stands in for the
// 2 s refresh until SCHED-4513 (issue #5) adds it; A4 then covers the timer itself.
const poll = (page) => page.evaluate(() => import('./app.js').then((m) => m.refresh()));

test('A2 open-board: loader until the first answer, then rows newest first; empty only when the board holds none', async ({ page }) => {
  await test.step('loader shows before a 1 s answer and is gone after it', async () => {
    const f = await fake({ incidents: TONIGHT, delayMs: 1000 });
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
    const next = poll(page);
    await expect.poll(() => f.requests.filter((r) => r.path === '/api/incidents').length).toBe(2);
    await expect(hook(page, 'loader')).toHaveCount(0); // not back while the poll is in flight
    await next;
    const second = f.requests.filter((r) => r.path === '/api/incidents')[1];
    expect(second.query.since).toBe('1'); // api.js sent the first cursor, so the fake answered a delta: []
    expect(await rowIds(page)).toEqual(NEWEST_FIRST);
    await expect(hook(page, 'empty')).toHaveCount(0);
    await expect(hook(page, 'loader')).toHaveCount(0);
  });
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
