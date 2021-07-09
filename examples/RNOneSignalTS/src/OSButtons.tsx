import OneSignal, { OutcomeEvent } from 'react-native-onesignal';
import * as React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { renderButtonView, renderFieldView } from './Helpers';
import { SubscribeFields } from './models/SubscribeFields';

export interface Props {
    subscribeFields: SubscribeFields;
    loggingFunction: Function;
    inputFieldValue: string;
}

export interface State {
    isSubscribed: boolean;
    unSubscribedWhenNotificationDisabled: boolean;
    isLocationShared: boolean;
    provideUserConsent: boolean;
    requireUserConsent: boolean;
    pauseIAM: boolean;
    state: any;
}

class OSButtons extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        const subscribeFields = props.subscribeFields;

        this.state = {
            isSubscribed: subscribeFields.isSubscribed,
            unSubscribedWhenNotificationDisabled: true,
            isLocationShared: true,
            provideUserConsent: false,
            requireUserConsent: false,
            pauseIAM: false,
            state: {}
        };
    }

    async componentDidMount() {
        let state = await OneSignal.getDeviceState();
        this.setState({ state })
    }

    createSubscribeFields() {
        const { subscribeFields, loggingFunction } = this.props;
        const { isSubscribed } = subscribeFields;
        const { unSubscribedWhenNotificationDisabled, isLocationShared } = this.state;
        const color = '#D45653';
        const elements = [];

        const subscribedButton = renderButtonView(
            isSubscribed ? "Disable Push" : "Subscribe",
            color,
            () => {
                loggingFunction(`Is Push Disabled: ${isSubscribed}`);
                OneSignal.disablePush(isSubscribed);
            }
        );
    
        const unsubscribeWhenNotificationsAreDisabledButton = renderButtonView(
            unSubscribedWhenNotificationDisabled ? "Unsubscribe When Notifications Disabled" : "Subscribe when notification disabled",
            color,
            () => {
                loggingFunction(`Is application unsubscribed when notification disabled: ${unSubscribedWhenNotificationDisabled}`);
                OneSignal.unsubscribeWhenNotificationsAreDisabled(unSubscribedWhenNotificationDisabled);
                this.setState({ unSubscribedWhenNotificationDisabled : !unSubscribedWhenNotificationDisabled });
            }
        );

        const promptForPush = renderButtonView(
            "Prompt for Push",
            color,
            () => {
                loggingFunction("Prompting for push with user response...");
                OneSignal.promptForPushNotificationsWithUserResponse(response => {
                    loggingFunction(`User response: ${response}`);
                });
            }
        );

        const registerForProvisionalAuthorization = renderButtonView(
            "Register For Provisional Authorization",
            color,
            () => {
                loggingFunction("Register For Provisional Authorization with user response...");
                OneSignal.registerForProvisionalAuthorization(response => {
                    loggingFunction(`User response: ${response}`);
                });
            }
        );

        const locationShared = renderButtonView("is Location Shared", color, async () => {
            const appHasLocationShared = await OneSignal.isLocationShared();
            loggingFunction(`Application has location shared active: ${appHasLocationShared}`);
        })

        const setLocationShared = renderButtonView(
            isLocationShared ? "Unshare Location" : "Share Location",
            color,
            () => {
                loggingFunction(`Is Location Shared: ${!isLocationShared}`);
                OneSignal.setLocationShared(!isLocationShared);
                this.setState({ isLocationShared : !isLocationShared });
            }
        );

        const promptLocationButton = renderButtonView(
            "Prompt Location",
            color,
            () => {
                loggingFunction("Prompting Location");
                OneSignal.promptLocation();
            }
        );

        elements.push(subscribedButton, 
            unsubscribeWhenNotificationsAreDisabledButton, 
            registerForProvisionalAuthorization,
            locationShared, setLocationShared, promptLocationButton);

        if (Platform.OS === 'ios') {
            elements.push(promptForPush);
        }

        return elements;
    }

    createDeviceFields() {
        const color = "#051B2C";
        const elements = [];
        const { loggingFunction } = this.props;

        const deviceStateButton = renderButtonView("Get Device State", color, async () => {
            const deviceState = await OneSignal.getDeviceState();
            loggingFunction(`Device State: ${JSON.stringify(deviceState)}`);
        })

        const setLanguageButton = renderButtonView(
            "Set Language", 
            color, 
            () => {
                loggingFunction('Attempting to set language: ', this.props.inputFieldValue);
                OneSignal.setLanguage(this.props.inputFieldValue);
            }
        );

        const requireUserProvideConsent = renderButtonView(
            this.state.requireUserConsent ? "Remove User Privacy Consent Requirement" : "Require User Privacy Consent",
            color,
            () => {
                loggingFunction(`Require User Consent: ${!this.state.requireUserConsent}`);
                OneSignal.setRequiresUserPrivacyConsent(!this.state.requireUserConsent);
                this.setState({ requireUserConsent : !this.state.requireUserConsent });
            }
        )

        const appRequireUserProvideConsent = renderButtonView(
            "is Privacy Consent Required",
            color,
            async () => {
                const appRequiresUserPrivacyConsent = await OneSignal.requiresUserPrivacyConsent();
                loggingFunction(`Application requires privacy consent: ${appRequiresUserPrivacyConsent}`);
         })

        const provideUserConsentButton = renderButtonView(
            this.state.provideUserConsent ? "Reject User Consent" : "Provide User Consent", color, async () => {
                loggingFunction(`Provide User Consent: ${!this.state.provideUserConsent}`);
                OneSignal.provideUserConsent(!this.state.provideUserConsent);
                this.setState({ provideUserConsent: !this.state.provideUserConsent })
        })

        const userProvidedPrivacyConsent = renderButtonView("Did User Provide Privacy Consent", color, async () => {
            const didProvide = await OneSignal.userProvidedPrivacyConsent();
            loggingFunction(`Provided Privacy Consent: ${didProvide}`);
        })

        elements.push(
            deviceStateButton,
            setLanguageButton,
            requireUserProvideConsent,
            appRequireUserProvideConsent,
            provideUserConsentButton,
            userProvidedPrivacyConsent,
            );
        return elements;
    }

    createNotificationFields() {
        const color = "#3A3DB3";
        const elements = [];
        const { loggingFunction } = this.props;

        const postNotificationButton = renderButtonView(
            "Post Notification",
            color,
            async () => {
                const { userId } = await OneSignal.getDeviceState();
                const notificationObj = {
                    contents: {en: "Message Body"},
                    include_player_ids: [userId]
                };
                const json = JSON.stringify(notificationObj);

                loggingFunction(`Attempting to send notification to ${userId}`);

                OneSignal.postNotification(json, (success) => {
                    loggingFunction(`Success: ${JSON.stringify(success)}`);
                }, (failure) => {
                    loggingFunction(`Failure: ${JSON.stringify(failure)}`);
                });
            }
        );

        const removeNotificationButton = renderButtonView(
            "Remove Notification With Android ID",
            color,
            () => {
                const number: number = Number(this.props.inputFieldValue);
                loggingFunction("Removing notification with id:", number);
                OneSignal.removeNotification(number);
            }
        )

        const removeGroupedNotificationButton = renderButtonView(
            "Remove Grouped Notifications With Group ID",
            color,
            () => {
                const groupId: string = this.props.inputFieldValue;
                loggingFunction("Removing notification with group id:", groupId);
                OneSignal.removeGroupedNotifications(groupId);
            }
        )

        const sendTagWithKey = renderButtonView(
            "Send tag with key my_tag",
            color,
            async () => {
                loggingFunction("Sending tag with value: ", this.props.inputFieldValue);
                OneSignal.sendTag("my_tag", this.props.inputFieldValue);
            }
        )

        const getTags = renderButtonView("Get tags", color, async () => {
            loggingFunction("Privacy consent required for getting tags");
            loggingFunction("Getting tags...");
            OneSignal.getTags((tags) => {
                loggingFunction(`Tags: ${JSON.stringify(tags)}`);
            });
        });

        const deleteTagWithKey = renderButtonView("Delete Tag With Key", color, async () => {
            loggingFunction("Deleting tag with key: ", this.props.inputFieldValue);
            OneSignal.deleteTag(this.props.inputFieldValue);
        });

        const clearOneSignalNotificationsButton = renderButtonView("Clear OneSignal Notifications", color, async () => {
            OneSignal.clearOneSignalNotifications();
        })

        elements.push(
            postNotificationButton,
            sendTagWithKey,
            getTags,
            deleteTagWithKey,
            removeNotificationButton,
            removeGroupedNotificationButton
        );

        if (Platform.OS === "android") {
            elements.push(clearOneSignalNotificationsButton);
        }

        return elements;
    }

    createSMSFields() {
        let elements = [];
        const { loggingFunction } = this.props;
        const color = "#1E8FEB";

        // Set SMS Button
        const setSMSButton = renderButtonView(
            "Set SMS Number",
            color,
            () => {
                loggingFunction('Attempting to set SMS number: ', this.props.inputFieldValue);
                OneSignal.setSMSNumber(this.props.inputFieldValue, undefined, (res : string) => {
                    loggingFunction("setSMSNumber completed with result: ", res);
                });
            }
        );

        // Logout SMS Button
        const logoutSMSButton = renderButtonView(
            "Logout SMS Number",
            color,
            () => {
                loggingFunction('Attempting to logout SMS number');
                OneSignal.logoutSMSNumber((res: string) => {
                    loggingFunction("logoutSMSNumber completed with result: ", res);
                });
            }
        );

        elements.push(setSMSButton, logoutSMSButton);
        return elements;
    }

    createEmailFields() {
        let elements = [];
        const { loggingFunction } = this.props;
        const color = "#1E8FEB";

        // Set Email Button
        const setEmailButton = renderButtonView(
            "Set Email",
            color,
            () => {
                loggingFunction('Attempting to set email: ', this.props.inputFieldValue);
                OneSignal.setEmail(this.props.inputFieldValue, undefined, (res : string) => {
                    loggingFunction("setEmail completed with result: ", res);
                });
            }
        );

        // Logout Email Button
        const logoutEmailButton = renderButtonView(
            "Logout Email",
            color,
            () => {
                loggingFunction('Attempting to logout email');
                OneSignal.logoutEmail((res: string) => {
                    loggingFunction("logoutEmail completed with result: ", res);
                });
            }
        );

        const externalUserIdButton = renderButtonView(
            "Set External User Id",
            color,
            () => {
                loggingFunction("Attempting to set external id: ", this.props.inputFieldValue);
                OneSignal.setExternalUserId(this.props.inputFieldValue, "aaa", (res: object) => {
                    loggingFunction("setExternalUserId completed with result: ", JSON.stringify(res));
                })
            }
        )

        const removeExternalIdButton = renderButtonView(
            "Remove External Id",
            color,
            () => {
                loggingFunction("Removing external id...");
                OneSignal.removeExternalUserId((res: object) => {
                    loggingFunction("removeExternalUserId completed with result: ", JSON.stringify(res));
                })
            }
        )

        elements.push(setEmailButton, logoutEmailButton, externalUserIdButton, removeExternalIdButton);
        return elements;
    }

    createInAppFields() {
        let elements = [];
        const { loggingFunction } = this.props;
        const color = "#FEA61D";

        const addTriggerButton = renderButtonView(
            "Add trigger with key my_trigger",
            color,
            () => {
                const triggerValue = this.props.inputFieldValue;
                loggingFunction(`Adding trigger with key 'my_trigger' and value ${triggerValue}`);
                OneSignal.addTrigger(`my_trigger`, triggerValue);
            }
        );

        const removeTriggerButton = renderButtonView(
            "Remove trigger for key",
            color,
            () => {
                const key = this.props.inputFieldValue;
                loggingFunction("Removing trigger for key: ", key);
                OneSignal.removeTriggerForKey(key);
            }
        )

        const pauseIamButton = renderButtonView(
            this.state.pauseIAM ? "Unpause IAM" : "Pause IAM",
            color,
            () => {
                const newPauseState = !this.state.pauseIAM;
                loggingFunction(`Is IAM Paused: ${newPauseState}`);
                OneSignal.pauseInAppMessages(newPauseState)
                this.setState({ pauseIAM: newPauseState })
            }
        )

        const getTriggerValueForKeyButton = renderButtonView(
            "Get Trigger Value For Key",
            color,
            async () => {
                try {
                    const key = this.props.inputFieldValue;
                    const value = await OneSignal.getTriggerValueForKey(key);
                    loggingFunction(`Trigger value for key ${key}: `, value);
                } catch (e) {
                    loggingFunction("Error getting trigger value: ", e.message);
                }
            }
        )

        elements.push(addTriggerButton, removeTriggerButton, pauseIamButton, getTriggerValueForKeyButton);
        return elements;
    }

    createOutcomeFields() {
        let elements = [];
        const { loggingFunction } = this.props;
        const color = "#FF36A0";

        const sendOutcomeButton = renderButtonView(
            "Send Outcome With Name",
            color,
            () => {
                loggingFunction("Sending outcome: ", this.props.inputFieldValue);
                OneSignal.sendOutcome(this.props.inputFieldValue, (event: OutcomeEvent) => {
                    loggingFunction("Outcome Event: ", event);
                });
            }
        );

        const sendUniqueOutcomeButton = renderButtonView(
            "Send Unique Outcome With Name",
            color,
            () => {
                loggingFunction("Sending unique outcome: ", this.props.inputFieldValue);
                OneSignal.sendUniqueOutcome(this.props.inputFieldValue, (event: OutcomeEvent) => {
                    loggingFunction("Unique Outcome Event: ", event);
                });
            }
        );

        const sendOutcomeWithValueButton = renderButtonView(
            "Send Outcome 'my_outcome' with value",
            color,
            () => {
                const value = Number(this.props.inputFieldValue);
                loggingFunction("Sending outcome of name 'my_outcome' with value: ", value);

                if (Number.isNaN(value)) {
                    console.error("Outcome with value should be a number");
                    return;
                }
                OneSignal.sendOutcomeWithValue('my_outcome', value, (event: OutcomeEvent) => {
                    loggingFunction("Outcome With Value Event: ", event);
                });
            }
        );

        elements.push(sendOutcomeButton, sendUniqueOutcomeButton, sendOutcomeWithValueButton);
        return elements;
    }

    render() {
        return (
            <View style={ styles.root }>
                <View style={ styles.container }>
                    { this.createSubscribeFields() }
                    { this.createDeviceFields() }
                    { this.createNotificationFields() }
                    { this.createSMSFields() }
                    { this.createEmailFields() }
                    { this.createInAppFields() }
                    { this.createOutcomeFields() }
                </View>
            </View>
        );
    }
};

// styles
const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    alignSelf: 'center'
  },
  buttons: {
    flexDirection: 'row',
    minHeight: 70,
    alignItems: 'stretch',
    alignSelf: 'center',
    borderWidth: 5
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap'
  },
  button: {
    flex: 1,
    paddingVertical: 0
  },
  greeting: {
    color: '#999',
    fontWeight: 'bold'
  }
});

export default OSButtons;
