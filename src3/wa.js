// WhatsApp messages Lucy writes for you from your own templates. You tap Send in your own WhatsApp.
import { S } from './store.js';
import * as L from '../src/logic.js';

export function digits(phone) {
  let t = String(phone || '').replace(/[^\d+]/g, '');
  if (t.startsWith('+')) return t.slice(1);
  t = t.replace(/^0+/, '');
  return t.length === 10 ? '91' + t : t;
}
export const validPhone = (p) => { const d = digits(p); return d.length >= 11 && d.length <= 13; };
export function waUrl(phone, text) { return 'https://wa.me/' + digits(phone) + '?text=' + encodeURIComponent(text || ''); }

/* ---------------- templates ---------------- */
// Words in {curly brackets} are filled in by Lucy. Edit the rest freely in More → WhatsApp templates.
export const CATS = [
  ['payment', 'Payment reminder'], ['paid', 'Payment received'], ['renewal', 'Renewal'], ['birthday', 'Birthday'], ['anniversary', 'Anniversary'],
  ['followup', 'Lead follow-up'], ['meeting', 'Meeting'], ['proposal', 'Proposal and quote'], ['welcome', 'New client welcome'], ['reminder', 'General reminder'],
  ['salary', 'Team and salary'], ['festival', 'Festival greetings']
];
export const FIELDS = [['{name}', 'their name with ji'], ['{first}', 'first name'], ['{business}', 'business name'], ['{amount}', 'amount'], ['{due}', 'due date'], ['{days}', 'days late'], ['{package}', 'package'], ['{bank}', 'bank details'], ['{date}', 'date'], ['{time}', 'time'], ['{what}', 'what it is about'], ['{years}', 'years'], ['{month}', 'month'], ['{me}', 'your name'], ['{company}', 'DZYN LAB']];
const T = (cat, label, text) => ({ id: cat + ':' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), cat: cat, label: label, text: text });
export const DEFAULT_TEMPLATES = [
  // payment reminders
  T('payment', 'Friendly', 'Hi {name}, hope all is well.\n\nA gentle reminder that {amount} for {package} is due on {due}.\n\n{bank}\n\nPlease share the screenshot once done. Thank you!\n\n{me}\n{company}'),
  T('payment', 'Hinglish', 'Hi {name}, kaise ho?\n\n{package} ka {amount} payment {due} ko due hai. Jab time mile, transfer kar dena.\n\n{bank}\n\nThank you!\n{me}, {company}'),
  T('payment', 'Due today', 'Hi {name},\n\nJust a reminder that {amount} for {package} is due today.\n\n{bank}\n\nPlease share the screenshot once done. Thank you!\n\n{me}\n{company}'),
  T('payment', 'Firm', 'Hello {name},\n\n{amount} for {package} has been pending since {due} ({days} days). Please clear it within 2 days so we can keep your work running on schedule.\n\n{bank}\n\nRegards,\n{me}\n{company}'),
  T('payment', 'Final', 'Hello {name},\n\nThis is a final reminder: {amount} for {package} has been pending since {due}. We will have to pause ongoing work until it is cleared. Please arrange it today.\n\n{bank}\n\nRegards,\n{me}\n{company}'),
  T('payment', 'Balance of part payment', 'Hi {name},\n\nThank you for the part payment. The balance of {amount} for {package} is still pending. Please clear it by {date}.\n\n{bank}\n\nThank you!\n{me}\n{company}'),
  // payment received
  T('paid', 'Thank you', 'Hi {name},\n\nWe have received {amount}. Thank you for the timely payment!\n\nExcited to keep delivering great work for {business}.\n\n{me}\n{company}'),
  T('paid', 'Hinglish', 'Hi {name}, {amount} receive ho gaya. Thank you so much!\n\n{business} ke liye aur bhi strong kaam karenge.\n\n{me}, {company}'),
  // renewals
  T('renewal', 'Friendly', 'Hi {name},\n\nYour monthly plan with {company} renews on {due}. The amount is {amount}.\n\n{bank}\n\nExcited for next month\'s work. Thank you for trusting us!\n\n{me}\n{company}'),
  T('renewal', 'Hinglish', 'Hi {name},\n\nAapka {company} monthly plan {due} ko renew ho raha hai, amount {amount}.\n\n{bank}\n\nNext month aur bhi strong karenge. Thank you!\n{me}'),
  T('renewal', 'With results', 'Hi {name},\n\nThank you for another great month with {business}. Your plan renews on {due} ({amount}).\n\nFor next month, I have a few new ideas to grow your reach further. Shall we discuss them on a quick call?\n\n{bank}\n\n{me}\n{company}'),
  // birthdays
  T('birthday', 'Team', 'Happy birthday, {first}! Thank you for everything you bring to {company}. Have a great day and an even better year ahead. Enjoy today!\n\n{me}'),
  T('birthday', 'Client', 'Dear {name},\n\nWishing you a very happy birthday! May this year bring you great health, happiness and record growth for {business}. It is a privilege to work with you.\n\n{me}\n{company}'),
  T('birthday', 'Family', 'Happy birthday, {first}! Thank you for always being there. Wishing you good health, endless happiness and all the love in the world. Love you!'),
  T('birthday', 'Friend', 'Happy birthday, {first}! Wishing you a fantastic year ahead, full of good health, success and happiness. Have an amazing day!'),
  T('birthday', 'Hinglish', 'Happy birthday {first}! Ye saal tumhare liye health, success aur khushiyon se bhara ho. Aaj full enjoy karo!'),
  // anniversaries
  T('anniversary', 'Warm', 'Happy anniversary, {first}! {years}Wishing you both a lifetime of love, laughter and many more wonderful years together.'),
  T('anniversary', 'Client', 'Dear {name},\n\nWarm wishes on your anniversary. May the years ahead bring you both even more happiness.\n\n{me}\n{company}'),
  T('anniversary', 'Hinglish', 'Happy anniversary {first}! Aise hi pyaar aur khushi se bhare rahe. Bahut saari shubhkamnayein!'),
  // lead follow-ups
  T('followup', 'After first talk', 'Hi {name}, this is {me} from {company}.\n\nFollowing up on our conversation about {what} for {business}. Would a quick 10-minute call today or tomorrow work for you?'),
  T('followup', 'Hinglish', 'Hi {name}, {me} here from {company}.\n\n{business} ke {what} ke baare mein follow-up kar raha tha. Aaj ya kal 10 minute ka call ho sakta hai?'),
  T('followup', 'Value idea', 'Hi {name},\n\nI had one idea for {business} that I think can bring you more customers this month. Can I share it on a quick call?\n\n{me}, {company}'),
  T('followup', 'After proposal', 'Hi {name},\n\nJust checking if you had a chance to go through the proposal for {business}. Happy to explain anything or adjust it to your budget. When can we discuss?\n\n{me}\n{company}'),
  T('followup', 'Last try', 'Hi {name},\n\nI have tried to reach you a few times about {what}. If now is not the right time, no problem at all. Just let me know and I will check back in a few months.\n\n{me}, {company}'),
  // meetings
  T('meeting', 'Ask for a time', 'Hi {name}, {me} here from {company}.\n\nCan we meet to discuss {what}? Please share a time that suits you this week, or I can suggest {date} at {time}.'),
  T('meeting', 'Confirm', 'Hi {name},\n\nConfirming our meeting on {date} at {time} to discuss {what}.\n\nSee you then!\n{me}\n{company}'),
  T('meeting', 'Video call', 'Hi {name},\n\nCan we do a quick video call on {date} at {time} for {what}? I will send the link just before we start.\n\n{me}\n{company}'),
  T('meeting', 'Reminder before', 'Hi {name}, a quick reminder about our meeting today at {time} for {what}. See you soon!\n\n{me}'),
  T('meeting', 'Reschedule', 'Hi {name},\n\nSorry, something urgent came up. Can we move our meeting about {what} to {date} at {time}? Let me know if that works.\n\n{me}\n{company}'),
  T('meeting', 'Hinglish', 'Hi {name}, {me} here, {company}.\n\n{what} ke liye {date} ko {time} baje mil sakte hain? Aapko kab convenient rahega?'),
  // proposals
  T('proposal', 'Proposal sent', 'Hi {name},\n\nAs discussed, I am sharing the proposal for {business}: {what}. Investment: {amount} per month.\n\nHappy to walk you through it on a call. When suits you?\n\n{me}\n{company}'),
  T('proposal', 'Quote', 'Hi {name},\n\nHere is the quote for {what}: {amount}.\n\nTo begin, we take a 50% advance and start work within 2 working days.\n\n{bank}\n\n{me}\n{company}'),
  // welcome
  T('welcome', 'Welcome', 'Hi {name},\n\nWelcome to {company}! Thank you for trusting us with {business}.\n\nOur team will share the content calendar soon, and you can reach me here any time.\n\nLet us build something great together.\n{me}'),
  // general reminders
  T('reminder', 'General', 'Hi {name}, {me} here from {company}.\n\nRegarding: {what}.\n\nPlease let me know a convenient time. Thank you!'),
  T('reminder', 'Hinglish', 'Hi {name}, {me} here, {company}.\n\n{what} ke baare mein. Aapko kab convenient rahega? Thank you!'),
  T('reminder', 'Documents needed', 'Hi {name},\n\nFor {what}, we need a few things from your side (photos, logo files or approvals). Can you please share them by {date}?\n\nThank you!\n{me}\n{company}'),
  // team
  T('salary', 'Salary credited', 'Hi {first},\n\nYour salary of {amount} for {month} has been credited. Thank you for your hard work this month!\n\n{me}'),
  T('salary', 'Team update', 'Hi {first},\n\nQuick update: {what}.\n\n{me}'),
  // festivals
  T('festival', 'Diwali', 'Wishing you and your family a very happy Diwali, {first}! May this festival bring light, prosperity and success to you and {business}.\n\n{me}\n{company}'),
  T('festival', 'New Year', 'Happy New Year, {first}! Thank you for being part of our journey. Wishing you a year of growth, health and happiness.\n\n{me}\n{company}'),
  T('festival', 'General', 'Warm wishes to you and your family on this festival, {first}! May it bring joy and prosperity.\n\n{me}\n{company}')
];
export function templates(cat) {
  const own = (S.waTemplates || []).filter((t) => !t.removed);
  const ownIds = new Set((S.waTemplates || []).map((t) => t.id));
  const all = DEFAULT_TEMPLATES.filter((t) => !ownIds.has(t.id)).concat(own);
  return cat ? all.filter((t) => t.cat === cat) : all;
}

/* ---------------- bank accounts ---------------- */
export const DEFAULT_BANKS = [
  { id: 'dzyn', label: 'DZYN LAB PRIVATE LIMITED', holder: 'DZYN LAB PRIVATE LIMITED', bank: '', acc: '', ifsc: '', branch: '', upi: '' },
  { id: 'divyesh', label: 'Divyesh Umesh Panchal', holder: 'Divyesh Umesh Panchal', bank: '', acc: '', ifsc: '', branch: '', upi: '' },
  { id: 'devanshi', label: 'Devanshi Kansara', holder: 'Devanshi Kansara', bank: '', acc: '', ifsc: '', branch: '', upi: '' }
];
export function banks() {
  const list = (S.banks && S.banks.length ? S.banks : DEFAULT_BANKS).map((b) => Object.assign({}, b));
  const p = S.profile || {};
  // your profile already holds the company and personal accounts; use them where the WhatsApp copy is empty
  const from = { dzyn: { holder: p.cbHolder, bank: p.cbBank, acc: p.cbAcc, ifsc: p.cbIfsc, branch: p.cbBranch, upi: p.cbUpi }, divyesh: { holder: p.pbHolder, bank: p.pbBank, acc: p.pbAcc, ifsc: p.pbIfsc, upi: p.pbUpi } };
  list.forEach((b) => { const f = from[b.id]; if (f) Object.keys(f).forEach((k) => { if (!String(b[k] || '').trim() && f[k]) b[k] = f[k]; }); });
  return list;
}
export function bankText(id) {
  if (!id || id === 'none') return '';
  const b = banks().find((x) => x.id === id);
  if (!b) return '';
  const rows = [['Account name', b.holder], ['Bank', b.bank], ['A/c no', b.acc], ['IFSC', b.ifsc], ['Branch', b.branch], ['UPI', b.upi]].filter((r) => String(r[1] || '').trim());
  return rows.length > 1 ? 'Payment details:\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n') : '';
}
export const defaultBank = () => S.settings.defaultBank || 'dzyn';

/* ---------------- filling a template ---------------- */
const me = () => (S.profile && (S.profile.nickname || S.profile.fullName)) || S.settings.name || 'Divyesh';
const first = (n) => String(n || '').trim().replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').split(/\s+/)[0] || '';
const money = (n) => L.money(Math.round(Number(n) || 0));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// dates in messages are always written out ("Thu 19 Nov"), never "Today"
const dstr = (t) => { if (!t) return ''; const d = new Date(t); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };
export function fill(text, ctx) {
  const c = Object.assign({ me: me(), company: 'DZYN LAB', name: 'Sir', first: '', business: '', amount: '', due: '', days: '', package: 'our services', bank: '', date: '', time: '', what: 'this', years: '', month: MONTHS[new Date().getMonth()] }, ctx || {});
  let out = String(text || '').replace(/\{(\w+)\}/g, (m, k) => (c[k] != null ? String(c[k]) : m));
  return out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
const hiName = (person) => { const dr = String(person || '').match(/^dr\.?\s+(\S+)/i); if (dr) return 'Dr. ' + dr[1]; const f = first(person); return f ? f + ' ji' : 'Sir'; };

/* ---------------- what Lucy knows for each kind of message ---------------- */
function clientOf(p) { return p && p.clientId ? S.clients.find((c) => c.id === p.clientId) : null; }
const left = (p) => Math.max(0, Number(p.amount || 0) - (p.parts || []).reduce((a, x) => a + Number(x.amt || 0), 0));
const personOfClient = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : '');

export function forPayment(p) {
  const c = clientOf(p), person = personOfClient(c);
  const today = L.startOfDay(Date.now()), due = L.startOfDay(p.due || Date.now()), d = Math.round((today - due) / L.DAY);
  const part = left(p) < Number(p.amount || 0);
  const pick = part ? 'Balance of part payment' : d >= 10 ? 'Final' : d >= 3 ? 'Firm' : d === 0 ? 'Due today' : 'Friendly';
  return { cats: ['payment', 'paid'], pick: 'payment:' + pick.toLowerCase().replace(/[^a-z0-9]+/g, '-'), to: person || (c && c.company) || p.party, phone: (c && (c.phone || c.personalPhone)) || p.phone || '', bank: (c && c.payTo) || p.payTo || defaultBank(),
    ctx: { name: hiName(person), first: first(person) || 'Sir', business: (c && c.company) || p.party, amount: money(left(p)), due: dstr(p.due), days: Math.max(0, d), package: p.note || (c && c.pkg) || 'our services', date: dstr(L.addDays(Math.max(today, due), 2)) } };
}
export function forClient(c, cat) {
  const person = personOfClient(c);
  return { cats: cat ? [cat] : ['renewal', 'meeting', 'paid', 'welcome', 'proposal', 'festival', 'birthday', 'anniversary', 'reminder'], pick: cat ? null : 'renewal:friendly', to: person || c.company, phone: c.phone || c.personalPhone || '', bank: c.payTo || defaultBank(),
    ctx: { name: hiName(person), first: first(person) || 'Sir', business: c.company || person, amount: money(Math.round(Number(c.retainer || c.amount || 0) * (1 + (Number(c.gstRate) || 0) / 100))) + (Number(c.gstRate) ? ' (incl. ' + c.gstRate + '% GST)' : ''), due: c.nextDate ? dstr(c.nextDate) : '', package: c.pkg || 'our services', what: c.pkg || 'your work', date: dstr(L.addDays(L.startOfDay(Date.now()), 1)), time: '11:00 AM' } };
}
export function forSpecial(sd) {
  const rel = String(sd.relation || '').toLowerCase();
  const team = /team/.test(rel), client = /client|business/.test(rel), family = /mom|mum|mother|dad|papa|father|wife|husband|brother|sister|bhai|ben|son|daughter|uncle|aunt|mama|masi|kaka|kaki|family|cousin|grand/.test(rel);
  const yrs = sd.year ? new Date().getFullYear() - Number(sd.year) : 0;
  const cat = sd.type === 'Anniversary' ? 'anniversary' : sd.type === 'Other' ? 'festival' : 'birthday';
  const pick = cat === 'festival' ? 'festival:general' : cat === 'anniversary' ? (client ? 'anniversary:client' : 'anniversary:warm') : team ? 'birthday:team' : client ? 'birthday:client' : family ? 'birthday:family' : 'birthday:friend';
  const both = sd.name2 ? first(sd.name) + ' and ' + first(sd.name2) : first(sd.name);
  const recipients = [{ label: first(sd.name) || sd.name, phone: sd.phone || '' }].concat(sd.name2 || sd.phone2 ? [{ label: first(sd.name2) || 'Second number', phone: sd.phone2 || '' }] : []);
  return { cats: cat === 'festival' ? ['festival'] : [cat, 'festival'], pick: sd.wish ? 'own-text' : pick, ownText: sd.wish || '', recipients: recipients.filter((r) => r.phone).length > 1 ? recipients : null,
    to: sd.type === 'Other' ? sd.name : sd.name + (sd.name2 ? ' and ' + sd.name2 : ''), phone: sd.phone || sd.phone2 || '', bank: '',
    ctx: { name: sd.name2 ? both : hiName(sd.name), first: both || 'there', business: 'your business', years: yrs > 0 && cat === 'anniversary' ? yrs + ' beautiful years together. ' : '' } };
}
export function forLead(l) {
  const svc = (l.services || []).slice(0, 2).join(' and ') || 'your marketing';
  const pick = l.status === 'Proposal' || l.status === 'Negotiation' ? 'followup:after-proposal' : l.status === 'Meeting' ? 'meeting:confirm' : 'followup:after-first-talk';
  const t = l.followUp && l.followUp > Date.now() ? l.followUp : L.atTime(L.addDays(L.startOfDay(Date.now()), 1), 11, 0);
  return { cats: ['followup', 'meeting', 'proposal', 'festival'], pick: pick, to: l.contactName || l.name, phone: l.whatsapp || l.phone || '', bank: defaultBank(),
    ctx: { name: hiName(l.contactName), first: first(l.contactName) || 'Sir', business: l.name, what: svc, amount: money(l.dealMonthly || l.dealOnce), date: dstr(t), time: L.fmtTime(t) } };
}
export function forEmployee(e) {
  const mk = L.dayKey(Date.now()).slice(0, 7);
  return { cats: ['salary', 'birthday', 'festival', 'meeting', 'reminder'], pick: 'salary:salary-credited', to: e.name, phone: e.phone || '', bank: '',
    ctx: { name: first(e.name), first: first(e.name), business: 'DZYN LAB', amount: money(e.salary), month: MONTHS[Number(mk.slice(5, 7)) - 1], what: 'this week\'s work', date: dstr(L.addDays(L.startOfDay(Date.now()), 1)), time: '11:00 AM' } };
}

// contacts known to Lucy, used to find the person a reminder is about
export function contacts() {
  const out = [];
  S.clients.forEach((c) => { const nm = personOfClient(c); if (c.phone) out.push({ name: nm || c.company, alt: [c.company, nm], phone: c.phone, business: c.company }); });
  S.leads.forEach((l) => { if (l.phone || l.whatsapp) out.push({ name: l.contactName || l.name, alt: [l.name, l.contactName], phone: l.whatsapp || l.phone, business: l.name }); });
  S.employees.forEach((e) => { if (e.phone) out.push({ name: e.name, alt: [e.name], phone: e.phone, business: 'DZYN LAB' }); });
  S.specialDays.forEach((s) => { if (s.phone) out.push({ name: s.name, alt: [s.name], phone: s.phone, business: '' }); });
  return out;
}
export function contactIn(text) {
  const t = String(text || '').toLowerCase();
  let best = null;
  contacts().forEach((c) => c.alt.filter(Boolean).forEach((a) => {
    const words = String(a).toLowerCase().split(/[\s\-,.()]+/).filter((w) => w.length >= 4 && !['client', 'studio', 'private', 'limited', 'jewellers', 'jewels', 'facelift'].includes(w));
    const hit = words.filter((w) => t.includes(w)).length;
    if (hit && (!best || hit > best.hit)) best = { hit: hit, c: c };
  }));
  return best ? best.c : null;
}
export function forReminder(r) {
  const c = contactIn(r.task), t = String(r.task || '').trim();
  const mr = t.match(/\b(Mr|Mrs|Ms|Dr)\.?\s+([A-Z][a-zA-Z]+)/);
  const m = t.match(/^(?:call|remind|message|msg|whatsapp|ping|text|ask|follow up with|followup|meet|meeting with)\b.*?\b(?:to|for|about|regarding)\s+(.+)$/i);
  const meet = /\b(meet|meeting|video call|zoom|google meet|call)\b/i.test(t);
  let what = (m ? m[1] : t).replace(/\.$/, '');
  if (meet) what = what.replace(/^(set up|setup|schedule|fix|arrange|do|have)\s+(a\s+)?(quick\s+)?(video call|meeting|call|zoom call|meet)\s+(for|about|regarding|on|to discuss)\s+/i, '');
  const due = r.due || Date.now();
  return { cats: meet ? ['meeting', 'reminder', 'followup'] : ['reminder', 'meeting', 'followup'], pick: meet ? (/video/i.test(t) ? 'meeting:video-call' : 'meeting:ask-for-a-time') : 'reminder:general',
    to: c ? c.name : (r.waTo || (mr ? mr[0] : '')), phone: c ? c.phone : (r.waPhone || ''), bank: '',
    ctx: { name: c ? hiName(c.name) : mr ? mr[2] + ' ji' : 'Sir', first: c ? first(c.name) : mr ? mr[2] : '', business: c ? c.business : '', what: what, date: dstr(L.addDays(L.startOfDay(due), due < Date.now() ? 1 : 0)), time: L.fmtTime(due) } };
}

export function sentRecently(kind, ref, days) {
  return (S.waLog || []).some((x) => x.kind === kind && String(x.ref) === String(ref) && Date.now() - x.at < (days || 1) * L.DAY);
}
