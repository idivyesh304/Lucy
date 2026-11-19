// WhatsApp messages Lucy writes for you. You tap Send in your own WhatsApp.
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

const me = () => (S.profile && (S.profile.nickname || S.profile.fullName)) || S.settings.name || 'Divyesh';
const co = () => 'DZYN LAB';
const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const money = (n) => L.money(Math.round(Number(n) || 0));
const payLine = () => { const p = S.profile || {}; return [p.upi ? 'UPI: ' + p.upi : '', p.bank ? p.bank : ''].filter(Boolean).join('\n'); };

function clientOf(p) { return p && p.clientId ? S.clients.find((c) => c.id === p.clientId) : null; }
function personFor(p) {
  const c = clientOf(p);
  const person = c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : '';
  return { name: person || '', biz: (c && c.company) || p.party, phone: (c && (c.phone || c.personalPhone)) || p.phone || '' };
}
const left = (p) => Math.max(0, Number(p.amount || 0) - (p.parts || []).reduce((a, x) => a + Number(x.amt || 0), 0));

// Payment reminder: the tone follows how late it is. You can switch tone before sending.
export function paymentMessages(p) {
  const who = personFor(p), hi = who.name ? first(who.name) + ' ji' : 'Sir';
  const amt = money(left(p)), part = left(p) < Number(p.amount || 0);
  const forWhat = p.note ? ' for ' + p.note : (clientOf(p) && clientOf(p).pkg ? ' for ' + clientOf(p).pkg : '');
  const today = L.startOfDay(Date.now()), due = L.startOfDay(p.due || Date.now()), d = Math.round((today - due) / L.DAY);
  const when = d < 0 ? 'due on ' + L.fmtDate(p.due) : d === 0 ? 'due today' : 'pending since ' + L.fmtDate(p.due);
  const pay = payLine();
  const v = [
    { label: 'Friendly', text: 'Hi ' + hi + ', hope all is well.\n\nA gentle reminder that ' + (part ? 'the balance of ' : '') + amt + forWhat + ' is ' + when + '.' + (pay ? '\n\n' + pay : '') + '\n\nPlease share the screenshot once done. Thank you!\n\n' + me() + '\n' + co() },
    { label: 'Hinglish', text: 'Hi ' + hi + ', kaise ho?\n\n' + (part ? 'Balance ' : '') + amt + forWhat + ' ka payment ' + (d < 0 ? L.fmtDate(p.due) + ' ko due hai' : d === 0 ? 'aaj due hai' : L.fmtDate(p.due) + ' se pending hai') + '. Jab time mile, transfer kar dena.' + (pay ? '\n\n' + pay : '') + '\n\nThank you!\n' + me() + ', ' + co() },
    { label: 'Firm', text: 'Hello ' + hi + ',\n\n' + amt + forWhat + ' is ' + when + (d > 0 ? ' (' + d + ' days)' : '') + '. Please clear it by ' + L.fmtDate(L.addDays(Math.max(today, due), d > 0 ? 2 : 1)) + ' so we can keep your work running on schedule.' + (pay ? '\n\n' + pay : '') + '\n\nRegards,\n' + me() + '\n' + co() },
    { label: 'Final', text: 'Hello ' + hi + ',\n\nThis is a final reminder: ' + amt + forWhat + ' has been pending since ' + L.fmtDate(p.due) + '. We will have to pause ongoing work until it is cleared. Please arrange it today.' + (pay ? '\n\n' + pay : '') + '\n\nRegards,\n' + me() + '\n' + co() }
  ];
  const pick = d >= 10 ? 3 : d >= 3 ? 2 : 0;
  return { to: who.name || who.biz, phone: who.phone, variants: v, pick: pick };
}

// Renewal heads-up a few days before a monthly client renews
export function renewalMessages(c) {
  const hi = c.firstName ? first(c.firstName) + ' ji' : 'Sir';
  const amt = money(c.retainer || c.amount), pay = payLine();
  return { to: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company, phone: c.phone || c.personalPhone || '', pick: 0, variants: [
    { label: 'Friendly', text: 'Hi ' + hi + ',\n\nYour monthly plan with DZYN LAB' + (c.pkg ? ' (' + c.pkg + ')' : '') + ' renews on ' + L.fmtDate(c.nextDate) + '. The amount is ' + amt + '.' + (pay ? '\n\n' + pay : '') + '\n\nExcited for next month\'s work. Thank you for trusting us!\n\n' + me() + '\n' + co() },
    { label: 'Hinglish', text: 'Hi ' + hi + ',\n\nAapka DZYN LAB monthly plan' + (c.pkg ? ' (' + c.pkg + ')' : '') + ' ' + L.fmtDate(c.nextDate) + ' ko renew ho raha hai, amount ' + amt + '.' + (pay ? '\n\n' + pay : '') + '\n\nNext month aur bhi strong karenge. Thank you!\n' + me() }
  ] };
}

// Birthday and anniversary wishes, written for who they are to you
export function wishMessages(sd) {
  const n = first(sd.name), rel = String(sd.relation || '').toLowerCase();
  const team = /team/.test(rel), client = /client|business/.test(rel), family = /mom|mum|mother|dad|papa|father|wife|husband|brother|sister|bhai|ben|son|daughter|uncle|aunt|mama|masi|kaka|kaki|family|cousin|grand/.test(rel);
  const yrs = sd.year ? new Date().getFullYear() - Number(sd.year) : 0;
  if (sd.type === 'Anniversary') {
    return { to: sd.name, phone: sd.phone || '', pick: 0, variants: [
      { label: 'Warm', text: 'Happy anniversary, ' + n + '! ' + (yrs > 0 ? yrs + ' beautiful years together. ' : '') + 'Wishing you both a lifetime of love, laughter and many more wonderful years.' },
      { label: 'Hinglish', text: 'Happy anniversary ' + n + '! ' + (yrs > 0 ? yrs + ' saal ' : '') + 'aise hi pyaar aur khushi se bhare rahe. Bahut saari shubhkamnayein!' },
      { label: 'Formal', text: 'Dear ' + n + ',\n\nWarm wishes on your anniversary. May the years ahead bring you both even more happiness.\n\n' + me() + ', ' + co() }
    ] };
  }
  const v = team ? [
    { label: 'Team', text: 'Happy birthday, ' + n + '! Thank you for everything you bring to DZYN LAB. Have a great day and an even better year ahead. Enjoy today!\n\n' + me() },
    { label: 'Hinglish', text: 'Happy birthday ' + n + '! Team ka strong pillar ho tum. Aaj full enjoy karo, aur ye saal tumhara best saal ho!\n\n' + me() }
  ] : client ? [
    { label: 'Client', text: 'Dear ' + n + ',\n\nWishing you a very happy birthday! May this year bring you great health, happiness and record growth for your business. It is a privilege to work with you.\n\n' + me() + '\n' + co() },
    { label: 'Hinglish', text: 'Happy birthday ' + n + ' ji! Aapka ye saal health, khushi aur business growth se bhara rahe. Aapke saath kaam karna hamesha khushi ki baat hai.\n\n' + me() + ', ' + co() }
  ] : family ? [
    { label: 'Family', text: 'Happy birthday, ' + n + '! Thank you for always being there. Wishing you good health, endless happiness and all the love in the world. Love you!' },
    { label: 'Hinglish', text: 'Happy birthday ' + n + '! Hamesha aise hi healthy aur khush raho. Love you!' }
  ] : [
    { label: 'Warm', text: 'Happy birthday, ' + n + '! Wishing you a fantastic year ahead, full of good health, success and happiness. Have an amazing day!' },
    { label: 'Hinglish', text: 'Happy birthday ' + n + '! Ye saal tumhare liye success aur khushiyon se bhara ho. Party kab hai?' }
  ];
  return { to: sd.name, phone: sd.phone || '', pick: 0, variants: v };
}

// Lead follow-up
export function leadMessages(l) {
  const n = l.contactName ? first(l.contactName) + ' ji' : 'Sir';
  const svc = (l.services || []).slice(0, 2).join(' and ') || 'your marketing';
  return { to: l.contactName || l.name, phone: l.whatsapp || l.phone || '', pick: 0, variants: [
    { label: 'Follow-up', text: 'Hi ' + n + ', this is ' + me() + ' from DZYN LAB.\n\nFollowing up on our conversation about ' + svc + ' for ' + l.name + '. ' + (l.nextAction ? l.nextAction + '. ' : '') + 'Would a quick 10-minute call today or tomorrow work for you?' },
    { label: 'Hinglish', text: 'Hi ' + n + ', ' + me() + ' here from DZYN LAB.\n\n' + l.name + ' ke ' + svc + ' ke baare mein follow-up kar raha tha. Aaj ya kal 10 minute ka call ho sakta hai?' },
    { label: 'Value', text: 'Hi ' + n + ',\n\nI had one idea for ' + l.name + ' that I think can bring you more customers this month. Can I share it on a quick call?\n\n' + me() + ', DZYN LAB' }
  ] };
}

// Any reminder that involves a person (finds the contact from your clients, leads, team and special days)
export function contacts() {
  const out = [];
  S.clients.forEach((c) => { const nm = [c.firstName, c.lastName].filter(Boolean).join(' '); if (c.phone) out.push({ name: nm || c.company, alt: [c.company, nm], phone: c.phone }); });
  S.leads.forEach((l) => { if (l.phone || l.whatsapp) out.push({ name: l.contactName || l.name, alt: [l.name, l.contactName], phone: l.whatsapp || l.phone }); });
  S.employees.forEach((e) => { if (e.phone) out.push({ name: e.name, alt: [e.name], phone: e.phone }); });
  S.specialDays.forEach((s) => { if (s.phone) out.push({ name: s.name, alt: [s.name], phone: s.phone }); });
  return out;
}
export function contactIn(text) {
  const t = String(text || '').toLowerCase();
  let best = null;
  contacts().forEach((c) => c.alt.filter(Boolean).forEach((a) => {
    const words = String(a).toLowerCase().split(/[\s\-,.()]+/).filter((w) => w.length >= 4 && !['client', 'studio', 'private', 'limited', 'jewellers', 'jewels'].includes(w));
    const hit = words.filter((w) => t.includes(w)).length;
    if (hit && (!best || hit > best.hit)) best = { hit: hit, c: c };
  }));
  return best ? best.c : null;
}
export function reminderMessages(r) {
  const c = contactIn(r.task);
  const t = String(r.task || '').trim();
  const mr = t.match(/\b(Mr|Mrs|Ms|Dr)\.?\s+([A-Z][a-zA-Z]+)/);
  const n = c ? first(c.name) + ' ji' : mr ? mr[2] + ' ji' : '';
  // "Call Mr. Ravi (DPR) to set up a video call" -> "set up a video call"
  const m = t.match(/^(?:call|remind|message|msg|whatsapp|ping|text|ask|follow up with|followup)\b.*?\b(?:to|for|about|regarding)\s+(.+)$/i);
  const what = m ? m[1].replace(/\.$/, '') : '';
  return { to: c ? c.name : (r.waTo || (mr ? mr[0] : '')), phone: c ? c.phone : (r.waPhone || ''), pick: 0, variants: [
    { label: 'Message', text: 'Hi' + (n ? ' ' + n : '') + ', ' + me() + ' here from DZYN LAB.\n\n' + (what ? 'Can we ' + what + '? ' : 'Regarding: ' + t.replace(/\.$/, '') + '. ') + 'Please let me know a convenient time.\n\nThank you!' },
    { label: 'Hinglish', text: 'Hi' + (n ? ' ' + n : '') + ', ' + me() + ' here, DZYN LAB.\n\n' + (what ? what.charAt(0).toUpperCase() + what.slice(1) + ' ke liye' : t.replace(/\.$/, '') + ' ke baare mein') + ' aapko kab convenient rahega?\n\nThank you!' }
  ] };
}

export function sentRecently(kind, ref, days) {
  return (S.waLog || []).some((x) => x.kind === kind && String(x.ref) === String(ref) && Date.now() - x.at < (days || 1) * L.DAY);
}
