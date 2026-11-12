// A8 check (BRIEF "Proof"): the step-1 report and its evidence, before the claim.
//   node scripts/check-report.mjs <report.md> <recording log.json> [local board.webm]
// Checks: the four headings exactly, in order; `## Where` names file:line refs that exist at the sha;
// one ```evidence block (flow, at, receipt, sha, videoLink); `at` matches a logged event of that flow (±1 s);
// receipt = the receipt api.js logged for the ack; sha = the build in the recording and public on origin/main;
// videoLink answers 200 logged out and serves the same bytes as the local file. Prints receipts masked.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [reportPath, logPath, webmPath] = process.argv.slice(2);
if (!reportPath || !logPath) throw new Error('usage: node scripts/check-report.mjs <report.md> <log.json> [board.webm]');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const report = readFileSync(reportPath, 'utf8');
const log = JSON.parse(readFileSync(logPath, 'utf8'));
const mask = (s) => (s && s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);
const results = [];
const check = (id, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

const HEADINGS = ['## What you checked', '## When', '## Where', '## Options for product'];
const found = report.split('\n').filter((l) => /^## /.test(l)).map((l) => l.trim());
check('headings', JSON.stringify(found) === JSON.stringify(HEADINGS), `found ${JSON.stringify(found)}`);

const blocks = [...report.matchAll(/```evidence\n([\s\S]*?)```/g)];
let ev = null;
try { ev = blocks.length === 1 ? JSON.parse(blocks[0][1]) : null; } catch (e) { ev = null; }
check('evidence-block', ev !== null, `${blocks.length} evidence block(s), JSON ${ev ? 'parses' : 'does not parse'}`);
if (!ev) { process.exitCode = 1; process.exit(); }
const keys = Object.keys(ev).sort().join(',');
check('evidence-keys', keys === 'at,flow,receipt,sha,videoLink', `keys ${keys}`);
check('flow', ['open-board', 'ack-incident', 'watch-board'].includes(ev.flow), `flow ${ev.flow}`);

// `at` must be the second of the ack the receipt belongs to (±1 s), and the flow must be on screen then.
const toMs = (mmss) => { const [m, s] = mmss.split(':').map(Number); return (m * 60 + s) * 1000; };
const click = log.events.find((e) => e.flow === 'ack-incident' && e.what.startsWith('click Ack'));
const atOk = /^\d{2}:\d{2}$/.test(ev.at) && click && Math.abs(Math.floor(click.ms / 1000) * 1000 - toMs(ev.at)) <= 1000;
const flowThen = log.events.filter((e) => e.flow === ev.flow && Math.abs(Math.floor(e.ms / 1000) * 1000 - toMs(ev.at)) <= 1000);
check('at', atOk && flowThen.length > 0,
  `${ev.at} vs the ack click at ${click?.at ?? 'none logged'}; ${ev.flow} events within 1 s: ${flowThen.map((e) => `${e.at} ${e.what}`).join(' | ') || 'none'}`);
check('receipt', ev.receipt === log.ack.receipt && Boolean(ev.receipt), `report ${mask(ev.receipt)} vs logged ${mask(log.ack.receipt)} (ack ${log.ack.acked} at ${log.ack.at})`);

const onMain = spawnSync('git', ['merge-base', '--is-ancestor', ev.sha, 'origin/main'], { cwd }).status === 0;
check('sha', ev.sha === log.sha && /^[0-9a-f]{40}$/.test(ev.sha) && onMain, `${ev.sha?.slice(0, 7)} = recording ${log.sha?.slice(0, 7)}, on origin/main: ${onMain}`);

const whereSection = report.split('## Where')[1]?.split('\n## ')[0] ?? '';
const refs = [...whereSection.matchAll(/`?([\w./-]+\.\w+):(\d+)(?:-(\d+))?`?/g)];
const bad = refs.filter(([, file, a, b]) => {
  const r = spawnSync('git', ['show', `${ev.sha}:${file}`], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return true;
  const n = r.stdout.split('\n').length;
  return Number(b ?? a) > n;
});
check('where', refs.length > 0 && bad.length === 0, `${refs.length} file:line ref(s) at ${ev.sha?.slice(0, 7)}${bad.length ? `; missing: ${bad.map((r) => r[0]).join(', ')}` : ''}`);

const res = await fetch(ev.videoLink, { redirect: 'follow' });
const bytes = Buffer.from(await res.arrayBuffer());
let same = 'not compared';
if (webmPath) same = Buffer.compare(bytes, readFileSync(webmPath)) === 0 ? 'same bytes as the local file' : 'DIFFERENT bytes';
check('videoLink', res.status === 200 && bytes.length > 100_000 && same !== 'DIFFERENT bytes' && ev.videoLink.startsWith('https://'),
  `${res.status}, ${bytes.length} bytes, ${res.headers.get('content-type')}, ${same}`);

const failed = results.filter((ok) => !ok).length;
console.log(`${failed ? 'FAIL' : 'PASS'}: ${results.length - failed}/${results.length}`);
process.exitCode = failed ? 1 : 0;
