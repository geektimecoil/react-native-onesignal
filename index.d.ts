declare module 'react-native-onesignal' {
  export enum OSEventName {
    NotificationReceived = 'OneSignal-remoteNotificationReceived',
    NotificationOpened = 'OneSignal-remoteNotificationOpened',
    PermissionChanged = 'OneSignal-permissionChanged',
    SubscriptionChanged = 'OneSignal-subscriptionChanged',
  }

  export interface OSPermissionState {
    enabled: boolean;
    [key: string]: any;
  }

  export interface OSPermissionStateChanges {
    from: OSPermissionState;
    to: OSPermissionState;
  }

  export interface OSSubscriptionState {
    userId: string;
    pushToken: string;
    userSubscriptionSetting: boolean;
    subscribed: boolean;
    [key: string]: any;
  }

  export interface OSSubscriptionStateChanges {
    from: OSSubscriptionState;
    to: OSSubscriptionState;
  }

  export enum InFocusDisplayType {
    None,
    InAppAlert,
    Notification,
  }

  interface IOSInitOptions {
    autoPrompt?: boolean;
    inAppAlerts?: boolean;
    inAppLaunchURL?: boolean;
    inFocusDisplayOption?: InFocusDisplayType;
  }

  enum ActionType {
    Opened = 0,
    ActionTaken = 1,
  }

  export interface OSNotificationAction {
    type: ActionType;
    actionID?: string;
  }

  interface OSNotificationPayload {
    notificationID: string;
    templateName: string;
    templateId: string;
    title: string;
    body: string;
    additionalData?: any;
    launchURL?: string;
    sound?: string;
    actionButtons?: any[];
    rawPayload: any;

    // Android specific
    smallIcon?: string;
    largeIcon?: string;
    bigPicture?: string;
    smallIconAccentColor?: string;
    ledColor?: string;
    lockScreenVisibility: number;
    groupKey?: string;
    groupMessage?: string;
    fromProjectNumber?: string;
    collapseId: string;
    priority: number;

    // iOS specific
    contentAvailable?: boolean;
    mutableContent?: boolean;
    category?: string;
    badge?: number;
    subtitle?: string;
    attachments?: any;

    [key: string]: any;
  }

  interface OSNotification {
    isAppInFocus: boolean;
    shown: boolean;
    displayType: number;
    payload: OSNotificationPayload;

    // Android specific
    androidNotificationId?: number;
    groupedNotifications?: OSNotificationPayload[];

    // iOS specific
    silentNotification?: boolean;
    mutableContent?: boolean;

    [key: string]: any;
  }

  interface OSNotificationOpenResult {
    notification: OSNotification;
    action: OSNotificationAction;
  }

  export interface Subscription {
    remove(): void;
  }

  export default class OneSignal {
    static init(appId: string, iosOptions?: IOSInitOptions, googleProjectNumber?: string): void;

    static on(eventName: typeof OSEventName.NotificationReceived, handler: (notification: OSNotification) => void): Subscription;
    static on(eventName: typeof OSEventName.NotificationOpened, handler: (result: OSNotificationOpenResult) => void): Subscription;
    static on(eventName: typeof OSEventName.PermissionChanged, handler: (changes: OSPermissionStateChanges) => void): Subscription;
    static on(eventName: typeof OSEventName.SubscriptionChanged, handler: (changes: OSSubscriptionStateChanges) => void): Subscription;

    /**
     * @platform ios
     */
    static promptForPushNotificationsWithUserResponse(): Promise<boolean>;

    static getPermissionSubscriptionState(): Promise<{ subscriptionStatus: OSSubscriptionState; permissionStatus: OSPermissionState }>;

    static getTags(callback: (tags: string[]) => void): void;

    static sendTag(key: string, value: string): Promise<any>;
    static sendTags(tags: any): Promise<any>;

    static deleteTag(key: string): Promise<any>;
    static deleteTags(tags: ReadonlyArray<string>): Promise<any>;

    static setInFocusDisplayType(displayOption: InFocusDisplayType): void;

    /**
     * @platform android
     */
    static enableVibrate(enable: boolean): void;

    /**
     * @platform android
     */
    static enableSound(enable: boolean): void;

    static setLocationShared(shared: boolean): void;

    static promptLocation(): void;

    static syncHashedEmail(email: string): void;

    static postNotification(notificationData: any): Promise<any>;

    /**
     * @platform android
     */
    static cancelNotification(id: string): void;

    /**
     * @platform android
     */
    static clearOneSignalNotifications(): void;

    static setSubscription(enable: boolean): void;

    static setLogLevel(nsLogLevel: number, visualLogLevel: number);
  }
}
