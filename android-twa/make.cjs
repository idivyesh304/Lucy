// Generates the Lucy Android app (a Trusted Web Activity: Lucy running inside Chrome,
// so notifications, voice and Drive sync work exactly like the installed web app).
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');
(async () => {
  const url = 'https://idivyesh304.github.io/Lucy/manifest.webmanifest';
  const m = await TwaManifest.fromWebManifest(url);
  m.packageId = 'com.dzynlab.lucy';
  m.name = 'Lucy'; m.launcherName = 'Lucy';
  m.host = 'idivyesh304.github.io';
  m.startUrl = '/Lucy/';
  m.themeColor = m.navigationColor = m.navigationColorDark = m.backgroundColor = '#0B0D14';
  m.display = 'standalone';
  m.orientation = 'portrait';
  m.enableNotifications = true;
  m.fallbackType = 'customtabs';
  m.appVersionCode = Number(process.env.VERSION_CODE || 300);
  m.appVersionName = '3.0.' + (process.env.VERSION_CODE || 0);
  m.signingKey = { path: '../resources/android/lucy-debug.keystore', alias: 'androiddebugkey' };
  await new TwaGenerator().createTwaProject(process.argv[2], m, new ConsoleLog('lucy'));
  await m.saveToFile(process.argv[2] + '/twa-manifest.json');
})().catch((e) => { console.error(e); process.exit(1); });
