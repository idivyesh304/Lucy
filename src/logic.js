// Lucy — core logic: dates, repeats, understanding typed sentences.
// Pure functions only (no screen, no storage) so they can be tested.

export const MIN = 60000;
export const DAY = 86400000;

const DAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
export const DAYNAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------------- date helpers (phone's local time) ---------------- */
export function startOfDay(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function atTime(dayMs, h, m) { const d = new Date(dayMs); d.setHours(h, m, 0, 0); return d.getTime(); }
export function addDays(ms, n) { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
export function dayKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addMonthsAnchored(startMs, n) {
  const s = new Date(startMs);
  const y = s.getFullYear(), m = s.getMonth() + n;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(s.getDate(), last), s.getHours(), s.getMinutes(), 0, 0).getTime();
}

export function fmtTime(ms) {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
export function fmtDay(ms, now) {
  now = now || Date.now();
  const d0 = startOfDay(now), d = startOfDay(ms);
  if (d === d0) return 'Today';
  if (d === addDays(d0, 1)) return 'Tomorrow';
  if (d === addDays(d0, -1)) return 'Yesterday';
  const x = new Date(ms);
  const y = x.getFullYear() !== new Date(now).getFullYear() ? ' ' + x.getFullYear() : '';
  return DAYNAME[x.getDay()] + ' ' + x.getDate() + ' ' + MON[x.getMonth()] + y;
}
export function fmtWhen(ms, now) { return fmtDay(ms, now) + ', ' + fmtTime(ms); }
export function fmtDate(ms, now) { return fmtDay(ms, now); }

export function repeatLabel(rem) {
  const r = rem.repeat || '';
  if (!r) return '';
  const s = new Date(rem.start || rem.due);
  if (r === 'daily') return 'Every day';
  if (r === 'weekly') return 'Every ' + DAYNAME[s.getDay()];
  if (r === 'monthly') return 'Every month on ' + ordinal(s.getDate());
  if (r === 'yearly') return 'Every year on ' + s.getDate() + ' ' + MON[s.getMonth()];
  const n = Number(r.split(':')[1]);
  return n % 60 === 0 ? 'Every ' + (n === 60 ? 'hour' : n / 60 + ' hours') : 'Every ' + n + ' min';
}
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ---------------- repeating reminders ---------------- */
// k-th occurrence counted from rem.start
export function occurrence(rem, k) {
  const r = rem.repeat, s = rem.start || rem.due;
  if (r === 'daily') return addDays(s, k);
  if (r === 'weekly') return addDays(s, 7 * k);
  if (r === 'monthly') return addMonthsAnchored(s, k);
  if (r === 'yearly') return addMonthsAnchored(s, 12 * k);
  if (r && r.indexOf('every:') === 0) return s + k * Number(r.split(':')[1]) * MIN;
  return s;
}
function approxStep(rem) {
  const r = rem.repeat;
  if (r === 'daily') return DAY;
  if (r === 'weekly') return 7 * DAY;
  if (r === 'monthly') return 28 * DAY;
  if (r === 'yearly') return 365 * DAY;
  return Number(r.split(':')[1]) * MIN;
}
// first occurrence strictly after time t
export function nextAfter(rem, t) {
  if (!rem.repeat) return null;
  const s = rem.start || rem.due;
  let k;
  if (rem.repeat === 'monthly' || rem.repeat === 'yearly') {
    const a = new Date(s), b = new Date(t);
    const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    k = Math.max(0, (rem.repeat === 'monthly' ? months : Math.floor(months / 12)) - 1);
  } else {
    k = Math.max(0, Math.floor((t - s) / approxStep(rem)) - 2);
  }
  let o = occurrence(rem, k);
  let guard = 0;
  while (o <= t && guard++ < 5000) o = occurrence(rem, ++k);
  return o;
}
// all occurrences in [from, to), starting from rem.due
export function occurrencesBetween(rem, from, to, limit) {
  limit = limit || 200;
  if (!rem.repeat) return rem.due >= from && rem.due < to ? [rem.due] : [];
  const out = [];
  let o = rem.due >= from ? rem.due : nextAfter(rem, from - 1);
  let guard = 0;
  while (o < to && out.length < limit && guard++ < 5000) {
    if (o >= from) out.push(o);
    o = nextAfter(rem, o);
  }
  return out;
}

/* ---------------- categories ---------------- */
export const CATS = ['Work', 'Follow-up', 'Meeting', 'Money', 'Family', 'Health', 'Home', 'Documents', 'Personal'];
export const CAT_EMOJI = { Work: '💼', 'Follow-up': '📞', Meeting: '🤝', Money: '💰', Family: '❤️', Health: '💪',
  Home: '🏠', Documents: '📄', Personal: '✨' };
export function taskEmoji(task, cat) {
  const t = String(task || '').toLowerCase();
  if (/water|paani|pani/.test(t)) return '💧';
  if (/stand|stretch/.test(t)) return '🧍';
  if (/gym|workout/.test(t)) return '🏋️';
  if (/walk/.test(t)) return '🚶';
  if (/medicine|pill|tablet/.test(t)) return '💊';
  if (/birthday/.test(t)) return '🎂';
  if (/anniversary/.test(t)) return '💐';
  if (/shoot/.test(t)) return '🎥';
  return CAT_EMOJI[cat] || '✨';
}
export function guessCategory(task) {
  const t = ' ' + task.toLowerCase() + ' ';
  if (/follow ?up|followup|remind (him|her|them)|reply to|check with/.test(t)) return 'Follow-up';
  if (/meeting|meet |call with|zoom|google meet|presentation|pitch/.test(t)) return 'Meeting';
  if (/ pay |payment|bill|emi|rent|invoice|sip|salary|gst payment|recharge|collect|₹|rs\.? ?\d/.test(t)) return 'Money';
  if (/insurance|puc|car service|bike service|service the car|cylinder|gas booking|broadband|wifi|electricity|plumber|ac service/.test(t)) return 'Home';
  if (/passport|licen[cs]e|gst|itr|tax|aadhaar|aadhar|pan card|document|renewal/.test(t)) return 'Documents';
  if (/gym|water|walk|workout|stretch|stand up|meditat|yoga|medicine|pill|doctor|protein|run |sleep/.test(t)) return 'Health';
  if (/mummy|mom |mother|papa|dad |father|devanshi|wife|bro|sister|family|birthday|anniversary|nana|nani|dada|dadi/.test(t)) return 'Family';
  if (/shoot|edit|reel|client|quotation|quote|deliver|render|post |design|logo|proposal|script/.test(t)) return 'Work';
  return 'Personal';
}

/* ---------------- understanding a typed sentence ---------------- */
// Returns { task, due, repeat, start, cat } or null
export function parseReminder(text, now) {
  now = now || Date.now();
  let s = String(text || '').trim().replace(/\s+/g, ' ');
  s = s.replace(/^(hey |ok |okay )?lucy[,:]? ?/i, '')
       .replace(/^(please |pls |plz )/i, '')
       .replace(/^remind me( to| about| that)? /i, '');
  let m, t;

  // in 20 min ...
  if ((m = s.match(/^in (\d+) ?(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b,? (?:to )?(.+)$/i))) {
    return mk(m[3], now + toMin(m[1], m[2]) * MIN, '');
  }
  // every 2 hours ... / every hour ...
  if ((m = s.match(/^every (\d+)? ?(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b,? (?:to )?(.+)$/i))) {
    const n = toMin(m[1] || 1, m[2]);
    if (n < 5) return null;
    return mk(m[3], now + n * MIN, 'every:' + n);
  }
  // every day / daily / roj ...
  if ((m = s.match(/^(?:every ?day|daily|roj|rozana|roz) (.+)$/i))) {
    if (!(t = takeTime(m[1]))) return null;
    let due = atTime(now, t.h, t.min);
    if (due <= now) due = addDays(due, 1);
    return mk(t.rest, due, 'daily');
  }
  // every month 5th 10am ... / monthly on 5 ... / every 5th ...
  if ((m = s.match(/^(?:every month|monthly|har mahine|every)(?: on)?(?: the)? (\d{1,2})(?:st|nd|rd|th)?\b,? (.+)$/i))) {
    const dd = +m[1];
    if (dd < 1 || dd > 31) return null;
    t = takeTime(m[2]) || { h: 10, min: 0, rest: m[2].replace(/^(at|on)\s+/i, '') };
    const n = new Date(now);
    let start = new Date(n.getFullYear(), n.getMonth(), Math.min(dd, daysIn(n.getFullYear(), n.getMonth())), t.h, t.min).getTime();
    if (start <= now) start = new Date(n.getFullYear(), n.getMonth() + 1, Math.min(dd, daysIn(n.getFullYear(), n.getMonth() + 1)), t.h, t.min).getTime();
    // anchor on the requested day so short months don't shift it forever
    const anchor = dd > 28 ? new Date(2000, 0, dd, t.h, t.min).getTime() : start;
    const r = mk(t.rest, start, 'monthly');
    if (r && dd > 28) { r.start = anchor; r.due = nextAfter(r, now); }
    return r;
  }
  // every year 25/11 ... / yearly 25/11 ...
  if ((m = s.match(/^(?:every year|yearly|annually|har saal)(?: on)? (\d{1,2})[\/\-](\d{1,2})\b,? (.+)$/i))) {
    const dd = +m[1], mo = +m[2] - 1;
    if (dd < 1 || dd > 31 || mo < 0 || mo > 11) return null;
    t = takeTime(m[3]) || { h: 9, min: 0, rest: m[3].replace(/^(at|on)\s+/i, '') };
    const y = new Date(now).getFullYear();
    let due = new Date(y, mo, dd, t.h, t.min).getTime();
    if (due <= now) due = new Date(y + 1, mo, dd, t.h, t.min).getTime();
    return mk(t.rest, due, 'yearly');
  }
  // every monday 10am ...
  if ((m = s.match(/^every ([a-z]+) (.+)$/i)) && DAYS[m[1].toLowerCase()] !== undefined) {
    t = takeTime(m[2]) || { h: 9, min: 0, rest: m[2] };
    return mk(t.rest, dowDue(now, DAYS[m[1].toLowerCase()], t), 'weekly');
  }

  // one-time: [day] time task / time [day] task / task [day] at time
  let d = takeDay(s);
  t = takeTime(d.rest);
  if (t && !hasDay(d)) {
    const d2 = takeDay(t.rest);
    if (hasDay(d2)) { d = d2; t.rest = d2.rest; }
  }
  if (!t) {
    const a = findAnywhere(s);
    if (a) { d = a.d; t = a.t; }
    else if (hasDay(d)) t = { h: 9, min: 0, rest: d.rest }; // "25/11 Devanshi birthday" → 9 AM
    else return null;
  }
  let due;
  if (d.offset !== undefined) {
    due = atTime(addDays(startOfDay(now), d.offset), t.h, t.min);
  } else if (d.dow !== undefined) {
    due = dowDue(now, d.dow, t);
  } else if (d.date) {
    const y = new Date(now).getFullYear();
    due = new Date(d.date.y || y, d.date.m, d.date.d, t.h, t.min).getTime();
    if (!d.date.y && due <= now) due = new Date(y + 1, d.date.m, d.date.d, t.h, t.min).getTime();
  } else {
    due = atTime(now, t.h, t.min);
    if (due <= now) due = addDays(due, 1);
  }
  return mk(t.rest, due, '');
}

function mk(raw, due, repeat) {
  let task = String(raw || '').replace(/^(to |-|,|:)\s*/i, '').replace(/\s+(at|on|by)$/i, '').trim();
  if (!task) return null;
  task = task.charAt(0).toUpperCase() + task.slice(1);
  return { task: task, due: due, start: due, repeat: repeat, cat: guessCategory(task) };
}
function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
function toMin(n, unit) { return /^h/i.test(unit) ? +n * 60 : +n; }
function hasDay(d) { return d.offset !== undefined || d.dow !== undefined || !!d.date; }
function dowDue(now, dow, t) {
  const today = new Date(now).getDay();
  let due = atTime(addDays(startOfDay(now), (dow - today + 7) % 7), t.h, t.min);
  if (due <= now) due = addDays(due, 7);
  return due;
}

function takeDay(str) {
  let m;
  if ((m = str.match(/^(day after tomorrow|parso|parson)\b,? ?(.*)$/i))) return { offset: 2, rest: m[2] };
  if ((m = str.match(/^(today|aaj|tonight)\b,? ?(.*)$/i))) return { offset: 0, rest: m[2] };
  if ((m = str.match(/^(tomorrow|tomorow|tmrw|tmr|kal)\b,? ?(.*)$/i))) return { offset: 1, rest: m[2] };
  if ((m = str.match(/^(?:on |this |next )?([a-z]+)\b,? ?(.*)$/i)) && DAYS[m[1].toLowerCase()] !== undefined) {
    return { dow: DAYS[m[1].toLowerCase()], rest: m[2] };
  }
  if ((m = str.match(/^(?:on )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b,? ?(.*)$/))) {
    const dd = +m[1], mo = +m[2] - 1;
    let y = m[3] ? +m[3] : 0;
    if (y && y < 100) y += 2000;
    if (dd >= 1 && dd <= 31 && mo >= 0 && mo <= 11) return { date: { d: dd, m: mo, y: y }, rest: m[4] };
  }
  return { rest: str };
}

function findAnywhere(s) {
  const timeRe = /(?:^|\s)(?:at\s+|@\s*|by\s+)?(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)(?![a-z])|\d{1,2}[:.]\d{2}(?!\d)|\d{1,2} ?baje\b)/i;
  const dayRe = /(?:^|\s)(day after tomorrow|parso|parson|today|aaj|tonight|tomorrow|tomorow|tmrw|tmr|kal|(?:on |this |next )?(?:sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)|(?:on )?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)(?=\s|$|,)/i;
  let rest = s, t = null;
  const tm = s.match(timeRe);
  if (tm) {
    t = takeTime(tm[1]);
    if (!t) return null;
    rest = cut(s, tm.index, tm[0].length);
  }
  const dm = rest.match(dayRe);
  let d = { rest: '' };
  if (dm) {
    d = takeDay(dm[1].trim());
    rest = cut(rest, dm.index, dm[0].length);
  }
  if (!t && !hasDay(d)) return null;
  if (!t) t = { h: 9, min: 0 };
  t.rest = rest.replace(/\s+(at|on|by)$/i, '');
  return { t: t, d: d };
}
function cut(s, i, len) { return (s.slice(0, i) + ' ' + s.slice(i + len)).replace(/\s+/g, ' ').trim(); }

function takeTime(str) {
  str = str.replace(/^(at|@|by)\s+/i, '');
  let m = str.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])\s*,?\s*(.*)$/i);
  if (m) {
    let h = +m[1];
    const mi = +(m[2] || 0);
    if (h < 1 || h > 12 || mi > 59) return null;
    if (h === 12) h = 0;
    if (/^p/i.test(m[3])) h += 12;
    return { h: h, min: mi, rest: m[4] };
  }
  m = str.match(/^(\d{1,2})[:.](\d{2})(?!\d)\s*,?\s*(.*)$/);
  if (m) {
    if (+m[1] > 23 || +m[2] > 59) return null;
    return { h: +m[1], min: +m[2], rest: m[3] };
  }
  m = str.match(/^(\d{1,2}) ?baje\b\s*,?\s*(.*)$/i); // "5 baje": 1-7 → PM, 8-12 → AM/noon
  if (m) {
    let h = +m[1];
    if (h < 1 || h > 12) return null;
    if (h <= 7) h += 12;
    return { h: h, min: 0, rest: m[2] };
  }
  m = str.match(/^(morning|subah|afternoon|dopahar|evening|shaam|sham|night|raat)\b\s*,?\s*(.*)$/i);
  if (m) {
    const w = m[1].toLowerCase();
    const h = /morn|subah/.test(w) ? 9 : /after|dopahar/.test(w) ? 14 : /even|sha/.test(w) ? 18 : 21;
    return { h: h, min: 0, rest: m[2] };
  }
  return null;
}

/* ---------------- Lucy's voice ---------------- */
export function greeting(name, now) {
  const h = new Date(now || Date.now()).getHours();
  const g = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  return g + ', ' + name;
}
export function nagText(name, task, k, max) {
  if (k === 0) return { title: '⏰ ' + task, body: 'Hey ' + name + ', it\'s time.' };
  if (k === 1) return { title: '🔔 Still pending: ' + task, body: 'Just a nudge. Tap Done when it\'s finished.' };
  if (k === 2) return { title: '👀 ' + name + ', ' + task, body: 'I\'m going to keep asking 🙂' };
  if (k === max) return { title: '🙏 Last reminder: ' + task, body: 'I\'ll stop now. Trusting you on this one.' };
  if (k >= 5) return { title: '😤 Reminder #' + (k + 1) + ': ' + task, body: name + ', seriously. Two minutes and it\'s done.' };
  return { title: '😅 ' + ordinal(k + 1) + ' time: ' + task, body: 'Done yet? Or shall I snooze it?' };
}
export function cheer(count) {
  const lines = ['Nice! ✅', 'Done and dusted ✨', 'That\'s how it\'s done 💪', 'One less thing on your mind 🙌', 'Boss move 😎'];
  return lines[count % lines.length];
}
export function money(n) {
  n = Math.round(Number(n) || 0);
  const s = String(Math.abs(n));
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  return (n < 0 ? '-' : '') + '₹' + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last3;
}

/* ---------------- v2: routine, journal, colours ---------------- */
export const ROUTINE_DEFAULT = [
  { key: 'wake', emoji: '⏰', label: 'Wake up', time: '07:30', ring: true, say: 'Good morning {name}! It is {time}. Time to wake up and win the day.' },
  { key: 'warmwater', emoji: '🍵', label: 'Lukewarm water', time: '07:40', say: '{name}, time for your glass of lukewarm water.' },
  { key: 'gym', emoji: '🏋️', label: 'Gym', time: '08:00', say: '{name}, it is gym time. Let\'s go!' },
  { key: 'breakfast', emoji: '🍳', label: 'Breakfast', time: '09:00', say: '{name}, breakfast time.' },
  { key: 'water1', emoji: '💧', label: 'Drink water', time: '10:00', say: '{name}, drink some water.' },
  { key: 'coffee1', emoji: '☕', label: 'Black coffee', time: '11:00', say: '{name}, black coffee time.' },
  { key: 'midmorning', emoji: '🍎', label: 'Mid-morning snack', time: '11:30', say: '{name}, time for your mid-morning snack.' },
  { key: 'water2', emoji: '💧', label: 'Drink water', time: '12:15', say: '{name}, drink some water.' },
  { key: 'lunch', emoji: '🍛', label: 'Lunch', time: '13:30', say: '{name}, it is lunch time.' },
  { key: 'water3', emoji: '💧', label: 'Drink water', time: '14:15', say: '{name}, drink some water.' },
  { key: 'afternoon', emoji: '🥗', label: 'Afternoon snack', time: '16:00', say: '{name}, time for your afternoon snack.' },
  { key: 'water4', emoji: '💧', label: 'Drink water', time: '16:30', say: '{name}, drink some water.' },
  { key: 'coffee2', emoji: '☕', label: 'Black coffee', time: '18:00', say: '{name}, black coffee time.' },
  { key: 'water5', emoji: '💧', label: 'Drink water', time: '18:30', say: '{name}, drink some water.' },
  { key: 'evening', emoji: '🥪', label: 'Evening snack', time: '19:30', say: '{name}, time for your evening snack.' },
  { key: 'water6', emoji: '💧', label: 'Drink water', time: '20:00', say: '{name}, drink some water.' },
  { key: 'dinner', emoji: '🍽️', label: 'Dinner', time: '21:00', say: '{name}, dinner time.' },
  { key: 'walk', emoji: '🚶', label: 'Long walk', time: '21:30', say: '{name}, time for your long walk.' }
];

export const JOURNAL_QS = [
  { id: 'rating', q: 'How would I rate today?', emoji: '⭐', type: 'rating' },
  { id: 'smile', q: 'What made me smile today?', emoji: '😊' },
  { id: 'proud', q: 'What am I most proud of today?', emoji: '🏅' },
  { id: 'work', q: 'Which client or work moment went well?', emoji: '💼' },
  { id: 'drain', q: 'What drained my energy, and how can I avoid it?', emoji: '🔋' },
  { id: 'learn', q: 'What did I learn today?', emoji: '🧠' },
  { id: 'thanks', q: 'Who helped me today? Did I thank them?', emoji: '🤝' },
  { id: 'inspire', q: 'A shot, frame or idea that inspired me today', emoji: '🎥' },
  { id: 'health', q: 'What did I do for my health today?', emoji: '💪' },
  { id: 'love', q: 'How did I show love to my family today?', emoji: '❤️' },
  { id: 'replay', q: 'If I could replay today, what would I change?', emoji: '🔁' },
  { id: 'grateful', q: 'Three things I\'m grateful for', emoji: '🙏' },
  { id: 'tomorrow', q: 'My number one priority for tomorrow', emoji: '🎯' }
];

export const CAT_COLOR = { Work: '#3A86FF', 'Follow-up': '#FF8A00', Meeting: '#7C5CFF', Money: '#12B886', Family: '#FF5CA8',
  Health: '#19C6B7', Home: '#F59F00', Documents: '#5C7CFA', Personal: '#E64980' };
export const SHOP_CATS = [['Company', '🏢'], ['Wife', '💝'], ['Family', '👨‍👩‍👧'], ['Personal', '🙋'], ['Gadgets', '📱'], ['Other', '🛍️']];
export const LEARN_CATS = [['AI', '🤖'], ['Books', '📖'], ['YouTube', '▶️'], ['Practice', '🎯'], ['Crime', '🕵️'], ['Food', '🍲'], ['Fitness', '🏃'], ['Coding', '💻'], ['Tech', '🔧']];
export const PERSONAL_CATS = ['Personal', 'Family', 'Health', 'Home', 'Documents'];
export const COMPANY_CATS = ['Work', 'Meeting', 'Follow-up', 'Money'];

export function fill(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); }
export function spokenTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const h12 = h % 12 || 12, ap = h >= 12 ? 'PM' : 'AM';
  return m ? `${h12} ${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}
