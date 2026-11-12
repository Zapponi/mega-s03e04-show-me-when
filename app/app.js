import { fetchIncidents } from './api.js';

const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const status = document.querySelector('.status');

// Every incident the board has seen, by id. A page is merged in, never swapped in, so a page with
// fewer incidents (a delta, or an empty poll) never empties a board that already holds rows.
const incidents = new Map();
let loaded = false;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function render() {
  if (loaded) document.querySelector('[data-testid="loader"]')?.remove(); // gone for good once loaded

  const rows = [...incidents.values()].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  list.innerHTML = rows
    .map(
      (i) => `<li data-testid="incident-row" data-id="${esc(i.id)}" class="row ${esc(i.severity)}">
        <span class="id">${esc(i.id)}</span>
        <span class="sev">${esc(i.severity)}</span>
        <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
        <time datetime="${esc(i.openedAt)}">${esc(i.openedAt)}</time>
      </li>`,
    )
    .join('');

  // `empty` exists only while a loaded board holds no incident at all.
  const empty = board.querySelector('[data-testid="empty"]');
  if (loaded && rows.length === 0 && !empty) list.insertAdjacentHTML('beforebegin', '<p data-testid="empty" class="empty">No incidents tonight.</p>');
  if (rows.length > 0) empty?.remove();
}

function apply(page) {
  for (const i of page.incidents) incidents.set(i.id, { ...incidents.get(i.id), ...i });
  loaded = true;
  status.textContent = '';
  render();
}

// SCHED-4513: refresh every 2 s while the page is open, at a fixed rate (ticks do not drift with the
// answer time). A tick that finds a request still in flight is skipped, so requests never overlap.
// A failed request shows the error and the next tick tries again; nothing reloads the page.
export const REFRESH_MS = 2000;
let inFlight = null;

/** Fetches one page and merges it into the board; while one is in flight, returns that one instead. */
export function refresh() {
  if (inFlight) return inFlight;
  inFlight = fetchIncidents()
    .then(apply, (e) => {
      status.textContent = `Could not load incidents: ${e.message}`;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

refresh();
setInterval(refresh, REFRESH_MS);
