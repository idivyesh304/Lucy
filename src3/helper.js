// Talks to Lucy's private helper (Cloudflare Worker): Drive sync, notifications, AI.
import { S, device, replaceState, save } from './store.js';

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
  driveSave: (text) => call('/drive/save', { body: text }),
  driveDisconnect: () => call('/drive/disconnect', { body: {} })
};

/* ---------------- Google Drive sync ---------------- */
export const sync = { state: 'off', last: Number(device.get('lastSync', 0)), error: '' };
let saveTimer = null, saving = false, again = false;

export function driveEnabled() { return ready() && device.get('drive', '') === 'on'; }

export async function pullFromDrive(onReplaced) {
  if (!driveEnabled()) return;
  try {
    sync.state = 'syncing';
    const r = await api.driveLoad();
    if (r.data) {
      const remote = JSON.parse(r.data);
      // A device that has never synced always takes the Drive copy first, so a new
      // phone or laptop can never overwrite real data with its empty starter data.
      const firstSync = !Number(device.get('lastSync', 0));
      if (firstSync || (remote.updatedAt || 0) > (S.updatedAt || 0)) {
        replaceState(remote);
        markSynced();
        if (onReplaced) onReplaced();
      } else if ((S.updatedAt || 0) > (remote.updatedAt || 0)) {
        await pushToDrive();
      }
    } else if (S.updatedAt) {
      await pushToDrive();
    }
    sync.state = 'ok'; sync.error = '';
    markSynced();
  } catch (e) {
    sync.state = 'error'; sync.error = e.message;
  }
}
export function queueDriveSave() {
  if (!driveEnabled()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushToDrive, 3500);
}
export async function pushToDrive() {
  if (!driveEnabled()) return;
  if (saving) { again = true; return; }
  saving = true;
  try {
    sync.state = 'syncing';
    await api.driveSave(JSON.stringify(S));
    sync.state = 'ok'; sync.error = '';
    markSynced();
  } catch (e) { sync.state = 'error'; sync.error = e.message; }
  saving = false;
  if (again) { again = false; pushToDrive(); }
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
