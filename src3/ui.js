// Shared UI helpers for Lucy.
import * as L from '../src/logic.js';
import { icon } from './icons.js';
import * as C from './content.js';

export const $ = (s) => document.querySelector(s);
export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function hm(str) { const p = String(str || '0:0').split(':'); return { h: +p[0] || 0, m: +p[1] || 0 }; }
export function toTime(ms) { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
export function fromInputs(dateStr, timeStr) {
  const [y, mo, d] = String(dateStr || L.dayKey(Date.now())).split('-').map(Number);
  const t = hm(timeStr || '09:00');
  return new Date(y, (mo || 1) - 1, d || 1, t.h, t.m, 0, 0).getTime();
}
export function fmtHM(s) { const t = hm(s); return L.fmtTime(L.atTime(Date.now(), t.h, t.m)); }
export function money(n) { return L.money(n); }
export function short(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(a >= 1e8 ? 0 : 2).replace(/\.0+$/, '') + ' Cr';
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(a >= 1e6 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + ' L';
  return L.money(n);
}
let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
export function openSheet(html, full) { const s = $('#sheet'); delete s.dataset.nocap; s.innerHTML = html; s.classList.toggle('full', !!full); s.scrollTop = 0; $('#sheet-wrap').hidden = false; }
export function closeSheet() { $('#sheet-wrap').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').classList.remove('full'); }
export function sheetOpen() { return !$('#sheet-wrap').hidden; }
export const listOf = (rows, empty) => rows.length ? '<div class="list">' + rows.join('') + '</div>' : (empty ? '<div class="empty">' + empty + '</div>' : '');
export function seg(name, opts, cur) {
  return '<div class="seg">' + opts.map(([k, l]) => '<button class="' + (k === cur ? 'on' : '') + '" data-a="seg" data-k="' + name + '" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
}
export function sw(on, a, v, extra) { return '<button class="switch ' + (on ? 'on' : '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + v + '"' : '') + (extra || '') + '><i></i></button>'; }
export function catIcon(cat) { return C.CAT_ICON[cat] || 'spark'; }
export function catStyle(cat) { return 'style="--c:' + (C.CAT_COLOR[cat] || '#D8B56A') + '"'; }
export function ring(pct, label, sub, size) {
  size = size || 112;
  const r = size / 2 - 7, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px"><svg width="' + size + '" height="' + size + '"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1CF"/><stop offset=".5" stop-color="#D8B56A"/><stop offset="1" stop-color="#9C7A34"/></linearGradient></defs>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="rgba(255,255,255,.07)" stroke-width="7" fill="none"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="url(#rg)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/></svg>' +
    '<div class="c"><div><b>' + label + '</b><small>' + (sub || '') + '</small></div></div></div>';
}
export function chart(points, fmt) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return '<div class="chart">' + points.map((p) => '<div class="col"><div class="dv">' + (fmt ? fmt(p.value) : p.value) + '</div><div class="b" style="height:' + Math.round(84 * p.value / max) + 'px"></div><div class="dl">' + esc(p.label) + '</div></div>').join('') + '</div>';
}
export async function imageToDataUrl(file, maxSide, quality) {
  maxSide = maxSide || 900; quality = quality || 0.72;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, maxSide / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}
export { icon, L, C };
