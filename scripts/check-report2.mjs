// A10 check (BRIEF "Proof"): the step-2 report and its evidence, before the step-2 claim.
//   node scripts/check-report2.mjs <report.md> <recording log.json> [local board.webm]
// Checks: a `## System Diff` section that names behaviour, UX, data, product's decision and the hooks it
// touched (confirm, confirm-ack, confirm-cancel); exactly one ```evidence block with exactly sha, videoLink,
// runUrl; sha = the build in the recording, on origin/main; the recording acked the incident it aimed at;
// videoLink answers 200 logged out with the local bytes; runUrl is a `prove` run on this repo that
// succeeded, ran prove.yml byte-identical to the starter's at its head sha, with url = the board and the nonce.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const [reportPath, logPath, webmPath] = process.argv.slice(2);
if (!reportPath || !logPath) throw new Error('usage: node scripts/check-report2.mjs <report.md> <log.json> [board.webm]');
const REPO = 'Zapponi/mega-s03e04-show-me-when';
const PROVE_SHA256 = 'bc0bbd32e1227260d51e4746a9213f311f5353d2a5c486b061d39cf7dfd427f7';
const cwd = fileURLToPath(new URL('..', import.meta.url));
const report = readFileSync(reportPath, 'utf8');
const log = JSON.parse(readFileSync(logPath, 'utf8'));
const results = [];
const check = (id, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };
const gh = (...a) => execFileSync('gh', a, { cwd, encoding: 'utf8' });

const diff = report.split(/^## System Diff\s*$/m)[1]?.split(/^## /m)[0] ?? '';
const words = ['behavior', 'ux', 'data', 'decision', 'confirm-ack', 'confirm-cancel', '`confirm`'];
const missing = words.filter((w) => !diff.toLowerCase().includes(w.toLowerCase()));
check('system-diff', diff.trim().length > 0 && missing.length === 0, diff ? `names ${words.length - missing.length}/${words.length}${missing.length ? `; missing ${missing.join(', ')}` : ''}` : 'no ## System Diff section');

const blocks = [...report.matchAll(/```evidence\n([\s\S]*?)```/g)];
let ev = null;
try { ev = blocks.length === 1 ? JSON.parse(blocks[0][1]) : null; } catch { ev = null; }
check('evidence-block', ev !== null, `${blocks.length} evidence block(s), JSON ${ev ? 'parses' : 'does not parse'}`);
if (!ev) { process.exitCode = 1; process.exit(); }
const keys = Object.keys(ev).sort().join(',');
check('evidence-keys', keys === 'runUrl,sha,videoLink', `keys ${keys}`);

const onMain = spawnSync('git', ['merge-base', '--is-ancestor', ev.sha, 'origin/main'], { cwd }).status === 0;
check('sha', ev.sha === log.sha && /^[0-9a-f]{40}$/.test(ev.sha) && onMain, `${ev.sha?.slice(0, 7)} = recording ${log.sha?.slice(0, 7)}, on origin/main: ${onMain}`);
check('recording-ack', log.ack?.acked && log.ack.acked === log.ack.intended, `aimed ${log.ack?.intended}, acked ${log.ack?.acked}`);

const res = await fetch(ev.videoLink, { redirect: 'follow' });
const bytes = Buffer.from(await res.arrayBuffer());
let same = 'not compared';
if (webmPath) same = Buffer.compare(bytes, readFileSync(webmPath)) === 0 ? 'same bytes as the local file' : 'DIFFERENT bytes';
check('videoLink', res.status === 200 && bytes.length > 100_000 && same !== 'DIFFERENT bytes', `${res.status}, ${bytes.length} bytes, ${same}`);

const m = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/actions\/runs\/(\d+)$/.exec(ev.runUrl ?? '');
if (!m || m[1] !== REPO) {
  check('runUrl', false, `${ev.runUrl} is not a run URL of ${REPO}`);
} else {
  const run = JSON.parse(gh('api', `repos/${REPO}/actions/runs/${m[2]}`));
  const prove = Buffer.from(JSON.parse(gh('api', `repos/${REPO}/contents/.github/workflows/prove.yml?ref=${run.head_sha}`)).content, 'base64');
  const proveOk = createHash('sha256').update(prove).digest('hex') === PROVE_SHA256;
  const title = run.display_title ?? '';
  const urlOk = title.includes(log.url);
  check('runUrl', run.path === '.github/workflows/prove.yml' && run.conclusion === 'success' && proveOk && urlOk,
    `run ${m[2]}: ${run.status}/${run.conclusion}, workflow ${run.path}, prove.yml at ${run.head_sha.slice(0, 7)} ${proveOk ? 'unchanged' : 'CHANGED'}, title "${title}"`);
}

const failed = results.filter((ok) => !ok).length;
console.log(`${failed ? 'FAIL' : 'PASS'}: ${results.length - failed}/${results.length}`);
process.exitCode = failed ? 1 : 0;
