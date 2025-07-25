import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeScreenProps {
  onStartTutorial: () => void;
  onSkipTour: () => void;
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartTutorial,
  onSkipTour,
  visible
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 TKD Tracker Beta</Text>
        <Text style={styles.emoji}>🥋</Text>
        <Text style={styles.description}>
          Welcome to the pre-release version of TKD Tracker!
          While the core experience is ready, some features may still be refined before launch.
        </Text>
        <Text style={styles.dataNote}>
          ✅ All your data — including tournaments, scores, and videos — will persist through launch.
        </Text>
        <Text style={styles.feedbackNote}>
          💬 You can submit feedback at any time from the Profile tab using the "Submit Beta Feedback" button.
        </Text>
        <Text style={styles.subtitle}>
          Thanks for helping us make TKD Tracker even better!
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkipTour}>
            <Text style={styles.skipButtonText}>Skip Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton} onPress={onStartTutorial}>
            <Text style={styles.startButtonText}>Start Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    margin: 20,
    alignItems: 'center',
    maxWidth: screenWidth * 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  dataNote: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  feedbackNote: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF0000',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});