import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function VideoPlayerModal({
  visible,
  videoUrl,
  onClose
}: VideoPlayerModalProps) {
  const [status, setStatus] = useState({});
  const videoRef = useRef<Video>(null);

  const handleVideoError = (error: any) => {
    console.error('Video playback error:', error);
    Alert.alert(
      'Playback Error',
      'Unable to play this video. Please check your connection and try again.',
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const handleVideoPress = (event: any) => {
    // Prevent event bubbling to backdrop
    event.stopPropagation();
  };

  if (!visible || !videoUrl) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            style={styles.videoContainer}
            activeOpacity={1}
            onPress={handleVideoPress}
          >
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: videoUrl }}
              useNativeControls={true}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={true}
              onPlaybackStatusUpdate={setStatus}
              onError={handleVideoError}
            />
          </TouchableOpacity>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight * 0.6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  video: {
    width: '100%',
    height: '100%'
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  }
});