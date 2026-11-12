import { fetchIncidents, ack } from './api.js';

const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const status = document.querySelector('.status');

// Every incident the board has seen, by id. A page is merged in, never swapped in, so a page with
// fewer incidents (a delta, or an empty poll) never empties a board that already holds rows.
const incidents = new Map();
let loaded = false;

// SCHED-4511 R2: the ack state lives here, by incident id, not in the DOM, so every re-render (each
// 2 s poll, new rows landing above) draws it again. `acked`: id → the ack reply; `ackErrors`: id → message.
const acked = new Map();
const ackErrors = new Map();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// SCHED-4514 R5: the time in the viewer's own locale and time zone (`undefined` = the browser's), so the
// locale decides day/month order and its 12/24 h clock; no hand-built locale list. The <time datetime>
// attribute keeps the raw UTC openedAt.
const timeFormat = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
// An unparseable openedAt shows as sent instead of throwing, so one bad incident cannot blank the board.
const localTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso ?? '') : timeFormat.format(d);
};

function ackCell(id) {
  if (acked.has(id)) return '<span data-testid="acked" class="acked">Acked</span>';
  const error = ackErrors.get(id);
  return `<button type="button" data-testid="ack" class="ack">Ack</button>${error ? `<span class="ack-error" role="alert">${esc(error)}</span>` : ''}`;
}

function render() {
  if (loaded) document.querySelector('[data-testid="loader"]')?.remove(); // gone for good once loaded

  const rows = [...incidents.values()].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  list.innerHTML = rows
    .map(
      (i) => `<li data-testid="incident-row" data-id="${esc(i.id)}" class="row ${esc(i.severity)}">
        <span class="id">${esc(i.id)}</span>
        <span class="sev">${esc(i.severity)}</span>
        <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
        <time datetime="${esc(i.openedAt)}">${esc(localTime(i.openedAt))}</time>
        <span class="act">${ackCell(i.id)}</span>
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

// SCHED-4511 R2: Ack acks the incident of the row that was clicked, read from that row's data-id at
// click time, through api.js (which sends the latest cursor and logs the receipt). A failed ack leaves
// the row not acked, shows why in the row, and keeps the button for a retry.
async function ackIncident(id) {
  ackErrors.delete(id);
  try {
    acked.set(id, await ack(id));
  } catch (e) {
    ackErrors.set(id, `Ack failed: ${e.message}`);
  }
  render();
}

// Step 2, product's decision (plan § 10): Ack asks to confirm, and the confirm names the incident id.
// The id is taken from the clicked row at click time and kept by the confirm, so `confirm-ack` acks the
// incident it names even if new rows push the list down while it is open. The confirm lives outside the
// list, so the 2 s redraw never removes it; `confirm-cancel` (or Escape) closes it and sends nothing.
let confirmBox = null;

function closeConfirm() {
  confirmBox?.remove();
  confirmBox = null;
}

function openConfirm(id) {
  closeConfirm(); // one confirm at a time: a new Ack click replaces it
  confirmBox = document.createElement('div');
  confirmBox.className = 'confirm';
  confirmBox.setAttribute('data-testid', 'confirm');
  confirmBox.setAttribute('role', 'alertdialog');
  confirmBox.setAttribute('aria-label', `Ack ${id}?`);
  confirmBox.dataset.id = id;
  confirmBox.innerHTML = `<p>Ack <strong class="confirm-id">${esc(id)}</strong>?</p>
    <button type="button" data-testid="confirm-ack" class="confirm-ack">Ack ${esc(id)}</button>
    <button type="button" data-testid="confirm-cancel" class="confirm-cancel">Cancel</button>`;
  confirmBox.querySelector('[data-testid="confirm-ack"]').addEventListener('click', () => {
    closeConfirm();
    ackIncident(id);
  });
  confirmBox.querySelector('[data-testid="confirm-cancel"]').addEventListener('click', closeConfirm);
  board.after(confirmBox);
  confirmBox.querySelector('[data-testid="confirm-ack"]').focus();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && confirmBox) closeConfirm();
});

list.addEventListener('click', (e) => {
  const button = e.target.closest('[data-testid="ack"]');
  if (button) openConfirm(button.closest('[data-testid="incident-row"]').dataset.id);
});

refresh();
setInterval(refresh, REFRESH_MS);
