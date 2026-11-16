// Money Magnet: strong, personal affirmations + manifestations built from Divyesh's own dreams.
import { S } from './store.js';
import * as L from '../src/logic.js';

const nm = () => (S.settings.name || '').trim() || 'Divyesh';
const lakh = (n) => { n = Number(n) || 0; return n >= 1e7 ? '₹' + (n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, '') + ' crore' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(n % 1e5 ? 1 : 0).replace(/\.0$/, '') + ' lakh' : L.money(n); };

// Money Magnet. Honest principle: affirmations change how you act; actions bring the money.
// So every affirmation is specific to DZYN LAB, spoken as a fact, and paired with a money action for today.
export const MONEY_MAGNET = [
  // identity
  { id: 'id1', cat: 'Identity', text: 'I am the owner of a TARGET-a-month agency. I make decisions today the way that man makes them.', action: 'Before every decision today, ask: what would the TARGET-a-month version of me do?' },
  { id: 'id2', cat: 'Identity', text: 'Money comes to me because I solve expensive problems for businesses, and I solve them well.', action: 'Write down the most expensive problem one client has right now, and offer to solve it.' },
  { id: 'id3', cat: 'Identity', text: 'I am a creative director who thinks like a businessman. Art gets attention, business gets paid, and I do both.', action: 'Put a revenue number next to your next creative idea.' },
  { id: 'id4', cat: 'Identity', text: 'I am comfortable with big numbers. Lakhs do not scare me, they excite me.', action: 'Say your monthly target out loud three times, calmly, like a fact.' },
  // value and pricing
  { id: 'pr1', cat: 'Value', text: 'My price is a filter, not a barrier. The right clients pay it happily and the wrong ones leave.', action: 'Send your next quote at full price. No discount, no apology.' },
  { id: 'pr2', cat: 'Value', text: 'I sell results, not reels. Clients pay me for more customers, more enquiries and a stronger name.', action: 'In your next pitch, lead with the result the client wants, then the deliverables.' },
  { id: 'pr3', cat: 'Value', text: 'Every year of my experience is inside every frame I deliver, and my price reflects it.', action: 'Raise the price of your next new proposal by 10 to 20 percent.' },
  { id: 'pr4', cat: 'Value', text: 'Discounts are for businesses without confidence. DZYN LAB adds value, it does not cut price.', action: 'If a client asks for less, offer fewer deliverables, not a lower rate.' },
  // sales
  { id: 'sa1', cat: 'Sales', text: 'Every follow-up I send is money moving closer to my account.', action: 'Follow up with every lead whose date has passed. Today, not tomorrow.' },
  { id: 'sa2', cat: 'Sales', text: 'Selling is serving. When I pitch, I am offering a business owner the growth they are praying for.', action: 'Pitch one new business today, by call, visit or WhatsApp.' },
  { id: 'sa3', cat: 'Sales', text: 'I am not afraid of no. Every no is one step closer to the yes that pays me for years.', action: 'Make the one call you have been avoiding.' },
  { id: 'sa4', cat: 'Sales', text: 'My best clients come from my happy clients. Referrals flow to me because my work speaks.', action: 'Ask one happy client: who else do you know who needs this?' },
  { id: 'sa5', cat: 'Sales', text: 'I fill my pipeline every week, so I never sell from fear.', action: 'Add three new leads from your target industries in Lucy.' },
  { id: 'sa6', cat: 'Sales', text: 'Premium clients are looking for exactly what DZYN LAB does. Today I make it easy for one of them to find us.', action: 'Post one result or behind-the-scenes clip under your own name.' },
  // collection
  { id: 'co1', cat: 'Collection', text: 'I get paid on time because I ask on time. Collecting my money is respect for my work.', action: 'Send a polite payment reminder to every client with a pending amount.' },
  { id: 'co2', cat: 'Collection', text: 'Money that is owed to me comes home. I ask clearly, I ask early, and I am paid in full.', action: 'Collect the oldest pending payment before 6 PM.' },
  { id: 'co3', cat: 'Collection', text: 'No work starts without an advance. My cash flow is protected, always.', action: 'Make sure every new job this month has an advance before work starts.' },
  // receiving and abundance
  { id: 'rc1', cat: 'Receiving', text: 'I receive money with gratitude and without guilt. Every rupee I earn is earned honestly.', action: 'When the next payment comes in, stop for ten seconds and say thank you.' },
  { id: 'rc2', cat: 'Receiving', text: 'Money is coming to DZYN LAB from clients I have, clients I will meet, and ideas I have not had yet.', action: 'Write one new income idea in Lucy Ideas today.' },
  { id: 'rc3', cat: 'Receiving', text: 'There is more than enough business in Ahmedabad and beyond. My share is growing every month.', action: 'Look at one new industry you can serve and find three businesses in it.' },
  // wealth building
  { id: 'we1', cat: 'Wealth', text: 'I keep a part of every rupee I earn. Wealth is what I keep, not what I make.', action: 'Move a fixed amount to savings or SIP the day money comes in.' },
  { id: 'we2', cat: 'Wealth', text: 'My income grows faster than my expenses, every single month.', action: 'Check this month\'s collected versus costs in Lucy, and cut one cost that does not pay back.' },
  { id: 'we3', cat: 'Wealth', text: 'I am building wealth that my parents are proud of and my children will inherit.', action: 'Spend 10 minutes planning one investment or saving goal.' },
  // scale
  { id: 'sc1', cat: 'Scale', text: 'My team multiplies my time. The more I delegate, the more I earn.', action: 'Hand one task you do every week to your team today.' },
  { id: 'sc2', cat: 'Scale', text: 'DZYN LAB runs on systems, so growth does not depend on me doing everything.', action: 'Write a one-page checklist for one task your team repeats.' },
  { id: 'sc3', cat: 'Scale', text: 'I am CLIENTSNEED clients away from TARGET a month, and I add them one conversation at a time.', action: 'Book one meeting with a potential client this week.' },
  // gratitude
  { id: 'gr1', cat: 'Gratitude', text: 'Thank you for every client who trusted DZYN LAB this month. I will serve them so well they never leave.', action: 'Send one client a short thank-you message today, with no ask.' },
  { id: 'gr2', cat: 'Gratitude', text: 'I am grateful for the money that came today, and I make space for much more.', action: 'Note one payment you are grateful for in Lucy\'s journal.' }
];

// Dream-specific affirmation and manifestation, written as already done.
function dreamLines(d) {
  const t = String(d.title).replace(/^(my|the|a)\s+/i, ''), amt = Number(d.target) ? lakh(d.target) : '', by = d.targetDate ? new Date(d.targetDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
  const why = d.why ? ' ' + d.why.replace(/\.?$/, '.') : '';
  const T = {
    Car: [`My ${t} is mine, paid in full. I feel the steering in my hands, I hear the engine, and I drive it with pride.`, `I park my ${t} outside the DZYN LAB office. People look twice. My team smiles. I earned every bit of it with my work.`],
    Home: [`My ${t} is home now. Spacious, calm, full of light, fully paid for. My family feels safe and proud inside it.`, `I open the main door of my ${t}. My parents walk in first. My wife chooses the colours. Everything we prayed for is real.`],
    Watch: [`The ${t} sits on my wrist. Every time I check the time, I remember: my time is worth this and much more.`, `I fasten the ${t} before an important meeting. It feels heavy, precise and earned.`],
    Gold: [`Gold keeps building in my family's locker. ${t}. Real wealth that stays for generations.`, `I place the ${t} in my mother's hands and watch her face. That moment is already mine.`],
    Office: [`My ${t} is alive with my team. Clients walk in and feel premium before we say a word.`, `I walk into my ${t} in the morning. Every desk is full, every screen is busy, and every client is paying.`],
    Vacation: [`I am on my ${t}, fully paid, phone on silent. DZYN LAB runs perfectly without me.`, `The view from my ${t} is in front of me. My wife laughs beside me. No money worry anywhere in my mind.`],
    Phone: [`My new ${t} is in my hand, bought in full, and it makes my work faster and sharper.`, `I unbox the ${t} and set it up. It feels like a small reward for a big month.`],
    Laptop: [`My ${t} is on my desk, bought in full. My edits fly and my ideas move faster than ever.`, `I open the ${t} and start my next big project. The tools match the size of my ambition now.`],
    'Bank balance': [`My bank balance reads ${t}. I open the app, I smile, and I feel completely calm about money.`, `I check my account and see ${t}. Bills are paid, savings are growing, and I am free.`],
    Film: [`My ${/film|movie/i.test(t) ? t : 'film ' + t} is in theatres. My name appears as director. The audience claps. This is my destiny.`, `I sit in the dark at the premiere of my ${/film|movie/i.test(t) ? t : 'film ' + t}. The first scene lights up the screen, and every risk I took was worth it.`],
    Other: [`${t} is mine. I can see it, feel it, and I give thanks for it as if it has already arrived.`, `I hold ${t} in my life today. It arrived because I kept showing up.`]
  }[d.cat] || [`${t} is mine. I can see it, feel it, and I give thanks for it as if it has already arrived.`, `I hold ${t} in my life today. It arrived because I kept showing up.`];
  const money = amt ? ` The ${amt} it needs is already flowing to me.` : '';
  const date = by ? ` It is mine by ${by}.` : '';
  return { affirm: T[0] + money + date, manifest: T[1] + why };
}

export function dreamAffirmations() {
  return S.dreams.filter((d) => !d.achieved).map((d) => {
    const l = dreamLines(d);
    return { id: 'dr' + d.id, cat: 'Dream', text: l.affirm, action: Number(d.target) ? 'Move something towards ' + d.title + ' today, even ₹500.' : 'Look at your ' + d.title + ' photo for 30 seconds and feel it is yours.', dream: d };
  });
}
export function dreamManifestations() {
  return S.dreams.filter((d) => !d.achieved).map((d) => ({ dream: d, text: dreamLines(d).manifest, affirm: dreamLines(d).affirm }));
}
function fill(t) {
  const target = lakh(S.settings.revenueTarget || 1500000);
  const tiers = ((S.growth || {}).tiers || []).filter((x) => Number(x.price) > 0);
  const avg = tiers.length ? tiers.reduce((a, x) => a + Number(x.price), 0) / tiers.length : 35000;
  const active = S.clients.filter((c) => !c.past && c.active !== false);
  const mrr = active.reduce((a, c) => a + (c.billing === 'once' ? 0 : Number(c.retainer || c.amount || 0)), 0);
  const need = Math.max(1, Math.ceil(Math.max(0, (S.settings.revenueTarget || 1500000) - mrr) / avg));
  return String(t).split('TARGET').join(target).split('CLIENTSNEED').join(String(need));
}
export function magnetAffirmations() {
  return MONEY_MAGNET.map((a) => ({ id: a.id, cat: 'Money Magnet', sub: a.cat, text: fill(a.text), action: fill(a.action) }));
}

/* ---------------- Money moves: the part of the magnet that actually brings money ---------------- */
const DAYK = (t) => L.dayKey(t);
const nmC = (c) => (c && (c.company || [c.firstName, c.lastName].filter(Boolean).join(' '))) || 'a client';
function paidSoFar(p) { return (p.parts && p.parts.length ? p.parts : p.status === 'settled' ? [{ amt: p.amount }] : []).reduce((a, x) => a + Number(x.amt || 0), 0); }
export function moneyMoves() {
  const now = Date.now(), today = L.startOfDay(now), done = (S.moneyMoves || {})[DAYK(now)] || {};
  const moves = [];
  // 1. collect
  const pend = S.payments.filter((p) => p.type === 'in' && p.status === 'pending' && p.due < L.addDays(today, 4)).map((p) => ({ p: p, left: Math.max(0, Number(p.amount || 0) - paidSoFar(p)) })).filter((x) => x.left > 0).sort((a, b) => a.p.due - b.p.due);
  if (pend.length) { const x = pend[0], late = Math.floor((today - L.startOfDay(x.p.due)) / L.DAY); moves.push({ key: 'collect', cat: 'Collect', title: 'Collect ' + L.money(x.left) + ' from ' + x.p.party, why: late > 0 ? late + ' days late. Money owed to you is the fastest money you can get.' : late === 0 ? 'Due today. Send the reminder in the morning, not the evening.' : 'Due in ' + (-late) + ' days. A friendly heads-up now means you get paid on time.', amt: x.left, hash: '#money', more: pend.length > 1 ? pend.length - 1 + ' more pending' : '' }); }
  else { const ren = S.clients.filter((c) => !c.past && c.active !== false && c.billing !== 'once' && c.nextDate).sort((a, b) => a.nextDate - b.nextDate)[0];
    moves.push(ren ? { key: 'collect', cat: 'Collect', title: 'Confirm ' + nmC(ren) + '\'s renewal of ' + L.money(ren.retainer || ren.amount), why: 'Renews ' + L.fmtDate(ren.nextDate) + '. Send the invoice early so it is paid on the day.', hash: '#more-clients' } : { key: 'collect', cat: 'Collect', title: 'Ask for an advance on your next job', why: 'No work starts without an advance. That is how cash flow stays healthy.' }); }
  // 2. close
  const open = S.leads.filter((l) => !['Won', 'Lost'].includes(l.status));
  const hot = open.slice().sort((a, b) => ((a.followUp && a.followUp < L.addDays(today, 1)) ? 0 : 1) - ((b.followUp && b.followUp < L.addDays(today, 1)) ? 0 : 1) || ({ Hot: 0, Warm: 1, Cold: 2 }[a.temp] || 1) - ({ Hot: 0, Warm: 1, Cold: 2 }[b.temp] || 1) || (Number(b.dealMonthly || 0) - Number(a.dealMonthly || 0)))[0];
  if (hot) moves.push({ key: 'close', cat: 'Close', title: (hot.nextAction ? hot.nextAction + ' · ' : 'Call ') + hot.name, why: [Number(hot.dealMonthly) ? L.money(hot.dealMonthly) + ' a month on the table' : '', hot.status, hot.followUp && hot.followUp < today ? 'follow-up overdue' : ''].filter(Boolean).join(' · ') + '.', amt: Number(hot.dealMonthly || 0), hash: '#more-leads' });
  else moves.push({ key: 'close', cat: 'Prospect', title: 'Add 3 new leads from your target industries', why: 'Your pipeline is empty. No leads today means no clients next month.', hash: '#more-leads' });
  // 3. upsell
  const tiers = ((S.growth || {}).tiers || []).map((x) => Number(x.price)).filter(Boolean).sort((a, b) => a - b);
  const act = S.clients.filter((c) => !c.past && c.active !== false && c.billing !== 'once');
  const up = act.map((c) => ({ c: c, cur: Number(c.retainer || c.amount || 0) })).map((x) => ({ c: x.c, cur: x.cur, next: tiers.find((t) => t > x.cur) })).filter((x) => x.next).sort((a, b) => a.cur - b.cur)[(new Date(now).getDate()) % Math.max(1, act.length)] || null;
  if (up) moves.push({ key: 'upsell', cat: 'Upsell', title: 'Offer ' + nmC(up.c) + ' an upgrade to ' + L.money(up.next), why: 'From ' + L.money(up.cur) + ' a month. Add Meta ads, extra reels or a shoot day. Upgrading a happy client is the easiest money in an agency.', amt: up.next - up.cur, hash: '#more-clients' });
  else moves.push({ key: 'upsell', cat: 'Upsell', title: 'Offer one client an add-on this month', why: 'A shoot day, Meta ads or a website. Existing clients already trust you.' });
  // 4. referral
  const ref = act.slice().sort((a, b) => (a.created || 0) - (b.created || 0))[(new Date(now).getDate() + 1) % Math.max(1, act.length)];
  moves.push({ key: 'referral', cat: 'Referral', title: ref ? 'Ask ' + nmC(ref) + ' for one referral' : 'Ask one happy client or friend for a referral', why: 'Referred clients close faster, pay better and stay longer. Just ask: who else do you know who needs this?' });
  // 5. visibility (alternates with outreach)
  const ind = ['dental clinics', 'cafes', 'jewellers', 'real estate developers', 'skin clinics', 'car detailing studios', 'interior designers'][Math.floor(today / L.DAY) % 7];
  moves.push(Math.floor(today / L.DAY) % 2 ? { key: 'visible', cat: 'Visibility', title: 'Post one result or behind-the-scenes under your name', why: 'People buy from the face they see. Your work is your best salesman.' } : { key: 'visible', cat: 'Outreach', title: 'Send 5 messages to ' + ind + ' in Ahmedabad', why: 'Short, personal, with one idea for their business. Five today becomes one client this month.' });
  moves.forEach((m) => { m.done = !!done[m.key]; });
  return moves;
}
export function moneyStats() {
  const log = S.moneyMoves || {}, now = Date.now();
  let streak = 0;
  for (let i = 0; i < 400; i++) { const k = DAYK(L.addDays(L.startOfDay(now), -i)); const n = Object.keys(log[k] || {}).length; if (n >= 3) streak++; else if (i > 0) break; }
  const m = DAYK(now).slice(0, 7);
  const monthMoves = Object.keys(log).filter((k) => k.startsWith(m)).reduce((a, k) => a + Object.keys(log[k]).length, 0);
  const received = S.payments.filter((p) => p.type === 'in').reduce((a, p) => a + (p.parts && p.parts.length ? p.parts : p.status === 'settled' ? [{ amt: p.amount, at: p.settledAt || p.due }] : []).filter((x) => DAYK(x.at) === DAYK(now)).reduce((b, x) => b + Number(x.amt || 0), 0), 0);
  return { streak: streak, monthMoves: monthMoves, today: Object.keys(log[DAYK(now)] || {}).length, receivedToday: received };
}


// One affirmation per day for the 3-6-9 ritual (3 times morning, 6 afternoon, 9 night).
export function ritualAffirmation() {
  const pool = magnetAffirmations().concat(dreamAffirmations());
  const d = Math.floor(L.startOfDay(Date.now()) / L.DAY);
  return pool[d % pool.length];
}

// Scripting: a future day, written in the present tense, built from your target and dreams.
export function futureScript() {
  const p = S.profile || {}, name = p.fullName || nm();
  const date = new Date(); date.setFullYear(date.getFullYear() + 1);
  const ds = S.dreams.filter((d) => !d.achieved);
  const pick = (cat) => { const d = ds.find((x) => x.cat === cat); return d ? Object.assign({}, d, { title: String(d.title).replace(/^(my|the|a)\s+/i, '') }) : null; };
  const lines = [`Today is ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. I am ${name}, and I am living the life I once only imagined.`];
  lines.push(`This month DZYN LAB collected ${lakh(S.settings.revenueTarget || 1500000)}, and it felt normal. Clients pay on time, my team is full, and premium brands come to us first.`);
  const car = pick('Car'), home = pick('Home'), watch = pick('Watch'), office = pick('Office'), vac = pick('Vacation'), film = pick('Film'), bank = pick('Bank balance'), gold = pick('Gold');
  if (home) lines.push(`I woke up in my ${home.title}. Morning light, silence, my family close.`);
  if (watch) lines.push(`I put on my ${watch.title}.`);
  if (car) lines.push(`I drove to work in my ${car.title}, music on, completely at peace.`);
  if (office) lines.push(`I walked into my ${office.title}. Every desk busy, every client happy.`);
  if (bank) lines.push(`I checked my account: ${bank.title}. I smiled and closed the app.`);
  if (gold) lines.push(`Our family's gold keeps growing: ${gold.title}.`);
  if (vac) lines.push(`Next week I leave for my ${vac.title}, fully paid, business running without me.`);
  if (film) lines.push(`In the evening I worked on my ${/film|movie/i.test(film.title) ? film.title : 'film, ' + film.title}. Directing is no longer a dream. It is my schedule.`);
  ds.filter((d) => !['Home', 'Watch', 'Car', 'Office', 'Bank balance', 'Gold', 'Vacation', 'Film'].includes(d.cat)).slice(0, 3).forEach((d) => lines.push(`${d.title} is part of my life now.`));
  if (!film && !ds.length) lines.push('In the evening I worked on my first film. Directing is no longer a dream. It is my schedule.');
  lines.push('I am grateful. I earned all of this, one focused day at a time, and the best is still ahead.');
  return lines.join(' ');
}

export function gratitudeInAdvance() {
  const ds = S.dreams.filter((d) => !d.achieved).slice(0, 4);
  const got = moneyStats().receivedToday;
  const out = (got ? ['Thank you for the ' + L.money(got) + ' that came to DZYN LAB today. I receive it with gratitude, and I make space for more.'] : []).concat(ds.map((d) => 'Thank you for my ' + d.title + '. It is already on its way to me.'));
  out.push('Thank you for ' + lakh(S.settings.revenueTarget || 1500000) + ' a month flowing into DZYN LAB.');
  if (out.length < 3) out.push('Thank you for clients who respect my work and pay with joy.', 'Thank you for my health, my family and my unstoppable mind.');
  return out.slice(0, 5);
}
