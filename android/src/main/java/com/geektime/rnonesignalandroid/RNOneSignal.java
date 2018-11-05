package com.geektime.rnonesignalandroid;

import java.util.Iterator;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Promise;
import com.onesignal.OSPermissionState;
import com.onesignal.OSPermissionSubscriptionState;
import com.onesignal.OSSubscriptionState;
import com.onesignal.OSEmailSubscriptionState;
import com.onesignal.OneSignal;
import com.onesignal.OneSignal.EmailUpdateHandler;
import com.onesignal.OneSignal.EmailUpdateError;

import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;


/**
* Created by Avishay on 1/31/16.
*/
public class RNOneSignal extends ReactContextBaseJavaModule implements LifecycleEventListener {
   public static final String NOTIFICATION_OPENED_INTENT_FILTER = "GTNotificationOpened";
   public static final String NOTIFICATION_RECEIVED_INTENT_FILTER = "GTNotificationReceived";
   public static final String HIDDEN_MESSAGE_KEY = "hidden";

   private ReactApplicationContext mReactApplicationContext;
   private ReactContext mReactContext;
   private boolean oneSignalInitDone;
   private boolean registeredEvents = false;

   //ensure only one callback exists at a given time due to react-native restriction
   private Callback pendingGetTagsCallback;

   public RNOneSignal(ReactApplicationContext reactContext) {
      super(reactContext);
      mReactApplicationContext = reactContext;
      mReactContext = reactContext;
      mReactContext.addLifecycleEventListener(this);
      initOneSignal();
   }

   private String appIdFromManifest(ReactApplicationContext context) {
      try {
         ApplicationInfo ai = context.getPackageManager().getApplicationInfo(context.getPackageName(), context.getPackageManager().GET_META_DATA);
         Bundle bundle = ai.metaData;
         return bundle.getString("onesignal_app_id");
      } catch (Throwable t) {
         t.printStackTrace();
         return null;
      }
   }

   // Initialize OneSignal only once when an Activity is available.
   // React creates an instance of this class to late for OneSignal to get the current Activity
   // based on registerActivityLifecycleCallbacks it uses to listen for the first Activity.
   // However it seems it is also to soon to call getCurrentActivity() from the reactContext as well.
   // This will normally succeed when onHostResume fires instead.
   private void initOneSignal() {
      // Uncomment to debug init issues.
      // OneSignal.setLogLevel(OneSignal.LOG_LEVEL.VERBOSE, OneSignal.LOG_LEVEL.ERROR);

      if (!registeredEvents) {
         registeredEvents = true;
         registerNotificationsOpenedNotification();
         registerNotificationsReceivedNotification();
      }

      OneSignal.sdkType = "react";

      String appId = appIdFromManifest(mReactApplicationContext);

      if (appId != null && appId.length() > 0) {
         init(appId);
      }
   }

   private void sendEvent(String eventName, Object params) {
      mReactContext
               .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
               .emit(eventName, params);
   }

   private JSONObject jsonFromErrorMessageString(String errorMessage) throws JSONException {
      return new JSONObject().put("error", errorMessage);
   }

   @ReactMethod 
   public void init(String appId) {
      Context context = mReactApplicationContext.getCurrentActivity();

      if (oneSignalInitDone) {
         Log.e("onesignal", "Already initialized the OneSignal React-Native SDK");
         return;
      }

      oneSignalInitDone = true;

      OneSignal.sdkType = "react";
      
      if (context == null) {
         // in some cases, especially when react-native-navigation is installed,
         // the activity can be null, so we can initialize with the context instead
         context = mReactApplicationContext.getApplicationContext();
      }

      OneSignal.init(context,
              null,
              appId,
              new NotificationOpenedHandler(mReactContext),
              new NotificationReceivedHandler(mReactContext)
      );
   }

   @ReactMethod
   public void sendTag(String key, String value) {
      OneSignal.sendTag(key, value);
   }

   @ReactMethod
   public void sendTags(ReadableMap tags) {
      OneSignal.sendTags(RNUtils.readableMapToJson(tags));
   }

   @ReactMethod
   public void getTags(final Callback callback) {
      if (pendingGetTagsCallback == null) 
         pendingGetTagsCallback = callback;
      
      OneSignal.getTags(new OneSignal.GetTagsHandler() {
         @Override
         public void tagsAvailable(JSONObject tags) {
               if (pendingGetTagsCallback != null) 
                  pendingGetTagsCallback.invoke(RNUtils.jsonToWritableMap(tags));

               pendingGetTagsCallback = null;
         }
      });
   }

   @ReactMethod 
   public void setUnauthenticatedEmail(String email, final Callback callback) {
      OneSignal.setEmail(email, null, new OneSignal.EmailUpdateHandler() {
         @Override
         public void onSuccess() {
               callback.invoke();
         }

         @Override
         public void onFailure(EmailUpdateError error) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(jsonFromErrorMessageString(error.getMessage())));
               } catch (JSONException exception) {
                  exception.printStackTrace();
               }
         }
      });
   }

   @ReactMethod 
   public void setEmail(String email, String emailAuthToken, final Callback callback) {
      OneSignal.setEmail(email, emailAuthToken, new EmailUpdateHandler() {
         @Override
         public void onSuccess() {
               callback.invoke();
         }

         @Override
         public void onFailure(EmailUpdateError error) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(jsonFromErrorMessageString(error.getMessage())));
               } catch (JSONException exception) {
                  exception.printStackTrace();
               }
         }
      });
   }

   @ReactMethod
   public void logoutEmail(final Callback callback) {
      OneSignal.logoutEmail(new EmailUpdateHandler() {
         @Override
         public void onSuccess() {
               callback.invoke();
         }

         @Override
         public void onFailure(EmailUpdateError error) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(jsonFromErrorMessageString(error.getMessage())));
               } catch (JSONException exception) {
                  exception.printStackTrace();
               }
         }
      });
   }

   @ReactMethod
   public void configure() {
      OneSignal.idsAvailable(new OneSignal.IdsAvailableHandler() {
         public void idsAvailable(String userId, String registrationId) {
               final WritableMap params = Arguments.createMap();

               params.putString("userId", userId);
               params.putString("pushToken", registrationId);

               sendEvent("OneSignal-idsAvailable", params);
         }
      });
   }

   @ReactMethod
   public void getPermissionSubscriptionState(final Callback callback) {
      OSPermissionSubscriptionState state = OneSignal.getPermissionSubscriptionState();

      if (state == null)
         return;

      OSPermissionState permissionState = state.getPermissionStatus();
      OSSubscriptionState subscriptionState = state.getSubscriptionStatus();
      OSEmailSubscriptionState emailSubscriptionState = state.getEmailSubscriptionStatus();

      // Notifications enabled for app? (Android Settings)
      boolean notificationsEnabled = permissionState.getEnabled();

      // User subscribed to OneSignal? (automatically toggles with notificationsEnabled)
      boolean subscriptionEnabled = subscriptionState.getSubscribed();

      // User's original subscription preference (regardless of notificationsEnabled)
      boolean userSubscriptionEnabled = subscriptionState.getUserSubscriptionSetting();

      try {
         JSONObject result = new JSONObject();

         result.put("notificationsEnabled", String.valueOf(notificationsEnabled))
                 .put("subscriptionEnabled", String.valueOf(subscriptionEnabled))
                 .put("userSubscriptionEnabled", String.valueOf(userSubscriptionEnabled))
                 .put("pushToken", subscriptionState.getPushToken())
                 .put("userId", subscriptionState.getUserId())
                 .put("emailUserId", emailSubscriptionState.getEmailUserId())
                 .put("emailAddress", emailSubscriptionState.getEmailAddress());

         Log.d("onesignal", "permission subscription state: " + result.toString());

         callback.invoke(RNUtils.jsonToWritableMap(result));
      } catch (JSONException e) {
         e.printStackTrace();
      }
   }

   @ReactMethod
   public void inFocusDisplaying(int displayOption) {
      OneSignal.setInFocusDisplaying(displayOption);
   }

   @ReactMethod
   public void deleteTag(String key) {
      OneSignal.deleteTag(key);
   }

   @ReactMethod
   public void enableVibrate(Boolean enable) {
      OneSignal.enableVibrate(enable);
   }

   @ReactMethod
   public void enableSound(Boolean enable) {
      OneSignal.enableSound(enable);
   }

   @ReactMethod
   public void setSubscription(Boolean enable) {
      OneSignal.setSubscription(enable);
   }

   @ReactMethod
   public void promptLocation() {
      OneSignal.promptLocation();
   }

   @ReactMethod
   public void syncHashedEmail(String email) {
      OneSignal.syncHashedEmail(email);
   }

   @ReactMethod
   public void setLogLevel(int logLevel, int visualLogLevel) {
      OneSignal.setLogLevel(logLevel, visualLogLevel);
   }

   @ReactMethod
   public void setLocationShared(Boolean shared) {
      OneSignal.setLocationShared(shared);
   }

   @ReactMethod
   public void postNotification(String contents, String data, String playerId, String otherParameters) {
      try {
         JSONObject postNotification = new JSONObject();
         postNotification.put("contents", new JSONObject(contents));

         if (playerId != null) {
            JSONArray playerIds = new JSONArray();
            playerIds.put(playerId);
            postNotification.put("include_player_ids", playerIds);
         }

         if (data != null) {
            JSONObject additionalData = new JSONObject();
            additionalData.put("p2p_notification", new JSONObject(data));
            postNotification.put("data", additionalData);
         }

         if (otherParameters != null && !otherParameters.trim().isEmpty()) {
               JSONObject parametersJson = new JSONObject(otherParameters.trim());
               Iterator<String> keys = parametersJson.keys();
               while (keys.hasNext()) {
                  String key = keys.next();
                  postNotification.put(key, parametersJson.get(key));
               }

               if (parametersJson.has(HIDDEN_MESSAGE_KEY) && parametersJson.getBoolean(HIDDEN_MESSAGE_KEY)) {
                  postNotification.getJSONObject("data").put(HIDDEN_MESSAGE_KEY, true);
               }
         }

         OneSignal.postNotification(
               postNotification,
               new OneSignal.PostNotificationResponseHandler() {
                  @Override
                  public void onSuccess(JSONObject response) {
                     Log.i("OneSignal", "postNotification Success: " + response.toString());
                  }

                  @Override
                  public void onFailure(JSONObject response) {
                     Log.e("OneSignal", "postNotification Failure: " + response.toString());
                  }
               }
         );
      } catch (JSONException e) {
         e.printStackTrace();
      }
   }

   @ReactMethod
   public void clearOneSignalNotifications() {
      OneSignal.clearOneSignalNotifications();
   }

   @ReactMethod
   public void cancelNotification(int id) {
      OneSignal.cancelNotification(id);
   }

   @ReactMethod
   public void setRequiresUserPrivacyConsent(Boolean required) {
      OneSignal.setRequiresUserPrivacyConsent(required);
   }

   @ReactMethod 
   public void provideUserConsent(Boolean granted) {
      OneSignal.provideUserConsent(granted);
   }

   @ReactMethod
   public void userProvidedPrivacyConsent(Promise promise) {
      promise.resolve(OneSignal.userProvidedPrivacyConsent());
   }

   private void registerNotificationsReceivedNotification() {
      IntentFilter intentFilter = new IntentFilter(NOTIFICATION_RECEIVED_INTENT_FILTER);
      mReactContext.registerReceiver(new BroadcastReceiver() {
         @Override
         public void onReceive(Context context, Intent intent) {
               notifyNotificationReceived(intent.getExtras());
         }
      }, intentFilter);
   }

   private void registerNotificationsOpenedNotification() {
      IntentFilter intentFilter = new IntentFilter(NOTIFICATION_OPENED_INTENT_FILTER);
      mReactContext.registerReceiver(new BroadcastReceiver() {
         @Override
         public void onReceive(Context context, Intent intent) {
               notifyNotificationOpened(intent.getExtras());
         }
      }, intentFilter);
   }

   private void notifyNotificationReceived(Bundle bundle) {
      try {
         JSONObject jsonObject = new JSONObject(bundle.getString("notification"));
         sendEvent("OneSignal-remoteNotificationReceived", RNUtils.jsonToWritableMap(jsonObject));
      } catch(Throwable t) {
         t.printStackTrace();
      }
   }

   private void notifyNotificationOpened(Bundle bundle) {
      try {
         JSONObject jsonObject = new JSONObject(bundle.getString("result"));
         sendEvent("OneSignal-remoteNotificationOpened",  RNUtils.jsonToWritableMap(jsonObject));
      } catch(Throwable t) {
         t.printStackTrace();
      }
   }

   @Override
   public String getName() {
      return "OneSignal";
   }

   @Override
   public void onHostDestroy() {
      OneSignal.removeNotificationOpenedHandler();
      OneSignal.removeNotificationReceivedHandler();
      this.registeredEvents = false;
   }

   @Override
   public void onHostPause() {

   }

   @Override
   public void onHostResume() {
      initOneSignal();
   }

}
