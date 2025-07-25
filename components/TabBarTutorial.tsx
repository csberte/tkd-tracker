import React, { useEffect } from 'react';
import { useTutorial } from './TutorialProvider';
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const TabBarTutorial: React.FC = () => {
  const { registerStep, currentStep } = useTutorial();

  useEffect(() => {
    // Register step 1 - Tab Bar Introduction
    registerStep({
      id: 'step-1',
      title: 'Navigation Made Simple',
      description: 'This tab bar is your home base. Quickly switch between tournaments, videos, and more!',
      targetElement: {
        x: 0,
        y: screenHeight - 100, // Approximate tab bar position
        width: screenWidth,
        height: 80,
      },
      buttonText: 'Got It!'
    });
  }, [registerStep]);

  return null; // This component only registers the step
};

export default TabBarTutorial;