import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AnimatedModal from './AnimatedModal';

interface ConfirmationModalProps {
  visible: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmStyle?: 'default' | 'destructive';
}

export default function ConfirmationModal({
  visible,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  confirmStyle = 'destructive'
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    console.log('ConfirmationModal: Confirm button pressed');
    onConfirm();
  };

  const handleCancel = () => {
    console.log('ConfirmationModal: Cancel button pressed');
    if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  const confirmButtonStyle = confirmStyle === 'destructive' 
    ? styles.confirmButton 
    : styles.defaultConfirmButton;
  
  const confirmTextStyle = confirmStyle === 'destructive'
    ? styles.confirmText
    : styles.defaultConfirmText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <AnimatedModal visible={visible} style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={confirmButtonStyle} 
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={confirmTextStyle}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </AnimatedModal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    alignItems: 'center',
  },
  defaultConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  defaultConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});