// Builds dist/ from app/ and stamps the build's git sha (plan R6) into the meta tag and the footer.
// Refuses a dirty tree or a commit the public repo does not have, so the sha shown is always public.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = new URL('..', import.meta.url);
const dist = new URL('dist/', root);

if (git('status', '--porcelain', '--', 'app')) throw new Error('build: app/ has uncommitted changes; commit first');
const sha = git('rev-parse', 'HEAD');
git('fetch', '--quiet', 'origin');
const onRemote = git('branch', '-r', '--contains', sha);
if (!onRemote) throw new Error(`build: ${sha} is not on origin yet; push it first`);

rmSync(dist, { recursive: true, force: true });
cpSync(new URL('app/', root), dist, { recursive: true });
const html = new URL('index.html', dist);
const page = readFileSync(html, 'utf8');
if (!page.includes('__BUILD_SHA__')) throw new Error('build: app/index.html has no __BUILD_SHA__ marker');
writeFileSync(html, page.replaceAll('__BUILD_SHA__', sha));
writeFileSync(new URL('build.json', dist), JSON.stringify({ sha, builtAt: new Date().toISOString() }) + '\n');
console.log(`build: dist/ at ${sha}`);
