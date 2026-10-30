// Lucy v2 — personal assistant app (screens, storage, alarms, celebrations)
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications as LN } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import * as L from './logic.js';
import { celebrate, setTapPoint } from './celebrate.js';

const NATIVE = Capacitor.isNativePlatform();
const Alarm = registerPlugin('LucyAlarm');
const KEY = 'lucy.data.v1';
const DEFAULTS = {
  v: 2,
  settings: {
    name: 'Divyesh', nagMin: 15, maxNags: 8, snoozeMin: 10, ringReminders: true, speak: true,
    briefTime: '08:30', top5Checks: true, journalTime: '22:00', reviewDay: 0, reviewTime: '19:00'
  },
  routine: L.ROUTINE_DEFAULT.map((r) => ({ key: r.key, emoji: r.emoji, label: r.label, time: r.time, on: true, ring: !!r.ring, speak: true })),
  routineLog: {}, reminders: [], clients: [], payments: [], ideas: [], notes: [], shopping: [], learning: [],
  journal: {}, log: [], celebrated: {}, seq: 1, onboarded: false
};

/* ============================ storage ============================ */
let S = load();
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { console.error(e); }
  if (!d) return clone(DEFAULTS);
  return migrate(d);
}
function migrate(d) {
  const out = Object.assign(clone(DEFAULTS), d);
  out.settings = Object.assign(clone(DEFAULTS.settings), d.settings || {});
  if (!d.v || d.v < 2) {
    out.reminders = (d.reminders || []).filter((r) => !(String(r.repeat || '').startsWith('every:')) && r.task !== 'Gym time 🏋️');
    out.ideas = (d.notes || []).map((n) => ({ id: n.id, text: n.text, scope: 'company', clientId: null, created: n.created, pinned: n.pinned }));
    out.notes = [];
    out.clients = (d.clients || []).map((c) => ({
      id: c.id, firstName: '', lastName: '', personalPhone: c.phone || '', company: c.name || '', businessType: c.business || '',
      address: '', companyPhone: '', work: '', pkg: '', email: '', instagram: '', facebook: '', gmb: '', notes: c.notes || '', created: c.created
    }));
    out.shopping = (d.shopping || []).map((s) => Object.assign({ cat: 'Personal', created: Date.now() }, s));
    const map = { Watch: 'YouTube', Read: 'Books', Learn: 'AI', Practice: 'Practice' };
    out.learning = (d.learning || []).map((s) => Object.assign({}, s, { cat: map[s.type] || s.cat || 'AI' }));
    delete out.top3; delete out.hideTips;
    out.v = 2;
  }
  if (!Array.isArray(out.routine) || !out.routine.length) out.routine = clone(DEFAULTS.routine);
  return out;
}
function save(noSync) {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save 😟'); }
  if (!noSync) scheduleSync();
}
function nid() { return S.seq++; }
function logEvent(kind, extra) {
  S.log.push(Object.assign({ t: Date.now(), kind: kind }, extra || {}));
  if (S.log.length > 3000) S.log = S.log.slice(-2500);
}

/* ============================ helpers ============================ */
const $ = (s) => document.querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hm(str) { const p = String(str || '0:0').split(':'); return { h: +p[0] || 0, m: +p[1] || 0 }; }
function toTimeInput(ms) { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function fromInputs(dateStr, timeStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const t = hm(timeStr || '09:00');
  return new Date(y, (mo || 1) - 1, d || 1, t.h, t.m, 0, 0).getTime();
}
function fmtHM(hhmm) { const t = hm(hhmm); return L.fmtTime(L.atTime(Date.now(), t.h, t.m)); }
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
const name = () => (S.settings.name || '').trim() || 'there';
const clientById = (id) => S.clients.find((c) => c.id === Number(id));
const clientName = (c) => c ? (c.company || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Client') : '';
const personName = (c) => c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : '';
const remById = (id) => S.reminders.find((r) => r.id === Number(id));
const payById = (id) => S.payments.find((p) => p.id === Number(id));
const isCal = (r) => ['daily', 'weekly', 'monthly', 'yearly'].includes(r.repeat);
const alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);
const nagEnd = (r) => alertStart(r) + S.settings.maxNags * S.settings.nagMin * L.MIN;
const today = () => L.dayKey(Date.now());
const routineDone = (day) => S.routineLog[day || today()] || [];
function doneToday() {
  const d0 = L.startOfDay(Date.now());
  return S.log.filter((e) => (e.kind === 'done' || e.kind === 'paid' || e.kind === 'routine') && e.t >= d0).length;
}
function streak() {
  const days = new Set(S.log.filter((e) => e.kind === 'done' || e.kind === 'routine' || e.kind === 'paid').map((e) => L.dayKey(e.t)));
  let n = 0, d = Date.now();
  if (!days.has(L.dayKey(d))) d = L.addDays(d, -1);
  while (days.has(L.dayKey(d))) { n++; d = L.addDays(d, -1); }
  return n;
}
function speakNow(text) { if (NATIVE && S.settings.speak) Alarm.speak({ text: text }).catch(() => {}); }

/* ============================ Top 5 (picked by Lucy) ============================ */
function topFive() {
  const now = Date.now(), end = L.addDays(L.startOfDay(now), 1), end2 = L.addDays(end, 1);
  const items = [];
  S.reminders.forEach((r) => {
    if (r.status !== 'pending') return;
    const t = alertStart(r);
    if (t >= end2) return;
    let score;
    if (t < now) score = 1000 + Math.min(300, (now - t) / L.MIN / 10);
    else if (t < end) score = ({ Meeting: 800, Money: 700, 'Follow-up': 650, Work: 550 })[r.cat] || 450;
    else score = 100;
    score -= Math.max(0, (t - now) / 3600000) * 4;
    items.push({ kind: 'rem', id: r.id, score: score, t: t, tomorrow: t >= end });
  });
  S.payments.forEach((p) => {
    if (p.status !== 'pending') return;
    const t = L.atTime(p.due, 10, 0);
    if (t >= end2) return;
    const score = p.due < L.startOfDay(now) ? 1000 : (t < end ? (p.type === 'in' ? 720 : 700) : 100);
    items.push({ kind: 'pay', id: p.id, score: score, t: t, tomorrow: t >= end });
  });
  items.sort((a, b) => b.score - a.score || a.t - b.t);
  return items.slice(0, 5);
}
function todayPendingCount() { return topFive().filter((x) => !x.tomorrow).length; }
function checkAllClear(before) {
  const k = today();
  S.celebrated[k] = S.celebrated[k] || {};
  if (before > 0 && todayPendingCount() === 0 && !S.celebrated[k].top5) {
    S.celebrated[k].top5 = true;
    save(true);
    setTimeout(() => celebrate('big', { icon: '🏆', title: 'Top 5 cleared!', sub: 'Everything for today is done, ' + name() + '. Legend move.' }), 350);
    speakNow('Amazing work ' + name() + '. Everything for today is done.');
  }
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
function markDone(id, quiet) {
  const r = remById(id);
  if (!r || r.status !== 'pending') return;
  const before = todayPendingCount();
  logEvent('done', { task: r.task, cat: r.cat, clientId: r.clientId });
  if (r.repeat) {
    r.due = L.nextAfter(r, Math.max(r.due, Date.now()));
    r.snoozeUntil = 0;
    if (!quiet) toast(L.cheer(doneToday()) + ' Next: ' + L.fmtWhen(r.due));
  } else {
    r.status = 'done'; r.doneAt = Date.now();
    if (!quiet) toast(L.cheer(doneToday()));
  }
  save();
  if (!quiet) { celebrate('small'); buzz(30); }
  checkAllClear(before);
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
  save();
  toast('😴 Snoozed till ' + L.fmtTime(r.snoozeUntil));
}
function deleteReminder(id) { S.reminders = S.reminders.filter((r) => r.id !== Number(id)); save(); }
function normalize() {
  const now = Date.now();
  let changed = false;
  S.reminders.forEach((r) => {
    if (r.status !== 'pending' || !r.repeat) return;
    if (String(r.repeat).startsWith('every:') && r.due <= now) { r.due = L.nextAfter(r, now); changed = true; return; }
    if (isCal(r) && nagEnd(r) < now) {
      logEvent('missed', { task: r.task, cat: r.cat, clientId: r.clientId });
      r.due = L.nextAfter(r, now); r.snoozeUntil = 0; changed = true;
    }
  });
  if (changed) save(true);
}
function findClash(due, excludeId) {
  const from = due - 30 * L.MIN, to = due + 30 * L.MIN + 1;
  return S.reminders.filter((r) => r.status === 'pending' && r.id !== excludeId && L.occurrencesBetween(r, from, to, 2).length)
    .map((r) => ({ r: r, at: L.occurrencesBetween(r, from, to, 1)[0] }));
}

/* ============================ routine ============================ */
function routineToggle(key) {
  const k = today();
  const list = S.routineLog[k] = S.routineLog[k] || [];
  const item = S.routine.find((x) => x.key === key);
  if (list.includes(key)) {
    S.routineLog[k] = list.filter((x) => x !== key);
    for (let i = S.log.length - 1; i >= 0; i--) { if (S.log[i].kind === 'routine' && S.log[i].key === key && L.dayKey(S.log[i].t) === k) { S.log.splice(i, 1); break; } }
    save(); return;
  }
  list.push(key);
  logEvent('routine', { key: key, task: item ? item.label : key, cat: 'Health' });
  save();
  celebrate('small'); buzz(25);
  const active = S.routine.filter((x) => x.on);
  S.celebrated[k] = S.celebrated[k] || {};
  if (active.length && active.every((x) => S.routineLog[k].includes(x.key)) && !S.celebrated[k].routine) {
    S.celebrated[k].routine = true; save(true);
    setTimeout(() => celebrate('big', { icon: '🌟', title: 'Routine complete!', sub: 'All ' + active.length + ' habits done today. Your body says thank you.' }), 300);
    speakNow('Wow ' + name() + '. Your full routine is complete today.');
  } else toast(item ? item.emoji + ' ' + item.label + ' ✓' : 'Done ✓');
}

/* ============================ payments ============================ */
function settlePayment(id, quiet) {
  const p = payById(id);
  if (!p || p.status !== 'pending') return;
  const before = todayPendingCount();
  p.status = 'settled'; p.settledAt = Date.now();
  logEvent('paid', { task: (p.type === 'in' ? 'Received ' : 'Paid ') + L.money(p.amount) + (p.type === 'in' ? ' from ' : ' to ') + p.party, cat: 'Money', amount: p.amount, dir: p.type, clientId: p.clientId });
  save();
  if (!quiet) {
    if (p.type === 'in') { celebrate('rain', { emoji: ['💰', '💵', '🪙'] }); toast('💰 Money in! ' + L.money(p.amount)); buzz([40, 60, 40]); }
    else { celebrate('small'); toast('✅ Paid ' + L.money(p.amount)); }
  }
  checkAllClear(before);
}

/* ============================ alarms (native) ============================ */
let syncTimer;
function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 700); }
let syncing = false, syncAgain = false;
async function sync() {
  if (!NATIVE) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    await applyNativeActions(true);
    normalize();
    await Alarm.setSpeak({ on: !!S.settings.speak });
    await Alarm.setAll({ alarms: buildSchedule() });
  } catch (e) { console.error('sync failed', e); }
  syncing = false;
  if (syncAgain) { syncAgain = false; sync(); }
}
function hashId(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return 100000 + (Math.abs(h) % 700000); }
function buildSchedule() {
  const st = S.settings, now = Date.now(), horizon = L.addDays(now, 7);
  const out = [];
  const push = (o) => { if (o.at > now + 2000 && o.at <= horizon) out.push(o); };
  const nm = name();

  S.reminders.forEach((r) => {
    if (r.status !== 'pending') return;
    const client = r.clientId ? clientById(r.clientId) : null;
    const who = client ? ' · ' + clientName(client) : '';
    const emoji = L.taskEmoji(r.task, r.cat);
    const occs = [r.due].concat(r.repeat ? L.occurrencesBetween(r, r.due + 1, horizon, 30) : []);
    occs.forEach((occ, oi) => {
      const group = 'rem:' + r.id + ':' + occ;
      const start = oi === 0 ? alertStart(r) : occ;
      const next = occs[oi + 1] || Infinity;
      for (let k = 0; k <= st.maxNags; k++) {
        const t = start + k * st.nagMin * L.MIN;
        if (t >= next) break;
        const n = L.nagText(nm, emoji + ' ' + r.task + who, k, st.maxNags);
        push({ at: t, title: n.title, body: n.body, group: group, notifId: hashId(group), insistent: !!st.ringReminders, actions: 'REMIND', snoozeMin: st.snoozeMin,
          speech: k === 0 ? nm + ', reminder. ' + r.task + (client ? ', with ' + clientName(client) : '') : (k % 2 === 1 ? nm + ', still pending. ' + r.task : ''),
          extra: { kind: 'rem', rid: r.id, occ: occ } });
      }
      if (oi === 0 && r.cat === 'Meeting' && client && client.notes) {
        push({ at: start - 30 * L.MIN, title: '🤝 In 30 min: ' + r.task, body: client.notes.slice(0, 300), group: 'prep:' + r.id, channel: 'remind',
          speech: nm + ', in 30 minutes, ' + r.task + '.', extra: { kind: 'client', cid: client.id } });
      }
    });
  });

  for (let i = 0; i < 7; i++) {
    const day = L.addDays(L.startOfDay(now), i), dk = L.dayKey(day);
    S.routine.forEach((it) => {
      if (!it.on || routineDone(dk).includes(it.key)) return;
      const t = hm(it.time), at = L.atTime(day, t.h, t.m);
      const def = L.ROUTINE_DEFAULT.find((d) => d.key === it.key);
      const say = def ? L.fill(def.say, { name: nm, time: L.spokenTime(it.time) }) : nm + ', time for ' + it.label;
      const group = 'routine:' + it.key + ':' + dk;
      push({ at: at, title: it.emoji + ' ' + it.label, body: it.ring ? 'Tap Done to stop the alarm.' : fmtHM(it.time) + ' · tap Done when finished',
        group: group, notifId: hashId(group), insistent: !!it.ring, actions: 'REMIND', snoozeMin: st.snoozeMin, channel: 'remind',
        speech: it.speak ? say : '', extra: { kind: 'routine', key: it.key, day: dk } });
    });
  }

  S.payments.forEach((p) => {
    if (p.status !== 'pending') return;
    const verb = p.type === 'in' ? 'Collect ' + L.money(p.amount) + ' from ' + p.party : 'Pay ' + L.money(p.amount) + ' to ' + p.party;
    const spoken = p.type === 'in' ? 'collect ' + Math.round(p.amount) + ' rupees from ' + p.party : 'pay ' + Math.round(p.amount) + ' rupees to ' + p.party;
    const from = p.snoozeUntil || 0;
    const dayBefore = L.atTime(L.addDays(p.due, -1), 19, 0);
    if (dayBefore >= from) push({ at: dayBefore, title: '💰 Tomorrow: ' + verb, body: p.note || 'Heads-up from Lucy', channel: 'remind', group: 'payb:' + p.id, extra: { kind: 'pay', pid: p.id } });
    for (let i = 0; i < 7; i++) {
      const t = L.atTime(L.addDays(p.due, i), 10, 0);
      if (t < from) continue;
      const group = 'pay:' + p.id + ':' + i;
      push({ at: t, title: i === 0 ? '💰 Today: ' + verb : '⚠️ Overdue ' + i + 'd: ' + verb, body: p.note || (p.type === 'in' ? 'Time to follow up 📞' : 'Don\'t let it slip'),
        group: group, notifId: hashId('pay:' + p.id), insistent: !!st.ringReminders, actions: 'PAY', speech: nm + ', today, ' + spoken + '.', extra: { kind: 'pay', pid: p.id } });
    }
  });

  for (let i = 0; i < 7; i++) {
    const day = L.addDays(L.startOfDay(now), i);
    const b = hm(st.briefTime), bAt = L.atTime(day, b.h, b.m);
    const brief = briefText(day);
    push({ at: bAt, title: '☀️ ' + L.greeting(nm, bAt), body: brief, channel: 'quiet', group: 'brief', speech: L.greeting(nm, bAt) + '. ' + brief.replace(/•/g, '. ').replace(/₹/g, 'rupees '), extra: { kind: 'open', tab: 'today' } });
    if (st.top5Checks) {
      [14, 18].forEach((h) => push({ at: L.atTime(day, h, 0), title: '🎯 Top 5 check-in', body: h === 14 ? 'Halfway through the day. How is your Top 5 going?' : 'Evening check: clear your Top 5 before the day ends.', channel: 'quiet', group: 'check', extra: { kind: 'open', tab: 'today' } }));
    }
    const j = hm(st.journalTime);
    push({ at: L.atTime(day, j.h, j.m), title: '🌙 Journal time', body: 'Five calm minutes. ' + L.JOURNAL_QS.length + ' questions about your day.', channel: 'quiet', group: 'journal', extra: { kind: 'open', tab: 'more', sub: 'journal' } });
    if (new Date(day).getDay() === Number(st.reviewDay)) {
      const rv = hm(st.reviewTime);
      push({ at: L.atTime(day, rv.h, rv.m), title: '📊 Your weekly review is ready', body: 'Personal, company, shopping and ideas: see your week.', channel: 'quiet', group: 'review', extra: { kind: 'open', tab: 'more', sub: 'review' } });
    }
  }

  out.sort((a, b) => a.at - b.at);
  return out.slice(0, 450).map((n, i) => Object.assign({ id: i + 1 }, n));
}
function briefText(day) {
  const end = L.addDays(day, 1);
  const rems = S.reminders.filter((r) => r.status === 'pending' && L.occurrencesBetween(r, day, end, 3).length);
  const pays = S.payments.filter((p) => p.status === 'pending' && p.due < end);
  const collect = pays.filter((p) => p.type === 'in').reduce((a, p) => a + Number(p.amount), 0);
  const pay = pays.filter((p) => p.type === 'out').reduce((a, p) => a + Number(p.amount), 0);
  const parts = [];
  if (rems.length) parts.push(rems.length + ' reminder' + (rems.length > 1 ? 's' : '') + ': ' + rems.slice(0, 3).map((r) => r.task).join(', ') + (rems.length > 3 ? '…' : ''));
  if (collect) parts.push(L.money(collect) + ' to collect');
  if (pay) parts.push(L.money(pay) + ' to pay');
  if (!parts.length) parts.push('A clear day. Focus on your routine and creative work');
  return parts.join(' • ');
}
async function applyNativeActions(silent) {
  if (!NATIVE) return;
  let list = [];
  try { list = JSON.parse((await Alarm.takeActions()).json || '[]'); } catch (e) { return; }
  if (!list.length) return;
  list.forEach((a) => {
    const ex = a.extra || {};
    if (ex.kind === 'rem') {
      const r = remById(ex.rid);
      if (!r || r.status !== 'pending' || (r.repeat && r.due !== ex.occ)) return;
      if (a.act === 'done') markDone(r.id, true);
      else if (a.act === 'snooze' && a.until) r.snoozeUntil = a.until;
    } else if (ex.kind === 'routine') {
      if (a.act === 'done') {
        const lst = S.routineLog[ex.day] = S.routineLog[ex.day] || [];
        if (!lst.includes(ex.key)) { lst.push(ex.key); logEvent('routine', { key: ex.key, task: (S.routine.find((x) => x.key === ex.key) || {}).label || ex.key, cat: 'Health', t: a.t }); }
      }
    } else if (ex.kind === 'pay') {
      const p = payById(ex.pid);
      if (!p) return;
      if (a.act === 'done') settlePayment(p.id, true);
      else if (a.act === 'snooze') p.snoozeUntil = L.startOfDay(L.addDays(Date.now(), 1));
    }
  });
  save(true);
  if (!silent) render();
}

/* ============================ permissions ============================ */
let perm = { notif: 'granted', exact: 'granted', battery: true };
async function refreshPerms() {
  if (!NATIVE) return;
  try { perm.notif = (await LN.checkPermissions()).display; } catch (e) {}
  try { perm.exact = (await LN.checkExactNotificationSetting()).exact_alarm; } catch (e) {}
  try { perm.battery = (await Alarm.batteryStatus()).ignoring; } catch (e) {}
}
async function initNative() {
  if (!NATIVE) return;
  try {
    Alarm.addListener('actions', () => applyNativeActions(false).then(scheduleSync));
    App.addListener('resume', async () => { await applyNativeActions(true); normalize(); await refreshPerms(); render(); scheduleSync(); });
    App.addListener('backButton', () => {
      if (!$('#sheet-wrap').hidden) { closeSheet(); render(); return; }
      if (view.sub || view.clientId) { view.sub = null; view.clientId = null; render(); return; }
      if (view.tab !== 'today') { go('today'); return; }
      App.minimizeApp();
    });
    try { const p = await LN.getPending(); if (p.notifications.length) await LN.cancel({ notifications: p.notifications.map((n) => ({ id: n.id })) }); } catch (e) {}
    await refreshPerms();
    if (perm.notif !== 'granted' && S.onboarded) { await LN.requestPermissions(); await refreshPerms(); }
    await applyNativeActions(true);
  } catch (e) { console.error(e); }
}

/* ============================ navigation ============================ */
const view = { tab: 'today', sub: null, clientId: null, filter: 'All', moneyTab: 'in', ideaTab: 'company', ideaQ: '', shopCat: 'Personal', learnCat: 'AI', reviewTab: 'personal' };
function go(tab, sub, clientId) {
  view.tab = tab; view.sub = sub || null; view.clientId = clientId ? Number(clientId) : null;
  closeSheet(); render(); window.scrollTo(0, 0);
}
function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === view.tab));
  const screens = { today: renderToday, reminders: renderReminders, clients: renderClients, money: renderMoney, more: renderMore };
  $('#app').innerHTML = (screens[view.tab] || renderToday)();
  const fab = view.tab !== 'more' || ['ideas', 'notes', 'shopping', 'learning'].includes(view.sub);
  if (fab && !$('.fab')) document.body.insertAdjacentHTML('beforeend', '<button class="fab" data-a="fab" aria-label="Add">+</button>');
  if (!fab && $('.fab')) $('.fab').remove();
}

/* ============================ shared bits ============================ */
function catStyle(cat) { return `style="--c:${L.CAT_COLOR[cat] || '#7C5CFF'}"`; }
function remRow(r, opts) {
  opts = opts || {};
  const now = Date.now();
  const client = r.clientId ? clientById(r.clientId) : null;
  const t = alertStart(r);
  const late = r.status === 'pending' && t < now;
  const soon = !late && r.status === 'pending' && t - now < 60 * L.MIN;
  const when = r.status === 'done' ? 'Done ' + L.fmtWhen(r.doneAt || r.due) : (opts.timeOnly ? L.fmtTime(t) : L.fmtWhen(t));
  const meta = [when];
  if (r.repeat) meta.push('🔁 ' + L.repeatLabel(r));
  if (client) meta.push('🤝 ' + clientName(client));
  if (r.snoozeUntil > now) meta.push('😴 snoozed');
  return `<div class="item cat ${opts.cls || ''} ${r.status === 'done' ? 'done' : ''}" ${catStyle(r.cat)}>
    <button class="check ${r.status === 'done' ? 'on' : ''}" data-a="${r.status === 'done' ? 'undo' : 'done'}" data-id="${r.id}">${r.status === 'done' ? '✓' : ''}</button>
    <div class="bubble">${L.taskEmoji(r.task, r.cat)}</div>
    <div class="grow" data-a="edit" data-id="${r.id}">
      <div class="title">${esc(r.task)}</div>
      <div class="meta ${late ? 'late' : soon ? 'soon' : ''}">${esc(meta.join(' · '))}</div>
    </div></div>`;
}
function payRow(p, opts) {
  opts = opts || {};
  const now = Date.now();
  const late = p.status === 'pending' && L.atTime(p.due, 23, 59) < now;
  const dueTxt = p.status === 'settled' ? 'Settled ' + L.fmtDate(p.settledAt) : (late ? 'Overdue · ' : 'Due ') + L.fmtDate(p.due);
  return `<div class="item cat ${opts.cls || ''}" ${catStyle('Money')}>
    ${opts.check ? `<button class="check" data-a="settle" data-id="${p.id}"></button>` : ''}
    <div class="bubble">${p.type === 'in' ? '⬇️' : '⬆️'}</div>
    <div class="grow" data-a="editpay" data-id="${p.id}">
      <div class="title">${opts.check ? (p.type === 'in' ? 'Collect from ' : 'Pay ') : ''}${esc(p.party)}</div>
      <div class="meta ${late ? 'late' : ''}">${esc(dueTxt)}${p.note ? ' · ' + esc(p.note) : ''}</div>
    </div>
    <div style="text-align:right">
      <div class="amount ${p.type}">${L.money(p.amount)}</div>
      ${p.status === 'pending' && !opts.check ? `<button class="link" data-a="settle" data-id="${p.id}">${p.type === 'in' ? 'Received' : 'Paid'}</button>` : ''}
    </div></div>`;
}
const listOf = (rows, emptyMsg) => rows.length ? `<div class="list">${rows.join('')}</div>` : (emptyMsg ? `<div class="empty">${emptyMsg}</div>` : '');

/* ============================ TODAY ============================ */
function renderToday() {
  const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1);
  const top = topFive();
  const topIds = new Set(top.filter((x) => x.kind === 'rem').map((x) => x.id));
  const topPay = new Set(top.filter((x) => x.kind === 'pay').map((x) => x.id));
  const pendingToday = S.reminders.filter((r) => r.status === 'pending' && alertStart(r) < d1 && !topIds.has(r.id)).sort((a, b) => alertStart(a) - alertStart(b));
  const doneT = S.reminders.filter((r) => r.status === 'done' && r.doneAt >= d0);
  const pays = S.payments.filter((p) => p.status === 'pending' && p.due < L.addDays(d0, 3) && !topPay.has(p.id)).sort((a, b) => a.due - b.due);
  const left = todayPendingCount() + pendingToday.length;
  const st = streak(), dn = doneToday();
  const act = S.routine.filter((x) => x.on), rdone = routineDone();
  const rCount = act.filter((x) => rdone.includes(x.key)).length;
  let mood;
  if (!S.reminders.length && !S.payments.length) mood = 'Tap + to give me your first reminder. I\'ll handle the rest ✨';
  else if (left === 0) mood = dn ? 'All clear for today. Proud of you ✨' : 'Nothing pending today. Enjoy the calm ☕';
  else if (top.filter((x) => x.score >= 1000).length >= 3) mood = 'A few things are overdue. Let\'s clear them one by one 💪';
  else mood = left + ' thing' + (left > 1 ? 's' : '') + ' on today\'s list. You\'ve got this.';

  const tnow = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const mins = (it) => { const t = hm(it.time); return t.h * 60 + t.m; };
  const dueItems = act.filter((it) => mins(it) <= tnow && !rdone.includes(it.key)).slice(-3);
  const nextItems = act.filter((it) => mins(it) > tnow && !rdone.includes(it.key)).slice(0, 6 - dueItems.length);
  const rRows = dueItems.concat(nextItems).map((it) => `
    <button class="rchip ${mins(it) <= tnow ? 'due' : ''}" data-a="routine" data-k="${it.key}">
      <span class="remo">${it.emoji}</span><span class="rt">${fmtHM(it.time)}</span><span class="rl">${esc(it.label)}</span>
    </button>`).join('');

  const topRows = top.map((x) => {
    if (x.kind === 'pay') return payRow(payById(x.id), { check: true, cls: 'top' });
    const r = remById(x.id);
    return remRow(r, { timeOnly: !x.tomorrow && alertStart(r) >= d0, cls: 'top' + (x.tomorrow ? ' tmr' : '') });
  });

  return `
    ${banners()}
    <div class="hero">
      <div class="lucy-badge"><div class="lucy-face">☺</div>Lucy · ${L.DAYNAME[new Date(now).getDay()]}, ${new Date(now).getDate()} ${L.MON[new Date(now).getMonth()]}</div>
      <h1>${esc(L.greeting(name(), now))}</h1>
      <div class="sub">${esc(mood)}</div>
      <div class="chips"><span class="chip">✅ ${dn} done today</span>${st > 1 ? `<span class="chip">🔥 ${st}-day streak</span>` : ''}${act.length ? `<span class="chip">🌿 Routine ${rCount}/${act.length}</span>` : ''}</div>
    </div>

    <h2>🎯 Top 5 · picked by Lucy</h2>
    ${topRows.length ? `<div class="list">${topRows.join('')}</div>` : `<div class="empty card">Nothing urgent. Your Top 5 fills up automatically from your reminders, follow-ups and payments.</div>`}

    ${act.length ? `<h2>🌿 Daily routine · ${rCount}/${act.length}</h2>
      <div class="bar big"><i style="width:${Math.round(100 * rCount / act.length)}%"></i></div>
      <div class="rgrid">${rRows || '<div class="empty">Routine finished for today 🌟</div>'}</div>` : ''}

    ${pendingToday.length ? `<h2>📅 Also today</h2>${listOf(pendingToday.map((r) => remRow(r, { timeOnly: alertStart(r) >= d0 })))}` : ''}
    ${pays.length ? `<h2>💰 Money due soon</h2>${listOf(pays.map((p) => payRow(p)))}` : ''}
    ${doneT.length ? `<h2>✅ Done today</h2>${listOf(doneT.map((r) => remRow(r)))}` : ''}
  `;
}
function banners() {
  if (!NATIVE) return '';
  let h = '';
  if (perm.notif !== 'granted') h += `<div class="banner">🔕 Notifications are off, so I can't remind you.<br><button class="btn small" data-a="perm-notif">Turn on notifications</button></div>`;
  if (perm.exact && perm.exact !== 'granted') h += `<div class="banner">⏱ Allow "Alarms &amp; reminders" so I ring exactly on time.<br><button class="btn small" data-a="perm-exact">Allow</button></div>`;
  if (!perm.battery) h += `<div class="banner">🔋 <b>Important:</b> let Lucy run in the background, or your phone may silence my alarms.<br><button class="btn small" data-a="battery">Allow background running</button></div>`;
  return h;
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
  const count = (x) => S.reminders.filter((r) => r.status === 'pending' && (x === 'All' || (x === 'Repeating' ? !!r.repeat : r.cat === x))).length;
  const filters = ['All'].concat(L.CATS, ['Repeating']);
  const body = groups.filter((g) => g[1].length).map((g) => `<h2 class="${g[0].includes('Overdue') ? 'late' : ''}">${g[0]}</h2>${listOf(g[1].map((r) => remRow(r)))}`).join('');
  return `
    <h1>Reminders</h1><div class="sub">${pend.length} pending${f !== 'All' ? ' in ' + f : ''}</div>
    <div class="fgrid">${filters.map((x) => `<button class="ftab ${x === f ? 'on' : ''}" data-a="filter" data-v="${x}" ${x !== 'All' && x !== 'Repeating' ? catStyle(x) : ''}>
      <span>${x === 'All' ? '📋' : x === 'Repeating' ? '🔁' : L.CAT_EMOJI[x]}</span><b>${x}</b><small>${count(x)}</small></button>`).join('')}</div>
    ${body || '<div class="empty">Nothing here yet. Tap + to add a reminder.</div>'}
    ${done.length ? `<h2>✅ Recently done</h2>${listOf(done.map((r) => remRow(r)))}` : ''}
  `;
}

/* ============================ CLIENTS ============================ */
function renderClients() {
  if (view.clientId) return renderClient(clientById(view.clientId));
  const rows = S.clients.slice().sort((a, b) => clientName(a).localeCompare(clientName(b))).map((c, i) => {
    const fu = S.reminders.filter((r) => r.clientId === c.id && r.status === 'pending').length;
    const due = S.payments.filter((p) => p.status === 'pending' && p.clientId === c.id && p.type === 'in').reduce((a, p) => a + Number(p.amount), 0);
    const hue = ['#3A86FF', '#7C5CFF', '#FF5CA8', '#19C6B7', '#FF8A00', '#12B886'][i % 6];
    return `<div class="item" data-a="client" data-id="${c.id}">
      <div class="avatar" style="background:${hue}">${esc(clientName(c).charAt(0).toUpperCase())}</div>
      <div class="grow"><div class="title">${esc(clientName(c))}</div>
      <div class="meta">${esc([c.businessType, personName(c)].filter(Boolean).join(' · ') || 'Client')}${fu ? ' · ' + fu + ' follow-up' + (fu > 1 ? 's' : '') : ''}${due ? ' · ' + L.money(due) + ' due' : ''}</div></div><span class="sub">›</span></div>`;
  });
  return `<h1>Clients</h1><div class="sub">${S.clients.length} client${S.clients.length === 1 ? '' : 's'} · follow-ups, notes and money</div>
    <button class="btn block" data-a="newclient">+ Add client</button>
    <h2>All clients</h2>${listOf(rows, 'No clients yet. Add your first one above.')}`;
}
function linkUrl(kind, v) {
  v = String(v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, '');
  if (kind === 'instagram') return 'https://instagram.com/' + h;
  if (kind === 'facebook') return 'https://facebook.com/' + h;
  if (kind === 'gmb') return 'https://www.google.com/search?q=' + encodeURIComponent(v);
  return v;
}
function telOf(p) { return String(p || '').replace(/[^\d+]/g, ''); }
function waOf(p) { const t = telOf(p); return t.startsWith('+') ? t.slice(1) : (t.length === 10 ? '91' + t : t); }
function renderClient(c) {
  if (!c) { view.clientId = null; return renderClients(); }
  const rems = S.reminders.filter((r) => r.clientId === c.id && r.status === 'pending').sort((a, b) => alertStart(a) - alertStart(b));
  const doneR = S.reminders.filter((r) => r.clientId === c.id && r.status === 'done').slice(-5).reverse();
  const pays = S.payments.filter((p) => p.clientId === c.id).sort((a, b) => (a.status === b.status ? a.due - b.due : a.status === 'pending' ? -1 : 1));
  const btn = (href, label, cls) => href ? `<a class="btn small ${cls || 'ghost'}" href="${esc(href)}">${label}</a>` : '';
  const details = [
    ['👤', 'Contact person', personName(c)], ['📱', 'Personal number', c.personalPhone], ['🏷️', 'Business type', c.businessType],
    ['📍', 'Address', c.address], ['☎️', 'Company number', c.companyPhone], ['🎬', 'Work we do', c.work], ['📦', 'Package', c.pkg], ['✉️', 'Email', c.email]
  ].filter((d) => d[2]);
  return `
    <button class="back" data-a="back">‹ Clients</button>
    <div class="hero"><h1>${esc(clientName(c))}</h1>
      <div class="sub">${esc([c.businessType, personName(c)].filter(Boolean).join(' · '))}</div>
      <div class="actions">
        ${btn(c.personalPhone ? 'tel:' + telOf(c.personalPhone) : '', '📞 Call', 'solid')}
        ${btn(c.companyPhone ? 'tel:' + telOf(c.companyPhone) : '', '☎️ Office')}
        ${btn(c.personalPhone || c.companyPhone ? 'https://wa.me/' + waOf(c.personalPhone || c.companyPhone) : '', '💬 WhatsApp')}
        ${btn(c.email ? 'mailto:' + c.email : '', '✉️ Email')}
        ${btn(linkUrl('instagram', c.instagram), '📸 Instagram')}
        ${btn(linkUrl('facebook', c.facebook), '👍 Facebook')}
        ${btn(linkUrl('gmb', c.gmb), '📍 Google')}
        <button class="btn small ghost" data-a="editclient" data-id="${c.id}">✏️ Edit</button>
      </div>
    </div>
    ${details.length ? `<div class="list">${details.map((d) => `<div class="item"><div class="bubble plain">${d[0]}</div><div class="grow"><div class="meta">${d[1]}</div><div class="title" style="font-weight:500">${esc(d[2])}</div></div></div>`).join('')}</div>` : ''}
    <h2>📝 Notes &amp; meeting prep</h2>
    <textarea id="client-notes" data-cid="${c.id}" placeholder="What do they want? Budget? Last discussion? Lucy reads this to you 30 minutes before any meeting with ${esc(clientName(c))}.">${esc(c.notes || '')}</textarea>
    <h2>📞 Follow-ups</h2>
    <div class="quick"><input id="client-quick" placeholder="e.g. monday 11am send quotation" data-cid="${c.id}"><button class="btn" data-a="clientadd" data-id="${c.id}">Add</button></div>
    <div style="height:8px"></div>
    ${listOf(rems.map((r) => remRow(r)), 'No pending follow-ups.')}
    <h2>💰 Payments</h2>
    <button class="btn small ghost" data-a="newpay" data-cid="${c.id}">+ Add payment</button><div style="height:8px"></div>
    ${listOf(pays.map((p) => payRow(p)), 'No payments recorded.')}
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
      <div class="stat g-green"><div class="l">To receive</div><div class="n">${L.money(sum(inP))}</div><div class="s">${lateIn.length ? lateIn.length + ' overdue' : inP.length + ' pending'}</div></div>
      <div class="stat g-orange"><div class="l">To pay</div><div class="n">${L.money(sum(outP))}</div><div class="s">${lateOut.length ? lateOut.length + ' overdue' : outP.length + ' pending'}</div></div>
    </div>
    <div class="seg"><button class="${tab === 'in' ? 'on' : ''}" data-a="mtab" data-v="in">⬇️ To receive</button><button class="${tab === 'out' ? 'on' : ''}" data-a="mtab" data-v="out">⬆️ To pay</button></div>
    <h2>Pending</h2>${listOf(list.map((p) => payRow(p)), tab === 'in' ? 'Nobody owes you anything right now 🎉' : 'No bills pending 🎉')}
    ${settled.length ? `<h2>Settled</h2>${listOf(settled.map((p) => payRow(p)))}` : ''}
    <div class="sub" style="margin:14px 4px">💡 For monthly bills like rent, EMI or SIP, add a repeating reminder in the Money category.</div>`;
}

/* ============================ MORE ============================ */
function renderMore() {
  const subs = { ideas: renderIdeas, notes: renderNotes, shopping: renderShopping, learning: renderLearning, journal: renderJournal, review: renderReview, settings: renderSettings, backup: renderBackup };
  if (view.sub && subs[view.sub]) return '<button class="back" data-a="back">‹ More</button>' + subs[view.sub]();
  const jk = S.journal[today()] || {};
  const jAns = L.JOURNAL_QS.filter((q) => jk[q.id]).length;
  const row = (sub, icon, color, title, small) => `<button class="mrow" data-a="sub" data-v="${sub}"><span class="micon" style="background:${color}">${icon}</span><span class="grow"><b>${title}</b><small>${small}</small></span><span class="sub">›</span></button>`;
  return `<h1>More</h1><div class="sub">Lucy's second brain</div><div style="height:14px"></div>
    ${row('ideas', '💡', 'linear-gradient(135deg,#FFB547,#FF8A00)', 'Ideas', S.ideas.length + ' ideas · company &amp; brands')}
    ${row('notes', '📝', 'linear-gradient(135deg,#5C7CFA,#3A86FF)', 'Notes', S.notes.length + ' notes · big writing space')}
    ${row('shopping', '🛒', 'linear-gradient(135deg,#FF5CA8,#E64980)', 'Shopping list', S.shopping.filter((s) => !s.done).length + ' to buy')}
    ${row('learning', '📚', 'linear-gradient(135deg,#19C6B7,#12B886)', 'Learning', S.learning.filter((s) => !s.done).length + ' in queue')}
    ${row('journal', '🌙', 'linear-gradient(135deg,#7C5CFF,#B15CFF)', 'Journal', jAns ? jAns + '/' + L.JOURNAL_QS.length + ' answered today' : L.JOURNAL_QS.length + ' questions for today')}
    ${row('review', '📊', 'linear-gradient(135deg,#3A86FF,#7C5CFF)', 'Weekly review', 'Personal · Company · Shopping · Ideas')}
    ${row('settings', '⚙️', 'linear-gradient(135deg,#868E96,#495057)', 'Settings', 'Daily routine, alarms, voice')}
    ${row('backup', '💾', 'linear-gradient(135deg,#12B886,#0CA678)', 'Backup', 'Keep your data safe')}`;
}
function renderIdeas() {
  const q = view.ideaQ.toLowerCase(), tab = view.ideaTab;
  const list = S.ideas.filter((n) => n.scope === tab && (!q || n.text.toLowerCase().includes(q))).sort((a, b) => (b.pinned - a.pinned) || (b.created - a.created));
  const fmt = (t) => esc(t).replace(/#(\w+)/g, '<span class="tag">#$1</span>');
  return `<h1>💡 Ideas</h1><div class="sub">Reel ideas, hooks, campaign concepts</div><div style="height:12px"></div>
    <div class="seg"><button class="${tab === 'company' ? 'on' : ''}" data-a="itab" data-v="company">🏢 Our company</button><button class="${tab === 'brand' ? 'on' : ''}" data-a="itab" data-v="brand">🤝 Brands we manage</button></div>
    ${tab === 'brand' ? `<label>Which brand?</label><select id="idea-client"><option value="">Choose a client</option>${S.clients.map((c) => `<option value="${c.id}">${esc(clientName(c))}</option>`).join('')}</select>` : ''}
    <label>New idea</label><textarea id="idea-new" placeholder="${tab === 'company' ? 'e.g. Reel: 3 mistakes cafes make with Instagram #reel' : 'e.g. Festive offer reel with slow-motion pour shots'}"></textarea>
    <button class="btn block" data-a="addidea">Save idea</button>
    <h2>${tab === 'company' ? 'DZYN LAB ideas' : 'Brand ideas'} · ${list.length}</h2>
    <input id="idea-q" placeholder="Search ideas" value="${esc(view.ideaQ)}"><div style="height:8px"></div>
    ${listOf(list.map((n) => { const c = n.clientId ? clientById(n.clientId) : null; return `<div class="item"><div class="grow" data-a="editidea" data-id="${n.id}">
      <div class="note-text">${n.pinned ? '📌 ' : ''}${fmt(n.text)}</div><div class="meta">${c ? '🤝 ' + esc(clientName(c)) + ' · ' : ''}${L.fmtDate(n.created)}</div></div></div>`; }), 'No ideas here yet.')}`;
}
function renderNotes() {
  const list = S.notes.filter((n) => n.title || n.body).sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
  return `<h1>📝 Notes</h1><div class="sub">Meeting notes, scripts, plans: anything long</div>
    <button class="btn block" data-a="newnote">+ New note</button>
    <h2>All notes · ${list.length}</h2>
    ${listOf(list.map((n) => `<div class="item"><div class="bubble plain">📄</div><div class="grow" data-a="opennote" data-id="${n.id}">
      <div class="title">${n.pinned ? '📌 ' : ''}${esc(n.title || 'Untitled')}</div><div class="meta">${esc((n.body || '').slice(0, 90))}${(n.body || '').length > 90 ? '…' : ''}</div>
      <div class="meta">${L.fmtWhen(n.updated)}</div></div></div>`), 'No notes yet.')}`;
}
function renderShopping() {
  const pick = view.shopCat;
  const chips = L.SHOP_CATS.map(([c, e]) => `<button class="ftab ${c === pick ? 'on' : ''}" data-a="shopcat" data-v="${c}"><span>${e}</span><b>${c}</b><small>${S.shopping.filter((s) => s.cat === c && !s.done).length}</small></button>`).join('');
  const row = (s) => `<div class="item ${s.done ? 'done' : ''}"><button class="check ${s.done ? 'on' : ''}" data-a="shop" data-id="${s.id}">${s.done ? '✓' : ''}</button><div class="grow title">${esc(s.text)}</div><button class="sub x" data-a="delshop" data-id="${s.id}">✕</button></div>`;
  const groups = L.SHOP_CATS.map(([c, e]) => { const items = S.shopping.filter((s) => s.cat === c && !s.done); return items.length ? `<h2>${e} ${c} · ${items.length}</h2>${listOf(items.map(row))}` : ''; }).join('');
  const got = S.shopping.filter((s) => s.done);
  return `<h1>🛒 Shopping list</h1><div class="sub">Pick a list, then add items</div>
    <div class="fgrid">${chips}</div>
    <div class="quick"><input id="shop-new" placeholder="Add to ${pick}… (comma for many: milk, eggs)"><button class="btn" data-a="addshop">Add</button></div>
    ${groups || '<div class="empty">All bought ✨</div>'}
    ${got.length ? `<h2>✅ Bought · ${got.length}</h2>${listOf(got.slice(-20).reverse().map(row))}<button class="btn small ghost" data-a="clearshop">Clear bought items</button>` : ''}`;
}
function renderLearning() {
  const pick = view.learnCat;
  const icon = Object.fromEntries(L.LEARN_CATS);
  const chips = L.LEARN_CATS.map(([c, e]) => `<button class="ftab ${c === pick ? 'on' : ''}" data-a="learncat" data-v="${c}"><span>${e}</span><b>${c}</b><small>${S.learning.filter((s) => s.cat === c && !s.done).length}</small></button>`).join('');
  const row = (s) => `<div class="item ${s.done ? 'done' : ''}"><button class="check ${s.done ? 'on' : ''}" data-a="learn" data-id="${s.id}">${s.done ? '✓' : ''}</button><div class="bubble plain">${icon[s.cat] || '🧠'}</div><div class="grow title">${esc(s.text)}</div><button class="sub x" data-a="dellearn" data-id="${s.id}">✕</button></div>`;
  const left = S.learning.filter((s) => !s.done && s.cat === pick);
  const all = S.learning.filter((s) => !s.done).length;
  const done = S.learning.filter((s) => s.done).slice(-10).reverse();
  return `<h1>📚 Learning</h1><div class="sub">${all} in your queue</div>
    <div class="fgrid">${chips}</div>
    <div class="quick"><input id="learn-new" placeholder="Add to ${pick}… e.g. Roger Deakins lighting masterclass"><button class="btn" data-a="addlearn">Add</button></div>
    <h2>${icon[pick]} ${pick} · ${left.length}</h2>${listOf(left.map(row), 'Nothing in ' + pick + ' yet.')}
    ${done.length ? `<h2>🎓 Finished</h2>${listOf(done.map(row))}` : ''}`;
}
function renderJournal() {
  const k = today();
  const e = S.journal[k] || {};
  const answered = L.JOURNAL_QS.filter((q) => e[q.id]).length;
  const past = Object.keys(S.journal).filter((d) => d !== k).sort().reverse().slice(0, 20);
  return `<h1>🌙 Journal</h1><div class="sub">${answered}/${L.JOURNAL_QS.length} answered today · saves automatically</div>
    <div class="bar big" style="margin-top:10px"><i style="width:${Math.round(100 * answered / L.JOURNAL_QS.length)}%"></i></div>
    ${L.JOURNAL_QS.map((q) => q.type === 'rating' ? `
      <div class="jq"><label>${q.emoji} ${q.q}</label><div class="rating">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button class="${Number(e.rating) === n ? 'on' : ''}" data-a="rate" data-v="${n}">${n}</button>`).join('')}</div></div>` : `
      <div class="jq"><label>${q.emoji} ${q.q}</label><textarea data-j="${q.id}" rows="2">${esc(e[q.id] || '')}</textarea></div>`).join('')}
    ${past.length ? `<h2>Past entries</h2>${past.map((d) => {
      const x = S.journal[d], dt = new Date(d + 'T12:00:00');
      const lines = L.JOURNAL_QS.filter((q) => x[q.id] && q.type !== 'rating').slice(0, 4).map((q) => `<div class="sub" style="margin-top:4px">${q.emoji} ${esc(x[q.id])}</div>`).join('');
      return `<div class="card"><b>${L.fmtDate(dt.getTime())}</b>${x.rating ? ` · ⭐ ${x.rating}/10` : ''}${lines}</div>`;
    }).join('')}` : ''}`;
}
function renderReview() {
  const now = Date.now(), from = L.addDays(L.startOfDay(now), -6);
  const log = S.log.filter((e) => e.t >= from);
  const tab = view.reviewTab;
  const tabs = [['personal', '🙋 Personal'], ['company', '🏢 Company'], ['shopping', '🛒 Shopping'], ['ideas', '💡 Ideas']];
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(L.addDays(L.startOfDay(now), -i));
  const barChart = (vals, max, labelFn) => `<div class="chart">${days.map((d, i) => `<div class="col"><div class="b" style="height:${Math.round(78 * vals[i] / Math.max(1, max)) + 4}px"></div><div class="dl">${L.DAYNAME[new Date(d).getDay()]}</div><div class="dv">${labelFn(vals[i])}</div></div>`).join('')}</div>`;
  const inDay = (e, d) => e.t >= d && e.t < L.addDays(d, 1);
  let body = '';
  if (tab === 'personal') {
    const done = log.filter((e) => e.kind === 'done' && L.PERSONAL_CATS.includes(e.cat));
    const act = S.routine.filter((x) => x.on).length || 1;
    const rPct = days.map((d) => Math.min(100, Math.round(100 * (S.routineLog[L.dayKey(d)] || []).length / act)));
    const ratings = days.map((d) => Number((S.journal[L.dayKey(d)] || {}).rating) || 0).filter(Boolean);
    const jDays = days.filter((d) => S.journal[L.dayKey(d)]).length;
    const learned = S.learning.filter((s) => s.done && s.doneAt >= from).length;
    const missed = log.filter((e) => e.kind === 'missed' && L.PERSONAL_CATS.includes(e.cat));
    body = `<div class="stats">
        <div class="stat g-violet"><div class="l">Personal done</div><div class="n">${done.length}</div></div>
        <div class="stat g-teal"><div class="l">Routine avg</div><div class="n">${Math.round(rPct.reduce((a, b) => a + b, 0) / 7)}%</div></div>
        <div class="stat g-pink"><div class="l">Mood avg</div><div class="n">${ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '–'}<small>/10</small></div></div>
        <div class="stat g-orange"><div class="l">Streak</div><div class="n">🔥 ${streak()}</div></div></div>
      <div class="card"><h3>🌿 Routine completion</h3>${barChart(rPct, 100, (v) => v + '%')}</div>
      <div class="card"><h3>Habits of the mind</h3><div class="sub">🌙 Journal written ${jDays}/7 days · 🎓 ${learned} learning item${learned === 1 ? '' : 's'} finished</div></div>
      ${missed.length ? `<div class="card"><h3>Slipped this week</h3><div class="sub">${[...new Set(missed.map((e) => e.task))].map(esc).join(' · ')}</div></div>` : ''}`;
  } else if (tab === 'company') {
    const done = log.filter((e) => e.kind === 'done' && L.COMPANY_CATS.includes(e.cat));
    const paidIn = log.filter((e) => e.kind === 'paid' && e.dir === 'in').reduce((a, e) => a + Number(e.amount || 0), 0);
    const paidOut = log.filter((e) => e.kind === 'paid' && e.dir === 'out').reduce((a, e) => a + Number(e.amount || 0), 0);
    const toCollect = S.payments.filter((p) => p.status === 'pending' && p.type === 'in').reduce((a, p) => a + Number(p.amount), 0);
    const perDay = days.map((d) => done.filter((e) => inDay(e, d)).length);
    const byClient = {};
    log.forEach((e) => { if (e.clientId) byClient[e.clientId] = (byClient[e.clientId] || 0) + 1; });
    const topClients = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const overdue = S.reminders.filter((r) => r.status === 'pending' && !r.repeat && r.due < now && L.COMPANY_CATS.includes(r.cat));
    body = `<div class="stats">
        <div class="stat g-blue"><div class="l">Work done</div><div class="n">${done.length}</div></div>
        <div class="stat g-green"><div class="l">Received</div><div class="n">${L.money(paidIn)}</div></div>
        <div class="stat g-orange"><div class="l">Paid out</div><div class="n">${L.money(paidOut)}</div></div>
        <div class="stat g-violet"><div class="l">Still to collect</div><div class="n">${L.money(toCollect)}</div></div></div>
      <div class="card"><h3>💼 Work done per day</h3>${barChart(perDay, Math.max(...perDay), (v) => v)}</div>
      ${topClients.length ? `<div class="card"><h3>🤝 Most active clients</h3>${topClients.map(([id, n]) => `<div class="row" style="margin-top:8px"><span class="grow">${esc(clientName(clientById(id)) || 'Old client')}</span><b>${n}</b></div>`).join('')}</div>` : ''}
      ${overdue.length ? `<h2 class="late">Overdue work: reschedule or drop</h2>${listOf(overdue.map((r) => remRow(r)))}` : ''}`;
  } else if (tab === 'shopping') {
    const bought = S.shopping.filter((s) => s.done && (s.doneAt || 0) >= from);
    const pending = S.shopping.filter((s) => !s.done);
    body = `<div class="stats">
        <div class="stat g-pink"><div class="l">Bought</div><div class="n">${bought.length}</div></div>
        <div class="stat g-orange"><div class="l">Still to buy</div><div class="n">${pending.length}</div></div></div>
      <div class="card"><h3>By list</h3>${L.SHOP_CATS.map(([c, e]) => { const b = bought.filter((s) => s.cat === c).length, p = pending.filter((s) => s.cat === c).length; return b || p ? `<div class="row" style="margin-top:8px"><span class="grow">${e} ${c}</span><span class="sub">${b} bought · ${p} left</span></div>` : ''; }).join('') || '<div class="sub">No shopping this week.</div>'}</div>`;
  } else {
    const ideas = S.ideas.filter((n) => n.created >= from);
    const brandIdeas = ideas.filter((n) => n.scope === 'brand');
    const byBrand = {};
    brandIdeas.forEach((n) => { const k = n.clientId ? clientName(clientById(n.clientId)) : 'Other'; byBrand[k] = (byBrand[k] || 0) + 1; });
    const notes = S.notes.filter((n) => n.updated >= from && (n.title || n.body)).length;
    const learnAdded = S.learning.filter((s) => (s.created || 0) >= from).length;
    body = `<div class="stats">
        <div class="stat g-orange"><div class="l">New ideas</div><div class="n">${ideas.length}</div></div>
        <div class="stat g-blue"><div class="l">Notes written</div><div class="n">${notes}</div></div>
        <div class="stat g-violet"><div class="l">Company ideas</div><div class="n">${ideas.length - brandIdeas.length}</div></div>
        <div class="stat g-teal"><div class="l">Learning added</div><div class="n">${learnAdded}</div></div></div>
      ${Object.keys(byBrand).length ? `<div class="card"><h3>💡 Ideas per brand</h3>${Object.entries(byBrand).map(([k, n]) => `<div class="row" style="margin-top:8px"><span class="grow">${esc(k)}</span><b>${n}</b></div>`).join('')}</div>` : ''}
      ${ideas.length ? `<div class="card"><h3>This week's ideas</h3>${ideas.slice(-6).reverse().map((n) => `<div class="sub" style="margin-top:6px">💡 ${esc(n.text.slice(0, 100))}</div>`).join('')}</div>` : '<div class="empty">No new ideas this week. Inspiration comes when you capture it 💡</div>'}`;
  }
  return `<h1>📊 Weekly review</h1><div class="sub">${L.fmtDate(from)} → today</div>
    <div class="seg four">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-a="rtab" data-v="${k}">${l}</button>`).join('')}</div><div style="height:12px"></div>${body}`;
}
function renderSettings() {
  const st = S.settings;
  const sel = (key, opts) => `<select data-set="${key}">${opts.map((o) => `<option value="${o[0]}" ${String(st[key]) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const routineRows = S.routine.map((it, i) => `
    <div class="rrow ${it.on ? '' : 'off'}">
      <span class="remo">${it.emoji}</span>
      <div class="grow"><b>${esc(it.label)}</b>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
          <button class="tgl ${it.ring ? 'on' : ''}" data-a="rt-ring" data-i="${i}">🔔 Ring till stopped</button>
          <button class="tgl ${it.speak ? 'on' : ''}" data-a="rt-speak" data-i="${i}">🗣 Speak</button>
        </div></div>
      <div class="rright"><input type="time" data-rt-time="${i}" value="${it.time}" class="tinput">
        <button class="switch ${it.on ? 'on' : ''}" data-a="rt-on" data-i="${i}" aria-label="On or off"><i></i></button></div>
    </div>`).join('');
  return `<h1>⚙️ Settings</h1>
    <label>Your name (Lucy greets you with it)</label><input data-set="name" value="${esc(st.name)}">

    <h2>🌿 Daily routine</h2>
    <div class="list">${routineRows}</div>
    <button class="btn small ghost" data-a="rt-reset">Reset routine to default</button>

    <h2>⏰ Reminders</h2>
    <div class="card">
      <div class="row"><div class="grow"><b>Ring until stopped</b><div class="sub">Reminders, meetings and payments keep ringing until you tap Done or Snooze</div></div>
        <button class="switch ${st.ringReminders ? 'on' : ''}" data-a="toggle" data-v="ringReminders"><i></i></button></div>
      <div class="row" style="margin-top:14px"><div class="grow"><b>🗣 Lucy speaks</b><div class="sub">Lucy reads reminders out loud when your phone is on ring</div></div>
        <button class="switch ${st.speak ? 'on' : ''}" data-a="toggle" data-v="speak"><i></i></button></div>
    </div>
    <div class="grid2">
      <div><label>Remind again every</label>${sel('nagMin', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min'], [60, '1 hour']])}</div>
      <div><label>Max repeats</label>${sel('maxNags', [[2, '2 times'], [4, '4 times'], [6, '6 times'], [8, '8 times'], [12, '12 times']])}</div>
      <div><label>Snooze button</label>${sel('snoozeMin', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 hour']])}</div>
      <div><label>Morning briefing</label><input type="time" data-set="briefTime" value="${st.briefTime}"></div>
      <div><label>Top 5 check-ins</label>${sel('top5Checks', [['true', '2 PM &amp; 6 PM'], ['false', 'Off']])}</div>
      <div><label>Journal reminder</label><input type="time" data-set="journalTime" value="${st.journalTime}"></div>
      <div><label>Weekly review day</label>${sel('reviewDay', L.DAYNAME.map((d, i) => [i, d]))}</div>
      <div><label>Review time</label><input type="time" data-set="reviewTime" value="${st.reviewTime}"></div>
    </div>

    <h2>🧪 Check Lucy is working</h2>
    <button class="btn block ghost" data-a="test-ring">🔔 Test alarm in 10 seconds (rings until stopped)</button>
    <button class="btn block ghost" data-a="test-voice">🗣 Test Lucy's voice</button>
    <button class="btn block ghost" data-a="test-party">🎉 Test celebration</button>
    ${NATIVE ? `<div class="card" style="margin-top:10px"><div class="sub">Notifications: <b>${perm.notif}</b> · Exact alarms: <b>${perm.exact || 'n/a'}</b> · Background: <b>${perm.battery ? 'allowed' : 'restricted'}</b></div>
      <div class="actions">${perm.notif !== 'granted' ? '<button class="btn small" data-a="perm-notif">Turn on notifications</button>' : ''}${perm.exact && perm.exact !== 'granted' ? '<button class="btn small" data-a="perm-exact">Allow exact alarms</button>' : ''}${!perm.battery ? '<button class="btn small" data-a="battery">Allow background</button>' : ''}</div></div>` : ''}
    <div class="card"><b>🔋 If alarms come late or not at all</b><div class="sub" style="margin-top:6px">Phone Settings → Apps → Lucy → Battery → <b>Unrestricted</b>. On Xiaomi, Redmi, Realme, Oppo or Vivo, also turn on <b>Autostart</b>. For the voice, keep your phone on ring and the alarm volume up.</div></div>
    <div class="sub" style="text-align:center;margin-top:18px">Lucy v2 · made for ${esc(name())} 💫</div>`;
}
function renderBackup() {
  return `<h1>💾 Backup</h1>
    <div class="sub">Your data lives only on this phone. Copy a backup now and then and paste it into WhatsApp "Message yourself" or Google Keep. If you change phones, paste it back here.</div>
    <h2>Make a backup</h2>
    <textarea id="bk-out" readonly style="min-height:110px;font-size:12px">${esc(JSON.stringify(S))}</textarea>
    <button class="btn block" data-a="copybk">📋 Copy backup</button>
    <h2>Restore a backup</h2>
    <textarea id="bk-in" placeholder="Paste your backup text here" style="font-size:12px"></textarea>
    <button class="btn block danger" data-a="restore">Restore (replaces current data)</button>`;
}

/* ============================ sheets ============================ */
function openSheet(html, full) { $('#sheet').innerHTML = html; $('#sheet').classList.toggle('full', !!full); $('#sheet-wrap').hidden = false; }
function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').classList.remove('full'); }

let pendingSave = null;
function reminderSheet(r, preset) {
  const isNew = !r;
  const base = Object.assign({}, r || { task: '', cat: 'Personal', due: L.atTime(Date.now(), new Date().getHours() + 1, 0), repeat: '', clientId: null }, preset || {});
  const rep = base.repeat || '';
  const repKind = rep.startsWith('every:') ? 'every' : rep;
  const every = rep.startsWith('every:') ? Number(rep.split(':')[1]) : 60;
  openSheet(`
    <h3>${isNew ? 'New reminder' : 'Edit reminder'}</h3>
    <label>What?</label><input id="f-task" value="${esc(base.task)}" placeholder="e.g. kal 11am call Mr. Ravi">
    <div class="hint">💡 Type naturally, like "monday 4pm meeting with Kliya", and Lucy fills in the date and time.</div>
    <div class="grid2">
      <div><label>Date</label><input id="f-date" type="date" value="${L.dayKey(base.due)}"></div>
      <div><label>Time</label><input id="f-time" type="time" value="${toTimeInput(base.due)}"></div>
    </div>
    <div class="grid2">
      <div><label>Repeat</label><select id="f-rep">
        ${[['', 'Never'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year'], ['every', 'Every few minutes/hours']].map((o) => `<option value="${o[0]}" ${repKind === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
      </select></div>
      <div><label>Category</label><select id="f-cat">${L.CATS.map((c) => `<option ${c === base.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div id="f-every-wrap" ${repKind === 'every' ? '' : 'hidden'}><label>Every (minutes)</label><input id="f-every" type="number" min="5" step="5" value="${every}"></div>
    <label>Client (optional)</label><select id="f-client"><option value="">None</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === base.clientId ? 'selected' : ''}>${esc(clientName(c))}</option>`).join('')}</select>
    <button class="btn block" data-a="saverem" data-id="${isNew ? '' : r.id}">${isNew ? 'Add reminder' : 'Save'}</button>
    ${!isNew && r.status === 'pending' ? `<div class="actions">
      <button class="btn small ghost" data-a="done" data-id="${r.id}">✅ Done</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="10">😴 10 min</button>
      <button class="btn small ghost" data-a="snz" data-id="${r.id}" data-v="60">😴 1 hour</button>
      <button class="btn small ghost" data-a="tomorrow" data-id="${r.id}">➡️ Tomorrow</button></div>` : ''}
    ${!isNew ? `<button class="btn block danger" data-a="delrem" data-id="${r.id}">Delete</button>` : ''}`);
}
function smartFillTask() {
  const el = $('#f-task');
  if (!el) return;
  const r = L.parseReminder(el.value);
  if (!r) return;
  el.value = r.task;
  $('#f-date').value = L.dayKey(r.due);
  $('#f-time').value = toTimeInput(r.due);
  $('#f-rep').value = r.repeat.startsWith('every:') ? 'every' : r.repeat;
  if (r.repeat.startsWith('every:')) { $('#f-every').value = r.repeat.split(':')[1]; $('#f-every-wrap').hidden = false; }
  $('#f-cat').value = r.cat;
  const client = S.clients.find((c) => clientName(c) && r.task.toLowerCase().includes(clientName(c).toLowerCase()));
  if (client) $('#f-client').value = String(client.id);
  toast('📅 ' + L.fmtWhen(r.due));
}
function readReminderSheet() {
  if (L.parseReminder($('#f-task').value)) smartFillTask();
  const task = $('#f-task').value.trim();
  if (!task) { toast('What should I remind you about?'); return null; }
  const due = fromInputs($('#f-date').value, $('#f-time').value);
  let repeat = $('#f-rep').value;
  if (repeat === 'every') repeat = 'every:' + Math.max(5, Number($('#f-every').value) || 60);
  return { task: task, due: due, start: due, repeat: repeat, cat: $('#f-cat').value, clientId: Number($('#f-client').value) || null };
}
function saveWithClashCheck(data, id, force) {
  if (!force) {
    const clashes = findClash(data.due, id);
    if (clashes.length) {
      pendingSave = { data: data, id: id };
      openSheet(`<div style="text-align:center"><div style="font-size:46px">⚠️</div><h3>Time clash!</h3>
        <div class="sub">You already have this around ${L.fmtWhen(data.due)}:</div></div>
        <div class="list" style="margin-top:12px">${clashes.map((c) => `<div class="item cat" ${catStyle(c.r.cat)}><div class="bubble">${L.taskEmoji(c.r.task, c.r.cat)}</div><div class="grow"><div class="title">${esc(c.r.task)}</div><div class="meta">${L.fmtWhen(c.at)}${c.r.clientId ? ' · 🤝 ' + esc(clientName(clientById(c.r.clientId))) : ''}</div></div></div>`).join('')}</div>
        <button class="btn block" data-a="clash-change">🕒 Change time</button>
        <button class="btn block ghost" data-a="clash-save">Save anyway</button>`);
      buzz([60, 80, 60]);
      return;
    }
  }
  if (id) {
    const r = remById(id);
    Object.assign(r, data, { snoozeUntil: 0, status: 'pending' });
    if (data.repeat && data.due <= Date.now()) r.due = L.nextAfter(r, Date.now());
    save(); toast('Saved ✓');
  } else {
    if (data.repeat && data.due <= Date.now()) data.due = L.nextAfter(Object.assign({}, data), Date.now());
    const r = addReminder(data);
    toast('Got it ✅ ' + L.fmtWhen(alertStart(r)));
    celebrate('small');
  }
  pendingSave = null;
  closeSheet(); render();
}
function paymentSheet(p, preset) {
  const isNew = !p;
  const base = Object.assign({}, p || { type: view.moneyTab || 'in', party: '', amount: '', due: L.startOfDay(Date.now()), note: '', clientId: null }, preset || {});
  if (preset && preset.clientId && !base.party) base.party = clientName(clientById(preset.clientId));
  openSheet(`
    <h3>${isNew ? 'New payment' : 'Edit payment'}</h3>
    <div class="seg" id="p-type"><button class="${base.type === 'in' ? 'on' : ''}" data-a="ptype" data-v="in">⬇️ I'll receive</button><button class="${base.type === 'out' ? 'on' : ''}" data-a="ptype" data-v="out">⬆️ I'll pay</button></div>
    <label>Who?</label><input id="p-party" list="p-clients" value="${esc(base.party)}" placeholder="Client or person">
    <datalist id="p-clients">${S.clients.map((c) => `<option value="${esc(clientName(c))}">`).join('')}</datalist>
    <div class="grid2">
      <div><label>Amount (₹)</label><input id="p-amount" type="number" inputmode="numeric" value="${esc(base.amount)}" placeholder="25000"></div>
      <div><label>Due date</label><input id="p-due" type="date" value="${L.dayKey(base.due)}"></div>
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
  const client = S.clients.find((c) => clientName(c).toLowerCase() === party.toLowerCase());
  const data = { type: $('#sheet').dataset.ptype || 'in', party: party, amount: amount, due: L.startOfDay(fromInputs($('#p-due').value, '00:00')), note: $('#p-note').value.trim(), clientId: client ? client.id : null };
  if (id) Object.assign(payById(id), data, { snoozeUntil: 0 });
  else S.payments.push(Object.assign({ id: nid(), status: 'pending', created: Date.now() }, data));
  save(); closeSheet(); render(); toast('Saved ✓');
}
const CLIENT_FIELDS = [
  ['firstName', 'First name', 'text', 'Rahul'], ['lastName', 'Last name', 'text', 'Shah'], ['personalPhone', 'Personal contact number', 'tel', '98xxxxxxxx'],
  ['company', 'Company name', 'text', 'Kliya Cafe'], ['businessType', 'Business type', 'text', 'Rooftop cafe'], ['address', 'Company address', 'text', 'Sindhubhavan Road, Ahmedabad'],
  ['companyPhone', 'Company contact number', 'tel', '079xxxxxxx'], ['work', 'Work we do for them', 'text', 'Social media, reels, Meta ads'], ['pkg', 'Package', 'text', 'Elevate · ₹40,000/month'],
  ['email', 'Company email', 'email', 'hello@company.com'], ['instagram', 'Instagram', 'text', '@kliyacafe or link'], ['facebook', 'Facebook', 'text', 'Page name or link'], ['gmb', 'Google Business link', 'url', 'https://g.page/…']
];
function clientSheet(c) {
  const isNew = !c;
  const base = c || {};
  const field = ([k, l, t, ph]) => `<div><label>${l}</label><input id="c-${k}" type="${t}" value="${esc(base[k] || '')}" placeholder="${esc(ph)}"></div>`;
  const F = CLIENT_FIELDS;
  openSheet(`<h3>${isNew ? 'New client' : 'Edit client'}</h3>
    <h2 style="margin-top:8px">👤 Person</h2>
    <div class="grid2">${field(F[0])}${field(F[1])}</div>${field(F[2])}
    <h2>🏢 Company</h2>
    ${F.slice(3, 9).map(field).join('')}
    <h2>🌐 Online</h2>
    ${F.slice(9).map(field).join('')}
    <button class="btn block" data-a="saveclient" data-id="${isNew ? '' : c.id}">${isNew ? 'Add client' : 'Save'}</button>
    ${!isNew ? `<button class="btn block danger" data-a="delclient" data-id="${c.id}">Delete client</button>` : ''}`);
}
function ideaSheet(n) {
  openSheet(`<h3>Edit idea</h3><textarea id="n-text" style="min-height:180px">${esc(n.text)}</textarea>
    ${n.scope === 'brand' ? `<label>Brand</label><select id="n-client"><option value="">Other</option>${S.clients.map((c) => `<option value="${c.id}" ${c.id === n.clientId ? 'selected' : ''}>${esc(clientName(c))}</option>`).join('')}</select>` : ''}
    <button class="btn block" data-a="saveidea" data-id="${n.id}">Save</button>
    <div class="actions"><button class="btn small ghost" data-a="pinidea" data-id="${n.id}">${n.pinned ? 'Unpin' : '📌 Pin'}</button>
    <button class="btn small ghost" data-a="idea2rem" data-id="${n.id}">⏰ Make it a reminder</button></div>
    <button class="btn block danger" data-a="delidea" data-id="${n.id}">Delete</button>`);
}
function noteSheet(n) {
  openSheet(`<div class="row"><button class="link" data-a="close">‹ Done</button><span class="grow"></span>
      <button class="btn small ghost" data-a="pinnote" data-id="${n.id}">${n.pinned ? 'Unpin' : '📌 Pin'}</button>
      <button class="btn small danger" data-a="delnote" data-id="${n.id}">Delete</button></div>
    <input id="note-title" class="note-title" data-nid="${n.id}" value="${esc(n.title)}" placeholder="Title">
    <textarea id="note-body" class="note-body" data-nid="${n.id}" placeholder="Start writing… meeting notes, scripts, plans">${esc(n.body)}</textarea>
    <div class="sub" style="text-align:right">Saves automatically</div>`, true);
  setTimeout(() => { const b = $(n.title ? '#note-body' : '#note-title'); if (b) b.focus(); }, 60);
}
function onboardingSheet() {
  openSheet(`<div style="text-align:center"><div class="lucy-face big">☺</div>
    <h3>Hi, I'm Lucy 👋</h3><div class="sub">I'll remember everything, so you don't have to.</div></div>
    <label>What should I call you?</label><input id="ob-name" value="${esc(S.settings.name)}">
    <div class="card" style="margin-top:12px"><b>🌿 Your daily routine is ready</b><div class="sub" style="margin-top:4px">Wake up 7:30 AM → long walk 9:30 PM, ${S.routine.length} reminders. Change any time in More → Settings.</div></div>
    <button class="btn block" data-a="obdone">Let's go ✨</button>`);
}

/* ============================ events ============================ */
document.addEventListener('pointerdown', (ev) => setTapPoint(ev.clientX, ev.clientY), true);
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, id = el.dataset.id, v = el.dataset.v;
  switch (a) {
    case 'tab': go(v); break;
    case 'close': closeSheet(); render(); break;
    case 'back': view.sub = null; view.clientId = null; render(); break;
    case 'sub': go('more', v); break;
    case 'fab':
      if (view.tab === 'money') paymentSheet();
      else if (view.tab === 'clients' && !view.clientId) clientSheet();
      else if (view.tab === 'clients') reminderSheet(null, { cat: 'Follow-up', clientId: view.clientId });
      else if (view.sub === 'notes') newNote();
      else if (view.sub === 'ideas') { const t = $('#idea-new'); if (t) t.focus(); }
      else if (view.sub === 'shopping') { const t = $('#shop-new'); if (t) t.focus(); }
      else if (view.sub === 'learning') { const t = $('#learn-new'); if (t) t.focus(); }
      else reminderSheet();
      break;
    case 'done': closeSheet(); markDone(id); render(); break;
    case 'undo': undoDone(id); render(); break;
    case 'edit': { const r = remById(id); if (r) reminderSheet(r); break; }
    case 'saverem': { const d = readReminderSheet(); if (d) saveWithClashCheck(d, id ? Number(id) : null); break; }
    case 'clash-save': if (pendingSave) saveWithClashCheck(pendingSave.data, pendingSave.id, true); break;
    case 'clash-change': if (pendingSave) { const ps = pendingSave; reminderSheet(ps.id ? remById(ps.id) : null, ps.data); } break;
    case 'delrem': if (confirm('Delete this reminder?')) { deleteReminder(id); closeSheet(); render(); } break;
    case 'snz': snooze(id, Number(v)); closeSheet(); render(); break;
    case 'tomorrow': {
      const r = remById(id);
      if (r) { const t = new Date(alertStart(r)); r.snoozeUntil = 0; r.due = L.atTime(L.addDays(L.startOfDay(Date.now()), 1), t.getHours(), t.getMinutes()); if (r.repeat) r.start = r.due; save(); toast('Moved to ' + L.fmtWhen(r.due)); }
      closeSheet(); render(); break;
    }
    case 'routine': routineToggle(el.dataset.k); render(); break;
    case 'filter': view.filter = v; render(); break;
    case 'mtab': view.moneyTab = v; render(); break;
    case 'settle': closeSheet(); settlePayment(id); render(); break;
    case 'newpay': paymentSheet(null, { clientId: Number(el.dataset.cid) || null }); break;
    case 'editpay': { const p = payById(id); if (p) paymentSheet(p); break; }
    case 'ptype': document.querySelectorAll('#p-type button').forEach((b) => b.classList.toggle('on', b === el)); $('#sheet').dataset.ptype = v; break;
    case 'savepay': savePaymentFromSheet(id ? Number(id) : null); break;
    case 'delpay': if (confirm('Delete this payment?')) { S.payments = S.payments.filter((p) => p.id !== Number(id)); save(); closeSheet(); render(); } break;
    case 'client': go('clients', null, id); break;
    case 'newclient': clientSheet(); break;
    case 'editclient': clientSheet(clientById(id)); break;
    case 'saveclient': {
      const data = {};
      CLIENT_FIELDS.forEach(([k]) => { data[k] = ($('#c-' + k).value || '').trim(); });
      if (!data.company && !data.firstName) { toast('Add a company name or first name'); break; }
      if (id) Object.assign(clientById(id), data);
      else { const c = Object.assign({ id: nid(), notes: '', created: Date.now() }, data); S.clients.push(c); view.clientId = c.id; celebrate('small'); }
      save(); closeSheet(); render(); toast('Saved ✓'); break;
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
    case 'itab': view.ideaTab = v; render(); break;
    case 'addidea': {
      const t = $('#idea-new').value.trim();
      if (!t) break;
      const sel = $('#idea-client');
      S.ideas.push({ id: nid(), text: t, scope: view.ideaTab, clientId: sel ? (Number(sel.value) || null) : null, created: Date.now(), pinned: false });
      save(true); render(); celebrate('small'); toast('💡 Idea saved'); break;
    }
    case 'editidea': { const n = S.ideas.find((x) => x.id === Number(id)); if (n) ideaSheet(n); break; }
    case 'saveidea': { const n = S.ideas.find((x) => x.id === Number(id)); n.text = $('#n-text').value; const sc = $('#n-client'); if (sc) n.clientId = Number(sc.value) || null; save(true); closeSheet(); render(); break; }
    case 'pinidea': { const n = S.ideas.find((x) => x.id === Number(id)); n.pinned = !n.pinned; save(true); closeSheet(); render(); break; }
    case 'delidea': if (confirm('Delete this idea?')) { S.ideas = S.ideas.filter((x) => x.id !== Number(id)); save(true); closeSheet(); render(); } break;
    case 'idea2rem': { const n = S.ideas.find((x) => x.id === Number(id)); closeSheet(); reminderSheet(null, { task: n.text.split('\n')[0].slice(0, 80), cat: 'Work', clientId: n.clientId }); break; }
    case 'newnote': newNote(); break;
    case 'opennote': { const n = S.notes.find((x) => x.id === Number(id)); if (n) noteSheet(n); break; }
    case 'pinnote': { const n = S.notes.find((x) => x.id === Number(id)); n.pinned = !n.pinned; save(true); el.textContent = n.pinned ? 'Unpin' : '📌 Pin'; toast(n.pinned ? '📌 Pinned' : 'Unpinned'); break; }
    case 'delnote': if (confirm('Delete this note?')) { S.notes = S.notes.filter((x) => x.id !== Number(id)); save(true); closeSheet(); render(); } break;
    case 'shopcat': view.shopCat = v; render(); break;
    case 'addshop': {
      const inp = $('#shop-new');
      inp.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((t) => S.shopping.push({ id: nid(), text: t, cat: view.shopCat, done: false, created: Date.now() }));
      save(true); render(); setTimeout(() => $('#shop-new') && $('#shop-new').focus(), 30); break;
    }
    case 'shop': { const s = S.shopping.find((x) => x.id === Number(id)); s.done = !s.done; s.doneAt = s.done ? Date.now() : 0; save(true); if (s.done) { celebrate('small'); buzz(20); } render(); break; }
    case 'delshop': S.shopping = S.shopping.filter((x) => x.id !== Number(id)); save(true); render(); break;
    case 'clearshop': S.shopping = S.shopping.filter((x) => !x.done); save(true); render(); break;
    case 'learncat': view.learnCat = v; render(); break;
    case 'addlearn': {
      const t = $('#learn-new').value.trim();
      if (!t) break;
      S.learning.push({ id: nid(), text: t, cat: view.learnCat, done: false, created: Date.now() });
      save(true); render(); break;
    }
    case 'learn': {
      const s = S.learning.find((x) => x.id === Number(id));
      s.done = !s.done; s.doneAt = s.done ? Date.now() : 0;
      if (s.done) { logEvent('learned', { task: s.text, cat: 'Personal' }); celebrate('rain', { emoji: ['🧠', '🎓', '✨'] }); toast('🧠 Smarter already'); }
      save(true); render(); break;
    }
    case 'dellearn': S.learning = S.learning.filter((x) => x.id !== Number(id)); save(true); render(); break;
    case 'rate': {
      const k = today();
      S.journal[k] = Object.assign(S.journal[k] || {}, { rating: Number(v) });
      save(true); render(); checkJournalComplete(); break;
    }
    case 'rtab': view.reviewTab = v; render(); break;
    case 'toggle': S.settings[v] = !S.settings[v]; save(); render(); toast('Saved ✓'); break;
    case 'rt-on': { const it = S.routine[Number(el.dataset.i)]; it.on = !it.on; save(); render(); break; }
    case 'rt-ring': { const it = S.routine[Number(el.dataset.i)]; it.ring = !it.ring; save(); render(); toast(it.ring ? '🔔 ' + it.label + ' rings until stopped' : it.label + ' rings once'); break; }
    case 'rt-speak': { const it = S.routine[Number(el.dataset.i)]; it.speak = !it.speak; save(); render(); break; }
    case 'rt-reset': if (confirm('Reset your daily routine to the default timings?')) { S.routine = clone(DEFAULTS.routine); save(); render(); } break;
    case 'test-ring': testAlarm(); break;
    case 'test-voice': if (NATIVE) Alarm.speak({ text: 'Hi ' + name() + ', I am Lucy. I will remind you about everything.' }); else toast('Voice works inside the installed app'); break;
    case 'test-party': celebrate('big', { icon: '🏆', title: 'You did it!', sub: 'This is how Lucy celebrates your wins.' }); break;
    case 'perm-notif': LN.requestPermissions().then(refreshPerms).then(render); break;
    case 'perm-exact': LN.changeExactNotificationSetting().then(refreshPerms).then(() => { render(); scheduleSync(); }); break;
    case 'battery': Alarm.requestBatteryExemption().then(() => setTimeout(() => refreshPerms().then(render), 1500)); break;
    case 'copybk': copyText($('#bk-out').value); break;
    case 'restore': restoreBackup(); break;
    case 'obdone': finishOnboarding(); break;
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const id = ev.target.id;
  if (id === 'client-quick') { ev.preventDefault(); clientQuickAdd(Number(ev.target.dataset.cid)); }
  else if (id === 'shop-new') { ev.preventDefault(); document.querySelector('[data-a="addshop"]').click(); }
  else if (id === 'learn-new') { ev.preventDefault(); document.querySelector('[data-a="addlearn"]').click(); }
  else if (id === 'f-task') { ev.preventDefault(); smartFillTask(); }
});
document.addEventListener('focusout', (ev) => { if (ev.target.id === 'f-task') smartFillTask(); });
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'idea-q') {
    view.ideaQ = t.value;
    const pos = t.selectionStart;
    render();
    const n = $('#idea-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  }
  else if (t.id === 'client-notes') { const c = clientById(t.dataset.cid); if (c) { c.notes = t.value; save(); } }
  else if (t.id === 'note-title' || t.id === 'note-body') {
    const n = S.notes.find((x) => x.id === Number(t.dataset.nid));
    if (n) { if (t.id === 'note-title') n.title = t.value; else n.body = t.value; n.updated = Date.now(); save(true); }
  }
  else if (t.dataset.j) {
    const k = today();
    S.journal[k] = Object.assign(S.journal[k] || {}, { [t.dataset.j]: t.value });
    save(true);
  }
  else if (t.dataset.set === 'name') { S.settings.name = t.value; save(); }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.set && t.dataset.set !== 'name') {
    const k = t.dataset.set;
    let val = t.value;
    if (['nagMin', 'maxNags', 'snoozeMin', 'reviewDay'].includes(k)) val = Number(val);
    if (k === 'top5Checks') val = val === 'true';
    S.settings[k] = val;
    save(); toast('Saved ✓');
  } else if (t.dataset.set === 'name') { toast('Hello, ' + name() + ' 👋'); }
  else if (t.dataset.rtTime !== undefined) {
    const it = S.routine[Number(t.dataset.rtTime)];
    if (it && t.value) { it.time = t.value; S.routine.sort((a, b) => a.time.localeCompare(b.time)); save(); render(); toast(it.emoji + ' ' + it.label + ' → ' + fmtHM(it.time)); }
  } else if (t.id === 'f-rep') {
    $('#f-every-wrap').hidden = t.value !== 'every';
  } else if (t.dataset.j) {
    checkJournalComplete();
  }
});

function newNote() {
  const n = { id: nid(), title: '', body: '', created: Date.now(), updated: Date.now(), pinned: false };
  S.notes.push(n); save(true); noteSheet(n);
}
function checkJournalComplete() {
  const k = today(), e = S.journal[k] || {};
  S.celebrated[k] = S.celebrated[k] || {};
  if (L.JOURNAL_QS.every((q) => e[q.id]) && !S.celebrated[k].journal) {
    S.celebrated[k].journal = true; save(true);
    celebrate('big', { icon: '📖', title: 'Journal complete!', sub: 'Every question answered. That\'s real self-awareness.' });
  }
}
function clientQuickAdd(cid) {
  const inp = $('#client-quick');
  const v = inp.value.trim();
  if (!v) return;
  const r = L.parseReminder(v);
  if (!r) { reminderSheet(null, { task: v, cat: 'Follow-up', clientId: cid }); return; }
  r.clientId = cid;
  if (r.cat === 'Personal' || r.cat === 'Work') r.cat = 'Follow-up';
  saveWithClashCheck(r, null);
}
async function testAlarm() {
  if (!NATIVE) { toast('Test works inside the installed app'); return; }
  try {
    await Alarm.add({ id: 999999, at: Date.now() + 10000, title: '🔔 Lucy test alarm', body: 'Tap Done to stop the ringing.', insistent: true, actions: 'REMIND', snoozeMin: S.settings.snoozeMin,
      group: 'test', speech: S.settings.speak ? name() + ', this is your test alarm. Tap done to stop me.' : '', extra: { kind: 'test' } });
    toast('Lock your phone and wait 10 seconds 🔔');
  } catch (e) { toast('Could not schedule: ' + e.message); }
}
function copyText(text) {
  const done = () => toast('📋 Copied. Paste it somewhere safe');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
  function fallback() { const t = $('#bk-out'); t.removeAttribute('readonly'); t.select(); document.execCommand('copy'); t.setAttribute('readonly', ''); done(); }
}
function restoreBackup() {
  const txt = $('#bk-in').value.trim();
  if (!txt) return toast('Paste your backup first');
  try {
    const d = JSON.parse(txt);
    if (!d || !Array.isArray(d.reminders)) throw new Error('bad');
    if (!confirm('Replace everything on this phone with the backup?')) return;
    S = migrate(d);
    save(); go('today'); toast('✅ Restored');
  } catch (e) { toast('That doesn\'t look like a Lucy backup'); }
}
function finishOnboarding() {
  S.settings.name = ($('#ob-name').value || 'Divyesh').trim();
  S.onboarded = true;
  save();
  closeSheet();
  if (NATIVE) LN.requestPermissions().then(refreshPerms).then(render);
  render();
  celebrate('big', { icon: '👋', title: 'Welcome, ' + name() + '!', sub: 'I\'ve got your back from now on.' });
}

/* ============================ start ============================ */
(async function start() {
  save(true);
  normalize();
  render();
  await initNative();
  render();
  if (!S.onboarded) onboardingSheet();
  scheduleSync();
})();

window.__lucy = { get S() { return S; }, buildSchedule: buildSchedule, render: render, topFive: topFive };
