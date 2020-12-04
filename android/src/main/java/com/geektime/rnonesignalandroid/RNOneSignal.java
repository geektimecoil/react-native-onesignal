package com.geektime.rnonesignalandroid;

import java.util.Iterator;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.content.pm.ApplicationInfo;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Promise;
import com.onesignal.OSInAppMessageAction;
import com.onesignal.OSPermissionState;
import com.onesignal.OSPermissionSubscriptionState;
import com.onesignal.OSSubscriptionState;
import com.onesignal.OSEmailSubscriptionState;
import com.onesignal.OneSignal;
import com.onesignal.OneSignal.EmailUpdateHandler;
import com.onesignal.OneSignal.EmailUpdateError;
import com.onesignal.OneSignal.OSExternalUserIdUpdateCompletionHandler;
import com.onesignal.OneSignal.OutcomeCallback;

import com.onesignal.OneSignal.InAppMessageClickHandler;
import com.onesignal.OneSignal.NotificationOpenedHandler;
import com.onesignal.OneSignal.NotificationReceivedHandler;
import com.onesignal.OSNotificationOpenResult;
import com.onesignal.OSNotification;
import com.onesignal.OutcomeEvent;

import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;


/**
 * Created by Avishay on 1/31/16.
 */
public class RNOneSignal extends ReactContextBaseJavaModule implements LifecycleEventListener, NotificationReceivedHandler, NotificationOpenedHandler, InAppMessageClickHandler {
   public static final String HIDDEN_MESSAGE_KEY = "hidden";

   private ReactApplicationContext mReactApplicationContext;
   private ReactContext mReactContext;
   private boolean oneSignalInitDone;
   private boolean registeredEvents = false;

   private OSNotificationOpenResult coldStartNotificationResult;
   private OSInAppMessageAction inAppMessageActionResult;

   private boolean hasSetNotificationOpenedHandler = false;
   private boolean hasSetInAppClickedHandler = false;
   private boolean hasSetRequiresPrivacyConsent = false;
   private boolean waitingForUserPrivacyConsent = false;

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

      OneSignal.sdkType = "react";

      String appId = appIdFromManifest(mReactApplicationContext);

      if (appId != null && appId.length() > 0)
         init(appId);
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

      OneSignal.getCurrentOrNewInitBuilder().setInAppMessageClickHandler(this);
      OneSignal.init(context, null, appId, this, this);

      if (this.hasSetRequiresPrivacyConsent)
         this.waitingForUserPrivacyConsent = true;
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
   public void idsAvailable() {
      OneSignal.idsAvailable(new OneSignal.IdsAvailableHandler() {
         public void idsAvailable(String userId, String registrationId) {
            final WritableMap params = Arguments.createMap();

            params.putString("userId", userId);
            params.putString("pushToken", registrationId);

            sendEvent("OneSignal-idsAvailable", params);
         }
      });
   }

   // TODO: This needs to be split out into several different callbacks to the JS and connect
   //  to the correct native methods
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

         result.put("notificationsEnabled", notificationsEnabled)
                 .put("subscriptionEnabled", subscriptionEnabled)
                 .put("userSubscriptionEnabled", userSubscriptionEnabled)
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
            JSONArray playerIds = new JSONArray(playerId);
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
   public void getOneSignalNotificationsCount(final Callback callback) {
      OneSignal.getOneSignalNotificationsCount(new OneSignal.GetNotificationsCountHandler() {
         @Override
         public void notificationsAvailable(int count) {
            callback.invoke(count);
         }
      });
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

   @ReactMethod
   public void setExternalUserId(final String externalId, final String authHashToken, final Callback callback) {
      OneSignal.setExternalUserId(externalId, authHashToken, new OneSignal.OSExternalUserIdUpdateCompletionHandler() {
         @Override
         public void onComplete(JSONObject results) {
            Log.i("OneSignal", "Completed setting external user id: " + externalId + "with results: " + results.toString());
            if (callback != null)
               callback.invoke(RNUtils.jsonToWritableMap(results));
         }
      });
   }

   @ReactMethod
   public void removeExternalUserId(final Callback callback) {
      OneSignal.removeExternalUserId(new OneSignal.OSExternalUserIdUpdateCompletionHandler() {
         @Override
         public void onComplete(JSONObject results) {
            Log.i("OneSignal", "Completed removing external user id with results: " + results.toString());
            if (callback != null)
               callback.invoke(RNUtils.jsonToWritableMap(results));
         }
      });
   }

   @ReactMethod
   public void initNotificationOpenedHandlerParams() {
      this.hasSetNotificationOpenedHandler = true;
      if (this.coldStartNotificationResult != null) {
         this.notificationOpened(this.coldStartNotificationResult);
         this.coldStartNotificationResult = null;
      }
   }

   @Override
   public void notificationReceived(OSNotification notification) {
      this.sendEvent("OneSignal-remoteNotificationReceived", RNUtils.jsonToWritableMap(notification.toJSONObject()));
   }

   @Override
   public void notificationOpened(OSNotificationOpenResult result) {
      if (!this.hasSetNotificationOpenedHandler) {
         this.coldStartNotificationResult = result;
         return;
      }
      this.sendEvent("OneSignal-remoteNotificationOpened", RNUtils.jsonToWritableMap(result.toJSONObject()));
   }

   /**
    * In-App Messaging
    */

   @ReactMethod
   public void addTrigger(String key, Object object) {
      OneSignal.addTrigger(key, object);
   }

   @ReactMethod
   public void addTriggers(ReadableMap triggers) {
      OneSignal.addTriggers(triggers.toHashMap());
   }

   @ReactMethod
   public void removeTriggerForKey(String key) {
      OneSignal.removeTriggerForKey(key);
   }

   @ReactMethod
   public void removeTriggersForKeys(ReadableArray keys) {
      OneSignal.removeTriggersForKeys(RNUtils.convertReableArrayIntoStringCollection(keys));
   }

   @ReactMethod
   public void getTriggerValueForKey(String key, Promise promise) {
      promise.resolve(OneSignal.getTriggerValueForKey(key));
   }

   @ReactMethod
   public void pauseInAppMessages(Boolean pause) {
      OneSignal.pauseInAppMessages(pause);
   }

   @ReactMethod
   public void initInAppMessageClickHandlerParams() {
      this.hasSetInAppClickedHandler = true;
      if (inAppMessageActionResult != null) {
         this.inAppMessageClicked(this.inAppMessageActionResult);
         this.inAppMessageActionResult = null;
      }
   }

   @Override
   public void inAppMessageClicked(OSInAppMessageAction result) {
      if (!this.hasSetInAppClickedHandler) {
         this.inAppMessageActionResult = result;
         return;
      }
      this.sendEvent("OneSignal-inAppMessageClicked", RNUtils.jsonToWritableMap(result.toJSONObject()));
   }

   /**
    * Outcomes
    */

   @ReactMethod
   public void sendOutcome(final String name, final Callback callback) {
      OneSignal.sendOutcome(name, new OutcomeCallback() {
         @Override
         public void onSuccess(OutcomeEvent outcomeEvent) {
            if (outcomeEvent == null)
               callback.invoke(new WritableNativeMap());
            else {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendOutcome with name: " + name + ", failed with message: " + e.getMessage());
               }
            }
         }
      });
   }

   @ReactMethod
   public void sendUniqueOutcome(final String name, final Callback callback) {
      OneSignal.sendUniqueOutcome(name, new OutcomeCallback() {
         @Override
         public void onSuccess(OutcomeEvent outcomeEvent) {
            if (outcomeEvent == null)
               callback.invoke(new WritableNativeMap());
            else {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendUniqueOutcome with name: " + name + ", failed with message: " + e.getMessage());
               }
            }
         }
      });
   }

   @ReactMethod
   public void sendOutcomeWithValue(final String name, final float value, final Callback callback) {
      OneSignal.sendOutcomeWithValue(name, value, new OutcomeCallback() {
         @Override
         public void onSuccess(OutcomeEvent outcomeEvent) {
            if (outcomeEvent == null)
               callback.invoke(new WritableNativeMap());
            else {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendOutcomeWithValue with name: " + name + " and value: " + value + ", failed with message: " + e.getMessage());
               }
            }
         }
      });
   }

   /**
    * Overrides
    */

   @Override
   public String getName() {
      return "OneSignal";
   }

   @Override
   public void onHostDestroy() {

   }

   @Override
   public void onHostPause() {

   }

   @Override
   public void onHostResume() {
      initOneSignal();
   }

}
