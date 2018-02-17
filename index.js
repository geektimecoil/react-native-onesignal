'use strict';
import { NativeModules, NativeAppEventEmitter, NativeEventEmitter, Platform } from 'react-native';

const EventEmitter = new NativeEventEmitter(NativeModules.OneSignal || {});

const RNOneSignal = NativeModules.OneSignal;

export const OSEventName = {
  NotificationReceived: 'OneSignal-remoteNotificationReceived',
  NotificationOpened: 'OneSignal-remoteNotificationOpened',
  PermissionChanged: 'OneSignal-permissionChanged',
  SubscriptionChanged: 'OneSignal-subscriptionChanged',
};

export const InFocusDisplayType = {
  None: 0,
  InAppAlert: 1,
  Notification: 2,
};

export default class OneSignal {
  static init(appId, iosOptions = {}, googleProjectNumber = 'REMOTE') {
    if (Platform.OS === 'ios') {
      RNOneSignal.initOneSignal(appId, iosOptions);
    } else {
      RNOneSignal.initOneSignal(appId, googleProjectNumber);
    }
  }

  static on(eventName, handler) {
    return EventEmitter.addListener(eventName, handler);
  }

  static promptForPushNotificationsWithUserResponse() {
    if (Platform.OS === 'ios') {
      return RNOneSignal.promptForPushNotificationsWithUserResponse();
    } else {
      console.log('This function is not supported on Android');
    }
  }

  static getPermissionSubscriptionState() {
    return RNOneSignal.getPermissionSubscriptionState();
  }

  static getTags(callback) {
    RNOneSignal.getTags(callback);
  }

  static sendTag(key, value) {
    return RNOneSignal.sendTag(key, value);
  }

  static sendTags(tags) {
    return RNOneSignal.sendTags(tags || {});
  }

  static deleteTag(key) {
    return RNOneSignal.deleteTag(key);
  }

  static deleteTags(keys) {
    return RNOneSignal.deleteTag(keys);
  }

  static setInFocusDisplayType(displayOption) {
    RNOneSignal.setInFocusDisplayType(displayOption);
  }

  static enableVibrate(enable) {
    if (Platform.OS === 'android') {
      RNOneSignal.enableVibrate(enable);
    } else {
      console.log('This function is not supported on iOS');
    }
  }

  static enableSound(enable) {
    if (Platform.OS === 'android') {
      RNOneSignal.enableSound(enable);
    } else {
      console.log('This function is not supported on iOS');
    }
  }

  static setLocationShared(shared) {
    RNOneSignal.setLocationShared(shared);
  }

  static promptLocation() {
    RNOneSignal.promptLocation();
  }

  static syncHashedEmail(email) {
    RNOneSignal.syncHashedEmail(email);
  }

  static postNotification(notificationData) {
    return RNOneSignal.postNotification(notificationData);
  }

  static cancelNotification(id) {
    if (Platform.OS === 'android') {
      RNOneSignal.cancelNotification(id);
    } else {
      console.log('This function is not supported on iOS');
    }
  }

  static clearOneSignalNotifications() {
    if (Platform.OS === 'android') {
      RNOneSignal.clearOneSignalNotifications();
    } else {
      console.log('This function is not supported on iOS');
    }
  }

  static setSubscription(enable) {
    RNOneSignal.setSubscription(enable);
  }

  static setLogLevel(nsLogLevel, visualLogLevel) {
    RNOneSignal.setLogLevel(nsLogLevel, visualLogLevel);
  }
}
