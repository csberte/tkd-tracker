import React from 'react';
import { Modal, ModalProps, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from './ErrorBoundary';
import EditTraditionalFormsModal from './EditTraditionalFormsModal';
import TraditionalFormsCompetitorSelectionModal from './TraditionalFormsCompetitorSelectionModal';

interface ModalWrapperProps extends ModalProps {
  children: React.ReactNode;
}

export default function ModalWrapper({ children, ...modalProps }: ModalWrapperProps) {
  return (
    <Modal {...modalProps}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalContainer}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flex: 1, // full expansion
    maxHeight: undefined, // remove height cap
  },
});

// Enhanced modal components with error boundaries
export function SafeScoreCompetitorModal(props: any) {
  const ScoreCompetitorModal = require('./ScoreCompetitorModal').default;
  return (
    <ErrorBoundary>
      <ScoreCompetitorModal {...props} />
    </ErrorBoundary>
  );
}

// CRITICAL FIX: Ensure full edit modal opens with all fields
export function SafeEditTraditionalFormsModal(props: any) {
  return (
    <ErrorBoundary>
      <EditTraditionalFormsModal {...props} />
    </ErrorBoundary>
  );
}

export function SafeTraditionalFormsCompetitorSelectionModal(props: any) {
  return (
    <ErrorBoundary>
      <TraditionalFormsCompetitorSelectionModal {...props} />
    </ErrorBoundary>
  );
}