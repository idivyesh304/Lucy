// Builds the list of iPhone notifications for the next 7 days. The helper sends them on time.
import { specialSchedule } from './special.js';
import * as L from '../src/logic.js';
import * as C from './content.js';
import { S } from './store.js';
import { pickAffirmation } from './brain.js';

function hm(s) { const p = String(s || '0:0').split(':'); return { h: +p[0] || 0, m: +p[1] || 0 }; }
const alertStart = (r) => Math.max(r.due, r.snoozeUntil || 0);

export function buildSchedule() {
  const st = S.settings, now = Date.now(), horizon = L.addDays(now, 7), nm = st.name || 'Divyesh';
  const out = [];
  const push = (at, title, body, tag, url) => { if (at > now + 30000 && at <= horizon) out.push({ at: at, title: title, body: body || '', tag: tag || '', url: url || '' }); };
  const client = (id) => S.clients.find((c) => c.id === id);

  // reminders (+ follow-ups until done)
  S.reminders.forEach((r) => {
    if (r.status !== 'pending') return;
    const occs = [alertStart(r)].concat(r.repeat ? L.occurrencesBetween(r, r.due + 1, horizon, 30) : []);
    const c = r.clientId ? client(r.clientId) : null;
    const who = c ? ' · ' + (c.company || c.firstName) : '';
    occs.forEach((t, i) => {
      push(t, r.task + who, 'Reminder from Lucy. Open to mark it done.', 'rem-' + r.id, '#plan');
      if (i === 0) for (let k = 1; k <= st.nagCount; k++) push(t + k * st.nagMin * L.MIN, 'Still pending: ' + r.task, k === st.nagCount ? 'Last nudge, ' + nm + '. Two minutes and it is done.' : 'Tap to open Lucy and finish it.', 'rem-' + r.id, '#plan');
    });
  });

  // salary day
  if (S.employees.some((e) => e.active !== false)) {
    const sd = Number(st.salaryDay) || 1;
    for (let mo = 0; mo < 2; mo++) {
      const base = new Date(now); const y = base.getFullYear(), m = base.getMonth() + mo;
      const day = new Date(y, m, Math.min(sd, new Date(y, m + 1, 0).getDate())).getTime();
      const total = S.employees.filter((e) => e.active !== false).reduce((a, e) => a + (Number(e.salary) || 0), 0);
      push(L.atTime(L.addDays(day, -1), 19, 0), 'Salary day tomorrow', 'Keep ' + L.money(total) + ' ready for ' + S.employees.filter((e) => e.active !== false).length + ' team members.', 'salary', '#more-team');
      push(L.atTime(day, 10, 0), 'Salary day, ' + nm, 'Pay your team today: ' + L.money(total) + '. Open Lucy, Team, to pay each one by UPI.', 'salary', '#more-team');
    }
  }

  // birthdays and anniversaries
  specialSchedule(push, nm);

  // routine, briefing, journal, review, hourly inspiration
  for (let d = 0; d < 7; d++) {
    const day = L.addDays(L.startOfDay(now), d), dk = L.dayKey(day);
    const doneKeys = S.routineLog[dk] || [];
    S.routine.forEach((it) => {
      if (!it.on || doneKeys.includes(it.key)) return;
      const t = hm(it.time);
      push(L.atTime(day, t.h, t.m), it.label, it.ring ? 'Your routine, ' + nm + '. Tap when done.' : L.fmtTime(L.atTime(day, t.h, t.m)) + ' · routine', 'routine-' + it.key, '#plan');
    });
    const b = hm(st.briefTime);
    push(L.atTime(day, b.h, b.m), L.greeting(nm, L.atTime(day, b.h, b.m)), 'Your morning briefing is ready. Open Lucy before you start working.', 'brief', '#home');
    if (st.inspireOn) {
      for (let h = Number(st.inspireStart); h <= Number(st.inspireEnd); h++) {
        const t = L.atTime(day, h, 0);
        const n = inspiration(day, h);
        push(t, n.title, n.body, 'inspire', '#ascend');
      }
    }
    const j = hm(st.journalTime);
    push(L.atTime(day, j.h, j.m), 'Journal time', 'Five calm minutes with ' + C.JOURNAL_QS.length + ' questions about your day.', 'journal', '#ascend');
    if (new Date(day).getDay() === Number(st.reviewDay)) {
      const rv = hm(st.reviewTime);
      push(L.atTime(day, rv.h, rv.m), 'Your weekly review is ready', 'See your week: personal, company, money and ascend.', 'review', '#more-review');
    }
  }

  // receivables and payables
  S.payments.forEach((p) => {
    if (p.status !== 'pending') return;
    const verb = p.type === 'in' ? 'Collect ' + L.money(p.amount) + ' from ' + p.party : 'Pay ' + L.money(p.amount) + ' to ' + p.party;
    const from = p.snoozeUntil || 0;
    const before = L.atTime(L.addDays(p.due, -1), 19, 0);
    if (before >= from) push(before, 'Tomorrow: ' + verb, p.note || 'Heads-up from Lucy', 'pay-' + p.id, '#money');
    for (let i = 0; i < 4; i++) {
      const t = L.atTime(L.addDays(p.due, i), 10, 0);
      if (t >= from) push(t, (i ? 'Overdue ' + i + 'd: ' : 'Today: ') + verb, p.note || (p.type === 'in' ? 'Time to follow up.' : 'Do not let it slip.'), 'pay-' + p.id, '#money');
    }
  });

  // loans and EMIs
  S.loans.forEach((ln) => {
    if (ln.closed) return;
    const due = nextLoanDue(ln, now);
    if (!due) return;
    const amt = L.money(ln.emi || ln.amount || 0);
    const what = ln.type === 'friend' ? 'Pay ' + (ln.lender || 'friend') + ' ' + amt : (ln.title || ln.lender || 'EMI') + ' EMI ' + amt;
    const bank = ln.debitBank ? ' from ' + ln.debitBank : '';
    push(L.atTime(L.addDays(due, -3), 10, 0), 'In 3 days: ' + what, 'Due ' + L.fmtDate(due) + bank + '.', 'loan-' + ln.id, '#money-loans');
    push(L.atTime(L.addDays(due, -1), 19, 0), 'Tomorrow: ' + what, ln.debitBank ? 'Keep ' + amt + ' ready in your ' + ln.debitBank + ' account tonight.' : 'Keep the amount ready.', 'loan-' + ln.id, '#money-loans');
    push(L.atTime(due, 9, 0), 'Today: ' + what, ln.type === 'friend' ? 'Mode: ' + (ln.payMode || 'UPI') + '. Mark it paid in Lucy.' : 'Debit day' + bank + '. Mark it paid in Lucy.', 'loan-' + ln.id, '#money-loans');
  });

  out.sort((a, b) => a.at - b.at);
  return out.slice(0, 550);
}

// next due date (ms, start of day) for a loan
export function nextLoanDue(ln, now) {
  now = now || Date.now();
  if (ln.closed) return null;
  if (ln.type === 'friend' && !ln.emiDay) return ln.dueDate ? L.startOfDay(ln.dueDate) : null;
  const day = Number(ln.emiDay) || 1;
  const d = new Date(now);
  const paidThisMonth = ln.lastPaid && L.dayKey(ln.lastPaid).slice(0, 7) === L.dayKey(now).slice(0, 7);
  let y = d.getFullYear(), m = d.getMonth();
  const mk = (yy, mm) => new Date(yy, mm, Math.min(day, new Date(yy, mm + 1, 0).getDate())).getTime();
  let due = mk(y, m);
  const addedAfterDue = !ln.lastPaid && ln.created && ln.created > due + L.DAY;
  if (paidThisMonth || addedAfterDue || due <L.startOfDay(now) - 3 * L.DAY) { m++; if (m > 11) { m = 0; y++; } due = mk(y, m); }
  return due;
}

function inspiration(day, h) {
  const seed = Math.floor(day / L.DAY) * 31 + h;
  const pick = seed % 4;
  if (pick === 0 || pick === 2) {
    const a = pickAffirmation(seed);
    return { title: 'Affirmation · ' + a.cat, body: a.text + (a.action ? ' Action: ' + a.action : '') };
  }
  if (pick === 1) {
    const dreams = S.dreams.filter((x) => !x.achieved);
    if (dreams.length) {
      const dr = dreams[seed % dreams.length];
      return { title: 'Your dream: ' + dr.title, body: (dr.why ? dr.why + ' ' : '') + 'Every focused hour today brings it closer.' };
    }
    return { title: 'Remember your potential', body: C.POTENTIAL[seed % C.POTENTIAL.length] };
  }
  return { title: 'Lucy', body: C.LINES[seed % C.LINES.length] };
}
