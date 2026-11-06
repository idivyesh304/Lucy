export const TRACK = ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning', 'office', 'coach', 'books', 'media'];
// Merging two copies of Lucy's data. Shared by the app and the helper, so both merge the same way.
const ARR_KEYS = ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning', 'office', 'archive', 'coach', 'books', 'media', 'chat', 'log'];
const MAP_KEYS = ['journal', 'manifest', 'routineLog', 'mission', 'celebrated'];
export function records(d) {
  if (!d || typeof d !== 'object') return 0;
  let n = 0;
  ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning', 'archive', 'coach', 'books', 'media'].forEach((k) => { if (Array.isArray(d[k])) n += d[k].length; });
  (d.office || []).forEach((o) => { if (Number(o.amount)) n++; Object.values(o.paid || {}).forEach((x) => { n += ((x && x.parts) || []).length; }); });
  (d.payments || []).forEach((p) => { n += (p.parts || []).length; });
  return n;
}
const partKey = (x) => (x && (x.at + ':' + x.amt)) || JSON.stringify(x);
function mergeParts(a, b) { const m = new Map(); (a || []).concat(b || []).forEach((x) => m.set(partKey(x), x)); return [...m.values()].sort((x, y) => (x.at || 0) - (y.at || 0)); }
function mergePaidMaps(a, b) {
  const out = Object.assign({}, a || {});
  Object.keys(b || {}).forEach((k) => {
    const x = out[k], y = b[k];
    if (x && y && typeof x === 'object' && typeof y === 'object') out[k] = Object.assign({}, x, y, { parts: mergeParts(x.parts, y.parts) });
    else out[k] = y || x;
  });
  return out;
}
function mergeItem(older, newer) {
  const m = Object.assign({}, older, newer);
  // never let an empty value from one copy wipe a real value from the other
  Object.keys(older).forEach((k) => { const v = newer[k]; if ((v === undefined || v === null || v === '' || v === 0) && older[k] !== undefined && older[k] !== null && older[k] !== '' && older[k] !== 0) m[k] = older[k]; });
  if (older.parts || newer.parts) m.parts = mergeParts(older.parts, newer.parts);
  // activity history (lead calls, meetings, notes): keep every entry from both copies
  ['activity', 'logs'].forEach((key) => { if (Array.isArray(older[key]) || Array.isArray(newer[key])) { const mm = new Map(); (older[key] || []).concat(newer[key] || []).forEach((x) => mm.set(String(x && x.id), x)); m[key] = [...mm.values()].sort((x, y) => (y.at || 0) - (x.at || 0)); } });
  if ((older.paid && typeof older.paid === 'object') || (newer.paid && typeof newer.paid === 'object')) {
    if (typeof older.paid === 'object' && typeof newer.paid === 'object') m.paid = mergePaidMaps(older.paid, newer.paid);
  }
  return m;
}
// Combine two copies of Lucy's data without losing anything either side added.
export function mergeStates(a, b) {
  // a full wipe (start fresh) on any device wins everywhere
  if ((Number(a.epoch) || 0) !== (Number(b.epoch) || 0)) {
    const win = (Number(a.epoch) || 0) > (Number(b.epoch) || 0) ? a : b, lose = win === a ? b : a;
    const out = JSON.parse(JSON.stringify(win)), after = (Number(win.epoch) || 0) * 1000;
    // keep anything the other device added after the wipe (IDs are time based)
    TRACK.forEach((k) => { const have = new Set((out[k] || []).map((x) => String(x && x.id))); (lose[k] || []).forEach((x) => { if (x && Number(x.id) > after && !have.has(String(x.id))) (out[k] = out[k] || []).push(x); }); });
    return out;
  }
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a, older = newer === b ? a : b;
  const out = JSON.parse(JSON.stringify(newer));
  ARR_KEYS.forEach((k) => {
    const map = new Map(), order = [];
    (older[k] || []).forEach((x) => { const id = x && x.id != null ? 'i' + x.id : 'o' + order.length + JSON.stringify(x).slice(0, 40); map.set(id, x); order.push(id); });
    (newer[k] || []).forEach((x) => { const id = x && x.id != null ? 'i' + x.id : 'n' + order.length + JSON.stringify(x).slice(0, 40); if (map.has(id)) map.set(id, mergeItem(map.get(id), x)); else { map.set(id, x); order.push(id); } });
    out[k] = order.map((id) => map.get(id));
  });
  MAP_KEYS.forEach((k) => { out[k] = Object.assign({}, older[k] || {}, newer[k] || {}); });
  out.affirm = Object.assign({}, older.affirm || {}, newer.affirm || {});
  ['done', 'spoken'].forEach((k) => { out.affirm[k] = Object.assign({}, (older.affirm || {})[k] || {}, (newer.affirm || {})[k] || {}); });
  const ids = (out.affirm.custom || []).map((x) => x.id);
  out.affirm.custom = (out.affirm.custom || []).concat(((older.affirm || {}).custom || []).filter((x) => !ids.includes(x.id)));
  out.seq = Math.max(Number(a.seq) || 0, Number(b.seq) || 0);
  out.gone = Object.assign({}, a.gone || {}, b.gone || {});
  TRACK.forEach((k) => { out[k] = (out[k] || []).filter((x) => !(x && x.id != null && out.gone[k + ':' + x.id])); });
  // one automatic bill per client per cycle, even if two devices created it
  const seen = new Map();
  out.payments = (out.payments || []).filter((p) => {
    if (!p || !p.cycle) return true;
    const prev = seen.get(p.cycle);
    if (!prev) { seen.set(p.cycle, p); return true; }
    if ((p.parts || []).length > (prev.parts || []).length || (p.status === 'done' && prev.status !== 'done')) { Object.assign(prev, p); }
    return false;
  });
  if ((out.chat || []).length > 80) out.chat = out.chat.slice(-80);
  if ((out.log || []).length > 3000) out.log = out.log.slice(-3000);
  return out;
}
