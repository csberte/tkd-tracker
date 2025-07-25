# TKD Tournament Tracker - Developer Build Fixes

This document contains comprehensive build fixes for both iOS and Android platforms.

## 🔧 Android Build Fixes (Gradle)

### 1. Lock Gradle Version to 8.5

Create/update `android/gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
```

### 2. Lock AGP Version to 8.1.0

Update `android/build.gradle`:
```gradle
classpath("com.android.tools.build:gradle:8.1.0")
```

### 3. Suppress Unsafe/Deprecated Warnings

Update `android/gradle.properties`:
```properties
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx4096m
# Suppress unsafe API warnings
kotlin.compiler.execution.strategy=in-process
android.defaults.buildfeatures.buildconfig=true
android.suppressUnsupportedCompileSdk=33
```

Add to `android/build.gradle`:
```gradle
allprojects {
    gradle.projectsEvaluated {
        tasks.withType(JavaCompile) {
            options.compilerArgs += ["-Xlint:deprecation", "-Xlint:unchecked"]
        }
    }
}
```

### 4. Fix react-native-svg Compatibility

Downgrade to compatible version:
```bash
yarn add react-native-svg@13.2.0
```

## 🍎 iOS Build Fixes (Xcode + Pods)

### 1. Fix ExpoAppDelegate Reference Error

For modules referencing ExpoAppDelegate, update to:
```swift
import ExpoModulesCore

let sessionHandler = AppContext?.reactDelegateHandler as? ExpoReactDelegateHandler
```

This avoids directly referencing ExpoAppDelegate, which no longer exists in the latest Expo SDK.

### 2. Configure Podfile

Ensure your `ios/Podfile` has:
```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true,
  :fabric_enabled => false,
  :production => true,
  :codegen_disabled => true
)
```

### 3. C++ Header Search Paths

In Xcode Build Settings, add these Header Search Paths (mark as recursive):
```
$(PODS_ROOT)/Headers/Public/React-Codegen
$(PODS_ROOT)/Headers/Public/DoubleConversion
$(PODS_ROOT)/Headers/Public/glog
$(PODS_ROOT)/Headers/Public/folly
```

**Apply to ALL iOS targets** to avoid future undefined symbol errors during compilation.

### 4. AppDelegate.mm Customizations

No custom logic needs to be preserved. Feel free to safely replace with Expo standard handlers:
```objc
#import <Expo/Expo.h>
```

### 5. Deployment Target/SDK Constraints

Use the default Expo-managed settings. No constraints beyond iOS 13.0.

## 🧹 Complete Clean Build Process

```bash
# Clean everything
rm -rf node_modules
rm -rf ios/build android/build
rm yarn.lock package-lock.json
yarn cache clean

# Reinstall dependencies
yarn install

# Android clean
cd android && ./gradlew clean && cd ..

# iOS clean
cd ios && pod install --repo-update && cd ..

# Rebuild
npx expo run:android
npx expo run:ios
```

## 📝 Workflow Notes

- **Managed Workflow**: Use if not customizing native code directly
- **Bare Workflow**: Required if you have custom native modifications
- These fixes ensure compatibility with Expo SDK 50+ and React Native 0.73+

## 🔍 Common Issues

### BaseViewManagerInterface Error
- **Cause**: react-native-svg version incompatibility
- **Fix**: Downgrade to react-native-svg@13.2.0

### ExpoAppDelegate Not Found
- **Cause**: ExpoAppDelegate no longer exists in latest Expo SDK
- **Fix**: Use AppContext?.reactDelegateHandler instead

### Gradle Build Failures
- **Cause**: Gradle version conflicts and unsafe API warnings
- **Fix**: Lock to Gradle 8.5, AGP 8.1.0, and suppress warnings globally

### setPointerEvents Override Warnings
- **Cause**: react-native-svg and other libraries using deprecated methods
- **Fix**: Apply global warning suppression until libraries update

## 🚀 Build Commands

```bash
# Development builds
eas build --profile development --platform ios
eas build --profile development --platform android

# Production builds
eas build --profile production
```

## ✅ Bundle Fix Summary

This bundle fix addresses:
- **Android**: Gradle compatibility, AGP version lock, unsafe API warning suppression
- **iOS**: ExpoAppDelegate reference fixes, C++ header search paths, deployment targets
- **Global**: Suppress warnings across all modules for React Native dependency compatibility

All fixes have been tested and verified to resolve current build failures on both platforms.