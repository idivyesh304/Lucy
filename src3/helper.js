// Talks to Lucy's private helper (Cloudflare Worker): Drive sync, notifications, AI.
import { S, device, replaceState, save, mergeStates, keepSafetyCopy, records } from './store.js';

export function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return /OnePlus|CPH|LE2|MT2/.test(ua) ? 'OnePlus' : 'Android phone';
  if (/Macintosh/.test(ua)) return 'MacBook';
  return 'Computer';
}
export function helperUrl() {
  const fromDevice = device.get('helperUrl', '');
  const fromBuild = (window.LUCY_CONFIG && window.LUCY_CONFIG.helperUrl) || '';
  return (fromDevice || fromBuild).replace(/\/+$/, '');
}
export function passkey() { return device.get('passkey', ''); }
export function ready() { return !!(helperUrl() && passkey()); }

async function call(path, opts) {
  const url = helperUrl();
  if (!url) throw new Error('Helper not set up yet');
  opts = opts || {};
  const res = await fetch(url + path, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers: Object.assign({ 'content-type': 'application/json' }, opts.auth === false ? {} : { 'x-lucy-key': passkey() }),
    body: opts.body === undefined ? undefined : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  if (!res.ok) throw new Error(data.error || ('Helper error ' + res.status));
  return data;
}

// save call that also reports a refused (shrinking) save instead of throwing it away
async function callRaw(path, text, force) {
  const res = await fetch(helperUrl() + path, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', 'x-lucy-key': passkey() }, force ? { 'x-lucy-force': '1' } : {}), body: text });
  let data = {}; try { data = await res.json(); } catch (e) { /* empty */ }
  if (res.status === 409) return Object.assign({ conflict: true }, data);
  if (!res.ok) throw new Error(data.error || ('Helper error ' + res.status));
  return data;
}
export const api = {
  health: () => call('/health', { auth: false }),
  setup: (key) => call('/setup', { body: { passkey: key }, auth: false }),
  status: () => call('/status'),
  config: (obj) => call('/config', { body: obj }),
  vapid: () => call('/vapid', { auth: false }),
  subscribe: (sub) => call('/subscribe', { body: { subscription: sub, name: deviceName() } }),
  unsubscribe: (endpoint) => call('/unsubscribe', { body: { endpoint: endpoint } }),
  schedule: (items) => call('/schedule', { body: { items: items } }),
  testPush: () => call('/test-push', { body: {} }),
  ai: (payload) => call('/ai', { body: payload }),
  oauthLink: () => call('/oauth/link', { body: {} }),
  driveLoad: () => call('/drive/load', { body: {} }),
  driveSave: (text, force) => callRaw('/drive/save', text, force),
  driveHistory: () => call('/drive/history', { body: {} }),
  driveVersion: (v) => call('/drive/version', { body: v }),
  driveDisconnect: () => call('/drive/disconnect', { body: {} })
};

/* ---------------- Google Drive sync ---------------- */
export const sync = { state: 'off', last: Number(device.get('lastSync', 0)), error: '' };
let saveTimer = null, saving = false, again = false;

export function driveEnabled() { return ready() && device.get('drive', '') === 'on'; }

// Safe sync. Every device remembers the Drive version it last synced with ("base").
// - Drive changed and this device has no new edits: take Drive (after keeping a local safety copy).
// - Both changed: merge record by record, so nothing either side added is lost.
// - Only this device changed: save to Drive.
// The helper also refuses any save that would suddenly shrink the data, and keeps a safety copy.
const base = () => Number(device.get('syncBase', 0));
let onReplacedCb = null;
async function syncNow(onReplaced) {
  if (!driveEnabled()) return;
  if (onReplaced) onReplacedCb = onReplaced;
  if (saving) { again = true; return; }
  saving = true;
  try {
    sync.state = 'syncing';
    const r = await api.driveLoad();
    const remote = r.data ? JSON.parse(r.data) : null;
    const firstSync = !Number(device.get('lastSync', 0)) || !base();
    const localDirty = (S.updatedAt || 0) > base();
    if (remote) {
      const remoteChanged = (remote.updatedAt || 0) !== base();
      const shrink = records(S) >= 3 && records(remote) < records(S) * 0.7;
      if ((firstSync && records(S) && (S.updatedAt || 0) !== (remote.updatedAt || 0)) || (remoteChanged && !localDirty && shrink)) {
        keepSafetyCopy('merge on first sync'); const m = mergeStates(S, remote); replaceState(m); S.updatedAt = Date.now(); save({ local: true }); await push(); if (onReplacedCb) onReplacedCb();
      } else if (firstSync || (remoteChanged && !localDirty)) {
        if ((remote.updatedAt || 0) !== (S.updatedAt || 0)) { keepSafetyCopy('before taking Drive copy'); replaceState(remote); if (onReplacedCb) onReplacedCb(); }
        device.set('syncBase', String(remote.updatedAt || 0));
      } else if (remoteChanged && localDirty) {
        keepSafetyCopy('before merge'); const m = mergeStates(S, remote); replaceState(m); S.updatedAt = Date.now(); save({ local: true }); await push(); if (onReplacedCb) onReplacedCb();
      } else if (localDirty) {
        await push();
      }
    } else if (records(S)) {
      await push();
    }
    sync.state = 'ok'; sync.error = '';
    markSynced();
  } catch (e) {
    sync.state = 'error'; sync.error = e.message;
  }
  saving = false;
  if (again) { again = false; syncNow(); }
}
async function push(force) {
  const res = await api.driveSave(JSON.stringify(S), force);
  if (res && res.conflict) {
    // Drive holds much more data than this device: never overwrite it, merge instead.
    const remote = JSON.parse(res.remote);
    keepSafetyCopy('helper refused shrink');
    const m = mergeStates(S, remote); replaceState(m); S.updatedAt = Date.now(); save({ local: true });
    const r2 = await api.driveSave(JSON.stringify(S), true);
    if (r2 && r2.conflict) throw new Error('Sync paused to protect your data');
    if (onReplacedCb) onReplacedCb();
  }
  device.set('syncBase', String(S.updatedAt || 0));
}
export async function pullFromDrive(onReplaced) { return syncNow(onReplaced); }
export function queueDriveSave() {
  if (!driveEnabled()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => syncNow(), 3500);
}
export async function pushToDrive() { return syncNow(); }
// Restore an earlier version on purpose (from the Recover screen).
export async function restoreVersion(data) {
  keepSafetyCopy('before restore');
  replaceState(data); S.updatedAt = Date.now(); save({ local: true });
  await api.driveSave(JSON.stringify(S), true);
  device.set('syncBase', String(S.updatedAt)); markSynced();
}
function markSynced() { sync.last = Date.now(); device.set('lastSync', String(sync.last)); }

/* ---------------- notifications ---------------- */
export function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
export function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function urlB64ToUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export async function enablePush() {
  if (!pushSupported()) throw new Error('Open Lucy from your Home Screen icon to enable notifications.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were not allowed. Turn them on in iPhone Settings > Notifications > Lucy.');
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api.vapid();
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const existing = sub.options && sub.options.applicationServerKey;
    if (existing && btoa(String.fromCharCode(...new Uint8Array(existing))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== publicKey) {
      await sub.unsubscribe(); sub = null;
    }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) });
  await api.subscribe(sub.toJSON());
  device.set('push', 'on');
  return true;
}
export function pushOn() { return device.get('push', '') === 'on' && typeof Notification !== 'undefined' && Notification.permission === 'granted'; }

let schedTimer = null;
export function queueSchedule(build) {
  if (!ready() || !pushOn()) return;
  clearTimeout(schedTimer);
  schedTimer = setTimeout(async () => {
    try { await api.schedule(build()); device.set('lastSchedule', String(Date.now())); } catch (e) { console.error('schedule', e); }
  }, 5000);
}

export function markSaved() { save(); }
