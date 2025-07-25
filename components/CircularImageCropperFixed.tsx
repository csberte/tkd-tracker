import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, Dimensions, StyleSheet, Alert } from 'react-native';
import { Image } from 'react-native';
import { PanGestureHandler, PinchGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface CircularImageCropperProps {
  imageUri: string;
  onCropComplete: (croppedUri: string) => void;
  size?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const CircularImageCropperFixed = forwardRef<any, CircularImageCropperProps>(({ 
  imageUri, 
  onCropComplete, 
  size = 200 
}, ref) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Get image dimensions
  React.useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri, 
        (width, height) => {
          setImageSize({ width, height });
          // Set initial scale to fit the circle
          const minScale = size / Math.min(width, height);
          scale.value = minScale;
          savedScale.value = minScale;
        },
        (error) => {
          console.error('Error getting image size:', error);
          // Fallback to original image if cropping fails
          onCropComplete(imageUri);
        }
      );
    }
  }, [imageUri, size]);

  // Capture the cropped image
  const captureImage = async () => {
    try {
      // For now, return the original image
      // In a real implementation, you would use canvas or image manipulation
      // to crop the visible area within the circle
      onCropComplete(imageUri);
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to crop image');
      onCropComplete(imageUri);
    }
  };

  // Expose capture function to parent
  useImperativeHandle(ref, () => ({
    captureImage,
  }));

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    },
    onEnd: () => {
      // Constrain to circle bounds
      const maxOffset = Math.max(0, (Math.min(imageSize.width, imageSize.height) * scale.value - size) / 2);
      translateX.value = withSpring(
        Math.max(-maxOffset, Math.min(maxOffset, translateX.value))
      );
      translateY.value = withSpring(
        Math.max(-maxOffset, Math.min(maxOffset, translateY.value))
      );
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedScale.value = scale.value;
    },
    onActive: (event) => {
      const newScale = savedScale.value * event.scale;
      const minScale = size / Math.min(imageSize.width, imageSize.height);
      scale.value = Math.max(minScale, Math.min(3, newScale));
    },
    onEnd: () => {
      // Ensure minimum scale to fill circle
      const minScale = size / Math.min(imageSize.width, imageSize.height);
      if (scale.value < minScale) {
        scale.value = withSpring(minScale);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.cropArea, { width: size, height: size, borderRadius: size / 2 }]}>
        <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
          <Animated.View style={styles.gestureContainer}>
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              <Animated.View style={styles.imageContainer}>
                <Animated.Image
                  source={{ uri: imageUri }}
                  style={[
                    {
                      width: imageSize.width || size,
                      height: imageSize.height || size,
                    },
                    animatedStyle,
                  ]}
                  resizeMode="cover"
                />
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
        
        {/* Circular overlay border with shadow */}
        <View style={[
          styles.overlay, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
          }
        ]} />
      </View>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropArea: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  gestureContainer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 3,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
});

export default CircularImageCropperFixed;