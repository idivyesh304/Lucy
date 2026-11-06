// LUCY 3 — Divyesh's AI personal assistant and founder partner (iPhone web app)
import { S, save, nid, logEvent, view, device, replaceState, migrate, onSave } from './store.js';
import * as B from './brain.js';
import * as H from './helper.js';
import { buildSchedule, nextLoanDue } from './schedule.js';
import * as V from './voice.js';
import { avatar, setAvatarState } from './avatar.js';
import { mountLucy } from './lucy3d.js';
import { startNeural, startTilt, countUp } from './fx.js';
import * as SP from './special.js';
import { celebrate, setTapPoint } from './celebrate.js';
import { $, esc, hm, toTime, fromInputs, fmtHM, money, short, toast, openSheet, closeSheet, sheetOpen, listOf, seg, sw, catIcon, catStyle, ring, chart, imageToDataUrl, icon, L, C } from './ui.js';

const nm = () => (S.settings.name || '').trim() || 'Divyesh';
const remById = (id) => S.reminders.find((r) => r.id === Number(id));
const payById = (id) => S.payments.find((p) => p.id === Number(id));
const loanById = (id) => S.loans.find((p) => p.id === Number(id));
const clientById = (id) => S.clients.find((c) => c.id === Number(id));
const leadById = (id) => S.leads.find((c) => c.id === Number(id));
const dreamById = (id) => S.dreams.find((c) => c.id === Number(id));
const clientName = (c) => c ? (c.company || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Client') : '';
const alertStart = B.alertStart;
const segOf = (k, d) => view.seg[k] || d;

onSave(() => { H.queueDriveSave(); H.queueSchedule(buildSchedule); });
V.onVoiceState((s) => { setAvatarState(s); const el = $('.lucy-state'); if (el) el.textContent = stateLabel(s); const c = $('.lucy-state-chip'); if (c) c.textContent = stateLabel(s).toUpperCase(); });
function stateLabel(s) { return s === 'speaking' ? 'Speaking' : s === 'listening' ? 'Listening' : s === 'thinking' ? 'Thinking' : 'Online'; }

/* =============================== navigation =============================== */
const TABS = [['home', 'Home', 'home'], ['plan', 'Plan', 'plan'], ['lucy', 'Lucy', ''], ['money', 'Money', 'wallet'], ['ascend', 'Ascend', 'ascend']];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, l, ic]) => k === 'lucy'
    ? '<button class="lucy-tab ' + (view.tab === k ? 'on' : '') + '" data-a="tab" data-v="lucy" aria-label="Lucy"><span class="orb"><span class="orb-ring"></span><span class="orb-ring r2"></span><span class="tab-av">' + avatar('mini') + '</span></span><span class="orb-label">' + l + '</span></button>'
    : '<button class="' + (view.tab === k ? 'on' : '') + '" data-a="tab" data-v="' + k + '">' + icon(ic, 22) + l + '</button>').join('');
}
function go(tab, sub, id) {
  view.tab = tab; view.sub = sub || null; view.id = id != null ? Number(id) : null;
  closeSheet(); render(); window.scrollTo(0, 0);
}
function render() {
  const screens = { home: renderHome, plan: renderPlan, money: renderMoney, ascend: renderAscend, lucy: renderLucy, more: renderMore };
  $('#app').innerHTML = (screens[view.tab] || renderHome)();
  renderTabs();
  const fabTabs = { plan: 1, money: 1 };
  const fabSubs = { clients: 1, leads: 1, ideas: 1, notes: 1, shopping: 1, learning: 1 };
  const showFab = (fabTabs[view.tab] && !view.sub) || (view.tab === 'ascend' && ['dreams', 'affirm'].includes(segOf('ascend', 'affirm'))) || (view.tab === 'more' && fabSubs[view.sub] && !view.id);
  const f = $('.fab');
  if (showFab && !f) document.body.insertAdjacentHTML('beforeend', '<button class="fab" data-a="fab" aria-label="Add">' + icon('plus', 26) + '</button>');
  if (!showFab && f) f.remove();
  if (view.tab === 'lucy') {
    const holo = $('.lucy-holo'); if (holo) mountLucy(holo, 'lucy.jpg');
    setAvatarState(V.isSpeaking() ? 'speaking' : view.chatBusy ? 'thinking' : 'idle');
    const c = $('#chat-end'); if (c && S.chat.length) c.scrollIntoView({ block: 'end' });
  }
  countUp($('#app'));
}
function topbar(title, opts) {
  opts = opts || {};
  const left = opts.back ? '<button class="back" data-a="back">' + icon('left', 18) + (opts.back === true ? 'Back' : esc(opts.back)) + '</button>'
    : '<div><div class="eyebrow">' + esc(opts.eyebrow || 'Lucy') + '</div>' + (title ? '<h1>' + title + '</h1>' : '') + '</div>';
  return '<div class="topbar">' + left + '<div class="row" style="gap:8px">' + (opts.extra || '') + '<button class="iconbtn" data-a="tab" data-v="more" aria-label="More">' + icon('grid', 19) + '</button></div></div>' + (opts.back && title ? '<h1>' + title + '</h1>' : '');
}

/* =============================== HOME =============================== */
function renderHome() {
  const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1);
  const b = B.briefing();
  const mission = B.ensureMission();
  const top = B.topFive();
  const nbm = B.nextBestMove();
  const rev = B.revenue();
  const act = S.routine.filter((x) => x.on), rdone = S.routineLog[B.today()] || [];
  const rCount = act.filter((x) => rdone.includes(x.key)).length;
  const tnow = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const mins = (it) => { const t = hm(it.time); return t.h * 60 + t.m; };
  const due = act.filter((it) => mins(it) <= tnow && !rdone.includes(it.key)).slice(-3);
  const next = act.filter((it) => mins(it) > tnow && !rdone.includes(it.key)).slice(0, 6 - due.length);
  const loansSoon = S.loans.filter((l) => !l.closed).map((l) => ({ l: l, due: nextLoanDue(l, now) })).filter((x) => x.due && x.due < L.addDays(d0, 8)).sort((a, b2) => a.due - b2.due);
  const paysSoon = S.payments.filter((p) => p.status === 'pending' && p.due < L.addDays(d0, 4)).sort((a, b2) => a.due - b2.due);
  const dreams = S.dreams.filter((x) => !x.achieved);
  const dream = dreams.length ? dreams[Math.floor(now / L.DAY) % dreams.length] : null;
  const evening = new Date(now).getHours() >= 19;
  const [g1] = b.greeting.split(',');

  let h = topbar('', { eyebrow: L.DAYNAME[new Date(now).getDay()] + ' · ' + new Date(now).getDate() + ' ' + L.MON[new Date(now).getMonth()], extra: '<button class="pf-btn" data-a="sub-profile" aria-label="My profile">' + (S.profile.photo ? '<img src="' + S.profile.photo + '" alt="">' : icon('user', 18)) + '</button>' });
  h += '<h1>' + esc(g1) + ',<br><b>' + esc(nm()) + '</b></h1>';
  h += banners();

  h += '<div class="panel gold hero brief fade-in"><div class="row" style="justify-content:space-between;margin-bottom:10px"><div class="eyebrow">Morning intelligence</div>' +
    '<button class="iconbtn" data-a="speak-brief" aria-label="Hear briefing">' + icon('volume', 18) + '</button></div>' +
    b.lines.map((l) => '<p>' + esc(l) + '</p>').join('') +
    (H.ready() ? '<div class="actions"><button class="btn small line" data-a="ai-brief">' + icon('spark', 16) + 'Deeper briefing</button></div>' : '') + '</div>';

  h += '<div class="panel"><div class="nbm"><div class="badge">' + icon('compass', 22) + '</div><div class="grow"><div class="eyebrow">Next best move</div>' +
    '<div style="font-size:16.5px;font-weight:600;margin:6px 0 4px">' + esc(nbm.text) + '</div><div class="sub">' + esc(nbm.why) + '</div>' +
    '<div class="actions"><button class="btn small" data-a="nbm-go" data-v="' + nbm.go + '">Do it now</button></div></div></div></div>';

  const mDone = mission.filter((m) => m.done).length;
  h += '<h2>Today\'s mission <span class="num gold">' + mDone + '/3</span></h2><div class="list mission">' + mission.map((m, i) =>
    '<div class="item ' + (m.done ? 'done' : '') + '"><span class="rank">0' + (i + 1) + '</span><div class="grow t">' + esc(m.text) + '</div>' +
    '<button class="check ' + (m.done ? 'on' : '') + '" data-a="mission" data-i="' + i + '">' + (m.done ? icon('check', 16) : '') + '</button></div>').join('') + '</div>';

  h += '<h2>Top 5 <span class="sub" style="letter-spacing:0;text-transform:none">picked by Lucy</span></h2>';
  h += top.length ? '<div class="list">' + top.map((x, i) => topRow(x, i)).join('') + '</div>' : '<div class="panel empty">Nothing urgent. Your Top 5 fills itself from reminders, payments and lead follow-ups.</div>';

  h += '<h2>Revenue mission<button class="link" data-a="tab" data-v="money">Open</button></h2>';
  h += '<div class="panel"><div class="row" style="gap:16px">' + ring(rev.pct, '<span data-count="' + Math.round(rev.pct * 100) + '" data-fmt="pct">' + Math.round(rev.pct * 100) + '%</span>', 'of target') +
    '<div class="grow"><div class="sub">Collected this month</div><div class="num" style="font-size:24px;font-weight:600">' + short(rev.collected) + '</div>' +
    '<div class="sub">Target ' + short(rev.target) + ' · gap ' + short(rev.gap) + '</div>' +
    (rev.outstanding ? '<div class="sub mt" style="margin-top:6px"><span class="gold">' + short(rev.outstanding) + '</span> waiting to be collected</div>' : '') + '</div></div></div>';

  const spSoon = SP.upcoming(14);
  if (spSoon.length) h += '<h2>Special days<button class="link" data-a="seg-go" data-tab="plan" data-k="plan" data-v="special">All</button></h2>' + listOf(spSoon.slice(0, 3).map(spRow));
  if (loansSoon.length || paysSoon.length) {
    h += '<h2>Money due soon</h2><div class="list">' +
      loansSoon.slice(0, 3).map((x) => '<div class="item" data-a="open-loan" data-id="' + x.l.id + '"><div class="badge">' + icon('bank', 18) + '</div><div class="grow"><div class="t">' + esc(loanTitle(x.l)) + '</div><div class="m">' + L.fmtDate(x.due) + (x.l.debitBank ? ' · from ' + esc(x.l.debitBank) : '') + '</div></div><div class="amount out">' + money(x.l.emi || x.l.amount) + '</div></div>').join('') +
      paysSoon.slice(0, 3).map((p) => payRow(p)).join('') + '</div>';
  }

  if (act.length) {
    h += '<h2>Daily routine <span class="num gold">' + rCount + '/' + act.length + '</span></h2><div class="bar" style="margin-bottom:12px"><i style="width:' + Math.round(100 * rCount / act.length) + '%"></i></div>';
    const chips = due.concat(next);
    h += chips.length ? '<div class="rgrid">' + chips.map((it) => '<button class="rchip ' + (mins(it) <= tnow ? 'due' : '') + '" data-a="routine" data-k="' + it.key + '">' + icon(it.icon, 22) + '<span class="rt">' + fmtHM(it.time) + '</span><span class="rl">' + esc(it.label) + '</span></button>').join('') + '</div>'
      : '<div class="panel empty">Routine complete for today.</div>';
  }

  if (dream) h += '<h2>Your dream<button class="link" data-a="seg-go" data-tab="ascend" data-k="ascend" data-v="dreams">All dreams</button></h2>' + dreamCard(dream);
  else h += '<h2>Your dream</h2><button class="panel" style="width:100%;text-align:left" data-a="seg-go" data-tab="ascend" data-k="ascend" data-v="dreams"><div class="row"><div class="badge">' + icon('star', 18) + '</div><div class="grow"><b>Add your first dream</b><div class="sub">Car, home, watch, office, your first film. See it every day.</div></div>' + icon('right', 18) + '</div></button>';

  if (evening) h += '<h2>Evening review</h2><button class="panel gold" style="width:100%;text-align:left" data-a="evening"><div class="row"><div class="badge">' + icon('moon', 18) + '</div><div class="grow"><b>Close your day</b><div class="sub">What you finished, what moves to tomorrow, and your journal.</div></div>' + icon('right', 18) + '</div></button>';
  return h;
}
function banners() {
  let h = '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (ios && !H.isStandalone()) h += '<div class="panel gold"><div class="row"><div class="badge">' + icon('plus', 18) + '</div><div class="grow"><b>Install Lucy on your iPhone</b><div class="sub">Tap the Share button in Safari, then <b>Add to Home Screen</b>. Open Lucy from that icon for notifications.</div></div></div></div>';
  if (!H.ready()) h += '<button class="panel" style="width:100%;text-align:left" data-a="open-connections"><div class="row"><div class="badge">' + icon('link', 18) + '</div><div class="grow"><b>Finish setup</b><div class="sub">Connect notifications, Google Drive and AI so Lucy can work fully.</div></div>' + icon('right', 18) + '</div></button>';
  else if (H.sync.state === 'error') h += '<button class="panel" style="width:100%;text-align:left" data-a="open-connections"><div class="row"><div class="badge" style="--c:var(--bad)">' + icon('cloud', 18) + '</div><div class="grow"><b>Drive sync paused</b><div class="sub">' + esc(H.sync.error) + '</div></div></div></button>';
  return h;
}
function topRow(x, i) {
  const rank = '<span class="rank">0' + (i + 1) + '</span>';
  if (x.kind === 'pay') { const p = payById(x.id); return p ? '<div class="item">' + rank + '<div class="grow" data-a="edit-pay" data-id="' + p.id + '"><div class="t">' + (p.type === 'in' ? 'Collect from ' : 'Pay ') + esc(p.party) + '</div><div class="m">' + (p.due < L.startOfDay(Date.now()) ? '<span class="late">Overdue</span>' : 'Due ' + L.fmtDate(p.due)) + '</div></div><div class="amount ' + p.type + '">' + money(p.amount) + '</div><button class="check" data-a="settle" data-id="' + p.id + '"></button></div>' : ''; }
  if (x.kind === 'lead') { const l = leadById(x.id); return l ? '<div class="item">' + rank + '<div class="grow" data-a="open-lead" data-id="' + l.id + '"><div class="t">Follow up: ' + esc(l.name) + '</div><div class="m">' + esc(l.status) + (l.score ? ' · score ' + l.score : '') + '</div></div>' + icon('right', 18) + '</div>' : ''; }
  const r = remById(x.id);
  if (!r) return '';
  const t = alertStart(r), late = t < Date.now();
  return '<div class="item ' + (x.tomorrow ? 'tmr' : '') + '">' + rank + '<div class="grow" data-a="edit-rem" data-id="' + r.id + '"><div class="t">' + esc(r.task) + '</div><div class="m ' + (late ? 'late' : '') + '">' + (x.tomorrow ? 'Tomorrow, ' + L.fmtTime(t) : late ? 'Overdue · ' + L.fmtWhen(t) : L.fmtTime(t)) + (r.clientId ? ' · ' + esc(clientName(clientById(r.clientId))) : '') + '</div></div><button class="check" data-a="done" data-id="' + r.id + '"></button></div>';
}

/* =============================== PLAN =============================== */
function renderPlan() {
  const s = segOf('plan', 'today');
  let h = topbar('Plan', { eyebrow: 'Your day, organised' }) + seg('plan', [['today', 'Today'], ['reminders', 'Reminders'], ['special', 'Special days'], ['routine', 'Routine']], s);
  if (s === 'today') {
    const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1);
    const rows = [];
    S.reminders.filter((r) => r.status === 'pending').forEach((r) => {
      const t = alertStart(r);
      if (t < d1) rows.push({ t: Math.max(t, d0 - 1), late: t < now, html: remRow(r, true) });
    });
    const done = S.routineLog[B.today()] || [];
    S.routine.filter((x) => x.on).forEach((it) => {
      const tt = hm(it.time), t = L.atTime(now, tt.h, tt.m), ok = done.includes(it.key);
      rows.push({ t: t, html: '<div class="item ' + (ok ? 'done' : '') + '"><button class="check ' + (ok ? 'on' : '') + '" data-a="routine" data-k="' + it.key + '">' + (ok ? icon('check', 16) : '') + '</button><div class="badge" style="width:32px;height:32px">' + icon(it.icon, 16) + '</div><div class="grow"><div class="t">' + esc(it.label) + '</div><div class="m">' + fmtHM(it.time) + ' · routine</div></div></div>' });
    });
    rows.sort((a, b2) => a.t - b2.t);
    h += listOf(rows.map((r) => r.html), 'Nothing planned today.');
  } else if (s === 'reminders') {
    const f = view.filter, now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1), d2 = L.addDays(d0, 2), d7 = L.addDays(d0, 7);
    const match = (r) => f === 'All' || (f === 'Repeating' ? !!r.repeat : r.cat === f);
    const pend = S.reminders.filter((r) => r.status === 'pending' && match(r)).sort((a, b2) => alertStart(a) - alertStart(b2));
    const one = pend.filter((r) => !r.repeat);
    const count = (x) => S.reminders.filter((r) => r.status === 'pending' && (x === 'All' || (x === 'Repeating' ? !!r.repeat : r.cat === x))).length;
    h += '<div class="fgrid">' + ['All'].concat(L.CATS, ['Repeating']).slice(0, 12).map((x) => '<button class="ftab ' + (x === f ? 'on' : '') + '" data-a="filter" data-v="' + x + '" ' + (C.CAT_COLOR[x] ? catStyle(x) : '') + '>' + icon(x === 'All' ? 'layers' : x === 'Repeating' ? 'repeat' : catIcon(x), 18) + '<b>' + x + '</b><small>' + count(x) + '</small></button>').join('') + '</div>';
    const groups = [['Overdue', one.filter((r) => alertStart(r) < now)], ['Today', one.filter((r) => alertStart(r) >= now && alertStart(r) < d1)], ['Tomorrow', one.filter((r) => alertStart(r) >= d1 && alertStart(r) < d2)],
      ['This week', one.filter((r) => alertStart(r) >= d2 && alertStart(r) < d7)], ['Later', one.filter((r) => alertStart(r) >= d7)], ['Repeating', pend.filter((r) => r.repeat)]];
    const body = groups.filter((g) => g[1].length).map((g) => '<h2 class="' + (g[0] === 'Overdue' ? 'late' : '') + '">' + g[0] + '</h2>' + listOf(g[1].map((r) => remRow(r)))).join('');
    h += body || '<div class="empty">Nothing here. Tap + to add a reminder.</div>';
    const done = S.reminders.filter((r) => r.status === 'done' && match(r)).sort((a, b2) => (b2.doneAt || 0) - (a.doneAt || 0)).slice(0, 10);
    if (done.length) h += '<h2>Recently done</h2>' + listOf(done.map((r) => remRow(r)));
  } else if (s === 'special') {
    h += renderSpecial();
  } else {
    const done = S.routineLog[B.today()] || [];
    h += '<div class="sub" style="margin:-4px 2px 12px">Change timings, ringing and voice in Settings.</div>';
    h += listOf(S.routine.map((it) => { const ok = done.includes(it.key); return '<div class="item ' + (ok ? 'done' : '') + (it.on ? '' : ' off') + '"><button class="check ' + (ok ? 'on' : '') + '" data-a="routine" data-k="' + it.key + '">' + (ok ? icon('check', 16) : '') + '</button><div class="badge" style="width:32px;height:32px">' + icon(it.icon, 16) + '</div><div class="grow"><div class="t">' + esc(it.label) + '</div><div class="m">' + fmtHM(it.time) + (it.on ? '' : ' · off') + '</div></div></div>'; }));
    h += '<button class="btn ghost block" data-a="settings-routine">' + icon('gear', 16) + 'Edit routine</button>';
  }
  return h;
}
function spRow(x) {
  const sd = x.sd, d = SP.daysUntil(x.at);
  const when = d === 0 ? '<span class="gold">Today</span>' : d === 1 ? 'Tomorrow' : 'In ' + d + ' days';
  const ic = sd.type === 'Birthday' ? 'cake' : sd.type === 'Anniversary' ? 'heart' : 'star';
  return '<div class="item sp-item ' + (d <= 1 ? 'soon' : '') + '"' + (sd.self ? ' data-a="sub-profile"' : ' data-a="edit-sp" data-id="' + sd.id + '"') + '><div class="badge" style="--c:' + (sd.type === 'Anniversary' ? '#F08BC4' : sd.type === 'Birthday' ? 'var(--gold)' : 'var(--cyan)') + '">' + icon(ic, 18) + '</div>' +
    '<div class="grow"><div class="t">' + esc(SP.specialTitle(sd, x.at)) + '</div><div class="m">' + L.fmtDate(x.at) + (sd.relation ? ' · ' + esc(sd.relation) : '') + '</div></div><div class="right sp-when">' + when + '</div></div>';
}
function renderSpecial() {
  const all = SP.upcoming();
  let h = '<div class="panel gold"><div class="row"><div class="badge">' + icon('gift', 20) + '</div><div class="grow"><b>Never miss a special day</b><div class="sub">Lucy reminds you 7 days before, the evening before, and on the day.</div></div></div>' +
    '<div class="actions"><button class="btn small" data-a="new-sp" data-v="Birthday">' + icon('cake', 15) + 'Add birthday</button><button class="btn small line" data-a="new-sp" data-v="Anniversary">' + icon('heart', 15) + 'Add anniversary</button></div></div>';
  if (!S.profile.dob) h += '<button class="panel" style="width:100%;text-align:left" data-a="sub-profile"><div class="row"><div class="badge">' + icon('user', 18) + '</div><div class="grow"><b>Add your own birthday and anniversary</b><div class="sub">In your profile. Lucy will celebrate with you.</div></div>' + icon('right', 18) + '</div></button>';
  const soon = all.filter((x) => SP.daysUntil(x.at) <= 30), later = all.filter((x) => SP.daysUntil(x.at) > 30);
  if (soon.length) h += '<h2>Next 30 days</h2>' + listOf(soon.map(spRow));
  if (later.length) h += '<h2>Later this year</h2>' + listOf(later.map(spRow));
  if (!all.length) h += '<div class="empty">No special days yet. Add birthdays and anniversaries of family, friends and clients.</div>';
  return h;
}
function specialSheet(sd, type) {
  sd = sd || { type: type || 'Birthday', name: '', date: '', year: 0, relation: '', phone: '', note: '', remind7: true };
  const [mm, dd] = String(sd.date || '').split('-').map(Number);
  openSheet('<h3>' + (sd.id ? 'Edit special day' : 'New ' + sd.type.toLowerCase()) + '</h3>' +
    '<div class="seg" id="sp-type">' + SP.SPECIAL_TYPES.map(([t]) => '<button class="' + (t === sd.type ? 'on' : '') + '" data-a="sp-type" data-v="' + t + '">' + t + '</button>').join('') + '</div>' +
    '<label>Whose</label><input id="sp-name" value="' + esc(sd.name) + '" placeholder="e.g. Mummy, Devanshi, Mr. Ravi">' +
    '<div class="grid2"><div><label>Day</label><select id="sp-d">' + Array.from({ length: 31 }, (_, i) => '<option ' + (dd === i + 1 ? 'selected' : '') + '>' + (i + 1) + '</option>').join('') + '</select></div>' +
    '<div><label>Month</label><select id="sp-m">' + L.MON.map((m, i) => '<option value="' + (i + 1) + '" ' + (mm === i + 1 ? 'selected' : '') + '>' + m + '</option>').join('') + '</select></div></div>' +
    '<label>Year (optional, to show age or years)</label><input id="sp-y" type="number" inputmode="numeric" value="' + (sd.year || '') + '" placeholder="e.g. 1994">' +
    '<div class="grid2"><div><label>Relation</label><input id="sp-rel" value="' + esc(sd.relation || '') + '" placeholder="Family, friend, client"></div><div><label>Phone (optional)</label><input id="sp-phone" type="tel" value="' + esc(sd.phone || '') + '"></div></div>' +
    '<label>Gift or wish idea</label><input id="sp-note" value="' + esc(sd.note || '') + '">' +
    '<div class="row mt"><input type="checkbox" id="sp-7" ' + (sd.remind7 === false ? '' : 'checked') + '><span>Also remind me 7 days before</span></div>' +
    '<button class="btn block" data-a="save-sp" data-id="' + (sd.id || '') + '">Save</button>' + (sd.id ? '<button class="btn danger block" data-a="del-sp" data-id="' + sd.id + '">Delete</button>' : ''));
  $('#sheet').dataset.sptype = sd.type;
}
function renderProfile() {
  const p = S.profile;
  const f = (k, l, type, ph) => '<label>' + l + '</label><input data-prof="' + k + '" type="' + (type || 'text') + '" value="' + esc(p[k] || '') + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '>';
  return topbar('My profile', { back: 'More' }) +
    '<div class="profile-head panel gold"><label class="pf-photo">' + (p.photo ? '<img src="' + p.photo + '" alt="">' : icon('user', 40)) + '<input type="file" accept="image/*" id="pf-photo" hidden><span>' + icon('camera', 14) + '</span></label>' +
    '<div class="grow"><div class="pf-name">' + esc(p.fullName || nm()) + '</div><div class="sub">' + esc([p.role, p.company].filter(Boolean).join(' · ')) + '</div>' +
    (p.dob ? '<div class="sub gold mt" style="margin-top:6px">' + icon('cake', 13) + ' ' + L.fmtDate(SP.nextOccurrence({ date: p.dob.slice(5) })) + '</div>' : '') + '</div></div>' +
    '<h2>Personal</h2>' + f('fullName', 'Full name') + f('nickname', 'What Lucy calls you') +
    '<div class="grid2"><div>' + f('dob', 'Birthday', 'date') + '</div><div>' + f('anniversary', 'Wedding anniversary', 'date') + '</div></div>' +
    f('spouse', 'Spouse') + '<div class="grid2"><div>' + f('phone', 'Phone', 'tel') + '</div><div>' + f('altPhone', 'Other phone', 'tel') + '</div></div>' + f('email', 'Email', 'email') +
    f('city', 'City') + f('address', 'Home address') + '<div class="grid2"><div>' + f('bloodGroup', 'Blood group') + '</div><div>' + f('emergencyPhone', 'Emergency phone', 'tel') + '</div></div>' + f('emergencyName', 'Emergency contact name') +
    '<h2>Work</h2>' + f('company', 'Company') + f('role', 'Role') + f('website', 'Website') + f('officeAddress', 'Office address') +
    '<h2>Social</h2>' + f('instagram', 'Instagram', 'text', '@handle') + f('linkedin', 'LinkedIn') + f('youtube', 'YouTube') +
    '<h2>About me</h2><textarea data-prof="about" placeholder="Anything Lucy should know about you: goals, habits, what motivates you">' + esc(p.about || '') + '</textarea>' +
    '<div class="hint">Saved automatically and synced to all your devices. Lucy uses your profile to personalise her help.</div>';
}
function remRow(r, timeOnly) {
  const now = Date.now(), t = alertStart(r);
  const late = r.status === 'pending' && t < now;
  const meta = [r.status === 'done' ? 'Done ' + L.fmtWhen(r.doneAt || r.due) : (timeOnly && !late ? L.fmtTime(t) : L.fmtWhen(t))];
  if (r.repeat) meta.push(L.repeatLabel(r));
  if (r.clientId) meta.push(clientName(clientById(r.clientId)));
  return '<div class="item ' + (r.status === 'done' ? 'done' : '') + '"><button class="check ' + (r.status === 'done' ? 'on' : '') + '" data-a="' + (r.status === 'done' ? 'undo' : 'done') + '" data-id="' + r.id + '">' + (r.status === 'done' ? icon('check', 16) : '') + '</button>' +
    '<div class="badge" ' + catStyle(r.cat) + ' style="width:32px;height:32px">' + icon(catIcon(r.cat), 16) + '</div><div class="grow" data-a="edit-rem" data-id="' + r.id + '"><div class="t">' + esc(r.task) + '</div><div class="m ' + (late ? 'late' : '') + '">' + esc(meta.join(' · ')) + '</div></div></div>';
}

/* =============================== MONEY =============================== */
function loanTitle(l) { return l.type === 'friend' ? 'Pay ' + (l.lender || 'friend') : (l.title || l.lender || 'Loan') + ' EMI'; }
function payRow(p) {
  const late = p.status === 'pending' && L.atTime(p.due, 23, 59) < Date.now();
  return '<div class="item"><div class="badge" style="--c:' + (p.type === 'in' ? 'var(--good)' : 'var(--warn)') + '">' + icon(p.type === 'in' ? 'trend' : 'card', 18) + '</div><div class="grow" data-a="edit-pay" data-id="' + p.id + '"><div class="t">' + esc(p.party) + '</div><div class="m ' + (late ? 'late' : '') + '">' + (p.status === 'settled' ? 'Settled ' + L.fmtDate(p.settledAt) : (late ? 'Overdue · ' : 'Due ') + L.fmtDate(p.due)) + (p.note ? ' · ' + esc(p.note) : '') + '</div></div>' +
    '<div class="right"><div class="amount ' + p.type + '">' + money(p.amount) + '</div>' + (p.status === 'pending' ? '<button class="link" data-a="settle" data-id="' + p.id + '">' + (p.type === 'in' ? 'Received' : 'Paid') + '</button>' : '') + '</div></div>';
}
function renderMoney() {
  const s = segOf('money', 'mission');
  let h = topbar('Money', { eyebrow: 'Money magnet' }) + seg('money', [['mission', 'Mission'], ['cash', 'In & out'], ['loans', 'Loans & EMIs'], ['expenses', 'Expenses']], s);
  if (s === 'mission') {
    const r = B.revenue();
    h += '<div class="panel gold hero"><div class="eyebrow">Revenue mission · ' + L.MON[new Date().getMonth()] + '</div>' +
      '<div class="row mt2" style="gap:16px">' + ring(r.pct, '<span data-count="' + Math.round(r.pct * 100) + '" data-fmt="pct">' + Math.round(r.pct * 100) + '%</span>', 'collected', 124) + '<div class="grow"><div class="num" style="font-size:28px;font-weight:600">' + short(r.collected) + '</div><div class="sub">of ' + short(r.target) + ' target</div><div class="sub" style="margin-top:6px">Gap <span class="gold">' + short(r.gap) + '</span></div></div></div>' +
      '<div class="sub mt">' + (r.clientsNeeded != null ? 'At your average retainer of ' + money(Math.round(r.avg)) + ', you need about <b class="gold">' + r.clientsNeeded + ' more retainer clients</b> to reach ' + short(r.target) + ' a month.' : 'Add monthly retainer amounts to your clients so Lucy can calculate how many clients you need.') + '</div></div>';
    h += '<div class="stats">' +
      stat('Monthly recurring', short(r.mrr), r.activeClients + ' retainer clients') + stat('Outstanding', short(r.outstanding), 'waiting to be collected') +
      stat('Expected this month', short(r.expected), 'pending receivables') + stat('Average retainer', r.avg ? short(r.avg) : '—', 'per active client') +
      stat('Expenses this month', short(r.expenses), 'logged') + stat('Collected minus expenses', short(r.net), 'this month, not full profit') + '</div>';
    h += '<div class="panel"><h3>Collected, last 6 months</h3>' + chart(r.history, short) + '</div>';
    const g = B.growthPlan();
    h += '<h2>Growth plan<button class="link" data-a="edit-growth">Edit</button></h2>';
    h += '<div class="panel gold"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">Plan revenue</div><div class="num" style="font-size:26px;font-weight:600;margin-top:4px">' + short(g.planRevenue) + '<span class="sub"> / month</span></div></div><div class="right"><div class="eyebrow">Clients</div><div class="num" style="font-size:26px;font-weight:600;margin-top:4px">' + g.planClients + '</div></div></div>' +
      '<div class="sub mt">' + (g.planRevenue >= r.target ? 'This plan covers your ' + short(r.target) + ' target with ' + short(g.planRevenue - r.target) + ' to spare.' : 'This plan is ' + short(r.target - g.planRevenue) + ' short of your ' + short(r.target) + ' target.') + '</div></div>';
    h += g.rows.map((t) => { const pct = t.count ? Math.min(1, t.have / t.count) : 0; return '<div class="tier"><div class="row"><div class="grow"><b>' + esc(t.name) + '</b> <span class="sub">· ' + money(t.price) + ' / month</span></div><div class="num">' + t.have + ' / ' + t.count + '</div></div><div class="bar mt" style="margin-top:8px"><i style="width:' + Math.round(pct * 100) + '%"></i></div><div class="sub" style="margin-top:6px;font-size:12.5px">' + short(t.revenue) + ' when full' + (t.have ? ' · now ' + short(t.haveMrr) : '') + '</div></div>'; }).join('');
    h += '<h2>Team plan · ' + g.teamHave + ' / ' + g.teamNeed + ' hired</h2><div class="list">' + g.team.map((m, i) => '<div class="item"><div class="badge" style="width:34px;height:34px">' + icon(/editor/i.test(m.role) ? 'film' : /design/i.test(m.role) ? 'edit' : /sales|market/i.test(m.role) ? 'trend' : /photo|video/i.test(m.role) ? 'camera' : /social/i.test(m.role) ? 'chat' : 'briefcase', 16) + '</div><div class="grow"><div class="t">' + esc(m.role) + '</div><div class="m">' + (m.have >= m.need ? '<span class="gold">Team complete</span>' : (m.need - m.have) + ' to hire') + (m.salary ? ' · ' + money(m.salary) + ' each' : '') + '</div></div><div class="row" style="gap:6px"><button class="iconbtn" style="width:32px;height:32px" data-a="team-dec" data-i="' + i + '">−</button><span class="num" style="min-width:42px;text-align:center">' + m.have + '/' + m.need + '</span><button class="iconbtn" style="width:32px;height:32px" data-a="team-inc" data-i="' + i + '">+</button></div></div>').join('') + '</div>';
    if (g.salaryKnown) h += '<div class="stats">' + stat('Team payroll (full team)', short(g.payrollPlan), 'per month') + stat('Plan revenue minus payroll', short(g.planRevenue - g.payrollPlan), 'before other costs') + '</div>';
    else h += '<div class="sub" style="margin:0 2px 12px">Add salaries in Edit to see payroll against revenue.</div>';
    if (g.clientsPerEditor) h += '<div class="sub" style="margin:0 2px 12px">Workload check: ' + g.planClients + ' clients across your editors is about <b class="gold">' + Math.round(g.clientsPerEditor) + ' clients per editor</b>.</div>';
    h += '<div class="sub" style="margin:4px 2px">Lucy uses only your real entries. Revenue is money received; it is not profit.</div>';
    h += '<button class="btn ghost block" data-a="edit-target">' + icon('target', 16) + 'Change monthly target</button>';
  } else if (s === 'cash') {
    const t = segOf('cashdir', 'in');
    const pend = S.payments.filter((p) => p.status === 'pending' && p.type === t).sort((a, b2) => a.due - b2.due);
    const sum = (arr) => arr.reduce((a, p) => a + Number(p.amount), 0);
    h += '<div class="stats">' + stat('To receive', short(sum(S.payments.filter((p) => p.status === 'pending' && p.type === 'in'))), '') + stat('To pay', short(sum(S.payments.filter((p) => p.status === 'pending' && p.type === 'out'))), '') + '</div>';
    h += seg('cashdir', [['in', 'To receive'], ['out', 'To pay']], t);
    h += listOf(pend.map(payRow), t === 'in' ? 'Nobody owes you anything right now.' : 'No bills pending.');
    const settled = S.payments.filter((p) => p.status === 'settled' && p.type === t).sort((a, b2) => b2.settledAt - a.settledAt).slice(0, 12);
    if (settled.length) h += '<h2>Settled</h2>' + listOf(settled.map(payRow));
  } else if (s === 'loans') {
    const st = B.loanStats();
    h += '<div class="stats">' + stat('Monthly EMIs', short(st.monthly), st.open + ' open') + stat('Outstanding', short(st.outstanding), st.freeAt ? 'Debt-free by ' + L.MON[new Date(st.freeAt).getMonth()] + ' ' + new Date(st.freeAt).getFullYear() : 'Add EMIs left to see') + '</div>';
    C.LOAN_TYPES.forEach(([k, label, ic]) => {
      const list = S.loans.filter((l) => l.type === k && !l.closed);
      if (!list.length) return;
      h += '<h2>' + label + 's</h2><div class="list">' + list.map((l) => loanRow(l, ic)).join('') + '</div>';
    });
    if (!S.loans.filter((l) => !l.closed).length) h += '<div class="panel empty">No loans added. Tap + to add a bank loan, personal loan, product EMI or a friendly loan.</div>';
    const closed = S.loans.filter((l) => l.closed);
    if (closed.length) h += '<h2>Closed</h2>' + listOf(closed.map((l) => loanRow(l, 'check')));
  } else {
    const mk = L.dayKey(Date.now()).slice(0, 7);
    const list = S.expenses.slice().sort((a, b2) => b2.date - a.date);
    const month = list.filter((e) => e.recurring || L.dayKey(e.date).slice(0, 7) === mk);
    h += '<div class="stats">' + stat('This month', short(month.reduce((a, e) => a + Number(e.amount), 0)), month.length + ' entries') + stat('Recurring', short(list.filter((e) => e.recurring).reduce((a, e) => a + Number(e.amount), 0)), 'every month') + '</div>';
    h += listOf(list.slice(0, 60).map((e) => '<div class="item" data-a="edit-exp" data-id="' + e.id + '"><div class="badge">' + icon('card', 18) + '</div><div class="grow"><div class="t">' + esc(e.title) + '</div><div class="m">' + esc(e.cat || 'Other') + ' · ' + (e.recurring ? 'Every month' : L.fmtDate(e.date)) + '</div></div><div class="amount out">' + money(e.amount) + '</div></div>'), 'No expenses yet. Tap + to log salaries, rent, software and more.');
  }
  return h;
}
function stat(l, n, s) { return '<div class="stat"><div class="l">' + l + '</div><div class="n">' + n + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }
function loanRow(l, ic) {
  const due = nextLoanDue(l);
  const left = l.type === 'friend' ? money(B.loanOutstanding(l)) + ' left' : (l.emisLeft || 0) + ' EMIs left';
  const pct = l.type === 'friend' ? (Number(l.amount) ? (Number(l.paid || 0) / Number(l.amount)) : 0) : (Number(l.totalEmis) ? 1 - Number(l.emisLeft || 0) / Number(l.totalEmis) : 0);
  return '<div class="item" data-a="open-loan" data-id="' + l.id + '"><div class="badge">' + icon(ic, 18) + '</div><div class="grow"><div class="t">' + esc(l.type === 'friend' ? (l.lender || 'Friend') + (l.purpose ? ' · ' + l.purpose : '') : (l.title || l.lender)) + '</div>' +
    '<div class="m">' + (l.closed ? 'Closed' : left + (due ? ' · next ' + L.fmtDate(due) : '')) + (l.debitBank ? ' · ' + esc(l.debitBank) : '') + '</div>' +
    (pct ? '<div class="bar" style="margin-top:6px"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' : '') + '</div><div class="amount out">' + money(l.emi || l.amount) + '</div></div>';
}

/* =============================== ASCEND =============================== */
function renderAscend() {
  const s = segOf('ascend', 'affirm');
  let h = topbar('Ascend', { eyebrow: 'Mindset · dreams · discipline' }) + seg('ascend', [['affirm', 'Affirm'], ['dreams', 'Dreams'], ['founder', 'Founder'], ['journal', 'Journal']], s);
  if (s === 'affirm') {
    const list = B.todaysAffirmations(), done = S.affirm.done[B.today()] || [];
    h += '<div class="stats">' + stat('Affirmation streak', '<span class="num">' + B.affirmStreak() + '</span> days', '') + stat('Today', done.length + ' / ' + list.length, 'completed') + '</div>';
    h += list.map((a) => affCard(a, done.includes(a.id))).join('');
    const custom = S.affirm.custom || [];
    if (custom.length) h += '<h2>Your own affirmations</h2>' + custom.map((a) => affCard(a, done.includes(a.id), true)).join('');
    const hist = Object.keys(S.affirm.done).sort().reverse().slice(0, 14);
    if (hist.length) h += '<h2>History</h2>' + listOf(hist.map((k) => '<div class="item"><div class="badge">' + icon('star', 16) + '</div><div class="grow"><div class="t">' + L.fmtDate(new Date(k + 'T12:00').getTime()) + '</div><div class="m">' + S.affirm.done[k].length + ' affirmations completed' + ((S.affirm.spoken[k] || []).length ? ', ' + S.affirm.spoken[k].length + ' spoken aloud' : '') + '</div></div></div>'));
  } else if (s === 'dreams') {
    h += '<div class="panel gold hero"><div class="eyebrow">Vision</div><ul class="vision">' + (S.settings.vision || []).map((v) => '<li>' + esc(v) + '</li>').join('') + '</ul><div class="actions"><button class="btn small line" data-a="edit-vision">' + icon('edit', 15) + 'Edit vision</button></div></div>';
    const list = S.dreams.slice().sort((a, b2) => (a.achieved - b2.achieved) || ((a.targetDate || 9e15) - (b2.targetDate || 9e15)));
    h += list.length ? '<div class="dgrid">' + list.map(dreamTile).join('') + '</div>' : '<div class="panel empty">Add the things you are working for: car, home, watch, gold, office, vacations, bank balance, your first film. Lucy keeps them in front of you every day.</div>';
  } else if (s === 'founder') {
    h += '<div class="panel"><div class="eyebrow">Founder mode</div><div class="sub" style="margin-top:6px">Tell Lucy how you feel. She turns it into one next action.</div></div>';
    h += Object.keys(C.FOUNDER).map((k) => '<button class="mrow" data-a="founder" data-v="' + k + '"><div class="badge">' + icon({ discouraged: 'heart', rejected: 'shield', procrastinating: 'hourglass', overwhelmed: 'layers', breakdown: 'target' }[k], 20) + '</div><span class="grow"><b>' + C.FOUNDER[k].title + '</b></span>' + icon('right', 18, 'chev') + '</button>').join('');
    h += '<h2>Remember your potential</h2>' + C.POTENTIAL.map((p) => '<div class="panel"><div class="serif" style="font-size:20px;line-height:1.35">' + esc(p) + '</div></div>').join('');
  } else {
    const k = B.today(), e = S.journal[k] || {};
    const answered = C.JOURNAL_QS.filter((q) => e[q.id]).length;
    h += '<div class="row" style="justify-content:space-between"><div class="sub">' + answered + '/' + C.JOURNAL_QS.length + ' answered today · saves automatically</div></div><div class="bar mt" style="margin-bottom:12px"><i style="width:' + Math.round(100 * answered / C.JOURNAL_QS.length) + '%"></i></div>';
    h += C.JOURNAL_QS.map((q) => q.type === 'rating'
      ? '<div class="jq"><label>' + q.q + '</label><div class="rating">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<button class="' + (Number(e.rating) === n ? 'on' : '') + '" data-a="rate" data-v="' + n + '">' + n + '</button>').join('') + '</div></div>'
      : '<div class="jq"><label>' + q.q + '</label><textarea data-j="' + q.id + '" rows="2">' + esc(e[q.id] || '') + '</textarea></div>').join('');
    const past = Object.keys(S.journal).filter((d) => d !== k).sort().reverse().slice(0, 10);
    if (past.length) h += '<h2>Past entries</h2>' + past.map((d) => { const x = S.journal[d]; return '<div class="panel"><b>' + L.fmtDate(new Date(d + 'T12:00').getTime()) + '</b>' + (x.rating ? ' <span class="gold">· ' + x.rating + '/10</span>' : '') + C.JOURNAL_QS.filter((q) => x[q.id] && q.type !== 'rating').slice(0, 3).map((q) => '<div class="sub" style="margin-top:6px">' + esc(x[q.id]) + '</div>').join('') + '</div>'; }).join('');
  }
  return h;
}
function affCard(a, done, custom) {
  return '<div class="aff ' + (done ? 'done' : '') + '"><div class="row" style="justify-content:space-between"><span class="eyebrow">' + esc(a.cat || 'Personal') + '</span>' + (done ? '<span class="gold" style="font-size:12px;font-weight:600">COMPLETED</span>' : '') + '</div>' +
    '<div class="q">' + esc(a.text) + '</div>' + (a.action ? '<div class="a">' + icon('bolt', 15) + '<span>' + esc(a.action) + '</span></div>' : '') +
    '<div class="actions"><button class="btn small ghost" data-a="aff-hear" data-id="' + a.id + '">' + icon('volume', 15) + 'Hear</button><button class="btn small ghost" data-a="aff-speak" data-id="' + a.id + '">' + icon('mic', 15) + 'Speak it</button>' +
    (done ? '' : '<button class="btn small" data-a="aff-done" data-id="' + a.id + '">' + icon('check', 15) + 'Done</button>') +
    (a.action ? '<button class="btn small line" data-a="aff-action" data-id="' + a.id + '">Add action</button>' : '') +
    (custom ? '<button class="btn small ghost" data-a="aff-del" data-id="' + a.id + '">' + icon('trash', 15) + '</button>' : '') + '</div><div class="heard" id="heard-' + a.id + '"></div></div>';
}
function dreamIcon(d) { const c = C.DREAM_CATS.find((x) => x[0] === d.cat); return c ? c[1] : 'star'; }
function dreamProgress(d) {
  const parts = [];
  if (d.target) parts.push(short(d.saved || 0) + ' of ' + short(d.target));
  if (d.targetDate) { const days = Math.ceil((d.targetDate - Date.now()) / L.DAY); parts.push(days > 0 ? days + ' days to go' : 'Target date passed'); }
  return parts.join(' · ');
}
function dreamTile(d) {
  const pct = d.target ? Math.min(1, Number(d.saved || 0) / Number(d.target)) : 0;
  return '<button class="dtile ' + (d.achieved ? 'achieved' : '') + '" data-a="open-dream" data-id="' + d.id + '">' + (d.img ? '<img src="' + d.img + '" alt="">' : '<span class="bigicon">' + icon(dreamIcon(d), 30) + '</span>') + '<div class="shade"></div><div class="in"><small class="eyebrow">' + (d.achieved ? 'Achieved' : esc(d.cat || 'Dream')) + '</small><b>' + esc(d.title) + '</b><small>' + esc(dreamProgress(d)) + '</small>' + (pct ? '<div class="bar" style="margin-top:6px"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' : '') + '</div></button>';
}
function dreamCard(d) {
  return '<button class="dream-card" style="width:100%;text-align:left" data-a="open-dream" data-id="' + d.id + '">' + (d.img ? '<img src="' + d.img + '" alt="">' : '<span class="bigicon">' + icon(dreamIcon(d), 34) + '</span>') + '<div class="shade"></div><div class="in"><div class="eyebrow">' + esc(d.cat || 'Dream') + '</div><div style="font-family:var(--display);font-size:22px;font-weight:600;margin:4px 0">' + esc(d.title) + '</div>' + (d.why ? '<div class="serif" style="font-size:17px;color:var(--text2)">' + esc(d.why) + '</div>' : '') + '<div class="sub" style="margin-top:6px">' + esc(dreamProgress(d)) + '</div></div></button>';
}

/* =============================== LUCY =============================== */
const QUICK = [
  ['brief', 'Brief me', 'Give me my briefing for today: priorities, money, follow-ups and the three actions that matter most.'],
  ['next', 'Next best move', 'What is my next best move right now, and why? Keep it short.'],
  ['hunter', 'Find clients', 'Find new potential clients for DZYN LAB using my Hunter profile.'],
  ['pricing', 'Price a client', 'Help me price a new client. Ask me what you need to know about their requirements.'],
  ['plan90', '90-day plan', 'Break my monthly revenue goal into a realistic 90-day plan with weekly actions.'],
  ['content', 'Content ideas', 'Give me 5 strong reel ideas for DZYN LAB\'s own Instagram this week, with hooks.'],
  ['director', 'Director mindset', 'I want to become a successful Bollywood director. Give me one practical step for this week that fits around running DZYN LAB.']
];
function renderLucy() {
  const prov = S.settings.provider === 'chatgpt' ? 'chatgpt' : 'claude';
  let h = '<div class="topbar"><div><div class="eyebrow">Lucy</div></div><div class="row" style="gap:8px"><button class="iconbtn" data-a="toggle-speak" aria-label="Voice">' + icon(S.settings.speak ? 'volume' : 'stop', 18) + '</button><button class="iconbtn" data-a="tab" data-v="more">' + icon('grid', 19) + '</button></div></div>';
  const holo = !S.settings.avatarImg;
  const st0 = V.isSpeaking() ? 'speaking' : view.chatBusy ? 'thinking' : 'idle';
  h += '<div class="lucy-stage ' + (holo ? 'holo' : '') + '"><div class="hud-rings"><i></i><i></i><i></i><span class="hud-tick t1"></span><span class="hud-tick t2"></span></div>' +
    (holo ? '<div class="lucy-holo"><img class="holo-fallback" src="lucy.jpg" alt="Lucy"></div><div class="holo-floor"></div>' : avatar('big')) + '<div class="fade"></div>' +
    '<div class="hud-corner tl"></div><div class="hud-corner tr"></div><div class="hud-corner bl"></div><div class="hud-corner br"></div>' +
    '<div class="hud-read l"><b>LUCY</b><span>v3 · neural</span></div><div class="hud-read r"><b class="lucy-state-chip">' + stateLabel(st0).toUpperCase() + '</b><span>' + (S.settings.provider === 'chatgpt' ? 'ChatGPT' : 'Claude') + ' link</span></div></div>' +
    '<div class="lucy-wave">' + Array.from({ length: 29 }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div><div class="lucy-state">' + stateLabel(st0) + '</div>';
  h += '<div class="seg" style="margin-top:14px"><button class="' + (prov === 'claude' ? 'on' : '') + '" data-a="provider" data-v="claude">Claude</button><button class="' + (prov === 'chatgpt' ? 'on' : '') + '" data-a="provider" data-v="chatgpt">ChatGPT</button></div>';
  if (!H.ready()) h += '<button class="panel" style="width:100%;text-align:left" data-a="open-connections"><div class="row"><div class="badge">' + icon('key', 18) + '</div><div class="grow"><b>Connect Lucy\'s brain</b><div class="sub">Lucy can already speak and coach you. Add your Claude and ChatGPT keys so she can think, research and write for you.</div></div></div></button>';
  h += '<div class="hscroll">' + QUICK.map((q) => '<button class="chip" data-a="quick" data-v="' + q[0] + '">' + icon(q[0] === 'hunter' ? 'search' : q[0] === 'pricing' ? 'coins' : 'spark', 14) + q[1] + '</button>').join('') + '</div>';
  h += '<div class="chat">' + (S.chat.length ? S.chat.slice(-30).map(msgHtml).join('') : '<div class="msg lucy"><div class="who"><span>Lucy</span></div>Hi ' + esc(nm()) + '. I am here. Ask me anything, or tap a suggestion above. I can plan your day, find clients, price work, and push you towards your dreams.</div>') +
    (view.chatBusy ? '<div class="msg lucy"><div class="typing"><i></i><i></i><i></i></div></div>' : '') + '<div id="chat-end"></div></div>';
  h += '<div class="composer"><button class="iconbtn mic" data-a="mic" aria-label="Speak">' + icon('mic', 20) + '</button><textarea id="ask" rows="1" placeholder="Talk to Lucy…" enterkeyhint="send"></textarea><button class="iconbtn send" data-a="send" aria-label="Send">' + icon('send', 19) + '</button></div>';
  return h;
}
function msgHtml(m, i) {
  const idx = S.chat.length - Math.min(30, S.chat.length) + i;
  if (m.role === 'user') return '<div class="msg me">' + esc(m.content) + '</div>';
  return '<div class="msg lucy"><div class="who"><span>Lucy' + (m.provider ? ' · ' + (m.provider === 'chatgpt' ? 'ChatGPT' : 'Claude') : '') + '</span><button data-a="say" data-i="' + idx + '">' + icon('volume', 14) + '</button></div>' + esc(m.content) +
    (m.sources && m.sources.length ? '<div class="src">' + m.sources.slice(0, 6).map((s) => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title || s.url) + '</a>').join('') + '</div>' : '') +
    (m.actions || []).map((a, j) => '<div class="act-card"><div class="badge" style="width:30px;height:30px">' + icon({ reminder: 'bell', lead: 'target', idea: 'bulb', note: 'note' }[a.type] || 'spark', 15) + '</div><div class="grow t">' + esc(actionLabel(a)) + '</div>' +
      (a.status ? '<span class="gold" style="font-size:12px">' + (a.status === 'done' ? 'Added' : 'Skipped') + '</span>' : '<button class="btn small" data-a="act-ok" data-i="' + idx + '" data-j="' + j + '">Approve</button><button class="btn small ghost" data-a="act-no" data-i="' + idx + '" data-j="' + j + '">' + icon('x', 14) + '</button>') + '</div>').join('') + '</div>';
}
function actionLabel(a) {
  if (a.type === 'reminder') return 'Reminder: ' + a.text;
  if (a.type === 'lead') return 'Lead: ' + a.name + (a.city ? ', ' + a.city : '') + (a.score ? ' · score ' + a.score : '');
  if (a.type === 'idea') return 'Idea: ' + a.text;
  if (a.type === 'note') return 'Note: ' + (a.title || '');
  return a.type;
}
async function ask(text, mode) {
  text = String(text || '').trim();
  if (!text) return;
  if (!H.ready()) { toast('Connect Lucy first in Settings > Connections'); go('more', 'connections'); return; }
  S.chat.push({ role: 'user', content: text, t: Date.now() });
  if (S.chat.length > 80) S.chat = S.chat.slice(-60);
  view.chatBusy = true; save({ local: true }); render(); setAvatarState('thinking');
  const provider = mode === 'hunter' ? 'claude' : (S.settings.provider === 'chatgpt' ? 'chatgpt' : 'claude');
  try {
    const history = S.chat.slice(-16).map((m) => ({ role: m.role, content: m.content }));
    const r = await H.api.ai({ provider: provider, system: B.aiSystem(mode), messages: history, web: mode === 'hunter', maxTokens: mode === 'hunter' ? 3500 : 1600 });
    const parsed = B.parseActions(r.text);
    S.chat.push({ role: 'assistant', content: parsed.text || '(no answer)', provider: r.provider, sources: r.sources || [], actions: parsed.actions, t: Date.now() });
    view.chatBusy = false; save(); render();
    if (S.settings.autoSpeakReplies) V.speak(parsed.text);
  } catch (e) {
    view.chatBusy = false;
    S.chat.push({ role: 'assistant', content: 'I could not reach my brain just now. ' + e.message, t: Date.now() });
    save({ local: true }); render(); setAvatarState('idle');
  }
}
function approveAction(i, j) {
  const m = S.chat[i]; if (!m || !m.actions || !m.actions[j]) return;
  const a = m.actions[j];
  if (a.type === 'reminder') {
    const r = L.parseReminder(a.text);
    if (r) { addReminder(r); toast('Reminder set · ' + L.fmtWhen(r.due)); }
    else { reminderSheet(null, { task: a.text }); }
  } else if (a.type === 'lead') {
    S.leads.push({ id: nid(), name: a.name || 'Unnamed', industry: a.industry || '', city: a.city || '', website: a.website || '', phone: a.phone || '', email: a.email || '', instagram: a.instagram || '',
      score: Number(a.score) || 0, reason: a.reason || '', service: a.service || '', price: a.price || '', source: a.source || '', status: 'Researched', notes: '', created: Date.now(), followUp: L.addDays(L.startOfDay(Date.now()), 1) });
    toast('Lead added');
  } else if (a.type === 'idea') { S.ideas.push({ id: nid(), text: a.text, scope: 'company', created: Date.now() }); toast('Idea saved'); }
  else if (a.type === 'note') { S.notes.push({ id: nid(), title: a.title || 'Note from Lucy', body: a.body || '', created: Date.now(), updated: Date.now() }); toast('Note saved'); }
  a.status = 'done'; save(); render(); celebrate('small');
}

/* =============================== MORE =============================== */
function renderMore() {
  const subs = { profile: renderProfile, clients: renderClients, leads: renderLeads, ideas: renderIdeas, notes: renderNotes, shopping: renderShopping, learning: renderLearning, review: renderReview, settings: renderSettings, connections: renderConnections, backup: renderBackup };
  if (view.sub && subs[view.sub]) return subs[view.sub]();
  const row = (sub, ic, t, s) => '<button class="mrow" data-a="sub" data-v="' + sub + '"><div class="badge">' + icon(ic, 20) + '</div><span class="grow"><b>' + t + '</b><small>' + s + '</small></span>' + icon('right', 18, 'chev') + '</button>';
  const openLeads = S.leads.filter((l) => !['Won', 'Lost'].includes(l.status)).length;
  return topbar('More', { eyebrow: 'Everything else' }) +
    '<button class="mrow profile-row" data-a="sub" data-v="profile"><div class="pf-mini">' + (S.profile.photo ? '<img src="' + S.profile.photo + '" alt="">' : icon('user', 22)) + '</div><span class="grow"><b>' + esc(S.profile.fullName || nm()) + '</b><small>My profile · birthday, contacts, company</small></span>' + icon('right', 18, 'chev') + '</button>' +
    row('clients', 'briefcase', 'Clients', S.clients.length + ' clients · retainers, notes, payments') +
    row('leads', 'target', 'Leads · Hunter', openLeads + ' open leads · research and pricing') +
    row('ideas', 'bulb', 'Ideas', S.ideas.length + ' ideas · company and brands') +
    row('notes', 'note', 'Notes', S.notes.length + ' notes') +
    row('shopping', 'cart', 'Shopping', S.shopping.filter((x) => !x.done).length + ' to buy') +
    row('learning', 'book', 'Learning', S.learning.filter((x) => !x.done).length + ' in queue') +
    row('review', 'chart', 'Weekly review', 'Personal · company · money · ascend') +
    row('connections', 'link', 'Connections', (H.ready() ? 'Helper connected' : 'Set up notifications, Drive and AI')) +
    row('settings', 'gear', 'Settings', 'Routine, voice, notifications, business rules') +
    row('backup', 'cloud', 'Backup', H.driveEnabled() ? 'Google Drive on · last ' + (H.sync.last ? L.fmtWhen(H.sync.last) : 'never') : 'Copy or restore your data');
}

function renderClients() {
  if (view.id) return renderClient(clientById(view.id));
  const rows = S.clients.slice().sort((a, b2) => clientName(a).localeCompare(clientName(b2))).map((c) => '<div class="item" data-a="open-client" data-id="' + c.id + '"><div class="badge">' + icon('briefcase', 18) + '</div><div class="grow"><div class="t">' + esc(clientName(c)) + '</div><div class="m">' + esc([c.businessType, c.active === false ? 'Inactive' : (Number(c.retainer) ? money(c.retainer) + '/month' : '')].filter(Boolean).join(' · ') || 'Client') + '</div></div>' + icon('right', 18) + '</div>');
  return topbar('Clients', { back: 'More' }) + listOf(rows, 'No clients yet. Tap + to add one.');
}
function renderClient(c) {
  if (!c) { view.id = null; return renderClients(); }
  const tel = (p) => String(p || '').replace(/[^\d+]/g, '');
  const wa = (p) => { const t = tel(p); return t.startsWith('+') ? t.slice(1) : (t.length === 10 ? '91' + t : t); };
  const link = (k, v) => !v ? '' : /^https?:/i.test(v) ? v : k === 'ig' ? 'https://instagram.com/' + v.replace(/^@/, '') : k === 'fb' ? 'https://facebook.com/' + v : 'https://www.google.com/search?q=' + encodeURIComponent(v);
  const btn = (href, ic, l) => href ? '<a class="btn small ghost" href="' + esc(href) + '" target="_blank" rel="noopener">' + icon(ic, 15) + l + '</a>' : '';
  const rems = S.reminders.filter((r) => r.clientId === c.id && r.status === 'pending');
  const pays = S.payments.filter((p) => p.clientId === c.id);
  const det = [['Contact', [c.firstName, c.lastName].filter(Boolean).join(' ')], ['Phone', c.personalPhone], ['Business type', c.businessType], ['Address', c.address], ['Office', c.companyPhone], ['Work we do', c.work], ['Package', c.pkg], ['Retainer', Number(c.retainer) ? money(c.retainer) + ' / month' : ''], ['Email', c.email]].filter((d) => d[1]);
  return topbar(esc(clientName(c)), { back: 'Clients' }) +
    '<div class="actions" style="margin-top:0">' + btn(c.personalPhone && 'tel:' + tel(c.personalPhone), 'phone', 'Call') + btn((c.personalPhone || c.companyPhone) && 'https://wa.me/' + wa(c.personalPhone || c.companyPhone), 'chat', 'WhatsApp') + btn(c.email && 'mailto:' + c.email, 'mail', 'Email') + btn(link('ig', c.instagram), 'camera', 'Instagram') + btn(link('fb', c.facebook), 'globe', 'Facebook') + btn(link('g', c.gmb), 'globe', 'Google') + '<button class="btn small line" data-a="edit-client" data-id="' + c.id + '">' + icon('edit', 15) + 'Edit</button></div>' +
    (det.length ? '<div class="list mt">' + det.map((d) => '<div class="item"><div class="grow"><div class="m">' + d[0] + '</div><div class="t">' + esc(d[1]) + '</div></div></div>').join('') + '</div>' : '') +
    '<h2>Notes and meeting prep</h2><textarea id="client-notes" data-cid="' + c.id + '" placeholder="What they want, budget, last discussion">' + esc(c.notes || '') + '</textarea>' +
    '<h2>Follow-ups<button class="link" data-a="new-rem-client" data-id="' + c.id + '">Add</button></h2>' + listOf(rems.map((r) => remRow(r)), 'No pending follow-ups.') +
    '<h2>Payments<button class="link" data-a="new-pay-client" data-id="' + c.id + '">Add</button></h2>' + listOf(pays.map(payRow), 'No payments recorded.');
}
function renderLeads() {
  if (view.id) return renderLead(leadById(view.id));
  const f = view.leadFilter || 'Open';
  const list = S.leads.filter((l) => f === 'All' || (f === 'Open' ? !['Won', 'Lost'].includes(l.status) : l.status === f)).sort((a, b2) => (b2.score || 0) - (a.score || 0));
  const won = S.leads.filter((l) => l.status === 'Won').length, total = S.leads.length;
  let h = topbar('Leads', { back: 'More', extra: '' });
  h += '<div class="stats">' + stat('Open leads', S.leads.filter((l) => !['Won', 'Lost'].includes(l.status)).length, '') + stat('Won', won, total ? Math.round(100 * won / total) + '% conversion' : '') + '</div>';
  h += '<button class="panel gold" style="width:100%;text-align:left" data-a="hunt"><div class="row"><div class="badge">' + icon('search', 20) + '</div><div class="grow"><b>Ask Lucy to hunt for clients</b><div class="sub">Researches real businesses on the web for your Hunter profile, scores them and shows sources. Uses your Claude key.</div></div>' + icon('right', 18) + '</div></button>';
  h += '<div class="hscroll" style="margin-bottom:12px">' + ['Open', 'All'].concat(C.LEAD_STATUSES).map((s) => '<button class="chip ' + (s === f ? 'on' : '') + '" data-a="lead-filter" data-v="' + s + '">' + s + '</button>').join('') + '</div>';
  h += listOf(list.map((l) => '<div class="item" data-a="open-lead" data-id="' + l.id + '"><div class="badge"><span class="num" style="font-size:12px">' + (l.score || '–') + '</span></div><div class="grow"><div class="t">' + esc(l.name) + '</div><div class="m">' + esc([l.industry, l.city, l.status].filter(Boolean).join(' · ')) + (l.followUp ? ' · follow up ' + L.fmtDate(l.followUp) : '') + '</div></div>' + icon('right', 18) + '</div>'), 'No leads here yet.');
  return h;
}
function renderLead(l) {
  if (!l) { view.id = null; return renderLeads(); }
  const fields = [['industry', 'Industry'], ['city', 'City'], ['website', 'Website'], ['phone', 'Public phone'], ['email', 'Public email'], ['instagram', 'Instagram'], ['decisionMaker', 'Decision-maker'], ['service', 'Recommended service'], ['price', 'Recommended price']];
  return topbar(esc(l.name), { back: 'Leads' }) +
    '<div class="panel gold"><div class="row"><div class="grow"><div class="eyebrow">Lead score</div><div class="num" style="font-size:30px;font-weight:600">' + (l.score || '–') + '<span class="sub">/100</span></div></div><div class="right"><div class="eyebrow">Status</div><div style="font-weight:600;margin-top:6px">' + esc(l.status) + '</div></div></div>' + (l.reason ? '<div class="sub mt">' + esc(l.reason) + '</div>' : '') + (l.source ? '<div class="mt"><a class="link" href="' + esc(l.source) + '" target="_blank" rel="noopener">View source</a></div>' : '') + '</div>' +
    '<label>Status</label><select data-lead="status" data-id="' + l.id + '">' + C.LEAD_STATUSES.map((s) => '<option ' + (s === l.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
    '<label>Follow-up date</label><input type="date" data-lead="followUp" data-id="' + l.id + '" value="' + (l.followUp ? L.dayKey(l.followUp) : '') + '">' +
    '<div class="grid2"><div><label>Score</label><input type="number" data-lead="score" data-id="' + l.id + '" value="' + (l.score || '') + '"></div><div><label>Name</label><input data-lead="name" data-id="' + l.id + '" value="' + esc(l.name) + '"></div></div>' +
    fields.map(([k, lab]) => '<label>' + lab + '</label><input data-lead="' + k + '" data-id="' + l.id + '" value="' + esc(l[k] || '') + '">').join('') +
    '<label>Notes and contact history</label><textarea data-lead="notes" data-id="' + l.id + '">' + esc(l.notes || '') + '</textarea>' +
    '<div class="actions"><button class="btn" data-a="price-lead" data-id="' + l.id + '">' + icon('coins', 16) + 'Price this client</button><button class="btn ghost" data-a="lead-outreach" data-id="' + l.id + '">' + icon('spark', 16) + 'Write outreach</button>' +
    '<button class="btn ghost" data-a="lead-to-client" data-id="' + l.id + '">Make client</button><button class="btn danger" data-a="del-lead" data-id="' + l.id + '">' + icon('trash', 15) + '</button></div>';
}
function renderIdeas() {
  const t = segOf('idea', 'company');
  const list = S.ideas.filter((n) => (n.scope || 'company') === t).sort((a, b2) => (b2.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b2.created - a.created);
  return topbar('Ideas', { back: 'More' }) + seg('idea', [['company', 'Our company'], ['brand', 'Brands we manage']], t) +
    (t === 'brand' ? '<label>Brand</label><select id="idea-client"><option value="">Choose a client</option>' + S.clients.map((c) => '<option value="' + c.id + '">' + esc(clientName(c)) + '</option>').join('') + '</select>' : '') +
    '<label>New idea</label><textarea id="idea-new" placeholder="Reel hook, campaign concept, shot idea"></textarea><button class="btn block" data-a="add-idea">Save idea</button><h2>Saved · ' + list.length + '</h2>' +
    listOf(list.map((n) => '<div class="item" data-a="edit-idea" data-id="' + n.id + '"><div class="grow"><div class="t note-text">' + esc(n.text) + '</div><div class="m">' + (n.clientId ? esc(clientName(clientById(n.clientId))) + ' · ' : '') + L.fmtDate(n.created) + '</div></div></div>'), 'No ideas yet.');
}
function renderNotes() {
  const list = S.notes.filter((n) => n.title || n.body).sort((a, b2) => b2.updated - a.updated);
  return topbar('Notes', { back: 'More' }) + listOf(list.map((n) => '<div class="item" data-a="open-note" data-id="' + n.id + '"><div class="badge">' + icon('note', 18) + '</div><div class="grow"><div class="t">' + esc(n.title || 'Untitled') + '</div><div class="m">' + esc((n.body || '').slice(0, 80)) + '</div></div></div>'), 'No notes yet. Tap + for a full-screen page.');
}
function renderShopping() {
  const pick = segOf('shopcat', 'Personal');
  const row = (s) => '<div class="item ' + (s.done ? 'done' : '') + '"><button class="check ' + (s.done ? 'on' : '') + '" data-a="shop" data-id="' + s.id + '">' + (s.done ? icon('check', 16) : '') + '</button><div class="grow t">' + esc(s.text) + '</div><button data-a="del-shop" data-id="' + s.id + '" class="sub">' + icon('x', 16) + '</button></div>';
  return topbar('Shopping', { back: 'More' }) + '<div class="fgrid">' + C.SHOP_CATS.map(([c, ic]) => '<button class="ftab ' + (c === pick ? 'on' : '') + '" data-a="seg" data-k="shopcat" data-v="' + c + '">' + icon(ic, 18) + '<b>' + c + '</b><small>' + S.shopping.filter((s) => s.cat === c && !s.done).length + '</small></button>').join('') + '</div>' +
    '<div class="row"><input id="shop-new" placeholder="Add to ' + pick + ' (commas for many)"><button class="btn" data-a="add-shop">Add</button></div>' +
    C.SHOP_CATS.map(([c]) => { const it = S.shopping.filter((s) => s.cat === c && !s.done); return it.length ? '<h2>' + c + '</h2>' + listOf(it.map(row)) : ''; }).join('') +
    (S.shopping.some((s) => s.done) ? '<h2>Bought</h2>' + listOf(S.shopping.filter((s) => s.done).slice(-15).reverse().map(row)) + '<button class="btn small ghost" data-a="clear-shop">Clear bought</button>' : '');
}
function renderLearning() {
  const pick = segOf('learncat', 'AI');
  const row = (s) => '<div class="item ' + (s.done ? 'done' : '') + '"><button class="check ' + (s.done ? 'on' : '') + '" data-a="learn" data-id="' + s.id + '">' + (s.done ? icon('check', 16) : '') + '</button><div class="grow t">' + esc(s.text) + '</div><button data-a="del-learn" data-id="' + s.id + '" class="sub">' + icon('x', 16) + '</button></div>';
  return topbar('Learning', { back: 'More' }) + '<div class="fgrid">' + C.LEARN_CATS.map(([c, ic]) => '<button class="ftab ' + (c === pick ? 'on' : '') + '" data-a="seg" data-k="learncat" data-v="' + c + '">' + icon(ic, 18) + '<b>' + c + '</b><small>' + S.learning.filter((s) => s.cat === c && !s.done).length + '</small></button>').join('') + '</div>' +
    '<div class="row"><input id="learn-new" placeholder="Add to ' + pick + '"><button class="btn" data-a="add-learn">Add</button></div><h2>' + pick + '</h2>' +
    listOf(S.learning.filter((s) => s.cat === pick && !s.done).map(row), 'Nothing here yet.') + (S.learning.some((s) => s.done) ? '<h2>Finished</h2>' + listOf(S.learning.filter((s) => s.done).slice(-10).reverse().map(row)) : '');
}
function renderReview() {
  const now = Date.now(), from = L.addDays(L.startOfDay(now), -6);
  const log = S.log.filter((e) => e.t >= from);
  const days = []; for (let i = 6; i >= 0; i--) days.push(L.addDays(L.startOfDay(now), -i));
  const act = S.routine.filter((x) => x.on).length || 1;
  const routinePts = days.map((d) => ({ label: L.DAYNAME[new Date(d).getDay()], value: Math.round(100 * (S.routineLog[L.dayKey(d)] || []).length / act) }));
  const work = log.filter((e) => e.kind === 'done' && L.COMPANY_CATS.includes(e.cat)).length;
  const received = log.filter((e) => e.kind === 'paid' && e.dir === 'in').reduce((a, e) => a + Number(e.amount || 0), 0);
  const emis = log.filter((e) => e.kind === 'emi').reduce((a, e) => a + Number(e.amount || 0), 0);
  const affDays = days.filter((d) => (S.affirm.done[L.dayKey(d)] || []).length).length;
  const jDays = days.filter((d) => S.journal[L.dayKey(d)]).length;
  const ratings = days.map((d) => Number((S.journal[L.dayKey(d)] || {}).rating) || 0).filter(Boolean);
  const leadsWon = S.leads.filter((l) => l.status === 'Won' && (l.wonAt || 0) >= from).length;
  return topbar('Weekly review', { back: 'More' }) + '<div class="sub">' + L.fmtDate(from) + ' to today</div><h2>Company</h2><div class="stats">' + stat('Work done', work, '') + stat('Received', short(received), '') + stat('Leads won', leadsWon, '') + stat('Mission days', days.filter((d) => (S.mission[L.dayKey(d)] || []).every((m) => m.done)).length + '/7', 'all 3 done') + '</div>' +
    '<h2>Personal</h2><div class="stats">' + stat('Mood average', ratings.length ? (ratings.reduce((a, b2) => a + b2, 0) / ratings.length).toFixed(1) + '/10' : '–', '') + stat('Journal', jDays + '/7', 'days written') + stat('Affirmations', affDays + '/7', 'days') + stat('Streak', B.streak() + ' days', '') + '</div>' +
    '<div class="panel"><h3>Routine completion</h3>' + chart(routinePts, (v) => v + '%') + '</div><h2>Money</h2><div class="stats">' + stat('EMIs paid', short(emis), 'this week') + stat('Loans open', B.loanStats().open, short(B.loanStats().outstanding) + ' outstanding') + '</div>';
}
function renderSettings() {
  const st = S.settings, bz = st.business;
  const sel = (key, opts, val) => '<select data-set="' + key + '">' + opts.map((o) => '<option value="' + o[0] + '" ' + (String(val) === String(o[0]) ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  const vs = V.indianVoices();
  return topbar('Settings', { back: 'More' }) +
    '<h2>You</h2><label>Your name</label><input data-set="name" value="' + esc(st.name) + '">' +
    '<label>Monthly revenue target (₹)</label><input type="number" data-set="revenueTarget" value="' + esc(st.revenueTarget) + '">' +
    '<h2>Lucy\'s voice and look</h2><div class="panel"><div class="row"><div class="grow"><b>Lucy speaks</b><div class="sub">Reads briefings, affirmations and replies aloud</div></div>' + sw(st.speak, 'toggle', 'speak') + '</div>' +
    '<div class="row mt"><div class="grow"><b>Speak AI replies automatically</b></div>' + sw(st.autoSpeakReplies, 'toggle', 'autoSpeakReplies') + '</div></div>' +
    '<label>Voice</label><select data-set="voiceURI"><option value="">Automatic (best female Indian voice)</option>' + vs.map((v) => '<option value="' + esc(v.voiceURI) + '" ' + (v.voiceURI === st.voiceURI ? 'selected' : '') + '>' + esc(v.name + ' · ' + v.lang) + '</option>').join('') + '</select>' +
    '<div class="hint">Lucy uses female voices only. Softest Indian voice: <b>iPhone</b> Settings &gt; Accessibility &gt; Spoken Content &gt; Voices &gt; English &gt; India &gt; download <b>Isha (Enhanced)</b>. <b>Android</b> Settings &gt; Text-to-speech &gt; Google &gt; English (India) &gt; pick a female voice. Then choose it here.</div>' +
    '<div class="grid2"><div><label>Speed</label>' + sel('voiceRate', [[0.85, 'Slower'], [0.95, 'Natural'], [1.05, 'Faster']], st.voiceRate) + '</div><div><label>Tone</label>' + sel('voicePitch', [[0.95, 'Deeper'], [1, 'Balanced'], [1.08, 'Brighter']], st.voicePitch) + '</div></div>' +
    '<button class="btn ghost block" data-a="test-voice">' + icon('volume', 16) + 'Test Lucy\'s voice</button>' +
    '<label>Lucy\'s appearance</label><div class="row"><input type="file" accept="image/*" id="avatar-file"><button class="btn small ghost" data-a="avatar-reset">Default</button></div><div class="hint">Upload any image to replace the drawn android, for example one you generate later.</div>' +
    '<h2>Notifications</h2><div class="panel"><div class="row"><div class="grow"><b>Hourly inspiration</b><div class="sub">Affirmations, dreams and Lucy lines, ' + st.inspireStart + ':00 to ' + st.inspireEnd + ':00 only</div></div>' + sw(st.inspireOn, 'toggle', 'inspireOn') + '</div></div>' +
    '<div class="grid2"><div><label>From</label>' + sel('inspireStart', [7, 8, 9, 10, 11, 12].map((x) => [x, x + ':00']), st.inspireStart) + '</div><div><label>Until</label>' + sel('inspireEnd', [17, 18, 19, 20, 21, 22].map((x) => [x, x + ':00']), st.inspireEnd) + '</div>' +
    '<div><label>Morning briefing</label><input type="time" data-set="briefTime" value="' + st.briefTime + '"></div><div><label>Journal</label><input type="time" data-set="journalTime" value="' + st.journalTime + '"></div>' +
    '<div><label>Reminder repeats</label>' + sel('nagCount', [[0, 'None'], [1, '1 time'], [2, '2 times'], [3, '3 times']], st.nagCount) + '</div><div><label>Every</label>' + sel('nagMin', [[10, '10 min'], [15, '15 min'], [30, '30 min']], st.nagMin) + '</div>' +
    '<div><label>Weekly review</label>' + sel('reviewDay', L.DAYNAME.map((d, i) => [i, d]), st.reviewDay) + '</div><div><label>At</label><input type="time" data-set="reviewTime" value="' + st.reviewTime + '"></div></div>' +
    '<h2 id="routine-settings">Daily routine</h2><div class="list">' + S.routine.map((it, i) => '<div class="rrow ' + (it.on ? '' : 'off') + '"><div class="badge" style="width:32px;height:32px">' + icon(it.icon, 16) + '</div><div class="grow"><b>' + esc(it.label) + '</b><div class="row mt" style="gap:6px;margin-top:6px"><button class="tgl ' + (it.ring ? 'on' : '') + '" data-a="rt" data-f="ring" data-i="' + i + '">Important</button><button class="tgl ' + (it.speak ? 'on' : '') + '" data-a="rt" data-f="speak" data-i="' + i + '">Voice</button></div></div><input type="time" class="tinput" data-rt="' + i + '" value="' + it.time + '">' + sw(it.on, 'rt', null, ' data-f="on" data-i="' + i + '"') + '</div>').join('') + '</div>' +
    '<button class="btn small ghost" data-a="rt-reset">Reset routine to default</button>' +
    '<h2>Business and pricing rules</h2><div class="grid2"><div><label>Minimum retainer</label><input type="number" data-biz="minRetainer" value="' + bz.minRetainer + '"></div><div><label>Minimum margin %</label><input type="number" data-biz="minMargin" value="' + bz.minMargin + '"></div>' +
    '<div><label>Maximum discount %</label><input type="number" data-biz="maxDiscount" value="' + bz.maxDiscount + '"></div><div><label>Minimum months</label><input type="number" data-biz="minMonths" value="' + bz.minMonths + '"></div></div>' +
    '<label>Payment terms</label><textarea data-biz="paymentTerms">' + esc(bz.paymentTerms) + '</textarea>' +
    '<div class="hint">Your real costs per unit. Lucy never guesses these; pricing shows what is missing.</div><div class="grid2">' + [['reel', 'Cost per reel'], ['post', 'Cost per post'], ['shoot', 'Cost per shoot day'], ['ads', 'Ads management / month'], ['website', 'Website (one-time)']].map(([k, l]) => '<div><label>' + l + '</label><input type="number" data-cost="' + k + '" value="' + (bz.costs[k] || '') + '"></div>').join('') + '</div>' +
    '<h2>Hunter profile</h2><label>Industries</label><textarea data-hunt="industries">' + esc(st.hunter.industries) + '</textarea><div class="grid2"><div><label>City</label><input data-hunt="city" value="' + esc(st.hunter.city) + '"></div><div><label>Minimum budget / month</label><input type="number" data-hunt="minBudget" value="' + st.hunter.minBudget + '"></div></div><label>Services we sell</label><textarea data-hunt="services">' + esc(st.hunter.services) + '</textarea>' +
    '<div class="sub" style="text-align:center;margin:28px 0 8px">Lucy 3 · build ' + esc((window.LUCY_CONFIG || {}).build || 'dev') + '</div>';
}
let connStatus = null;
function renderConnections() {
  const url = H.helperUrl(), pk = H.passkey();
  let h = topbar('Connections', { back: 'More' }) + '<div class="sub" style="margin-bottom:12px">Your private helper sends notifications, keeps your AI keys secret, and saves your data to your own Google Drive.</div>';
  h += '<div class="panel"><div class="row"><span class="status-dot ' + (url ? 'ok' : '') + '"></span><b class="grow">Helper</b><span class="sub">' + (url ? 'Found' : 'Not deployed yet') + '</span></div>' +
    '<label>Helper address</label><input id="helper-url" value="' + esc(url) + '" placeholder="https://lucy-helper.yourname.workers.dev"><button class="btn small ghost mt" data-a="save-helper">Save address</button></div>';
  if (url) {
    if (!pk) {
      h += '<div class="panel gold"><b>Create or enter your Lucy passkey</b><div class="sub" style="margin-top:4px">A private password between your iPhone and your helper. At least 8 characters. Save it in your Notes too.</div><form onsubmit="return false" autocomplete="on"><input type="text" name="username" autocomplete="username" value="Lucy" readonly style="position:absolute;opacity:0;height:0;width:0;pointer-events:none" tabindex="-1" aria-hidden="true"><input id="pk" name="password" type="password" class="mt" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Your passkey"></form><div class="actions"><button class="btn" data-a="pk-create">Create new</button><button class="btn ghost" data-a="pk-enter">I already have one</button></div></div>';
    } else {
      const s = connStatus;
      h += '<div class="panel"><div class="row"><span class="status-dot ' + (s ? 'ok' : '') + '"></span><b class="grow">Passkey</b><button class="link" data-a="pk-forget">Forget on this phone</button></div><button class="btn small ghost mt" data-a="conn-refresh">' + icon('refresh', 15) + 'Check status</button></div>';
      const devs = (s && s.pushDevices) || [];
      h += '<h2>Notifications</h2><div class="panel"><div class="row"><span class="status-dot ' + (H.pushOn() ? 'ok' : '') + '"></span><b class="grow">This device (' + esc(H.deviceName()) + ')</b><span class="sub">' + (H.pushOn() ? 'On' : 'Off') + '</span></div>' +
        (H.isStandalone() || !/iPhone|iPad/.test(navigator.userAgent) ? '' : '<div class="hint">Open Lucy from your Home Screen icon first. iPhone only allows notifications for installed web apps.</div>') +
        '<div class="actions"><button class="btn small" data-a="push-on">' + icon('bell', 15) + (H.pushOn() ? 'Re-connect' : 'Turn on') + '</button><button class="btn small ghost" data-a="push-test">Send test</button>' + (H.pushOn() ? '<button class="btn small ghost" data-a="push-off">Turn off here</button>' : '') + '</div>' +
        (devs.length ? '<div class="hint">Notifications go to: <b>' + devs.map(esc).join(', ') + '</b></div>' : '') +
        (s ? '<div class="hint">' + s.queued + ' notifications scheduled' + (s.nextAt ? ', next ' + L.fmtWhen(s.nextAt) : '') + '</div>' : '') + '</div>';
      h += '<h2>AI brain</h2><div class="panel"><div class="row"><span class="status-dot ' + (s && s.claude ? 'ok' : '') + '"></span><b class="grow">Claude</b><span class="sub">' + (s ? (s.claude ? s.claudeModel : 'No key') : '') + '</span></div><input id="key-claude" type="password" class="mt" placeholder="Paste Anthropic API key (sk-ant-…)"><select id="model-claude" class="mt">' + [['claude-sonnet-5-5', 'Claude Sonnet 5.5 (recommended)'], ['claude-opus-5-5', 'Claude Opus 5.5 (smartest)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (fastest)']].map((o) => '<option value="' + o[0] + '" ' + (s && s.claudeModel === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
        '<div class="row mt"><span class="status-dot ' + (s && s.chatgpt ? 'ok' : '') + '"></span><b class="grow">ChatGPT</b><span class="sub">' + (s ? (s.chatgpt ? s.openaiModel : 'No key') : '') + '</span></div><input id="key-openai" type="password" class="mt" placeholder="Paste OpenAI API key (sk-…)"><select id="model-openai" class="mt">' + [['gpt-6.1-sol', 'GPT-6.1 Sol (recommended)'], ['gpt-6-astra', 'GPT-6 Astra (most capable)'], ['gpt-6-luna', 'GPT-6 Luna (faster)']].map((o) => '<option value="' + o[0] + '" ' + (s && s.openaiModel === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
        '<button class="btn block" data-a="save-ai">Save AI settings</button><div class="hint">Keys are stored only in your private helper, never on this phone or in Google Drive. API use is billed by Anthropic and OpenAI per use.</div></div>';
      h += '<h2>Google Drive</h2><div class="panel"><div class="row"><span class="status-dot ' + (H.driveEnabled() && s && s.drive ? 'ok' : H.sync.state === 'error' ? 'err' : '') + '"></span><b class="grow">Your data in Drive</b><span class="sub">' + (H.driveEnabled() ? (H.sync.last ? 'Synced ' + L.fmtWhen(H.sync.last) : 'On') : 'Off') + '</span></div>' +
        (!s || !s.googleReady ? '<input id="g-id" class="mt" placeholder="Google OAuth Client ID"><input id="g-secret" type="password" class="mt" placeholder="Google OAuth Client secret"><button class="btn small ghost mt" data-a="save-google">Save Google details</button>' : '') +
        '<div class="actions"><button class="btn small" data-a="drive-connect">' + icon('cloud', 15) + (s && s.drive ? 'Reconnect' : 'Connect Google Drive') + '</button>' + (H.driveEnabled() ? '<button class="btn small ghost" data-a="drive-sync">Sync now</button>' : '') + '</div>' + (H.sync.error ? '<div class="hint bad">' + esc(H.sync.error) + '</div>' : '') +
        (url ? '<div class="hint">Google redirect address: ' + esc(url) + '/oauth/callback</div>' : '') + '</div>';
    }
  }
  return h;
}
function renderBackup() {
  return topbar('Backup', { back: 'More' }) + '<div class="panel"><div class="row"><span class="status-dot ' + (H.driveEnabled() ? 'ok' : '') + '"></span><b class="grow">Google Drive</b><span class="sub">' + (H.driveEnabled() ? 'Automatic' : 'Off') + '</span></div><div class="sub mt">' + (H.driveEnabled() ? 'Every change is saved to your Drive, with a dated copy each day for 14 days.' : 'Turn on in Connections for automatic backup.') + '</div></div>' +
    '<h2>Copy a backup</h2><textarea id="bk-out" readonly style="min-height:100px;font-size:12px">' + esc(JSON.stringify(S)) + '</textarea><button class="btn block" data-a="copy-bk">Copy backup</button>' +
    '<h2>Restore</h2><div class="sub">Paste a backup from Lucy 1, 2 or 3.</div><textarea id="bk-in" class="mt" style="font-size:12px"></textarea><button class="btn danger block" data-a="restore">Restore (replaces current data)</button>';
}

/* =============================== actions: reminders =============================== */
function addReminder(r) {
  const rem = { id: nid(), task: r.task, cat: r.cat || L.guessCategory(r.task), due: r.due, start: r.start || r.due, repeat: r.repeat || '', status: 'pending', clientId: r.clientId || null, created: Date.now(), snoozeUntil: 0 };
  S.reminders.push(rem); save(); return rem;
}
function markDone(id) {
  const r = remById(id); if (!r || r.status !== 'pending') return;
  logEvent('done', { task: r.task, cat: r.cat, clientId: r.clientId });
  if (r.repeat) { r.due = L.nextAfter(r, Math.max(r.due, Date.now())); r.snoozeUntil = 0; toast('Done. Next: ' + L.fmtWhen(r.due)); }
  else { r.status = 'done'; r.doneAt = Date.now(); toast('Done'); }
  syncMission('rem:' + r.id);
  save(); celebrate('small');
}
function syncMission(ref) {
  const m = S.mission[B.today()];
  if (!m) return;
  m.forEach((x) => { if (x.ref === ref) x.done = true; });
}
function reminderSheet(r, preset) {
  const base = Object.assign({}, r || { task: '', cat: 'Personal', due: L.atTime(Date.now(), new Date().getHours() + 1, 0), repeat: '', clientId: null }, preset || {});
  openSheet('<h3>' + (r ? 'Edit reminder' : 'New reminder') + '</h3><label>What</label><input id="f-task" value="' + esc(base.task) + '" placeholder="e.g. kal 11am call Mr. Ravi"><div class="hint">Type naturally. Lucy fills in the date and time.</div>' +
    '<div class="grid2"><div><label>Date</label><input id="f-date" type="date" value="' + L.dayKey(base.due) + '"></div><div><label>Time</label><input id="f-time" type="time" value="' + toTime(base.due) + '"></div>' +
    '<div><label>Repeat</label><select id="f-rep">' + [['', 'Never'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['yearly', 'Every year']].map((o) => '<option value="' + o[0] + '" ' + (base.repeat === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
    '<div><label>Category</label><select id="f-cat">' + L.CATS.map((c) => '<option ' + (c === base.cat ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></div></div>' +
    '<label>Client</label><select id="f-client"><option value="">None</option>' + S.clients.map((c) => '<option value="' + c.id + '" ' + (c.id === base.clientId ? 'selected' : '') + '>' + esc(clientName(c)) + '</option>').join('') + '</select>' +
    '<button class="btn block" data-a="save-rem" data-id="' + (r ? r.id : '') + '">' + (r ? 'Save' : 'Add reminder') + '</button>' +
    (r && r.status === 'pending' ? '<div class="actions"><button class="btn small ghost" data-a="done" data-id="' + r.id + '">Done</button><button class="btn small ghost" data-a="snooze" data-id="' + r.id + '" data-v="60">Snooze 1 hour</button><button class="btn small ghost" data-a="tomorrow" data-id="' + r.id + '">Move to tomorrow</button></div>' : '') +
    (r ? '<button class="btn danger block" data-a="del-rem" data-id="' + r.id + '">Delete</button>' : ''));
}
function smartFill() {
  const el = $('#f-task'); if (!el) return;
  const r = L.parseReminder(el.value); if (!r) return;
  el.value = r.task; $('#f-date').value = L.dayKey(r.due); $('#f-time').value = toTime(r.due);
  if (['', 'daily', 'weekly', 'monthly', 'yearly'].includes(r.repeat)) $('#f-rep').value = r.repeat;
  $('#f-cat').value = r.cat;
  const c = S.clients.find((x) => clientName(x) && r.task.toLowerCase().includes(clientName(x).toLowerCase()));
  if (c) $('#f-client').value = String(c.id);
}
let pendingSave = null;
function saveReminder(id, force) {
  let data = pendingSave && force ? pendingSave.data : null;
  if (!data) {
    if (L.parseReminder($('#f-task').value)) smartFill();
    const task = $('#f-task').value.trim();
    if (!task) return toast('What should I remind you about?');
    const due = fromInputs($('#f-date').value, $('#f-time').value);
    data = { task: task, due: due, start: due, repeat: $('#f-rep').value, cat: $('#f-cat').value, clientId: Number($('#f-client').value) || null };
  }
  if (!force) {
    const from = data.due - 30 * L.MIN, to = data.due + 30 * L.MIN + 1;
    const clashes = S.reminders.filter((r) => r.status === 'pending' && r.id !== id && L.occurrencesBetween(r, from, to, 1).length);
    if (clashes.length) {
      pendingSave = { data: data, id: id };
      openSheet('<div style="text-align:center"><div class="badge" style="margin:4px auto 10px;width:52px;height:52px;--c:var(--warn)">' + icon('alert', 24) + '</div><h3>Time clash</h3><div class="sub">You already have this near ' + L.fmtWhen(data.due) + ':</div></div>' +
        listOf(clashes.map((r) => '<div class="item"><div class="grow"><div class="t">' + esc(r.task) + '</div><div class="m">' + L.fmtWhen(L.occurrencesBetween(r, from, to, 1)[0]) + '</div></div></div>')).replace('class="list"', 'class="list mt"') +
        '<button class="btn block" data-a="clash-change">Change time</button><button class="btn ghost block" data-a="clash-save" data-id="' + (id || '') + '">Save anyway</button>');
      return;
    }
  }
  if (id) { const r = remById(id); Object.assign(r, data, { snoozeUntil: 0, status: 'pending' }); if (data.repeat && data.due <= Date.now()) r.due = L.nextAfter(r, Date.now()); save(); toast('Saved'); }
  else { if (data.repeat && data.due <= Date.now()) data.due = L.nextAfter(Object.assign({}, data), Date.now()); addReminder(data); toast('Set for ' + L.fmtWhen(data.due)); celebrate('small'); }
  pendingSave = null; closeSheet(); render();
}

/* =============================== actions: money =============================== */
function paySheet(p, preset) {
  const base = Object.assign({}, p || { type: segOf('cashdir', 'in'), party: '', amount: '', due: L.startOfDay(Date.now()), note: '', clientId: null }, preset || {});
  openSheet('<h3>' + (p ? 'Edit payment' : 'New payment') + '</h3>' + '<div class="seg" id="p-type"><button class="' + (base.type === 'in' ? 'on' : '') + '" data-a="ptype" data-v="in">I will receive</button><button class="' + (base.type === 'out' ? 'on' : '') + '" data-a="ptype" data-v="out">I will pay</button></div>' +
    '<label>Who</label><input id="p-party" list="p-cl" value="' + esc(base.party) + '"><datalist id="p-cl">' + S.clients.map((c) => '<option value="' + esc(clientName(c)) + '">').join('') + '</datalist>' +
    '<div class="grid2"><div><label>Amount (₹)</label><input id="p-amount" type="number" inputmode="numeric" value="' + esc(base.amount) + '"></div><div><label>Due date</label><input id="p-due" type="date" value="' + L.dayKey(base.due) + '"></div></div>' +
    '<label>Note</label><input id="p-note" value="' + esc(base.note) + '"><button class="btn block" data-a="save-pay" data-id="' + (p ? p.id : '') + '">Save</button>' +
    (p && p.status === 'pending' ? '<button class="btn ghost block" data-a="settle" data-id="' + p.id + '">' + (p.type === 'in' ? 'Mark received' : 'Mark paid') + '</button>' : '') + (p ? '<button class="btn danger block" data-a="del-pay" data-id="' + p.id + '">Delete</button>' : ''));
  $('#sheet').dataset.ptype = base.type;
}
function settle(id) {
  const p = payById(id); if (!p || p.status !== 'pending') return;
  p.status = 'settled'; p.settledAt = Date.now();
  logEvent('paid', { task: p.party, cat: 'Money', amount: p.amount, dir: p.type, clientId: p.clientId });
  syncMission('pay:' + p.id); save();
  if (p.type === 'in') { celebrate('coins'); toast('Money in: ' + money(p.amount)); V.speak('Well done ' + nm() + '. ' + money(p.amount) + ' received.'); }
  else { celebrate('small'); toast('Paid ' + money(p.amount)); }
}
function loanSheet(l, type) {
  const t = (l && l.type) || type || 'bank';
  const v = (k, d) => esc(l && l[k] != null ? l[k] : (d || ''));
  const friend = t === 'friend';
  openSheet('<h3>' + (l ? 'Edit' : 'Add') + ' ' + (C.LOAN_TYPES.find((x) => x[0] === t) || [, 'loan'])[1].toLowerCase() + '</h3>' +
    (l ? '' : '<div class="seg">' + C.LOAN_TYPES.map(([k, lab]) => '<button class="' + (k === t ? 'on' : '') + '" data-a="loan-type" data-v="' + k + '">' + lab.split(' ')[0] + '</button>').join('') + '</div>') +
    (friend ? '<label>Friend\'s name</label><input id="ln-lender" value="' + v('lender') + '"><label>Loan taken for</label><input id="ln-purpose" value="' + v('purpose') + '" placeholder="e.g. camera lens, office deposit">' +
      '<div class="grid2"><div><label>Total amount (₹)</label><input id="ln-amount" type="number" value="' + v('amount') + '"></div><div><label>Already paid (₹)</label><input id="ln-paid" type="number" value="' + v('paid', 0) + '"></div>' +
      '<div><label>Monthly instalment (optional)</label><input id="ln-emi" type="number" value="' + v('emi') + '"></div><div><label>Pay on day</label><input id="ln-day" type="number" min="1" max="31" value="' + v('emiDay') + '" placeholder="e.g. 5"></div></div>' +
      '<label>Or one due date</label><input id="ln-duedate" type="date" value="' + (l && l.dueDate ? L.dayKey(l.dueDate) : '') + '"><label>Payment mode</label><select id="ln-mode">' + C.PAY_MODES.map((m) => '<option ' + (l && l.payMode === m ? 'selected' : '') + '>' + m + '</option>').join('') + '</select>'
      : '<label>' + (t === 'product' ? 'Product' : 'Loan name') + '</label><input id="ln-title" value="' + v('title') + '" placeholder="' + (t === 'product' ? 'e.g. iPhone 17 Pro' : 'e.g. Car loan') + '">' +
      '<div class="grid2"><div><label>' + (t === 'product' ? 'Financed by' : 'Bank / lender') + '</label><input id="ln-lender" value="' + v('lender') + '" placeholder="e.g. HDFC Bank"></div><div><label>Loan number</label><input id="ln-number" value="' + v('number') + '"></div>' +
      '<div><label>EMI amount (₹)</label><input id="ln-emi" type="number" value="' + v('emi') + '"></div><div><label>EMIs left</label><input id="ln-left" type="number" value="' + v('emisLeft') + '"></div>' +
      '<div><label>Total EMIs</label><input id="ln-total" type="number" value="' + v('totalEmis') + '"></div><div><label>EMI day of month</label><input id="ln-day" type="number" min="1" max="31" value="' + v('emiDay') + '"></div></div>' +
      '<label>Debited from (bank account)</label><input id="ln-bank" value="' + v('debitBank') + '" placeholder="e.g. HDFC savings, ICICI current">') +
    '<label>Note</label><input id="ln-note" value="' + v('note') + '">' +
    '<button class="btn block" data-a="save-loan" data-id="' + (l ? l.id : '') + '" data-t="' + t + '">Save</button>' +
    (l && !l.closed ? '<button class="btn ghost block" data-a="loan-paid" data-id="' + l.id + '">' + (friend ? 'Record a payment' : 'Mark this month\'s EMI paid') + '</button>' : '') +
    (l ? '<button class="btn danger block" data-a="del-loan" data-id="' + l.id + '">Delete</button>' : ''));
}
function saveLoan(id, t) {
  const g = (s) => { const e = $('#' + s); return e ? e.value.trim() : ''; };
  const n = (s) => Number(g(s)) || 0;
  const data = t === 'friend'
    ? { type: t, lender: g('ln-lender'), purpose: g('ln-purpose'), amount: n('ln-amount'), paid: n('ln-paid'), emi: n('ln-emi'), emiDay: n('ln-day'), dueDate: g('ln-duedate') ? fromInputs(g('ln-duedate'), '09:00') : 0, payMode: g('ln-mode'), note: g('ln-note') }
    : { type: t, title: g('ln-title'), lender: g('ln-lender'), number: g('ln-number'), emi: n('ln-emi'), emisLeft: n('ln-left'), totalEmis: n('ln-total'), emiDay: n('ln-day'), debitBank: g('ln-bank'), note: g('ln-note') };
  if (t === 'friend' ? !data.lender : !(data.title || data.lender)) return toast('Add a name first');
  if (id) Object.assign(loanById(id), data); else S.loans.push(Object.assign({ id: nid(), created: Date.now(), closed: false }, data));
  save(); closeSheet(); render(); toast('Saved');
}
function loanPaid(id) {
  const l = loanById(id); if (!l) return;
  if (l.type === 'friend') {
    const left = B.loanOutstanding(l);
    const amt = Number(prompt('How much did you pay ' + (l.lender || 'your friend') + '? (₹)', String(Math.min(left, l.emi || left))) || 0);
    if (!amt) return;
    l.paid = Number(l.paid || 0) + amt; l.lastPaid = Date.now();
    logEvent('emi', { task: 'Paid ' + l.lender, amount: amt });
    if (l.paid >= Number(l.amount || 0)) l.closed = true;
  } else {
    l.emisLeft = Math.max(0, Number(l.emisLeft || 0) - 1); l.lastPaid = Date.now();
    logEvent('emi', { task: (l.title || l.lender) + ' EMI', amount: l.emi });
    if (l.emisLeft === 0) l.closed = true;
  }
  save(); closeSheet(); render();
  if (l.closed) { celebrate('big', { title: 'Loan closed', sub: (l.title || l.lender) + ' is fully paid. One less weight on you.' }); V.speak('Congratulations ' + nm() + '. That loan is fully paid.'); }
  else { celebrate('small'); toast('Payment recorded'); }
}
function expenseSheet(e) {
  openSheet('<h3>' + (e ? 'Edit expense' : 'New expense') + '</h3><label>What</label><input id="e-title" value="' + esc(e ? e.title : '') + '" placeholder="e.g. Adobe subscription">' +
    '<div class="grid2"><div><label>Amount (₹)</label><input id="e-amt" type="number" value="' + (e ? e.amount : '') + '"></div><div><label>Date</label><input id="e-date" type="date" value="' + L.dayKey(e ? e.date : Date.now()) + '"></div></div>' +
    '<label>Category</label><select id="e-cat">' + C.EXPENSE_CATS.map((c) => '<option ' + (e && e.cat === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select>' +
    '<div class="row mt"><input type="checkbox" id="e-rec" ' + (e && e.recurring ? 'checked' : '') + '><span>Repeats every month</span></div>' +
    '<button class="btn block" data-a="save-exp" data-id="' + (e ? e.id : '') + '">Save</button>' + (e ? '<button class="btn danger block" data-a="del-exp" data-id="' + e.id + '">Delete</button>' : ''));
}

/* =============================== actions: ascend =============================== */
function affById(id) { return B.allAffirmations().find((a) => a.id === id); }
function affDone(id, spoken) {
  const k = B.today();
  S.affirm.done[k] = S.affirm.done[k] || [];
  if (spoken) { S.affirm.spoken[k] = S.affirm.spoken[k] || []; if (!S.affirm.spoken[k].includes(id)) S.affirm.spoken[k].push(id); }
  if (S.affirm.done[k].includes(id)) { save(); return; }
  S.affirm.done[k].push(id);
  logEvent('affirm', { task: id });
  save(); celebrate('small');
  const total = B.todaysAffirmations().length;
  S.celebrated[k] = S.celebrated[k] || {};
  if (S.affirm.done[k].length >= total && !S.celebrated[k].affirm) { S.celebrated[k].affirm = true; save({ local: true }); setTimeout(() => celebrate('big', { title: 'Mindset set', sub: 'All of today\'s affirmations done. Now act on them.' }), 300); }
}
function speakAffirmation(a, holder) {
  const el = holder || $('#heard-' + a.id);
  if (!V.canListen()) { if (el) el.textContent = 'Listening is not available here. Say it aloud, then tap Done.'; return; }
  if (el) el.textContent = 'Listening… say it aloud';
  V.listen((t) => { if (el) el.textContent = t; }, (err, said) => {
    if (err) { if (el) el.textContent = err.message; return; }
    const score = V.matchScore(a.text, said || '');
    if (score >= 0.6) { if (el) el.textContent = 'Heard you. Marked as spoken.'; affDone(a.id, true); render(); }
    else if (el) el.textContent = 'I caught ' + Math.round(score * 100) + '% of the words. Try once more, slowly.';
  });
}
function dreamSheet(d) {
  openSheet('<h3>' + (d ? 'Edit dream' : 'New dream') + '</h3><label>Dream</label><input id="d-title" value="' + esc(d ? d.title : '') + '" placeholder="e.g. Range Rover Velar, Rolex Daytona, first feature film">' +
    '<label>Type</label><select id="d-cat">' + C.DREAM_CATS.map(([c]) => '<option ' + (d && d.cat === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select>' +
    '<label>Photo</label><input type="file" accept="image/*" id="d-img">' + (d && d.img ? '<img src="' + d.img + '" style="width:100%;border-radius:14px;margin-top:8px;max-height:180px;object-fit:cover">' : '') +
    '<div class="grid2"><div><label>Target amount (₹)</label><input id="d-target" type="number" value="' + (d && d.target ? d.target : '') + '"></div><div><label>Saved so far (₹)</label><input id="d-saved" type="number" value="' + (d && d.saved ? d.saved : '') + '"></div></div>' +
    '<label>Target date</label><input id="d-date" type="date" value="' + (d && d.targetDate ? L.dayKey(d.targetDate) : '') + '">' +
    '<label>Why I want it</label><textarea id="d-why" placeholder="How it will feel, what it proves">' + esc(d ? d.why : '') + '</textarea>' +
    '<button class="btn block" data-a="save-dream" data-id="' + (d ? d.id : '') + '">Save</button>' +
    (d ? '<button class="btn ghost block" data-a="dream-achieved" data-id="' + d.id + '">' + (d.achieved ? 'Mark as not yet achieved' : 'I achieved this') + '</button><button class="btn danger block" data-a="del-dream" data-id="' + d.id + '">Delete</button>' : ''));
}
let dreamImg = null;

/* =============================== opening card =============================== */
function showOpening(force) {
  const last = Number(device.get('lastOpen', 0));
  if (!force && Date.now() - last < 20 * L.MIN) return;
  device.set('lastOpen', String(Date.now()));
  const c = B.openingCard();
  const a = c.affirm;
  const ov = $('#overlay');
  ov.innerHTML = '<div class="aff-card"><div class="aff-orb">' + avatar('mini') + '</div><div class="eyebrow" style="margin-top:18px">' + esc(c.title) + '</div><div class="quote">' + esc(c.text) + '</div>' +
    (a && a.action ? '<div class="act">' + icon('bolt', 18) + '<span>' + esc(a.action) + '</span></div>' : '') +
    '<div class="actions" style="justify-content:center"><button class="btn small ghost" data-a="ov-hear">' + icon('volume', 15) + 'Hear</button>' + (a ? '<button class="btn small ghost" data-a="ov-speak">' + icon('mic', 15) + 'Speak it</button><button class="btn small" data-a="ov-done">' + icon('check', 15) + 'Done</button>' : '') +
    (a && a.action ? '<button class="btn small line" data-a="ov-action">Add action</button>' : '') + '</div><div class="heard" id="heard-ov"></div>' +
    '<button class="btn ghost block" data-a="ov-close" style="margin-top:22px">Start my day</button></div>';
  ov.dataset.aff = a ? a.id : '';
  ov.dataset.text = c.text;
  ov.hidden = false;
}

/* =============================== events =============================== */
document.addEventListener('pointerdown', (e) => setTapPoint(e.clientX, e.clientY), true);
document.addEventListener('click', async (ev) => {
  if (ev.target.closest('.lucy-stage') && !ev.target.closest('[data-a]')) {
    if (V.isSpeaking()) { V.stopSpeaking(); return; }
    const lines = ['Hi ' + nm() + '. I am Lucy. Ask me anything, and I will help you get there faster.', 'You have more potential than you are using today, ' + nm() + '. Let us use it.', 'I am right here with you. What is the one thing that matters most right now?'];
    V.speak(lines[Math.floor(Math.random() * lines.length)], { force: true }); return;
  }
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, id = el.dataset.id ? Number(el.dataset.id) : null, v = el.dataset.v;
  switch (a) {
    case 'tab': if (v === 'more') { view.tab = 'more'; view.sub = null; view.id = null; closeSheet(); render(); window.scrollTo(0, 0); } else go(v); break;
    case 'back':
      if (view.tab === 'more' && view.id) { view.id = null; render(); }
      else if (view.tab === 'more' && view.sub) { view.sub = null; render(); }
      else go('home');
      break;
    case 'sub-profile': go('more', 'profile'); break;
    case 'team-inc': case 'team-dec': { const m = S.growth.team[Number(el.dataset.i)]; m.have = Math.max(0, Number(m.have || 0) + (a === 'team-inc' ? 1 : -1)); save(); render(); if (a === 'team-inc') { celebrate(m.have >= m.need ? 'big' : 'small', m.have >= m.need ? { title: 'Team complete', sub: m.role + ': all ' + m.need + ' hired.' } : undefined); } break; }
    case 'edit-growth': {
      const g = S.growth;
      openSheet('<h3>Growth plan</h3><div class="sub">Client tiers by monthly retainer, and the team you need.</div>' +
        '<h2>Client tiers</h2>' + g.tiers.map((t, i) => '<div class="grid3"><div><label>Tier</label><input data-gt="name" data-i="' + i + '" value="' + esc(t.name) + '"></div><div><label>Retainer</label><input type="number" data-gt="price" data-i="' + i + '" value="' + t.price + '"></div><div><label>Clients</label><input type="number" data-gt="count" data-i="' + i + '" value="' + t.count + '"></div></div>').join('') +
        '<h2>Team</h2>' + g.team.map((m, i) => '<div class="grid3"><div><label>Role</label><input data-gm="role" data-i="' + i + '" value="' + esc(m.role) + '"></div><div><label>Needed</label><input type="number" data-gm="need" data-i="' + i + '" value="' + m.need + '"></div><div><label>Salary each</label><input type="number" data-gm="salary" data-i="' + i + '" value="' + (m.salary || '') + '" placeholder="₹"></div></div>').join('') +
        '<button class="btn block" data-a="close">Done</button>');
      break;
    }
    case 'new-sp': specialSheet(null, v); break;
    case 'edit-sp': specialSheet(S.specialDays.find((x) => x.id === id)); break;
    case 'sp-type': document.querySelectorAll('#sp-type button').forEach((b) => b.classList.toggle('on', b === el)); $('#sheet').dataset.sptype = v; break;
    case 'save-sp': {
      const name = $('#sp-name').value.trim(); if (!name) { toast('Whose special day is it?'); break; }
      const data = { name: name, type: $('#sheet').dataset.sptype || 'Birthday', date: String($('#sp-m').value).padStart(2, '0') + '-' + String($('#sp-d').value).padStart(2, '0'), year: Number($('#sp-y').value) || 0,
        relation: $('#sp-rel').value.trim(), phone: $('#sp-phone').value.trim(), note: $('#sp-note').value.trim(), remind7: $('#sp-7').checked };
      if (id) Object.assign(S.specialDays.find((x) => x.id === id), data); else S.specialDays.push(Object.assign({ id: nid(), created: Date.now() }, data));
      save(); closeSheet(); view.seg.plan = 'special'; render(); celebrate('small'); toast('Lucy will remind you'); break;
    }
    case 'del-sp': if (confirm('Delete this special day?')) { S.specialDays = S.specialDays.filter((x) => x.id !== id); save(); closeSheet(); render(); } break;
    case 'sub': go('more', v); if (v === 'connections') refreshStatus(true); break;
    case 'seg': view.seg[el.dataset.k] = v; if (el.dataset.k === 'cashdir' && sheetOpen()) break; render(); window.scrollTo(0, 0); break;
    case 'seg-go': view.seg[el.dataset.k] = v; go(el.dataset.tab); break;
    case 'close': closeSheet(); render(); break;
    case 'fab': fab(); break;
    case 'filter': view.filter = v; render(); break;
    case 'open-connections': go('more', 'connections'); refreshStatus(); break;
    case 'settings-routine': go('more', 'settings'); setTimeout(() => { const r = $('#routine-settings'); if (r) r.scrollIntoView(); }, 50); break;
    // home
    case 'speak-brief': { const b = B.briefing(); V.speak(b.greeting + '. ' + b.lines.join(' '), { force: true }); break; }
    case 'ai-brief': go('lucy'); ask(QUICK[0][2], 'brief'); break;
    case 'nbm-go': if (v === 'more-leads') go('more', 'leads'); else go(v); break;
    case 'mission': {
      const m = B.ensureMission(); const it = m[Number(el.dataset.i)]; if (!it) break;
      it.done = !it.done;
      if (it.done) { logEvent('mission', { task: it.text }); celebrate('small'); }
      save(); render();
      const k = B.today(); S.celebrated[k] = S.celebrated[k] || {};
      if (m.every((x) => x.done) && !S.celebrated[k].mission) { S.celebrated[k].mission = true; save({ local: true }); setTimeout(() => celebrate('big', { title: 'Mission complete', sub: 'All three of today\'s actions are done, ' + nm() + '. This is how empires are built.' }), 300); V.speak('Mission complete. Proud of you ' + nm() + '.'); }
      break;
    }
    case 'evening': view.seg.ascend = 'journal'; go('ascend'); break;
    case 'routine': {
      const k = B.today(), key = el.dataset.k;
      const list = S.routineLog[k] = S.routineLog[k] || [];
      if (list.includes(key)) S.routineLog[k] = list.filter((x) => x !== key);
      else {
        list.push(key); logEvent('routine', { key: key, task: key, cat: 'Health' }); celebrate('small');
        const act = S.routine.filter((x) => x.on); S.celebrated[k] = S.celebrated[k] || {};
        if (act.every((x) => S.routineLog[k].includes(x.key)) && !S.celebrated[k].routine) { S.celebrated[k].routine = true; setTimeout(() => celebrate('big', { title: 'Routine complete', sub: 'Every habit done today. Your body says thank you.' }), 300); }
      }
      save(); render(); break;
    }
    // reminders
    case 'done': closeSheet(); markDone(id); render(); break;
    case 'undo': { const r = remById(id); if (r) { r.status = 'pending'; r.doneAt = 0; save(); render(); } break; }
    case 'edit-rem': reminderSheet(remById(id)); break;
    case 'save-rem': saveReminder(id); break;
    case 'clash-save': saveReminder(id, true); break;
    case 'clash-change': if (pendingSave) { const ps = pendingSave; reminderSheet(ps.id ? remById(ps.id) : null, ps.data); } break;
    case 'del-rem': if (confirm('Delete this reminder?')) { S.reminders = S.reminders.filter((r) => r.id !== id); save(); closeSheet(); render(); } break;
    case 'snooze': { const r = remById(id); r.snoozeUntil = Date.now() + Number(v) * L.MIN; save(); closeSheet(); render(); toast('Snoozed till ' + L.fmtTime(r.snoozeUntil)); break; }
    case 'tomorrow': { const r = remById(id); const t = new Date(alertStart(r)); r.snoozeUntil = 0; r.due = L.atTime(L.addDays(L.startOfDay(Date.now()), 1), t.getHours(), t.getMinutes()); if (r.repeat) r.start = r.due; save(); closeSheet(); render(); toast('Moved to ' + L.fmtWhen(r.due)); break; }
    case 'new-rem-client': reminderSheet(null, { cat: 'Follow-up', clientId: id }); break;
    // money
    case 'edit-pay': paySheet(payById(id)); break;
    case 'new-pay-client': paySheet(null, { clientId: id, party: clientName(clientById(id)) }); break;
    case 'ptype': document.querySelectorAll('#p-type button').forEach((b) => b.classList.toggle('on', b === el)); $('#sheet').dataset.ptype = v; break;
    case 'save-pay': {
      const party = $('#p-party').value.trim(), amount = Number($('#p-amount').value);
      if (!party || !amount) { toast('Add who and how much'); break; }
      const cl = S.clients.find((c) => clientName(c).toLowerCase() === party.toLowerCase());
      const data = { type: $('#sheet').dataset.ptype || 'in', party: party, amount: amount, due: L.startOfDay(fromInputs($('#p-due').value, '00:00')), note: $('#p-note').value.trim(), clientId: cl ? cl.id : null };
      if (id) Object.assign(payById(id), data); else S.payments.push(Object.assign({ id: nid(), status: 'pending', created: Date.now() }, data));
      save(); closeSheet(); render(); toast('Saved'); break;
    }
    case 'settle': closeSheet(); settle(id); render(); break;
    case 'del-pay': if (confirm('Delete this payment?')) { S.payments = S.payments.filter((p) => p.id !== id); save(); closeSheet(); render(); } break;
    case 'edit-target': { const t = prompt('Monthly revenue target in rupees', String(S.settings.revenueTarget)); if (t && Number(t)) { S.settings.revenueTarget = Number(t); save(); render(); } break; }
    case 'open-loan': loanSheet(loanById(id)); break;
    case 'loan-type': loanSheet(null, v); break;
    case 'save-loan': saveLoan(id, el.dataset.t); break;
    case 'loan-paid': loanPaid(id); break;
    case 'del-loan': if (confirm('Delete this loan?')) { S.loans = S.loans.filter((l) => l.id !== id); save(); closeSheet(); render(); } break;
    case 'edit-exp': expenseSheet(S.expenses.find((e) => e.id === id)); break;
    case 'save-exp': {
      const title = $('#e-title').value.trim(), amt = Number($('#e-amt').value);
      if (!title || !amt) { toast('Add what and how much'); break; }
      const data = { title: title, amount: amt, date: fromInputs($('#e-date').value, '12:00'), cat: $('#e-cat').value, recurring: $('#e-rec').checked };
      if (id) Object.assign(S.expenses.find((e) => e.id === id), data); else S.expenses.push(Object.assign({ id: nid() }, data));
      save(); closeSheet(); render(); break;
    }
    case 'del-exp': S.expenses = S.expenses.filter((e) => e.id !== id); save(); closeSheet(); render(); break;
    // ascend
    case 'aff-hear': { const af = affById(el.dataset.id); if (af) V.speak(af.text, { force: true }); break; }
    case 'aff-speak': { const af = affById(el.dataset.id); if (af) speakAffirmation(af); break; }
    case 'aff-done': affDone(el.dataset.id); render(); break;
    case 'aff-action': { const af = affById(el.dataset.id); if (af && af.action) addToMission(af.action, 'affirm:' + af.id); break; }
    case 'aff-del': S.affirm.custom = S.affirm.custom.filter((x) => x.id !== el.dataset.id); save(); render(); break;
    case 'save-aff': {
      const text = $('#af-text').value.trim(); if (!text) break;
      S.affirm.custom.push({ id: 'u' + nid(), cat: $('#af-cat').value, text: text, action: $('#af-action').value.trim(), pinned: $('#af-pin').checked });
      save(); closeSheet(); render(); toast('Affirmation added'); break;
    }
    case 'edit-vision': openSheet('<h3>Your vision</h3><div class="sub">One line each. Lucy shows these on Ascend and uses them when she coaches you.</div><textarea id="vision" style="min-height:160px" class="mt">' + esc((S.settings.vision || []).join('\n')) + '</textarea><button class="btn block" data-a="save-vision">Save</button>'); break;
    case 'save-vision': S.settings.vision = $('#vision').value.split('\n').map((x) => x.trim()).filter(Boolean); save(); closeSheet(); render(); break;
    case 'open-dream': dreamImg = null; dreamSheet(dreamById(id)); break;
    case 'save-dream': {
      const title = $('#d-title').value.trim(); if (!title) { toast('Name your dream'); break; }
      const d = id ? dreamById(id) : { id: nid(), created: Date.now(), achieved: false };
      Object.assign(d, { title: title, cat: $('#d-cat').value, target: Number($('#d-target').value) || 0, saved: Number($('#d-saved').value) || 0, targetDate: $('#d-date').value ? fromInputs($('#d-date').value, '12:00') : 0, why: $('#d-why').value.trim() });
      if (dreamImg) d.img = dreamImg;
      if (!id) S.dreams.push(d);
      save(); closeSheet(); render(); celebrate('small'); break;
    }
    case 'dream-achieved': { const d = dreamById(id); d.achieved = !d.achieved; save(); closeSheet(); render(); if (d.achieved) { celebrate('big', { title: 'Dream achieved', sub: d.title + '. You said you would. You did.' }); V.speak('Congratulations ' + nm() + '. You achieved ' + d.title + '.'); } break; }
    case 'del-dream': if (confirm('Delete this dream?')) { S.dreams = S.dreams.filter((d) => d.id !== id); save(); closeSheet(); render(); } break;
    case 'founder': {
      const f = C.FOUNDER[v];
      openSheet('<div class="eyebrow">Founder mode</div><h3 class="mt">' + f.title + '</h3><div class="serif" style="font-size:20px;line-height:1.4;margin:10px 0 16px">' + esc(f.msg) + '</div><h2>Do one now</h2>' +
        f.actions.map((x) => '<div class="item"><div class="grow t">' + esc(x) + '</div><button class="btn small line" data-a="founder-act" data-v="' + esc(x) + '">Add</button></div>').join('') +
        '<button class="btn block" data-a="founder-talk" data-v="' + v + '">' + icon('chat', 16) + 'Talk it through with Lucy</button>');
      V.speak(f.msg);
      break;
    }
    case 'founder-act': addToMission(v, 'founder'); el.textContent = 'Added'; break;
    case 'founder-talk': closeSheet(); go('lucy'); ask(C.FOUNDER[v].title + '. Help me get moving with one concrete action.', 'coach'); break;
    case 'rate': { const k = B.today(); S.journal[k] = Object.assign(S.journal[k] || {}, { rating: Number(v) }); save(); render(); break; }
    // lucy
    case 'provider': S.settings.provider = v; save({ local: true }); render(); break;
    case 'toggle-speak': S.settings.speak = !S.settings.speak; if (!S.settings.speak) V.stopSpeaking(); save({ local: true }); render(); break;
    case 'quick': { const q = QUICK.find((x) => x[0] === v); ask(q[2], v === 'hunter' ? 'hunter' : v === 'pricing' ? 'pricing' : v); break; }
    case 'send': { const t = $('#ask'); const text = t.value; t.value = ''; ask(text, /price|pricing|retainer|quote/i.test(text) ? 'pricing' : /find (me )?(new )?(clients|leads|prospects)|hunt/i.test(text) ? 'hunter' : 'chat'); break; }
    case 'mic': {
      if (el.classList.contains('on')) { V.stopListening(); break; }
      el.classList.add('on');
      V.listen((t) => { const box = $('#ask'); if (box) box.value = t; }, (err, said) => {
        const b2 = $('.composer .mic'); if (b2) b2.classList.remove('on');
        if (err) { toast(err.message); return; }
        if (said) { const box = $('#ask'); if (box) box.value = ''; ask(said, 'chat'); }
      });
      break;
    }
    case 'say': { const m = S.chat[Number(el.dataset.i)]; if (m) V.speak(m.content, { force: true }); break; }
    case 'act-ok': approveAction(Number(el.dataset.i), Number(el.dataset.j)); break;
    case 'act-no': { const m = S.chat[Number(el.dataset.i)]; m.actions[Number(el.dataset.j)].status = 'skipped'; save({ local: true }); render(); break; }
    // more
    case 'open-client': go('more', 'clients', id); break;
    case 'edit-client': clientSheet(clientById(id)); break;
    case 'save-client': saveClient(id); break;
    case 'del-client': if (confirm('Delete this client?')) { S.clients = S.clients.filter((c) => c.id !== id); save(); closeSheet(); view.id = null; render(); } break;
    case 'open-lead': go('more', 'leads', id); break;
    case 'lead-filter': view.leadFilter = v; render(); break;
    case 'hunt': go('lucy'); ask(QUICK[2][2], 'hunter'); break;
    case 'price-lead': pricingSheet(leadById(id)); break;
    case 'calc-price': calcPrice(); break;
    case 'lead-outreach': { const l = leadById(id); go('lucy'); ask('Write a short, personal WhatsApp outreach message and a follow-up message for ' + l.name + ' (' + (l.industry || '') + ', ' + (l.city || '') + '). What we know: ' + (l.reason || l.notes || 'not much yet') + '. Recommended service: ' + (l.service || 'to decide') + '.', 'chat'); break; }
    case 'lead-to-client': { const l = leadById(id); l.status = 'Won'; l.wonAt = Date.now(); S.clients.push({ id: nid(), company: l.name, businessType: l.industry, companyPhone: l.phone, email: l.email, instagram: l.instagram, address: l.city, retainer: 0, active: true, notes: l.notes || '', created: Date.now() }); save(); celebrate('big', { title: 'New client', sub: l.name + ' is now a DZYN LAB client.' }); go('more', 'clients'); break; }
    case 'del-lead': if (confirm('Delete this lead?')) { S.leads = S.leads.filter((l) => l.id !== id); save(); view.id = null; render(); } break;
    case 'add-idea': { const t = $('#idea-new').value.trim(); if (!t) break; const sel = $('#idea-client'); S.ideas.push({ id: nid(), text: t, scope: segOf('idea', 'company'), clientId: sel ? (Number(sel.value) || null) : null, created: Date.now() }); save(); render(); celebrate('small'); break; }
    case 'edit-idea': { const n = S.ideas.find((x) => x.id === id); openSheet('<h3>Idea</h3><textarea id="n-text" style="min-height:160px">' + esc(n.text) + '</textarea><button class="btn block" data-a="save-idea" data-id="' + id + '">Save</button><button class="btn ghost block" data-a="idea-rem" data-id="' + id + '">Make it a reminder</button><button class="btn danger block" data-a="del-idea" data-id="' + id + '">Delete</button>'); break; }
    case 'save-idea': S.ideas.find((x) => x.id === id).text = $('#n-text').value; save(); closeSheet(); render(); break;
    case 'idea-rem': { const n = S.ideas.find((x) => x.id === id); reminderSheet(null, { task: n.text.slice(0, 80), cat: 'Work' }); break; }
    case 'del-idea': S.ideas = S.ideas.filter((x) => x.id !== id); save(); closeSheet(); render(); break;
    case 'open-note': noteSheet(S.notes.find((x) => x.id === id)); break;
    case 'del-note': if (confirm('Delete this note?')) { S.notes = S.notes.filter((x) => x.id !== id); save(); closeSheet(); render(); } break;
    case 'add-shop': { const inp = $('#shop-new'); inp.value.split(',').map((x) => x.trim()).filter(Boolean).forEach((t) => S.shopping.push({ id: nid(), text: t, cat: segOf('shopcat', 'Personal'), done: false, created: Date.now() })); save(); render(); break; }
    case 'shop': { const s2 = S.shopping.find((x) => x.id === id); s2.done = !s2.done; s2.doneAt = s2.done ? Date.now() : 0; save(); if (s2.done) celebrate('small'); render(); break; }
    case 'del-shop': S.shopping = S.shopping.filter((x) => x.id !== id); save(); render(); break;
    case 'clear-shop': S.shopping = S.shopping.filter((x) => !x.done); save(); render(); break;
    case 'add-learn': { const t = $('#learn-new').value.trim(); if (!t) break; S.learning.push({ id: nid(), text: t, cat: segOf('learncat', 'AI'), done: false, created: Date.now() }); save(); render(); break; }
    case 'learn': { const s2 = S.learning.find((x) => x.id === id); s2.done = !s2.done; s2.doneAt = s2.done ? Date.now() : 0; save(); if (s2.done) celebrate('small'); render(); break; }
    case 'del-learn': S.learning = S.learning.filter((x) => x.id !== id); save(); render(); break;
    // settings
    case 'toggle': S.settings[v] = !S.settings[v]; save(); render(); break;
    case 'rt': { const it = S.routine[Number(el.dataset.i)]; it[el.dataset.f] = !it[el.dataset.f]; save(); render(); break; }
    case 'rt-reset': if (confirm('Reset your routine to the default timings?')) { S.routine = C.ROUTINE_DEFAULT.map((r) => ({ key: r.key, icon: r.icon, label: r.label, time: r.time, on: true, ring: !!r.ring, speak: true })); save(); render(); } break;
    case 'test-voice': V.speak('Hi ' + nm() + '. I am Lucy. I will keep you focused, remind you of everything, and push you towards your dreams.', { force: true }); break;
    case 'avatar-reset': S.settings.avatarImg = ''; save(); render(); break;
    // connections
    case 'save-helper': device.set('helperUrl', $('#helper-url').value.trim()); toast('Saved'); render(); refreshStatus(); break;
    case 'pk-create': case 'pk-enter': {
      const pk = $('#pk').value.trim();
      if (pk.length < 8) { toast('Use at least 8 characters'); break; }
      try {
        if (a === 'pk-create') await H.api.setup(pk);
        device.set('passkey', pk);
        await refreshStatus(true);
        if (!connStatus && a === 'pk-enter') { device.set('passkey', ''); toast('That passkey did not match'); render(); break; }
        toast('Connected to your helper');
        if (connStatus.drive) { device.set('drive', 'on'); await H.pullFromDrive(() => render()); }
        render(); H.queueSchedule(buildSchedule);
      } catch (e) { toast(e.message); }
      break;
    }
    case 'pk-forget': device.set('passkey', ''); connStatus = null; render(); break;
    case 'conn-refresh': await refreshStatus(); toast(connStatus ? 'Helper is online' : 'Could not reach helper'); break;
    case 'push-on': try { await H.enablePush(); await H.api.schedule(buildSchedule()); await refreshStatus(); toast('Notifications are on'); } catch (e) { toast(e.message); } break;
    case 'push-off': try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) { await H.api.unsubscribe(sub.endpoint); await sub.unsubscribe(); } device.set('push', ''); await refreshStatus(); toast('Notifications off on this device'); } catch (e) { toast(e.message); } break;
    case 'push-test': try { await H.api.testPush(); toast('Sent. Check your notifications.'); } catch (e) { toast(e.message); } break;
    case 'save-ai': {
      const body = { claudeModel: $('#model-claude').value, openaiModel: $('#model-openai').value };
      const k1 = $('#key-claude').value.trim(), k2 = $('#key-openai').value.trim();
      if (k1) body.anthropicKey = k1; if (k2) body.openaiKey = k2;
      try { connStatus = await H.api.config(body); toast('AI settings saved'); render(); } catch (e) { toast(e.message); }
      break;
    }
    case 'save-google': try { connStatus = await H.api.config({ googleClientId: $('#g-id').value.trim(), googleClientSecret: $('#g-secret').value.trim(), appUrl: location.origin + location.pathname }); toast('Saved'); render(); } catch (e) { toast(e.message); } break;
    case 'drive-connect': try { await H.api.config({ appUrl: location.origin + location.pathname }); const r = await H.api.oauthLink(); location.href = r.url; } catch (e) { toast(e.message); } break;
    case 'drive-sync': await H.pullFromDrive(() => render()); toast(H.sync.state === 'ok' ? 'Synced with Google Drive' : H.sync.error); render(); break;
    case 'copy-bk': { const t = $('#bk-out'); t.select(); try { await navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Copied. Keep it somewhere safe.'); break; }
    case 'restore': {
      try { const d = JSON.parse($('#bk-in').value.trim()); if (!d || !Array.isArray(d.reminders)) throw new Error('bad'); if (!confirm('Replace everything with this backup?')) break; replaceState(d); save(); go('home'); toast('Restored'); }
      catch (e) { toast('That does not look like a Lucy backup'); }
      break;
    }
    // overlay
    case 'ov-close': $('#overlay').hidden = true; V.stopSpeaking(); break;
    case 'ov-hear': V.speak($('#overlay').dataset.text, { force: true }); break;
    case 'ov-done': affDone($('#overlay').dataset.aff); el.textContent = 'Completed'; break;
    case 'ov-speak': { const af = affById($('#overlay').dataset.aff); if (af) speakAffirmation(af, $('#heard-ov')); break; }
    case 'ov-action': { const af = affById($('#overlay').dataset.aff); if (af) addToMission(af.action, 'affirm:' + af.id); el.textContent = 'Added'; break; }
  }
});
function addToMission(text, ref) {
  const m = B.ensureMission();
  if (m.some((x) => x.text === text)) { toast('Already in today\'s mission'); return; }
  const free = m.findIndex((x) => x.ref === 'fill' && !x.done);
  if (free >= 0) m[free] = { text: text, done: false, ref: ref }; else m.push({ text: text, done: false, ref: ref });
  save(); toast('Added to today\'s mission');
}
function fab() {
  if (view.tab === 'plan') return segOf('plan', 'today') === 'special' ? specialSheet(null, 'Birthday') : reminderSheet();
  if (view.tab === 'money') { const s = segOf('money', 'mission'); if (s === 'loans') return loanSheet(null, 'bank'); if (s === 'expenses') return expenseSheet(); return paySheet(); }
  if (view.tab === 'ascend') {
    if (segOf('ascend', 'affirm') === 'dreams') { dreamImg = null; return dreamSheet(); }
    return openSheet('<h3>Your own affirmation</h3><label>Affirmation</label><textarea id="af-text" placeholder="I am…"></textarea><label>Area</label><select id="af-cat">' + C.AFFIRM_CATS.map((c) => '<option>' + c + '</option>').join('') + '</select><label>Linked action (optional)</label><input id="af-action" placeholder="What will you do today because of it?"><div class="row mt"><input type="checkbox" id="af-pin" checked><span>Show every day</span></div><button class="btn block" data-a="save-aff">Save</button>');
  }
  if (view.sub === 'clients') return clientSheet();
  if (view.sub === 'leads') return leadNewSheet();
  if (view.sub === 'notes') { const n = { id: nid(), title: '', body: '', created: Date.now(), updated: Date.now() }; S.notes.push(n); save({ local: true }); return noteSheet(n); }
  const t = $('#idea-new') || $('#shop-new') || $('#learn-new'); if (t) t.focus();
}
const CLIENT_FIELDS = [['firstName', 'First name'], ['lastName', 'Last name'], ['personalPhone', 'Personal number', 'tel'], ['company', 'Company name'], ['businessType', 'Business type'], ['address', 'Company address'],
  ['companyPhone', 'Company number', 'tel'], ['work', 'Work we do'], ['pkg', 'Package'], ['retainer', 'Monthly retainer (₹)', 'number'], ['email', 'Email', 'email'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['gmb', 'Google Business link']];
function clientSheet(c) {
  c = c || {};
  openSheet('<h3>' + (c.id ? 'Edit client' : 'New client') + '</h3>' + CLIENT_FIELDS.map(([k, l, t]) => '<label>' + l + '</label><input id="c-' + k + '" type="' + (t || 'text') + '" value="' + esc(c[k] || '') + '">').join('') +
    '<div class="row mt"><input type="checkbox" id="c-active" ' + (c.active === false ? '' : 'checked') + '><span>Active client</span></div><button class="btn block" data-a="save-client" data-id="' + (c.id || '') + '">Save</button>' + (c.id ? '<button class="btn danger block" data-a="del-client" data-id="' + c.id + '">Delete</button>' : ''));
}
function saveClient(id) {
  const d = {}; CLIENT_FIELDS.forEach(([k, , t]) => { const v = $('#c-' + k).value.trim(); d[k] = t === 'number' ? Number(v) || 0 : v; });
  d.active = $('#c-active').checked;
  if (!d.company && !d.firstName) return toast('Add a company or first name');
  if (id) Object.assign(clientById(id), d); else { const c = Object.assign({ id: nid(), notes: '', created: Date.now() }, d); S.clients.push(c); view.id = c.id; celebrate('small'); }
  save(); closeSheet(); render();
}
function leadNewSheet() {
  openSheet('<h3>New lead</h3><label>Business name</label><input id="l-name"><div class="grid2"><div><label>Industry</label><input id="l-ind"></div><div><label>City</label><input id="l-city" value="' + esc(S.settings.hunter.city) + '"></div></div><label>Website or Instagram</label><input id="l-web"><button class="btn block" data-a="save-new-lead">Add lead</button>');
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a="save-new-lead"]'); if (!el) return;
  const name = $('#l-name').value.trim(); if (!name) return toast('Add a name');
  const web = $('#l-web').value.trim();
  S.leads.push({ id: nid(), name: name, industry: $('#l-ind').value.trim(), city: $('#l-city').value.trim(), website: /instagram/i.test(web) ? '' : web, instagram: /instagram|^@/i.test(web) ? web : '', status: 'New', score: 0, created: Date.now(), followUp: L.addDays(L.startOfDay(Date.now()), 1) });
  save(); closeSheet(); render();
});
function noteSheet(n) {
  openSheet('<div class="row" style="justify-content:space-between"><button class="link" data-a="close">Done</button><button class="btn small danger" data-a="del-note" data-id="' + n.id + '">' + icon('trash', 15) + '</button></div><input id="note-title" class="note-title" data-nid="' + n.id + '" value="' + esc(n.title) + '" placeholder="Title"><textarea id="note-body" class="note-body" data-nid="' + n.id + '" placeholder="Start writing">' + esc(n.body) + '</textarea>', true);
}
function pricingSheet(l) {
  openSheet('<h3>Price ' + esc(l ? l.name : 'a client') + '</h3><div class="sub">Lucy uses your real costs and rules from Settings. Nothing is guessed.</div>' +
    '<div class="grid2"><div><label>Reels / month</label><input id="pr-reel" type="number" value="8"></div><div><label>Posts / month</label><input id="pr-post" type="number" value="12"></div><div><label>Shoot days / month</label><input id="pr-shoot" type="number" value="1"></div><div><label>Ads management</label><select id="pr-ads"><option value="1">Yes</option><option value="0">No</option></select></div></div>' +
    '<div class="row mt"><input type="checkbox" id="pr-web"><span>Include a website (one-time)</span></div><button class="btn block" data-a="calc-price" data-id="' + (l ? l.id : '') + '">Calculate</button><div id="pr-out"></div>' +
    (l && H.ready() ? '<button class="btn ghost block" data-a="price-ai" data-id="' + l.id + '">Ask Lucy for a full pricing recommendation</button>' : ''));
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a="price-ai"]'); if (!el) return;
  const l = leadById(Number(el.dataset.id)); closeSheet(); go('lucy');
  ask('Recommend pricing for ' + l.name + ' (' + (l.industry || '') + ', ' + (l.city || '') + '). Deliverables: ' + ($('#pr-reel') ? '' : '') + 'see my last calculation if any. What we know: ' + (l.reason || l.notes || 'not much') + '.', 'pricing');
});
function calcPrice() {
  const bz = S.settings.business, c = bz.costs;
  const q = { reel: Number($('#pr-reel').value) || 0, post: Number($('#pr-post').value) || 0, shoot: Number($('#pr-shoot').value) || 0, ads: Number($('#pr-ads').value) || 0 };
  const web = $('#pr-web').checked;
  const missing = Object.keys(q).filter((k) => q[k] && !Number(c[k])).concat(web && !Number(c.website) ? ['website'] : []);
  if (missing.length) { $('#pr-out').innerHTML = '<div class="panel mt"><b>Missing costs</b><div class="sub mt">Add your real cost for: ' + missing.join(', ') + ' in Settings > Business and pricing rules. Lucy will not invent them.</div></div>'; return; }
  const cost = q.reel * c.reel + q.post * c.post + q.shoot * c.shoot + q.ads * c.ads;
  const margin = Math.min(0.9, Number(bz.minMargin) / 100);
  const minimum = Math.max(Number(bz.minRetainer) || 0, Math.ceil(cost / (1 - margin) / 500) * 500);
  const rec = Math.max(minimum, Math.ceil(cost / (1 - Math.min(0.9, margin + 0.15)) / 1000) * 1000);
  const premium = Math.ceil(rec * 1.3 / 1000) * 1000;
  $('#pr-out').innerHTML = '<div class="panel gold mt"><div class="eyebrow">Recommended retainer</div><div class="num" style="font-size:30px;font-weight:600;margin:6px 0">' + money(rec) + '<span class="sub"> / month</span></div>' +
    '<div class="stats" style="margin-top:10px">' + stat('Minimum', money(minimum), 'never go below') + stat('Premium option', money(premium), 'more deliverables or speed') + stat('Your cost', money(cost), 'per month') + stat('Margin at recommended', Math.round(100 * (1 - cost / rec)) + '%', '') + '</div>' +
    (web ? '<div class="sub">Website: one-time ' + money(Math.ceil(c.website / (1 - margin) / 1000) * 1000) + ' (cost ' + money(c.website) + ').</div>' : '') +
    '<div class="sub mt">Contract: minimum ' + bz.minMonths + ' months. Terms: ' + esc(bz.paymentTerms) + ' Maximum discount ' + bz.maxDiscount + '%.</div></div>';
}

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'client-notes') { const c = clientById(t.dataset.cid); if (c) { c.notes = t.value; save(); } }
  else if (t.id === 'note-title' || t.id === 'note-body') { const n = S.notes.find((x) => x.id === Number(t.dataset.nid)); if (n) { n[t.id === 'note-title' ? 'title' : 'body'] = t.value; n.updated = Date.now(); save(); } }
  else if (t.dataset.j) { const k = B.today(); S.journal[k] = Object.assign(S.journal[k] || {}, { [t.dataset.j]: t.value }); save(); }
  else if (t.dataset.set === 'name') { S.settings.name = t.value; save(); }
  else if (t.dataset.gt) { const x = S.growth.tiers[Number(t.dataset.i)]; x[t.dataset.gt] = t.dataset.gt === 'name' ? t.value : Number(t.value) || 0; save(); }
  else if (t.dataset.gm) { const x = S.growth.team[Number(t.dataset.i)]; x[t.dataset.gm] = t.dataset.gm === 'role' ? t.value : Number(t.value) || 0; save(); }
  else if (t.dataset.prof) { S.profile[t.dataset.prof] = t.value; if (t.dataset.prof === 'nickname' && t.value.trim()) S.settings.name = t.value.trim(); save(); }
  else if (t.id === 'ask') { t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; }
});
document.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.dataset.set && t.dataset.set !== 'name') {
    const k = t.dataset.set; let v = t.value;
    if (['revenueTarget', 'inspireStart', 'inspireEnd', 'nagCount', 'nagMin', 'reviewDay', 'voiceRate', 'voicePitch'].includes(k)) v = Number(v);
    S.settings[k] = v; save(); toast('Saved');
  } else if (t.dataset.biz) { S.settings.business[t.dataset.biz] = t.type === 'number' ? Number(t.value) : t.value; save(); }
  else if (t.dataset.cost) { S.settings.business.costs[t.dataset.cost] = Number(t.value) || 0; save(); }
  else if (t.dataset.hunt) { S.settings.hunter[t.dataset.hunt] = t.type === 'number' ? Number(t.value) : t.value; save(); }
  else if (t.dataset.rt !== undefined) { const it = S.routine[Number(t.dataset.rt)]; if (t.value) { it.time = t.value; S.routine.sort((a, b2) => a.time.localeCompare(b2.time)); save(); render(); } }
  else if (t.dataset.lead) {
    const l = leadById(t.dataset.id); const k = t.dataset.lead;
    l[k] = k === 'score' ? Number(t.value) || 0 : k === 'followUp' ? (t.value ? fromInputs(t.value, '11:00') : 0) : t.value;
    if (k === 'status' && t.value === 'Won') { l.wonAt = Date.now(); celebrate('big', { title: 'Deal won', sub: l.name + '. Well done, ' + nm() + '.' }); }
    save(); if (k === 'status' || k === 'score') render();
  } else if (t.id === 'd-img' && t.files[0]) { dreamImg = await imageToDataUrl(t.files[0], 900, 0.72); toast('Photo ready'); }
  else if (t.id === 'pf-photo' && t.files[0]) { S.profile.photo = await imageToDataUrl(t.files[0], 480, 0.8); save(); render(); toast('Photo updated'); }
  else if (t.id === 'avatar-file' && t.files[0]) { S.settings.avatarImg = await imageToDataUrl(t.files[0], 900, 0.8); save(); render(); toast('Lucy\'s look updated'); }
  else if (t.id === 'f-task') smartFill();
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.id === 'ask' && !ev.shiftKey) { ev.preventDefault(); document.querySelector('[data-a="send"]').click(); }
  else if (ev.target.id === 'shop-new') { ev.preventDefault(); document.querySelector('[data-a="add-shop"]').click(); }
  else if (ev.target.id === 'learn-new') { ev.preventDefault(); document.querySelector('[data-a="add-learn"]').click(); }
  else if (ev.target.id === 'f-task') { ev.preventDefault(); smartFill(); }
});
$('#sheet-wrap') && document.addEventListener('click', (ev) => { if (ev.target.id === 'sheet-bg') { closeSheet(); render(); } });

async function refreshStatus(quiet) {
  if (!H.ready()) { connStatus = null; return; }
  try { connStatus = await H.api.status(); if (connStatus.drive && device.get('drive', '') !== 'on') device.set('drive', 'on'); }
  catch (e) { connStatus = null; if (!quiet) toast(e.message); }
  if (view.sub === 'connections') render();
}
function openHash() {
  const h = location.hash;
  if (!h) return;
  if (h.startsWith('#drive=')) {
    const r = h.slice(7);
    if (r === 'connected') { device.set('drive', 'on'); toast('Google Drive connected'); H.pullFromDrive(() => render()).then(() => { render(); H.pushToDrive(); }); }
    else toast(r === 'denied' ? 'Google Drive was not allowed' : 'Google Drive connection failed, try again');
    view.tab = 'more'; view.sub = 'connections';
  } else if (h === '#plan' || h === '#money' || h === '#ascend' || h === '#home') { view.tab = h.slice(1); }
  else if (h === '#money-loans') { view.tab = 'money'; view.seg.money = 'loans'; }
  else if (h === '#plan-special') { view.tab = 'plan'; view.seg.plan = 'special'; }
  else if (h === '#more-review') { view.tab = 'more'; view.sub = 'review'; }
  history.replaceState(null, '', location.pathname);
}

/* =============================== start =============================== */
(async function start() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('sw', e); }
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.open) { location.hash = e.data.open; openHash(); render(); } });
  }
  openHash();
  startNeural(); startTilt();
  B.ensureMission(); save({ local: true });
  render();
  if (!S.onboarded) {
    S.onboarded = true; save({ local: true });
    openSheet('<div style="text-align:center"><div style="width:120px;height:160px;margin:0 auto">' + avatar('big') + '</div><h3 style="font-size:22px;margin-top:10px">I am Lucy.</h3><div class="sub">Your assistant, your coach and your founder partner. I will keep you focused on what matters and remind you who you are becoming.</div></div>' +
      '<label>What should I call you?</label><input data-set="name" value="' + esc(S.settings.name) + '"><button class="btn block" data-a="close">Begin</button>');
  } else showOpening();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await H.pullFromDrive(() => render());
      B.ensureMission(); render(); showOpening();
      H.queueSchedule(buildSchedule);
    }
  });
  if (H.ready()) { await refreshStatus(true); await H.pullFromDrive(() => render()); render(); H.queueSchedule(buildSchedule); }
  // keep laptop, iPhone and Android in step: check Drive for newer data every minute while Lucy is open
  setInterval(() => { if (document.visibilityState === 'visible' && H.driveEnabled() && !sheetOpen() && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) H.pullFromDrive(() => render()); }, 60000);
})();

window.__lucy = { get S() { return S; }, buildSchedule: buildSchedule, render: render, B: B, state: setAvatarState };
