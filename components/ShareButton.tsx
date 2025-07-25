import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareVideo } from './ShareVideoHelper';

interface ShareButtonProps {
  videoUrl?: string | null;
  competitorName?: string;
  eventName?: string;
  placement?: string;
  score?: string;
  hasVideo?: boolean;
  rank?: number;
  scoreA?: number;
  scoreB?: number;
  scoreC?: number;
}

export default function ShareButton({
  videoUrl,
  competitorName,
  eventName,
  placement,
  score,
  hasVideo = false,
  rank,
  scoreA,
  scoreB,
  scoreC
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleShare = async () => {
    if (!videoUrl || !hasVideo) return;
    
    setIsSharing(true);
    setProgress(0);
    
    try {
      await shareVideo({
        videoUrl,
        competitorName: competitorName || 'Unknown',
        eventName: eventName || 'Unknown Event',
        placement: placement || 'No placement',
        score: score || 'No score',
        rank: rank,
        scoreA: scoreA,
        scoreB: scoreB,
        scoreC: scoreC,
        onProgressUpdate: (progressValue) => {
          // Only update progress during download phase, not during share
          if (progressValue < 100) {
            setProgress(progressValue);
          }
        }
      });
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      // Reset state after a delay to avoid interfering with share modal
      setTimeout(() => {
        setIsSharing(false);
        setProgress(0);
      }, 1000);
    }
  };

  const getButtonText = () => {
    if (isSharing) {
      if (progress < 100) {
        return `Sharing... ${progress}%`;
      }
      return 'Opening share...';
    }
    return 'Share';
  };

  const isDisabled = !hasVideo || isSharing;
  const iconColor = isDisabled ? '#BDBDBD' : (isSharing ? '#fff' : '#007AFF');
  const buttonStyle = isSharing ? [styles.button, styles.sharingButton] : styles.button;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handleShare}
      disabled={isDisabled}
    >
      <Ionicons name="share-social-outline" size={16} color={iconColor} />
      <Text style={[styles.buttonText, isSharing && styles.sharingText]}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    minWidth: 60
  },
  sharingButton: {
    backgroundColor: '#007AFF'
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333'
  },
  sharingText: {
    color: '#fff'
  }
});