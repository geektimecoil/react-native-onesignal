#if __has_include(<React/RCTConvert.h>)
#import <React/RCTConvert.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUtils.h>
#else
#import "RCTConvert.h"
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RCTUtils.h"
#endif
#import <objc/runtime.h>

#import "RCTOneSignal.h"

#if __IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_8_0

#define UIUserNotificationTypeAlert UIRemoteNotificationTypeAlert
#define UIUserNotificationTypeBadge UIRemoteNotificationTypeBadge
#define UIUserNotificationTypeSound UIRemoteNotificationTypeSound
#define UIUserNotificationTypeNone  UIRemoteNotificationTypeNone
#define UIUserNotificationType      UIRemoteNotificationType

#endif

#define rejectWithError(error) reject([NSString stringWithFormat:@"%ld", (long)error.code], error.description, error)

NSString * const kRCTOSRemoteNotificationReceived = @"OneSignal-remoteNotificationReceived";
NSString * const kRCTOSRemoteNotificationOpened = @"OneSignal-remoteNotificationOpened";
NSString * const kRCTOSPermissionChanged = @"OneSignal-permissionChanged";
NSString * const kRCTOSSubscriptionChanged = @"OneSignal-subscriptionChanged";

@interface RCTOneSignalHelper: NSObject
+ (NSDictionary *) parseJSON: (NSString *) json;
- (void) initOneSignalWithAppId: (NSString *) appId settings: (NSDictionary*)settings launchOptions: (NSDictionary *)launchOptions;

@property (nonatomic, retain) NSDictionary *coldStartNotification;
@property (nonatomic, retain) NSDictionary *coldStartNotificationAction;

@end

@implementation RCTOneSignalHelper

+ (instancetype) shared {
    static RCTOneSignalHelper *sharedRCTOSHelper = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedRCTOSHelper = [[self alloc] init];
    });
    return sharedRCTOSHelper;
}

+ (NSDictionary *) parseJSON: (NSString *) json {
    NSError *jsonError;
    NSData *objectData = [json dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:objectData
                                                         options:NSJSONReadingMutableContainers
                                                           error:&jsonError];

    return dict;
}

- (void) initOneSignalWithAppId: (NSString *) appId settings: (NSDictionary*)settings launchOptions: (NSDictionary *)launchOptions {
    [OneSignal setValue:@"react" forKey:@"mSDKType"];

    [OneSignal initWithLaunchOptions:launchOptions appId:appId handleNotificationReceived:^(OSNotification* notification) {
        NSDictionary *userInfo = [RCTOneSignalHelper parseJSON:[notification stringify]];

        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
            self.coldStartNotification = userInfo;
        });

        [[NSNotificationCenter defaultCenter] postNotificationName:kRCTOSRemoteNotificationReceived object:self userInfo:userInfo];
    }
            handleNotificationAction:^(OSNotificationOpenedResult* openResult) {
                NSDictionary *userInfo = [RCTOneSignalHelper parseJSON:[openResult stringify]];

                static dispatch_once_t onceToken;
                dispatch_once(&onceToken, ^{
                    self.coldStartNotificationAction = userInfo;
                });

                [[NSNotificationCenter defaultCenter] postNotificationName:kRCTOSRemoteNotificationOpened object:self userInfo:userInfo];
            } settings:settings];
}
@end


/*
 * This approach has been taken and then customized from official OneSignal-Cordova-SDK -> https://goo.gl/vvEfkz.
 * Basically it injects application:didFinishLaunchingWithOptions: method of AppDelegate and inits OneSignal without AppId
 * so notification events don't get lost. OneSignal will be then reinitialized when the init JS method gets called with proven app id
 * and if there is some held notification event it will be dispatched in the moment when appropriate event handler registered.
 */
@implementation UIApplication (RCTOneSignal)

static void injectSelector(Class newClass, SEL newSel, Class addToClass, SEL makeLikeSel) {
    Method newMeth = class_getInstanceMethod(newClass, newSel);
    IMP imp = method_getImplementation(newMeth);
    const char* methodTypeEncoding = method_getTypeEncoding(newMeth);

    BOOL successful = class_addMethod(addToClass, makeLikeSel, imp, methodTypeEncoding);
    if (!successful) {
        class_addMethod(addToClass, newSel, imp, methodTypeEncoding);
        newMeth = class_getInstanceMethod(addToClass, newSel);

        Method orgMeth = class_getInstanceMethod(addToClass, makeLikeSel);

        method_exchangeImplementations(orgMeth, newMeth);
    }
}

+ (void)load {
    method_exchangeImplementations(class_getInstanceMethod(self, @selector(setDelegate:)), class_getInstanceMethod(self, @selector(setRCTOneSignalDelegate:)));
}

static Class delegateClass = nil;

- (void) setRCTOneSignalDelegate:(id<UIApplicationDelegate>)delegate {
    if(delegateClass != nil)
        return;
    delegateClass = [delegate class];

    injectSelector(self.class, @selector(oneSignalApplication:didFinishLaunchingWithOptions:),
                   delegateClass, @selector(application:didFinishLaunchingWithOptions:));
    [self setRCTOneSignalDelegate:delegate];
}

- (BOOL)oneSignalApplication:(UIApplication*)application didFinishLaunchingWithOptions:(NSDictionary*)launchOptions {
    [[RCTOneSignalHelper shared] initOneSignalWithAppId:nil settings:@{kOSSettingsKeyAutoPrompt: @(NO), @"kOSSettingsKeyInOmitNoAppIdLogging": @(YES)} launchOptions:launchOptions];

    if ([self respondsToSelector:@selector(oneSignalApplication:didFinishLaunchingWithOptions:)])
        return [self oneSignalApplication:application didFinishLaunchingWithOptions:launchOptions];
    return YES;
}

@end


@interface RCTOneSignal ()
@end

@implementation RCTOneSignal

RCT_EXPORT_MODULE(RCTOneSignal)

- (NSArray<NSString *> *)supportedEvents {
    return @[kRCTOSRemoteNotificationReceived, kRCTOSRemoteNotificationOpened, kRCTOSPermissionChanged, kRCTOSSubscriptionChanged];
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

-(void)addListener:(NSString *)eventName {
    [super addListener:eventName];

    if ([eventName isEqualToString:kRCTOSRemoteNotificationReceived]) {
        if ([RCTOneSignalHelper shared].coldStartNotification) {
            [[NSNotificationCenter defaultCenter] postNotificationName:kRCTOSRemoteNotificationReceived object:self userInfo:[[RCTOneSignalHelper shared].coldStartNotification copy]];
        }
    } else if ([eventName isEqualToString:kRCTOSRemoteNotificationOpened]) {
        if ([RCTOneSignalHelper shared].coldStartNotificationAction) {
            [[NSNotificationCenter defaultCenter] postNotificationName:kRCTOSRemoteNotificationOpened object:self userInfo:[[RCTOneSignalHelper shared].coldStartNotificationAction copy]];
        }
    } else if ([eventName isEqualToString:kRCTOSSubscriptionChanged]) {
        [OneSignal addSubscriptionObserver:self];
    } else if ([eventName isEqualToString:kRCTOSPermissionChanged]) {
        [OneSignal addPermissionObserver:self];
    }

}

- (instancetype)init {
    self = [super init];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(onRemoteNotificationReceived:)
                                                 name:kRCTOSRemoteNotificationReceived
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(onRemoteNotificationOpened:)
                                                 name:kRCTOSRemoteNotificationOpened
                                               object:nil];

    return self;
}

- (void)dealloc {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)onOSSubscriptionChanged:(OSSubscriptionStateChanges*)stateChanges {
    [self sendEventWithName:kRCTOSSubscriptionChanged body:[stateChanges toDictionary]];
}

- (void)onOSPermissionChanged:(OSPermissionStateChanges *)stateChanges {
    [self sendEventWithName:kRCTOSPermissionChanged body:[stateChanges toDictionary]];
}

- (void)onRemoteNotificationReceived:(NSNotification *) notification {
    [self sendEventWithName:kRCTOSRemoteNotificationReceived body:notification.userInfo];
    [RCTOneSignalHelper shared].coldStartNotification = nil;
}


- (void)onRemoteNotificationOpened:(NSNotification *) notification {
    [self sendEventWithName:kRCTOSRemoteNotificationOpened body:notification.userInfo];
    [RCTOneSignalHelper shared].coldStartNotificationAction = nil;
}

RCT_EXPORT_METHOD(initOneSignal:(NSString *) appId settings: (NSDictionary *) settings)
{
    NSMutableDictionary *mutableSettings = [[NSMutableDictionary alloc] init];

    if (settings[@"autoPrompt"])
        mutableSettings[kOSSettingsKeyAutoPrompt] = settings[@"autoPrompt"];

    if (settings[@"inAppAlerts"])
        mutableSettings[kOSSettingsKeyInAppAlerts] = settings[@"inAppAlerts"];

    if (settings[@"inAppLaunchURL"])
        mutableSettings[kOSSettingsKeyInAppLaunchURL] =  settings[@"inAppLaunchURL"];

    if (settings[@"inFocusDisplayOption"])
        mutableSettings[kOSSettingsKeyInFocusDisplayOption] = settings[@"inFocusDisplayOption"];

    dispatch_async(dispatch_get_main_queue(), ^{
        [[RCTOneSignalHelper shared] initOneSignalWithAppId:appId settings:mutableSettings launchOptions:nil];
    });
}

RCT_EXPORT_METHOD(promptForPushNotificationsWithUserResponse:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal promptForPushNotificationsWithUserResponse:^(BOOL accepted) {
        resolve(@{@"accepted": @(accepted)});
    }];
}

RCT_EXPORT_METHOD(getPermissionSubscriptionState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    if (RCTRunningInAppExtension()) {
        resolve(nil);
    }

    OSPermissionSubscriptionState *state = [OneSignal getPermissionSubscriptionState];
    resolve([state toDictionary]);
}

RCT_EXPORT_METHOD(sendTag:(NSString *)key value:(NSString*)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal sendTag:key value:value onSuccess:^(NSDictionary *result) {
        resolve(result);
    } onFailure:^(NSError *error) {
        rejectWithError(error);
    }];
}

RCT_EXPORT_METHOD(sendTags:(NSDictionary *)properties resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal sendTags:properties onSuccess:^(NSDictionary *result) {
        resolve(result);
    } onFailure:^(NSError *error) {
        rejectWithError(error);
    }];

}

RCT_EXPORT_METHOD(getTags:(RCTResponseSenderBlock)callback) {
    [OneSignal getTags:^(NSDictionary *tags) {
        callback(@[tags]);
    } onFailure:^(NSError *error) {
        callback(@[error]);
    }];
}

RCT_EXPORT_METHOD(deleteTag:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal deleteTag:key onSuccess:^(NSDictionary *result) {
        resolve(result);
    } onFailure:^(NSError *error) {
        rejectWithError(error);
    }];
}

RCT_EXPORT_METHOD(deleteTags:(NSArray<NSString *> *)keys resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal deleteTags:keys onSuccess:^(NSDictionary *result) {
        resolve(result);
    } onFailure:^(NSError *error) {
        rejectWithError(error);
    }];
}

RCT_EXPORT_METHOD(setInFocusDisplayType:(int)displayType) {
    [OneSignal setInFocusDisplayType:displayType];
}

RCT_EXPORT_METHOD(setLocationShared:(BOOL)shared) {
    [OneSignal setLocationShared:shared];
}

RCT_EXPORT_METHOD(setSubscription:(BOOL)enable) {
    [OneSignal setSubscription:enable];
}

RCT_EXPORT_METHOD(promptLocation) {
    [OneSignal promptLocation];
}

RCT_EXPORT_METHOD(postNotification:(NSDictionary *)notificationData resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [OneSignal postNotification:notificationData onSuccess:^(NSDictionary *result) {
        resolve(result);
    } onFailure:^(NSError *error) {
        rejectWithError(error);
    }];
}

RCT_EXPORT_METHOD(syncHashedEmail:(NSString*)email) {
    [OneSignal syncHashedEmail:email];
}

RCT_EXPORT_METHOD(setLogLevel:(int)logLevel visualLogLevel:(int)visualLogLevel) {
    [OneSignal setLogLevel:logLevel visualLevel:visualLogLevel];
}

@end

