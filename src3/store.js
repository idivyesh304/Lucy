// Lucy state: one object, saved on the phone and synced to Google Drive through the helper.
import * as C from './content.js';

export const OFFICE_PRESET = [['Rent', 'Office rent'], ['Light bill', 'Electricity bill', true], ['Internet', 'Internet'], ['AI subscriptions', 'AI subscriptions'], ['Adobe', 'Adobe Pro subscription'], ['Cleaner', 'Office cleaner'], ['Drinking water', 'Drinking water supplier', true], ['Other', 'Other office expense', true]];
export const KEY = 'lucy.v3';
const listeners = [];
export function onSave(fn) { listeners.push(fn); }

export function defaults() {
  return {
    v: 3, updatedAt: 0, seq: 1, onboarded: false,
    settings: {
      name: 'Divyesh', revenueTarget: 1500000, vision: C.DEFAULT_VISION.slice(),
      briefTime: '08:30', journalTime: '22:00', reviewDay: 0, reviewTime: '19:00',
      inspireOn: true, inspireStart: 10, inspireEnd: 20,
      speak: true, voiceURI: '', voiceRate: 0.95, voicePitch: 1.0, autoSpeakReplies: true,
      provider: 'claude', salaryDay: 1, nagCount: 2, nagMin: 15, avatarImg: '',
      business: { minRetainer: 25000, minMargin: 35, maxDiscount: 10, minMonths: 3, paymentTerms: '50% advance, balance before delivery. Retainers billed monthly in advance.',
        costs: { reel: 0, post: 0, shoot: 0, ads: 0, website: 0 } },
      hunter: { industries: 'Jewellery brands, jewellers, cosmetic and dental clinics, doctors, fashion and lifestyle brands', city: 'Ahmedabad', minBudget: 30000,
        services: 'Content production, reels, photography, branding, social media management, performance marketing' }
    },
    routine: C.ROUTINE_DEFAULT.map((r) => ({ key: r.key, icon: r.icon, label: r.label, time: r.time, on: true, ring: !!r.ring, speak: true })),
    routineLog: {}, reminders: [], clients: [], payments: [], loans: [], expenses: [], dreams: [],
    affirm: { done: {}, custom: [], spoken: {} }, mission: {}, leads: [], ideas: [], notes: [], shopping: [], learning: [],
    journal: {}, chat: [], log: [], celebrated: {}, manifest: {},
    specialDays: [], employees: [], office: [],
    growth: {
      tiers: [{ name: 'Premium', price: 50000, count: 15 }, { name: 'Growth', price: 30000, count: 15 }, { name: 'Starter', price: 25000, count: 15 }],
      team: [{ role: 'Video editor', need: 4, have: 0, salary: 0 }, { role: 'Graphic designer', need: 3, have: 0, salary: 0 }, { role: 'Marketing / sales', need: 2, have: 0, salary: 0 },
        { role: 'Photographer & videographer', need: 1, have: 0, salary: 0 }, { role: 'Social media manager', need: 1, have: 0, salary: 0 }, { role: 'Company manager', need: 1, have: 0, salary: 0 }, { role: 'AI artist', need: 1, have: 0, salary: 0 }]
    },
    profile: { photo: '', fullName: 'Divyesh Umesh Panchal', nickname: 'Divyesh', dob: '', anniversary: '', spouse: '', phone: '+91 99789 92233', altPhone: '', email: 'dzynlabpvtltd@gmail.com',
      city: 'Ahmedabad', address: '', company: 'DZYN LAB PRIVATE LIMITED', role: 'Director & CEO', website: 'www.dzynlabpvtltd.com',
      officeAddress: '5th Floor, Titanium Business Park, A-513, Near Railway Under Bridge, Makarba, Ahmedabad, Gujarat 380051', instagram: '', linkedin: '', youtube: '',
      bloodGroup: '', emergencyName: '', emergencyPhone: '', about: '' }
  };
}

export let S = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) return migrate(d);
  } catch (e) { console.error(e); }
  return migrate({ v: 3 });
}

// accepts Lucy v1, v2 or v3 data
export function migrate(d) {
  const base = defaults();
  if (!d || typeof d !== 'object') return base;
  const out = Object.assign(base, d);
  out.settings = Object.assign(defaults().settings, d.settings || {});
  out.settings.business = Object.assign(defaults().settings.business, (d.settings || {}).business || {});
  out.settings.business.costs = Object.assign(defaults().settings.business.costs, ((d.settings || {}).business || {}).costs || {});
  out.settings.hunter = Object.assign(defaults().settings.hunter, (d.settings || {}).hunter || {});
  if (!d.v || d.v < 3) {
    // from v1/v2
    out.reminders = (d.reminders || []).filter((r) => !String(r.repeat || '').startsWith('every:') && r.task !== 'Gym time');
    out.ideas = d.v === 2 ? (d.ideas || []) : (d.notes || []).map((n) => ({ id: n.id, text: n.text, scope: 'company', created: n.created }));
    out.notes = d.v === 2 ? (d.notes || []) : [];
    out.clients = (d.clients || []).map((c) => Object.assign({ firstName: '', lastName: '', company: c.name || '', personalPhone: c.phone || '', retainer: 0, active: true }, c));
    out.routine = Array.isArray(d.routine) && d.routine.length ? d.routine.map((r) => {
      const def = C.ROUTINE_DEFAULT.find((x) => x.key === r.key);
      return { key: r.key, icon: def ? def.icon : 'clock', label: r.label, time: r.time, on: r.on !== false, ring: !!r.ring, speak: r.speak !== false };
    }) : base.routine;
    out.journal = d.journal || {};
    out.v = 3;
  }
  out.profile = Object.assign(defaults().profile, d.profile || {});
  if (!out.manifest || typeof out.manifest !== 'object') out.manifest = {};
  // Office expenses: add the standard items once (never removes or changes existing ones)
  if (!out.officeSeeded) {
    out.office = Array.isArray(d.office) ? d.office : [];
    OFFICE_PRESET.forEach(([cat, name, variable]) => { if (!out.office.some((o) => o.cat === cat)) out.office.push({ id: 'of-' + cat.toLowerCase().replace(/[^a-z]+/g, '-'), cat: cat, name: name, amount: 0, dueDay: 5, variable: !!variable, paid: {}, note: '' }); });
    out.officeSeeded = true;
  }
  if (!out.growth || !Array.isArray(out.growth.tiers)) out.growth = defaults().growth;
  if (!out.growthAI) { if (!out.growth.team.some((m) => /ai artist/i.test(m.role))) out.growth.team.push({ role: 'AI artist', need: 1, have: 0, salary: 0 }); out.growthAI = true; }
  // Nov 2026: Divyesh set his monthly target to Rs 15 lakh (was Rs 25 lakh)
  if (!out.targetSet15) {
    if (Number(out.settings.revenueTarget) === 2500000) out.settings.revenueTarget = 1500000;
    out.settings.vision = (out.settings.vision || []).map((v) => String(v).replace(/₹\s?25 lakh monthly revenue/, '₹15 lakh monthly revenue'));
    out.targetSet15 = true;
  }
  ['reminders', 'clients', 'payments', 'loans', 'expenses', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning', 'chat', 'log', 'specialDays', 'employees', 'office']
    .forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
  out.affirm = Object.assign({ done: {}, custom: [], spoken: {} }, d.affirm || {});
  return out;
}

export function replaceState(d) {
  S = migrate(d);
  persist();
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.error('save failed', e); }
}
// local=true: do not mark as a user change (no sync)
export function save(opts) {
  opts = opts || {};
  if (!opts.local) S.updatedAt = Date.now();
  persist();
  if (!opts.local) listeners.forEach((fn) => { try { fn(opts); } catch (e) { console.error(e); } });
}
export function nid() { return S.seq++; }
export function logEvent(kind, extra) {
  S.log.push(Object.assign({ t: Date.now(), kind: kind }, extra || {}));
  if (S.log.length > 4000) S.log = S.log.slice(-3500);
}

// per-device settings that never sync (passkey, helper address)
export const device = {
  get(k, d) { try { const v = localStorage.getItem('lucy.dev.' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { if (v == null || v === '') localStorage.removeItem('lucy.dev.' + k); else localStorage.setItem('lucy.dev.' + k, v); } catch (e) {} }
};

export const view = {
  tab: 'home', sub: null, id: null, seg: {}, filter: 'All', q: '', chatBusy: false
};

/* ---------------- Safe sync helpers ---------------- */
const ARR_KEYS = ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning', 'office', 'chat', 'log'];
const MAP_KEYS = ['journal', 'manifest', 'routineLog', 'mission', 'celebrated'];
export function records(d) {
  if (!d || typeof d !== 'object') return 0;
  let n = 0;
  ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning'].forEach((k) => { if (Array.isArray(d[k])) n += d[k].length; });
  (d.office || []).forEach((o) => { if (Number(o.amount)) n++; Object.values(o.paid || {}).forEach((x) => { n += ((x && x.parts) || []).length; }); });
  (d.payments || []).forEach((p) => { n += (p.parts || []).length; });
  return n;
}
const partKey = (x) => (x && (x.at + ':' + x.amt)) || JSON.stringify(x);
function mergeParts(a, b) { const m = new Map(); (a || []).concat(b || []).forEach((x) => m.set(partKey(x), x)); return [...m.values()].sort((x, y) => (x.at || 0) - (y.at || 0)); }
function mergePaidMaps(a, b) {
  const out = Object.assign({}, a || {});
  Object.keys(b || {}).forEach((k) => {
    const x = out[k], y = b[k];
    if (x && y && typeof x === 'object' && typeof y === 'object') out[k] = Object.assign({}, x, y, { parts: mergeParts(x.parts, y.parts) });
    else out[k] = y || x;
  });
  return out;
}
function mergeItem(older, newer) {
  const m = Object.assign({}, older, newer);
  // never let an empty value from one copy wipe a real value from the other
  Object.keys(older).forEach((k) => { const v = newer[k]; if ((v === undefined || v === null || v === '' || v === 0) && older[k] !== undefined && older[k] !== null && older[k] !== '' && older[k] !== 0) m[k] = older[k]; });
  if (older.parts || newer.parts) m.parts = mergeParts(older.parts, newer.parts);
  if ((older.paid && typeof older.paid === 'object') || (newer.paid && typeof newer.paid === 'object')) {
    if (typeof older.paid === 'object' && typeof newer.paid === 'object') m.paid = mergePaidMaps(older.paid, newer.paid);
  }
  return m;
}
// Combine two copies of Lucy's data without losing anything either side added.
export function mergeStates(a, b) {
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a, older = newer === b ? a : b;
  const out = JSON.parse(JSON.stringify(newer));
  ARR_KEYS.forEach((k) => {
    const map = new Map(), order = [];
    (older[k] || []).forEach((x) => { const id = x && x.id != null ? 'i' + x.id : 'o' + order.length + JSON.stringify(x).slice(0, 40); map.set(id, x); order.push(id); });
    (newer[k] || []).forEach((x) => { const id = x && x.id != null ? 'i' + x.id : 'n' + order.length + JSON.stringify(x).slice(0, 40); if (map.has(id)) map.set(id, mergeItem(map.get(id), x)); else { map.set(id, x); order.push(id); } });
    out[k] = order.map((id) => map.get(id));
  });
  MAP_KEYS.forEach((k) => { out[k] = Object.assign({}, older[k] || {}, newer[k] || {}); });
  out.affirm = Object.assign({}, older.affirm || {}, newer.affirm || {});
  ['done', 'spoken'].forEach((k) => { out.affirm[k] = Object.assign({}, (older.affirm || {})[k] || {}, (newer.affirm || {})[k] || {}); });
  const ids = (out.affirm.custom || []).map((x) => x.id);
  out.affirm.custom = (out.affirm.custom || []).concat(((older.affirm || {}).custom || []).filter((x) => !ids.includes(x.id)));
  out.seq = Math.max(Number(a.seq) || 0, Number(b.seq) || 0);
  if ((out.chat || []).length > 80) out.chat = out.chat.slice(-80);
  if ((out.log || []).length > 3000) out.log = out.log.slice(-3000);
  return out;
}
// Keep the last few copies of this device's data before anything replaces it.
export function keepSafetyCopy(reason) {
  try {
    if (!records(S)) return;
    const list = JSON.parse(localStorage.getItem('lucy.safety') || '[]');
    list.unshift({ at: Date.now(), reason: reason || '', data: JSON.stringify(S) });
    localStorage.setItem('lucy.safety', JSON.stringify(list.slice(0, 3)));
  } catch (e) { /* storage full: skip */ }
}
export function safetyCopies() { try { return JSON.parse(localStorage.getItem('lucy.safety') || '[]'); } catch (e) { return []; } }
