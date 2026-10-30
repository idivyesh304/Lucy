// Lucy — personal assistant app (screens, storage, notifications)
import { Capacitor } from '@capacitor/core';
import { LocalNotifications as LN } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import * as L from './logic.js';

const NATIVE = Capacitor.isNativePlatform();
const KEY = 'lucy.data.v1';
const DEFAULTS = {
  settings: {
    name: 'Divyesh', nagMin: 15, maxNags: 8, snoozeMin: 10,
    briefTime: '08:30', top3Checks: true, journalTime: '21:30',
    reviewDay: 0, reviewTime: '19:00', quietStart: '22:30', quietEnd: '08:00'
  },
  reminders: [], clients: [], payments: [], notes: [], shopping: [], learning: [],
  top3: { date: '', items: [] }, journal: {}, log: [], seq: 1, onboarded: false, hideTips: {}
};

/* ============================ storage ============================ */
let S = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) {
      const out = Object.assign(clone(DEFAULTS), d);
      out.settings = Object.assign(clone(DEFAULTS.settings), d.settings || {});
      return out;
    }
  } catch (e) { console.error(e); }
  return clone(DEFAULTS);
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function save(noSync) {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save 😟'); }
  if (!noSync) scheduleSync();
}
function nid() { return S.seq++; }
function logEvent(kind, rem, extra) {
  S.log.push(Object.assign({ t: Date.now(), kind: kind, task: rem ? rem.task : '', cat: rem ? rem.cat : '' }, extra || {}));
  if (S.log.length > 1500) S.log = S.log.slice(-1200);
}

/* ============================ helpers ============================ */
const $ = (s) => document.querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hm(str) { const p = String(str || '0:0').split(':'); return { h: +p[0] || 0, m: +p[1] || 0 }; }
function toDateInput(ms) { return L.dayKey(ms); }
function toTimeInput(ms) { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function fromInputs(dateStr, timeStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const t = hm(timeStr || '09:00');
  return new Date(y, (mo || 1) - 1, d || 1, t.h, t.m, 0, 0).getTime();
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}
const name = () => S.settings.name || 'there';
const clientById = (id) => S.clients.find((c) => c.id === Number(id));
const remById = (id) => S.reminders.find((r) => r.id === Number(id));
const payById = (id) => S.payments.find((p) => p.id === Number(id));
const isHabit = (r) => (r.repeat || '').indexOf('every:') === 0;
const isCal = (r) => ['daily', 'weekly', 'monthly', 'yearly'].includes(r.repeat);
const alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);
const nagEnd = (r) => alertStart(r) + S.settings.maxNags * S.settings.nagMin * L.MIN;
function inQuiet(ms) {
  const d = new Date(ms), mins = d.getHours() * 60 + d.getMinutes();
  const a = hm(S.settings.quietStart), b = hm(S.settings.quietEnd);
  const qs = a.h * 60 + a.m, qe = b.h * 60 + b.m;
  return qs > qe ? (mins >= qs || mins < qe) : (mins >= qs && mins < qe);
}
function doneToday() {
  const d0 = L.startOfDay(Date.now());
  return S.log.filter((e) => e.kind === 'done' && e.t >= d0).length;
}
function streak() {
  const days = new Set(S.log.filter((e) => e.kind === 'done').map((e) => L.dayKey(e.t)));
  let n = 0, d = Date.now();
  if (!days.has(L.dayKey(d))) d = L.addDays(d, -1);
  while (days.has(L.dayKey(d))) { n++; d = L.addDays(d, -1); }
  return n;
}

/* ============================ reminder actions ============================ */
function addReminder(r) {
  const rem = {
    id: nid(), task: r.task, cat: r.cat || L.guessCategory(r.task), due: r.due, start: r.start || r.due,
    repeat: r.repeat || '', status: 'pending', clientId: r.clientId || null, created: Date.now(), snoozeUntil: 0
  };
  S.reminders.push(rem);
  save();
  return rem;
}
function markDone(id) {
  const r = remById(id);
  if (!r || r.status !== 'pending') return;
  logEvent('done', r);
  if (isHabit(r)) { save(); toast(L.cheer(doneToday())); return; }
  if (r.repeat) {
    r.due = L.nextAfter(r, Math.max(r.due, Date.now()));
    r.snoozeUntil = 0;
    toast(L.cheer(doneToday()) + ' Next: ' + L.fmtWhen(r.due));
  } else {
    r.status = 'done'; r.doneAt = Date.now();
    toast(L.cheer(doneToday()));
  }
  clearDelivered('rem', r.id);
  save();
}
function undoDone(id) {
  const r = remById(id);
  if (!r || r.status !== 'done') return;
  r.status = 'pending'; r.doneAt = 0;
  for (let i = S.log.length - 1; i >= 0; i--) { if (S.log[i].kind === 'done' && S.log[i].task === r.task) { S.log.splice(i, 1); break; } }
  save();
}
function snooze(id, minutes) {
  const r = remById(id);
  if (!r) return;
  r.snoozeUntil = Date.now() + minutes * L.MIN;
  clearDelivered('rem', r.id);
  save();
  toast('😴 Snoozed till ' + L.fmtTime(r.snoozeUntil));
}
function deleteReminder(id) {
  S.reminders = S.reminders.filter((r) => r.id !== Number(id));
  clearDelivered('rem', Number(id));
  save();
}
// move repeating reminders forward when their nag window has passed
function normalize() {
  const now = Date.now();
  let changed = false;
  S.reminders.forEach((r) => {
    if (r.status !== 'pending' || !r.repeat) return;
    if (isHabit(r) && r.due <= now) { r.due = L.nextAfter(r, now); changed = true; return; }
    if (isCal(r) && nagEnd(r) < now) {
      logEvent('missed', r);
      r.due = L.nextAfter(r, now); r.snoozeUntil = 0; changed = true;
    }
  });
  const today = L.dayKey(now);
  if (S.top3.date !== today) {
    const carry = (S.top3.items || []).filter((i) => i.text && !i.done).map((i) => ({ text: i.text, done: false }));
    S.top3 = { date: today, items: carry.slice(0, 3) };
    changed = true;
  }
  if (changed) save(true);
}

/* ============================ payments ============================ */
function settlePayment(id) {
  const p = payById(id);
  if (!p) return;
  p.status = 'settled'; p.settledAt = Date.now();
  logEvent('paid', null, { task: (p.type === 'in' ? 'Received ' : 'Paid ') + L.money(p.amount) + (p.type === 'in' ? ' from ' : ' to ') + p.party, cat: 'Money', amount: p.amount, dir: p.type });
  clearDelivered('pay', p.id);
  save();
  toast(p.type === 'in' ? '💰 Money in! ' + L.money(p.amount) : '✅ Paid ' + L.money(p.amount));
}

/* ============================ notifications ============================ */
let syncTimer;
function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 700); }
let syncing = false, syncAgain = false;
async function sync() {
  if (!NATIVE) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    normalize();
    const pend = await LN.getPending();
    if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    const list = buildSchedule();
    if (list.length) {
      const exact = await exactAllowed();
      list.forEach((n) => { n.isExactNotification = exact; });
      await LN.schedule({ notifications: list });
    }
  } catch (e) { console.error('sync failed', e); }
  syncing = false;
  if (syncAgain) { syncAgain = false; sync(); }
}
async function exactAllowed() {
  try { const r = await LN.checkExactNotificationSetting(); return r.exact_alarm === 'granted'; } catch (e) { return true; }
}
function buildSchedule() {
  const st = S.settings, now = Date.now(), horizon = L.addDays(now, 7);
  const out = [];
  const push = (at, title, body, extra, type) => {
    if (at <= now + 2000 || at > horizon) return;
    out.push({ at: at, title: title, body: body, extra: extra, type: type });
  };

  S.reminders.forEach((r) => {
    if (r.status !== 'pending') return;
    const client = r.clientId ? clientById(r.clientId) : null;
    const who = client ? ' · ' + client.name : '';
    if (isHabit(r)) {
      L.occurrencesBetween(r, now, L.addDays(now, 2), 80).forEach((o) => {
        if (!inQuiet(o)) push(o, L.taskEmoji(r.task, r.cat) + ' ' + r.task, 'Tap 👍 when done', { kind: 'habit', rid: r.id }, 'HABIT');
      });
      return;
    }
    const start = alertStart(r);
    const next = r.repeat ? L.nextAfter(r, r.due) : Infinity;
    for (let k = 0; k <= st.maxNags; k++) {
      const t = start + k * st.nagMin * L.MIN;
      if (t >= next) break;
      const n = L.nagText(name(), r.task + who, k, st.maxNags);
      push(t, n.title, n.body, { kind: 'rem', rid: r.id }, 'REMIND');
    }
    if (r.repeat) {
      L.occurrencesBetween(r, r.due + 1, horizon, 30).forEach((o) => {
        const n = L.nagText(name(), r.task + who, 0, st.maxNags);
        push(o, n.title, n.body, { kind: 'rem', rid: r.id }, 'REMIND');
      });
    }
    if (r.cat === 'Meeting' && client && client.notes) {
      push(start - 30 * L.MIN, '🤝 In 30 min: ' + r.task, client.notes.slice(0, 220), { kind: 'client', cid: client.id }, null);
    }
  });

  S.payments.forEach((p) => {
    if (p.status !== 'pending') return;
    const verb = p.type === 'in' ? 'Collect ' + L.money(p.amount) + ' from ' + p.party : 'Pay ' + L.money(p.amount) + ' to ' + p.party;
    const from = Math.max(p.snoozeUntil || 0, 0);
    const dayBefore = L.atTime(L.addDays(p.due, -1), 19, 0);
    if (dayBefore >= from) push(dayBefore, '💰 Tomorrow: ' + verb, p.note || 'Heads-up from Lucy', { kind: 'pay', pid: p.id }, null);
    for (let i = 0; i < 7; i++) {
      const t = L.atTime(L.addDays(p.due, i), 10, 0);
      if (t < from) continue;
      push(t, i === 0 ? '💰 Today: ' + verb : '⚠️ Overdue ' + i + 'd: ' + verb, p.note || (p.type === 'in' ? 'Time to follow up 📞' : 'Don\'t let it slip'), { kind: 'pay', pid: p.id }, 'PAY');
    }
  });

  for (let i = 0; i < 7; i++) {
    const day = L.addDays(L.startOfDay(now), i);
    const b = hm(st.briefTime);
    push(L.atTime(day, b.h, b.m), '☀️ ' + L.greeting(name(), L.atTime(day, b.h, b.m)), briefText(day), { kind: 'open', tab: 'today' }, null);
    if (st.top3Checks) {
      [14, 18].forEach((h) => push(L.atTime(day, h, 0), '🎯 Top 3 check-in', h === 14 ? 'Halfway through the day. How are your 3 priorities going?' : 'Evening check: tick off your Top 3 before the day ends.', { kind: 'open', tab: 'today' }, null));
    }
    const j = hm(st.journalTime);
    push(L.atTime(day, j.h, j.m), '🌙 2-minute reflection', 'What went well today? What will you do better tomorrow?', { kind: 'open', tab: 'more', sub: 'journal' }, null);
    if (new Date(day).getDay() === Number(st.reviewDay)) {
      const rv = hm(st.reviewTime);
      push(L.atTime(day, rv.h, rv.m), '📊 Your weekly review is ready', 'See what you finished, what slipped, and plan next week.', { kind: 'open', tab: 'more', sub: 'review' }, null);
    }
  }

  out.sort((a, b) => a.at - b.at);
  return out.slice(0, 400).map((n, i) => {
    const o = {
      id: i + 1, title: n.title, body: n.body, extra: n.extra, channelId: 'lucy',
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      smallIcon: 'ic_stat_lucy', iconColor: '#FF5A6E', autoCancel: true
    };
    if (n.type) o.actionTypeId = n.type;
    return o;
  });
}
function briefText(day) {
  const end = L.addDays(day, 1);
  const rems = [];
  S.reminders.forEach((r) => {
    if (r.status !== 'pending' || isHabit(r)) return;
    if (L.occurrencesBetween(r, day, end, 5).length) rems.push(r);
  });
  const pays = S.payments.filter((p) => p.status === 'pending' && p.due < end);
  const collect = pays.filter((p) => p.type === 'in').reduce((a, p) => a + Number(p.amount), 0);
  const pay = pays.filter((p) => p.type === 'out').reduce((a, p) => a + Number(p.amount), 0);
  const parts = [];
  if (rems.length) parts.push(rems.length + ' reminder' + (rems.length > 1 ? 's' : '') + ': ' + rems.slice(0, 3).map((r) => r.task).join(', ') + (rems.length > 3 ? '…' : ''));
  if (collect) parts.push(L.money(collect) + ' to collect');
  if (pay) parts.push(L.money(pay) + ' to pay');
  parts.push('Set your Top 3 🎯');
  return parts.join(' • ');
}
async function clearDelivered(kind, id) {
  if (!NATIVE) return;
  try {
    const d = await LN.getDeliveredNotifications();
    const key = kind === 'pay' ? 'pid' : 'rid';
    const hit = d.notifications.filter((n) => n.extra && Number(n.extra[key]) === Number(id) && (n.extra.kind === kind || (kind === 'rem' && n.extra.kind === 'habit')));
    if (hit.length) await LN.removeDeliveredNotifications({ notifications: hit });
  } catch (e) { /* not critical */ }
}
function onAction(a) {
  const ex = (a.notification && a.notification.extra) || {};
  if (ex.kind === 'rem' || ex.kind === 'habit') {
    if (a.actionId === 'done') markDone(ex.rid);
    else if (a.actionId === 'snooze') snooze(ex.rid, S.settings.snoozeMin);
    else go('today');
  } else if (ex.kind === 'pay') {
    const p = payById(ex.pid);
    if (a.actionId === 'done') settlePayment(ex.pid);
    else if (a.actionId === 'snooze' && p) { p.snoozeUntil = L.startOfDay(L.addDays(Date.now(), 1)); save(); toast('Okay, I\'ll remind you tomorrow'); }
    else go('money');
  } else if (ex.kind === 'client') {
    go('clients', null, ex.cid);
  } else if (ex.kind === 'open') {
    go(ex.tab || 'today', ex.sub || null);
  }
  render();
}

let perm = { notif: 'granted', exact: 'granted' };
async function initNative() {
  if (!NATIVE) return;
  try {
    await LN.createChannel({ id: 'lucy', name: 'Lucy reminders', description: 'Reminders, nudges and briefings', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#FF5A6E' });
    await LN.registerActionTypes({ types: [
      { id: 'REMIND', actions: [{ id: 'done', title: '✅ Done' }, { id: 'snooze', title: '⏰ Snooze ' + S.settings.snoozeMin + 'm' }] },
      { id: 'HABIT', actions: [{ id: 'done', title: '👍 Done' }] },
      { id: 'PAY', actions: [{ id: 'done', title: '✅ Settled' }, { id: 'snooze', title: '⏰ Tomorrow' }] }
    ] });
    LN.addListener('localNotificationActionPerformed', onAction);
    App.addListener('resume', () => { normalize(); refreshPerms(); render(); scheduleSync(); });
    App.addListener('backButton', () => {
      if (!$('#sheet-wrap').hidden) return closeSheet();
      if (view.sub || view.clientId) { view.sub = null; view.clientId = null; return render(); }
      if (view.tab !== 'today') return go('today');
      App.minimizeApp();
    });
    await refreshPerms();
    if (perm.notif !== 'granted' && S.onboarded) await LN.requestPermissions();
  } catch (e) { console.error(e); }
}
async function refreshPerms() {
  if (!NATIVE) return;
  try { perm.notif = (await LN.checkPermissions()).display; } catch (e) {}
  perm.exact = (await exactAllowed()) ? 'granted' : 'denied';
}

/* ============================ navigation ============================ */
const view = { tab: 'today', sub: null, clientId: null, filter: 'All', moneyTab: 'in', noteQ: '' };
function go(tab, sub, clientId) {
  view.tab = tab; view.sub = sub || null; view.clientId = clientId ? Number(clientId) : null;
  closeSheet(); render(); window.scrollTo(0, 0);
}
function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === view.tab));
  const screens = { today: renderToday, reminders: renderReminders, clients: renderClients, money: renderMoney, more: renderMore };
  $('#app').innerHTML = (screens[view.tab] || renderToday)();
  const fab = !['more'].includes(view.tab) || ['notes', 'shopping', 'learning'].includes(view.sub);
  if (fab && !$('.fab')) document.body.insertAdjacentHTML('beforeend', '<button class="fab" data-a="fab">+</button>');
  if (!fab && $('.fab')) $('.fab').remove();
  if (view.tab === 'today') updatePreview();
}

/* ============================ shared bits ============================ */
function remRow(r, opts) {
  opts = opts || {};
  const now = Date.now();
  const client = r.clientId ? clientById(r.clientId) : null;
  const t = alertStart(r);
  const late = r.status === 'pending' && t < now && !isHabit(r);
  const soon = !late && r.status === 'pending' && t - now < 60 * L.MIN;
  const when = r.status === 'done' ? 'Done ' + L.fmtWhen(r.doneAt || r.due) : (opts.timeOnly ? L.fmtTime(t) : L.fmtWhen(t));
  const meta = [when];
  if (r.repeat) meta.push('🔁 ' + L.repeatLabel(r));
  if (client) meta.push('🤝 ' + client.name);
  if (r.snoozeUntil > now) meta.push('😴 snoozed');
  return `<div class="item ${r.status === 'done' ? 'done' : ''}">
    <button class="check ${r.status === 'done' ? 'on' : ''}" data-a="${r.status === 'done' ? 'undo' : 'done'}" data-id="${r.id}">${r.status === 'done' ? '✓' : ''}</button>
    <div class="grow" data-a="edit" data-id="${r.id}">
      <div class="title">${L.taskEmoji(r.task, r.cat)} ${esc(r.task)}</div>
      <div class="meta ${late ? 'late' : soon ? 'soon' : ''}">${esc(meta.join(' · '))}</div>
    </div></div>`;
}
function payRow(p) {
  const now = Date.now();
  const late = p.status === 'pending' && L.atTime(p.due, 23, 59) < now;
  const dueTxt = p.status === 'settled' ? 'Settled ' + L.fmtDate(p.settledAt) : (late ? 'Overdue · ' : 'Due ') + L.fmtDate(p.due);
  return `<div class="item">
    <div class="emoji">${p.type === 'in' ? '⬇️' : '⬆️'}</div>
    <div class="grow" data-a="editpay" data-id="${p.id}">
      <div class="title">${esc(p.party)}</div>
      <div class="meta ${late ? 'late' : ''}">${esc(dueTxt)}${p.note ? ' · ' + esc(p.note) : ''}</div>
    </div>
    <div style="text-align:right">
      <div class="amount ${p.type}">${L.money(p.amount)}</div>
      ${p.status === 'pending' ? `<button class="link" data-a="settle" data-id="${p.id}">${p.type === 'in' ? 'Received' : 'Paid'}</button>` : ''}
    </div></div>`;
}
const listOf = (rows, emptyMsg) => rows.length ? `<div class="list">${rows.join('')}</div>` : (emptyMsg ? `<div class="empty">${emptyMsg}</div>` : '');

/* ============================ TODAY ============================ */
function renderToday() {
  const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1);
  const pending = S.reminders.filter((r) => r.status === 'pending' && !isHabit(r));
  const overdue = pending.filter((r) => alertStart(r) < now && !(r.repeat && L.startOfDay(r.due) >= d0)).sort((a, b) => a.due - b.due);
  const today = pending.filter((r) => !overdue.includes(r) && alertStart(r) < d1).sort((a, b) => alertStart(a) - alertStart(b));
  const doneT = S.reminders.filter((r) => r.status === 'done' && r.doneAt >= d0);
  const habits = S.reminders.filter((r) => r.status === 'pending' && isHabit(r));
  const pays = S.payments.filter((p) => p.status === 'pending' && p.due < L.addDays(d0, 3)).sort((a, b) => a.due - b.due);
  const tomorrow = pending.filter((r) => L.occurrencesBetween(r, d1, L.addDays(d1, 1), 3).length).length;
  const left = overdue.length + today.length;
  const st = streak(), dn = doneToday();
  let mood;
  if (!S.reminders.length) mood = 'I\'m Lucy. Tell me anything you need to remember below 👇';
  else if (left === 0) mood = dn ? 'All clear for today. Proud of you ✨' : 'Nothing pending today. Enjoy the calm ☕';
  else if (overdue.length >= 3) mood = overdue.length + ' things are overdue. Let\'s clear them, one at a time 💪';
  else mood = left + ' thing' + (left > 1 ? 's' : '') + ' left today. You\'ve got this.';

  const items = (S.top3.items || []).concat([]);
  while (items.length < 3) items.push({ text: '', done: false });
  const top3Done = items.filter((i) => i.text && i.done).length;

  return `
    ${banners()}
    <div class="hero">
      <div class="lucy-badge"><div class="lucy-dot">L</div>Lucy · ${esc(L.fmtDay(now))}, ${new Date(now).getDate()} ${L.MON[new Date(now).getMonth()]}</div>
      <h1>${esc(L.greeting(name(), now))}</h1>
      <div class="sub">${esc(mood)}</div>
      <div class="chips"><span class="chip">✅ ${dn} done today</span>${st > 1 ? `<span class="chip">🔥 ${st}-day streak</span>` : ''}${tomorrow ? `<span class="chip">📅 ${tomorrow} tomorrow</span>` : ''}</div>
    </div>
    <div class="quick">
      <input id="quick" placeholder="Tell Lucy… e.g. kal 11am call Mr. Ravi" autocomplete="off" enterkeyhint="done">
      <button class="btn" data-a="quickadd">Add</button>
    </div>
    <div class="preview" id="preview"></div>

    <h2>🎯 Today's Top 3 ${top3Done ? `· ${top3Done}/3` : ''}</h2>
    <div class="list top3">${items.slice(0, 3).map((it, i) => `
      <div class="item ${it.done ? 'done' : ''}">
        <button class="check ${it.done ? 'on' : ''}" data-a="top3" data-i="${i}">${it.done ? '✓' : i + 1}</button>
        <div class="grow"><input data-top3="${i}" value="${esc(it.text)}" placeholder="${['Most important thing today', 'Second priority', 'Third priority'][i]}"></div>
      </div>`).join('')}</div>

    ${overdue.length ? `<h2 class="late">⚠️ Overdue</h2>${listOf(overdue.map((r) => remRow(r)))}` : ''}
    <h2>📅 Today</h2>
    ${listOf(today.map((r) => remRow(r, { timeOnly: true })), 'Nothing else scheduled today.')}
    ${habits.length ? `<h2>💪 Habits</h2><div class="scroll-chips">${habits.map((h) => {
      const c = S.log.filter((e) => e.kind === 'done' && e.t >= d0 && e.task === h.task).length;
      return `<button class="chip" data-a="habit" data-id="${h.id}">${L.taskEmoji(h.task, h.cat)} ${esc(h.task)} · ${c}✓</button>`;
    }).join('')}</div>` : ''}
    ${pays.length ? `<h2>💰 Money due soon</h2>${listOf(pays.map(payRow))}` : ''}
    ${doneT.length ? `<h2>✅ Done today</h2>${listOf(doneT.map((r) => remRow(r)))}` : ''}
  `;
}
function banners() {
  let h = '';
  if (NATIVE && perm.notif !== 'granted') h += `<div class="banner">🔕 Notifications are off, so I can't remind you.<br><button class="btn small" data-a="perm-notif">Turn on notifications</button></div>`;
  if (NATIVE && perm.exact !== 'granted') h += `<div class="banner">⏱ Allow "Alarms &amp; reminders" so I ring exactly on time, not a few minutes late.<br><button class="btn small" data-a="perm-exact">Allow</button></div>`;
  if (NATIVE && !S.hideTips.battery && S.onboarded) h += `<div class="banner">🔋 <b>Important:</b> set Lucy's battery usage to <b>Unrestricted</b> so your phone never stops my reminders.<br>Settings → Apps → Lucy → Battery → Unrestricted.<br><button class="btn small ghost" data-a="hidetip" data-v="battery">Done it</button></div>`;
  return h;
}
function updatePreview() {
  const q = $('#quick'), p = $('#preview');
  if (!q || !p) return;
  const v = q.value.trim();
  if (!v) { p.innerHTML = 'Try: <b>every day 9am drink water</b> · <b>25/11 Devanshi birthday</b> · <b>in 20 min check render</b>'; return; }
  const r = L.parseReminder(v);
  p.innerHTML = r ? `${L.CAT_EMOJI[r.cat]} <b>${esc(r.task)}</b> · ${esc(L.fmtWhen(r.due))}${r.repeat ? ' · 🔁 ' + esc(L.repeatLabel(r)) : ''}`
    : `I'll need a time, e.g. "<b>${esc(v)} at 5pm</b>", or tap Add to pick one.`;
}

/* ============================ REMINDERS ============================ */
function renderReminders() {
  const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1), d2 = L.addDays(d0, 2), d7 = L.addDays(d0, 7);
  const f = view.filter;
  const match = (r) => f === 'All' || (f === 'Repeating' ? !!r.repeat : r.cat === f);
  const pend = S.reminders.filter((r) => r.status === 'pending' && match(r)).sort((a, b) => alertStart(a) - alertStart(b));
  const one = pend.filter((r) => !r.repeat);
  const groups = [
    ['⚠️ Overdue', one.filter((r) => alertStart(r) < now)],
    ['Today', one.filter((r) => alertStart(r) >= now && alertStart(r) < d1)],
    ['Tomorrow', one.filter((r) => alertStart(r) >= d1 && alertStart(r) < d2)],
    ['This week', one.filter((r) => alertStart(r) >= d2 && alertStart(r) < d7)],
    ['Later', one.filter((r) => alertStart(r) >= d7)],
    ['🔁 Repeating', pend.filter((r) => r.repeat)]
  ];
  const done = S.reminders.filter((r) => r.status === 'done' && match(r)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
  const filters = ['All'].concat(L.CATS, ['Repeating']);
  const body = groups.filter((g) => g[1].length).map((g) => `<h2 class="${g[0].includes('Overdue') ? 'late' : ''}">${g[0]}</h2>${listOf(g[1].map((r) => remRow(r)))}`).join('');
  return `
    <h1>Reminders</h1><div class="sub">${pend.length} pending</div>
    <div class="scroll-chips" style="margin-top:12px">${filters.map((x) => `<button class="chip ${x === f ? 'on' : ''}" data-a="filter" data-v="${x}">${x === 'All' ? 'All' : x === 'Repeating' ? '🔁 Repeating' : L.CAT_EMOJI[x] + ' ' + x}</button>`).join('')}</div>
    ${body || '<div class="empty">Nothing here yet. Tap + to add a reminder.</div>'}
    ${done.length ? `<h2>✅ Recently done</h2>${listOf(done.map((r) => remRow(r)))}` : ''}
  `;
}

/* ============================ CLIENTS ============================ */
function renderClients() {
  if (view.clientId) return renderClient(clientById(view.clientId));
  const rows = S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
    const fu = S.reminders.filter((r) => r.clientId === c.id && r.status === 'pending').length;
    const due = S.payments.filter((p) => p.status === 'pending' && p.clientId === c.id && p.type === 'in').reduce((a, p) => a + Number(p.amount), 0);
    return `<div class="item" data-a="client" data-id="${c.id}">
      <div class="lucy-dot" style="width:36px;height:36px;flex:none">${esc(c.name.charAt(0).toUpperCase())}</div>
      <div class="grow"><div class="title">${esc(c.name)}</div>
      <div class="meta">${fu ? fu + ' follow-up' + (fu > 1 ? 's' : '') : 'No follow-ups'}${due ? ' · ' + L.money(due) + ' to collect' : ''}</div></div><span class="sub">›</span></div>`;
  });
  return `<h1>Clients</h1><div class="sub">Follow-ups, notes and money, per client</div>
    <button class="btn block ghost" data-a="newclient">+ Add client</button>
    <h2>All clients</h2>${listOf(rows, 'No clients yet. Add your first one above.')}`;
}
function renderClient(c) {
  if (!c) { view.clientId = null; return renderClients(); }
  const rems = S.reminders.filter((r) => r.clientId === c.id && r.status === 'pending').sort((a, b) => alertStart(a) - alertStart(b));
  const doneR = S.reminders.filter((r) => r.clientId === c.id && r.status === 'done').slice(-5).reverse();
  const pays = S.payments.filter((p) => p.clientId === c.id).sort((a, b) => (a.status === b.status ? a.due - b.due : a.status === 'pending' ? -1 : 1));
  const phone = (c.phone || '').replace(/[^\d+]/g, '');
  const wa = phone ? (phone.startsWith('+') ? phone.slice(1) : (phone.length === 10 ? '91' + phone : phone)) : '';
  return `
    <button class="back" data-a="back">‹ Clients</button>
    <div class="hero"><h1>${esc(c.name)}</h1>
      <div class="sub">${esc(c.business || '')}${c.phone ? ' · ' + esc(c.phone) : ''}</div>
      <div class="actions">${phone ? `<a class="btn small" href="tel:${esc(phone)}">📞 Call</a><a class="btn small ghost" href="https://wa.me/${esc(wa)}">💬 WhatsApp</a>` : ''}
      <button class="btn small ghost" data-a="editclient" data-id="${c.id}">✏️ Edit</button></div>
    </div>
    <h2>📝 Notes &amp; meeting prep</h2>
    <textarea id="client-notes" data-cid="${c.id}" placeholder="What do they want? Budget? Last discussion? Lucy shows this 30 min before any meeting with ${esc(c.name)}.">${esc(c.notes || '')}</textarea>
    <h2>📞 Follow-ups</h2>
    <div class="quick"><input id="client-quick" placeholder="e.g. monday 11am send quotation" data-cid="${c.id}"><button class="btn" data-a="clientadd" data-id="${c.id}">Add</button></div>
    <div style="height:8px"></div>
    ${listOf(rems.map((r) => remRow(r)), 'No pending follow-ups.')}
    <h2>💰 Payments</h2>
    <button class="btn small ghost" data-a="newpay" data-cid="${c.id}">+ Add payment</button><div style="height:8px"></div>
    ${listOf(pays.map(payRow), 'No payments recorded.')}
    ${doneR.length ? `<h2>History</h2>${listOf(doneR.map((r) => remRow(r)))}` : ''}`;
}

/* ============================ MONEY ============================ */
function renderMoney() {
  const pend = S.payments.filter((p) => p.status === 'pending');
  const sum = (arr) => arr.reduce((a, p) => a + Number(p.amount), 0);
  const now = Date.now();
  const inP = pend.filter((p) => p.type === 'in'), outP = pend.filter((p) => p.type === 'out');
  const lateIn = inP.filter((p) => L.atTime(p.due, 23, 59) < now);
  const lateOut = outP.filter((p) => L.atTime(p.due, 23, 59) < now);
  const tab = view.moneyTab;
  const list = (tab === 'in' ? inP : outP).sort((a, b) => a.due - b.due);
  const settled = S.payments.filter((p) => p.status === 'settled' && p.type === tab).sort((a, b) => b.settledAt - a.settledAt).slice(0, 15);
  return `<h1>Money</h1><div class="sub">What's coming in, what's going out</div>
    <div class="stats" style="margin-top:14px">
      <div class="stat"><div class="l">To receive</div><div class="n in">${L.money(sum(inP))}</div><div class="sub ${lateIn.length ? 'late' : ''}">${lateIn.length ? lateIn.length + ' overdue' : inP.length + ' pending'}</div></div>
      <div class="stat"><div class="l">To pay</div><div class="n out">${L.money(sum(outP))}</div><div class="sub ${lateOut.length ? 'late' : ''}">${lateOut.length ? lateOut.length + ' overdue' : outP.length + ' pending'}</div></div>
    </div>
    <div class="seg"><button class="${tab === 'in' ? 'on' : ''}" data-a="mtab" data-v="in">⬇️ To receive</button><button class="${tab === 'out' ? 'on' : ''}" data-a="mtab" data-v="out">⬆️ To pay</button></div>
    <h2>Pending</h2>${listOf(list.map(payRow), tab === 'in' ? 'Nobody owes you anything right now 🎉' : 'No bills pending 🎉')}
    ${settled.length ? `<h2>Settled</h2>${listOf(settled.map(payRow))}` : ''}
    <div class="sub" style="margin:14px 4px">💡 For monthly bills like rent, EMI or SIP, add a repeating reminder: <b>every month 5th 10am pay rent</b></div>`;
}

/* ============================ MORE ============================ */
function renderMore() {
  const subs = { notes: renderNotes, shopping: renderShopping, learning: renderLearning, journal: renderJournal, review: renderReview, settings: renderSettings, backup: renderBackup };
  if (view.sub && subs[view.sub]) return '<button class="back" data-a="back">‹ More</button>' + subs[view.sub]();
  const tile = (sub, icon, title, small) => `<button class="tile" data-a="sub" data-v="${sub}"><span>${icon}</span><b>${title}</b><small>${small}</small></button>`;
  const shopLeft = S.shopping.filter((s) => !s.done).length;
  const learnLeft = S.learning.filter((s) => !s.done).length;
  return `<h1>More</h1><div class="sub">Lucy's second brain</div><div style="height:14px"></div>
    <div class="tiles">
      ${tile('notes', '💡', 'Ideas &amp; notes', S.notes.length + ' saved')}
      ${tile('shopping', '🛒', 'Shopping list', shopLeft + ' to buy')}
      ${tile('learning', '📚', 'Learning', learnLeft + ' in queue')}
      ${tile('journal', '🌙', 'Journal', S.journal[L.dayKey(Date.now())] ? 'Written today ✓' : 'Write today')}
      ${tile('review', '📊', 'Weekly review', 'Last 7 days')}
      ${tile('settings', '⚙️', 'Settings', 'Timings &amp; nags')}
      ${tile('backup', '💾', 'Backup', 'Keep your data safe')}
    </div>`;
}
function renderNotes() {
  const q = view.noteQ.toLowerCase();
  const notes = S.notes.filter((n) => !q || n.text.toLowerCase().includes(q)).sort((a, b) => (b.pinned - a.pinned) || (b.created - a.created));
  const fmt = (t) => esc(t).replace(/#(\w+)/g, '<span class="tag">#$1</span>');
  return `<h1>💡 Ideas &amp; notes</h1><div class="sub">Reel ideas, hooks, concepts. Use #tags to group them.</div>
    <div style="height:12px"></div>
    <textarea id="note-new" placeholder="New idea… e.g. Hook: 'Your logo isn't the problem' #reel"></textarea>
    <button class="btn block" data-a="addnote">Save idea</button>
    <h2>Saved</h2><input id="note-q" placeholder="Search notes" value="${esc(view.noteQ)}"><div style="height:8px"></div>
    ${listOf(notes.map((n) => `<div class="item"><div class="grow" data-a="editnote" data-id="${n.id}">
      <div class="note-text">${n.pinned ? '📌 ' : ''}${fmt(n.text)}</div><div class="meta">${L.fmtDate(n.created)}</div></div></div>`), 'No notes yet.')}`;
}
function renderShopping() {
  const left = S.shopping.filter((s) => !s.done), got = S.shopping.filter((s) => s.done);
  const row = (s) => `<div class="item ${s.done ? 'done' : ''}"><button class="check ${s.done ? 'on' : ''}" data-a="shop" data-id="${s.id}">${s.done ? '✓' : ''}</button><div class="grow title">${esc(s.text)}</div><button class="sub" data-a="delshop" data-id="${s.id}">✕</button></div>`;
  return `<h1>🛒 Shopping list</h1><div style="height:12px"></div>
    <div class="quick"><input id="shop-new" placeholder="Add item… (comma for many: milk, eggs, bread)"><button class="btn" data-a="addshop">Add</button></div>
    <h2>To buy · ${left.length}</h2>${listOf(left.map(row), 'All bought ✨')}
    ${got.length ? `<h2>In the cart</h2>${listOf(got.map(row))}<button class="btn small ghost" data-a="clearshop">Clear bought items</button>` : ''}`;
}
function renderLearning() {
  const icons = { Watch: '🎬', Read: '📖', Learn: '🧠', Practice: '🎯' };
  const left = S.learning.filter((s) => !s.done), done = S.learning.filter((s) => s.done).slice(-10).reverse();
  const row = (s) => `<div class="item ${s.done ? 'done' : ''}"><button class="check ${s.done ? 'on' : ''}" data-a="learn" data-id="${s.id}">${s.done ? '✓' : ''}</button><div class="emoji">${icons[s.type] || '🧠'}</div><div class="grow title">${esc(s.text)}</div><button class="sub" data-a="dellearn" data-id="${s.id}">✕</button></div>`;
  return `<h1>📚 Learning</h1><div class="sub">Tutorials to watch, books to read, skills to practise</div><div style="height:12px"></div>
    <div class="seg" id="learn-type">${Object.keys(icons).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" data-a="ltype" data-v="${k}">${icons[k]} ${k}</button>`).join('')}</div>
    <div style="height:8px"></div>
    <div class="quick"><input id="learn-new" placeholder="e.g. Roger Deakins lighting masterclass"><button class="btn" data-a="addlearn">Add</button></div>
    <h2>Queue · ${left.length}</h2>${listOf(left.map(row), 'Queue is empty.')}
    ${done.length ? `<h2>Finished</h2>${listOf(done.map(row))}` : ''}`;
}
function renderJournal() {
  const k = L.dayKey(Date.now());
  const e = S.journal[k] || {};
  const past = Object.keys(S.journal).filter((d) => d !== k).sort().reverse().slice(0, 30);
  return `<h1>🌙 Journal</h1><div class="sub">Two minutes. Three lines. Every evening.</div>
    <label>✨ What went well today?</label><textarea data-j="good" rows="2" style="min-height:60px">${esc(e.good || '')}</textarea>
    <label>🔧 What will I do better tomorrow?</label><textarea data-j="better" rows="2" style="min-height:60px">${esc(e.better || '')}</textarea>
    <label>🙏 Grateful for</label><textarea data-j="grateful" rows="2" style="min-height:60px">${esc(e.grateful || '')}</textarea>
    <div class="sub" style="margin-top:6px">Saves automatically.</div>
    ${past.length ? `<h2>Past entries</h2>${past.map((d) => {
      const x = S.journal[d], dt = new Date(d + 'T12:00:00');
      return `<div class="card"><b>${L.fmtDate(dt.getTime())}</b>
        ${x.good ? `<div class="sub" style="margin-top:6px">✨ ${esc(x.good)}</div>` : ''}${x.better ? `<div class="sub">🔧 ${esc(x.better)}</div>` : ''}${x.grateful ? `<div class="sub">🙏 ${esc(x.grateful)}</div>` : ''}</div>`;
    }).join('')}` : ''}`;
}
function renderReview() {
  const now = Date.now(), from = L.addDays(L.startOfDay(now), -6);
  const log = S.log.filter((e) => e.t >= from);
  const done = log.filter((e) => e.kind === 'done'), missed = log.filter((e) => e.kind === 'missed');
  const paidIn = log.filter((e) => e.kind === 'paid' && e.dir === 'in').reduce((a, e) => a + Number(e.amount || 0), 0);
  const paidOut = log.filter((e) => e.kind === 'paid' && e.dir === 'out').reduce((a, e) => a + Number(e.amount || 0), 0);
  const overdueNow = S.reminders.filter((r) => r.status === 'pending' && !r.repeat && r.due < now);
  const byCat = {};
  done.forEach((e) => { byCat[e.cat || 'Personal'] = (byCat[e.cat || 'Personal'] || 0) + 1; });
  const maxC = Math.max(1, ...Object.values(byCat));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = L.addDays(L.startOfDay(now), -i);
    days.push({ d: d, n: done.filter((e) => e.t >= d && e.t < L.addDays(d, 1)).length });
  }
  const maxD = Math.max(1, ...days.map((x) => x.n));
  const journalDays = Object.keys(S.journal).filter((k) => k >= L.dayKey(from)).length;
  const next = S.reminders.filter((r) => r.status === 'pending' && !isHabit(r) && L.occurrencesBetween(r, now, L.addDays(now, 7), 10).length).length;
  const best = days.slice().sort((a, b) => b.n - a.n)[0];
  return `<h1>📊 Weekly review</h1><div class="sub">${L.fmtDate(from)} → today</div><div style="height:14px"></div>
    <div class="stats">
      <div class="stat"><div class="l">Done</div><div class="n">${done.length}</div></div>
      <div class="stat"><div class="l">Slipped</div><div class="n ${missed.length ? 'late' : ''}">${missed.length + overdueNow.length}</div></div>
      <div class="stat"><div class="l">Received</div><div class="n in">${L.money(paidIn)}</div></div>
      <div class="stat"><div class="l">Paid</div><div class="n out">${L.money(paidOut)}</div></div>
    </div>
    <div class="card"><h3>Your week</h3>
      <div style="display:flex;align-items:flex-end;gap:8px;height:110px;margin-top:10px">${days.map((x) => `
        <div style="flex:1;text-align:center"><div style="height:${Math.round(80 * x.n / maxD) + 4}px;border-radius:8px;background:linear-gradient(180deg,var(--accent2),var(--accent))"></div>
        <div class="sub" style="font-size:11px;margin-top:4px">${L.DAYNAME[new Date(x.d).getDay()]}</div><div style="font-size:12px">${x.n}</div></div>`).join('')}</div>
      ${best && best.n ? `<div class="sub" style="margin-top:8px">Best day: <b>${L.DAYNAME[new Date(best.d).getDay()]}</b> with ${best.n} done 🏆</div>` : ''}
    </div>
    ${Object.keys(byCat).length ? `<div class="card"><h3>Where your effort went</h3>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `
      <div style="margin-top:10px"><div class="row"><span class="grow">${L.CAT_EMOJI[c] || '✨'} ${c}</span><b>${n}</b></div><div class="bar"><i style="width:${Math.round(100 * n / maxC)}%"></i></div></div>`).join('')}</div>` : ''}
    <div class="card"><h3>Habits of the mind</h3>
      <div class="sub">🌙 Journal written ${journalDays}/7 days · 🔥 Streak ${streak()} day${streak() === 1 ? '' : 's'}</div></div>
    ${overdueNow.length ? `<h2 class="late">Still overdue: reschedule or drop</h2>${listOf(overdueNow.map((r) => remRow(r)))}` : ''}
    ${missed.length ? `<h2>Repeating items you missed</h2><div class="card sub">${[...new Set(missed.map((e) => e.task))].map(esc).join(' · ')}</div>` : ''}
    <div class="card"><h3>Next 7 days</h3><div class="sub">${next} reminder${next === 1 ? '' : 's'} coming up. ${next > 25 ? 'Busy week, so protect your Top 3 every morning.' : 'Looks manageable 👍'}</div></div>`;
}
function renderSettings() {
  const st = S.settings;
  const sel = (key, opts) => `<select data-set="${key}">${opts.map((o) => `<option value="${o[0]}" ${String(st[key]) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  return `<h1>⚙️ Settings</h1>
    <label>Your name</label><input data-set="name" value="${esc(st.name)}">
    <div class="grid2">
      <div><label>Re-remind every</label>${sel('nagMin', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min'], [60, '1 hour']])}</div>
      <div><label>Max re-reminders</label>${sel('maxNags', [[2, '2 times'], [4, '4 times'], [6, '6 times'], [8, '8 times'], [12, '12 times']])}</div>
      <div><label>Snooze button</label>${sel('snoozeMin', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 hour']])}</div>
      <div><label>Morning briefing</label><input type="time" data-set="briefTime" value="${st.briefTime}"></div>
      <div><label>Journal prompt</label><input type="time" data-set="journalTime" value="${st.journalTime}"></div>
      <div><label>Top 3 check-ins</label>${sel('top3Checks', [['true', '2pm &amp; 6pm'], ['false', 'Off']])}</div>
      <div><label>Weekly review day</label>${sel('reviewDay', L.DAYNAME.map((d, i) => [i, d]))}</div>
      <div><label>Review time</label><input type="time" data-set="reviewTime" value="${st.reviewTime}"></div>
      <div><label>Habits quiet from</label><input type="time" data-set="quietStart" value="${st.quietStart}"></div>
      <div><label>Quiet until</label><input type="time" data-set="quietEnd" value="${st.quietEnd}"></div>
    </div>
    <div class="sub" style="margin-top:8px">Quiet hours stop habit pings (water, stretch) at night. Normal reminders still ring.</div>
    <h2>Check Lucy is working</h2>
    <button class="btn block ghost" data-a="test">🔔 Send a test notification in 10 seconds</button>
    ${NATIVE ? `<div class="card" style="margin-top:10px"><div class="sub">Notifications: <b>${perm.notif}</b> · Exact alarms: <b>${perm.exact}</b></div>
      ${perm.notif !== 'granted' ? '<button class="btn small" data-a="perm-notif">Turn on notifications</button> ' : ''}${perm.exact !== 'granted' ? '<button class="btn small" data-a="perm-exact">Allow exact alarms</button>' : ''}</div>` : ''}
    <div class="card"><b>🔋 If reminders come late or not at all</b><div class="sub" style="margin-top:6px">Open phone Settings → Apps → Lucy → Battery → choose <b>Unrestricted</b>. On Xiaomi/Redmi/Realme/Oppo/Vivo also turn on <b>Autostart</b> for Lucy.</div></div>
    <div class="sub" style="text-align:center;margin-top:18px">Lucy v1.0 · made for ${esc(st.name)} 💫</div>`;
}
function renderBackup() {
  return `<h1>💾 Backup</h1>
    <div class="sub">Your data lives only on this phone. Copy a backup now and then, and paste it into WhatsApp "Message yourself" or Google Keep. If you change phones, paste it back here.</div>
    <h2>Make a backup</h2>
    <textarea id="bk-out" readonly style="min-height:110px;font-size:12px">${esc(JSON.stringify(S))}</textarea>
    <button class="btn block" data-a="copybk">📋 Copy backup</button>
    <h2>Restore a backup</h2>
    <textarea id="bk-in" placeholder="Paste your backup text here" style="font-size:12px"></textarea>
    <button class="btn block danger" data-a="restore">Restore (replaces current data)</button>`;
}

/* ============================ sheets (pop-up forms) ============================ */
function openSheet(html) { $('#sheet').innerHTML = html; $('#sheet-wrap').hidden = false; }
function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; }

function reminderSheet(r, preset) {
  const isNew = !r;
  const base = r || Object.assign({ task: '', cat: 'Personal', due: L.atTime(L.addDays(Date.now(), 0), new Date().getHours() + 1, 0), repeat: '', clientId: null }, preset || {});
  const rep = base.repeat || '';
  const every = isHabit(base) ? Number(rep.split(':')[1]) : 60;
  const repKind = isHabit(base) ? 'every' : rep;
  openSheet(`
    <h3>${isNew ? 'New reminder' : 'Edit reminder'}</h3>
    <label>What?</label><input id="f-task" value="${esc(base.task)}" placeholder="Call Mr. Ravi">
    <div class="grid2">
      <div><label>Date</label><input id="f-date" type="date" value="${toDateInput(base.due)}"></div>
      <div><label>Time</label><input id="f-time" type="time" value="${toTimeInput(base.due)}"></div>
    </div>
    <div class="grid2">
      <div><label>Repeat</label><select id="f-rep">
        ${[['', 'Never'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year'], ['every', 'Every few minutes/hours']].map((o) => `<option value="${o[0]}" ${repKind === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
      </select></div>
      <div><label>Category</label><select id="f-cat">${L.CATS.map((c) => `<option ${c === base.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div id="f-every-wrap" ${repKind === 'every' ? '' : 'hidden'}><label>Every (minutes)</label><input id="f-every" type="number" min="5" step="5" value="${every}"></div>
    <label>Client (optional)</label><select id="f-client"><option value="">None</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === base.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="btn block" data-a="saverem" data-id="${isNew ? '' : r.id}">${isNew ? 'Add reminder' : 'Save'}</button>
    ${!isNew && r.status === 'pending' ? `<div class="actions">
      <button class="btn small ghost" data-a="done" data-id="${r.id}">✅ Done</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="10">😴 10 min</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="60">😴 1 hour</button>
      <button class="btn small ghost" data-a="tomorrow" data-id="${r.id}">➡️ Tomorrow</button></div>` : ''}
    ${!isNew ? `<button class="btn block danger" data-a="delrem" data-id="${r.id}">Delete</button>` : ''}`);
}
function saveReminderFromSheet(id) {
  const task = $('#f-task').value.trim();
  if (!task) return toast('What should I remind you about?');
  const due = fromInputs($('#f-date').value, $('#f-time').value);
  let repeat = $('#f-rep').value;
  if (repeat === 'every') {
    const n = Math.max(5, Number($('#f-every').value) || 60);
    repeat = 'every:' + n;
  }
  const data = { task: task, due: due, start: due, repeat: repeat, cat: $('#f-cat').value, clientId: Number($('#f-client').value) || null };
  if (id) {
    const r = remById(id);
    Object.assign(r, data, { snoozeUntil: 0, status: 'pending' });
    if (repeat && due <= Date.now()) r.due = L.nextAfter(r, Date.now());
    save();
    toast('Saved ✓');
  } else {
    if (repeat && due <= Date.now()) { const tmp = Object.assign({}, data); data.due = L.nextAfter(tmp, Date.now()); }
    const r = addReminder(data);
    toast('Got it ✅ ' + L.fmtWhen(alertStart(r)));
  }
  closeSheet(); render();
}
function paymentSheet(p, preset) {
  const isNew = !p;
  const base = p || Object.assign({ type: view.moneyTab || 'in', party: '', amount: '', due: L.startOfDay(Date.now()), note: '', clientId: null }, preset || {});
  if (preset && preset.clientId && !base.party) base.party = (clientById(preset.clientId) || {}).name || '';
  openSheet(`
    <h3>${isNew ? 'New payment' : 'Edit payment'}</h3>
    <div class="seg" id="p-type"><button class="${base.type === 'in' ? 'on' : ''}" data-a="ptype" data-v="in">⬇️ I'll receive</button><button class="${base.type === 'out' ? 'on' : ''}" data-a="ptype" data-v="out">⬆️ I'll pay</button></div>
    <label>Who?</label><input id="p-party" list="p-clients" value="${esc(base.party)}" placeholder="Client or person">
    <datalist id="p-clients">${S.clients.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
    <div class="grid2">
      <div><label>Amount (₹)</label><input id="p-amount" type="number" inputmode="numeric" value="${esc(base.amount)}" placeholder="25000"></div>
      <div><label>Due date</label><input id="p-due" type="date" value="${toDateInput(base.due)}"></div>
    </div>
    <label>Note</label><input id="p-note" value="${esc(base.note)}" placeholder="e.g. 50% advance for reel shoot">
    <button class="btn block" data-a="savepay" data-id="${isNew ? '' : p.id}">${isNew ? 'Add' : 'Save'}</button>
    ${!isNew && p.status === 'pending' ? `<button class="btn block ghost" data-a="settle" data-id="${p.id}">${p.type === 'in' ? '✅ Mark received' : '✅ Mark paid'}</button>` : ''}
    ${!isNew ? `<button class="btn block danger" data-a="delpay" data-id="${p.id}">Delete</button>` : ''}`);
  $('#sheet').dataset.ptype = base.type;
}
function savePaymentFromSheet(id) {
  const party = $('#p-party').value.trim();
  const amount = Number($('#p-amount').value);
  if (!party || !amount) return toast('Add who and how much');
  const client = S.clients.find((c) => c.name.toLowerCase() === party.toLowerCase());
  const data = { type: $('#sheet').dataset.ptype || 'in', party: party, amount: amount, due: L.startOfDay(fromInputs($('#p-due').value, '00:00')), note: $('#p-note').value.trim(), clientId: client ? client.id : null };
  if (id) Object.assign(payById(id), data, { snoozeUntil: 0 });
  else S.payments.push(Object.assign({ id: nid(), status: 'pending', created: Date.now() }, data));
  save(); closeSheet(); render(); toast('Saved ✓');
}
function clientSheet(c) {
  const isNew = !c;
  const base = c || { name: '', business: '', phone: '' };
  openSheet(`<h3>${isNew ? 'New client' : 'Edit client'}</h3>
    <label>Name</label><input id="c-name" value="${esc(base.name)}" placeholder="e.g. Kliya Cafe">
    <label>Contact person / business</label><input id="c-biz" value="${esc(base.business)}" placeholder="e.g. Rahul, rooftop cafe">
    <label>Phone</label><input id="c-phone" type="tel" value="${esc(base.phone)}" placeholder="98xxxxxxxx">
    <button class="btn block" data-a="saveclient" data-id="${isNew ? '' : c.id}">${isNew ? 'Add client' : 'Save'}</button>
    ${!isNew ? `<button class="btn block danger" data-a="delclient" data-id="${c.id}">Delete client</button>` : ''}`);
}
function noteSheet(n) {
  openSheet(`<h3>Edit note</h3><textarea id="n-text" style="min-height:180px">${esc(n.text)}</textarea>
    <button class="btn block" data-a="savenote" data-id="${n.id}">Save</button>
    <div class="actions"><button class="btn small ghost" data-a="pinnote" data-id="${n.id}">${n.pinned ? 'Unpin' : '📌 Pin'}</button>
    <button class="btn small ghost" data-a="note2rem" data-id="${n.id}">⏰ Make it a reminder</button></div>
    <button class="btn block danger" data-a="delnote" data-id="${n.id}">Delete</button>`);
}
function onboardingSheet() {
  openSheet(`<div style="text-align:center"><div class="lucy-dot" style="width:64px;height:64px;font-size:30px;margin:6px auto 10px">L</div>
    <h3>Hi, I'm Lucy 👋</h3><div class="sub">I'll remember everything, so you don't have to.</div></div>
    <label>What should I call you?</label><input id="ob-name" value="${esc(S.settings.name)}">
    <label>Start with a few healthy habits? (you can change them later)</label>
    <div class="list">
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-water" checked style="width:auto"> 💧 Drink water every hour</label>
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-stand" checked style="width:auto"> 🧍 Stand up &amp; stretch every 45 min</label>
      <label class="item" style="text-transform:none;font-size:15px;color:var(--text);margin:0"><input type="checkbox" id="ob-gym" style="width:auto"> 🏋️ Gym every day at <input type="time" id="ob-gymtime" value="07:00" style="width:auto;padding:4px 8px;margin-left:6px"></label>
    </div>
    <div class="sub">Habit pings stay quiet from 10:30 PM to 8 AM.</div>
    <button class="btn block" data-a="obdone">Let's go ✨</button>`);
}

/* ============================ events ============================ */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, id = el.dataset.id, v = el.dataset.v;
  switch (a) {
    case 'tab': go(v); break;
    case 'close': closeSheet(); break;
    case 'back': view.sub = null; view.clientId = null; render(); break;
    case 'sub': go('more', v); break;
    case 'fab':
      if (view.tab === 'money') paymentSheet();
      else if (view.tab === 'clients' && !view.clientId) clientSheet();
      else if (view.tab === 'clients') reminderSheet(null, { cat: 'Follow-up', clientId: view.clientId });
      else if (view.sub === 'notes') { const t = $('#note-new'); if (t) t.focus(); }
      else if (view.sub === 'shopping') { const t = $('#shop-new'); if (t) t.focus(); }
      else if (view.sub === 'learning') { const t = $('#learn-new'); if (t) t.focus(); }
      else reminderSheet();
      break;
    case 'quickadd': quickAdd(); break;
    case 'done': markDone(id); closeSheet(); render(); break;
    case 'undo': undoDone(id); render(); break;
    case 'edit': { const r = remById(id); if (r) reminderSheet(r); break; }
    case 'saverem': saveReminderFromSheet(id ? Number(id) : null); break;
    case 'delrem': if (confirm('Delete this reminder?')) { deleteReminder(id); closeSheet(); render(); } break;
    case 'snz': snooze(id, Number(v)); closeSheet(); render(); break;
    case 'tomorrow': {
      const r = remById(id);
      if (r) { const t = new Date(alertStart(r)); r.snoozeUntil = 0; r.due = L.atTime(L.addDays(L.startOfDay(Date.now()), 1), t.getHours(), t.getMinutes()); if (r.repeat) r.start = r.due; save(); toast('Moved to ' + L.fmtWhen(r.due)); }
      closeSheet(); render(); break;
    }
    case 'habit': markDone(id); render(); break;
    case 'top3': {
      const i = Number(el.dataset.i);
      while (S.top3.items.length <= i) S.top3.items.push({ text: '', done: false });
      const it = S.top3.items[i];
      if (!it.text) { toast('Write your priority first'); break; }
      it.done = !it.done;
      if (it.done) { logEvent('done', { task: it.text, cat: 'Personal' }, { top3: true }); toast(S.top3.items.filter((x) => x.done).length === 3 ? '🏆 All 3 done! Big day.' : L.cheer(doneToday())); }
      save(true); render(); break;
    }
    case 'filter': view.filter = v; render(); break;
    case 'mtab': view.moneyTab = v; render(); break;
    case 'settle': settlePayment(id); closeSheet(); render(); break;
    case 'newpay': paymentSheet(null, { clientId: Number(el.dataset.cid) || null }); break;
    case 'editpay': { const p = payById(id); if (p) paymentSheet(p); break; }
    case 'ptype': document.querySelectorAll('#p-type button').forEach((b) => b.classList.toggle('on', b === el)); $('#sheet').dataset.ptype = v; break;
    case 'savepay': savePaymentFromSheet(id ? Number(id) : null); break;
    case 'delpay': if (confirm('Delete this payment?')) { S.payments = S.payments.filter((p) => p.id !== Number(id)); save(); closeSheet(); render(); } break;
    case 'client': go('clients', null, id); break;
    case 'newclient': clientSheet(); break;
    case 'editclient': clientSheet(clientById(id)); break;
    case 'saveclient': {
      const nm = $('#c-name').value.trim();
      if (!nm) { toast('Add a name'); break; }
      const data = { name: nm, business: $('#c-biz').value.trim(), phone: $('#c-phone').value.trim() };
      if (id) Object.assign(clientById(id), data);
      else { const c = Object.assign({ id: nid(), notes: '', created: Date.now() }, data); S.clients.push(c); view.clientId = c.id; }
      save(); closeSheet(); render(); break;
    }
    case 'delclient':
      if (confirm('Delete this client? Their reminders and payments stay, just unlinked.')) {
        const cid = Number(id);
        S.clients = S.clients.filter((c) => c.id !== cid);
        S.reminders.forEach((r) => { if (r.clientId === cid) r.clientId = null; });
        S.payments.forEach((p) => { if (p.clientId === cid) p.clientId = null; });
        view.clientId = null; save(); closeSheet(); render();
      }
      break;
    case 'clientadd': clientQuickAdd(Number(id)); break;
    case 'addnote': {
      const t = $('#note-new').value.trim();
      if (!t) break;
      S.notes.push({ id: nid(), text: t, created: Date.now(), pinned: false });
      save(true); render(); toast('💡 Saved'); break;
    }
    case 'editnote': { const n = S.notes.find((x) => x.id === Number(id)); if (n) noteSheet(n); break; }
    case 'savenote': { const n = S.notes.find((x) => x.id === Number(id)); n.text = $('#n-text').value; save(true); closeSheet(); render(); break; }
    case 'pinnote': { const n = S.notes.find((x) => x.id === Number(id)); n.pinned = !n.pinned; save(true); closeSheet(); render(); break; }
    case 'delnote': if (confirm('Delete this note?')) { S.notes = S.notes.filter((x) => x.id !== Number(id)); save(true); closeSheet(); render(); } break;
    case 'note2rem': { const n = S.notes.find((x) => x.id === Number(id)); closeSheet(); reminderSheet(null, { task: n.text.split('\n')[0].slice(0, 80) }); break; }
    case 'addshop': {
      const inp = $('#shop-new');
      inp.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((t) => S.shopping.push({ id: nid(), text: t, done: false }));
      save(true); render(); setTimeout(() => $('#shop-new') && $('#shop-new').focus(), 30); break;
    }
    case 'shop': { const s = S.shopping.find((x) => x.id === Number(id)); s.done = !s.done; save(true); render(); break; }
    case 'delshop': S.shopping = S.shopping.filter((x) => x.id !== Number(id)); save(true); render(); break;
    case 'clearshop': S.shopping = S.shopping.filter((x) => !x.done); save(true); render(); break;
    case 'ltype': document.querySelectorAll('#learn-type button').forEach((b) => b.classList.toggle('on', b === el)); break;
    case 'addlearn': {
      const t = $('#learn-new').value.trim();
      if (!t) break;
      const on = document.querySelector('#learn-type button.on');
      S.learning.push({ id: nid(), text: t, type: on ? on.dataset.v : 'Learn', done: false, created: Date.now() });
      save(true); render(); break;
    }
    case 'learn': {
      const s = S.learning.find((x) => x.id === Number(id));
      s.done = !s.done;
      if (s.done) { logEvent('done', { task: s.text, cat: 'Personal' }, { learning: true }); toast('🧠 Smarter already'); }
      save(true); render(); break;
    }
    case 'dellearn': S.learning = S.learning.filter((x) => x.id !== Number(id)); save(true); render(); break;
    case 'test': testNotification(); break;
    case 'perm-notif': LN.requestPermissions().then(refreshPerms).then(render); break;
    case 'perm-exact': LN.changeExactNotificationSetting().then(refreshPerms).then(() => { render(); scheduleSync(); }); break;
    case 'hidetip': S.hideTips[v] = true; save(true); render(); break;
    case 'copybk': copyText($('#bk-out').value); break;
    case 'restore': restoreBackup(); break;
    case 'obdone': finishOnboarding(); break;
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const id = ev.target.id;
  if (id === 'quick') { ev.preventDefault(); quickAdd(); }
  else if (id === 'client-quick') { ev.preventDefault(); clientQuickAdd(Number(ev.target.dataset.cid)); }
  else if (id === 'shop-new') { ev.preventDefault(); document.querySelector('[data-a="addshop"]').click(); }
  else if (id === 'learn-new') { ev.preventDefault(); document.querySelector('[data-a="addlearn"]').click(); }
  else if (ev.target.dataset.top3 !== undefined) ev.target.blur();
});
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'quick') updatePreview();
  else if (t.id === 'note-q') {
    view.noteQ = t.value;
    const pos = t.selectionStart;
    render();
    const n = $('#note-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  }
  else if (t.id === 'client-notes') { const c = clientById(t.dataset.cid); if (c) { c.notes = t.value; save(); } }
  else if (t.dataset.j) {
    const k = L.dayKey(Date.now());
    S.journal[k] = Object.assign(S.journal[k] || {}, { [t.dataset.j]: t.value });
    save(true);
  }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.top3 !== undefined) {
    const i = Number(t.dataset.top3);
    while (S.top3.items.length <= i) S.top3.items.push({ text: '', done: false });
    S.top3.items[i].text = t.value.trim();
    save(true);
  } else if (t.dataset.set) {
    const k = t.dataset.set;
    let val = t.value;
    if (['nagMin', 'maxNags', 'snoozeMin', 'reviewDay'].includes(k)) val = Number(val);
    if (k === 'top3Checks') val = val === 'true';
    S.settings[k] = val;
    save();
    if (k === 'snoozeMin') initNative();
    toast('Saved ✓');
  } else if (t.id === 'f-rep') {
    $('#f-every-wrap').hidden = t.value !== 'every';
  }
});

function quickAdd() {
  const q = $('#quick');
  const v = q.value.trim();
  if (!v) { reminderSheet(); return; }
  const r = L.parseReminder(v);
  if (!r) { reminderSheet(null, { task: v.charAt(0).toUpperCase() + v.slice(1), cat: L.guessCategory(v) }); q.value = ''; return; }
  const client = S.clients.find((c) => r.task.toLowerCase().includes(c.name.toLowerCase()));
  if (client) r.clientId = client.id;
  const rem = addReminder(r);
  q.value = '';
  render();
  toast('Got it ✅ ' + L.fmtWhen(rem.due));
}
function clientQuickAdd(cid) {
  const inp = $('#client-quick');
  const v = inp.value.trim();
  if (!v) return;
  const r = L.parseReminder(v);
  if (!r) { reminderSheet(null, { task: v, cat: 'Follow-up', clientId: cid }); return; }
  r.clientId = cid;
  if (r.cat === 'Personal' || r.cat === 'Work') r.cat = 'Follow-up';
  addReminder(r);
  render();
  toast('Follow-up set ✅ ' + L.fmtWhen(r.due));
}
async function testNotification() {
  if (!NATIVE) { toast('Test works inside the installed app'); return; }
  try {
    await LN.schedule({ notifications: [{ id: 99999, title: '🔔 Lucy here!', body: 'If you can see this, reminders are working ✨', channelId: 'lucy', smallIcon: 'ic_stat_lucy', iconColor: '#FF5A6E', schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true } }] });
    toast('Lock your phone, wait 10 seconds 🔔');
  } catch (e) { toast('Could not schedule: ' + e.message); }
}
function copyText(text) {
  const done = () => toast('📋 Copied. Paste it somewhere safe');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => { fallbackCopy(); });
  } else fallbackCopy();
  function fallbackCopy() { const t = $('#bk-out'); t.removeAttribute('readonly'); t.select(); document.execCommand('copy'); t.setAttribute('readonly', ''); done(); }
}
function restoreBackup() {
  const txt = $('#bk-in').value.trim();
  if (!txt) return toast('Paste your backup first');
  try {
    const d = JSON.parse(txt);
    if (!d || !Array.isArray(d.reminders)) throw new Error('bad');
    if (!confirm('Replace everything on this phone with the backup?')) return;
    localStorage.setItem(KEY, JSON.stringify(d));
    S = load();
    save(); go('today'); toast('✅ Restored');
  } catch (e) { toast('That doesn\'t look like a Lucy backup'); }
}
function finishOnboarding() {
  S.settings.name = ($('#ob-name').value || 'Divyesh').trim();
  const now = Date.now();
  const nextQuarter = Math.ceil((now + 5 * L.MIN) / (15 * L.MIN)) * 15 * L.MIN;
  if ($('#ob-water').checked) addReminder({ task: 'Drink water', cat: 'Health', due: nextQuarter, repeat: 'every:60' });
  if ($('#ob-stand').checked) addReminder({ task: 'Stand up & stretch', cat: 'Health', due: nextQuarter + 15 * L.MIN, repeat: 'every:45' });
  if ($('#ob-gym').checked) {
    const g = hm($('#ob-gymtime').value);
    let due = L.atTime(now, g.h, g.m);
    if (due <= now) due = L.addDays(due, 1);
    addReminder({ task: 'Gym time 🏋️', cat: 'Health', due: due, repeat: 'daily' });
  }
  S.onboarded = true;
  save();
  closeSheet();
  if (NATIVE) LN.requestPermissions().then(refreshPerms).then(render);
  render();
  toast('Welcome, ' + name() + ' ✨');
}

/* ============================ start ============================ */
(async function start() {
  normalize();
  render();
  await initNative();
  render();
  if (!S.onboarded) onboardingSheet();
  scheduleSync();
})();

// for testing in a normal browser
window.__lucy = { get S() { return S; }, buildSchedule: buildSchedule, render: render };
