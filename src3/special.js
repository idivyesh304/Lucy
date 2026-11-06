// Birthdays, anniversaries and other special days.
import { S } from './store.js';
import * as L from '../src/logic.js';

export const SPECIAL_TYPES = [['Birthday', 'gift'], ['Anniversary', 'heart'], ['Other', 'star']];

// all special days, including your own birthday and anniversary from your profile
export function allSpecial() {
  const out = S.specialDays.slice();
  const p = S.profile || {};
  if (p.dob) out.push({ id: 'me-dob', name: 'Your', self: true, type: 'Birthday', date: p.dob.slice(5), year: Number(p.dob.slice(0, 4)) || 0 });
  if (p.anniversary) out.push({ id: 'me-ann', name: 'Your', self: true, type: 'Anniversary', date: p.anniversary.slice(5), year: Number(p.anniversary.slice(0, 4)) || 0, relation: p.spouse || '' });
  return out;
}
// next date (local midnight) this special day happens, today included
export function nextOccurrence(sd, now) {
  now = now || Date.now();
  const [m, d] = String(sd.date || '').split('-').map(Number);
  if (!m || !d) return null;
  const today = L.startOfDay(now);
  const make = (y) => { const last = new Date(y, m, 0).getDate(); return new Date(y, m - 1, Math.min(d, last)).getTime(); };
  let y = new Date(now).getFullYear(), t = make(y);
  if (t < today) t = make(++y);
  return t;
}
export function yearsAt(sd, when) { return sd.year ? new Date(when).getFullYear() - sd.year : 0; }
export function daysUntil(t) { return Math.round((t - L.startOfDay(Date.now())) / L.DAY); }
export function upcoming(limitDays) {
  const now = Date.now();
  return allSpecial().map((sd) => ({ sd: sd, at: nextOccurrence(sd, now) })).filter((x) => x.at != null && (limitDays == null || daysUntil(x.at) <= limitDays)).sort((a, b) => a.at - b.at);
}
export function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
export function specialTitle(sd, at) {
  const n = yearsAt(sd, at);
  if (sd.self) return sd.type === 'Birthday' ? 'Your birthday' + (n ? ' (' + n + ')' : '') : 'Your wedding anniversary' + (n ? ' (' + ordinal(n) + ')' : '');
  if (sd.type === 'Birthday') return sd.name + '\'s birthday' + (n ? ' (turns ' + n + ')' : '');
  if (sd.type === 'Anniversary') return sd.name + '\'s anniversary' + (n ? ' (' + ordinal(n) + ')' : '');
  return sd.name + (sd.label ? ' · ' + sd.label : '');
}
// notifications: 7 days before, the evening before, and on the day
export function specialSchedule(push, nm) {
  const now = Date.now();
  allSpecial().forEach((sd) => {
    [nextOccurrence(sd, now), nextOccurrence(sd, L.addDays(now, 360))].forEach((at) => {
      if (at == null) return;
      const title = specialTitle(sd, at), tag = 'sp-' + sd.id;
      if (sd.self) {
        push(L.atTime(at, 7, 0), sd.type === 'Birthday' ? 'Happy birthday, ' + nm : 'Happy anniversary, ' + nm, sd.type === 'Birthday' ? 'Another year stronger. Today, celebrate how far you have come.' : 'Celebrate the person who walks with you. Plan something special today.', tag, '#plan-special');
        if (sd.type === 'Anniversary') push(L.atTime(L.addDays(at, -7), 10, 0), 'Your anniversary is in 7 days', 'Book the dinner or gift now, ' + nm + '.', tag, '#plan-special');
        return;
      }
      if (sd.remind7 !== false) push(L.atTime(L.addDays(at, -7), 10, 0), 'In 7 days: ' + title, 'Plan a wish or a gift now so you are not rushing later.', tag, '#plan-special');
      push(L.atTime(L.addDays(at, -1), 20, 0), 'Tomorrow: ' + title, 'Keep your wish ready, ' + nm + '.' + (sd.relation ? ' (' + sd.relation + ')' : ''), tag, '#plan-special');
      push(L.atTime(at, 9, 0), 'Today: ' + title, (sd.phone ? 'Call ' + sd.name + ' now. ' : 'Wish ' + sd.name + ' today. ') + 'A small gesture is remembered for years.', tag, '#plan-special');
    });
  });
}
