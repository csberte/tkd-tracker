import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../components/AuthProvider';
import LoginForm from '../components/LoginForm';
import { testConnection } from './lib/supabase';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Test Supabase connection on app start
    const checkConnection = async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        console.warn('Supabase connection issue detected');
        // Don't show alert in production, just log for debugging
        if (__DEV__) {
          Alert.alert(
            'Connection Warning',
            'There may be a connection issue with the database. Please check your internet connection.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    checkConnection();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
          <Text style={styles.loadingSubtext}>Connecting to TaeKwonDo Tracker</Text>
        </View>
      </View>
    );
  }

  if (user) {
    console.log('User authenticated, redirecting to tabs:', user.email);
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>TaeKwonDo Tracker</Text>
        <Text style={styles.subtitle}>Track your champions' journey to greatness</Text>
      </View>
      <LoginForm />
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Debug Mode: Login issues? Check console logs</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#FF0000',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  debugInfo: {
    padding: 20,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});