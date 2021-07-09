#import "RCTOneSignalEventEmitter.h"
#if __has_include(<OneSignal/OneSignal.h>)
#import <OneSignal/OneSignal.h>
#else
#import "OneSignal.h"
#endif

#import "RCTOneSignal.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"


@implementation RCTOneSignalEventEmitter {
    BOOL _hasListeners;
    BOOL _hasSetSubscriptionObserver;
    BOOL _hasSetPermissionObserver;
    BOOL _hasSetEmailSubscriptionObserver;
    BOOL _hasSetSMSSubscriptionObserver;
    NSMutableDictionary* _notificationCompletionCache;
    NSMutableDictionary* _receivedNotificationCache;
}

static BOOL _didStartObserving = false;

+ (BOOL)hasSetBridge {
    return _didStartObserving;
}

+(BOOL)requiresMainQueueSetup {
    return YES;
}

/*
     This class acts as the module & event emitter
     It is initialized automatically by React-Native
     This subclass handles communication between the SDK and JavaScript
*/

RCT_EXPORT_MODULE(RCTOneSignal)

#pragma mark RCTEventEmitter Subclass Methods

-(instancetype)init {
    if (self = [super init]) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Initialized RCTOneSignalEventEmitter"];
        _notificationCompletionCache = [NSMutableDictionary new];
        _receivedNotificationCache = [NSMutableDictionary new];

        for (NSString *eventName in [self supportedEvents])
            [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(emitEvent:) name:eventName object:nil];
    }

    return self;
}

-(void)startObserving {
    _hasListeners = true;
    [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"RCTOneSignalEventEmitter did start observing"];

    [[NSNotificationCenter defaultCenter] postNotificationName:@"didSetBridge" object:nil];

    _didStartObserving = true;
}

-(void)stopObserving {
    _hasListeners = false;
    [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"RCTOneSignalEventEmitter did stop observing"];
}

-(NSArray<NSString *> *)supportedEvents {
    NSMutableArray *events = [NSMutableArray new];

    for (int i = 0; i < OSNotificationEventTypesArray.count; i++)
        [events addObject:OSEventString(i)];

    return events;
}


#pragma mark Send Event Methods

- (void)emitEvent:(NSNotification *)notification {
    if (!_hasListeners) {
        [OneSignal onesignalLog:ONE_S_LL_WARN message:[NSString stringWithFormat:@"Attempted to send an event (%@) when no listeners were set.", notification.name]];
        return;
    }

    [self sendEventWithName:notification.name body:notification.userInfo];
}

+ (void)sendEventWithName:(NSString *)name withBody:(NSDictionary *)body {
    [[NSNotificationCenter defaultCenter] postNotificationName:name object:nil userInfo:body];
}


#pragma mark Exported Methods

RCT_EXPORT_METHOD(addPermissionObserver) {
    if (!_hasSetPermissionObserver) {
        [OneSignal addPermissionObserver:[RCTOneSignal sharedInstance]];
        _hasSetPermissionObserver = true;
    }
}

RCT_EXPORT_METHOD(addSubscriptionObserver) {
    if (!_hasSetSubscriptionObserver) {
        [OneSignal addSubscriptionObserver:[RCTOneSignal sharedInstance]];
        _hasSetSubscriptionObserver = true;
    }
}

RCT_EXPORT_METHOD(addEmailSubscriptionObserver) {
    if (!_hasSetEmailSubscriptionObserver) {
        [OneSignal addEmailSubscriptionObserver:[RCTOneSignal sharedInstance]];
        _hasSetEmailSubscriptionObserver = true;
    }
}

RCT_EXPORT_METHOD(addSMSSubscriptionObserver) {
    if (!_hasSetSMSSubscriptionObserver) {
        [OneSignal addSMSSubscriptionObserver:[RCTOneSignal sharedInstance]];
        _hasSetSMSSubscriptionObserver = true;
    }
}

RCT_REMAP_METHOD(requiresUserPrivacyConsent, requiresPrivacyConsentResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(OneSignal.requiresUserPrivacyConsent));
}

RCT_EXPORT_METHOD(setRequiresUserPrivacyConsent:(BOOL)required) {
    [OneSignal setRequiresUserPrivacyConsent:required];
}

RCT_EXPORT_METHOD(provideUserConsent:(BOOL)granted) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [OneSignal consentGranted:granted];
    });
}

RCT_REMAP_METHOD(userProvidedPrivacyConsent, privacyConsentResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(!OneSignal.requiresUserPrivacyConsent));
}

RCT_EXPORT_METHOD(setAppId:(NSString* _Nonnull)newAppId) {
    [OneSignal setAppId:newAppId];
}

RCT_EXPORT_METHOD(promptForPushNotificationPermissions:(RCTResponseSenderBlock)callback) {
    [OneSignal promptForPushNotificationsWithUserResponse:^(BOOL accepted) {
        callback(@[@(accepted)]);
    }];
}

RCT_EXPORT_METHOD(requestPermissions:(NSDictionary *)permissions) {
    if (RCTRunningInAppExtension()) {
        return;
    }

    UIUserNotificationType types = UIUserNotificationTypeNone;
    if (permissions) {
        if ([RCTConvert BOOL:permissions[@"alert"]]) {
            types |= UIUserNotificationTypeAlert;
        }
        if ([RCTConvert BOOL:permissions[@"badge"]]) {
            types |= UIUserNotificationTypeBadge;
        }
        if ([RCTConvert BOOL:permissions[@"sound"]]) {
            types |= UIUserNotificationTypeSound;
        }
    } else {
        types = UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
    }

    UIApplication *app = RCTSharedApplication();
    if ([app respondsToSelector:@selector(registerUserNotificationSettings:)]) {
        UIUserNotificationSettings *notificationSettings =
        [UIUserNotificationSettings settingsForTypes:(NSUInteger)types categories:nil];
        [app registerUserNotificationSettings:notificationSettings];
        [app registerForRemoteNotifications];
    } else {
        [app registerForRemoteNotificationTypes:(NSUInteger)types];
    }
}

RCT_REMAP_METHOD(getDeviceState,
                getDeviceStateResolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject) {
    OSDeviceState *deviceState = [OneSignal getDeviceState];

    if (deviceState) {
        resolve([deviceState jsonRepresentation]);
    } else {
        NSError * error = nil;
        NSString * message = @"Could not get OneSignal device state";
        reject(@"no_value", message, error);
    }
}

RCT_EXPORT_METHOD(setLanguage:(NSString *)language) {
    [OneSignal setLanguage:language];
}

RCT_EXPORT_METHOD(setNotificationOpenedHandler) {
    [OneSignal setNotificationOpenedHandler:^(OSNotificationOpenedResult *result) {
        [RCTOneSignalEventEmitter sendEventWithName:@"OneSignal-remoteNotificationOpened" withBody:[result jsonRepresentation]];
    }];
}

RCT_EXPORT_METHOD(setNotificationWillShowInForegroundHandler) {
    __weak RCTOneSignalEventEmitter *weakSelf = self;
    [OneSignal setNotificationWillShowInForegroundHandler:^(OSNotification *notif, OSNotificationDisplayResponse completion) {
        RCTOneSignalEventEmitter *strongSelf = weakSelf;
        if(!strongSelf) {
            return;
        }
        strongSelf->_receivedNotificationCache[notif.notificationId] = notif;
        strongSelf->_notificationCompletionCache[notif.notificationId] = completion;
        [RCTOneSignalEventEmitter sendEventWithName:@"OneSignal-notificationWillShowInForeground" withBody:[notif jsonRepresentation]];
    }];
}

RCT_EXPORT_METHOD(completeNotificationEvent:(NSString*)notificationId displayOption:(BOOL)shouldDisplay) {
    OSNotificationDisplayResponse completion = _notificationCompletionCache[notificationId];
    if (!completion) {
        [OneSignal onesignalLog:ONE_S_LL_ERROR message:[NSString stringWithFormat:@"OneSignal (objc): could not find notification completion block with id: %@", notificationId]];
        return;
    }

    if (shouldDisplay) {
        OSNotification *notif = _receivedNotificationCache[notificationId];
        dispatch_async(dispatch_get_main_queue(), ^{
            completion(notif);
        });
    } else {
        completion(nil);
    }

    [_notificationCompletionCache removeObjectForKey:notificationId];
    [_receivedNotificationCache removeObjectForKey:notificationId];
}

RCT_EXPORT_METHOD(setEmail:(NSString *)email withAuthHash:(NSString *)authHash withResponse:(RCTResponseSenderBlock)callback) {
    // Auth hash token created on server and sent to client.
    [OneSignal setEmail:email withEmailAuthHashToken:authHash withSuccess:^{
        callback(@[]);
    } withFailure:^(NSError *error) {
        callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

RCT_EXPORT_METHOD(logoutEmail:(RCTResponseSenderBlock)callback) {
    [OneSignal logoutEmailWithSuccess:^{
        callback(@[]);
    } withFailure:^(NSError *error) {
        callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

RCT_EXPORT_METHOD(setSMSNumber:(NSString *)smsNumber withAuthHash:(NSString *)authHash withResponse:(RCTResponseSenderBlock)callback) {
    // Auth hash token created on server and sent to client.
    [OneSignal setSMSNumber:smsNumber withSMSAuthHashToken:authHash withSuccess:^(NSDictionary *results) {
        callback(@[results]);
    } withFailure:^(NSError *error) {
        callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

RCT_EXPORT_METHOD(logoutSMSNumber:(RCTResponseSenderBlock)callback) {
    [OneSignal logoutSMSNumberWithSuccess:^(NSDictionary *results) {
        callback(@[results]);
    } withFailure:^(NSError *error) {
        callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

RCT_EXPORT_METHOD(promptForPushNotificationsWithUserResponse:(RCTResponseSenderBlock)callback) {
    [OneSignal promptForPushNotificationsWithUserResponse:^(BOOL accepted) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Prompt For Push Notifications Success"];
        callback(@[@(accepted)]);
    }];
}

RCT_EXPORT_METHOD(registerForProvisionalAuthorization:(RCTResponseSenderBlock)callback) {
    [OneSignal registerForProvisionalAuthorization:^(BOOL accepted) {
        callback(@[@(accepted)]);
    }];
}

RCT_EXPORT_METHOD(sendTag:(NSString *)key value:(NSString*)value) {
    [OneSignal sendTag:key value:value];
}

RCT_EXPORT_METHOD(sendTags:(NSDictionary *)properties) {
    [OneSignal sendTags:properties onSuccess:^(NSDictionary *sucess) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Send Tags Success"];
    } onFailure:^(NSError *error) {
        [OneSignal onesignalLog:ONE_S_LL_ERROR message:[NSString stringWithFormat:@"Send Tags Failure With Error: %@", error]];
    }];}

RCT_EXPORT_METHOD(getTags:(RCTResponseSenderBlock)callback) {
    [OneSignal getTags:^(NSDictionary *tags) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Get Tags Success"];
        callback(@[tags]);
    } onFailure:^(NSError *error) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"Get Tags Failure with error: %@", error]];
        callback(@[error]);
    }];
}

RCT_REMAP_METHOD(isLocationShared,
                isLocationSharedResolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject) {

    BOOL locationShared = [OneSignal isLocationShared];
    resolve(@(locationShared));
}

RCT_EXPORT_METHOD(setLocationShared:(BOOL)shared) {
    [OneSignal setLocationShared:shared];
}

RCT_EXPORT_METHOD(deleteTags:(NSArray *)keys) {
    [OneSignal deleteTags:keys];
}

RCT_EXPORT_METHOD(disablePush:(BOOL)disabled) {
    [OneSignal disablePush:disabled];
}

RCT_EXPORT_METHOD(promptLocation) {
    [OneSignal promptLocation];
}

RCT_EXPORT_METHOD(postNotification:(NSString *)jsonObjectString successCallback:(RCTResponseSenderBlock)successCallback failureCallback:(RCTResponseSenderBlock)failureCallback) {
    if (!successCallback || !failureCallback) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"postNotification must contain success & failure callbacks"];
        return;
    }
    [OneSignal postNotificationWithJsonString:jsonObjectString onSuccess:^(NSDictionary *success) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Successfully sent notification."];
        successCallback(@[success]);
    } onFailure:^(NSError *error) {
        [OneSignal onesignalLog:ONE_S_LL_ERROR message:[NSString stringWithFormat:@"Notification Send Failure with Error: %@", error]];
        failureCallback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

RCT_EXPORT_METHOD(setLogLevel:(int)logLevel visualLogLevel:(int)visualLogLevel) {
    [OneSignal setLogLevel:logLevel visualLevel:visualLogLevel];
}

RCT_EXPORT_METHOD(setExternalUserId:(NSString *)externalId) {
    [OneSignal setExternalUserId:externalId];
}

RCT_EXPORT_METHOD(setExternalUserId:(NSString*)externalId withAuthHash:(NSString *)authHash withCompletion:(RCTResponseSenderBlock)callback) {
    [OneSignal setExternalUserId:externalId withExternalIdAuthHashToken:authHash withSuccess:^(NSDictionary* results) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Set external user id complete"];
        if (callback) {
            callback(@[results]);
        }
    } withFailure:^(NSError *error) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"OneSignal setExternalUserId error: %@", error]];
        if (callback) {
            callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
        }
    }];
}

RCT_EXPORT_METHOD(removeExternalUserId) {
    [OneSignal removeExternalUserId];
}

RCT_EXPORT_METHOD(removeExternalUserId:(RCTResponseSenderBlock)callback) {
    [OneSignal removeExternalUserId:^(NSDictionary* results) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:@"Remove external user id complete"];
        if (callback) {
            callback(@[results]);
        }
    } withFailure:^(NSError *error) {
        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"OneSignal removeExternalUserId error: %@", error]];
        callback(@[error.userInfo[@"error"] ?: error.localizedDescription]);
    }];
}

/*
 * In-App Messaging
 */

RCT_EXPORT_METHOD(addTriggers:(NSDictionary *)triggers) {
    [OneSignal addTriggers:triggers];
}

RCT_EXPORT_METHOD(removeTriggersForKeys:(NSArray *)keys) {
    [OneSignal removeTriggersForKeys:keys];
}

RCT_EXPORT_METHOD(removeTriggerForKey:(NSString *)key) {
    [OneSignal removeTriggerForKey:key];
}

RCT_REMAP_METHOD(getTriggerValueForKey,
                key:(NSString *)key
                getTriggerValueForKeyResolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject) {

    NSString *val = [OneSignal getTriggerValueForKey:key];

    if (val) {
        resolve(val);
    } else {
        NSError * error = nil;
        NSString * message = [NSString stringWithFormat:@"There was no value for the key: %@", key];
        reject(@"no_value", message, error);
    }
}

RCT_EXPORT_METHOD(pauseInAppMessages:(BOOL)pause) {
    [OneSignal pauseInAppMessages:pause];
}

RCT_EXPORT_METHOD(setInAppMessageClickHandler) {
    [OneSignal setInAppMessageClickHandler:^(OSInAppMessageAction *action) {
        [RCTOneSignalEventEmitter sendEventWithName:@"OneSignal-inAppMessageClicked" withBody:[action jsonRepresentation]];
    }];
}

RCT_EXPORT_METHOD(initInAppMessageClickHandlerParams) {
    // iOS Stub
}

/*
 * Outcomes
 */
RCT_EXPORT_METHOD(sendOutcome:(NSString *)name :(RCTResponseSenderBlock)callback) {
    [OneSignal sendOutcome:name onSuccess:^(OSOutcomeEvent *outcome){
        if (outcome) {
            callback(@[[outcome jsonRepresentation]]);
            return;
        }

        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"sendOutcome OSOutcomeEvent is nil."]];
    }];
}

RCT_EXPORT_METHOD(sendUniqueOutcome:(NSString *)name :(RCTResponseSenderBlock)callback) {
    [OneSignal sendUniqueOutcome:name onSuccess:^(OSOutcomeEvent *outcome){
        if (outcome) {
            callback(@[[outcome jsonRepresentation]]);
            return;
        }

        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"sendUniqueOutcome OSOutcomeEvent is nil."]];
    }];
}

RCT_EXPORT_METHOD(sendOutcomeWithValue:(NSString *)name :(NSNumber * _Nonnull)value :(RCTResponseSenderBlock)callback) {
    [OneSignal sendOutcomeWithValue:name value:value onSuccess:^(OSOutcomeEvent *outcome){
        if (outcome) {
            callback(@[[outcome jsonRepresentation]]);
            return;
        }

        [OneSignal onesignalLog:ONE_S_LL_VERBOSE message:[NSString stringWithFormat:@"sendOutcomeWithValue OSOutcomeEvent is nil."]];
    }];
}

@end
