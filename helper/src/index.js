// Lucy helper — a tiny private service on Cloudflare Workers.
// Jobs: 1) send iPhone notifications on time, 2) keep Claude/ChatGPT keys secret,
// 3) save/load Lucy's data in Divyesh's own Google Drive (hidden app folder).
// Everything except /health, /vapid and the Google sign-in callback needs the Lucy passkey.

import { generateVapidKeys, sendPush } from './webpush.js';

const DRIVE_FILE = 'lucy-data.json';
const PUSH_SUBJECT = 'mailto:lucy-assistant@users.noreply.github.com';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    try {
      return cors(await route(request, env, ctx));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 500));
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDue(env));
  }
};

/* ---------------- routing ---------------- */
async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';

  if (p === '/' || p === '/health') {
    const cfg = await getCfg(env);
    return json({ ok: true, service: 'lucy-helper', passkeySet: !!cfg.passkeyHash });
  }
  if (p === '/vapid') return json({ publicKey: (await getVapid(env)).publicKey });
  if (p === '/oauth/callback') return oauthCallback(url, env);

  if (p === '/setup' && req.method === 'POST') {
    const cfg = await getCfg(env);
    if (cfg.passkeyHash) return json({ error: 'Passkey already set' }, 403);
    const body = await req.json();
    if (!body.passkey || String(body.passkey).length < 8) return json({ error: 'Passkey must be at least 8 characters' }, 400);
    cfg.passkeyHash = await sha256(body.passkey);
    await putCfg(env, cfg);
    return json({ ok: true });
  }

  // everything below needs the passkey
  const cfg = await getCfg(env);
  if (!cfg.passkeyHash) return json({ error: 'Helper not set up yet' }, 401);
  const key = req.headers.get('x-lucy-key') || '';
  if (!key || (await sha256(key)) !== cfg.passkeyHash) return json({ error: 'Wrong passkey' }, 401);

  if (p === '/status') return json(await status(env, cfg));
  if (p === '/config' && req.method === 'POST') {
    const body = await req.json();
    const allowed = ['anthropicKey', 'openaiKey', 'claudeModel', 'openaiModel', 'googleClientId', 'googleClientSecret', 'appUrl', 'city'];
    allowed.forEach((k) => {
      if (body[k] === null || body[k] === '') delete cfg[k];
      else if (typeof body[k] === 'string') cfg[k] = body[k].trim();
    });
    await putCfg(env, cfg);
    return json(await status(env, cfg));
  }
  if (p === '/subscribe' && req.method === 'POST') {
    const body = await req.json();
    if (!body.subscription || !body.subscription.endpoint) return json({ error: 'No subscription' }, 400);
    const subs = (await getSubs(env)).filter((x) => x.sub.endpoint !== body.subscription.endpoint);
    subs.push({ sub: body.subscription, name: String(body.name || 'Phone').slice(0, 40), at: Date.now() });
    await env.LUCY.put('subs', JSON.stringify(subs.slice(-6)));
    return json({ ok: true, devices: subs.length });
  }
  if (p === '/unsubscribe' && req.method === 'POST') {
    const body = await req.json();
    const subs = (await getSubs(env)).filter((x) => x.sub.endpoint !== body.endpoint);
    await env.LUCY.put('subs', JSON.stringify(subs));
    return json({ ok: true, devices: subs.length });
  }
  if (p === '/schedule' && req.method === 'POST') {
    const body = await req.json();
    const now = Date.now();
    const items = (body.items || []).filter((i) => i && i.at > now - 60000 && i.title)
      .sort((a, b) => a.at - b.at).slice(0, 600)
      .map((i) => ({ at: i.at, title: String(i.title).slice(0, 120), body: String(i.body || '').slice(0, 400), tag: i.tag || '', url: i.url || '' }));
    await env.LUCY.put('queue', JSON.stringify(items));
    return json({ ok: true, queued: items.length, next: items[0] ? items[0].at : null });
  }
  if (p === '/test-push' && req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const r = await pushNow(env, { title: body.title || 'Lucy is connected', body: body.body || 'Notifications are working on your iPhone.', tag: 'test', url: '' });
    return json(r);
  }
  if (p === '/ai' && req.method === 'POST') return ai(await req.json(), cfg);
  if (p === '/oauth/link' && req.method === 'POST') return oauthLink(url, env, cfg);
  if (p === '/drive/load' && req.method === 'POST') return driveLoad(env, cfg);
  if (p === '/drive/save' && req.method === 'POST') return driveSave(await req.text(), env, cfg, req.headers.get('x-lucy-force') === '1');
  if (p === '/drive/history' && req.method === 'POST') return driveHistory(env, cfg);
  if (p === '/drive/version' && req.method === 'POST') return driveVersion(await req.json(), env, cfg);
  if (p === '/drive/disconnect' && req.method === 'POST') { await env.LUCY.delete('gtoken'); await env.LUCY.delete('gaccess'); return json({ ok: true }); }

  return json({ error: 'Not found' }, 404);
}

/* ---------------- helpers ---------------- */
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
function cors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Headers', 'content-type, x-lucy-key, x-lucy-force');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return new Response(res.body, { status: res.status, headers: h });
}
async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lucy:' + text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function getCfg(env) { return JSON.parse((await env.LUCY.get('cfg')) || '{}'); }
async function putCfg(env, cfg) { await env.LUCY.put('cfg', JSON.stringify(cfg)); }
async function getVapid(env) {
  let v = await env.LUCY.get('vapid');
  if (v) return JSON.parse(v);
  const keys = await generateVapidKeys();
  await env.LUCY.put('vapid', JSON.stringify(keys));
  return keys;
}
async function status(env, cfg) {
  const queue = JSON.parse((await env.LUCY.get('queue')) || '[]');
  return {
    ok: true,
    claude: !!cfg.anthropicKey, chatgpt: !!cfg.openaiKey,
    claudeModel: cfg.claudeModel || 'claude-sonnet-5-5', openaiModel: cfg.openaiModel || 'gpt-6.1-sol',
    googleReady: !!(cfg.googleClientId && cfg.googleClientSecret),
    drive: !!(await env.LUCY.get('gtoken')),
    push: (await getSubs(env)).length > 0,
    pushDevices: (await getSubs(env)).map((x) => x.name),
    queued: queue.length, nextAt: queue[0] ? queue[0].at : null,
    lastPush: JSON.parse((await env.LUCY.get('lastPush')) || 'null')
  };
}

/* ---------------- notifications ---------------- */
async function getSubs(env) {
  let subs = JSON.parse((await env.LUCY.get('subs')) || 'null');
  if (!subs) {
    const old = JSON.parse((await env.LUCY.get('sub')) || 'null');
    subs = old ? [{ sub: old, name: 'iPhone', at: Date.now() }] : [];
    if (old) { await env.LUCY.put('subs', JSON.stringify(subs)); await env.LUCY.delete('sub'); }
  }
  return subs;
}
// Sends to every device that turned notifications on (iPhone, Android, laptop).
async function pushNow(env, item) {
  const subs = await getSubs(env);
  if (!subs.length) return { ok: false, error: 'No device has notifications turned on yet' };
  const vapid = await getVapid(env);
  const results = [], dead = [];
  for (const d of subs) {
    try {
      const r = await sendPush(d.sub, { title: item.title, body: item.body, tag: item.tag, url: item.url }, vapid, PUSH_SUBJECT, 3600);
      results.push({ device: d.name, status: r.status });
      if (r.status === 404 || r.status === 410) dead.push(d.sub.endpoint);
    } catch (e) { results.push({ device: d.name, error: String(e.message || e) }); }
  }
  if (dead.length) await env.LUCY.put('subs', JSON.stringify(subs.filter((d) => !dead.includes(d.sub.endpoint))));
  await env.LUCY.put('lastPush', JSON.stringify({ at: Date.now(), title: item.title, results: results }));
  return { ok: results.some((r) => r.status >= 200 && r.status < 300), status: results[0] && results[0].status, devices: results };
}
async function sendDue(env) {
  const raw = await env.LUCY.get('queue');
  if (!raw) return;
  const queue = JSON.parse(raw);
  const now = Date.now();
  const due = queue.filter((i) => i.at <= now + 20000);
  if (!due.length) return;
  const rest = queue.filter((i) => i.at > now + 20000);
  await env.LUCY.put('queue', JSON.stringify(rest));
  // only send the latest few if many piled up (e.g. after downtime)
  const fresh = due.filter((i) => now - i.at < 30 * 60000).slice(-4);
  for (const item of fresh) {
    try { await pushNow(env, item); } catch (e) { /* keep going */ }
  }
}

/* ---------------- AI (Claude + ChatGPT) ---------------- */
async function ai(body, cfg) {
  const provider = body.provider === 'chatgpt' ? 'chatgpt' : 'claude';
  const system = String(body.system || '').slice(0, 30000);
  const messages = (body.messages || []).slice(-30).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 20000) }));
  if (!messages.length) return json({ error: 'No message' }, 400);
  const maxTokens = Math.min(Number(body.maxTokens) || 1500, 4000);

  if (provider === 'claude') {
    if (!cfg.anthropicKey) return json({ error: 'Claude key not added yet. Add it in Lucy > Settings > AI.' }, 400);
    const req = { model: body.model || cfg.claudeModel || 'claude-sonnet-5-5', max_tokens: maxTokens, system: system, messages: messages };
    if (body.web) {
      req.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: Math.min(Number(body.maxSearches) || 5, 10),
        user_location: { type: 'approximate', city: cfg.city || 'Ahmedabad', region: 'Gujarat', country: 'IN', timezone: 'Asia/Kolkata' } }];
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(req)
    });
    const data = await res.json();
    if (!res.ok) return json({ error: 'Claude: ' + ((data.error && data.error.message) || res.status) }, 502);
    const sources = [];
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => {
      (b.citations || []).forEach((c) => { if (c.url && !sources.find((s) => s.url === c.url)) sources.push({ url: c.url, title: c.title || c.url }); });
      return b.text;
    }).join('');
    return json({ provider: 'claude', model: data.model, text: text, sources: sources, usage: data.usage });
  }

  if (!cfg.openaiKey) return json({ error: 'ChatGPT key not added yet. Add it in Lucy > Settings > AI.' }, 400);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.openaiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ model: body.model || cfg.openaiModel || 'gpt-6.1-sol', max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: system }].concat(messages) })
  });
  const data = await res.json();
  if (!res.ok) return json({ error: 'ChatGPT: ' + ((data.error && data.error.message) || res.status) }, 502);
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  return json({ provider: 'chatgpt', model: data.model, text: (msg && msg.content) || '', sources: [], usage: data.usage });
}

/* ---------------- Google Drive ---------------- */
function redirectUri(url) { return url.origin + '/oauth/callback'; }
async function oauthLink(url, env, cfg) {
  if (!cfg.googleClientId || !cfg.googleClientSecret) return json({ error: 'Add your Google Client ID and Secret first.' }, 400);
  const state = crypto.randomUUID();
  await env.LUCY.put('oauthState', state, { expirationTtl: 900 });
  const q = new URLSearchParams({
    client_id: cfg.googleClientId, redirect_uri: redirectUri(url), response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.appdata', access_type: 'offline', prompt: 'consent', state: state
  });
  return json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString() });
}
async function oauthCallback(url, env) {
  const cfg = await getCfg(env);
  const back = (cfg.appUrl || 'https://idivyesh304.github.io/Lucy/') + '#drive=';
  const state = await env.LUCY.get('oauthState');
  if (!state || url.searchParams.get('state') !== state) return Response.redirect(back + 'expired', 302);
  if (url.searchParams.get('error')) return Response.redirect(back + 'denied', 302);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: cfg.googleClientId, client_secret: cfg.googleClientSecret,
      redirect_uri: redirectUri(url), grant_type: 'authorization_code' })
  });
  const data = await res.json();
  await env.LUCY.delete('oauthState');
  if (!res.ok || !data.refresh_token) return Response.redirect(back + 'failed', 302);
  await env.LUCY.put('gtoken', JSON.stringify({ refresh_token: data.refresh_token }));
  await env.LUCY.put('gaccess', JSON.stringify({ token: data.access_token, exp: Date.now() + (data.expires_in - 120) * 1000 }));
  return Response.redirect(back + 'connected', 302);
}
async function accessToken(env, cfg) {
  const cached = JSON.parse((await env.LUCY.get('gaccess')) || 'null');
  if (cached && cached.exp > Date.now()) return cached.token;
  const g = JSON.parse((await env.LUCY.get('gtoken')) || 'null');
  if (!g) throw new Error('Google Drive not connected');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: g.refresh_token, client_id: cfg.googleClientId, client_secret: cfg.googleClientSecret, grant_type: 'refresh_token' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Google sign-in expired. Reconnect Google Drive in Settings.');
  await env.LUCY.put('gaccess', JSON.stringify({ token: data.access_token, exp: Date.now() + (data.expires_in - 120) * 1000 }));
  return data.access_token;
}
async function findFiles(token, name) {
  const q = new URLSearchParams({ spaces: 'appDataFolder', q: "name contains '" + name + "' and trashed = false", fields: 'files(id,name,modifiedTime)', pageSize: '100', orderBy: 'modifiedTime desc' });
  const res = await fetch('https://www.googleapis.com/drive/v3/files?' + q, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Drive list failed (' + res.status + ')');
  return (await res.json()).files || [];
}
async function driveLoad(env, cfg) {
  const token = await accessToken(env, cfg);
  const files = (await findFiles(token, 'lucy-data')).filter((f) => f.name === DRIVE_FILE);
  if (!files.length) return json({ data: null });
  const res = await fetch('https://www.googleapis.com/drive/v3/files/' + files[0].id + '?alt=media', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Drive download failed (' + res.status + ')');
  return json({ data: await res.text(), modifiedTime: files[0].modifiedTime });
}
async function upload(token, id, name, text) {
  if (id) {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', {
      method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: text
    });
    if (!res.ok) throw new Error('Drive save failed (' + res.status + ')');
    return;
  }
  const boundary = 'lucy' + Date.now();
  const meta = JSON.stringify({ name: name, parents: ['appDataFolder'], mimeType: 'application/json' });
  const body = '--' + boundary + '\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary +
    '\r\ncontent-type: application/json\r\n\r\n' + text + '\r\n--' + boundary + '--';
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'multipart/related; boundary=' + boundary }, body: body
  });
  if (!res.ok) throw new Error('Drive create failed (' + res.status + ')');
}
// how much real data a Lucy file holds
function records(d) {
  if (!d || typeof d !== 'object') return 0;
  let n = 0;
  ['clients', 'payments', 'reminders', 'loans', 'expenses', 'employees', 'specialDays', 'dreams', 'leads', 'ideas', 'notes', 'shopping', 'learning'].forEach((k) => { if (Array.isArray(d[k])) n += d[k].length; });
  (d.office || []).forEach((o) => { if (Number(o.amount)) n++; Object.values(o.paid || {}).forEach((x) => { n += ((x && x.parts) || []).length; }); });
  (d.payments || []).forEach((p) => { n += (p.parts || []).length; });
  return n;
}
async function driveSave(text, env, cfg, force) {
  const incoming = JSON.parse(text); // refuse to save broken data
  const token = await accessToken(env, cfg);
  const files = await findFiles(token, 'lucy-');
  const main = files.find((f) => f.name === DRIVE_FILE);
  // Safety net: if this save would hold less data than what is in Drive now, keep a copy of the current file first.
  if (main) {
    const cur = await fetch('https://www.googleapis.com/drive/v3/files/' + main.id + '?alt=media', { headers: { Authorization: 'Bearer ' + token } });
    if (cur.ok) {
      const curText = await cur.text();
      let curData = null; try { curData = JSON.parse(curText); } catch (e) {}
      const before = records(curData), after = records(incoming);
      if (after < before) {
        const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 19).replace(/[:T]/g, '-');
        await upload(token, null, 'lucy-safety-' + stamp + '.json', curText);
        const safes = files.filter((f) => /^lucy-safety-/.test(f.name)).sort((a, b) => b.name.localeCompare(a.name));
        for (const old of safes.slice(39)) await fetch('https://www.googleapis.com/drive/v3/files/' + old.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        // a big drop is almost always a stale device: refuse unless the person chose it
        if (!force && before >= 5 && after < before * 0.7) return json({ error: 'shrink', before: before, after: after, remote: curText }, 409);
      }
    }
  }
  await upload(token, main && main.id, DRIVE_FILE, text);
  // one dated safety copy per day, keep the last 14
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const snapName = 'lucy-backup-' + today + '.json';
  if (!files.find((f) => f.name === snapName)) {
    await upload(token, null, snapName, text);
    const snaps = files.filter((f) => /^lucy-backup-/.test(f.name)).sort((a, b) => b.name.localeCompare(a.name));
    for (const old of snaps.slice(13)) {
      await fetch('https://www.googleapis.com/drive/v3/files/' + old.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    }
  }
  return json({ ok: true, savedAt: Date.now() });
}

// Every earlier version Drive holds: file revisions, daily backups and safety copies.
async function driveHistory(env, cfg) {
  const token = await accessToken(env, cfg);
  const files = await findFiles(token, 'lucy-');
  const out = [];
  const main = files.find((f) => f.name === DRIVE_FILE);
  if (main) {
    const r = await fetch('https://www.googleapis.com/drive/v3/files/' + main.id + '/revisions?fields=revisions(id,modifiedTime,size)&pageSize=200', { headers: { Authorization: 'Bearer ' + token } });
    if (r.ok) ((await r.json()).revisions || []).forEach((v) => out.push({ kind: 'rev', id: v.id, file: main.id, at: v.modifiedTime, size: Number(v.size || 0), label: 'Saved version' }));
  }
  files.filter((f) => f.name !== DRIVE_FILE).forEach((f) => out.push({ kind: 'file', id: f.id, at: f.modifiedTime, label: /safety/.test(f.name) ? 'Safety copy' : 'Daily backup ' + f.name.slice(12, 22), name: f.name }));
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return json({ versions: out });
}
async function driveVersion(body, env, cfg) {
  const token = await accessToken(env, cfg);
  const url = body.kind === 'rev' ? 'https://www.googleapis.com/drive/v3/files/' + body.file + '/revisions/' + body.id + '?alt=media' : 'https://www.googleapis.com/drive/v3/files/' + body.id + '?alt=media';
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('Could not open that version (' + r.status + ')');
  const text = await r.text();
  let d = null; try { d = JSON.parse(text); } catch (e) {}
  return json({ data: text, records: records(d) });
}
