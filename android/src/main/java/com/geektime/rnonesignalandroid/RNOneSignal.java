/*
Modified MIT License

Copyright 2020 OneSignal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

2. All copies of substantial portions of the Software may only be used in connection
with services provided by OneSignal.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Authors:
 - Avishay Bar (creator) - 1/31/16
 - Brad Hesse
 - Josh Kasten
 - Rodrigo Gomez-Palacio
 - Michael DiCioccio
*/

package com.geektime.rnonesignalandroid;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.onesignal.OSDeviceState;
import com.onesignal.OSEmailSubscriptionObserver;
import com.onesignal.OSEmailSubscriptionStateChanges;
import com.onesignal.OSInAppMessageAction;
import com.onesignal.OSNotification;
import com.onesignal.OSNotificationOpenedResult;
import com.onesignal.OSNotificationReceivedEvent;
import com.onesignal.OSOutcomeEvent;
import com.onesignal.OSPermissionObserver;
import com.onesignal.OSPermissionStateChanges;
import com.onesignal.OSSMSSubscriptionObserver;
import com.onesignal.OSSMSSubscriptionStateChanges;
import com.onesignal.OSSubscriptionObserver;
import com.onesignal.OSSubscriptionStateChanges;
import com.onesignal.OneSignal;
import com.onesignal.OneSignal.EmailUpdateError;
import com.onesignal.OneSignal.EmailUpdateHandler;
import com.onesignal.OneSignal.OSInAppMessageClickHandler;
import com.onesignal.OneSignal.OSNotificationOpenedHandler;
import com.onesignal.OneSignal.OutcomeCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;

public class RNOneSignal extends ReactContextBaseJavaModule
        implements
        OSPermissionObserver,
        OSSubscriptionObserver,
        OSNotificationOpenedHandler,
        OSEmailSubscriptionObserver,
        LifecycleEventListener,
        OSInAppMessageClickHandler,
        OSSMSSubscriptionObserver {

   public static final String HIDDEN_MESSAGE_KEY = "hidden";

   private ReactApplicationContext mReactApplicationContext;
   private ReactContext mReactContext;

   private boolean oneSignalInitDone;

   private OSInAppMessageAction inAppMessageActionResult;

   private HashMap<String, OSNotificationReceivedEvent> notificationReceivedEventCache;

   private boolean hasSetInAppClickedHandler = false;
   private boolean hasSetSubscriptionObserver = false;
   private boolean hasSetEmailSubscriptionObserver = false;
   private boolean hasSetSMSSubscriptionObserver = false;
   private boolean hasSetPermissionObserver = false;

   // A native module is supposed to invoke its callback only once. It can, however, store the callback and invoke it later.
   // It is very important to highlight that the callback is not invoked immediately after the native function completes
   // - remember that bridge communication is asynchronous, and this too is tied to the run loop.
   // Once you have done invoke() on the callback, you cannot use it again. Store it here.
   private Callback pendingGetTagsCallback;

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

   private void removeObservers() {
      OneSignal.removeEmailSubscriptionObserver(this);
      OneSignal.removePermissionObserver(this);
      OneSignal.removeSubscriptionObserver(this);
      hasSetEmailSubscriptionObserver = false;
      hasSetPermissionObserver = false;
      hasSetSubscriptionObserver = false;
   }

   private void removeHandlers() {
      OneSignal.setInAppMessageClickHandler(null);
      OneSignal.setNotificationOpenedHandler(null);
      OneSignal.setNotificationWillShowInForegroundHandler(null);
   }

   private void sendEvent(String eventName, Object params) {
      mReactContext
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
              .emit(eventName, params);
   }

   private JSONObject jsonFromErrorMessageString(String errorMessage) throws JSONException {
      return new JSONObject().put("error", errorMessage);
   }

   public RNOneSignal(ReactApplicationContext reactContext) {
      super(reactContext);
      mReactApplicationContext = reactContext;
      mReactContext = reactContext;
      mReactContext.addLifecycleEventListener(this);
      notificationReceivedEventCache = new HashMap<String, OSNotificationReceivedEvent>();
   }

   // Initialize OneSignal only once when an Activity is available.
   // React creates an instance of this class to late for OneSignal to get the current Activity
   // based on registerActivityLifecycleCallbacks it uses to listen for the first Activity.
   // However it seems it is also to soon to call getCurrentActivity() from the reactContext as well.
   // This will normally succeed when onHostResume fires instead.
   private void initOneSignal() {
      OneSignal.sdkType = "react";
      Context context = mReactApplicationContext.getCurrentActivity();

      if (oneSignalInitDone) {
         Log.e("OneSignal", "Already initialized the OneSignal React-Native SDK");
         return;
      }

      oneSignalInitDone = true;


      if (context == null) {
         // in some cases, especially when react-native-navigation is installed,
         // the activity can be null, so we can initialize with the context instead
         context = mReactApplicationContext.getApplicationContext();
      }

      OneSignal.setInAppMessageClickHandler(this);
      OneSignal.initWithContext(context);
   }

   @ReactMethod
   public void setAppId(String appId) {
      OneSignal.setAppId(appId);
   }

   /* Observers */
   @Override
   public void onOSPermissionChanged(OSPermissionStateChanges stateChanges) {
      Log.i("OneSignal", "sending permission change event");
      sendEvent("OneSignal-permissionChanged", RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
   }

   @Override
   public void onOSSubscriptionChanged(OSSubscriptionStateChanges stateChanges) {
      Log.i("OneSignal", "sending subscription change event");
      sendEvent("OneSignal-subscriptionChanged", RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
   }

   @Override
   public void onOSEmailSubscriptionChanged(OSEmailSubscriptionStateChanges stateChanges) {
      Log.i("OneSignal", "sending email subscription change event");
      sendEvent("OneSignal-emailSubscriptionChanged", RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
   }

   @Override
   public void onSMSSubscriptionChanged(OSSMSSubscriptionStateChanges stateChanges) {
      Log.i("OneSignal", "sending SMS subscription change event");
      sendEvent("OneSignal-smsSubscriptionChanged", RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
   }

   @ReactMethod
   public void addPermissionObserver() {
      if (!hasSetPermissionObserver) {
         OneSignal.addPermissionObserver(this);
         hasSetPermissionObserver = true;
      }
   }

   @ReactMethod
   public void addSubscriptionObserver() {
      if (!hasSetSubscriptionObserver) {
         OneSignal.addSubscriptionObserver(this);
         hasSetSubscriptionObserver = true;
      }
   }

   @ReactMethod
   public void addEmailSubscriptionObserver() {
      if (!hasSetEmailSubscriptionObserver) {
         OneSignal.addEmailSubscriptionObserver(this);
         hasSetEmailSubscriptionObserver = true;
      }
   }

   @ReactMethod
   public void addSMSSubscriptionObserver() {
      if (!hasSetSMSSubscriptionObserver) {
         OneSignal.addSMSSubscriptionObserver(this);
         hasSetSMSSubscriptionObserver = true;
      }
   }

   /* Other methods */

   @ReactMethod
   public void getDeviceState(Promise promise) {
      OSDeviceState state = OneSignal.getDeviceState();
      if (state == null) {
         Log.e("OneSignal", "getDeviceState: OSDeviceState is null");
         promise.reject("Null OSDeviceState", "OSDeviceState is null");
         return;
      }
      promise.resolve(RNUtils.jsonToWritableMap(state.toJSONObject()));
   }

   @ReactMethod
   public void setLanguage(String language) {
      OneSignal.setLanguage(language);
   }

   @ReactMethod
   public void disablePush(boolean disable) {
      OneSignal.disablePush(disable);
   }

   @ReactMethod
   public void unsubscribeWhenNotificationsAreDisabled(boolean unsubscribe) {
      OneSignal.unsubscribeWhenNotificationsAreDisabled(unsubscribe);
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
   public void deleteTags(ReadableArray tagKeys) {
      OneSignal.deleteTags(RNUtils.convertReableArrayIntoStringCollection(tagKeys));
   }

   @ReactMethod
   public void getTags(final Callback callback) {
      if (pendingGetTagsCallback == null)
         pendingGetTagsCallback = callback;

      OneSignal.getTags(new OneSignal.OSGetTagsHandler() {
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
   public void setSMSNumber(String smsNumber, String smsAuthToken, final Callback callback) {
      OneSignal.setSMSNumber(smsNumber, smsAuthToken, new OneSignal.OSSMSUpdateHandler() {
         @Override
         public void onSuccess(JSONObject result) {
            callback.invoke(RNUtils.jsonToWritableMap(result));
         }

         @Override
         public void onFailure(OneSignal.OSSMSUpdateError error) {
            try {
               callback.invoke(RNUtils.jsonToWritableMap(jsonFromErrorMessageString(error.getMessage())));
            } catch (JSONException exception) {
               exception.printStackTrace();
            }
         }
      });
   }

   @ReactMethod
   public void logoutSMSNumber(final Callback callback) {
      OneSignal.logoutSMSNumber(new OneSignal.OSSMSUpdateHandler() {
         @Override
         public void onSuccess(JSONObject result) {
            callback.invoke(RNUtils.jsonToWritableMap(result));
         }

         @Override
         public void onFailure(OneSignal.OSSMSUpdateError error) {
            try {
               callback.invoke(RNUtils.jsonToWritableMap(jsonFromErrorMessageString(error.getMessage())));
            } catch (JSONException exception) {
               exception.printStackTrace();
            }
         }
      });
   }

   @ReactMethod
   public void promptLocation() {
      OneSignal.promptLocation();
   }

   @ReactMethod
   public void setLogLevel(int logLevel, int visualLogLevel) {
      OneSignal.setLogLevel(logLevel, visualLogLevel);
   }

   @ReactMethod
   public void isLocationShared(Promise promise) {
      promise.resolve(OneSignal.isLocationShared());
   }

   @ReactMethod
   public void setLocationShared(Boolean shared) {
      OneSignal.setLocationShared(shared);
   }

   @ReactMethod
   public void postNotification(String jsonObjectString, final Callback successCallback, final Callback failureCallback) {
      OneSignal.postNotification(
         jsonObjectString,
         new OneSignal.PostNotificationResponseHandler() {
           @Override
           public void onSuccess(JSONObject response) {
              Log.i("OneSignal", "postNotification Success: " + response.toString());
              successCallback.invoke(RNUtils.jsonToWritableMap(response));
           }

           @Override
           public void onFailure(JSONObject response) {
              Log.e("OneSignal", "postNotification Failure: " + response.toString());
              failureCallback.invoke(RNUtils.jsonToWritableMap(response));
           }
         }
      );
   }

   @ReactMethod
   public void clearOneSignalNotifications() {
      OneSignal.clearOneSignalNotifications();
   }

   @ReactMethod
   public void removeNotification(int id) {
      OneSignal.removeNotification(id);
   }

   @ReactMethod
   public void removeGroupedNotifications(String id) {
      OneSignal.removeGroupedNotifications(id);
   }

   @ReactMethod
   public void requiresUserPrivacyConsent(Promise promise) {
      promise.resolve(OneSignal.requiresUserPrivacyConsent());
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
         public void onSuccess(JSONObject results) {
            Log.i("OneSignal", "Completed setting external user id: " + externalId + "with results: " + results.toString());

            if (callback != null)
               callback.invoke(RNUtils.jsonToWritableMap(results));
         }

         @Override
         public void onFailure(OneSignal.ExternalIdError error) {
            if (callback != null)
               callback.invoke(error.getMessage());
         }
      });
   }

   @ReactMethod
   public void removeExternalUserId(final Callback callback) {
      OneSignal.removeExternalUserId(new OneSignal.OSExternalUserIdUpdateCompletionHandler() {
         @Override
         public void onSuccess(JSONObject results) {
            Log.i("OneSignal", "Completed removing external user id with results: " + results.toString());

            if (callback != null)
               callback.invoke(RNUtils.jsonToWritableMap(results));
         }

         @Override
         public void onFailure(OneSignal.ExternalIdError error) {
            if (callback != null)
               callback.invoke(error.getMessage());
         }
      });
   }

   /* notification opened / received */

   @ReactMethod
   public void setNotificationOpenedHandler() {
      OneSignal.setNotificationOpenedHandler(this);
   }

   @Override
   public void notificationOpened(OSNotificationOpenedResult result) {
      sendEvent("OneSignal-remoteNotificationOpened", RNUtils.jsonToWritableMap(result.toJSONObject()));
   }

   @ReactMethod
   public void setNotificationWillShowInForegroundHandler() {
      OneSignal.setNotificationWillShowInForegroundHandler(new OneSignal.OSNotificationWillShowInForegroundHandler() {
         @Override
         public void notificationWillShowInForeground(OSNotificationReceivedEvent notificationReceivedEvent) {
            OSNotification notification = notificationReceivedEvent.getNotification();
            String notificationId = notification.getNotificationId();
            notificationReceivedEventCache.put(notificationId, notificationReceivedEvent);

            sendEvent("OneSignal-notificationWillShowInForeground", RNUtils.jsonToWritableMap(notification.toJSONObject()));
         }
      });
   }

   @ReactMethod
   public void completeNotificationEvent(final String uuid, final boolean shouldDisplay) {
      OSNotificationReceivedEvent receivedEvent = notificationReceivedEventCache.get(uuid);

      if (receivedEvent == null) {
         Log.e("OneSignal", "(java): could not find cached notification received event with id "+uuid);
         return;
      }

      if (shouldDisplay) {
         receivedEvent.complete(receivedEvent.getNotification());
      } else {
         receivedEvent.complete(null);
      }

      notificationReceivedEventCache.remove(uuid);
   }

   /**
    * In-App Messaging
    */

   /* triggers */

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

   /* in app message click */

   @ReactMethod
   public void setInAppMessageClickHandler() {
      OneSignal.setInAppMessageClickHandler(new OneSignal.OSInAppMessageClickHandler() {
         @Override
         public void inAppMessageClicked(OSInAppMessageAction result) {
            if (!hasSetInAppClickedHandler) {
               inAppMessageActionResult = result;
               return;
            }
            sendEvent("OneSignal-inAppMessageClicked", RNUtils.jsonToWritableMap(result.toJSONObject()));
         }
      });
   }

   @ReactMethod
   public void initInAppMessageClickHandlerParams() {
      this.hasSetInAppClickedHandler = true;
      if (this.inAppMessageActionResult != null) {
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

   /* other IAM functions */

   @ReactMethod
   public void pauseInAppMessages(Boolean pause) {
      OneSignal.pauseInAppMessages(pause);
   }

   /**
    * Outcomes
    */

   @ReactMethod
   public void sendOutcome(final String name, final Callback callback) {
      OneSignal.sendOutcome(name, new OutcomeCallback() {
         @Override
         public void onSuccess(OSOutcomeEvent outcomeEvent) {
            if (outcomeEvent != null) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendOutcome with name: " + name + ", failed with message: " + e.getMessage());
               }
               return;
            }

            Log.e("OneSignal", "sendOutcome OSOutcomeEvent is null");
         }
      });
   }

   @ReactMethod
   public void sendUniqueOutcome(final String name, final Callback callback) {
      OneSignal.sendUniqueOutcome(name, new OutcomeCallback() {
         @Override
         public void onSuccess(OSOutcomeEvent outcomeEvent) {
            if (outcomeEvent != null) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendUniqueOutcome with name: " + name + ", failed with message: " + e.getMessage());
               }
               return;
            }

            Log.e("OneSignal", "sendUniqueOutcome OSOutcomeEvent is null");
         }
      });
   }

   @ReactMethod
   public void sendOutcomeWithValue(final String name, final float value, final Callback callback) {
      OneSignal.sendOutcomeWithValue(name, value, new OutcomeCallback() {
         @Override
         public void onSuccess(OSOutcomeEvent outcomeEvent) {
            if (outcomeEvent != null) {
               try {
                  callback.invoke(RNUtils.jsonToWritableMap(outcomeEvent.toJSONObject()));
               } catch (JSONException e) {
                  Log.e("OneSignal", "sendOutcomeWithValue with name: " + name + " and value: " + value + ", failed with message: " + e.getMessage());
               }
               return;
            }

            Log.e("OneSignal", "sendOutcomeWithValue OSOutcomeEvent is null");
         }
      });
   }

   /**
    * Native Module Overrides
    */

   @Override
   public String getName() {
      return "OneSignal";
   }

   @Override
   public void onHostDestroy() {
      removeHandlers();
      removeObservers();
   }

   @Override
   public void onHostPause() {

   }

   @Override
   public void onHostResume() {
      initOneSignal();
   }

   @Override
   public void onCatalystInstanceDestroy() {
      removeHandlers();
      removeObservers();
   }
}
