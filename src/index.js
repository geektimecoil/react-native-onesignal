'use strict';

import { NativeModules, Platform } from 'react-native';
import EventManager from './EventManager';
import {
    PERMISSION_CHANGED,
    SUBSCRIPTION_CHANGED,
    IN_APP_MESSAGE_CLICKED,
    NOTIFICATION_WILL_SHOW,
    NOTIFICATION_OPENED,
    EMAIL_SUBSCRIPTION_CHANGED,
    SMS_SUBSCRIPTION_CHANGED
} from './events';
import { isValidCallback, isObjectNonNull } from './helpers';

const RNOneSignal = NativeModules.OneSignal;
const eventManager = new EventManager(RNOneSignal);

export default class OneSignal {
    /* I N I T I A L I Z A T I O N */

    /**
     * Sets the OneSignal application Id. 1/2 of the initialization process.
     * @param {string} appId
     */
    static setAppId(appId) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.setAppId(appId);
    }

    /* O B S E R V E R S */

    static addPermissionObserver(observer) {
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(observer);
        RNOneSignal.addPermissionObserver();
        eventManager.addEventHandler(PERMISSION_CHANGED, observer);
    }

    static addSubscriptionObserver(observer) {
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(observer);
        RNOneSignal.addSubscriptionObserver();
        eventManager.addEventHandler(SUBSCRIPTION_CHANGED, observer);
    }

    static addEmailSubscriptionObserver(observer) {
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(observer);
        RNOneSignal.addEmailSubscriptionObserver();
        eventManager.addEventHandler(EMAIL_SUBSCRIPTION_CHANGED, observer);
    }

    static addSMSSubscriptionObserver(observer) {
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(observer);
        RNOneSignal.addSMSSubscriptionObserver();
        eventManager.addEventHandler(SMS_SUBSCRIPTION_CHANGED, observer);
    }

    /* H A N D L E R S */

    /**
     * Sets the handler that fires before the notification is displayed
     * Callback parameter is a `NotificationReceivedEvent` with:
     *  - notification data
     *  - `complete` function that accepts the `NotificationReceivedEvent`
     * @param  {function} handler
     */
    static setNotificationWillShowInForegroundHandler(handler){
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(handler);
        RNOneSignal.setNotificationWillShowInForegroundHandler();
        eventManager.setEventHandler(NOTIFICATION_WILL_SHOW, handler);
    }

    static setNotificationOpenedHandler(handler){
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(handler);

        RNOneSignal.setNotificationOpenedHandler();
        eventManager.setEventHandler(NOTIFICATION_OPENED, handler);
    }

    /* R E G I S T R A T I O N  E T C */

    static promptForPushNotificationsWithUserResponse(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'ios') {
            isValidCallback(handler);
            RNOneSignal.promptForPushNotificationsWithUserResponse(handler);
        } else {
            console.log("promptForPushNotificationsWithUserResponse: this function is not supported on Android");
        }
    }

    static registerForProvisionalAuthorization(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'ios') {
            isValidCallback(handler);
            RNOneSignal.registerForProvisionalAuthorization(handler);
        } else {
            console.log("registerForProvisionalAuthorization: this function is not supported on Android");
        }
    }

    static disablePush(disable) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.disablePush(disable);
    }

    static unsubscribeWhenNotificationsAreDisabled(unsubscribe) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'android') {
            RNOneSignal.unsubscribeWhenNotificationsAreDisabled(unsubscribe);
        } else {
            console.log("unsubscribeWhenNotificationsAreDisabled: this function is not supported on iOS");
        }
    }

    /* L O C A T I O N */

    static isLocationShared() {
        // must return a promise
        if (!isObjectNonNull(RNOneSignal)) return Promise.resolve();
        return RNOneSignal.isLocationShared();
    }

    static setLocationShared(shared) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.setLocationShared(shared);
    }

    static promptLocation() {
        if (!isObjectNonNull(RNOneSignal)) return;

        //Supported in both iOS & Android
        RNOneSignal.promptLocation();
    }

    /* D E V I C E  I N F O */

    /**
     * Gets the device state.
     */
    static async getDeviceState() {
        if (!isObjectNonNull(RNOneSignal)) return Promise.resolve();
        const deviceState = await RNOneSignal.getDeviceState();

        if (Platform.OS === 'android') {
            deviceState['hasNotificationPermission'] = deviceState['areNotificationsEnabled'];
            delete deviceState['areNotificationsEnabled'];
        }

        return deviceState;
    }

    static setLanguage(language) {
        if (!isObjectNonNull(RNOneSignal)) return;
        
        RNOneSignal.setLanguage(language);
    }

    /* T A G S */

    static sendTag(key, value) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!key || (!value && value !== "")) {
            console.error("OneSignal: sendTag: must include a key and a value");
        }

        if (typeof value === "boolean") {
            value = value.toString();
        }

        RNOneSignal.sendTag(key, value);
    }

    static sendTags(tags) {
        if (!isObjectNonNull(RNOneSignal)) return;
        let keys = Object.keys(tags);

        if (keys.length === 0) {
            console.error(`OneSignal: sendTags: argument must be of type object of the form { key : 'value' }`);
        }

        Object.keys(tags).forEach((key)=>{
            if (typeof tags[key] === "boolean"){
                tags[key] = tags[key].toString();
            }
        })

        RNOneSignal.sendTags(tags || {});
    }

    static getTags(callback) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.getTags(callback);
    }

    static deleteTag(key) {
        if (!isObjectNonNull(RNOneSignal)) return;
        if (typeof key !== "string") {
            console.error("OneSignal: deleteTag: key argument must be of type string");
        }
        RNOneSignal.deleteTags([key]);
    }

    static deleteTags(tagKeys) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!Array.isArray(tagKeys)) {
            console.error("OneSignal: deleteTags: argument must be of array type");
        }

        RNOneSignal.deleteTags(tagKeys)
    }

    /* E M A I L */

    static setEmail(email, emailAuthCode, handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (emailAuthCode === undefined)
            emailAuthCode = null;

        if (handler === undefined)
            handler = function(){};

        RNOneSignal.setEmail(email, emailAuthCode, handler);
    }

    static logoutEmail(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!handler)
            handler = function(){};

        RNOneSignal.logoutEmail(handler);
    }

    /* S M S */

    static setSMSNumber(smsNumber, smsAuthCode, handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (smsAuthCode === undefined)
            smsAuthCode = null;

        if (handler === undefined)
            handler = function(){};

        RNOneSignal.setSMSNumber(smsNumber, smsAuthCode, handler);
    }

    static logoutSMSNumber(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!handler)
            handler = function(){};

        RNOneSignal.logoutSMSNumber(handler);
    }

    /* N O T I F I C A T I O N S */

    static postNotification(notificationObjectString, onSuccess, onFailure) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!onSuccess)
            onSuccess = function(){};

        if (!onFailure)
            onFailure = function(){};

        RNOneSignal.postNotification(notificationObjectString, onSuccess, onFailure);
    }

    static clearOneSignalNotifications() {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'android') {
            RNOneSignal.clearOneSignalNotifications();
        } else {
            console.log("clearOneSignalNotifications: this function is not supported on iOS");
        }
    }

    static removeNotification(id) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'android') {
            RNOneSignal.removeNotification(id);
        } else {
            console.log("removeNotification: this function is not supported on iOS");
        }
    }

    static removeGroupedNotifications(id) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (Platform.OS === 'android') {
            RNOneSignal.removeGroupedNotifications(id);
        } else {
            console.log("removeGroupedNotifications: this function is not supported on iOS");
        }
    }

    /* E X T E R N A L  U S E R  I D */

    static setExternalUserId(externalId, varArg1, varArg2) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (typeof varArg1 === "function") {
            RNOneSignal.setExternalUserId(externalId, null, varArg1);
            return;
        }

        if (!varArg2 && Platform.OS === 'ios') {
            varArg2 = function(){};
        }

        RNOneSignal.setExternalUserId(externalId, varArg1, varArg2);
    }

    static removeExternalUserId(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (handler === undefined)
            handler = function(){};

        RNOneSignal.removeExternalUserId(handler);
    }

    /* I N  A P P  M E S S A G I N G */

    static setInAppMessageClickHandler(handler) {
        if (!isObjectNonNull(RNOneSignal)) return;
        isValidCallback(handler);
        RNOneSignal.initInAppMessageClickHandlerParams();
        RNOneSignal.setInAppMessageClickHandler();
        eventManager.setEventHandler(IN_APP_MESSAGE_CLICKED, handler);
    }

    // Pass a String key and any value and creates a trigger map to pass to addTriggers()
    static addTrigger(key, value) {
        if (!isObjectNonNull(RNOneSignal)) return;

        if (!key || !value) {
            console.error("OneSignal: addTrigger: must include a key and a value");
        }

        let trigger = {};
        trigger[key] = value;
        RNOneSignal.addTriggers(trigger);
    }


    // Expected format is Map<String, Object>, make sure all values are Objects and keys are Strings
    static addTriggers(triggers) {
        if (!isObjectNonNull(RNOneSignal)) return;

        let keys = Object.keys(triggers);

        if (keys.length === 0) {
            console.error(`OneSignal: addTriggers: argument must be an object of the form { key : 'value' }`);
        }

        RNOneSignal.addTriggers(triggers);
    }

    static removeTriggersForKeys(keys) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.removeTriggersForKeys(keys);
    }

    static removeTriggerForKey(key) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.removeTriggerForKey(key);
    }

    static getTriggerValueForKey(key) {
        // must return a promise
        if (!isObjectNonNull(RNOneSignal)) return Promise.resolve();
        return RNOneSignal.getTriggerValueForKey(key);
    }

    static pauseInAppMessages(pause) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.pauseInAppMessages(pause);
    }

    /* O U T C O M E S */

    static sendOutcome(name, handler=function(){}) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.sendOutcome(name, handler);
    }

    static sendUniqueOutcome(name, handler=function(){}) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.sendUniqueOutcome(name, handler);
    }

    static sendOutcomeWithValue(name, value, handler=function(){}) {
        if (!isObjectNonNull(RNOneSignal)) return;
        RNOneSignal.sendOutcomeWithValue(name, Number(value), handler);
    }

    /* P R I V A C Y  C O N S E N T */

    static userProvidedPrivacyConsent() {
        if (!isObjectNonNull(RNOneSignal)) return Promise.resolve();

        //returns a promise
        return RNOneSignal.userProvidedPrivacyConsent();
    }

    static requiresUserPrivacyConsent() {
        if (!isObjectNonNull(RNOneSignal)) return Promise.resolve();

        //returns a promise
        return RNOneSignal.requiresUserPrivacyConsent();
    }

    static setRequiresUserPrivacyConsent(required) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.setRequiresUserPrivacyConsent(required);
    }

    static provideUserConsent(granted) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.provideUserConsent(granted);
    }

    /* O T H E R  F U N C T I O N S */

    static setLogLevel(nsLogLevel, visualLogLevel) {
        if (!isObjectNonNull(RNOneSignal)) return;

        RNOneSignal.setLogLevel(nsLogLevel, visualLogLevel);
    }

    static clearHandlers() {
        if (!isObjectNonNull(RNOneSignal)) return;
        eventManager.clearHandlers();
    }
}
