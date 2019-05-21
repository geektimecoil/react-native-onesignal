/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    Button,
    Image,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    ActivityIndicator,
    Platform,
    ScrollView, 
    Linking
} from 'react-native';

import OneSignal from 'react-native-onesignal';

let imageUri = 'https://cdn-images-1.medium.com/max/300/1*7xHdCFeYfD8zrIivMiQcCQ.png'

export default class RNOneSignal extends Component {
    constructor(properties) {
        super(properties);

        OneSignal.setLogLevel(7, 0);

        let requiresConsent = false;
       
        this.state = {
            emailEnabled: false, 
            animatingEmailButton : false, 
            initialOpenFromPush : "Did NOT open from push",
            activityWidth : 0,
            width: 0,
            activityMargin: 0,
            buttonColor : Platform.OS == "ios" ? "#ffffff" : "#d45653",
            jsonDebugText : "",
            privacyButtonTitle : "Privacy Consent: Not Granted",
            requirePrivacyConsent : requiresConsent
        };

        OneSignal.setRequiresUserPrivacyConsent(requiresConsent);

        OneSignal.init("b2f7f966-d8cc-11e4-bed1-df8f05be55ba", {kOSSettingsKeyAutoPrompt : true});
    }

    validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    async componentDidMount() {
        var providedConsent = await OneSignal.userProvidedPrivacyConsent();

        this.setState({privacyButtonTitle : `Privacy Consent: ${providedConsent ? "Granted" : "Not Granted"}`, privacyGranted : providedConsent});

        OneSignal.setLocationShared(true);
       
        OneSignal.inFocusDisplaying(2)

        this.onReceived = this.onReceived.bind(this);
        this.onOpened = this.onOpened.bind(this);
        this.onIds = this.onIds.bind(this);
        this.onEmailRegistrationChange = this.onEmailRegistrationChange.bind(this);

        OneSignal.addEventListener('received', this.onReceived);
        OneSignal.addEventListener('opened', this.onOpened);
        OneSignal.addEventListener('ids', this.onIds);
        OneSignal.addEventListener('emailSubscription', this.onEmailRegistrationChange);
    }

    componentWillUnmount() {
        OneSignal.removeEventListener('received', this.onReceived);
        OneSignal.removeEventListener('opened', this.onOpened);
        OneSignal.removeEventListener('ids', this.onIds);
        OneSignal.removeEventListener('emailSubscription', this.onEmailRegistrationChange);
    }

    onEmailRegistrationChange(registration) {
        console.log("onEmailRegistrationChange: ", registration);
    }

    onReceived(notification) {
        console.log("Notification received: ", notification);

        this.setState({jsonDebugText : "RECEIVED: \n" + JSON.stringify(notification, null, 2)})
    }

    onOpened(openResult) {
      console.log('Message: ', openResult.notification.payload.body);
      console.log('Data: ', openResult.notification.payload.additionalData);
      console.log('isActive: ', openResult.notification.isAppInFocus);
      console.log('openResult: ', openResult);

      this.setState({jsonDebugText : "OPENED: \n" + JSON.stringify(openResult.notification, null, 2)})
    }

    onIds(device) {
		console.log('Device info: ', device);
    }

    render() {
        return (
            <ScrollView style={styles.scrollView}>
                <View style={styles.container}>
                    <View>
                        <Image style={styles.imageStyle} source={{uri: imageUri}} />
                    </View>
                    <Text style={styles.welcome}>
                        Welcome to React Native!
                    </Text>
                    <Text style={styles.instructions}>
                        To get started, edit index.js
                    </Text>
                    <Text style={styles.instructions}>
                        Double tap R on your keyboard to reload,{'\n'}
                        Shake or press menu button for dev menu
                    </Text>
                    <View style={{flexDirection: 'row', overflow: 'hidden'}}>
                        <View style={styles.buttonContainer}>
                            <Button style={styles.button}
                                onPress={() => {
                                    OneSignal.getTags((tags) => {
                                        console.log("Did get tags: ", tags);

                                        this.setState({jsonDebugText : JSON.stringify(tags, null, 2)});
                                    });
                                }}
                                title="Get Tags"
                                color={this.state.buttonColor}
                            />
                        </View>
                        <View style={styles.buttonContainer}>
                            <Button style={styles.button}
                                onPress={() => {
                                    console.log("Sending tags");

                                    OneSignal.sendTags({"test_property_1" : "test_value_1", "test_property_2" : "test_value_2"});
                                }}
                                title="Send Tags"
                                color={this.state.buttonColor}
                            />
                        </View>
                    </View>
                    <View style={{flexDirection: 'row', overflow: 'hidden'}}>
                        <View style={styles.buttonContainer}>
                            <Button style={styles.button}
                                disabled={!this.state.emailEnabled}
                                onPress={() => {
                                    this.setState({animatingEmailButton : true, activityWidth : 20, activityMargin: 10})

                                    OneSignal.setEmail(this.state.email, (error) => {
                                        console.log("Sent email with error: ", error);

                                        this.setState({animatingEmailButton : false, activityWidth : 0, activityMargin: 0})
                                    });
                                }}
                                title="Set Test Email"
                                color={this.state.buttonColor}
                            />
                        </View>
                        <ActivityIndicator style={{width: this.state.activityWidth, marginLeft : this.state.activityMargin}}
                            animating={this.state.animatingEmailButton}
                        />
                        <View style={styles.buttonContainer}>
                            <Button style={styles.button}
                                onPress={() => {
                                    OneSignal.logoutEmail((error) => {
                                        if (error) {
                                            console.log("Encountered error while attempting to log out: ", error);
                                        } else {
                                            console.log("Logged out successfully");
                                        }
                                    });
                                }}
                                title="Logout Email"
                                color={this.state.buttonColor}
                            />
                        </View>
                    </View>
                    <KeyboardAvoidingView style={{width: 300, height: 40, borderColor: '#d45653', borderWidth: 2, borderRadius: 5, marginTop: 8}}>
                        <TextInput style={styles.textInput}
                                underlineColorAndroid='rgba(0, 0, 0, 0)'
                                placeholderText='testing'
                                placeholder='test@email.com'
                                multiline={false}
                                keyboardType='email-address'
                                returnKeyType='done'
                                textAlign='center'
                                placeholderTextColor='#d1dde3'
                                editable={true}
                                autoCapitalize='none'
                                keyboardAppearance='dark'
                                onChangeText={(newText) => {
                                    this.setState({emailEnabled : this.validateEmail(newText), email : newText});
                                }}
                            />
                    </KeyboardAvoidingView>
                    <View style={styles.buttonContainer}>
                        <Button style={styles.button}
                           onPress={() => {
                              OneSignal.promptLocation();
                           }}
                           title="Prompt Location"
                           color={this.state.buttonColor}
                        />
                    </View>
                    <View style={styles.buttonContainer}>
                        <Button style={styles.button}
                            onPress={() => {
                                OneSignal.getPermissionSubscriptionState((subscriptionState) => {
                                    this.setState({jsonDebugText : JSON.stringify(subscriptionState, null, 2)});
                                });
                            }}
                            title="Print Subscription State"
                            color={this.state.buttonColor}
                        />
                    </View>
                    <View style={styles.buttonContainer}>
                        <Button style={styles.button}
                            disabled={!this.state.requirePrivacyConsent}
                            onPress={() => {
                               this.setState({privacyGranted : !this.state.privacyGranted, privacyButtonTitle : `Privacy State: ${!this.state.privacyGranted ? "Granted" : "Not Granted"}`});
                               OneSignal.provideUserConsent(!this.state.privacyGranted);
                            }}
                            title={this.state.privacyButtonTitle}
                            color={this.state.buttonColor}
                        />
                    </View>
                    <Text style={styles.jsonDebugLabelText}>
                        {this.state.jsonDebugText}
                    </Text>
                </View>
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: '#F5FCFF'
    },
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
        marginHorizontal: 10
    },
    jsonDebugLabelText: {
        textAlign: 'left',
        color: '#333333',
        marginBottom: 5,
        marginHorizontal: 10
    },
    buttonContainer: {
        flexDirection: 'row',
        overflow: 'hidden',
        borderRadius: 10,
        marginVertical: 10,
        marginHorizontal: 10,
        backgroundColor: "#d45653"
    },
    button: {
        color: '#000000',
        flex: 1
    },
    imageStyle: {
        height: 200,
        width: 200,
        marginTop: 20
    },
    textInput: {
        marginHorizontal: 10,
        height: 40
    }
});

AppRegistry.registerComponent('RNOneSignal', () => RNOneSignal);
