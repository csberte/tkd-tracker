import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert } from 'react-native';

interface BetaFeedbackButtonProps {
  style?: any;
}

export const BetaFeedbackButton: React.FC<BetaFeedbackButtonProps> = ({ style }) => {
  const handleFeedback = () => {
    const subject = 'TKD Tracker Beta Feedback';
    const body = `Hey TKD Tracker Team,\n\nI'm using the Beta version and wanted to share some feedback:\n\n[Insert your thoughts here]\n\nThanks!`;
    const mailto = `mailto:support@tkdtracker.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Unable to open email app');
    });
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handleFeedback}>
      <Text style={styles.buttonText}>💬 Submit Beta Feedback</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BetaFeedbackButton;