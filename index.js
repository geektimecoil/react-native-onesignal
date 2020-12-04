
'use strict';

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import invariant from 'invariant';

const RNOneSignal = NativeModules.OneSignal;


/**
 1.
 These events are used to broadcast events to native code
 */
const OS_REMOTE_NOTIFICATION_RECEIVED = 'OneSignal-remoteNotificationReceived';
const OS_REMOTE_NOTIFICATION_OPENED = 'OneSignal-remoteNotificationOpened';
const OS_IDS_AVAILABLE = 'OneSignal-idsAvailable';
//const OS_SUBSCRIPTION = 'OneSignal-subscription';
//const OS_PERMISSION = 'OneSignal-permission';
const OS_EMAIL_SUBSCRIPTION = 'OneSignal-emailSubscription';
const OS_IN_APP_MESSAGE_CLICKED = 'OneSignal-inAppMessageClicked';
// Add more native broadcast strings here...

const _eventBroadcastNames = [
    OS_REMOTE_NOTIFICATION_RECEIVED,
    OS_REMOTE_NOTIFICATION_OPENED,
    OS_IDS_AVAILABLE,
//    OS_SUBSCRIPTION,
//    OS_PERMISSION,
    OS_EMAIL_SUBSCRIPTION,
    OS_IN_APP_MESSAGE_CLICKED,
    // Append new native broadcast strings here
];

/**
 2.
 These events are used to interpret events from native code
 */
const NOTIFICATION_RECEIVED_EVENT = "received";
const NOTIFICATION_OPENED_EVENT = "opened";
const IDS_AVAILABLE_EVENT = "ids";
//const SUBSCRIPTION_EVENT = "subscription";
//const PERMISSION_EVENT = "permission";
const EMAIL_SUBSCRIPTION_EVENT = "emailSubscription";
const IN_APP_MESSAGE_CLICKED_EVENT = "inAppMessageClicked";
// Add more JS string events here...

const _eventNames = [
    NOTIFICATION_RECEIVED_EVENT,
    NOTIFICATION_OPENED_EVENT,
    IDS_AVAILABLE_EVENT,
//    SUBSCRIPTION_EVENT,
//    PERMISSION_EVENT,
    EMAIL_SUBSCRIPTION_EVENT,
    IN_APP_MESSAGE_CLICKED_EVENT,
    // Append new JS string events here
];

var oneSignalEventEmitter;

var _eventTypeHandler = new Map();
var _notificationCache = new Map();
var _listeners = [];

if (RNOneSignal != null) {
    oneSignalEventEmitter = new NativeEventEmitter(RNOneSignal);

    for(var i = 0; i < _eventBroadcastNames.length; i++) {
        var eventBroadcastName = _eventBroadcastNames[i];
        var eventName = _eventNames[i];

        _listeners[eventName] = handleEventBroadcast(eventName, eventBroadcastName)
    }
}

function handleEventBroadcast(type, broadcast) {
    return oneSignalEventEmitter.addListener(
        broadcast, (notification) => {
            // Check if we have added listener for this type yet
            // Cache the result first if we have not.
            var handler = _eventTypeHandler.get(type);

            if (handler) {
                handler(notification);
            } else {
                _notificationCache.set(type, notification);
            }
        }
    );
}

function checkIfInitialized() {
    return RNOneSignal != null;
}

export default class OneSignal {

    /**
     Listen to events of received, opened, ids, subscription, permission, emailSubscription, inAppMessageClicked
     TODO: We currently have implemented the steps up until connecting the "SUBSCRIPTION_EVENT" and "PERMISSION_EVENT"
     Currently the getPermissionSubscriptionState is used to get all device information and
        needs to be broken up into using the native observers to fire these React-Native handlers
     */
    static addEventListener(type, handler) {
        if (!checkIfInitialized()) return;

        invariant(
            type === NOTIFICATION_RECEIVED_EVENT ||
            type === NOTIFICATION_OPENED_EVENT ||
            type === IDS_AVAILABLE_EVENT ||
//            type === SUBSCRIPTION_EVENT ||
//            type === PERMISSION_EVENT ||
            type === EMAIL_SUBSCRIPTION_EVENT ||
            type === IN_APP_MESSAGE_CLICKED_EVENT,
            'OneSignal only supports received, opened, ids, emailSubscription, and inAppMessageClicked events'
        );

        _eventTypeHandler.set(type, handler);

        // Make native request to init notification opened handler
        if (type === NOTIFICATION_OPENED_EVENT) {
            RNOneSignal.initNotificationOpenedHandlerParams();
        }

        // Make native request to init idsAvailable handler
        if (type === IDS_AVAILABLE_EVENT) {
            RNOneSignal.idsAvailable();
        }

        // Make native request to init IAM handler
        if (type === IN_APP_MESSAGE_CLICKED_EVENT) {
            if (Platform.OS === 'android') {
                RNOneSignal.initInAppMessageClickHandlerParams();
            } else if (Platform.OS === 'ios') {
                RNOneSignal.setInAppMessageClickHandler();
            }
        }

        // Check if there is a cache for this type of event
        var cache = _notificationCache.get(type);
        if (handler && cache) {
            handler(cache);
            _notificationCache.delete(type);
        }
    }

    static removeEventListener(type) {
        if (!checkIfInitialized()) return;

        invariant(
            type === NOTIFICATION_RECEIVED_EVENT ||
            type === NOTIFICATION_OPENED_EVENT ||
            type === IDS_AVAILABLE_EVENT ||
//            type === SUBSCRIPTION_EVENT ||
//            type === PERMISSION_EVENT ||
            type === EMAIL_SUBSCRIPTION_EVENT ||
            type === IN_APP_MESSAGE_CLICKED_EVENT,
            'OneSignal only supports received, opened, ids, emailSubscription, and inAppMessageClicked events'
        );

        _eventTypeHandler.delete(type);
    }

    static clearListeners() {
        if (!checkIfInitialized()) return;

        for(var i = 0; i < _eventNames.length; i++) {
            _listeners[_eventNames].remove();
        }
    }

    static registerForPushNotifications() {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'ios') {
            RNOneSignal.registerForPushNotifications();
        } else {
            console.log("This function is not supported on Android");
        }
    }

    static promptForPushNotificationsWithUserResponse(callback) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'ios') {
            invariant(
                typeof callback === 'function',
                'Must provide a valid callback'
            );
            RNOneSignal.promptForPushNotificationsWithUserResponse(callback);
        } else {
            console.log("This function is not supported on Android");
        }
    }

    static requestPermissions(permissions) {
        if (!checkIfInitialized()) return;

        var requestedPermissions = {};
        if (Platform.OS === 'ios') {
            if (permissions) {
                requestedPermissions = {
                    alert: !!permissions.alert,
                    badge: !!permissions.badge,
                    sound: !!permissions.sound
                };
            } else {
                requestedPermissions = {
                    alert: true,
                    badge: true,
                    sound: true
                };
            }
            RNOneSignal.requestPermissions(requestedPermissions);
        } else {
            console.log("This function is not supported on Android");
        }
    }

    /* deprecated */
    static configure() {
        console.warn("OneSignal: the `configure` method has been deprecated. The `ids` event is now triggered automatically.");
    }

    static init(appId, iOSSettings) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'ios') {
            RNOneSignal.initWithAppId(appId, iOSSettings);
        } else {
            RNOneSignal.init(appId);
        }
    }

    static checkPermissions(callback) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'ios') {
            invariant(
                typeof callback === 'function',
                'Must provide a valid callback'
            );
            RNOneSignal.checkPermissions(callback);
        } else {
            console.log("This function is not supported on Android");
        }
    }

    static promptForPushNotificationPermissions(callback) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'ios') {
            RNOneSignal.promptForPushNotificationPermissions(callback);
        } else {
            console.log('This function is not supported on Android');
        }
    }

    static getPermissionSubscriptionState(callback) {
        if (!checkIfInitialized()) return;

        invariant(
            typeof callback === 'function',
            'Must provide a valid callback'
        );
        RNOneSignal.getPermissionSubscriptionState(callback);
    }

    static sendTag(key, value) {
        if (!checkIfInitialized()) return;

        if (typeof value === "boolean") {
            value = value.toString();
        }

        RNOneSignal.sendTag(key, value);
    }

    static sendTags(tags) {
        if (!checkIfInitialized()) return;

        Object.keys(tags).forEach((key)=>{
            if (typeof tags[key] === "boolean"){
                tags[key] = tags[key].toString();
            }
        })

        RNOneSignal.sendTags(tags || {});
    }

    static getTags(next) {
        if (!checkIfInitialized()) return;

        RNOneSignal.getTags(next);
    }

    static deleteTag(key) {
        if (!checkIfInitialized()) return;

        RNOneSignal.deleteTag(key);
    }

    static enableVibrate(enable) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
            RNOneSignal.enableVibrate(enable);
        } else {
            console.log("This function is not supported on iOS");
        }
    }

    static enableSound(enable) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
            RNOneSignal.enableSound(enable);
        } else {
            console.log("This function is not supported on iOS");
        }
    }

    static setEmail(email, emailAuthCode, callback) {
        if (!checkIfInitialized()) return;

        if (emailAuthCode === undefined)
            emailAuthCode = null;

        if (callback === undefined)
            callback = function(){};

        RNOneSignal.setEmail(email, emailAuthCode, callback);
    }

    static logoutEmail(callback) {
        if (!checkIfInitialized()) return;

        invariant(
            typeof callback === 'function',
            'Must provide a valid callback'
        );

        RNOneSignal.logoutEmail(callback);
    }

    static setLocationShared(shared) {
        if (!checkIfInitialized()) return;

        RNOneSignal.setLocationShared(shared);
    }

    static setSubscription(enable) {
        if (!checkIfInitialized()) return;

        RNOneSignal.setSubscription(enable);
    }

    static promptLocation() {
        if (!checkIfInitialized()) return;

        //Supported in both iOS & Android
        RNOneSignal.promptLocation();
    }

    static inFocusDisplaying(displayOption) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
            //Android: Set Display option of the notifications. displayOption is of type OSInFocusDisplayOption
            // 0 -> None, 1 -> InAppAlert, 2 -> Notification
            RNOneSignal.inFocusDisplaying(displayOption);
        } else {
            //iOS: displayOption is a number, 0 -> None, 1 -> InAppAlert, 2 -> Notification
            RNOneSignal.setInFocusDisplayType(displayOption);
        }
    }

    static postNotification(contents, data, player_id, otherParameters) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android')
            RNOneSignal.postNotification(JSON.stringify(contents), JSON.stringify(data), JSON.stringify(player_id), JSON.stringify(otherParameters));
        else
            RNOneSignal.postNotification(contents, data, player_id, otherParameters);
    }
	
	static getOneSignalNotificationsCount(callback) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
			if (callback === undefined)
				callback = function(){};
		
            RNOneSignal.getOneSignalNotificationsCount(callback);
        } else {
            console.log("This function is not supported on iOS");
        }
    }

    static clearOneSignalNotifications() {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
            RNOneSignal.clearOneSignalNotifications();
        } else {
            console.log("This function is not supported on iOS");
        }
    }

    static cancelNotification(id) {
        if (!checkIfInitialized()) return;

        if (Platform.OS === 'android') {
            RNOneSignal.cancelNotification(id);
        } else {
            console.log("This function is not supported on iOS");
        }
    }

    //Sends MD5 and SHA1 hashes of the user's email address (https://documentation.onesignal.com/docs/ios-sdk-api#section-synchashedemail)
    static syncHashedEmail(email) {
        if (!checkIfInitialized()) return;

        RNOneSignal.syncHashedEmail(email);
    }

    static setLogLevel(nsLogLevel, visualLogLevel) {
        if (!checkIfInitialized()) return;

        RNOneSignal.setLogLevel(nsLogLevel, visualLogLevel);
    }

    static setRequiresUserPrivacyConsent(required) {
        if (!checkIfInitialized()) return;

        RNOneSignal.setRequiresUserPrivacyConsent(required);
    }

    static provideUserConsent(granted) {
        if (!checkIfInitialized()) return;

        RNOneSignal.provideUserConsent(granted);
    }

    static userProvidedPrivacyConsent() {
        if (!checkIfInitialized()) return;

        //returns a promise
        return RNOneSignal.userProvidedPrivacyConsent();
    }

    static setExternalUserId(externalId, varArg1, varArg2) {
        if (!checkIfInitialized()) return;

        if (typeof varArg1 === "function") {
            RNOneSignal.setExternalUserId(externalId, null, varArg1);
            return;
        }

        RNOneSignal.setExternalUserId(externalId, varArg1, varArg2 || function(){});

    }

    static removeExternalUserId(callback) {
        if (!checkIfInitialized()) return;

        if (callback === undefined)
            callback = function(){};

        RNOneSignal.removeExternalUserId(callback);
    }

    /**
     * In-App Messaging
     */

    // Pass a String key and any value and creates a trigger map to pass to addTriggers()
    static addTrigger(key, value) {
        if (!checkIfInitialized()) return;

        var trigger = {};
        trigger[key] = value;
        RNOneSignal.addTriggers(trigger);
    }


    // Expected format is Map<String, Object>, make sure all values are Objects and keys are Strings
    static addTriggers(triggers) {
        if (!checkIfInitialized()) return;

        RNOneSignal.addTriggers(triggers);
    }

    static removeTriggersForKeys(keys) {
        if (!checkIfInitialized()) return;

        RNOneSignal.removeTriggersForKeys(keys);
    }

    static removeTriggerForKey(key) {
        if (!checkIfInitialized()) return;

        RNOneSignal.removeTriggerForKey(key);
    }

    static getTriggerValueForKey(key) {
        // must return a promise
        if (!checkIfInitialized()) return Promise.resolve();

        return RNOneSignal.getTriggerValueForKey(key);
    }

    static pauseInAppMessages(pause) {
        if (!checkIfInitialized()) return;

        RNOneSignal.pauseInAppMessages(pause);
    }

    /**
     * Outcomes
     */

    static sendOutcome(name, callback=function(){}) {
        if (!checkIfInitialized()) return;

        invariant(
            typeof callback === 'function',
            'Must provide a valid callback'
        );

        RNOneSignal.sendOutcome(name, callback);
    }

    static sendUniqueOutcome(name, callback=function(){}) {
        if (!checkIfInitialized()) return;

        invariant(
            typeof callback === 'function',
            'Must provide a valid callback'
        );

        RNOneSignal.sendUniqueOutcome(name, callback);
    }

    static sendOutcomeWithValue(name, value, callback=function(){}) {
        if (!checkIfInitialized()) return;

        invariant(
            typeof callback === 'function',
            'Must provide a valid callback'
        );

        RNOneSignal.sendOutcomeWithValue(name, Number(value), callback);
    }
}
