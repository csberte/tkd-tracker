
# TKD Tournament Tracker

A React Native app built with Expo for tracking Taekwondo tournament competitors, events, and scoring.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

## EAS Build Setup

### 🔧 Fix for GraphQL Error

If you encounter this error when running `npx eas project:init`:

```
Command failed: npx eas project:init --non-interactive --force
★ eas-cli@16.13.3 is now available.
Error: GraphQL request failed.
```

**Follow these steps exactly:**

### 🔐 1. Authentication

Check if you're logged in:
```bash
eas whoami
```

If not logged in:
```bash
eas login
```

⚠️ **Important**: Use the same Expo account originally used for this project.

### 🛠 2. Manual Project Linking

The `.expo/project.json` file has been created for you. **You must update it** with your actual Expo username:

```json
{
  "extra": {
    "name": "tournament-app",
    "owner": "YOUR_EXPO_USERNAME"
  }
}
```

Replace `"YOUR_EXPO_USERNAME"` with your actual Expo account name.

### ✅ 3. Retry EAS Commands

Once authenticated and linked, try:
```bash
eas build:configure
eas build
eas submit
```

### 💡 Best Practices

- Always initialize git in your project folder
- Run `eas login` before using EAS CLI on new machines
- Avoid `--non-interactive` unless necessary

## Development

### Building for Development

```bash
# iOS development build
eas build --profile development --platform ios

# Android development build  
eas build --profile development --platform android
```

### Building for Production

```bash
# Production build
eas build --profile production
```

## Features

- Competitor management
- Tournament tracking
- Event scoring
- Video management
- Traditional forms scoring
- Tiebreaker handling

## Tech Stack

- React Native with Expo
- Expo Router for navigation
- Supabase for backend
- TypeScript

For detailed build instructions, see [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md).


