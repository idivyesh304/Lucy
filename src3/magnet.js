// Money Magnet: strong, personal affirmations + manifestations built from Divyesh's own dreams.
import { S } from './store.js';
import * as L from '../src/logic.js';

const nm = () => (S.settings.name || '').trim() || 'Divyesh';
const lakh = (n) => { n = Number(n) || 0; return n >= 1e7 ? '₹' + (n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, '') + ' crore' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(n % 1e5 ? 1 : 0).replace(/\.0$/, '') + ' lakh' : L.money(n); };

// Identity-level money affirmations: present tense, specific, felt in the body, each tied to an action.
export const MONEY_MAGNET = [
  { id: 'mm1', text: 'I am the kind of man money trusts. It comes to me, it stays with me, and it multiplies under my care.', action: 'Open your bank app and look at it with pride, not fear.' },
  { id: 'mm2', text: 'TARGET a month is not a dream for me. It is my minimum standard, and DZYN LAB is rising to meet it.', action: 'Write today\'s revenue gap and one move that closes part of it.' },
  { id: 'mm3', text: 'Every no I hear today is clearing the road to the clients who will pay me lakhs.', action: 'Make the one sales call you have been avoiding.' },
  { id: 'mm4', text: 'My name is becoming a brand that brands pay for.', action: 'Post one piece of work under your own name today.' },
  { id: 'mm5', text: 'I do not chase money. I create value so big that money follows me.', action: 'Add one extra deliverable that wows your best client.' },
  { id: 'mm6', text: 'I receive money with gratitude and pride. I never apologise for my price again.', action: 'Send one quote today without any discount.' },
  { id: 'mm7', text: 'My income grows faster than my expenses, every single month, without exception.', action: 'Check this month\'s collected versus expenses in Lucy.' },
  { id: 'mm8', text: 'I am building generational wealth. My parents see it, my wife feels it, and my children will inherit it.', action: 'Put aside a fixed amount for savings or SIP today.' },
  { id: 'mm9', text: 'Clients who pay on time, refer others and stay for years are finding me right now.', action: 'Ask one happy client for a referral.' },
  { id: 'mm10', text: 'One idea from my mind is worth more than a month of someone else\'s effort, and I charge like it.', action: 'Raise the price on your next proposal.' },
  { id: 'mm11', text: 'Lakhs are moving towards DZYN LAB\'s account right now, from directions I have not even imagined yet.', action: 'Follow up on every pending receivable today.' },
  { id: 'mm12', text: 'I am rich in skill, rich in vision, and becoming rich in money. All three are mine.', action: 'Learn one thing today that makes your work more valuable.' },
  { id: 'mm13', text: 'When I walk into a meeting, the room feels my value before I say a word.', action: 'Dress and prepare for your next meeting like a crorepati.' },
  { id: 'mm14', text: 'My first crore is coming. I can already see the number on my screen.', action: 'Write the date you will see ₹1 crore in your account.' },
  { id: 'mm15', text: 'Money loves speed. I act fast, follow up fast, and I get paid fast.', action: 'Reply to every pending client message within the hour.' },
  { id: 'mm16', text: 'I am becoming the richest man in my family\'s history, and the story has only started.', action: 'Do the highest-value task first today.' },
  { id: 'mm17', text: 'My bank balance is the scoreboard of the value I create, and today I score.', action: 'Close or collect one payment before 6 PM.' },
  { id: 'mm18', text: 'Wealth is drawn to clarity. I know exactly what I want, and it knows exactly where to find me.', action: 'Re-read your dreams in Lucy once, slowly.' },
  { id: 'mm19', text: 'I release every old fear about money. I am safe, I am provided for, and I am rising.', action: 'Clear one small debt or EMI worry by planning it today.' },
  { id: 'mm20', text: 'I deserve to be paid at the level of my dreams, not the level of my past.', action: 'Pitch one client from your Premium tier today.' },
  { id: 'mm21', text: 'Every client I serve today becomes a channel of money, referrals and respect in my life.', action: 'Over-deliver for one client today.' },
  { id: 'mm22', text: 'I think like a crorepati, decide like a crorepati, and work until my bank account agrees.', action: 'Make one decision today the way your future self would.' },
  { id: 'mm23', text: 'Money is coming to me in increasing amounts, from multiple sources, continuously.', action: 'List one new income source you can start this month.' },
  { id: 'mm24', text: 'My films will earn crores, and my agency will fund them. Both are already in motion.', action: 'Spend 20 minutes on your film idea tonight.' },
  { id: 'mm25', text: 'I am grateful for every rupee that came today, and I make space for ten more.', action: 'Write down one payment you are grateful for.' },
  { id: 'mm26', text: 'Premium brands are searching for exactly what DZYN LAB does. Today, one of them finds us.', action: 'Send one cold message to a premium brand.' },
  { id: 'mm27', text: 'I am a money magnet. Opportunities stick to me because I show up every single day.', action: 'Complete today\'s 3-6-9 ritual in Lucy.' },
  { id: 'mm28', text: 'Rich is my identity, not my goal. I am simply catching up to who I already am.', action: 'Walk, talk and decide like that man today.' }
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
export function magnetAffirmations() {
  const target = lakh(S.settings.revenueTarget || 1500000);
  return MONEY_MAGNET.map((a) => ({ id: a.id, cat: 'Money Magnet', text: a.text.replace('TARGET', target), action: a.action }));
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
  const out = ds.map((d) => 'Thank you for my ' + d.title + '. It is already on its way to me.');
  out.push('Thank you for ' + lakh(S.settings.revenueTarget || 1500000) + ' a month flowing into DZYN LAB.');
  if (out.length < 3) out.push('Thank you for clients who respect my work and pay with joy.', 'Thank you for my health, my family and my unstoppable mind.');
  return out.slice(0, 5);
}
