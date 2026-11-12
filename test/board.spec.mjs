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

const LATE = { id: 'INC-0999', service: 'queue', region: 'eu-west', summary: 'backlog growing', severity: 'sev1', openedAt: at(50) };
const LATER = { id: 'INC-0500', service: 'mail', region: 'us-east', summary: 'bounces', severity: 'sev2', openedAt: at(55) };

test('A3 live list: an incident added between two polls shows as the first row without a reload, rows stay, no id twice', async ({ page }) => {
  // 'full' answers every poll with the whole growing list (the real API, KEEP); 'delta' only what is new
  // after `since`, so a board that swaps pages instead of merging them loses its rows there.
  for (const mode of ['full', 'delta']) {
    await test.step(`${mode} pages`, async () => {
      const f = await fake({ incidents: TONIGHT, mode });
      let navigations = 0;
      const onNav = (frame) => { if (frame === page.mainFrame()) navigations += 1; };
      page.on('framenavigated', onNav);
      await page.goto(f.url);
      await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
      await page.evaluate(() => { window.__a3marker = 'still here'; });

      f.add(LATE);
      const before = incidentCalls(f).length;
      // One poll at 2 s plus slack: the new row is first within one refresh.
      await expect.poll(() => rowIds(page), { timeout: 3000 }).toEqual([LATE.id, ...NEWEST_FIRST]);
      expect(incidentCalls(f).length).toBeGreaterThan(before);
      if (mode === 'delta') expect(incidentCalls(f).at(-1).query.since).toBeDefined(); // it was a delta poll

      // One more poll: still every id once, nothing lost.
      const n = incidentCalls(f).length;
      await expect.poll(() => incidentCalls(f).length, { timeout: 3000 }).toBeGreaterThan(n);
      const ids = await rowIds(page);
      expect(ids).toEqual([LATE.id, ...NEWEST_FIRST]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(navigations).toBe(1);
      expect(await page.evaluate(() => window.__a3marker)).toBe('still here');
      page.off('framenavigated', onNav);
    });
  }
});

test('A5 ack: one /ack for the clicked row with the latest cursor; acked on that row only, kept across refreshes; a 500 leaves it not acked', async ({ page }) => {
  test.setTimeout(30_000);
  const f = await fake({ incidents: TONIGHT });
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  const row = (id) => page.locator(`[data-testid="incident-row"][data-id="${id}"]`);
  const X = 'INC-3002'; // the middle row, so "the first row" or "the last row" would be wrong
  const Y = 'INC-2001';

  await page.goto(f.url);
  await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);

  await test.step('click Ack in row X: exactly one /ack with id=X and the cursor api.js holds', async () => {
    // Click just after a poll was applied, so the next one is ~2 s away and api.js holds the latest cursor.
    await page.waitForResponse((r) => new URL(r.url()).pathname === '/api/incidents');
    await page.waitForTimeout(100);
    await row(X).locator('[data-testid="ack"]').click();
    await expect(row(X).locator('[data-testid="acked"]')).toBeVisible();
    expect(f.acks).toHaveLength(1);
    const [sent] = f.acks;
    expect(sent.id).toBe(X);
    expect(sent.cursor).toBe(f.cursors.filter((c) => c.at <= sent.start).at(-1).cursor);
    expect(logs.some((l) => l.startsWith(`ack ${X} `) && l.endsWith(' fake-receipt-1'))).toBe(true); // api.js logged the receipt
  });

  await test.step('acked on row X only, its ack button gone', async () => {
    await expect(hook(page, 'acked')).toHaveCount(1);
    await expect(row(X).locator('[data-testid="ack"]')).toHaveCount(0);
    for (const id of NEWEST_FIRST.filter((i) => i !== X)) await expect(row(id).locator('[data-testid="ack"]')).toHaveCount(1);
  });

  await test.step('the mark survives 3 more refreshes, also after a new row lands above it', async () => {
    const n = incidentCalls(f).length;
    f.add(LATE);
    await expect.poll(() => incidentCalls(f).length, { timeout: 8000 }).toBeGreaterThanOrEqual(n + 3);
    await page.waitForTimeout(100); // let the third answer render
    expect((await rowIds(page))[0]).toBe(LATE.id);
    await expect(row(X).locator('[data-testid="acked"]')).toBeVisible();
    await expect(hook(page, 'acked')).toHaveCount(1);
    expect(f.acks.map((a) => a.id)).toEqual([X]); // still one ack, still the clicked row's id
  });

  await test.step('a forced 500 on /ack leaves row Y not acked and says so; the error stays across a refresh; a retry acks it', async () => {
    f.set({ failAck: true });
    await row(Y).locator('[data-testid="ack"]').click();
    await expect(row(Y).locator('.ack-error')).toContainText('Ack failed');
    expect(f.acks.at(-1).id).toBe(Y);
    await expect(row(Y).locator('[data-testid="acked"]')).toHaveCount(0);
    await expect(row(Y).locator('[data-testid="ack"]')).toBeVisible();
    const n = incidentCalls(f).length;
    await expect.poll(() => incidentCalls(f).length, { timeout: 3000 }).toBeGreaterThan(n);
    await page.waitForTimeout(100);
    await expect(row(Y).locator('.ack-error')).toBeVisible();
    await expect(hook(page, 'acked')).toHaveCount(1);

    f.set({ failAck: false });
    await row(Y).locator('[data-testid="ack"]').click();
    await expect(row(Y).locator('[data-testid="acked"]')).toBeVisible();
    await expect(row(Y).locator('.ack-error')).toHaveCount(0);
    expect(f.acks.map((a) => a.id)).toEqual([X, Y, Y]);
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

test('A6 local times: each viewer sees openedAt in their own locale and zone, fully visible; datetime keeps raw UTC', async ({ browser }) => {
  const OPENED = '2026-11-12T03:03:00.000Z';
  const f = await fake({ incidents: [{ id: 'INC-4514', service: 'sessions', region: 'ap-southeast', summary: 'local times', severity: 'sev3', openedAt: OPENED }] });
  // Strings measured in Chromium (Playwright 1.64.1) on 2026-11-12 (BRIEF A6, KEEP).
  const VIEWERS = [
    { locale: 'en-NZ', timezoneId: 'Pacific/Auckland', text: '12/11, 04:03 pm' },
    { locale: 'de-DE', timezoneId: 'Europe/Berlin', text: '12.11., 04:03' },
    { locale: 'en-US', timezoneId: 'America/New_York', text: '11/11, 10:03 PM' },
  ];
  for (const v of VIEWERS) {
    await test.step(`${v.locale} / ${v.timezoneId} → ${v.text}`, async () => {
      const context = await browser.newContext({ locale: v.locale, timezoneId: v.timezoneId });
      try {
        const page = await context.newPage();
        await page.goto(f.url);
        const time = hook(page, 'incident-row').locator('time');
        await expect(time).toHaveCount(1);
        await expect(time).toHaveText(v.text, { useInnerText: true });
        expect(await time.textContent()).toBe(v.text); // exact, no whitespace normalization
        await expect(time).toHaveAttribute('datetime', OPENED);
        // Fully visible: one line, nothing clipped inside the element, and it ends before the Ack cell starts.
        const fit = await time.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const act = el.parentElement.querySelector('.act').getBoundingClientRect();
          const line = parseFloat(getComputedStyle(el).lineHeight);
          return { scroll: el.scrollWidth, client: el.clientWidth, right: r.right, actLeft: act.left, height: r.height, line, inView: r.right <= window.innerWidth };
        });
        expect(fit.scroll, JSON.stringify(fit)).toBeLessThanOrEqual(fit.client);
        expect(fit.right, JSON.stringify(fit)).toBeLessThanOrEqual(fit.actLeft);
        expect(fit.height, JSON.stringify(fit)).toBeLessThan(fit.line * 1.5);
        expect(fit.inView).toBe(true);
      } finally {
        await context.close();
      }
    });
  }
});

test('A7 hooks: all 8 pinned data-testid hooks exist with their meaning', async ({ page }) => {
  const f = await fake({ incidents: TONIGHT, delayMs: 500 });
  await page.goto(f.url);
  await expect(hook(page, 'loader')).toBeVisible();
  await expect(hook(page, 'board')).toBeVisible();
  await expect(hook(page, 'incident-list')).toHaveCount(1);
  await expect(hook(page, 'build-sha')).not.toBeEmpty();
  await expect(hook(page, 'incident-row')).toHaveCount(TONIGHT.length);
  for (const id of await rowIds(page)) expect(TONIGHT.map((i) => i.id)).toContain(id);
  // ack: one Ack button in every row; acked: the mark in the row that was acked.
  await expect(hook(page, 'ack')).toHaveCount(TONIGHT.length);
  for (const r of await hook(page, 'incident-row').all()) await expect(r.locator('[data-testid="ack"]')).toHaveCount(1);
  await expect(hook(page, 'acked')).toHaveCount(0);
  const first = hook(page, 'incident-row').first();
  await first.locator('[data-testid="ack"]').click();
  await expect(first.locator('[data-testid="acked"]')).toBeVisible();
  await expect(hook(page, 'acked')).toHaveCount(1);

  const none = await fake({ incidents: [] });
  await page.goto(none.url);
  await expect(hook(page, 'empty')).toBeVisible();
});
