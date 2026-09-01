package in.hivenow.seller;

import android.content.Intent;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

/**
 * Custom Capacitor Plugin for native 1-Tap Google Sign-In on Android.
 * Launches Google Play Services native bottom sheet account picker,
 * returns the Google idToken to the remote web app for Firebase authentication.
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    private static final String TAG = "GoogleAuthPlugin";
    private static final String DEFAULT_WEB_CLIENT_ID = "455960950280-4j2vtj68vnbn87pk1tcnm5ese67ct869.apps.googleusercontent.com";

    private GoogleSignInClient googleSignInClient;

    private GoogleSignInClient getClient(String serverClientId) {
        String clientId = (serverClientId != null && !serverClientId.isEmpty()) ? serverClientId : DEFAULT_WEB_CLIENT_ID;
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(clientId)
                .requestEmail()
                .build();
        return GoogleSignIn.getClient(getActivity(), gso);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId", DEFAULT_WEB_CLIENT_ID);
        googleSignInClient = getClient(serverClientId);

        // Sign out previous cached session so the device account chooser is always shown
        googleSignInClient.signOut().addOnCompleteListener(task -> {
            Intent signInIntent = googleSignInClient.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleSignInResult");
        });
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (account != null) {
                JSObject ret = new JSObject();
                ret.put("idToken", account.getIdToken());
                ret.put("email", account.getEmail());
                ret.put("displayName", account.getDisplayName());
                ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
                ret.put("isNativeBridge", true);
                call.resolve(ret);
            } else {
                call.reject("Google Sign-In failed: Account is null");
            }
        } catch (ApiException e) {
            Log.e(TAG, "Google Sign-In ApiException: statusCode=" + e.getStatusCode(), e);
            if (e.getStatusCode() == 12501) { // SIGN_IN_CANCELLED
                call.reject("Sign-in was cancelled by user", "auth/popup-closed-by-user");
            } else if (e.getStatusCode() == 10) {
                call.reject("Google Sign-In Developer Error (code 10): Ensure SHA-1 fingerprint is added in Firebase Console.", "DEVELOPER_ERROR");
            } else {
                call.reject("Google Sign-In failed: " + e.getMessage() + " (code " + e.getStatusCode() + ")");
            }
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        if (googleSignInClient == null) {
            googleSignInClient = getClient(DEFAULT_WEB_CLIENT_ID);
        }
        googleSignInClient.signOut().addOnCompleteListener(task -> {
            call.resolve();
        });
    }
}
