package in.hivenow.seller;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Custom Capacitor Plugin exposed to seller.hivenow.in JavaScript.
 * Allows the remote web app running inside the WebView to fetch the device's
 * native FCM push token.
 */
@CapacitorPlugin(name = "FcmToken")
public class FcmTokenPlugin extends Plugin {

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    call.reject("Failed to fetch FCM token", task.getException());
                    return;
                }

                String token = task.getResult();
                JSObject ret = new JSObject();
                ret.put("token", token);
                ret.put("isNativeBridge", true);
                call.resolve(ret);
            });
    }
}
