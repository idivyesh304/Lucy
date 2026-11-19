// Builds the list of iPhone notifications for the next 7 days. The helper sends them on time.
import * as MG from './magnet.js';
import { specialSchedule } from './special.js';
import * as L from '../src/logic.js';
import * as C from './content.js';
import { S } from './store.js';
import { pickAffirmation } from './brain.js';
import * as WA from './wa.js';

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
      const waOk = r.waPhone || WA.contactIn(r.task);
      push(t, r.task + who, waOk ? 'Tap for the WhatsApp message Lucy wrote.' : 'Reminder from Lucy. Open to mark it done.', 'rem-' + r.id, waOk ? '#wa-rem-' + r.id : '#plan');
      if (i === 0) for (let k = 1; k <= st.nagCount; k++) push(t + k * st.nagMin * L.MIN, 'Gentle reminder: ' + r.task, k === st.nagCount ? 'A gentle last reminder, ' + nm + '. Whenever you have two minutes.' : 'Just a gentle reminder. Tap when it is done.', 'rem-' + r.id, '#plan');
    });
  });

  // lead follow-ups (CRM): at the time set, and a nudge next morning if still not logged
  (S.leads || []).forEach((l) => {
    if (!l.followUp || ['Won', 'Lost'].includes(l.status)) return;
    const who = l.name + (l.contactName ? ' · ' + l.contactName : '');
    const what = l.nextAction || ('Call or WhatsApp ' + (l.contactName || 'them') + (l.phone ? ' on ' + l.phone : ''));
    push(l.followUp, 'Follow up: ' + who, (l.phone || l.whatsapp) ? what + ' · Tap for the WhatsApp message.' : what, 'lead-' + l.id, (l.phone || l.whatsapp) ? '#wa-lead-' + l.id : '#more-leads');
    push(L.atTime(L.addDays(l.followUp, 1), 10, 15), 'Follow-up for ' + l.name, 'Whenever you get a moment, a quick call or message would keep this lead warm.', 'lead-' + l.id, '#more-leads');
  });

  // money moves: morning push with the most important one
  for (let d = 0; d < 7; d++) {
    const day = L.addDays(L.startOfDay(now), d);
    const mv = MG.moneyMoves()[0];
    push(L.atTime(day, 10, 5), 'Money moves for today', (d === 0 && mv ? 'Suggested first step: ' + mv.title + '. ' : 'Collect, close, upsell, referral and outreach. ') + 'Three small steps today would be wonderful.', 'money-moves', '#ascend-manifest');
  }

  // coach: evening reading nudge and the nightly check-in
  for (let d = 0; d < 7; d++) {
    const day = L.addDays(L.startOfDay(now), d);
    const bk = (S.books || []).find((b) => b.status === 'reading');
    if (bk && !(bk.logs || []).some((x) => L.dayKey(x.at) === L.dayKey(day))) push(L.atTime(day, 21, 0), 'A little reading time', 'Ten pages of ' + bk.title + ' whenever you are ready. I would love to hear one thing you learned.', 'read', '#more-reports');
    push(L.atTime(day, 21, 45), 'Your evening check-in', 'Two quiet minutes with Lucy about your day, whenever it suits you.', 'coach', '#more-reports');
  }

  // office bills: evening before and on the due day, until paid
  (S.office || []).filter((o) => o.active !== false && Number(o.amount) > 0).forEach((o) => {
    for (let mo = 0; mo < 2; mo++) {
      const base = new Date(now), y = base.getFullYear(), m = base.getMonth() + mo;
      const day = new Date(y, m, Math.min(Number(o.dueDay) || 1, new Date(y, m + 1, 0).getDate())).getTime();
      const mk = y + '-' + String((m % 12) + 1).padStart(2, '0');
      const paid = o.paid && o.paid[new Date(day).getFullYear() + '-' + String(new Date(day).getMonth() + 1).padStart(2, '0')];
      const paidAmt = paid ? (paid.parts || []).reduce((a, x) => a + Number(x.amt || 0), 0) : 0;
      if (paidAmt >= Number(o.amount)) continue;
      push(L.atTime(L.addDays(day, -1), 19, 30), o.name + ' due tomorrow', 'Just a heads-up, about ' + L.money(o.amount) + '.', 'office-' + o.id, '#money-expenses');
      push(L.atTime(day, 10, 30), o.name + ' is due today', L.money(Math.max(0, o.amount - paidAmt)) + ' is due today. Tap to mark it paid.', 'office-' + o.id, '#money-expenses');
    }
  });

  // salary days (most of the team on the company day, a few people on their own day)
  const team = S.employees.filter((e) => e.active !== false && !e.past && Number(e.salary) > 0);
  if (team.length) {
    const days = {};
    team.forEach((e) => { const d = Number(e.payDay) || Number(st.salaryDay) || 1; (days[d] = days[d] || []).push(e); });
    for (let mo = 0; mo < 2; mo++) {
      const base = new Date(now); const y = base.getFullYear(), m = base.getMonth() + mo;
      Object.keys(days).forEach((sd) => {
        const list = days[sd], day = new Date(y, m, Math.min(Number(sd), new Date(y, m + 1, 0).getDate())).getTime();
        const total = list.reduce((a, e) => a + (Number(e.salary) || 0), 0), who = list.length === 1 ? list[0].name + '\'s salary' : list.length + ' salaries';
        push(L.atTime(L.addDays(day, -1), 19, 0), 'Salary day tomorrow', 'Just a heads-up: ' + who + ' of ' + L.money(total) + ' tomorrow.', 'salary', '#more-team');
        push(L.atTime(day, 10, 0), 'Salary day today', L.MON[(new Date(day).getMonth() + 11) % 12] + ' ' + who + ' of ' + L.money(total) + ' due today. You can pay from Lucy, Team.', 'salary', '#more-team');
      });
    }
  }

  // birthdays and anniversaries
  specialSchedule(push, nm);

  // routine, briefing, journal, review, hourly inspiration
  for (let d = 0; d < 7; d++) {
    const day = L.addDays(L.startOfDay(now), d), dk = L.dayKey(day);
    const doneKeys = S.routineLog[dk] || [];
    [].forEach((it) => {
      if (!it.on || doneKeys.includes(it.key)) return;
      const t = hm(it.time);
      push(L.atTime(day, t.h, t.m), it.label, it.ring ? 'Your routine, ' + nm + '. Tap when done.' : L.fmtTime(L.atTime(day, t.h, t.m)) + ' · routine', 'routine-' + it.key, '#plan');
    });
    const b = hm(st.briefTime);
    push(L.atTime(day, b.h, b.m), L.greeting(nm, L.atTime(day, b.h, b.m)), 'Your morning briefing is ready whenever you are.', 'brief', '#home');
    if (st.inspireOn) {
      const ra = MG.ritualAffirmation();
      if (ra) {
        push(L.atTime(day, 10, 12), '3-6-9 · morning', 'If you have a moment, say or write it 3 times: ' + ra.text, 'ritual', '#ascend-manifest');
        push(L.atTime(day, 15, 12), '3-6-9 · afternoon', 'Whenever you are free, write it 6 times: ' + ra.text, 'ritual', '#ascend-manifest');
        push(L.atTime(day, 19, 48), '3-6-9 · evening', 'To end the day, write it 9 times: ' + ra.text, 'ritual', '#ascend-manifest');
      }
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
    const left = Math.max(0, Number(p.amount || 0) - (p.parts || []).reduce((a, x) => a + Number(x.amt || 0), 0));
    const verb = p.type === 'in' ? 'Collect ' + L.money(left) + ' from ' + p.party : 'Pay ' + L.money(left) + ' to ' + p.party;
    const from = p.snoozeUntil || 0;
    const before = L.atTime(L.addDays(p.due, -1), 19, 0);
    if (before >= from) push(before, 'Tomorrow: ' + verb, p.note || 'Just a heads-up from Lucy.', 'pay-' + p.id, '#money');
    for (let i = 0; i < 4; i++) {
      const t = L.atTime(L.addDays(p.due, i), 10, 0);
      if (t >= from) push(t, (i ? 'Overdue ' + i + 'd: ' : 'Today: ') + verb, p.type === 'in' ? 'Tap to send the WhatsApp reminder Lucy wrote.' : (p.note || 'Tap to mark it paid when done.'), 'pay-' + p.id, p.type === 'in' ? '#wa-pay-' + p.id : '#money');
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
    push(L.atTime(L.addDays(due, -1), 19, 0), 'Tomorrow: ' + what, ln.debitBank ? 'Just a heads-up to keep ' + amt + ' in your ' + ln.debitBank + ' account.' : 'Just a heads-up for tomorrow.', 'loan-' + ln.id, '#money-loans');
    push(L.atTime(due, 9, 0), 'Today: ' + what, ln.type === 'friend' ? 'Mode: ' + (ln.payMode || 'UPI') + '. You can mark it paid in Lucy.' : 'Debit day' + bank + '. You can mark it paid in Lucy.', 'loan-' + ln.id, '#money-loans');
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
  const pick = seed % 5;
  const mm = MG.magnetAffirmations(), dm = MG.dreamManifestations();
  if (pick === 0 || pick === 3) { const a = mm[seed % mm.length]; return { title: 'Money magnet', body: a.text + ' A small idea for today: ' + a.action }; }
  if (pick === 1 || pick === 4) {
    if (dm.length) { const x = dm[seed % dm.length]; return { title: 'Manifest: ' + x.dream.title, body: (pick === 1 ? x.affirm : x.text) }; }
    return { title: 'Remember your potential', body: C.POTENTIAL[seed % C.POTENTIAL.length] };
  }
  if (pick === 2 && h === 21) { return { title: '3-6-9 · night', body: 'Before you sleep, if you like, write it 9 times: ' + MG.ritualAffirmation().text }; }
  if (pick === 2) { const a = pickAffirmation(seed); return { title: 'Affirmation · ' + a.cat, body: a.text + (a.action ? ' A small idea for today: ' + a.action : '') }; }
  return { title: 'Lucy', body: C.LINES[seed % C.LINES.length] };
}
