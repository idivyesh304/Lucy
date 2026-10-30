// Lucy's celebrations: confetti bursts, emoji rain and a 3D-style trophy moment.
const COLORS = ['#7C5CFF', '#FF5CA8', '#FFB547', '#19C6B7', '#3A86FF', '#12B886', '#FF8A00'];
let tap = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let canvas, ctx, parts = [], running = false;

export function setTapPoint(x, y) { if (x || y) tap = { x: x, y: y }; }

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'fx';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const size = () => {
    const d = window.devicePixelRatio || 1;
    canvas.width = innerWidth * d; canvas.height = innerHeight * d;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  size();
  window.addEventListener('resize', size);
}
function loop() {
  if (!parts.length) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
  running = true;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const now = performance.now();
  parts = parts.filter((p) => now - p.born < p.life && p.y < innerHeight + 60);
  parts.forEach((p) => {
    p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    const age = (now - p.born) / p.life;
    ctx.save();
    ctx.globalAlpha = age > 0.75 ? Math.max(0, 1 - (age - 0.75) / 0.25) : 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.emoji) {
      ctx.font = p.size + 'px system-ui, "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else {
      // 3D-ish flipping ribbon: width oscillates with rotation
      const w = p.size * Math.abs(Math.cos(p.rot * 2.3)) + 1;
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-w / 2, -p.size / 3, w, p.size * 0.66);
    }
    ctx.restore();
  });
  requestAnimationFrame(loop);
}
function burst(x, y, n, power) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (Math.random() * 0.6 + 0.4) * power;
    parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.5, g: 0.18, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 7, color: COLORS[i % COLORS.length], round: Math.random() < 0.3, born: now, life: 1400 + Math.random() * 600 });
  }
}
function rain(emojis, n) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    parts.push({ x: Math.random() * innerWidth, y: -40 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 1.2, vy: 2 + Math.random() * 3, g: 0.06,
      rot: (Math.random() - 0.5), vr: (Math.random() - 0.5) * 0.06, size: 24 + Math.random() * 18, emoji: emojis[i % emojis.length], born: now, life: 3200 });
  }
}
function cannons() {
  const now = performance.now();
  [[0, innerHeight * 0.75, 1], [innerWidth, innerHeight * 0.75, -1]].forEach(([x, y, dir]) => {
    for (let i = 0; i < 70; i++) {
      const a = -Math.PI / 2 + dir * (0.25 + Math.random() * 0.55), s = 9 + Math.random() * 9;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s * dir * dir, vy: Math.sin(a) * s, g: 0.22, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5,
        size: 7 + Math.random() * 8, color: COLORS[i % COLORS.length], round: Math.random() < 0.25, born: now, life: 2600 });
    }
  });
}

export function celebrate(kind, opts) {
  opts = opts || {};
  ensureCanvas();
  if (kind === 'small') burst(tap.x, tap.y, 34, 7);
  else if (kind === 'rain') { rain(opts.emoji || ['✨', '🎉'], 28); burst(tap.x, tap.y, 24, 6); }
  else if (kind === 'big') { cannons(); setTimeout(() => burst(innerWidth / 2, innerHeight * 0.38, 60, 10), 250); showTrophy(opts); }
  if (!running) requestAnimationFrame(loop);
}

function showTrophy(o) {
  const old = document.getElementById('trophy');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'trophy';
  el.innerHTML = `<div class="t-stage"><div class="t-glow"></div><div class="t-ring"></div><div class="t-icon">${o.icon || '🏆'}</div></div>
    <div class="t-title">${o.title || 'Well done!'}</div><div class="t-sub">${o.sub || ''}</div><div class="t-tap">Tap to continue</div>`;
  document.body.appendChild(el);
  try { if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]); } catch (e) {}
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', close);
  setTimeout(close, 3400);
}
