import React, { useState } from 'react';
import { View, Dimensions, PanGestureHandler, PinchGestureHandler, State } from 'react-native';
import { Image } from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface CircularImageCropperProps {
  imageUri: string;
  onCropComplete: (croppedUri: string) => void;
  size?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function CircularImageCropper({ 
  imageUri, 
  onCropComplete, 
  size = 200 
}: CircularImageCropperProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Get image dimensions
  React.useEffect(() => {
    Image.getSize(imageUri, (width, height) => {
      setImageSize({ width, height });
      // Center the image initially
      const aspectRatio = width / height;
      if (aspectRatio > 1) {
        // Landscape image
        scale.value = size / height;
      } else {
        // Portrait or square image
        scale.value = size / width;
      }
      savedScale.value = scale.value;
    });
  }, [imageUri]);

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
      const maxOffset = (size * scale.value - size) / 2;
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
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
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

  const cropImage = async () => {
    // For now, just return the original URI
    // In a full implementation, you would use a library like react-native-image-editor
    // to actually crop the image based on the transform values
    onCropComplete(imageUri);
  };

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
      alignSelf: 'center',
    }}>
      <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
        <Animated.View style={{ flex: 1 }}>
          <PanGestureHandler onGestureEvent={panGestureHandler}>
            <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[
                  {
                    width: imageSize.width,
                    height: imageSize.height,
                  },
                  animatedStyle,
                ]}
                resizeMode="cover"
              />
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
      
      {/* Circular overlay border */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: '#007AFF',
        pointerEvents: 'none',
      }} />
    </View>
  );
}