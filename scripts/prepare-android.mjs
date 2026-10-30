// Applies Lucy's icons, splash and permissions to the generated Android project.
import fs from 'fs';
import path from 'path';

const RES = 'android/app/src/main/res';
const SRC = 'resources/android/res';

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// 1) remove default splash images so ours is used
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f === 'splash.png') fs.unlinkSync(p);
  }
}
walk(RES);

// 2) icons, notification icon, splash
copyDir(SRC, RES);

// 3) colors
const colorFile = path.join(RES, 'values', 'ic_launcher_background.xml');
fs.writeFileSync(colorFile, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FF5A6E</color>
    <color name="lucy_splash_bg">#0E0D12</color>
</resources>
`);

// 4) exact alarms (reminder apps may use USE_EXACT_ALARM; no prompt needed)
const mf = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(mf, 'utf8');
const perms = ['android.permission.USE_EXACT_ALARM', 'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.POST_NOTIFICATIONS', 'android.permission.VIBRATE'];
for (const p of perms) {
  if (!m.includes(p)) m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
fs.writeFileSync(mf, m);

console.log('✅ Lucy Android resources applied');

// 5) version number from the GitHub build number, so each build installs as an update
const run = Number(process.env.GITHUB_RUN_NUMBER || 1);
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
g = g.replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.0.${run}"`);
fs.writeFileSync(gradle, g);
console.log('✅ Version 1.0.' + run);
