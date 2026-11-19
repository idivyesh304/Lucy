// Lucy's voice (speech) and ears (listening), using the iPhone's built-in engines.
import { S } from './store.js';

let speaking = false;
const subs = [];
export function onVoiceState(fn) { subs.push(fn); }
const wordSubs = [];
export function onWord(fn) { wordSubs.push(fn); }
function emit(state) { subs.forEach((fn) => { try { fn(state); } catch (e) {} }); }

export function voices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => /^(en|hi)/i.test(v.lang));
}
// Lucy is female: only female voices are used, best Indian English first.
const MALE = /\b(rishi|prabhat|ravi|hemant|daniel|alex|fred|aaron|arthur|gordon|oliver|thomas|tom|rocko|grandpa|reed|eddy|ralph|albert|bruce|junior|david|mark|george|guy|ryan|james|male)\b|en-in-x-(end|ene)|en-us-x-(iol|iom|tpd)|en-gb-x-(gbb|gbd|rjs)/i;
const FEMALE_RANK = [
  /\b(isha|veena|neerja|heera|kalpana|priya|sangeeta)\b/i,
  /en-in-x-(ahp|cxx|ena)/i,
  /google.*(india|हिन्दी)/i,
  /\blekha\b/i,
  /\b(samantha|karen|moira|tessa|serena|kate|fiona|victoria|allison|ava|susan|zira|aria|jenny|libby|sonia|martha|nicky|zoe|siri)\b/i,
  /female|google uk english female|google us english/i
];
function isMale(v) { return MALE.test(v.name) || MALE.test(v.voiceURI || ''); }
function rank(v) {
  if (isMale(v)) return 99;
  for (let i = 0; i < FEMALE_RANK.length; i++) if (FEMALE_RANK[i].test(v.name) || FEMALE_RANK[i].test(v.voiceURI || '')) return i * 2 + (/en[-_]IN/i.test(v.lang) ? 0 : 1);
  return /en[-_]IN/i.test(v.lang) ? 40 : 60; // unknown gender
}
export function femaleVoices() {
  return voices().filter((v) => !isMale(v)).sort((a, b) => rank(a) - rank(b) || (/enhanced|premium|natural/i.test(b.name) - /enhanced|premium|natural/i.test(a.name)));
}
export function indianVoices() { return femaleVoices(); }
function chooseVoice() {
  const list = femaleVoices();
  const want = S.settings.voiceURI;
  if (want) { const v = list.find((x) => x.voiceURI === want); if (v) return v; }
  return list[0] || null;
}
// Speech that works on iPhone too: short sentence chunks (long text stalls), resume (iOS gets stuck paused),
// a small gap after cancel (iOS drops speech started right after cancel), and a retry with the
// default voice if the chosen one never starts (some iPhone voices fail silently).
let job = 0;
export const lastIssue = { silent: false };
function chunks(t) {
  const parts = String(t).match(/[^.!?]+[.!?]*\s*/g) || [String(t)];
  const out = []; let cur = '';
  parts.forEach((p) => { if ((cur + p).length > 180 && cur) { out.push(cur.trim()); cur = p; } else cur += p; });
  if (cur.trim()) out.push(cur.trim());
  return out;
}
export function speak(text, opts) {
  opts = opts || {};
  if (!('speechSynthesis' in window) || !text) return Promise.resolve();
  if (!opts.force && !S.settings.speak) return Promise.resolve();
  const clean = String(text).replace(/```[\s\S]*?```/g, '').replace(/[*_#>`]/g, '').replace(/₹\s?/g, 'rupees ').replace(/\s+/g, ' ').trim().slice(0, 2500);
  const my = ++job;
  const busy = speechSynthesis.speaking || speechSynthesis.pending;
  if (busy) { try { speechSynthesis.cancel(); } catch (e) {} }
  return new Promise((resolve) => {
    const list = chunks(clean);
    let started = false, useDefault = false, i = 0;
    const finish = () => { if (my !== job) return; speaking = false; emit('idle'); resolve(); };
    const next = () => {
      if (my !== job) return resolve();
      if (i >= list.length) return finish();
      const u = new SpeechSynthesisUtterance(list[i]);
      const v = useDefault ? null : chooseVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-IN';
      u.rate = Number(S.settings.voiceRate) || 0.95;
      u.pitch = Number(S.settings.voicePitch) || 1;
      u.onstart = () => { started = true; speaking = true; emit('speaking'); };
      u.onboundary = (e) => { if (!e.name || e.name === 'word') wordSubs.forEach((fn) => { try { fn(e); } catch (x) {} }); };
      u.onend = () => { i++; next(); };
      u.onerror = (e) => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return finish(); i++; next(); };
      try { speechSynthesis.resume(); } catch (e) {}
      speechSynthesis.speak(u);
    };
    const go = () => {
      next();
      // watchdog: if nothing started, retry once with the phone's default voice
      setTimeout(() => {
        if (my !== job || started) return;
        try { speechSynthesis.cancel(); } catch (e) {}
        useDefault = true; i = 0;
        setTimeout(() => { if (my === job) next(); }, 120);
        setTimeout(() => { if (my === job && !started) { lastIssue.silent = true; emit('nosound'); finish(); } }, 2500);
      }, 1600);
    };
    if (busy) setTimeout(go, 150); else go();
  });
}
export function stopSpeaking() { job++; try { speechSynthesis.cancel(); } catch (e) {} speaking = false; emit('idle'); }
export function isSpeaking() { return speaking; }

export function canListen() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
let rec = null;
export function listen(onText, onDone) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onDone && onDone(new Error('Listening is not available here. Use the microphone key on your iPhone keyboard instead.')); return; }
  stopSpeaking();
  try { if (rec) rec.abort(); } catch (e) {}
  rec = new SR();
  rec.lang = 'en-IN';
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    onText && onText((finalText + ' ' + interim).trim(), false);
  };
  rec.onerror = (e) => { emit('idle'); onDone && onDone(new Error(e.error === 'not-allowed' ? 'Microphone not allowed. Allow it in iPhone Settings > Safari > Microphone.' : 'Could not hear clearly. Try again.')); };
  rec.onend = () => { emit('idle'); onDone && onDone(null, finalText.trim()); };
  emit('listening');
  rec.start();
}
export function stopListening() { try { if (rec) rec.stop(); } catch (e) {} }

// how closely did he say the affirmation (word overlap, 0..1). Measures words only, never sincerity.
export function matchScore(target, said) {
  const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const t = words(target), s = new Set(words(said));
  if (!t.length) return 0;
  return t.filter((w) => s.has(w)).length / t.length;
}

if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) {} }
