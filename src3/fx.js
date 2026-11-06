// Ambient effects: a slow gold neural network behind every screen, and 3D tilt on cards.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function startNeural() {
  const c = document.getElementById('neural');
  if (!c || reduce) return;
  const x = c.getContext('2d');
  let W = 0, H = 0, dpr = 1, nodes = [], last = 0, pulses = [];
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(56, (W * H) / 16000));
    nodes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: Math.random() * 1.4 + 0.5, hue: Math.random() }));
  };
  size(); addEventListener('resize', size);
  const link = 130;
  function draw(now) {
    requestAnimationFrame(draw);
    if (document.hidden || now - last < 33) return;
    last = now;
    x.clearRect(0, 0, W, H);
    const sy = window.scrollY * 0.15;
    for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20; if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20; }
    x.lineWidth = 0.6;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < link) {
          x.strokeStyle = 'rgba(216,181,106,' + (0.14 * (1 - d / link)).toFixed(3) + ')';
          x.beginPath(); x.moveTo(a.x, a.y - sy % H); x.lineTo(b.x, b.y - sy % H); x.stroke();
          if (Math.random() < 0.0009 && pulses.length < 6) pulses.push({ a: a, b: b, t: 0 });
        }
      }
    }
    for (const n of nodes) {
      x.fillStyle = n.hue > 0.85 ? 'rgba(160,230,255,.55)' : 'rgba(243,217,160,.55)';
      x.beginPath(); x.arc(n.x, n.y - sy % H, n.r, 0, 6.283); x.fill();
    }
    // signals travelling along the network
    pulses = pulses.filter((p) => (p.t += 0.025) < 1);
    for (const p of pulses) {
      const px = p.a.x + (p.b.x - p.a.x) * p.t, py = p.a.y + (p.b.y - p.a.y) * p.t - sy % H;
      const g = x.createRadialGradient(px, py, 0, px, py, 7);
      g.addColorStop(0, 'rgba(255,241,207,.9)'); g.addColorStop(1, 'rgba(255,241,207,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, 7, 0, 6.283); x.fill();
    }
  }
  requestAnimationFrame(draw);
}

// Cards lean towards your finger in 3D, with a light glare that follows it.
export function startTilt() {
  if (reduce) return;
  const SEL = '.panel, .aff, .dream-card, .dtile, .stat';
  let el = null;
  const set = (e) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg'); el.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg');
    el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%'); el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
  };
  const end = () => { if (el) { el.classList.remove('tilting'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } el = null; };
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest(SEL);
    if (!t || e.target.closest('input,textarea,select,.seg,.rgrid,.list')) return;
    el = t; el.classList.add('tilting'); set(e);
  }, { passive: true });
  document.addEventListener('pointermove', set, { passive: true });
  ['pointerup', 'pointercancel', 'scroll'].forEach((ev) => document.addEventListener(ev, end, { passive: true, capture: true }));
}

// Numbers count up when a screen opens.
export function countUp(root) {
  if (reduce) return;
  (root || document).querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count), fmt = el.dataset.fmt || '', dur = 900, t0 = performance.now();
    if (!target) return;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = target * e;
      el.textContent = fmt === 'pct' ? Math.round(v) + '%' : Math.round(v).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
