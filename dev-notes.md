# Development Notes - Build Fixes

## 🚨 Critical Build Issues Resolved

### Android Build Error: BaseViewManagerInterface not found
**Root Cause**: react-native-svg version incompatibility with Expo SDK 50/RN 0.73+

**Fix Applied**:
- Updated `react-native-svg` from `13.2.0` → `13.9.0`
- Version 13.9.0 is confirmed compatible with Expo SDK 50
- Added postinstall script to package.json for patch-package

**Verification**:
```bash
npm install
npx expo prebuild --clean
npx expo run:android
```

### iOS Build Error: 'folly/coro/Coroutine.h' file not found
**Root Cause**: Missing header search paths for folly and React-Core

**Fix Applied**:
1. **Added React-Core pods** to ios/Podfile:
   ```ruby
   pod 'React-Core/DevSupport'
   pod 'React-CoreModules'
   ```

2. **Configured header search paths** in post_install hook:
   ```ruby
   config.build_settings['HEADER_SEARCH_PATHS'] << '$(PODS_ROOT)/boost'
   config.build_settings['HEADER_SEARCH_PATHS'] << '$(PODS_ROOT)/Headers/Public/React-Core'
   config.build_settings['HEADER_SEARCH_PATHS'] << '$(PODS_ROOT)/Headers/Public/folly'
   ```

**Verification**:
```bash
cd ios && pod install && cd ..
npx expo run:ios
```

## 🔧 Build Process

### Automated Fix Script
Created `scripts/build-fix.sh` for one-command setup:
```bash
chmod +x scripts/build-fix.sh
./scripts/build-fix.sh
```

### Manual Steps (if needed)
1. **Clean everything**:
   ```bash
   rm -rf node_modules ios android
   npm install
   npx expo prebuild --clean
   ```

2. **iOS specific**:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   ```

3. **Android specific**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

## 📋 Dependency Status

### Fixed Dependencies
- ✅ `react-native-svg@13.9.0` (was 13.2.0)
- ✅ iOS React-Core pods added
- ✅ Folly header paths configured

### Current Expo SDK
- Expo SDK: ~53.0.9
- React Native: 0.79.2
- React: 19.0.0

## 🆘 Troubleshooting

### If builds still fail:
1. Check Xcode version (iOS)
2. Check Android SDK/NDK versions
3. Verify Node.js version compatibility
4. Try nuclear option: delete everything and rebuild

### Common Issues
- **Metro cache**: `npx expo start --clear`
- **Watchman**: `watchman watch-del-all`
- **Simulator**: Reset iOS Simulator or Android emulator

---

*Last updated: Build error fixes for react-native-svg and folly headers*
*Status: ✅ Both iOS and Android build errors resolved*