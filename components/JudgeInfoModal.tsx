import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface JudgeInfoModalProps {
  visible: boolean;
  onClose: () => void;
  judgeRole: string;
  eventType?: string;
}

const getJudgeInfo = (role: string, eventType?: string) => {
  // Traditional Forms specific judge info
  if (eventType === 'traditional_forms') {
    switch (role) {
      case 'Judge A':
        return {
          title: 'Judge Responsibilities',
          judgeTitle: 'Judge A',
          subtitle: 'Kicks & Stances',
          description: 'Kicks, Stances'
        };
      case 'Judge B':
        return {
          title: 'Judge Responsibilities',
          judgeTitle: 'Judge B',
          subtitle: 'Hand Techniques',
          description: 'Hand Techniques, Blocks, Strikes'
        };
      case 'Judge C':
        return {
          title: 'Judge Responsibilities',
          judgeTitle: 'Judge C',
          subtitle: 'Center Judge',
          description: 'Overall Presentation, Timing, Rhythm, Memory, Attitude, Enthusiasm'
        };
      default:
        return {
          title: 'Judge Responsibilities',
          judgeTitle: role,
          subtitle: 'All Aspects',
          description: 'All Judges responsible for Quality, Technique, Creativity, Difficulty, Presentation, Attitude, Precision.'
        };
    }
  }
  
  // For Creative and Extreme Forms (unchanged)
  return {
    title: 'Judge Responsibilities',
    judgeTitle: role,
    subtitle: 'All Aspects',
    description: 'All Judges responsible for Quality, Technique, Creativity, Difficulty, Presentation, Attitude, Precision.'
  };
};

export default function JudgeInfoModal({ visible, onClose, judgeRole, eventType }: JudgeInfoModalProps) {
  const judgeInfo = getJudgeInfo(judgeRole, eventType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{judgeInfo.title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {eventType === 'traditional_forms' && (
              <View style={styles.judgeSection}>
                <Text style={styles.judgeTitle}>{judgeInfo.judgeTitle}</Text>
                <Text style={styles.subtitle}>{judgeInfo.subtitle}</Text>
              </View>
            )}
            
            <Text style={styles.description}>{judgeInfo.description}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  modalContainer: {
    width: '80%',
    maxWidth: 300,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  judgeSection: {
    marginBottom: 12,
  },
  judgeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});