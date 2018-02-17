package com.geektime.rnonesignalandroid;

import android.content.Intent;
import android.os.Bundle;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;
import com.onesignal.OSNotificationOpenResult;
import com.onesignal.OneSignal;

/**
 * Created by Avishay on 1/31/16.
 */
public class NotificationOpenedHandler implements OneSignal.NotificationOpenedHandler {
	final static String OS_NOT_SENT_KEY = "OS_INTENT_NOT_SENT";
	private ReactContext mReactContext;

	public NotificationOpenedHandler(ReactContext reactContext) {
		mReactContext = reactContext;
	}

    @Override
    public void notificationOpened(OSNotificationOpenResult result) {
		Bundle bundle = new Bundle();
		bundle.putString("result", result.toJSONObject().toString());

		final Intent intent = new Intent(RNOneSignal.NOTIFICATION_OPENED_INTENT_FILTER);
		intent.putExtra(OS_NOT_SENT_KEY, true);
		intent.putExtras(bundle);

        if (mReactContext.hasActiveCatalystInstance() && (mReactContext.getLifecycleState() == LifecycleState.RESUMED)) {
			intent.removeExtra(OS_NOT_SENT_KEY);
			mReactContext.sendBroadcast(intent);
            return;
        }

        mReactContext.addLifecycleEventListener(new LifecycleEventListener() {
			@Override
			public void onHostResume() {
				if (intent.getBooleanExtra(OS_NOT_SENT_KEY, false)) {
					intent.removeExtra(OS_NOT_SENT_KEY);
					mReactContext.sendBroadcast(intent);
				}

                mReactContext.removeLifecycleEventListener(this);
			}

			@Override
			public void onHostPause() {

			}

			@Override
			public void onHostDestroy() {

			}
		});
    }
}
