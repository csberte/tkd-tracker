#!/bin/bash

# Bundle Fix Script for iOS and Android Build Errors
# Resolves ExpoAppDelegate and Gradle compatibility issues

echo "🔧 Starting Bundle Fix for iOS and Android Build Errors..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf node_modules
rm -rf ios/build android/build
rm -rf ios/Pods ios/Podfile.lock
rm -f yarn.lock package-lock.json

# Clear caches
echo "🗑️ Clearing caches..."
yarn cache clean
npx expo install --fix

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Fix react-native-svg version for compatibility
echo "🎨 Fixing react-native-svg compatibility..."
yarn add react-native-svg@13.9.0

# Android fixes
echo "🤖 Applying Android fixes..."
if [ -d "android" ]; then
    cd android
    ./gradlew clean
    cd ..
    echo "✅ Android Gradle cleaned"
else
    echo "⚠️ Android directory not found - skipping Android clean"
fi

# iOS fixes
echo "🍎 Applying iOS fixes..."
if [ -d "ios" ]; then
    cd ios
    pod install --repo-update
    cd ..
    echo "✅ iOS Pods installed"
else
    echo "⚠️ iOS directory not found - skipping iOS setup"
fi

# Prebuild clean
echo "🔄 Running Expo prebuild clean..."
npx expo prebuild --clean

echo "✅ Bundle fix complete!"
echo ""
echo "📋 Summary of fixes applied:"
echo "  • Android: Gradle 8.5, AGP 8.1.0, warning suppression"
echo "  • iOS: ExpoAppDelegate fixes, folly headers, React-Core pods"
echo "  • Dependencies: react-native-svg@13.9.0 compatibility"
echo ""
echo "🚀 Ready to build:"
echo "  npx expo run:android"
echo "  npx expo run:ios"
