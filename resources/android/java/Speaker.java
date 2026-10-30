package com.dzynlab.lucy;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import java.util.Locale;

/** Lucy's voice, using the phone's built-in text-to-speech. */
public class Speaker {
    static void speak(Context context, String text, final Runnable done) {
        final Context c = context.getApplicationContext();
        final Handler main = new Handler(Looper.getMainLooper());
        final boolean[] finished = {false};
        final TextToSpeech[] holder = new TextToSpeech[1];

        final Runnable finish = () -> {
            if (finished[0]) return;
            finished[0] = true;
            try { if (holder[0] != null) holder[0].shutdown(); } catch (Exception ignored) { }
            if (done != null) done.run();
        };

        main.post(() -> {
            holder[0] = new TextToSpeech(c, status -> {
                if (status != TextToSpeech.SUCCESS || holder[0] == null) {
                    main.post(finish);
                    return;
                }
                TextToSpeech tts = holder[0];
                int r = tts.setLanguage(new Locale("en", "IN"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.UK);
                tts.setSpeechRate(0.95f);
                tts.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build());
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) { }
                    @Override public void onDone(String utteranceId) { main.post(finish); }
                    @Override public void onError(String utteranceId) { main.post(finish); }
                });
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), "lucy");
            });
        });
        main.postDelayed(finish, 15000); // never block the alarm for long
    }
}
