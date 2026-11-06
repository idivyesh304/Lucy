// Reports and coaching: honest scores from Divyesh's own data, accountability questions,
// books and reading, what he watches, and lessons. Answers are saved and quoted back to him.
import { S } from './store.js';
import * as L from '../src/logic.js';
import { partsOf, paidOf, leftOf, salaryPaidOf, officePaidOf, revenue } from './brain.js';

const DAY = 864e5;
const dk = (t) => L.dayKey(t);
const mk = (t) => L.dayKey(t).slice(0, 7);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const money = (n) => L.money(Math.round(n || 0));
const avg = (arr) => { const v = arr.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function range(kind) {
  const now = Date.now(), today = L.startOfDay(now);
  if (kind === 'month') { const d = new Date(now); return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: now, days: d.getDate(), label: 'This month' }; }
  return { from: L.addDays(today, -6), to: now, days: 7, label: 'Last 7 days' };
}
const inR = (t, r) => t && t >= r.from && t <= r.to;
function daysOf(r) { const out = []; for (let t = L.startOfDay(r.from); t <= r.to; t = L.addDays(t, 1)) out.push(dk(t)); return out; }

/* ---------------- answers ---------------- */
export function answers(filter) { return (S.coach || []).filter((x) => !filter || filter(x)).sort((a, b) => b.at - a.at); }
export const answered = (key) => (S.coach || []).some((x) => x.key === key);
const said = (kind, ref) => answers((x) => x.kind === kind && (ref == null || String(x.ref) === String(ref)));

/* ---------------- reports ---------------- */
export function reports(kind) {
  const r = range(kind);
  const list = [company(r), money_(r), personal(r), creativity(r), learning(r), ascend(r)];
  const scored = list.filter((x) => x.score != null);
  return { range: r, list: list, overall: scored.length ? Math.round(avg(scored.map((x) => x.score))) : null, weakest: scored.slice().sort((a, b) => a.score - b.score)[0] || null };
}

function company(r) {
  const rv = revenue(), now = Date.now();
  const target = Number(S.settings.revenueTarget) || 0;
  const d = new Date(now), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), frac = d.getDate() / dim;
  const late = S.payments.filter((p) => p.type === 'in' && p.status === 'pending' && p.due < L.startOfDay(now) - 2 * DAY);
  const lateAmt = late.reduce((a, p) => a + leftOf(p), 0);
  const open = S.leads.filter((l) => !['Won', 'Lost'].includes(l.status));
  const fuLate = open.filter((l) => l.followUp && l.followUp < L.startOfDay(now));
  const added = S.leads.filter((l) => inR(l.created, r)).length;
  const won = S.leads.filter((l) => l.status === 'Won' && inR(l.wonAt, r));
  const lost = S.leads.filter((l) => l.status === 'Lost' && inR(l.lostAt, r));
  const contacts = S.leads.reduce((a, l) => a + (l.activity || []).filter((x) => x.type !== 'Note' && inR(x.at, r)).length, 0);
  const churn = S.clients.filter((c) => inR(c.past, r));
  const activeClients = S.clients.filter((c) => !c.past && c.active !== false);
  const subs = [];
  if (target && (rv.collected || activeClients.length)) subs.push(clamp((100 * rv.collected) / (target * Math.max(frac, 0.1))));
  if (activeClients.length) subs.push(clamp(100 - (lateAmt / Math.max(1, rv.mrr || lateAmt)) * 100));
  if (S.leads.length) subs.push(clamp(Math.min(100, (open.length / 10) * 60) + (contacts ? 40 : 0) - fuLate.length * 10));
  const v = [];
  if (target) {
    const pace = rv.collected / Math.max(frac, 0.05);
    if (rv.collected || activeClients.length) v.push(pace >= target ? { t: 'good', s: 'On pace for ' + money(pace) + ' this month. Target ' + money(target) + '.' } : { t: 'bad', s: 'At this pace you close the month near ' + money(pace) + '. That is ' + money(target - pace) + ' short of ' + money(target) + '. Selling is the job this week.' });
  }
  if (rv.mrr && target) v.push({ t: rv.mrr >= target ? 'good' : 'warn', s: 'Retainers bring ' + money(rv.mrr) + ' a month. ' + (rv.clientsNeeded ? 'You need about ' + rv.clientsNeeded + ' more clients at your average retainer to hit target.' : '') });
  if (late.length) {
    const excuses = said('late');
    v.push({ t: 'bad', s: late.length + ' client payment' + (late.length > 1 ? 's are' : ' is') + ' late: ' + money(lateAmt) + ' sitting with clients. ' + (excuses.filter((x) => /follow|invoice|remind/i.test(x.a)).length >= 2 ? 'By your own answers, most late payments happen because you did not follow up. That is a process problem, not a client problem.' : 'Collect before you chase new work.') });
  }
  if (fuLate.length) v.push({ t: 'bad', s: fuLate.length + ' lead follow-up' + (fuLate.length > 1 ? 's are' : ' is') + ' overdue. Every day you wait, the lead cools down.' });
  if (S.leads.length && open.length < 10) v.push({ t: 'warn', s: 'Only ' + open.length + ' open leads. A healthy pipeline for your target is 10 or more.' });
  if (!contacts && S.leads.length) v.push({ t: 'bad', s: 'Zero sales calls or meetings logged in this period.' });
  if (churn.length) v.push({ t: 'bad', s: churn.length + ' client' + (churn.length > 1 ? 's' : '') + ' left: ' + churn.map((c) => c.company || c.firstName).join(', ') + '.' });
  if (won.length) v.push({ t: 'good', s: 'Won ' + won.length + ': ' + won.map((l) => l.name).join(', ') + '.' });
  return { key: 'company', title: 'Company', icon: 'building', score: subs.length ? Math.round(avg(subs)) : null,
    stats: [['Collected this month', money(rv.collected), target ? pct(rv.collected, target) + '% of target' : ''], ['Late from clients', money(lateAmt), late.length + ' payments'], ['Monthly retainers', money(rv.mrr), activeClients.length + ' active clients'], ['Pipeline', open.length + ' open leads', added + ' added · ' + contacts + ' contacts · ' + won.length + ' won · ' + lost.length + ' lost']],
    verdicts: v };
}

function money_(r) {
  const now = Date.now(), m = mk(now), today = new Date(now).getDate();
  let due = 0, onTime = 0;
  const lateList = [];
  (S.office || []).filter((o) => o.active !== false && Number(o.amount) > 0).forEach((o) => {
    const dd = Number(o.dueDay) || 1; if (dd > today) return; due++;
    const parts = ((o.paid && o.paid[m]) || {}).parts || [];
    const paidBy = parts.filter((x) => new Date(x.at).getDate() <= dd + 1).reduce((a, x) => a + Number(x.amt || 0), 0);
    if (paidBy >= Number(o.amount) || (o.variable && parts.length && new Date(parts[0].at).getDate() <= dd + 1)) onTime++; else lateList.push(o.name);
  });
  const sd = Number(S.settings.salaryDay) || 1;
  S.employees.filter((e) => !e.past && e.active !== false && Number(e.salary) > 0).forEach((e) => {
    if (sd > today) return; due++;
    const parts = ((e.paid && e.paid[m]) || {}).parts || [];
    const paidBy = parts.filter((x) => new Date(x.at).getDate() <= sd + 2).reduce((a, x) => a + Number(x.amt || 0), 0);
    if (paidBy >= Number(e.salary)) onTime++; else lateList.push('Salary: ' + e.name);
  });
  const payLate = S.payments.filter((p) => p.type === 'out' && p.status === 'pending' && p.due < L.startOfDay(now));
  const rv = revenue();
  const v = [];
  if (lateList.length) v.push({ t: 'bad', s: 'Paid late or still unpaid: ' + lateList.slice(0, 5).join(', ') + (lateList.length > 5 ? ' and ' + (lateList.length - 5) + ' more' : '') + '. Late payments cost trust with your team and vendors.' });
  else if (due) v.push({ t: 'good', s: 'Every bill and salary due so far this month was paid on time.' });
  if (payLate.length) v.push({ t: 'bad', s: payLate.length + ' payable' + (payLate.length > 1 ? 's' : '') + ' overdue: ' + payLate.slice(0, 3).map((p) => p.party).join(', ') + '.' });
  if (rv.expenses && rv.mrr) { const ratio = rv.expenses / rv.mrr; v.push({ t: ratio > 0.7 ? 'bad' : ratio > 0.5 ? 'warn' : 'good', s: 'Fixed costs are ' + Math.round(ratio * 100) + '% of your retainer income. ' + (ratio > 0.7 ? 'Too tight. One lost client and you are in a cash crunch.' : ratio > 0.5 ? 'Keep it under 50% to stay safe.' : 'Healthy margin.') }); }
  return { key: 'money', title: 'Money discipline', icon: 'wallet', score: due || payLate.length ? clamp(pct(onTime, due || 1) - payLate.length * 10) : null,
    stats: [['Paid on time', due ? onTime + ' of ' + due : '–', 'bills and salaries this month'], ['Overdue payables', String(payLate.length), money(payLate.reduce((a, p) => a + leftOf(p), 0))], ['Monthly costs', money(rv.expenses), 'salaries, office, expenses']], verdicts: v };
}

function personal(r) {
  const now = Date.now();
  const dueIn = S.reminders.filter((x) => inR(x.due, r) && x.due <= now);
  const doneOnTime = dueIn.filter((x) => x.status === 'done' && (x.doneAt || 0) <= x.due + 3 * 36e5).length;
  const doneLate = dueIn.filter((x) => x.status === 'done' && (x.doneAt || 0) > x.due + 3 * 36e5).length;
  const overdue = S.reminders.filter((x) => x.status === 'pending' && x.due < L.startOfDay(now));
  const v = [];
  if (dueIn.length) v.push(doneOnTime / dueIn.length >= 0.8 ? { t: 'good', s: 'You did ' + pct(doneOnTime, dueIn.length) + '% of your tasks on time.' } : { t: 'bad', s: 'Only ' + pct(doneOnTime, dueIn.length) + '% of tasks were done on time. ' + doneLate + ' late, ' + (dueIn.length - doneOnTime - doneLate) + ' not done.' });
  if (overdue.length >= 3) v.push({ t: 'bad', s: overdue.length + ' tasks are overdue. Either do them, hand them to your team, or delete them honestly.' });
  const deleg = overdue.filter((x) => /edit|design|post|reel|shoot|upload|caption|thumbnail|banner|creative|story|invoice|bill|follow/i.test(x.task));
  if (deleg.length) v.push({ t: 'warn', s: deleg.length + ' overdue task' + (deleg.length > 1 ? 's look' : ' looks') + ' like team work: ' + deleg.slice(0, 3).map((x) => x.task).join(', ') + '. Delegate and get your time back.' });
  return { key: 'personal', title: 'Personal execution', icon: 'check', score: dueIn.length ? clamp(pct(doneOnTime, dueIn.length) - Math.max(0, overdue.length - 2) * 5) : null,
    stats: [['Done on time', dueIn.length ? doneOnTime + ' of ' + dueIn.length : '–', doneLate + ' done late'], ['Overdue now', String(overdue.length), '']], verdicts: v };
}

function routine(r) {
  const days = daysOf(r).filter((k) => k <= dk(Date.now()));
  const act = S.routine.filter((x) => x.on);
  if (!act.length) return { key: 'routine', title: 'Daily routine', icon: 'sunrise', score: null, stats: [], verdicts: [] };
  const per = act.map((it) => ({ it: it, n: days.filter((k) => (S.routineLog[k] || []).includes(it.key)).length }));
  const total = per.reduce((a, x) => a + x.n, 0), possible = act.length * days.length;
  const tracked = days.some((k) => (S.routineLog[k] || []).length);
  const weak = per.filter((x) => x.n <= days.length * 0.4).sort((a, b) => a.n - b.n);
  const strong = per.filter((x) => x.n >= days.length * 0.85);
  const v = [];
  if (!tracked) v.push({ t: 'warn', s: 'No routine ticks logged in this period. If you do it, tick it, or Lucy cannot coach you on it.' });
  else {
    if (weak.length) v.push({ t: 'bad', s: 'You keep skipping: ' + weak.slice(0, 4).map((x) => x.it.label + ' (' + x.n + '/' + days.length + ')').join(', ') + '.' });
    if (strong.length) v.push({ t: 'good', s: 'Solid habits: ' + strong.slice(0, 4).map((x) => x.it.label).join(', ') + '.' });
  }
  return { key: 'routine', title: 'Daily routine', icon: 'sunrise', score: tracked ? clamp(pct(total, possible)) : null,
    stats: [['Completed', total + ' of ' + possible, pct(total, possible) + '%'], ['Weakest habit', weak[0] ? weak[0].it.label : '–', weak[0] ? weak[0].n + ' of ' + days.length + ' days' : '']], verdicts: v };
}

function creativity(r) {
  const ideas = S.ideas.filter((x) => inR(x.created, r)).length;
  const notes = S.notes.filter((x) => inR(x.created || x.updated, r)).length;
  const days = daysOf(r);
  const journal = days.filter((k) => S.journal[k] && Object.keys(S.journal[k]).length).length;
  const target = Math.max(3, Math.round(days.length * 0.7));
  const v = [];
  v.push(ideas >= target ? { t: 'good', s: ideas + ' ideas captured. Keep feeding the machine.' } : { t: ideas ? 'warn' : 'bad', s: ideas + ' ideas in ' + days.length + ' days. A creative director should capture at least one a day. Write the half-baked ones too.' });
  if (journal < days.length / 2) v.push({ t: 'warn', s: 'Journal written on ' + journal + ' of ' + days.length + ' days. Reflection is where your creative clarity comes from.' });
  return { key: 'creativity', title: 'Creativity', icon: 'bulb', score: clamp((Math.min(ideas, target) / target) * 70 + (journal / days.length) * 30),
    stats: [['Ideas', String(ideas), 'target ' + target], ['Notes', String(notes), ''], ['Journal days', journal + ' of ' + days.length, '']], verdicts: v };
}

function learning(r) {
  const days = daysOf(r);
  const readDays = days.filter((k) => (S.books || []).some((b) => (b.logs || []).some((x) => dk(x.at) === k))).length;
  const pages = (S.books || []).reduce((a, b) => a + (b.logs || []).filter((x) => inR(x.at, r)).reduce((c, x) => c + Number(x.pages || 0), 0), 0);
  const media = (S.media || []).filter((x) => inR(x.at, r));
  const mins = media.reduce((a, x) => a + Number(x.minutes || 0), 0);
  const learnedMedia = media.filter((x) => String(x.learned || '').trim().length > 8).length;
  const reels = media.filter((x) => x.type === 'Reels').reduce((a, x) => a + Number(x.minutes || 0), 0);
  const lessons = (S.coach || []).filter((x) => x.kind === 'lesson' && inR(x.at, r)).length;
  const v = [];
  const reading = (S.books || []).find((b) => b.status === 'reading');
  if (!reading) v.push({ t: 'bad', s: 'You are not reading any book right now. Pick one from Lucy\'s suggestions today.' });
  else v.push(readDays >= days.length * 0.6 ? { t: 'good', s: 'Read on ' + readDays + ' of ' + days.length + ' days, ' + pages + ' pages of ' + reading.title + '.' } : { t: 'bad', s: 'Read on only ' + readDays + ' of ' + days.length + ' days. Ten pages a day is a book a month.' });
  if (media.length) v.push(learnedMedia / media.length >= 0.6 ? { t: 'good', s: 'You took a lesson from ' + learnedMedia + ' of ' + media.length + ' things you watched.' } : { t: 'bad', s: Math.round(mins / 60 * 10) / 10 + ' hours watched, and you learned something from only ' + learnedMedia + ' of ' + media.length + '. That is entertainment, not input.' });
  if (reels >= 120) v.push({ t: 'bad', s: Math.round(reels / 60 * 10) / 10 + ' hours of reels. Study your competitors\' reels on purpose, or put the phone down.' });
  return { key: 'learning', title: 'Learning', icon: 'book', score: clamp((readDays / days.length) * 60 + (media.length ? (learnedMedia / media.length) * 25 : 25) + Math.min(lessons, 5) * 3),
    stats: [['Reading days', readDays + ' of ' + days.length, pages + ' pages'], ['Watched', Math.round(mins / 60 * 10) / 10 + ' h', learnedMedia + ' of ' + media.length + ' with a lesson'], ['Lessons learned', String(lessons), '']], verdicts: v };
}

function ascend(r) {
  const days = daysOf(r);
  const aff = days.filter((k) => (S.affirm.done[k] || []).length).length;
  const rit = days.filter((k) => { const m = S.manifest[k] || {}; return Object.keys(m).length; }).length;
  const v = [];
  v.push(aff >= days.length * 0.7 ? { t: 'good', s: 'Affirmations on ' + aff + ' of ' + days.length + ' days.' } : { t: 'warn', s: 'Affirmations on only ' + aff + ' of ' + days.length + ' days. Your mindset work only works if it is daily.' });
  return { key: 'ascend', title: 'Mindset', icon: 'star', score: clamp(((aff + rit) / (days.length * 2)) * 100), stats: [['Affirmation days', aff + ' of ' + days.length, ''], ['Manifest ritual days', rit + ' of ' + days.length, '']], verdicts: v };
}

/* ---------------- questions Lucy asks ---------------- */
export const QUICK = {
  late: ['I did not follow up', 'Invoice not sent', 'Client forgot', 'Client cash crunch', 'Unhappy with our work', 'Other'],
  clientleft: ['Price too high', 'Results not good enough', 'Our delivery was late', 'Budget cut', 'Took it in-house', 'Went to another agency', 'Other'],
  empleft: ['Better salary', 'Too much pressure', 'Not enough growth', 'Personal reasons', 'I let them go', 'Culture or team issues', 'Other'],
  fu: ['No time', 'Forgot', 'Waiting for their reply', 'Not sure what to say', 'Lead not worth it', 'Other'],
  lostlearn: [],
  routine: ['Woke up late', 'Too much work', 'No energy', 'Travel', 'Did it but forgot to tick', 'Other'],
  overdue: [],
  read: [],
  media: [],
  week: [],
  lesson: []
};
export function questions() {
  const now = Date.now(), today = dk(now), out = [];
  const q = (key, kind, ref, text, hint, extra) => { if (!answered(key)) out.push(Object.assign({ key: key, kind: kind, ref: ref, q: text, hint: hint || '', prev: ref != null ? said(kind, ref)[0] : said(kind)[0] }, extra || {})); };
  S.payments.filter((p) => p.type === 'in' && p.status === 'pending' && p.due < L.startOfDay(now) - 2 * DAY).forEach((p) => {
    const d = Math.floor((L.startOfDay(now) - L.startOfDay(p.due)) / DAY);
    q('late:' + p.id + ':' + Math.floor(d / 7), 'late', p.clientId || p.party, 'Why is ' + p.party + ' not paying on time? ' + money(leftOf(p)) + ' is ' + d + ' days late.', 'Be honest. If you did not follow up, say so.', { prio: 90 });
  });
  S.clients.filter((c) => c.past && now - c.past < 60 * DAY).forEach((c) => q('clientleft:' + c.id, 'clientleft', c.id, 'Why did ' + (c.company || c.firstName) + ' stop working with us?', 'What would have made them stay?', { prio: 95 }));
  S.employees.filter((e) => e.past && now - e.past < 60 * DAY).forEach((e) => q('empleft:' + e.id, 'empleft', e.id, 'Why did ' + e.name + ' leave?', 'What should you change so the next person stays?', { prio: 85 }));
  S.leads.filter((l) => l.status === 'Lost' && l.lostAt && now - l.lostAt < 30 * DAY).forEach((l) => q('lostlearn:' + l.id, 'lostlearn', l.id, 'You lost ' + l.name + (l.lostReason ? ' (' + l.lostReason + ')' : '') + '. What will you do differently next time?', '', { prio: 70 }));
  S.leads.filter((l) => !['Won', 'Lost'].includes(l.status) && l.followUp && l.followUp < L.startOfDay(now) - DAY).forEach((l) => q('fu:' + l.id + ':' + dk(l.followUp), 'fu', l.id, 'Why have you not followed up with ' + l.name + '? It was due ' + L.fmtDate(l.followUp) + '.', '', { prio: 80 }));
  const overdue = S.reminders.filter((x) => x.status === 'pending' && x.due < L.startOfDay(now));
  if (overdue.length >= 5) q('overdue:' + today, 'overdue', null, overdue.length + ' tasks are overdue. What is really blocking you, and which of these can your team do?', overdue.slice(0, 4).map((x) => x.task).join(', '), { prio: 60 });
  const last3 = [1, 2, 3].map((i) => dk(L.addDays(L.startOfDay(now), -i)));
  if (false) S.routine.filter((x) => x.on).forEach((it) => { if (last3.every((k) => !(S.routineLog[k] || []).includes(it.key))) q('routine:' + it.key + ':' + mk(now) + ':' + Math.floor(new Date(now).getDate() / 7), 'routine', it.key, 'You skipped "' + it.label + '" three days in a row. Why?', '', { prio: 50 }); });
  const hr = new Date(now).getHours();
  const reading = (S.books || []).find((b) => b.status === 'reading');
  if (reading && hr >= 18 && !(reading.logs || []).some((x) => dk(x.at) === today)) q('read:' + today, 'read', reading.id, 'Did you read ' + reading.title + ' today? What did you learn?', 'Pages read and one idea you can use in DZYN LAB.', { prio: 40, book: reading });
  if (hr >= 20) q('media:' + today, 'media', null, 'Did you watch a movie, series, YouTube or reels today? Why, and what did you learn?', 'If you learned nothing, say that too.', { prio: 30 });
  if (new Date(now).getDay() === 0 && hr >= 17) q('week:' + today, 'week', null, 'This week: what was your biggest win, and what was your biggest waste of time?', '', { prio: 65 });
  return out.sort((a, b) => b.prio - a.prio);
}

/* ---------------- books and lessons ---------------- */
export const BOOKS = [
  ['$100M Offers', 'Alex Hormozi', 'sales', 'Build offers so good clients feel stupid saying no. Directly useful for your retainer packages.'],
  ['$100M Leads', 'Alex Hormozi', 'sales', 'How to get strangers to want your service. Your pipeline problem, solved step by step.'],
  ['Never Split the Difference', 'Chris Voss', 'sales', 'Negotiation from an FBI hostage negotiator. Stop discounting, start closing.'],
  ['Profit First', 'Mike Michalowicz', 'money', 'Take profit first, then run the business on what is left. Fixes cash crunches.'],
  ['The Psychology of Money', 'Morgan Housel', 'money', 'How behaviour, not maths, decides wealth. Short and powerful.'],
  ['Atomic Habits', 'James Clear', 'routine', 'Tiny habits, big results. The system behind a routine that sticks.'],
  ['Deep Work', 'Cal Newport', 'personal', 'Protect focus time for the work only you can do.'],
  ['Essentialism', 'Greg McKeown', 'personal', 'Do less, but better. Say no to good things to say yes to great ones.'],
  ['The E-Myth Revisited', 'Michael Gerber', 'company', 'Work on the business, not in it. Systems so the team runs without you.'],
  ['Who Not How', 'Dan Sullivan', 'personal', 'Stop asking how to do it. Ask who can do it. Delegation for founders.'],
  ['Building a StoryBrand', 'Donald Miller', 'company', 'Clarify the message for you and your clients. Great for your content strategy work.'],
  ['The 1-Page Marketing Plan', 'Allan Dib', 'company', 'A full marketing system on one page. Use it for DZYN LAB and for clients.'],
  ['Ogilvy on Advertising', 'David Ogilvy', 'creativity', 'Timeless rules of advertising from the master. Every ad person should own it.'],
  ['Steal Like an Artist', 'Austin Kleon', 'creativity', 'Ten rules for creativity. Quick read that unlocks ideas.'],
  ['Show Your Work', 'Austin Kleon', 'creativity', 'Share your process to get discovered. Perfect for your BTS and personal brand.'],
  ['Made to Stick', 'Chip and Dan Heath', 'creativity', 'Why some ideas survive and others die. Write hooks and scripts that stick.'],
  ['Influence', 'Robert Cialdini', 'sales', 'The six principles of persuasion behind every good ad and pitch.'],
  ['The Mom Test', 'Rob Fitzpatrick', 'sales', 'Ask clients questions that reveal the truth, not polite lies.'],
  ['Good to Great', 'Jim Collins', 'company', 'What turns good companies into great ones. Right people on the bus first.'],
  ['The Hard Thing About Hard Things', 'Ben Horowitz', 'company', 'Honest founder lessons on hiring, firing and tough calls.'],
  ['Thinking, Fast and Slow', 'Daniel Kahneman', 'learning', 'How your mind makes decisions and where it fools you.'],
  ['Can\'t Hurt Me', 'David Goggins', 'ascend', 'Mental toughness. For days when motivation is gone.'],
  ['The Almanack of Naval Ravikant', 'Eric Jorgenson', 'ascend', 'Wealth and happiness, simply explained.'],
  ['Zero to One', 'Peter Thiel', 'company', 'Build something new instead of copying. Think bigger about DZYN LAB.']
];
const AREA_TAG = { company: 'sales', money: 'money', personal: 'personal', routine: 'routine', creativity: 'creativity', learning: 'learning', ascend: 'ascend' };
export function suggestBooks(weakKey) {
  const have = new Set((S.books || []).map((b) => b.title.toLowerCase()));
  const tag = AREA_TAG[weakKey] || 'sales';
  const pool = BOOKS.filter((b) => !have.has(b[0].toLowerCase()));
  return pool.filter((b) => b[2] === tag).concat(pool.filter((b) => b[2] !== tag)).slice(0, 3).map((b) => ({ title: b[0], author: b[1], tag: b[2], why: b[3] }));
}

export const LESSONS = [
  ['sales', 'Follow up five times', 'Most deals close after the fourth or fifth follow-up. Most agencies stop after one. Set the next follow-up before you end every call.'],
  ['sales', 'Sell the outcome, not the reels', 'Clients do not want 12 reels. They want more walk-ins and enquiries. Price the result, show the deliverables second.'],
  ['sales', 'Anchor high', 'Show your biggest package first. Every other option then feels reasonable.'],
  ['sales', 'Silence after the price', 'Say the price and stop talking. The next person who speaks loses.'],
  ['money', 'Advance or no start', 'Never start work without the advance. 50% upfront protects your cash and filters bad clients.'],
  ['money', 'Invoice on day one', 'Send the invoice the day the month starts, with a payment link. Late invoices make late payments.'],
  ['money', 'Three months of costs in the bank', 'Keep salaries plus rent for three months as a reserve before you upgrade anything.'],
  ['company', 'Write it once, use it forever', 'Every task you explain twice should become a one-page checklist your team follows.'],
  ['company', 'Weekly one-to-ones', 'Fifteen minutes with each team member every week prevents most resignations.'],
  ['company', 'Hire slow, fire fast', 'A wrong hire costs you months. A paid test task before hiring saves them.'],
  ['personal', 'Eat the frog', 'Do the hardest, most valuable task first, before WhatsApp and Instagram.'],
  ['personal', 'Delegate at 70%', 'If someone can do it 70% as well as you, delegate it. Your time is for selling and creative direction.'],
  ['personal', 'Batch your calls', 'Make all follow-up calls in one 45-minute block. Switching costs more than you think.'],
  ['routine', 'Never miss twice', 'Missing once is an accident. Missing twice is the start of a new habit.'],
  ['routine', 'Sleep is a business tool', 'Your best creative decisions come from a rested brain. Protect your sleep time like a client meeting.'],
  ['creativity', 'Swipe file', 'Save every great ad, reel and design you see in one folder. Creativity is remixing good inputs.'],
  ['creativity', 'Quantity first', 'Write 20 hooks to find one great one. The first ideas are the obvious ones.'],
  ['creativity', 'Constraints make ideas', 'Give yourself a limit: one location, one prop, 15 seconds. Limits force original ideas.'],
  ['learning', 'Teach what you learn', 'Post one lesson from your reading on LinkedIn. Teaching locks it in and builds your brand.'],
  ['learning', 'Learn from every reel', 'When a reel stops your scroll, ask why. The hook, the first frame, the sound. Write it down.'],
  ['ascend', 'Identity first', 'Act like the owner of a 15-lakh-a-month agency today. Decide like him, dress like him, price like him.']
];
export function lessonOfDay(weakKey) {
  const tag = AREA_TAG[weakKey] || 'sales';
  const pool = LESSONS.filter((x) => x[0] === tag || x[0] === weakKey);
  const all = pool.length ? pool : LESSONS;
  const n = Math.floor(L.startOfDay(Date.now()) / DAY);
  const x = all[n % all.length];
  return { key: 'lesson:' + dk(Date.now()), area: x[0], title: x[1], text: x[2] };
}

// Plain-text summary for Lucy's AI coach
export function reportText(kind) {
  const rp = reports(kind);
  const lines = ['Report (' + rp.range.label + '), overall ' + (rp.overall == null ? 'not enough data' : rp.overall + '/100') + ':'];
  rp.list.forEach((x) => { lines.push(x.title + ': ' + (x.score == null ? 'no data' : x.score + '/100') + '. ' + x.stats.map((s) => s[0] + ' ' + s[1] + (s[2] ? ' (' + s[2] + ')' : '')).join('; ')); x.verdicts.forEach((v) => lines.push('  - ' + v.s)); });
  const ans = answers().slice(0, 20);
  if (ans.length) { lines.push('His own answers to your questions (most recent first):'); ans.forEach((a) => lines.push('- ' + L.fmtDate(a.at) + ' · ' + a.q + ' -> "' + a.a + '"')); }
  return lines.join('\n');
}
