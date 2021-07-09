declare module 'react-native-onesignal' {
    /* O P T I O N   T Y P E   V A L U E S */
    // 0 = None, 1 = Fatal, 2 = Errors, 3 = Warnings, 4 = Info, 5 = Debug, 6 = Verbose
    export type LogLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

    // 0 = NotDetermined, 1 = Denied, 2 = Authorized, 3 = Provisional, 4 = Ephemeral
    export type IosPermissionStatus = 0 | 1 | 2 | 3 | 4;

    // 0 = NotificationClicked, 1 = ButtonClicked
    export type OpenedEventActionType = 0 | 1;

    /* O B S E R V E R  C H A N G E  E V E N T S */
    export interface ChangeEvent<T> {
        from : T;
        to   : T;
    }

    export interface PermissionChange {
        status                  ?: IosPermissionStatus;    // ios
        hasPrompted             ?: boolean;   // ios
        provisional             ?: boolean;   // ios
        areNotificationsEnabled ?: boolean;   // android
    };

    export interface SubscriptionChange {
        userId                  ?: string;
        pushToken               ?: string;
        isSubscribed            : boolean;
        isPushDisabled          : boolean;
    };

    export interface EmailSubscriptionChange {
        emailAddress        ?: string;
        emailUserId         ?: string;
        isEmailSubscribed   : boolean;
    };

    export interface SMSSubscriptionChange {
        smsNumber         ?: string;
        smsUserId         ?: string;
        isSMSSubscribed   : boolean;
    };

    /* N O T I F I C A T I O N S */
    export interface OSNotification {
        body            : string;
        sound           ?: string;
        title           ?: string;
        launchURL       ?: string;
        rawPayload      : object | string; // platform bridges return different types
        actionButtons   ?: object[];
        additionalData  : object;
        notificationId  : string;
        // android only
        groupKey                ?: string;
        groupMessage            ?: string;
        ledColor                ?: string;
        priority                ?: number;
        smallIcon               ?: string;
        largeIcon               ?: string;
        bigPicture              ?: string;
        collapseId              ?: string;
        fromProjectNumber       ?: string;
        smallIconAccentColor    ?: string;
        lockScreenVisibility    ?: string;
        androidNotificationId   ?: number;
        // ios only
        badge               ?: string;
        badgeIncrement      ?: string;
        category            ?: string;
        threadId            ?: string;
        subtitle            ?: string;
        templateId          ?: string;
        templateName        ?: string;
        attachments         ?: object;
        mutableContent      ?: boolean;
        contentAvailable    ?: string;
    }

    /* N O T I F I C A T I O N   &   I A M   E V E N T S */
    export interface NotificationReceivedEvent {
        complete        : (notification?: OSNotification) => void;
        getNotification : () => OSNotification;
    };

    export interface OpenedEvent {
        action          : OpenedEventAction;
        notification    : OSNotification;
    }

    export interface OpenedEventAction {
        type : OpenedEventActionType
    }

    export interface InAppMessageAction {
        closes_message  : boolean;
        first_click     : boolean;
        click_name      ?: string;
        click_url       ?: string;
        outcomes        ?: object[];
        tags            ?: object;
    }

    export interface OutcomeEvent {
        session         : string;
        id              : string;
        timestamp       : number;
        weight          : number;
        notification_ids: string[];
    }

    /* D E V I C E */
    export interface DeviceState {
        userId                          : string;
        pushToken                       : string;
        emailUserId                     : string;
        emailAddress                    : string;
        smsUserId                       : string;
        smsNumber                       : string;
        isSubscribed                    : boolean;
        isPushDisabled                  : boolean;
        isEmailSubscribed               : boolean;
        isSMSSubscribed                 : boolean;
        hasNotificationPermission       ?: boolean; // ios only
        notificationPermissionStatus    ?: IosPermissionStatus;  // ios only
        // areNotificationsEnabled (android) not included since it is converted to hasNotificationPermission in bridge
    }

    /* O N E S I G N A L  I N T E R F A C E */
    export interface OneSignal {
        /**
         * Completes OneSignal initialization by setting the OneSignal Application ID.
         * @param  {string} appId
         * @returns void
         */
        setAppId(appId: string): void;

        /**
         * Add a callback that fires when the native push permission changes.
         * @param  {(event:ChangeEvent<PermissionChange>)=>void} observer
         * @returns void
         */
        addPermissionObserver(observer: (event: ChangeEvent<PermissionChange>) => void): void;

        /**
         * Add a callback that fires when the OneSignal subscription state changes.
         * @param  {(event:ChangeEvent<SubscriptionChange>)=>void} observer
         * @returns void
         */
        addSubscriptionObserver(observer: (event: ChangeEvent<SubscriptionChange>) => void): void;

        /**
         * Add a callback that fires when the OneSignal email subscription changes.
         * @param  {(event:ChangeEvent<EmailSubscriptionChange>)=>void} observer
         * @returns void
         */
        addEmailSubscriptionObserver(observer: (event: ChangeEvent<EmailSubscriptionChange>) => void): void;

        /**
         * Add a callback that fires when the OneSignal sms subscription changes.
         * @param  {(event:ChangeEvent<SMSSubscriptionChange>)=>void} observer
         * @returns void
         */
        addSMSSubscriptionObserver(observer: (event: ChangeEvent<SMSSubscriptionChange>) => void): void;

        /**
         * Set the callback to run just before displaying a notification while the app is in focus.
         * @param  {(event:NotificationReceivedEvent)=>void} handler
         * @returns void
         */
        setNotificationWillShowInForegroundHandler(handler: (event: NotificationReceivedEvent) => void): void;

        /**
         * Set the callback to run on notification open.
         * @param  {(openedEvent:OpenedEvent)=>void} handler
         * @returns void
         */
        setNotificationOpenedHandler(handler: (openedEvent: OpenedEvent) => void): void;

        /**
         * Prompts the iOS user for push notifications.
         * @param  {(response:boolean)=>void} handler
         * @returns void
         */
        promptForPushNotificationsWithUserResponse(handler: (response: boolean) => void): void;
        
        /**
         * Only applies to iOS (does nothing on Android as it always silently registers)
         * Request for Direct-To-History push notification authorization
         * 
         * For more information: https://documentation.onesignal.com/docs/ios-customizations#provisional-push-notifications
         * 
         * @param  {(response:boolean)=>void} handler
         * @returns void
         */
        registerForProvisionalAuthorization(handler?: (response: boolean) => void): void;

        /**
         * Disable the push notification subscription to OneSignal.
         * @param  {boolean} disable
         * @returns void
         */
        disablePush(disable: boolean): void;

        /**
         * Android Only. If notifications are disabled for your application, unsubscribe the user from OneSignal.
         * @param  {boolean} unsubscribe
         * @returns void
         */
        unsubscribeWhenNotificationsAreDisabled(unsubscribe: boolean): void;

        /**
         * True if the application has location share activated, false otherwise
         * @returns Promise<boolean>
         */
        isLocationShared(): Promise<boolean>;

        /**
         * Disable or enable location collection (defaults to enabled if your app has location permission).
         * @param  {boolean} shared
         * @returns void
         */
        setLocationShared(shared: boolean): void;

        /**
         * Prompts the user for location permissions to allow geotagging from the OneSignal dashboard.
         * @returns void
         */
        promptLocation(): void;

        /**
         * This method returns a "snapshot" of the device state for when it was called.
         * @returns Promise<DeviceState>
         */
        getDeviceState(): Promise<DeviceState>;

        /**
         * Allows you to set the app defined language with the OneSignal SDK.
         * @param  {string} language
         * @returns void
         */
        setLanguage(language: string): void;

        /**
         * Tag a user based on an app event of your choosing so they can be targeted later via segments.
         * @param  {string} key
         * @param  {string} value
         * @returns void
         */
        sendTag(key: string, value: string): void;

        /**
         * Tag a user wiht multiple tags based on an app event of your choosing so they can be targeted later via segments.
         * @param  {object} tags
         * @returns void
         */
        sendTags(tags: object): void;

        /**
         * Retrieve a list of tags that have been set on the user from the OneSignal server.
         * @param  {(tags:object)=>void} handler
         * @returns void
         */
        getTags(handler: (tags: object) => void): void;

        /**
         * Deletes a single tag that was previously set on a user.
         * @param  {string} key
         * @returns void
         */
        deleteTag(key: string): void;

        /**
         * Deletes multiple tags that were previously set on a user.
         * @param  {string[]} keys
         */
        deleteTags(keys: string[]);

        /**
         * Allows you to set the user's email address with the OneSignal SDK.
         * @param  {string} email
         * @param  {string} authCode
         * @param  {Function} handler
         * @returns void
         */
        setEmail(email: string, authCode?: string, handler?: Function): void;

        /**
         * If your app implements logout functionality, you can call logoutEmail to dissociate the email from the device.
         * @param  {Function} handler
         */
        logoutEmail(handler?: Function);

        /**
         * Allows you to set the user's SMS number with the OneSignal SDK.
         * @param  {string} smsNumber
         * @param  {string} authCode
         * @param  {Function} handler
         * @returns void
         */
        setSMSNumber(smsNumber: string, authCode?: string, handler?: Function): void;

        /**
         * If your app implements logout functionality, you can call logoutSMSNumber to dissociate the SMS number from the device.
         * @param  {Function} handler
         */
        logoutSMSNumber(handler?: Function);

        /**
         * Send a notification
         * @param  {string} notificationObjectString - JSON string payload (see REST API reference)
         * @param  {(success:object)=>void} onSuccess
         * @param  {(failure:object)=>void} onFailure
         * @returns void
         */
        postNotification(notificationObjectString: string, onSuccess?: (success: object) => void, onFailure?: (failure: object) => void): void;

        /**
         * Android Only. iOS provides a standard way to clear notifications by clearing badge count.
         * @returns void
         */
        clearOneSignalNotifications(): void;

        /**
         * Removes a single OneSignal notification based on its Android notification integer id.
         * @param  {number} id - notification id to cancel
         * @returns void
         */
        removeNotification(id: number): void;

        /**
         * Removes all OneSignal notifications based on its Android notification group Id.
         * @param  {string} id - notification group id to cancel
         * @returns void
         */
        removeGroupedNotifications(id: string): void;

        /**
         * Allows you to use your own system's user ID's to send push notifications to your users.
         * @param  {string} externalId
         * @param  {(results:object)=>void} handler
         * @returns void
         */
        setExternalUserId(externalId: string, handlerOrAuth?: ((results: object) => void) | string, handler?: (results: object) => void): void;

        /**
         * Removes whatever was set as the current user's external user ID.
         * @param  {(results:object)=>void} handler
         * @returns void
         */
        removeExternalUserId(handler?: (results: object) => void): void;

        /**
         * Sets an In-App Message click event handler.
         * @param  {(action:InAppMessageAction)=>void} handler
         * @returns void
         */
        setInAppMessageClickHandler(handler: (action: InAppMessageAction) => void): void;

        /**
         * Add an In-App Message Trigger.
         * @param  {string} key
         * @param  {string} value
         * @returns void
         */
        addTrigger(key: string, value: string): void;

        /**
         * Adds Multiple In-App Message Triggers.
         * @param  {object} triggers
         * @returns void
         */
        addTriggers(triggers: object): void;

        /**
         * Removes a list of triggers based on a collection of keys.
         * @param  {string[]} keys
         * @returns void
         */
        removeTriggersForKeys(keys: string[]): void;

        /**
         * Removes a list of triggers based on a key.
         * @param  {string} key
         * @returns void
         */
        removeTriggerForKey(key: string): void;

        /**
         * Gets a trigger value for a provided trigger key.
         * @param  {string} key
         * @returns void
         */
        getTriggerValueForKey(key: string): Promise<string>;

        /**
         * Pause & unpause In-App Messages
         * @param  {boolean} pause
         * @returns void
         */
        pauseInAppMessages(pause: boolean): void;

        /**
         * Increases the "Count" of this Outcome by 1 and will be counted each time sent.
         * @param  {string} name
         * @param  {(event:OutcomeEvent)=>void} handler
         * @returns void
         */
        sendOutcome(name: string, handler?: (event: OutcomeEvent) => void): void;

        /**
         * Increases "Count" by 1 only once. This can only be attributed to a single notification.
         * @param  {string} name
         * @param  {(event:OutcomeEvent)=>void} handler
         * @returns void
         */
        sendUniqueOutcome(name: string, handler?: (event: OutcomeEvent) => void): void;

        /**
         * Increases the "Count" of this Outcome by 1 and the "Sum" by the value. Will be counted each time sent.
         * If the method is called outside of an attribution window, it will be unattributed until a new session occurs.
         * @param  {string} name
         * @param  {string|number} value
         * @param  {(event:OutcomeEvent)=>void} handler
         * @returns void
         */
        sendOutcomeWithValue(name: string, value: string|number, handler?: (event: OutcomeEvent) => void): void;

        /**
         * Enable logging to help debug if you run into an issue setting up OneSignal.
         * @param  {LogLevel} nsLogLevel - Sets the logging level to print to the Android LogCat log or Xcode log.
         * @param  {LogLevel} visualLogLevel - Sets the logging level to show as alert dialogs.
         * @returns void
         */
        setLogLevel(nsLogLevel: LogLevel, visualLogLevel: LogLevel): void;

        /**
         * Clears all handlers and observers.
         * @returns void
         */
        clearHandlers(): void;

        /**
         * Did the user provide privacy consent for GDPR purposes.
         * @returns Promise<boolean>
         */
        userProvidedPrivacyConsent(): Promise<boolean>;

        /**
         * True if the application requires user privacy consent, false otherwise
         * @returns Promise<boolean>
         */
        requiresUserPrivacyConsent(): Promise<boolean>;

        /**
         * For GDPR users, your application should call this method before setting the App ID.
         * @param  {boolean} required
         * @returns void
         */
        setRequiresUserPrivacyConsent(required: boolean): void;

        /**
         * If your application is set to require the user's privacy consent, you can provide this consent using this method.
         * @param  {boolean} granted
         * @returns void
         */
        provideUserConsent(granted: boolean): void;
    }
    const OneSignal: OneSignal;
    export default OneSignal;
}
