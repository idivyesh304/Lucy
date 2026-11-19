// My details: everything Divyesh may need to share, in one place, ready to copy or send.
import { S } from './store.js';

// [key, label, kind, secret]  kind decides the check and the keyboard; secret ones are hidden on screen until tapped
export const SECTIONS = [
  { id: 'personal', title: 'Personal', fields: [
    ['firstName', 'First name'], ['middleName', 'Middle name'], ['surname', 'Surname'], ['petName', 'Pet name'], ['nickname', 'Short name (what Lucy calls you)'],
    ['dob', 'Birthday', 'date'], ['phonePersonal', 'Personal contact', 'phone'], ['phone', 'Work contact', 'phone'], ['emailPersonal', 'Personal email', 'email']] },
  { id: 'ids', title: 'Government IDs', fields: [
    ['aadhaar', 'Aadhaar card number', 'aadhaar', 1], ['pan', 'PAN card number', 'pan', 1], ['voterId', 'Voter ID number', 'voter', 1],
    ['passport', 'Passport number', 'passport', 1], ['drivingLicence', 'Driving licence number', 'dl', 1], ['eShram', 'e-Shram card number', 'eshram', 1]] },
  { id: 'pbank', title: 'Personal bank account', fields: [
    ['pbBank', 'Bank name'], ['pbHolder', 'Account holder name'], ['pbAcc', 'Account number', 'acc', 1], ['pbType', 'Account type'],
    ['pbIfsc', 'IFSC code', 'ifsc'], ['pbUpi', 'UPI ID', 'upi'], ['pbCrn', 'CRN number', 'digits', 1], ['pbAddress', 'Branch address', 'long']] },
  { id: 'medical', title: 'Medical and emergency', fields: [
    ['bloodGroup', 'Blood group'], ['medicalHistory', 'Medical history', 'long'],
    ['emergency1Name', 'Emergency contact 1'], ['emergency1Phone', 'Emergency contact 1 phone', 'phone'],
    ['emergency2Name', 'Emergency contact 2'], ['emergency2Phone', 'Emergency contact 2 phone', 'phone']] },
  { id: 'family', title: 'Family', fields: [
    ['motherName', 'Mother\'s name'], ['motherPhone', 'Mother\'s contact', 'phone'], ['fatherName', 'Father\'s name'], ['fatherPhone', 'Father\'s contact', 'phone'],
    ['spouseName', 'Spouse\'s name'], ['spousePhone', 'Spouse\'s personal contact', 'phone'], ['spouseWorkPhone', 'Spouse\'s work contact', 'phone']] },
  { id: 'home', title: 'Home', fields: [['address', 'Home address', 'long'], ['city', 'City']] },
  { id: 'company', title: 'Company', fields: [
    ['company', 'Company name'], ['role', 'Your role'], ['companySince', 'Company opening date', 'date'], ['officeAddress', 'Company address', 'long'],
    ['emailGeneral', 'General email', 'email'], ['email', 'Legal email', 'email'], ['website', 'Website']] },
  { id: 'cids', title: 'Company registration', fields: [
    ['gst', 'GST number', 'gst'], ['cin', 'CIN number', 'cin'], ['companyPan', 'Company PAN', 'pan', 1], ['tan', 'TAN number', 'tan', 1]] },
  { id: 'cbank', title: 'Company bank account', fields: [
    ['cbBank', 'Bank name'], ['cbHolder', 'Account holder name'], ['cbBranch', 'Branch name'], ['cbAcc', 'Account number', 'acc', 1], ['cbType', 'Account type'],
    ['cbIfsc', 'IFSC code', 'ifsc'], ['cbUpi', 'UPI ID', 'upi'], ['cbAddress', 'Branch address', 'long']] },
  { id: 'social', title: 'Social', fields: [['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube']] }
];
export const fieldOf = (key) => { for (const s of SECTIONS) for (const f of s.fields) if (f[0] === key) return { section: s, key: f[0], label: f[1], kind: f[2] || 'text', secret: !!f[3] }; return null; };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function display(key, v) {
  const f = fieldOf(key); if (!f || !v) return v || '';
  if (f.kind === 'date') { const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1]; }
  return String(v);
}
export function masked(key, v) {
  const s = String(v || ''); if (!s) return '';
  const keep = s.replace(/\s/g, '').slice(-4);
  return '•••• ' + keep;
}

// tidy up what was typed: capitals for IDs, standard spacing for Aadhaar and phone numbers
export function clean(key, v) {
  const f = fieldOf(key); let s = String(v || '').trim();
  if (!s || !f) return s;
  switch (f.kind) {
    case 'aadhaar': case 'eshram': { const d = s.replace(/\D/g, ''); return d.length === 12 ? d.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : s; }
    case 'pan': case 'voter': case 'passport': case 'tan': case 'ifsc': case 'gst': case 'cin': return s.replace(/\s/g, '').toUpperCase();
    case 'dl': return s.toUpperCase().replace(/\s+/g, ' ');
    case 'phone': { const d = s.replace(/[^\d]/g, ''); const n = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 10 ? d : ''; return n ? '+91 ' + n.slice(0, 5) + ' ' + n.slice(5) : s; }
    case 'email': case 'upi': return s.toLowerCase();
    case 'acc': case 'digits': return s.replace(/\s/g, '');
    default: return s;
  }
}
// gentle checks so a typo is caught before it is shared
export function problem(key, v) {
  const f = fieldOf(key); const s = String(v || '');
  if (!s || !f) return '';
  const ok = {
    aadhaar: /^\d{4} \d{4} \d{4}$/, eshram: /^\d{4} \d{4} \d{4}$/, pan: /^[A-Z]{5}\d{4}[A-Z]$/, voter: /^[A-Z]{3}\d{7}$/, passport: /^[A-Z]\d{7}$/,
    tan: /^[A-Z]{4}\d{5}[A-Z]$/, ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/, gst: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, cin: /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/,
    phone: /^\+\d{2} \d{5} \d{5}$|^\+\d{8,15}$/, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, upi: /^[\w.\-]{2,}@[a-z]{2,}$/i, acc: /^\d{6,18}$/, digits: /^\d+$/
  }[f.kind];
  return ok && !ok.test(s) ? f.label + ' looks incomplete or has a typo.' : '';
}

export function shareText(keys, opts) {
  opts = opts || {};
  const p = S.profile || {};
  const out = [];
  SECTIONS.forEach((sec) => {
    const rows = sec.fields.filter((f) => keys.includes(f[0]) && p[f[0]]).map((f) => {
      let v = display(f[0], p[f[0]]);
      if (opts.maskAadhaar && f[0] === 'aadhaar') v = 'XXXX XXXX ' + String(p.aadhaar).replace(/\s/g, '').slice(-4);
      return f[1] + ': ' + v;
    });
    if (rows.length) out.push((out.length ? '\n' : '') + '*' + sec.title + '*\n' + rows.join('\n'));
  });
  return out.join('\n').trim();
}
