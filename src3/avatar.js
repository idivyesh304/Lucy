// Lucy's on-screen presence: an original female android, gold line art on bronze.
// States: idle (breathing, blinking), speaking (mouth and core pulse), listening (halo pulse).
import { S } from './store.js';
import { onWord } from './voice.js';
import { setLucyState } from './lucy3d.js';

export function avatar(cls) {
  const custom = !!S.settings.avatarImg;
  const src = custom ? S.settings.avatarImg : 'lucy.jpg';
  return '<div class="avatar-wrap img ' + (custom ? 'custom ' : 'lucy-photo ') + (cls || '') + '"><div class="av-halo"></div><div class="av-img"><img src="' + src + '" alt="Lucy"></div><div class="av-shine"></div><div class="av-wave"></div></div>';
}

const SVG = `<svg class="lucy-svg" viewBox="0 0 300 420" role="img" aria-label="Lucy">
<defs>
  <radialGradient id="av-bg" cx="50%" cy="34%" r="55%"><stop offset="0" stop-color="#D8B56A" stop-opacity=".28"/><stop offset=".55" stop-color="#D8B56A" stop-opacity=".06"/><stop offset="1" stop-color="#D8B56A" stop-opacity="0"/></radialGradient>
  <linearGradient id="av-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2B992"/><stop offset=".55" stop-color="#C38F68"/><stop offset="1" stop-color="#8A5E42"/></linearGradient>
  <linearGradient id="av-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2830"/><stop offset="1" stop-color="#0F1016"/></linearGradient>
  <linearGradient id="av-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1CF"/><stop offset=".5" stop-color="#D8B56A"/><stop offset="1" stop-color="#9C7A34"/></linearGradient>
  <linearGradient id="av-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23242E"/><stop offset="1" stop-color="#0D0E14"/></linearGradient>
  <radialGradient id="av-iris" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFF1CF"/><stop offset=".45" stop-color="#E7C27A"/><stop offset="1" stop-color="#7A5A22"/></radialGradient>
  <radialGradient id="av-core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF6DD"/><stop offset=".4" stop-color="#E9C77F"/><stop offset="1" stop-color="#D8B56A" stop-opacity="0"/></radialGradient>
  <clipPath id="av-face"><path d="M150 50C199 50 220 92 219 140C217 188 190 226 150 234C110 226 83 188 81 140C80 92 101 50 150 50Z"/></clipPath>
</defs>
<circle cx="150" cy="150" r="150" fill="url(#av-bg)"/>
<g class="av-halo-g"><circle cx="150" cy="142" r="122" fill="none" stroke="url(#av-gold)" stroke-width="1" stroke-dasharray="2 9" opacity=".7"/>
<circle cx="150" cy="142" r="132" fill="none" stroke="#D8B56A" stroke-width=".6" stroke-dasharray="40 14 4 14" opacity=".35"/></g>
<path class="av-torso" d="M124 262C98 268 60 282 40 318L28 420H272L260 318C240 282 202 268 176 262Z" fill="url(#av-body)" stroke="url(#av-gold)" stroke-width="1.1"/>
<path d="M66 304C104 302 128 316 150 344C172 316 196 302 234 304" fill="none" stroke="url(#av-gold)" stroke-width="1.2"/>
<path d="M52 334C88 330 116 344 132 372M248 334C212 330 184 344 168 372" fill="none" stroke="#D8B56A" stroke-width=".7" opacity=".6"/>
<path d="M88 300 L80 420M212 300 L220 420" stroke="#D8B56A" stroke-width=".5" opacity=".35"/>
<g class="av-core"><circle cx="150" cy="364" r="24" fill="url(#av-core)" opacity=".55"/><circle cx="150" cy="364" r="7.5" fill="none" stroke="url(#av-gold)" stroke-width="1.4"/><circle cx="150" cy="364" r="2.6" fill="#FFF1CF"/></g>
<g class="av-waves"><circle cx="150" cy="364" r="16" fill="none" stroke="#E9C77F" stroke-width="1"/><circle cx="150" cy="364" r="16" fill="none" stroke="#E9C77F" stroke-width="1"/></g>
<path d="M128 226L126 266M172 226L174 266" stroke="url(#av-gold)" stroke-width="1.2"/>
<path d="M128 228C140 236 160 236 172 228L174 266C160 272 140 272 126 266Z" fill="url(#av-skin)" opacity=".9"/>
<path d="M127 244C140 250 160 250 173 244M126.5 256C140 262 160 262 173.5 256" stroke="#D8B56A" stroke-width=".8" fill="none" opacity=".8"/>
<path d="M150 30C214 30 246 84 241 150C239 186 232 214 222 236L203 232C212 192 215 152 209 116C199 80 179 64 150 62C121 64 101 80 91 116C85 152 88 192 97 232L78 236C68 214 61 186 59 150C54 84 86 30 150 30Z" fill="url(#av-hair)" stroke="#D8B56A" stroke-width=".7" stroke-opacity=".5"/>
<path d="M150 50C199 50 220 92 219 140C217 188 190 226 150 234C110 226 83 188 81 140C80 92 101 50 150 50Z" fill="url(#av-skin)"/>
<g clip-path="url(#av-face)" opacity=".9">
  <path d="M84 118C92 98 101 88 112 82" stroke="#FFF1CF" stroke-width=".8" fill="none" opacity=".6"/>
  <path d="M86 162H99L106 170H118M214 162H201L194 170H182" stroke="url(#av-gold)" stroke-width="1" fill="none"/>
  <circle cx="118" cy="170" r="1.6" fill="#FFF1CF"/><circle cx="182" cy="170" r="1.6" fill="#FFF1CF"/>
  <path d="M150 52V70" stroke="#FFF1CF" stroke-width=".6" opacity=".5"/>
  <ellipse cx="114" cy="178" rx="13" ry="7" fill="#E07A6A" opacity=".16"/><ellipse cx="186" cy="178" rx="13" ry="7" fill="#E07A6A" opacity=".16"/>
</g>
<path d="M92 114C112 70 166 58 210 102C178 82 130 82 92 114Z" fill="url(#av-hair)" stroke="#D8B56A" stroke-width=".6" stroke-opacity=".45"/>
<circle cx="83" cy="146" r="9" fill="url(#av-body)" stroke="url(#av-gold)" stroke-width="1.2"/><circle cx="217" cy="146" r="9" fill="url(#av-body)" stroke="url(#av-gold)" stroke-width="1.2"/>
<circle cx="83" cy="146" r="2.4" class="av-led" fill="#E9C77F"/><circle cx="217" cy="146" r="2.4" class="av-led" fill="#E9C77F"/>
<path d="M104 124C114 117 129 117 139 122M196 124C186 117 171 117 161 122" stroke="#3A2A22" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<g class="av-eyes">
  <path d="M104 141C112 131 132 131 140 141C132 148 112 148 104 141Z" fill="#FBF3E6"/>
  <path d="M160 141C168 131 188 131 196 141C188 148 168 148 160 141Z" fill="#FBF3E6"/>
  <circle class="av-iris" cx="122" cy="140.5" r="6.2" fill="url(#av-iris)"/><circle class="av-iris" cx="178" cy="140.5" r="6.2" fill="url(#av-iris)"/>
  <circle cx="122" cy="140.5" r="2.3" fill="#1B140C"/><circle cx="178" cy="140.5" r="2.3" fill="#1B140C"/>
  <circle cx="124" cy="138.3" r="1.3" fill="#fff"/><circle cx="180" cy="138.3" r="1.3" fill="#fff"/>
  <path d="M103 140.5C112 129 132 129 141 139.5M159 139.5C168 129 188 129 197 140.5" stroke="#241A14" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect class="av-lid" x="100" y="128" width="44" height="0" fill="url(#av-skin)"/><rect class="av-lid" x="156" y="128" width="44" height="0" fill="url(#av-skin)"/>
</g>
<path d="M150 150L146.5 176C148.5 179.5 152 179.5 154.5 177.5" stroke="#8A5E42" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>
<g class="av-mouth">
  <ellipse class="av-mouth-glow" cx="150" cy="200" rx="19" ry="6" fill="#FFE3A8" opacity="0"/>
  <path d="M132 198C140 191.5 146 193.5 150 195.8C154 193.5 160 191.5 168 198C160 200.5 140 200.5 132 198Z" fill="#9E4B45"/>
  <path class="av-lower" d="M133.5 199C141.5 209.5 158.5 209.5 166.5 199C158 202 142 202 133.5 199Z" fill="#B65A52"/>
  <path d="M141 203.5C146 205 154 205 159 203.5" stroke="#FFD8C8" stroke-width=".9" opacity=".55" fill="none"/>
</g>
</svg>`;

// Head motion while she talks: a small nod on every word (from the voice engine),
// plus a natural speech rhythm in case the voice does not report words.
let talkTimer = null, lastWord = 0, side = 1;
function nod(strength) {
  side = -side;
  document.querySelectorAll('.lucy-stage .avatar-wrap.img .av-img').forEach((el) => {
    const r = (0.6 + Math.random() * 0.9) * strength * side, y = -(0.4 + Math.random() * 0.8) * strength;
    el.style.transform = 'rotate(' + r.toFixed(2) + 'deg) translateY(' + y.toFixed(2) + '%)';
    el.classList.add('word');
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.transform = ''; el.classList.remove('word'); }, 170 + Math.random() * 90);
  });
}
onWord(() => { lastWord = Date.now(); nod(1); });
function startTalk() {
  stopTalk();
  const tick = () => { if (Date.now() - lastWord > 500) nod(0.8); talkTimer = setTimeout(tick, 240 + Math.random() * 220); };
  tick();
}
function stopTalk() { clearTimeout(talkTimer); talkTimer = null; }

export function setAvatarState(state) {
  setLucyState(state);
  if (state === 'speaking') startTalk(); else stopTalk();
  document.querySelectorAll('.avatar-wrap').forEach((el) => {
    el.classList.toggle('speaking', state === 'speaking');
    el.classList.toggle('listening', state === 'listening');
    el.classList.toggle('thinking', state === 'thinking');
  });
}
