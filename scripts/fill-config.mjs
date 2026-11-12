// Writes app/config.js from the git-ignored .challenge/session.txt. The session ends up public by the
// starter's design (BRIEF "Limits", known exposure); this script never prints it.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://hq.mega.dev/challenges/show-me-when/api';
const session = readFileSync(new URL('../.challenge/session.txt', import.meta.url), 'utf8').trim();
if (!/^v1\.[A-Za-z0-9._-]+$/.test(session)) throw new Error('fill-config: .challenge/session.txt does not hold a v1. session');

writeFileSync(
  new URL('../app/config.js', import.meta.url),
  `// Where the board reads from. Filled by scripts/fill-config.mjs from start-challenge's answer.
export const API = '${API}';
export const SESSION = '${session}';
`,
);
console.log(`fill-config: app/config.js written (session ${session.slice(0, 4)}…${session.slice(-4)})`);
