import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getTutorialState, markTutorialCompleted, resetTutorial, saveCurrentStep, markWelcomeScreenSeen, markFirstLoginComplete } from '../app/lib/tutorialStorage';
import { TutorialOverlay } from './TutorialOverlay';
import { WelcomeScreen } from './WelcomeScreen';
import { Dimensions } from 'react-native';
import { useAuth } from './AuthProvider';

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

interface TutorialContextType {
  showTutorial: boolean;
  currentStep: number;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  resetTutorialState: () => void;
  registerStep: (step: TutorialStep) => void;
  checkAndStartTutorial: () => void;
  registerButtonRef: (step: number, ref: any) => void;
  getButtonPosition: (step: number) => Promise<{ x: number; y: number; width: number; height: number } | null>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'step-1',
    title: 'Intro to Navigation Bar',
    description: 'Use the bottom navigation bar to access your Home screen, Tournaments, Competitors, Videos, and more.',
    targetElement: {
      x: 0,
      y: screenHeight - 120,
      width: screenWidth,
      height: 100,
    },
    buttonText: 'Next'
  },
  {
    id: 'step-2',
    title: 'Add a Champion',
    description: 'Track your family and closest teammates here. You\'ll follow their season progress across all tournaments.',
    targetElement: {
      x: 16,
      y: 124,
      width: screenWidth - 32,
      height: 54,
    },
    buttonText: 'Next'
  },
  {
    id: 'step-3',
    title: 'Add a Competitor',
    description: 'These are people you see commonly as you compete. You can track them across multiple tournaments.',
    targetElement: {
      x: screenWidth * 0.4 - 24,
      y: screenHeight - 83,
      width: 48,
      height: 48,
    },
    buttonText: 'Next'
  },
  {
    id: 'step-4',
    title: 'Add a Tournament',
    description: 'Create a new tournament here and track all events, competitors, scores, and placements for that date.',
    targetElement: {
      x: 16,
      y: 124,
      width: screenWidth - 32,
      height: 54,
    },
    buttonText: 'Next'
  },
  {
    id: 'step-5',
    title: 'Videos Tab',
    description: 'View and manage tournament videos here. Upload, watch, share, and track competitor performance with scores and placements.',
    targetElement: {
      x: screenWidth * 0.6 - 24,
      y: screenHeight - 83,
      width: 48,
      height: 48,
    },
    buttonText: 'Finish'
  }
];

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [state, setState] = useState({ hasSeenTutorial: true });
  const hasCheckedTutorial = useRef(false);
  const buttonRefs = useRef<{ [key: number]: any }>({});
  const [dynamicSteps, setDynamicSteps] = useState(tutorialSteps);

  // MAIN FIX: Tutorial initialization happens ONLY once per app load from TutorialProvider
  useEffect(() => {
    const initTutorial = async () => {
      if (hasCheckedTutorial.current || !user) return;

      console.log('TutorialProvider: Initializing tutorial check...');
      const state = await getTutorialState();
      console.log('TutorialProvider: Tutorial state from Supabase:', state);
      hasCheckedTutorial.current = true;

      if (!state.hasSeenTutorial) {
        console.log('TutorialProvider: Starting tutorial for new user');
        if (!state.hasSeenWelcomeScreen) {
          setShowWelcome(true);
        } else {
          setShowTutorial(true);
          setCurrentStep(1);
        }
      } else {
        console.log('TutorialProvider: User has seen tutorial, not showing');
      }
    };

    initTutorial();
  }, [user]);

  const registerButtonRef = (step: number, ref: any) => {
    buttonRefs.current[step] = ref;
  };

  const getButtonPosition = (step: number): Promise<{ x: number; y: number; width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const ref = buttonRefs.current[step];
      if (ref && ref.current) {
        ref.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          resolve({ x: pageX, y: pageY, width, height });
        });
      } else {
        resolve(null);
      }
    });
  };

  const updateStepPosition = async (stepNumber: number) => {
    const position = await getButtonPosition(stepNumber);
    if (position) {
      setDynamicSteps(prev => prev.map(step => 
        step.id === `step-${stepNumber}` 
          ? { ...step, targetElement: position }
          : step
      ));
    }
  };

  // REMOVED: checkAndStartTutorial - no longer needed as tutorial init happens in useEffect
  const checkAndStartTutorial = async () => {
    // This function is now a no-op since tutorial initialization happens in useEffect
    console.log('checkAndStartTutorial called but ignored - tutorial handled by TutorialProvider useEffect');
  };

  const startTutorial = async () => {
    try {
      await markWelcomeScreenSeen();
      setShowWelcome(false);
      setCurrentStep(1);
      setShowTutorial(true);
      await saveCurrentStep(1);
      await updateStepPosition(1);
    } catch (error) {
      console.error('Error starting tutorial:', error);
    }
  };

  const nextStep = async () => {
    try {
      console.log('nextStep called, current step:', currentStep);
      
      const nextStepNum = currentStep + 1;
      console.log('Next step will be:', nextStepNum);
      
      // Only mark completed after final step (step 5)
      if (nextStepNum > 5) {
        console.log('Tutorial completed, closing');
        await markTutorialCompleted();
        setShowTutorial(false);
        setState(prev => ({ ...prev, hasSeenTutorial: true }));
      } else {
        console.log('Advancing to step:', nextStepNum);
        setCurrentStep(nextStepNum);
        await saveCurrentStep(nextStepNum);
        await updateStepPosition(nextStepNum);
      }
    } catch (error) {
      console.error('Error advancing tutorial step:', error);
    }
  };

  const skipTutorial = async () => {
    try {
      console.log('User skipped tutorial, marking as completed');
      await markTutorialCompleted();
      setShowTutorial(false);
      setShowWelcome(false);
      setState(prev => ({ ...prev, hasSeenTutorial: true }));
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  const resetTutorialState = async () => {
    try {
      await resetTutorial();
      setState({ hasSeenTutorial: false });
      setCurrentStep(0);
      setShowWelcome(false);
      setShowTutorial(false);
      hasCheckedTutorial.current = false;
      buttonRefs.current = {};
      setDynamicSteps(tutorialSteps);
      
      setTimeout(() => {
        setShowWelcome(true);
      }, 100);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  const registerStep = () => {};

  const currentStepData = dynamicSteps.find(s => s.id === `step-${currentStep}`);

  if (!user) {
    return (
      <TutorialContext.Provider value={{
        showTutorial: false,
        currentStep: 0,
        startTutorial: () => {},
        nextStep: () => {},
        skipTutorial: () => {},
        resetTutorialState: () => {},
        registerStep: () => {},
        checkAndStartTutorial: () => {},
        registerButtonRef: () => {},
        getButtonPosition: () => Promise.resolve(null),
      }}>
        {children}
      </TutorialContext.Provider>
    );
  }

  return (
    <TutorialContext.Provider value={{
      showTutorial,
      currentStep,
      startTutorial,
      nextStep,
      skipTutorial,
      resetTutorialState,
      registerStep,
      checkAndStartTutorial,
      registerButtonRef,
      getButtonPosition,
    }}>
      {children}
      
      <WelcomeScreen
        visible={showWelcome}
        onStartTutorial={startTutorial}
        onSkipTour={skipTutorial}
      />
      
      {showTutorial && currentStepData && (
        <TutorialOverlay
          step={currentStepData}
          onNext={nextStep}
          onSkip={skipTutorial}
          visible={showTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
};