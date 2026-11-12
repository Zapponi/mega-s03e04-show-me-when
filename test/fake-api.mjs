// Local test bench: serves the board's static files from app/ and a fake incident API on one origin,
// so the page under test never calls the course API. `/config.js` is replaced by one that points
// api.js at this fake (app/api.js stays unchanged). No dependencies: node:http only.
//
//   const fake = await startFake({ incidents, delayMs, mode, sorted });  // mode: 'full' (the real API, KEEP) | 'delta'
//                            // sorted: false serves incidents in the given order, so a test proves the board sorts
//   await page.goto(fake.url);
//   fake.set({ delayMs, mode, failIncidents, failAck })  // change behaviour between polls
//   fake.add(incident)       // inject a new incident (shows up on the next poll)
//   fake.requests            // [{ path, query, start }] every /api request, start = Date.now() at arrival
//   fake.acks                // [{ id, cursor, t }] every /api/ack call
//   await fake.close()
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

export async function startFake({ incidents = [], delayMs = 0, mode = 'full', sorted = true } = {}) {
  const opts = { delayMs, mode, sorted, failIncidents: false, failAck: false };
  let seq = 0; // bumps on every add and every answered /incidents; the cursor is this number
  const store = incidents.map((i) => ({ ...i, seq: 0 }));
  const requests = [];
  const acks = [];
  let base = '';

  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const newestFirst = (list) => [...list].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const strip = ({ seq: _s, ...i }) => i;

  async function api(req, res, url) {
    const query = Object.fromEntries(url.searchParams);
    requests.push({ path: url.pathname, query, start: Date.now() });
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));

    if (url.pathname === '/api/incidents') {
      if (opts.failIncidents) return json(res, 500, { error: 'fake: forced 500' });
      const since = query.since === undefined ? null : Number(query.since);
      const page = opts.mode === 'delta' && since !== null ? store.filter((i) => i.seq > since) : store;
      seq += 1;
      return json(res, 200, { updatedAt: new Date().toISOString(), incidents: (opts.sorted ? newestFirst(page) : page).map(strip), cursor: String(seq) });
    }
    if (url.pathname === '/api/ack') {
      acks.push({ id: query.id, cursor: query.cursor, t: query.t });
      if (opts.failAck) return json(res, 500, { error: 'fake: forced 500' });
      if (!store.some((i) => i.id === query.id)) return json(res, 404, { error: `fake: no incident ${query.id}` });
      return json(res, 200, { id: query.id, ackedAt: new Date().toISOString(), receipt: `fake-receipt-${acks.length}` });
    }
    return json(res, 404, { error: `fake: no route ${url.pathname}` });
  }

  async function file(res, pathname) {
    if (pathname === '/config.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      return res.end(`export const API = '${base}/api';\nexport const SESSION = 'test';\n`);
    }
    const rel = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
    if (rel.startsWith('..')) return json(res, 403, { error: 'fake: outside app/' });
    try {
      const body = await readFile(join(APP, rel));
      res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      json(res, 404, { error: `fake: no file ${pathname}` });
    }
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, base);
    (url.pathname.startsWith('/api/') ? api(req, res, url) : file(res, url.pathname)).catch((e) => json(res, 500, { error: String(e) }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  return {
    url: `${base}/`,
    requests,
    acks,
    set: (changes) => Object.assign(opts, changes),
    add: (incident) => store.push({ ...incident, seq: ++seq }),
    close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }),
  };
}
