package com.geektime.rnonesignalandroid;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.onesignal.OSPermissionObserver;
import com.onesignal.OSPermissionStateChanges;
import com.onesignal.OSPermissionSubscriptionState;
import com.onesignal.OSSubscriptionObserver;
import com.onesignal.OSSubscriptionStateChanges;
import com.onesignal.OneSignal;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Created by Avishay on 1/31/16.
 */
public class RNOneSignal extends ReactContextBaseJavaModule implements OSPermissionObserver, OSSubscriptionObserver {
    static final String NOTIFICATION_OPENED_INTENT_FILTER = "GTNotificationOpened";
    static final String NOTIFICATION_RECEIVED_INTENT_FILTER = "GTNotificationReceived";
    static final String HIDDEN_MESSAGE_KEY = "hidden";

    private static final String NOTIFICATION_RECEIVED_EVENT = "OneSignal-remoteNotificationReceived";
    private static final String NOTIFICATION_OPENED_EVENT = "OneSignal-remoteNotificationOpened";
    private static final String PERMISSION_CHANGED_EVENT = "OneSignal-permissionChanged";
    private static final String SUBSCRIPTION_CHANGED_EVENT = "OneSignal-subscriptionChanged";

    private ReactContext mReactContext;
    private boolean isOneSignalInitialized;

    public RNOneSignal(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
    }

    private void sendEvent(String eventName, Object params) {
        mReactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
    }

    @ReactMethod
    public void initOneSignal(String appId, String googleProjectNumber) {
        if (isOneSignalInitialized)
            return;

        isOneSignalInitialized = true;

        registerNotificationsOpenedNotification();
        registerNotificationsReceivedNotification();

        OneSignal.sdkType = "react";
        OneSignal.init(mReactContext, googleProjectNumber, appId, new NotificationOpenedHandler(mReactContext),
                new NotificationReceivedHandler(mReactContext));

        OneSignal.addPermissionObserver(this);
        OneSignal.addSubscriptionObserver(this);
    }

    @ReactMethod
    public void getPermissionSubscriptionState(final Promise promise) {
        OSPermissionSubscriptionState state = OneSignal.getPermissionSubscriptionState();

        promise.resolve(RNUtils.jsonToWritableMap(state.toJSONObject()));

    }

    @ReactMethod
    public void getTags(final Callback callback) {
        OneSignal.getTags(new OneSignal.GetTagsHandler() {
            @Override
            public void tagsAvailable(JSONObject tags) {
                callback.invoke(RNUtils.jsonToWritableMap(tags));
            }
        });
    }

    @ReactMethod
    public void sendTag(String key, String value, final Promise promise) {
        OneSignal.sendTag(key, value);
        promise.resolve(null);
    }

    @ReactMethod
    public void sendTags(ReadableMap tags, final Promise promise) {
        OneSignal.sendTags(RNUtils.readableMapToJson(tags));
        promise.resolve(null);
    }

    @ReactMethod
    public void deleteTag(String key, final Promise promise) {
        OneSignal.deleteTag(key);
        promise.resolve(null);
    }

    @ReactMethod
    public void deleteTags(ReadableArray tags, final Promise promise) {
        ArrayList<String> tagsArray = new ArrayList<>(tags.size());
        for (Object object : tags.toArrayList()) {
            tagsArray.add((String) object);
        }

        OneSignal.deleteTags(tagsArray);
        promise.resolve(null);
    }

    @ReactMethod
    public void setInFocusDisplayType(int displayOption) {
        OneSignal.setInFocusDisplaying(displayOption);
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
    public void setLocationShared(Boolean shared) {
        OneSignal.setLocationShared(shared);
    }

    @ReactMethod
    public void postNotification(ReadableMap notification, final Promise promise) {
        OneSignal.postNotification(RNUtils.readableMapToJson(notification),
                new OneSignal.PostNotificationResponseHandler() {
                    @Override
                    public void onSuccess(JSONObject response) {
                        promise.resolve(RNUtils.jsonToWritableMap(response));
                    }

                    @Override
                    public void onFailure(JSONObject response) {
                        promise.reject("error", response.toString());
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
    public void setLogLevel(int logLevel, int visualLogLevel) {
        OneSignal.setLogLevel(logLevel, visualLogLevel);
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
            public void onReceive(Context context, final Intent intent) {
                notifyNotificationOpened(intent.getExtras());
            }
        }, intentFilter);
    }

    private void notifyNotificationReceived(Bundle bundle) {
        try {
            JSONObject jsonObject = new JSONObject(bundle.getString("notification"));
            sendEvent(NOTIFICATION_RECEIVED_EVENT, RNUtils.jsonToWritableMap(jsonObject));
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void notifyNotificationOpened(Bundle bundle) {
        try {
            JSONObject jsonObject = new JSONObject(bundle.getString("result"));
            sendEvent(NOTIFICATION_OPENED_EVENT, RNUtils.jsonToWritableMap(jsonObject));
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "OneSignal";
    }

    @Override
    public void onOSPermissionChanged(OSPermissionStateChanges stateChanges) {
        sendEvent(PERMISSION_CHANGED_EVENT, RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
    }

    @Override
    public void onOSSubscriptionChanged(OSSubscriptionStateChanges stateChanges) {
        sendEvent(SUBSCRIPTION_CHANGED_EVENT, RNUtils.jsonToWritableMap(stateChanges.toJSONObject()));
    }
}
