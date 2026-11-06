// Live Lucy: a 3D hologram made of light particles, built from her portrait.
// - Assembles from scattered light when shown
// - Real 3D head motion (turn, tilt, nod) with depth
// - Lip-sync: the jaw particles open around a hinge on every syllable she speaks
// - Speaking: glow and ripple; listening: cyan; thinking: particles swirl
// Falls back to the plain photo when WebGL is not available.
import { onWord } from './voice.js';

const IMG_W = 673, IMG_H = 1200;
const HINGE = [392, 498], MOUTH_A = [486, 519], MOUTH_B = [566, 531];
const JAW_C = [528, 586], JAW_R = [118, 96];
const NECK = [430, 760];
const CENTER = [452, 520];

const VS = `precision highp float;
attribute vec3 pos; attribute vec3 col; attribute vec2 info; // info.x = jaw weight, info.y = seed
uniform vec2 view; uniform float t; uniform float mouth; uniform float nod; uniform vec2 turn;
uniform float glow; uniform float listen; uniform float think; uniform float build; uniform float dpr;
varying vec3 vc; varying float va;
vec2 rot(vec2 q, vec2 c, float a){ vec2 d=q-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
float h1(float n){ return fract(sin(n)*43758.5453); }
void main(){
  vec3 p = pos;
  // jaw opens around the hinge
  p.xy = mix(p.xy, rot(p.xy, vec2(${HINGE[0]}.0, ${HINGE[1]}.0), mouth*0.085), info.x);
  // head nod around the neck
  float wn = 1.0 - smoothstep(${NECK[1] - 60}.0, ${NECK[1] + 90}.0, p.y);
  p.xy = mix(p.xy, rot(p.xy, vec2(${NECK[0]}.0, ${NECK[1]}.0), nod), wn);
  // centre and turn in 3D
  p.xy -= vec2(${CENTER[0]}.0, ${CENTER[1]}.0);
  p.y = -p.y;
  float s = info.y;
  // thinking: particles lift and swirl; speaking: soft ripple
  float sw = think * (0.6 + 0.4*sin(t*1.3 + s*30.0));
  p += vec3(sin(t*0.9 + s*61.0), cos(t*0.7 + s*47.0), sin(t*1.1 + s*13.0)) * sw * 14.0;
  p.z += sin(p.y*0.035 - t*7.0) * glow * 3.0;
  // assemble from scattered light
  vec3 scatter = vec3(h1(s*91.0)-0.5, h1(s*17.0)-0.5, h1(s*53.0)-0.5) * vec3(1400.0, 1800.0, 900.0);
  float b = clamp(build*1.25 - s*0.25, 0.0, 1.0); b = b*b*(3.0-2.0*b);
  p = mix(scatter, p, b);
  float cy = cos(turn.x), sy = sin(turn.x), cx = cos(turn.y), sx = sin(turn.y);
  p = vec3(p.x*cy + p.z*sy, p.y, -p.x*sy + p.z*cy);
  p = vec3(p.x, p.y*cx - p.z*sx, p.y*sx + p.z*cx);
  float f = 1500.0, k = f/(f - p.z);
  float scale = min(view.x/560.0, view.y/820.0);
  vec2 sp = p.xy * k * scale;
  sp.x += view.x*0.02;
  gl_Position = vec4(sp/(view*0.5), 0.0, 1.0);
  gl_PointSize = (1.6 + 0.35*info.x*mouth + glow*0.4) * dpr * k * scale * 1.15;
  vec3 c = col;
  float lum = dot(c, vec3(0.3,0.59,0.11));
  vec3 holo = mix(vec3(1.0,0.86,0.55), vec3(0.55,0.95,1.0), listen);
  c = mix(c*1.7 + 0.05, holo*(0.25+lum*1.6), 0.18 + 0.55*listen);
  c *= 0.85 + 0.35*glow + 0.25*sin(t*2.0 + s*20.0)*think;
  vc = c; va = (0.55 + 0.45*b) * (0.6 + lum*1.4);
}`;
const FS = `precision mediump float; varying vec3 vc; varying float va;
void main(){ vec2 d = gl_PointCoord-0.5; float r = dot(d,d); if (r > 0.25) discard; float a = smoothstep(0.25, 0.0, r); gl_FragColor = vec4(vc*a*va, 1.0); }`;

let gl, prog, canvas, uni = {}, count = 0, raf = 0, ready = false, failed = false;
let state = 'idle', start = performance.now(), buildStart = 0;
let mouth = 0, mouthT = 0, nodV = 0, nodKick = 0, glowV = 0, listenV = 0, thinkV = 0;
let syllTimer = 0, lastWord = 0, pointer = [0, 0];

function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

function buildPoints(img) {
  const c = document.createElement('canvas'); c.width = IMG_W; c.height = IMG_H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, IMG_W, IMG_H);
  const px = x.getImageData(0, 0, IMG_W, IMG_H).data;
  // soft depth from her silhouette
  const dw = 168, dh = 300, d1 = document.createElement('canvas'); d1.width = dw; d1.height = dh;
  const dx = d1.getContext('2d'); dx.drawImage(img, 0, 0, dw, dh);
  const dd = dx.getImageData(0, 0, dw, dh); for (let i = 0; i < dd.data.length; i += 4) { const l = (0.3 * dd.data[i] + 0.59 * dd.data[i + 1] + 0.11 * dd.data[i + 2]) / 255; dd.data[i] = dd.data[i + 1] = dd.data[i + 2] = l > 0.035 ? 255 : 0; }
  dx.putImageData(dd, 0, 0);
  const d2 = document.createElement('canvas'); d2.width = dw; d2.height = dh; const dx2 = d2.getContext('2d');
  dx2.filter = 'blur(12px)'; dx2.drawImage(d1, 0, 0); dx2.filter = 'blur(5px)'; dx2.drawImage(d2, 0, 0);
  const dep = dx2.getImageData(0, 0, dw, dh).data;
  const small = matchMedia('(max-width: 500px)').matches;
  const step = small ? 2.6 : 2.2;
  const P = [], Cc = [], I = [];
  const ea = [MOUTH_B[0] - MOUTH_A[0], MOUTH_B[1] - MOUTH_A[1]], el = Math.hypot(ea[0], ea[1]);
  for (let yy = 140; yy < 1010; yy += step) {
    for (let xx = 0; xx < IMG_W; xx += step) {
      const X = Math.min(IMG_W - 1, Math.round(xx + (Math.random() - 0.5) * step)), Y = Math.min(IMG_H - 1, Math.round(yy + (Math.random() - 0.5) * step));
      const o = (Y * IMG_W + X) * 4, r = px[o] / 255, g = px[o + 1] / 255, b = px[o + 2] / 255;
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      if (lum < 0.045 || Math.random() > 0.35 + lum * 1.8) continue;
      const dz = dep[(Math.floor(Y / IMG_H * dh) * dw + Math.floor(X / IMG_W * dw)) * 4] / 255;
      const z = dz * 140 + lum * 30 + (Math.random() - 0.5) * 4;
      // jaw weight: below the mouth line and inside the jaw area
      const sd = (-(X - MOUTH_A[0]) * ea[1] + (Y - MOUTH_A[1]) * ea[0]) / el;
      const q = Math.hypot((X - JAW_C[0]) / JAW_R[0], (Y - JAW_C[1]) / JAW_R[1]);
      const jw = (sd > 1 ? Math.min(1, sd / 4) : 0) * (q < 1.05 ? Math.min(1, (1.05 - q) / 0.3) : 0) * (X > MOUTH_A[0] - 30 ? 1 : 0);
      P.push(X, Y, z); Cc.push(r, g, b); I.push(jw, Math.random());
    }
  }
  return { P: new Float32Array(P), C: new Float32Array(Cc), I: new Float32Array(I) };
}
function attr(name, data, size) {
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
}
function init(img) {
  canvas = document.createElement('canvas'); canvas.className = 'lucy-gl';
  gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl');
  prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const pts = buildPoints(img); count = pts.P.length / 3;
  attr('pos', pts.P, 3); attr('col', pts.C, 3); attr('info', pts.I, 2);
  ['view', 't', 'mouth', 'nod', 'turn', 'glow', 'listen', 'think', 'build', 'dpr'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
  ready = true;
  addEventListener('pointermove', (e) => { pointer = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2]; }, { passive: true });
}
function frame(now) {
  raf = 0;
  if (!canvas || !canvas.isConnected || document.hidden) return;
  const t = (now - start) / 1000;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
  const speaking = state === 'speaking';
  if (speaking) {
    if (now > syllTimer) {
      const open = mouthT < 0.3;
      mouthT = open ? 0.45 + Math.random() * 0.55 : Math.random() * 0.12;
      syllTimer = now + (open ? 70 + Math.random() * 70 : 45 + Math.random() * 60);
      if (now - lastWord > 900 && Math.random() < 0.12) { mouthT = 0; syllTimer = now + 140; }
    }
  } else mouthT = 0;
  mouth += (mouthT - mouth) * (mouthT > mouth ? 0.55 : 0.35);
  nodKick *= 0.9;
  const nodTarget = (speaking ? 0.016 * Math.sin(t * 2.3) + 0.007 * Math.sin(t * 5.1) : 0.008 * Math.sin(t * 0.55)) + nodKick;
  nodV += (nodTarget - nodV) * 0.12;
  glowV += ((speaking ? 1 : state === 'thinking' ? 0.5 : 0.12) - glowV) * 0.06;
  listenV += ((state === 'listening' ? 1 : 0) - listenV) * 0.08;
  thinkV += ((state === 'thinking' ? 1 : 0) - thinkV) * 0.05;
  const turn = [Math.sin(t * 0.33) * 0.22 + pointer[0] * 0.18 + (speaking ? Math.sin(t * 1.7) * 0.04 : 0), Math.sin(t * 0.27 + 1) * 0.07 + pointer[1] * 0.08];
  const build = Math.min(1, (now - buildStart) / 2200);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(uni.view, canvas.width, canvas.height); gl.uniform1f(uni.t, t); gl.uniform1f(uni.dpr, dpr);
  gl.uniform1f(uni.mouth, Math.max(0, mouth)); gl.uniform1f(uni.nod, nodV); gl.uniform2f(uni.turn, turn[0], turn[1]);
  gl.uniform1f(uni.glow, glowV); gl.uniform1f(uni.listen, listenV); gl.uniform1f(uni.think, thinkV); gl.uniform1f(uni.build, build);
  gl.drawArrays(gl.POINTS, 0, count);
  const wave = document.querySelector('.lucy-wave');
  if (wave) wave.style.setProperty('--amp', (0.1 + mouth * 0.9 * (speaking ? 1 : 0) + listenV * 0.35 + thinkV * 0.2).toFixed(3));
  raf = requestAnimationFrame(frame);
}
function kick() { if (!raf && ready && canvas && canvas.isConnected) raf = requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', kick);

onWord(() => { lastWord = performance.now(); mouthT = 0.7 + Math.random() * 0.3; syllTimer = lastWord + 90; nodKick += (Math.random() - 0.4) * 0.014; });

function attach(container) {
  container.appendChild(canvas); container.classList.add('gl-on');
  buildStart = performance.now(); kick();
}
// Mount into the Lucy stage. Returns false if the hologram is unavailable.
export function mountLucy(container, src) {
  if (failed || !container) return false;
  if (ready) { if (canvas.parentNode !== container) attach(container); else kick(); return true; }
  if (mountLucy.loading) return true;
  mountLucy.loading = true;
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    try { init(img); } catch (e) { failed = true; console.warn('Lucy hologram off:', e.message); return; }
    const live = document.querySelector('.lucy-stage .lucy-holo');
    if (live) attach(live);
  };
  img.src = src;
  return true;
}
export function setLucyState(s) { state = s || 'idle'; if (state === 'speaking') syllTimer = 0; kick(); }
export function lucyMouth() { return mouth; }
