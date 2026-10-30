package com.dzynlab.lucy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;

import org.json.JSONObject;

/** Fires when an alarm time arrives: Lucy speaks (if enabled), then shows the notification. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final Context c = context.getApplicationContext();
        int id = intent.getIntExtra("id", -1);
        final JSONObject a = AlarmStore.take(c, id);
        if (a == null) return;

        String speech = a.optString("speech", "");
        AudioManager audio = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        boolean ringerOn = audio != null && audio.getRingerMode() == AudioManager.RINGER_MODE_NORMAL;

        if (!speech.isEmpty() && ringerOn && AlarmStore.speakEnabled(c)) {
            final PendingResult pending = goAsync();
            Speaker.speak(c, speech, () -> {
                AlarmStore.show(c, a);
                pending.finish();
            });
        } else {
            AlarmStore.show(c, a);
        }
    }
}
