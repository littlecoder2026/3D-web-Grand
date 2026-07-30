/**
 * The cart.
 *
 * Kept in localStorage so it survives a reload, and published through a tiny
 * subscribe/notify pair so the header badge and the cart page never disagree.
 *
 * Nothing here takes payment. This is a design showcase — checkout ends in a
 * plainly-labelled showcase notice rather than a form asking for a card number.
 */

const KEY = 'grand:cart:v1';

let items = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && i.id && i.qty > 0) : [];
  } catch {
    // A corrupt or blocked store shouldn't take the shop down with it.
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private browsing — the cart just won't persist */
  }
  for (const fn of listeners) fn(items);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(items);
  return () => listeners.delete(fn);
}

export const lines = () => items.slice();
export const count = () => items.reduce((n, i) => n + i.qty, 0);

export function add(id, qty = 1) {
  const hit = items.find((i) => i.id === id);
  if (hit) hit.qty = Math.min(99, hit.qty + qty);
  else items.push({ id, qty: Math.min(99, qty) });
  save();
}

export function setQty(id, qty) {
  const n = Math.max(0, Math.min(99, Math.round(qty)));
  if (n === 0) return remove(id);
  const hit = items.find((i) => i.id === id);
  if (hit) hit.qty = n;
  save();
}

export function remove(id) {
  items = items.filter((i) => i.id !== id);
  save();
}

export function clear() {
  items = [];
  save();
}
