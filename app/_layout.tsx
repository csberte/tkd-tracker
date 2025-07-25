import './lib/clonePolyfill';
import 'react-native-get-random-values';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../components/AuthProvider';
import { TutorialProvider } from '../components/TutorialProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TutorialProvider>
          <StatusBar style="light" backgroundColor="#FF0000" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 300,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="tournament/[id]NoHomeFlash" 
              options={{ 
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300
              }} 
            />
            <Stack.Screen 
              name="traditional-forms/[eventId]NoHomeFlash" 
              options={{ 
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 300,
                animationTypeForReplace: 'pop'
              }} 
            />
          </Stack>
        </TutorialProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}