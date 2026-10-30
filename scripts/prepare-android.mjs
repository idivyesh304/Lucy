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
    <color name="ic_launcher_background">#3A86FF</color>
    <color name="lucy_splash_bg">#F6F3FF</color>
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

// 5) Lucy's native alarm + voice engine
const JAVA_DIR = 'android/app/src/main/java/com/dzynlab/lucy';
fs.mkdirSync(JAVA_DIR, { recursive: true });
for (const f of fs.readdirSync('resources/android/java')) fs.copyFileSync(path.join('resources/android/java', f), path.join(JAVA_DIR, f));
let man = fs.readFileSync(mf, 'utf8');
const receivers = `
        <receiver android:name=".AlarmReceiver" android:exported="false" />
        <receiver android:name=".ActionReceiver" android:exported="false" />
        <receiver android:name=".BootReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
        </receiver>
    </application>`;
if (!man.includes('.AlarmReceiver')) man = man.replace('</application>', receivers.trimStart());
for (const p of ['android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.WAKE_LOCK', 'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS']) {
  if (!man.includes(p)) man = man.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
fs.writeFileSync(mf, man);
const appGradle = 'android/app/build.gradle';
let ag = fs.readFileSync(appGradle, 'utf8');
if (!ag.includes('androidx.core:core:')) ag = ag.replace(/dependencies \{/, 'dependencies {\n    implementation "androidx.core:core:$androidxCoreVersion"');
fs.writeFileSync(appGradle, ag);
console.log('✅ Alarm engine added');

// 6) version number from the GitHub build number, so each build installs as an update
const run = Number(process.env.GITHUB_RUN_NUMBER || 1);
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
g = g.replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.0.${run}"`);
fs.writeFileSync(gradle, g);
console.log('✅ Version 1.0.' + run);
