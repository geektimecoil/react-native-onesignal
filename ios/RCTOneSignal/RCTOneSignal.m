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

#import "RCTOneSignal.h"
#import "RCTOneSignalEventEmitter.h"

@interface RCTOneSignal ()
@end

@implementation RCTOneSignal {
    BOOL didInitialize;
}

+ (RCTOneSignal *) sharedInstance {
    static dispatch_once_t token = 0;
    static id _sharedInstance = nil;
    dispatch_once(&token, ^{
        _sharedInstance = [[RCTOneSignal alloc] init];
    });
    return _sharedInstance;
}

- (void)initOneSignal:(NSDictionary *)launchOptions {

    if (didInitialize)
        return;

    [OneSignal initWithLaunchOptions:launchOptions];
    didInitialize = true;
}

- (void)sendEvent:(NSString *)eventName withBody:(NSDictionary *)body {
    [RCTOneSignalEventEmitter sendEventWithName:eventName withBody:body];
}

- (void)onOSSubscriptionChanged:(OSSubscriptionStateChanges * _Nonnull)stateChanges {
    [self sendEvent:OSEventString(SubscriptionChanged) withBody:stateChanges.toDictionary];
}

- (void)onOSEmailSubscriptionChanged:(OSEmailSubscriptionStateChanges * _Nonnull)stateChanges {
    [self sendEvent:OSEventString(EmailSubscriptionChanged) withBody:stateChanges.toDictionary];
}

- (void)onOSSMSSubscriptionChanged:(OSSMSSubscriptionStateChanges *)stateChanges {
    [self sendEvent:OSEventString(SMSSubscriptionChanged) withBody:stateChanges.toDictionary];
}

- (void)onOSPermissionChanged:(OSPermissionStateChanges *)stateChanges {
    [self sendEvent:OSEventString(PermissionChanged) withBody:stateChanges.toDictionary];
}

@end
