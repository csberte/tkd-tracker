import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AnimatedModal } from './AnimatedModal';

interface LoadingToastProps {
  visible: boolean;
  message: string;
}

export default function LoadingToast({ visible, message }: LoadingToastProps) {
  return (
    <AnimatedModal visible={visible} onClose={() => {}}>
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});