// Gold celebrations: particle bursts, coin rain and a trophy moment. No emojis.
const GOLD = ['#D8B56A', '#F3D9A0', '#B8913F', '#FFF1CF', '#E9C77F'];
let tap = { x: innerWidth / 2, y: innerHeight / 2 };
let canvas, ctx, parts = [], running = false;
export function setTapPoint(x, y) { if (x || y) tap = { x: x, y: y }; }

function ensure() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'fx';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const size = () => {
    const d = devicePixelRatio || 1;
    canvas.width = innerWidth * d; canvas.height = innerHeight * d;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  size(); addEventListener('resize', size);
}
function loop() {
  if (!parts.length) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
  running = true;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const now = performance.now();
  parts = parts.filter((p) => now - p.born < p.life && p.y < innerHeight + 40);
  parts.forEach((p) => {
    p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    const age = (now - p.born) / p.life;
    ctx.save();
    ctx.globalAlpha = age > 0.7 ? Math.max(0, 1 - (age - 0.7) / 0.3) : 1;
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (p.coin) {
      const w = p.size * Math.abs(Math.cos(p.rot * 1.7)) + 1.5;
      const g = ctx.createLinearGradient(-w, -p.size, w, p.size);
      g.addColorStop(0, '#FFF1CF'); g.addColorStop(0.5, '#D8B56A'); g.addColorStop(1, '#8E6B28');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w, p.size, 0, 0, Math.PI * 2); ctx.fill();
    } else if (p.spark) {
      ctx.fillStyle = p.color; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size); ctx.lineTo(Math.cos(a + Math.PI / 4) * p.size * 0.28, Math.sin(a + Math.PI / 4) * p.size * 0.28); }
      ctx.closePath(); ctx.fill();
    } else {
      const w = p.size * Math.abs(Math.cos(p.rot * 2.1)) + 1;
      ctx.fillStyle = p.color; ctx.fillRect(-w / 2, -p.size / 4, w, p.size / 2);
    }
    ctx.restore();
  });
  requestAnimationFrame(loop);
}
function burst(x, y, n, power) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (Math.random() * 0.6 + 0.4) * power;
    parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.45, g: 0.16, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      size: 5 + Math.random() * 7, color: GOLD[i % GOLD.length], spark: Math.random() < 0.35, born: now, life: 1300 + Math.random() * 600 });
  }
}
function coins(n) {
  const now = performance.now();
  for (let i = 0; i < n; i++) {
    parts.push({ x: Math.random() * innerWidth, y: -30 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5), vy: 2 + Math.random() * 3, g: 0.08,
      rot: Math.random() * 6, vr: 0.08 + Math.random() * 0.1, size: 8 + Math.random() * 6, coin: true, born: now, life: 3000 });
  }
}
function cannons() {
  const now = performance.now();
  [[0, innerHeight * 0.8, 1], [innerWidth, innerHeight * 0.8, -1]].forEach(([x, y, dir]) => {
    for (let i = 0; i < 60; i++) {
      const a = -Math.PI / 2 + dir * (0.25 + Math.random() * 0.55), s = 9 + Math.random() * 8;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5,
        size: 6 + Math.random() * 8, color: GOLD[i % GOLD.length], spark: Math.random() < 0.3, born: now, life: 2600 });
    }
  });
}
export function celebrate(kind, o) {
  o = o || {};
  ensure();
  if (kind === 'small') burst(tap.x, tap.y, 30, 6.5);
  else if (kind === 'coins') { coins(34); burst(tap.x, tap.y, 20, 6); }
  else if (kind === 'big') { cannons(); setTimeout(() => burst(innerWidth / 2, innerHeight * 0.38, 50, 9), 250); trophy(o); }
  try { if (navigator.vibrate) navigator.vibrate(kind === 'big' ? [50, 40, 90] : 25); } catch (e) {}
  if (!running) requestAnimationFrame(loop);
}
function trophy(o) {
  const old = document.getElementById('trophy'); if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'trophy';
  el.innerHTML = '<div class="t-stage"><div class="t-glow"></div><div class="t-ring"></div><div class="t-icon"><svg viewBox="0 0 24 24" width="92" height="92" fill="none" stroke="url(#tg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1CF"/><stop offset=".5" stop-color="#D8B56A"/><stop offset="1" stop-color="#9C7A34"/></linearGradient></defs><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5A3 3 0 0 1 16 10M12 13v4M8.5 20.5h7M10 17h4"/></svg></div></div>' +
    '<div class="t-title">' + (o.title || 'Well done') + '</div><div class="t-sub">' + (o.sub || '') + '</div><div class="t-tap">Tap to continue</div>';
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', close); setTimeout(close, 3600);
}
