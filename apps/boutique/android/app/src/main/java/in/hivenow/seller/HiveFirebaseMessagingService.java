package in.hivenow.seller;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Native FCM service that receives push notifications even when the app is
 * completely closed or in the background. This is the critical piece that
 * enables "order alarm over other apps" functionality.
 *
 * Important: We use DATA-only messages (not notification messages) from the
 * backend so that this onMessageReceived handler ALWAYS fires, including
 * when the app is killed. Notification messages are auto-handled by the
 * system tray when the app is in the background, bypassing this handler.
 */
public class HiveFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "HiveFCM";
    private static final String CHANNEL_ID = "hive_urgent_orders";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM message received from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        if (data.isEmpty()) {
            Log.w(TAG, "Empty data payload, ignoring.");
            return;
        }

        String title = data.containsKey("title") ? data.get("title") : "🚨 New Order!";
        String body = data.containsKey("body") ? data.get("body") : "A new order has been placed.";
        String orderNumber = data.containsKey("orderNumber") ? data.get("orderNumber") : "";
        String netPayout = data.containsKey("netPayout") ? data.get("netPayout") : "";
        String url = data.containsKey("url") ? data.get("url") : "/boutique/orders";

        Log.d(TAG, "Order notification: " + title + " | " + body + " | payout=" + netPayout);

        // 1. Wake the screen
        wakeScreen();

        // 2. Play native alarm sound with USAGE_ALARM (loud ringtone)
        playNativeAlarm();

        // 3. Build and show the high-priority Heads-Up Notification with FullScreenIntent
        showOrderNotification(title, body, orderNumber, netPayout, url);

        // 4. If overlay permission is granted, immediately pop MainActivity over other apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && android.provider.Settings.canDrawOverlays(this)) {
            try {
                Intent popIntent = new Intent(this, MainActivity.class);
                popIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                popIntent.putExtra("orderUrl", url);
                popIntent.putExtra("orderNumber", orderNumber);
                startActivity(popIntent);
                Log.d(TAG, "Successfully launched MainActivity over other apps");
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch activity over other apps", e);
            }
        }
    }

    private void playNativeAlarm() {
        try {
            Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/order_alarm");
            android.media.MediaPlayer player = new android.media.MediaPlayer();
            player.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build()
            );
            player.setDataSource(this, soundUri);
            player.prepare();
            player.start();
            player.setOnCompletionListener(android.media.MediaPlayer::release);
        } catch (Exception e) {
            Log.e(TAG, "Failed to play native audio alarm", e);
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        // Token will be picked up by FcmTokenPlugin when the app opens next
        // For immediate registration, we could use a SharedPreferences approach
        getSharedPreferences("hive_fcm", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .putBoolean("token_needs_sync", true)
                .apply();
    }

    private void wakeScreen() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isInteractive()) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK |
                        PowerManager.ACQUIRE_CAUSES_WAKEUP |
                        PowerManager.ON_AFTER_RELEASE,
                        "hive:orderAlarmWake"
                );
                wakeLock.acquire(10 * 1000L); // 10 seconds
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to acquire wake lock", e);
        }
    }

    private void showOrderNotification(String title, String body, String orderNumber, String netPayout, String url) {
        ensureNotificationChannel();

        // Intent to open the app when notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("orderUrl", url);
        intent.putExtra("orderNumber", orderNumber);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Custom sound URI (same as the notification channel)
        Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/order_alarm");

        // Build the notification body with payout info
        String notifBody = body;
        if (netPayout != null && !netPayout.isEmpty()) {
            try {
                double payout = Double.parseDouble(netPayout);
                notifBody += String.format("\n💰 Net Payout: ₹%.2f", payout);
            } catch (NumberFormatException ignored) {}
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(notifBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(notifBody))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500, 200, 1000, 300, 500})
                .setFullScreenIntent(pendingIntent, true); // High-priority heads-up + screen wake

        // Use unique notification ID based on order number
        int notifId = orderNumber != null && !orderNumber.isEmpty()
                ? orderNumber.hashCode()
                : (int) System.currentTimeMillis();

        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(notifId, builder.build());
            Log.d(TAG, "Notification posted with ID: " + notifId);
        }
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Urgent Order Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Loud ringtone notifications for incoming orders");
                channel.enableLights(true);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500, 200, 1000, 300, 500});
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

                Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/order_alarm");
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                channel.setSound(soundUri, audioAttributes);

                manager.createNotificationChannel(channel);
            }
        }
    }
}
