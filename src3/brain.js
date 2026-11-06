// Lucy's local intelligence: priorities, briefing, revenue maths, loans, affirmations, AI context.
import * as MG from './magnet.js';
import { upcoming as upcomingSpecial, specialTitle } from './special.js';
import * as L from '../src/logic.js';
import * as C from './content.js';
import { S } from './store.js';

export const alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);
export const today = () => L.dayKey(Date.now());
const monthKey = (ms) => L.dayKey(ms).slice(0, 7);

/* ---------------- Top 5 ---------------- */
export function topFive() {
  const now = Date.now(), end = L.addDays(L.startOfDay(now), 1), end2 = L.addDays(end, 1);
  const items = [];
  S.reminders.forEach((r) => {
    if (r.status !== 'pending') return;
    const t = alertStart(r);
    if (t >= end2) return;
    let score = t < now ? 1000 + Math.min(300, (now - t) / L.MIN / 10)
      : t < end ? (({ Meeting: 800, Money: 700, 'Follow-up': 650, Work: 550 })[r.cat] || 450) : 100;
    score -= Math.max(0, (t - now) / 3600000) * 4;
    items.push({ kind: 'rem', id: r.id, score: score, t: t, tomorrow: t >= end });
  });
  S.payments.forEach((p) => {
    if (p.status !== 'pending') return;
    const t = L.atTime(p.due, 10, 0);
    if (t >= end2) return;
    items.push({ kind: 'pay', id: p.id, score: p.due < L.startOfDay(now) ? 1000 : t < end ? (p.type === 'in' ? 720 : 700) : 100, t: t, tomorrow: t >= end });
  });
  S.leads.forEach((ld) => {
    if (!ld.followUp || ['Won', 'Lost'].includes(ld.status)) return;
    const t = L.atTime(ld.followUp, 11, 0);
    if (t >= end2) return;
    items.push({ kind: 'lead', id: ld.id, score: t < end ? 680 : 90, t: t, tomorrow: t >= end });
  });
  items.sort((a, b) => b.score - a.score || a.t - b.t);
  return items.slice(0, 5);
}

/* ---------------- Daily mission (3 actions, stable for the day) ---------------- */
export function ensureMission() {
  const k = today();
  if (S.mission[k]) return S.mission[k];
  const items = [];
  topFive().filter((x) => !x.tomorrow).slice(0, 2).forEach((x) => {
    const t = itemTitle(x);
    if (t) items.push({ text: t, done: false, ref: x.kind + ':' + x.id });
  });
  const a = todaysAffirmations()[0];
  if (a && a.action) items.push({ text: a.action, done: false, ref: 'affirm:' + a.id });
  const fill = ['Contact five potential clients', 'Create one piece of content for DZYN LAB', 'Spend 20 minutes on your film story'];
  let i = 0;
  while (items.length < 3) items.push({ text: fill[i++], done: false, ref: 'fill' });
  S.mission[k] = items.slice(0, 3);
  // keep only the last 60 days
  const keys = Object.keys(S.mission).sort();
  keys.slice(0, Math.max(0, keys.length - 60)).forEach((kk) => delete S.mission[kk]);
  return S.mission[k];
}
export function itemTitle(x) {
  if (x.kind === 'rem') { const r = S.reminders.find((y) => y.id === x.id); return r && r.task; }
  if (x.kind === 'pay') { const p = S.payments.find((y) => y.id === x.id); return p && ((p.type === 'in' ? 'Collect ' : 'Pay ') + L.money(leftOf(p)) + (p.type === 'in' ? ' from ' : ' to ') + p.party); }
  if (x.kind === 'lead') { const l = S.leads.find((y) => y.id === x.id); return l && ('Follow up with ' + l.name); }
  return '';
}

/* ---------------- Next best move ---------------- */
export function nextBestMove() {
  const now = Date.now();
  const overdueIn = S.payments.filter((p) => p.status === 'pending' && p.type === 'in' && L.atTime(p.due, 23, 59) < now).sort((a, b) => b.amount - a.amount)[0];
  if (overdueIn) return { text: 'Call ' + overdueIn.party + ' about the overdue ' + L.money(overdueIn.amount) + '.', why: 'Collected cash is the fastest way to close your revenue gap, and this one is already late.', go: 'money' };
  const soon = S.reminders.filter((r) => r.status === 'pending' && r.cat === 'Meeting' && alertStart(r) > now && alertStart(r) - now < 3 * 3600000)[0];
  if (soon) return { text: 'Prepare for "' + soon.task + '" at ' + L.fmtTime(alertStart(soon)) + '.', why: 'A prepared meeting converts better. Review the client notes now.', go: 'plan' };
  const leadDue = S.leads.filter((l) => l.followUp && l.followUp <= L.addDays(L.startOfDay(now), 1) && !['Won', 'Lost'].includes(l.status)).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  if (leadDue) return { text: 'Follow up with ' + leadDue.name + (leadDue.score ? ' (score ' + leadDue.score + ')' : '') + '.', why: 'Leads go cold fast. A follow-up today keeps this opportunity alive.', go: 'more-leads' };
  const overdue = S.reminders.filter((r) => r.status === 'pending' && alertStart(r) < now).sort((a, b) => a.due - b.due)[0];
  if (overdue) return { text: 'Clear "' + overdue.task + '".', why: 'It is overdue and still taking space in your head.', go: 'plan' };
  const m = ensureMission().find((x) => !x.done);
  if (m) return { text: m.text + '.', why: 'This is the next unfinished action of today\'s mission.', go: 'home' };
  const qualified = S.leads.filter((l) => ['New', 'Researched', 'Qualified'].includes(l.status)).length;
  if (qualified < 10) return { text: 'Add new prospects to your pipeline.', why: 'You have ' + qualified + ' open leads. A healthy pipeline needs at least 10 to hit your revenue target.', go: 'more-leads' };
  return { text: 'Contact the three highest-scoring leads.', why: 'Your list is clear. Outreach is now the highest-value use of your time.', go: 'more-leads' };
}

/* ---------------- Part payments ---------------- */
// Every payment keeps a list of parts: [{ amt, at, mode, note }]. Older records without parts count as fully paid when settled.
export function partsOf(p) { return p.parts && p.parts.length ? p.parts : (p.status === 'settled' ? [{ amt: Number(p.amount || 0), at: p.settledAt || p.due }] : []); }
export function paidOf(p) { return partsOf(p).reduce((a, x) => a + Number(x.amt || 0), 0); }
export function leftOf(p) { return Math.max(0, Number(p.amount || 0) - paidOf(p)); }
export function salaryPaidOf(e, mk) { const x = e.paid && e.paid[mk]; if (!x) return 0; if (typeof x === 'number') return Number(e.salary) || 0; return (x.parts || []).reduce((a, y) => a + Number(y.amt || 0), 0); }

/* ---------------- Revenue mission ---------------- */
export function revenue() {
  const now = Date.now(), mk = monthKey(now);
  const inThisMonth = (ms) => ms && monthKey(ms) === mk;
  const collected = S.payments.filter((p) => p.type === 'in').reduce((a, p) => a + partsOf(p).filter((x) => inThisMonth(x.at)).reduce((b, x) => b + Number(x.amt || 0), 0), 0);
  const outstanding = S.payments.filter((p) => p.type === 'in' && p.status === 'pending').reduce((a, p) => a + leftOf(p), 0);
  const expected = S.payments.filter((p) => p.type === 'in' && p.status === 'pending' && monthKey(p.due) === mk).reduce((a, p) => a + leftOf(p), 0);
  const active = S.clients.filter((c) => c.active !== false && Number(c.retainer) > 0);
  const mrr = active.reduce((a, c) => a + Number(c.retainer || 0), 0);
  const avg = active.length ? mrr / active.length : 0;
  const expenses = S.expenses.filter((e) => (e.recurring && e.date <= now) || inThisMonth(e.date)).reduce((a, e) => a + Number(e.amount || 0), 0) + S.employees.filter((e) => e.active !== false).reduce((a, e) => a + (Number(e.salary) || 0), 0) + officeMonth().total;
  const target = Number(S.settings.revenueTarget) || 0;
  const gap = Math.max(0, target - collected);
  const clientsNeeded = avg ? Math.ceil(Math.max(0, target - mrr) / avg) : null;
  const history = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - i);
    const k = monthKey(d.getTime());
    history.push({ label: L.MON[d.getMonth()], value: S.payments.filter((p) => p.type === 'in').reduce((a, p) => a + partsOf(p).filter((x) => x.at && monthKey(x.at) === k).reduce((b, x) => b + Number(x.amt || 0), 0), 0) });
  }
  return { target, collected, outstanding, expected, mrr, activeClients: active.length, avg, expenses, net: collected - expenses, gap, clientsNeeded, pct: target ? Math.min(1, collected / target) : 0, history };
}

/* ---------------- Loans ---------------- */
export function loanStats() {
  const open = S.loans.filter((l) => !l.closed);
  const monthly = open.reduce((a, l) => a + (l.type === 'friend' && !l.emi ? 0 : Number(l.emi || 0)), 0);
  const outstanding = open.reduce((a, l) => a + loanOutstanding(l), 0);
  let freeAt = 0;
  open.forEach((l) => { if (l.emisLeft && l.type !== 'friend') { const d = new Date(); d.setMonth(d.getMonth() + Number(l.emisLeft)); freeAt = Math.max(freeAt, d.getTime()); } });
  return { open: open.length, monthly, outstanding, freeAt };
}
export function loanOutstanding(l) {
  if (l.type === 'friend') return Math.max(0, Number(l.amount || 0) - Number(l.paid || 0));
  return Number(l.emi || 0) * Number(l.emisLeft || 0);
}

/* ---------------- Affirmations ---------------- */
export function allAffirmations() { return MG.magnetAffirmations().concat(MG.dreamAffirmations(), C.AFFIRMATIONS.filter((a) => a.cat !== 'Money'), S.affirm.custom || []); }
export function pickAffirmation(seed) {
  const all = allAffirmations();
  return all[Math.abs(seed) % all.length];
}
export function todaysAffirmations() {
  const all = allAffirmations();
  const d = Math.floor(L.startOfDay(Date.now()) / L.DAY);
  const pick = [];
  const mm = MG.magnetAffirmations(), dr = MG.dreamAffirmations();
  pick.push(mm[d % mm.length], mm[(d * 7 + 3) % mm.length]);
  if (dr.length) pick.push(dr[d % dr.length]);
  const cats = C.AFFIRM_CATS.filter((c) => c !== 'Money');
  for (let i = 0; i < 1; i++) {
    const cat = cats[(d * 3 + i) % cats.length];
    const pool = all.filter((a) => a.cat === cat);
    const a = pool.length ? pool[(d + i) % pool.length] : all[(d * 7 + i) % all.length];
    if (!pick.includes(a)) pick.push(a);
  }
  const custom = (S.affirm.custom || []).filter((a) => a.pinned);
  return custom.concat(pick).slice(0, 5);
}
export function affirmStreak() {
  let n = 0, d = Date.now();
  const has = (k) => (S.affirm.done[k] || []).length > 0;
  if (!has(L.dayKey(d))) d = L.addDays(d, -1);
  while (has(L.dayKey(d))) { n++; d = L.addDays(d, -1); }
  return n;
}
export function openingCard() {
  const seed = Math.floor(Date.now() / (20 * L.MIN));
  const dm = MG.dreamManifestations();
  if (seed % 3 === 1 && dm.length) { const x = dm[seed % dm.length]; const a0 = MG.dreamAffirmations().find((a) => a.dream && a.dream.id === x.dream.id); return { kind: 'dream', title: 'Manifest · ' + x.dream.title, text: x.text, dream: x.dream, affirm: a0 }; }
  const mm = MG.magnetAffirmations();
  const a = seed % 3 === 0 ? mm[seed % mm.length] : pickAffirmation(seed);
  return { kind: 'affirm', title: 'Affirmation · ' + a.cat, text: a.text, affirm: a };
}

/* ---------------- Streak and counts ---------------- */
export function doneToday() {
  const d0 = L.startOfDay(Date.now());
  return S.log.filter((e) => ['done', 'paid', 'routine', 'mission', 'affirm'].includes(e.kind) && e.t >= d0).length;
}
export function streak() {
  const days = new Set(S.log.filter((e) => ['done', 'routine', 'paid', 'mission', 'affirm'].includes(e.kind)).map((e) => L.dayKey(e.t)));
  let n = 0, d = Date.now();
  if (!days.has(L.dayKey(d))) d = L.addDays(d, -1);
  while (days.has(L.dayKey(d))) { n++; d = L.addDays(d, -1); }
  return n;
}

/* ---------------- Morning briefing (no AI needed) ---------------- */
export function briefing() {
  const now = Date.now(), d0 = L.startOfDay(now), d1 = L.addDays(d0, 1);
  const nm = S.settings.name || 'Divyesh';
  const lines = [];
  upcomingSpecial(1).forEach((x) => { lines.push((Math.round((x.at - d0) / L.DAY) === 0 ? 'Today: ' : 'Tomorrow: ') + specialTitle(x.sd, x.at) + '.'); });
  const meetings = S.reminders.filter((r) => r.status === 'pending' && r.cat === 'Meeting' && L.occurrencesBetween(r, d0, d1, 2).length);
  const todayRems = S.reminders.filter((r) => r.status === 'pending' && L.occurrencesBetween(r, d0, d1, 2).length);
  const overdue = S.reminders.filter((r) => r.status === 'pending' && !r.repeat && alertStart(r) < d0);
  const rev = revenue();
  const loansDue = S.loans.filter((l) => !l.closed).map((l) => ({ l: l, due: nextDue(l) })).filter((x) => x.due && x.due < L.addDays(d0, 4));
  const collectToday = S.payments.filter((p) => p.status === 'pending' && p.type === 'in' && p.due < d1);
  const followups = S.leads.filter((l) => l.followUp && l.followUp < d1 && !['Won', 'Lost'].includes(l.status));

  if (meetings.length) lines.push(meetings.length + (meetings.length > 1 ? ' meetings' : ' meeting') + ' today: ' + meetings.slice(0, 2).map((r) => r.task + ' at ' + L.fmtTime(L.occurrencesBetween(r, d0, d1, 1)[0])).join(', ') + '.');
  else lines.push(todayRems.length ? todayRems.length + ' reminders on today\'s list.' : 'No fixed commitments today. A good day for deep work and outreach.');
  if (overdue.length) lines.push(overdue.length + ' item' + (overdue.length > 1 ? 's are' : ' is') + ' overdue. Clear ' + (overdue.length > 1 ? 'them' : 'it') + ' first.');
  if (collectToday.length) lines.push('Collect ' + L.money(collectToday.reduce((a, p) => a + leftOf(p), 0)) + ' from ' + collectToday.map((p) => p.party).slice(0, 2).join(' and ') + '.');
  if (followups.length) lines.push(followups.length + ' lead follow-up' + (followups.length > 1 ? 's' : '') + ' due.');
  if (loansDue.length) lines.push('EMI coming up: ' + loansDue.map((x) => (x.l.title || x.l.lender) + ' ' + L.money(x.l.emi || x.l.amount) + ' on ' + L.fmtDate(x.due)).slice(0, 2).join(', ') + '.');
  if (rev.target) lines.push('Revenue this month: ' + L.money(rev.collected) + ' of ' + L.money(rev.target) + ' (' + Math.round(rev.pct * 100) + '%).');
  return { greeting: L.greeting(nm, now), lines: lines };
}
function nextDue(l) {
  // local copy to avoid a circular import with schedule.js
  if (l.closed) return null;
  if (l.type === 'friend' && !l.emiDay) return l.dueDate ? L.startOfDay(l.dueDate) : null;
  const day = Number(l.emiDay) || 1, now = Date.now(), d = new Date(now);
  const paid = l.lastPaid && L.dayKey(l.lastPaid).slice(0, 7) === L.dayKey(now).slice(0, 7);
  let y = d.getFullYear(), m = d.getMonth();
  const mk = (yy, mm) => new Date(yy, mm, Math.min(day, new Date(yy, mm + 1, 0).getDate())).getTime();
  let due = mk(y, m);
  if (paid || due < L.startOfDay(now) - 3 * L.DAY) { m++; if (m > 11) { m = 0; y++; } due = mk(y, m); }
  return due;
}
export { nextDue };

/* ---------------- AI context ---------------- */
export function aiSystem(mode) {
  const st = S.settings, now = Date.now(), rev = revenue(), ls = loanStats(), b = briefing();
  const top = topFive().map((x) => '- ' + itemTitle(x) + (x.tomorrow ? ' (tomorrow)' : '')).join('\n') || '- nothing urgent';
  const mission = ensureMission().map((m) => '- [' + (m.done ? 'x' : ' ') + '] ' + m.text).join('\n');
  const leads = S.leads.filter((l) => !['Won', 'Lost'].includes(l.status)).slice(0, 15).map((l) => '- ' + l.name + ' (' + (l.industry || '?') + ', ' + l.status + (l.score ? ', score ' + l.score : '') + ')').join('\n') || '- none yet';
  const clients = S.clients.slice(0, 25).map((c) => '- ' + (c.company || c.firstName) + (c.businessType ? ' (' + c.businessType + ')' : '') + (Number(c.retainer) ? ', retainer ' + L.money(c.retainer) : '') + (c.active === false ? ', inactive' : '')).join('\n') || '- none added';
  const dreams = S.dreams.map((d) => '- ' + d.title + (d.target ? ' (' + L.money(d.target) + ')' : '') + (d.targetDate ? ' by ' + L.fmtDate(d.targetDate) : '')).join('\n') || '- none added';
  const bz = st.business;
  let s = 'You are LUCY, the personal AI assistant and founder partner of ' + st.name + ' (Divyesh Umesh Panchal), founder of DZYN LAB PRIVATE LIMITED, a creative, content production, branding and digital marketing company in Ahmedabad, India. He is also a cinematographer who wants to become one of Bollywood\'s most successful film directors.\n' +
    'Personality: warm, premium, intelligent, direct, encouraging but honest. Speak in clear Indian English; light Hinglish is fine when he uses it. Keep replies short and actionable unless he asks for detail. No emojis.\n' +
    'Rules: never invent numbers, clients, contacts or facts. Use only the data below or clearly label something as an estimate or assumption. If information is missing, say what is missing. Motivation must always lead to a concrete next action.\n\n' +
    'Now: ' + new Date(now).toString().slice(0, 21) + ' (Asia/Kolkata).\n' +
    'Profile: ' + profileLine() + '\n' +
    'Growth plan: ' + (function () { const g = growthPlan(); return g.rows.map((r) => r.count + ' ' + r.name + ' clients at ' + L.money(r.price) + ' (have ' + r.have + ')').join('; ') + ' = ' + L.money(g.planRevenue) + '/month from ' + g.planClients + ' clients. Team plan: ' + g.team.map((m) => m.need + ' ' + m.role + ' (hired ' + m.have + ')').join(', ') + '.'; })() + '\n' +
    'Upcoming special days (next 30 days):\n' + (upcomingSpecial(30).map((x) => '- ' + specialTitle(x.sd, x.at) + ' on ' + L.fmtDate(x.at)).join('\n') || '- none') + '\n' +
    'Vision:\n' + (st.vision || []).map((v) => '- ' + v).join('\n') + '\n' +
    'Revenue mission this month: target ' + L.money(rev.target) + ', collected ' + L.money(rev.collected) + ', outstanding receivables ' + L.money(rev.outstanding) + ', monthly recurring (retainers) ' + L.money(rev.mrr) + ' from ' + rev.activeClients + ' clients, expenses logged ' + L.money(rev.expenses) + '.\n' +
    'Loans: ' + ls.open + ' open, monthly EMIs ' + L.money(ls.monthly) + ', outstanding ' + L.money(ls.outstanding) + '.\n' +
    'Today\'s briefing: ' + b.lines.join(' ') + '\n' +
    'Top 5:\n' + top + '\nToday\'s mission:\n' + mission + '\n' +
    'Clients:\n' + clients + '\nOpen leads:\n' + leads + '\nDreams:\n' + dreams + '\n' +
    'Pricing rules: minimum retainer ' + L.money(bz.minRetainer) + ', minimum margin ' + bz.minMargin + '%, maximum discount ' + bz.maxDiscount + '%, minimum contract ' + bz.minMonths + ' months, payment terms: ' + bz.paymentTerms + '. Known costs per unit: reel ' + (bz.costs.reel || 'unknown') + ', post ' + (bz.costs.post || 'unknown') + ', shoot day ' + (bz.costs.shoot || 'unknown') + ', ads management ' + (bz.costs.ads || 'unknown') + ', website ' + (bz.costs.website || 'unknown') + '.\n\n' +
    'ACTIONS: when it would help, you may propose actions for him to approve. Put them at the very end in a fenced block exactly like:\n```actions\n[{"type":"reminder","text":"Call Kliya Cafe tomorrow at 11am"},{"type":"idea","text":"..."},{"type":"note","title":"...","body":"..."},{"type":"lead","name":"...","industry":"...","city":"...","website":"...","phone":"...","email":"...","instagram":"...","score":82,"reason":"...","service":"...","price":"...","source":"https://..."}]\n```\nFor reminders, write the text with the day and time in natural words. Only propose actions that are clearly useful. Never put contact details in a lead unless they appeared in a source you actually found.';
  if (mode === 'hunter') {
    const h = st.hunter;
    s += '\n\nHUNTER MODE: use web search to find real businesses that could become DZYN LAB clients. Target industries: ' + h.industries + '. Location: ' + h.city + '. Minimum likely monthly budget: ' + L.money(h.minBudget) + '. Services we sell: ' + h.services + '.\n' +
      'Find 5 to 8 qualified prospects. For each: business name, industry, city, website, public phone or email ONLY if shown on a source page, Instagram handle if found, why they need us, recommended service, a score out of 100 with a one-line reason (service fit, budget signals, marketing gaps, growth signals), and the source URL. Say clearly which details are verified from sources and which are your estimates. Then output them in the actions block as type "lead".';
  }
  if (mode === 'pricing') s += '\n\nPRICING MODE: recommend a monthly retainer using the pricing rules and known costs above. Give: recommended retainer, minimum acceptable, premium option, deliverables, estimated cost and margin only if costs are known (otherwise say which costs are missing), contract duration, payment terms, extra charges, and a short explanation. Say clearly if the client is not financially attractive.';
  return s;
}
export function parseActions(text) {
  const m = String(text || '').match(/```actions\s*([\s\S]*?)```/);
  if (!m) return { text: text, actions: [] };
  let actions = [];
  try { actions = JSON.parse(m[1].trim()); } catch (e) { actions = []; }
  return { text: text.replace(m[0], '').trim(), actions: Array.isArray(actions) ? actions.slice(0, 12) : [] };
}

function profileLine() {
  const p = S.profile || {};
  return [p.fullName, p.role && p.company ? p.role + ', ' + p.company : '', p.city, p.dob ? 'born ' + p.dob : '', p.anniversary ? 'married ' + p.anniversary + (p.spouse ? ' to ' + p.spouse : '') : '', p.about].filter(Boolean).join('; ');
}

// Growth plan: client tiers (by retainer) and the team needed to deliver them.
export function growthPlan() {
  const g = S.growth, tiers = g.tiers.slice().sort((a, b) => b.price - a.price);
  const active = S.clients.filter((c) => c.active !== false && Number(c.retainer) > 0);
  const rows = tiers.map((t, i) => {
    const lower = i < tiers.length - 1 ? (t.price + tiers[i + 1].price) / 2 : 0;
    const upper = i > 0 ? (tiers[i - 1].price + t.price) / 2 : Infinity;
    const have = active.filter((c) => Number(c.retainer) >= lower && Number(c.retainer) < upper);
    return { name: t.name, price: Number(t.price), count: Number(t.count), have: have.length, haveMrr: have.reduce((a, c) => a + Number(c.retainer), 0), revenue: Number(t.price) * Number(t.count) };
  });
  const planRevenue = rows.reduce((a, r) => a + r.revenue, 0), planClients = rows.reduce((a, r) => a + r.count, 0);
  const emps = S.employees.filter((e) => e.active !== false);
  const team = g.team.map((m) => { const mine = emps.filter((e) => String(e.role).toLowerCase() === String(m.role).toLowerCase()); return { role: m.role, need: Number(m.need) || 0, have: emps.length ? mine.length : (Number(m.have) || 0), people: mine, salary: Number(m.salary) || 0 }; });
  const teamNeed = team.reduce((a, m) => a + m.need, 0), teamHave = team.reduce((a, m) => a + m.have, 0);
  const salaryKnown = team.every((m) => m.salary > 0);
  const payrollPlan = team.reduce((a, m) => a + m.need * m.salary, 0);
  return { rows: rows, planRevenue: planRevenue, planClients: planClients, team: team, teamNeed: teamNeed, teamHave: teamHave, salaryKnown: salaryKnown, payrollPlan: payrollPlan,
    clientsPerEditor: (team.find((m) => /editor/i.test(m.role)) || {}).need ? planClients / team.find((m) => /editor/i.test(m.role)).need : null };
}

// Employees and payroll
export function payroll() {
  const mk = monthKey(Date.now());
  const list = S.employees.filter((e) => e.active !== false);
  const total = list.reduce((a, e) => a + (Number(e.salary) || 0), 0);
  const paidAmount = list.reduce((a, e) => a + Math.min(Number(e.salary) || 0, salaryPaidOf(e, mk)), 0);
  const full = list.filter((e) => salaryPaidOf(e, mk) >= (Number(e.salary) || 0) && salaryPaidOf(e, mk) > 0);
  return { list: list, total: total, paidCount: full.length, paidAmount: paidAmount, due: list.filter((e) => salaryPaidOf(e, mk) < (Number(e.salary) || 0)), month: mk };
}

// Monthly clients: on each renewal date, add that month's amount to receivables (once per cycle).
export function billClients() {
  const today = L.startOfDay(Date.now()), soon = L.addDays(today, 3);
  let changed = false;
  S.clients.forEach((c) => {
    if (c.active === false || c.billing === 'once' || !Number(c.retainer || c.amount) || !c.nextDate) return;
    let guard = 0;
    while (c.nextDate <= soon && guard++ < 24) {
      const key = c.id + ':' + L.dayKey(c.nextDate);
      if (!S.payments.some((p) => p.cycle === key)) {
        S.payments.push({ id: S.seq++, type: 'in', party: c.company || c.firstName || 'Client', amount: Number(c.retainer || c.amount), due: c.nextDate, note: (c.pkg ? c.pkg + ' · ' : '') + 'Monthly renewal', clientId: c.id, status: 'pending', created: Date.now(), auto: true, cycle: key });
      }
      const d = new Date(c.nextDate), day = c.renewDay || d.getDate();
      c.renewDay = day;
      const ny = d.getFullYear(), nm = d.getMonth() + 1;
      c.nextDate = new Date(ny, nm, Math.min(day, new Date(ny, nm + 1, 0).getDate())).getTime();
      changed = true;
    }
  });
  return changed;
}

// Office expenses: monthly bills with due day; variable bills (light, water) use what was actually paid.
export function officePaidOf(o, mk) { const x = o.paid && o.paid[mk]; return x ? (x.parts || []).reduce((a, y) => a + Number(y.amt || 0), 0) : 0; }
export function officeMonth() {
  const mk = monthKey(Date.now());
  const items = S.office || [];
  const rows = items.map((o) => { const paid = officePaidOf(o, mk), amt = Number(o.amount) || 0; const due = o.variable ? Math.max(amt, paid) : amt;
    return { o: o, paid: paid, due: due, left: Math.max(0, amt - paid), status: !amt && !paid ? 'unset' : paid >= amt && paid > 0 ? 'paid' : paid > 0 ? 'part' : 'due' }; });
  rows.forEach((r) => { if (r.o.active === false) r.status = 'off'; });
  const on = rows.filter((r) => r.o.active !== false);
  return { mk: mk, rows: on.concat(rows.filter((r) => r.o.active === false)), total: on.reduce((a, r) => a + r.due, 0), paid: on.reduce((a, r) => a + r.paid, 0) };
}
