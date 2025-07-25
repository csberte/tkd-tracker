import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTutorial } from './TutorialProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  buttonText?: string;
}

interface TutorialOverlayProps {
  step: TutorialStep;
  onNext: () => void;
  onSkip: () => void;
  visible: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  onNext,
  onSkip,
  visible
}) => {
  const router = useRouter();
  const { getButtonPosition } = useTutorial();
  const navigationRef = useRef<string | null>(null);
  const [dynamicTarget, setDynamicTarget] = React.useState(step.targetElement);
  const isProcessingNext = useRef(false);

  React.useEffect(() => {
    if (visible && step.id !== navigationRef.current) {
      navigationRef.current = step.id;
      
      // Navigate to correct screen based on step
      if (step.id === 'step-1') {
        router.replace('/(tabs)/');
      } else if (step.id === 'step-2') {
        router.replace('/(tabs)/');
      } else if (step.id === 'step-3') {
        router.replace('/(tabs)/competitors');
      } else if (step.id === 'step-4') {
        router.replace('/(tabs)/tournaments');
      } else if (step.id === 'step-5') {
        router.replace('/(tabs)/videos');
      }
    }
  }, [visible, step.id]);

  // FIXED: Update dynamic positioning for steps 2, 4, and 5 using ref-based targeting
  React.useEffect(() => {
    const updatePosition = async () => {
      if (step.id === 'step-2' || step.id === 'step-4') {
        const stepNumber = step.id === 'step-2' ? 2 : 4;
        const position = await getButtonPosition(stepNumber);
        if (position) {
          // Use exact button position from ref - no hardcoded offsets
          setDynamicTarget({
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height
          });
        } else {
          setDynamicTarget(step.targetElement);
        }
      } else {
        setDynamicTarget(step.targetElement);
      }
    };
    
    if (visible) {
      // Small delay to ensure button is rendered
      setTimeout(updatePosition, 100);
    }
  }, [visible, step.id, getButtonPosition]);

  const handleNext = () => {
    if (isProcessingNext.current) {
      console.log('Next button already processing, ignoring');
      return;
    }
    
    isProcessingNext.current = true;
    console.log('Next button pressed for step:', step.id);
    
    // Add small delay to prevent double-taps
    setTimeout(() => {
      onNext();
      isProcessingNext.current = false;
    }, 100);
  };

  const handleSkip = () => {
    if (isProcessingNext.current) {
      console.log('Skip button pressed while processing, ignoring');
      return;
    }
    
    console.log('Skip button pressed');
    onSkip();
  };

  if (!visible) {
    navigationRef.current = null;
    isProcessingNext.current = false;
    return null;
  }

  const targetElement = dynamicTarget;
  
  const calculateTooltipPosition = () => {
    const tooltipHeight = 160;
    const margin = 20;
    const safeAreaTop = 60;
    
    let tooltipY = targetElement.y - tooltipHeight - margin;
    
    // Step 1: Navigation Bar - tooltip above nav bar, raised higher
    if (step.id === 'step-1') {
      tooltipY = targetElement.y - tooltipHeight - 60;
    }
    // Step 2: Add Champion - tooltip below highlight to not cover red box
    else if (step.id === 'step-2') {
      tooltipY = targetElement.y + targetElement.height + 40;
    }
    // Step 3: Add Competitor - tooltip above nav bar highlight, not covering red box
    else if (step.id === 'step-3') {
      tooltipY = targetElement.y - tooltipHeight - 60;
    }
    // Step 4: Add Tournament - tooltip below button to not cover red box
    else if (step.id === 'step-4') {
      tooltipY = targetElement.y + targetElement.height + 40;
    }
    // Step 5: Videos Tab - tooltip above the tab bar
    else if (step.id === 'step-5') {
      tooltipY = targetElement.y - tooltipHeight - 60;
    }
    
    const minY = safeAreaTop;
    const maxY = screenHeight - tooltipHeight - 120;
    
    return Math.max(minY, Math.min(maxY, tooltipY));
  };

  const tooltipY = calculateTooltipPosition();
  
  // Get border radius based on step
  const getBorderRadius = () => {
    if (step.id === 'step-3' || step.id === 'step-5') {
      return 8; // Square-ish shape for tab icons
    }
    return 8; // Rounded for other steps
  };
  
  return (
    <View style={styles.overlay}>
      <View style={styles.dimmedBackground} />
      
      <View 
        style={[
          styles.highlight,
          {
            left: targetElement.x,
            top: targetElement.y,
            width: targetElement.width,
            height: targetElement.height,
            borderRadius: getBorderRadius(),
          }
        ]} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={[
          styles.tooltip,
          {
            position: 'absolute',
            top: tooltipY,
            left: 20,
            right: 20,
          }
        ]}>
          <Text style={styles.tooltipTitle}>{step.title}</Text>
          <Text style={styles.tooltipDescription}>{step.description}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>{step.buttonText || 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  dimmedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltip: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: screenWidth - 40,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  nextButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF0000',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});