import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SyncingOverlayProps {
  visible: boolean;
  status: 'syncing' | 'waiting_for_visibility' | 'failed';
  onRetry?: () => void;
  onCancel?: () => void;
}

export default function SyncingOverlay({ visible, status, onRetry, onCancel }: SyncingOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 30,
          alignItems: 'center',
          maxWidth: 300,
          width: '100%'
        }}>
          {status === 'syncing' ? (
            <>
              <ActivityIndicator size="large" color="#007AFF" style={{ marginBottom: 20 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 8
              }}>
                Saving score…
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center'
              }}>
                Syncing with server… please wait
              </Text>
            </>
          ) : status === 'waiting_for_visibility' ? (
            <>
              <ActivityIndicator size="large" color="#007AFF" style={{ marginBottom: 20 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 8
              }}>
                Syncing with server…
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center'
              }}>
                Waiting for competitor to appear in results
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="warning" size={48} color="#FF9500" style={{ marginBottom: 20 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 8
              }}>
                Score saved but not yet visible
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
                marginBottom: 20
              }}>
                Please wait a few seconds and try again.
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {onRetry && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#007AFF',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      flex: 1
                    }}
                    onPress={onRetry}
                  >
                    <Text style={{
                      color: 'white',
                      fontSize: 14,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}
                
                {onCancel && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#f0f0f0',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8,
                      flex: 1
                    }}
                    onPress={onCancel}
                  >
                    <Text style={{
                      color: '#333',
                      fontSize: 14,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}