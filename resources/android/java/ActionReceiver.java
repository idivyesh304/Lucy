package com.dzynlab.lucy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

/** Handles the Done / Snooze buttons on a notification, without opening the app. */
public class ActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Context c = context.getApplicationContext();
        int notifId = intent.getIntExtra("notifId", 0);
        String act = intent.getStringExtra("act");
        NotificationManagerCompat.from(c).cancel(notifId); // stops ringing / vibration
        try {
            JSONObject a = new JSONObject(intent.getStringExtra("payload"));
            String group = a.optString("group");
            AlarmStore.cancelGroup(c, group); // stop the follow-up nags for this item

            long now = System.currentTimeMillis();
            JSONObject action = new JSONObject();
            action.put("act", act);
            action.put("t", now);
            action.put("extra", a.optJSONObject("extra"));

            if ("snooze".equals(act)) {
                boolean pay = "PAY".equals(a.optString("actions"));
                long until = pay ? now + 20L * 60 * 60 * 1000 : now + a.optInt("snoozeMin", 10) * 60000L;
                if (!pay) {
                    JSONObject again = new JSONObject(a.toString());
                    again.put("id", 900000 + (int) ((now / 1000) % 90000));
                    again.put("at", until);
                    again.put("title", "😴 " + a.optString("title"));
                    AlarmStore.add(c, again);
                }
                action.put("until", until);
            }
            AlarmStore.pushAction(c, action);
            LucyAlarmPlugin.ping();
        } catch (Exception ignored) { }
    }
}
