package com.dzynlab.lucy;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** Stores, schedules and shows Lucy's alarms. */
public class AlarmStore {
    static final String PREF = "lucy_alarms";
    static final String KEY_ALARMS = "alarms";
    static final String KEY_ACTIONS = "actions";
    static final String KEY_SPEAK = "speak";
    static final String ACTION_FIRE = "com.dzynlab.lucy.ALARM_FIRE";

    static final String CH_ALARM = "lucy_alarm_v2";
    static final String CH_REMIND = "lucy_remind_v2";
    static final String CH_QUIET = "lucy_quiet_v2";
    static final int COLOR = 0xFF7C5CFF;

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    static synchronized JSONObject all(Context c) {
        try {
            return new JSONObject(prefs(c).getString(KEY_ALARMS, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static synchronized void saveAll(Context c, JSONObject o) {
        prefs(c).edit().putString(KEY_ALARMS, o.toString()).apply();
    }

    static void setSpeakEnabled(Context c, boolean on) {
        prefs(c).edit().putBoolean(KEY_SPEAK, on).apply();
    }

    static boolean speakEnabled(Context c) {
        return prefs(c).getBoolean(KEY_SPEAK, true);
    }

    /* ---------------- scheduling ---------------- */

    static PendingIntent firePi(Context c, int id, int extraFlags) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction(ACTION_FIRE);
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, id, i, extraFlags | PendingIntent.FLAG_IMMUTABLE);
    }

    static synchronized void replaceAll(Context c, JSONArray list) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONObject old = all(c);
        Iterator<String> keys = old.keys();
        while (keys.hasNext()) {
            try {
                int id = Integer.parseInt(keys.next());
                PendingIntent pi = firePi(c, id, PendingIntent.FLAG_NO_CREATE);
                if (pi != null) { am.cancel(pi); pi.cancel(); }
            } catch (Exception ignored) { }
        }
        JSONObject fresh = new JSONObject();
        long now = System.currentTimeMillis();
        for (int k = 0; k < list.length(); k++) {
            JSONObject a = list.optJSONObject(k);
            if (a == null) continue;
            if (a.optLong("at") <= now) continue;
            try {
                fresh.put(String.valueOf(a.optInt("id")), a);
                arm(c, am, a);
            } catch (Exception ignored) { }
        }
        saveAll(c, fresh);
    }

    static synchronized void add(Context c, JSONObject a) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONObject o = all(c);
        try {
            o.put(String.valueOf(a.optInt("id")), a);
            arm(c, am, a);
        } catch (Exception ignored) { }
        saveAll(c, o);
    }

    static synchronized JSONObject take(Context c, int id) {
        JSONObject o = all(c);
        JSONObject a = o.optJSONObject(String.valueOf(id));
        o.remove(String.valueOf(id));
        saveAll(c, o);
        return a;
    }

    static synchronized void cancelGroup(Context c, String group) {
        if (group == null || group.isEmpty()) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONObject o = all(c);
        List<String> remove = new ArrayList<>();
        Iterator<String> keys = o.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            JSONObject a = o.optJSONObject(k);
            if (a != null && group.equals(a.optString("group"))) remove.add(k);
        }
        for (String k : remove) {
            try {
                PendingIntent pi = firePi(c, Integer.parseInt(k), PendingIntent.FLAG_NO_CREATE);
                if (pi != null) { am.cancel(pi); pi.cancel(); }
            } catch (Exception ignored) { }
            o.remove(k);
        }
        saveAll(c, o);
    }

    static synchronized void rescheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        JSONObject o = all(c);
        long now = System.currentTimeMillis();
        List<String> remove = new ArrayList<>();
        Iterator<String> keys = o.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            JSONObject a = o.optJSONObject(k);
            if (a == null || a.optLong("at") <= now) { remove.add(k); continue; }
            try { arm(c, am, a); } catch (Exception ignored) { }
        }
        for (String k : remove) o.remove(k);
        saveAll(c, o);
    }

    private static void arm(Context c, AlarmManager am, JSONObject a) {
        int id = a.optInt("id");
        long at = a.optLong("at");
        PendingIntent pi = firePi(c, id, PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exactOk = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exactOk && a.optBoolean("insistent")) {
            Intent open = new Intent(c, MainActivity.class);
            PendingIntent show = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
        } else if (exactOk) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    /* ---------------- actions queue (read by the app) ---------------- */

    static synchronized void pushAction(Context c, JSONObject action) {
        try {
            JSONArray arr = new JSONArray(prefs(c).getString(KEY_ACTIONS, "[]"));
            arr.put(action);
            prefs(c).edit().putString(KEY_ACTIONS, arr.toString()).apply();
        } catch (Exception ignored) { }
    }

    static synchronized String takeActions(Context c) {
        String s = prefs(c).getString(KEY_ACTIONS, "[]");
        prefs(c).edit().putString(KEY_ACTIONS, "[]").apply();
        return s;
    }

    /* ---------------- notifications ---------------- */

    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        long[] longBuzz = new long[]{0, 900, 400, 900, 400, 900};

        if (nm.getNotificationChannel(CH_ALARM) == null) {
            NotificationChannel ch = new NotificationChannel(CH_ALARM, "Ring until stopped", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Wake-up, work reminders and meetings. Rings and vibrates until you tap Done or Snooze.");
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ch.setSound(sound, attrs);
            ch.enableVibration(true);
            ch.setVibrationPattern(longBuzz);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.enableLights(true);
            ch.setLightColor(COLOR);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_REMIND) == null) {
            NotificationChannel ch = new NotificationChannel(CH_REMIND, "Reminders", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Routine reminders like water, coffee and meals.");
            ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), attrs);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 500, 250, 500});
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_QUIET) == null) {
            NotificationChannel ch = new NotificationChannel(CH_QUIET, "Briefings and check-ins", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Morning briefing, Top 5 check-ins, journal and weekly review.");
            nm.createNotificationChannel(ch);
        }
    }

    static void show(Context c, JSONObject a) {
        ensureChannels(c);
        if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        int id = a.optInt("id");
        boolean insistent = a.optBoolean("insistent");
        String channel = insistent ? CH_ALARM : ("quiet".equals(a.optString("channel")) ? CH_QUIET : CH_REMIND);
        String title = a.optString("title", "Lucy");
        String body = a.optString("body", "");

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel)
                .setSmallIcon(R.drawable.ic_stat_lucy)
                .setColor(COLOR)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(insistent ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
                .setCategory(insistent ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(openPi);

        String type = a.optString("actions", "");
        if (!type.isEmpty()) {
            String doneLabel = "PAY".equals(type) ? "✅ Settled" : "✅ Done";
            String snoozeLabel = "PAY".equals(type) ? "⏰ Tomorrow" : "⏰ Snooze " + a.optInt("snoozeMin", 10) + "m";
            b.addAction(0, doneLabel, actionPi(c, id, "done", a));
            b.addAction(0, snoozeLabel, actionPi(c, id, "snooze", a));
        }

        Notification n = b.build();
        if (insistent) n.flags |= Notification.FLAG_INSISTENT;
        try {
            NotificationManagerCompat.from(c).notify(id, n);
        } catch (SecurityException ignored) { }
    }

    private static PendingIntent actionPi(Context c, int id, String act, JSONObject a) {
        Intent i = new Intent(c, ActionReceiver.class);
        i.setAction("com.dzynlab.lucy.ACTION_" + act.toUpperCase());
        i.putExtra("notifId", id);
        i.putExtra("act", act);
        i.putExtra("payload", a.toString());
        int req = (id * 4 + ("done".equals(act) ? 1 : 2)) & 0x7fffffff;
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
