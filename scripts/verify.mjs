// Proof runner for BRIEF.md "Proof". Modes:
//   node scripts/verify.mjs --slice 1   A1 (sha public on any origin branch) + A7 (hooks so far) + live rows, on BOARD_URL
//   node scripts/verify.mjs             must: A1 (sha on origin/main) + live checks, then the local spec (test/board.spec.mjs)
// BOARD_URL comes from the env or verify.config.json. Live checks only read: no ack is ever sent here.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const slice = args.includes('--slice') ? args[args.indexOf('--slice') + 1] : null;
const cfg = existsSync(new URL('../verify.config.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('../verify.config.json', import.meta.url), 'utf8'))
  : {};
const BOARD_URL = process.env.BOARD_URL || cfg.boardUrl;

const results = [];
const check = (id, ok, detail) => {
  results.push({ id, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
};

async function live() {
  if (!BOARD_URL) return check('A1', false, 'no BOARD_URL (env or verify.config.json)');
  if (!BOARD_URL.startsWith('https://')) return check('A1', false, `${BOARD_URL} is not https`);

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext(); // fresh profile: logged out
    const page = await ctx.newPage();
    let consumed = null;
    page.on('response', async (r) => {
      if (!consumed && new URL(r.url()).pathname.endsWith('/incidents') && r.ok()) consumed = await r.json().catch(() => null);
    });
    const res = await page.goto(BOARD_URL, { waitUntil: 'load' });
    const status = res?.status();
    const meta = await page.getAttribute('meta[name="build"]', 'content');
    const footer = (await page.textContent('[data-testid="build-sha"]'))?.trim();

    let where = '';
    if (meta && /^[0-9a-f]{40}$/.test(meta)) {
      const cwd = fileURLToPath(new URL('..', import.meta.url));
      execFileSync('git', ['fetch', '--quiet', 'origin'], { cwd });
      const onMain = spawnSync('git', ['merge-base', '--is-ancestor', meta, 'origin/main'], { cwd }).status === 0;
      const branches = spawnSync('git', ['branch', '-r', '--contains', meta, '--list', 'origin/*'], { encoding: 'utf8', cwd }).stdout.trim();
      where = onMain ? 'on origin/main' : branches ? `on ${branches.replace(/\s+/g, ' ')}` : 'not on origin';
      const publicEnough = slice === '1' ? Boolean(branches) : onMain;
      check('A1', status === 200 && meta === footer && publicEnough,
        `status ${status}, meta ${meta.slice(0, 7)}, footer ${footer?.slice(0, 7)}, ${where}`);
    } else {
      check('A1', false, `status ${status}, meta "${meta}" is not a 40-hex sha, footer "${footer}"`);
    }

    // A7 (slice 1 subset): hooks the starter + R6 already have. loader/empty/ack/acked arrive with their issues.
    await page.waitForSelector('[data-testid="incident-row"]', { timeout: 10_000 }).catch(() => {});
    const hooks = ['board', 'incident-list', 'incident-row', 'build-sha'];
    const missing = [];
    for (const h of hooks) if (!(await page.$(`[data-testid="${h}"]`))) missing.push(h);
    const rowIds = await page.$$eval('[data-testid="incident-row"]', (els) => els.map((e) => e.dataset.id));
    check('A7', missing.length === 0 && rowIds.every(Boolean),
      missing.length ? `missing ${missing.join(', ')}` : `${hooks.join(', ')} present; every row has data-id`);

    // Live rows: the board shows what the page itself consumed, in order.
    const want = consumed?.incidents?.map((i) => i.id) ?? null;
    check('live-rows', want !== null && want.length > 0 && JSON.stringify(rowIds) === JSON.stringify(want),
      want ? `${rowIds.length} rows; consumed ${want.length} incidents; same order: ${JSON.stringify(rowIds) === JSON.stringify(want)}` : 'no /incidents response seen');
  } finally {
    await browser.close();
  }
}

await live();
if (slice !== '1' && existsSync(new URL('../test/board.spec.mjs', import.meta.url))) {
  const r = spawnSync('npx', ['playwright', 'test', 'test/board.spec.mjs'], { stdio: 'inherit', shell: true });
  check('local-spec', r.status === 0, `playwright exit ${r.status}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? 'FAIL' : 'PASS'}: ${results.length - failed}/${results.length}${slice ? ` (slice ${slice})` : ''}`);
process.exitCode = failed ? 1 : 0;
