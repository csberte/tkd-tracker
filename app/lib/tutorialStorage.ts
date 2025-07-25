import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';
const TUTORIAL_STEP_KEY = 'currentTutorialStep';
const WELCOME_SCREEN_KEY = 'hasSeenWelcomeScreen';
const FIRST_LOGIN_KEY = 'isFirstLogin';

export interface TutorialState {
  hasSeenTutorial: boolean;
  completedSteps: string[];
  currentStep: number;
  hasSeenWelcomeScreen: boolean;
  isFirstLogin: boolean;
}

let tutorialStateCache: TutorialState | null = null;
let isLoading = false;

export const getTutorialState = async (): Promise<TutorialState> => {
  if (isLoading) {
    return { 
      hasSeenTutorial: false, 
      completedSteps: [], 
      currentStep: 0,
      hasSeenWelcomeScreen: false,
      isFirstLogin: true
    };
  }
  
  isLoading = true;
  
  try {
    // ALWAYS check Supabase first as single source of truth
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('getTutorialState: Checking has_seen_tutorial for user:', user.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('has_seen_tutorial')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        const hasSeenTutorial = userData.has_seen_tutorial || false;
        console.log('getTutorialState: Supabase has_seen_tutorial:', hasSeenTutorial ? 'TRUE' : 'FALSE');
        
        tutorialStateCache = {
          hasSeenTutorial,
          completedSteps: hasSeenTutorial ? ['completed'] : [],
          currentStep: hasSeenTutorial ? -1 : 0,
          hasSeenWelcomeScreen: hasSeenTutorial,
          isFirstLogin: !hasSeenTutorial
        };
        
        return tutorialStateCache;
      } else {
        console.log('getTutorialState: Error fetching user tutorial state:', error);
      }
    }
    
    // If no Supabase data or user not found, check AsyncStorage as fallback
    const stored = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
    const stepStored = await AsyncStorage.getItem(TUTORIAL_STEP_KEY);
    const welcomeStored = await AsyncStorage.getItem(WELCOME_SCREEN_KEY);
    const firstLoginStored = await AsyncStorage.getItem(FIRST_LOGIN_KEY);
    
    if (stored) {
      const state = JSON.parse(stored);
      tutorialStateCache = {
        ...state,
        currentStep: stepStored ? parseInt(stepStored) : 0,
        hasSeenWelcomeScreen: welcomeStored ? JSON.parse(welcomeStored) : false,
        isFirstLogin: firstLoginStored ? JSON.parse(firstLoginStored) : false
      };
    } else {
      tutorialStateCache = { 
        hasSeenTutorial: false, 
        completedSteps: [], 
        currentStep: 0,
        hasSeenWelcomeScreen: false,
        isFirstLogin: true
      };
    }
    
    return tutorialStateCache;
  } catch (error) {
    console.error('getTutorialState: Error getting tutorial state:', error);
    tutorialStateCache = { 
      hasSeenTutorial: false, 
      completedSteps: [], 
      currentStep: 0,
      hasSeenWelcomeScreen: false,
      isFirstLogin: true
    };
    return tutorialStateCache;
  } finally {
    isLoading = false;
  }
};

export const saveTutorialState = async (state: TutorialState): Promise<void> => {
  try {
    tutorialStateCache = state;
    await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
    await AsyncStorage.setItem(TUTORIAL_STEP_KEY, state.currentStep.toString());
    await AsyncStorage.setItem(WELCOME_SCREEN_KEY, JSON.stringify(state.hasSeenWelcomeScreen));
    await AsyncStorage.setItem(FIRST_LOGIN_KEY, JSON.stringify(state.isFirstLogin));
  } catch (error) {
    console.error('saveTutorialState: Error saving tutorial state:', error);
  }
};

export const markTutorialCompleted = async (): Promise<void> => {
  try {
    console.log('markTutorialCompleted: Tutorial completion started');
    
    // Update Supabase user record FIRST
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('markTutorialCompleted: Setting has_seen_tutorial = true in Supabase for user:', user.id);
      const { error } = await supabase
        .from('users')
        .update({ has_seen_tutorial: true })
        .eq('id', user.id);
      
      if (error) {
        console.error('markTutorialCompleted: Error updating has_seen_tutorial in Supabase:', error);
      } else {
        console.log('markTutorialCompleted: Successfully updated has_seen_tutorial = true in Supabase');
      }
    }
    
    // Update local state and cache
    const state = {
      hasSeenTutorial: true,
      hasSeenWelcomeScreen: true,
      currentStep: -1,
      isFirstLogin: false,
      completedSteps: ['completed']
    };
    
    await saveTutorialState(state);
    
    // Update cache to reflect completion immediately
    tutorialStateCache = state;
    
    console.log('markTutorialCompleted: Tutorial marked as completed successfully');
  } catch (error) {
    console.error('markTutorialCompleted: Error marking tutorial completed:', error);
  }
};

export const resetTutorial = async (): Promise<void> => {
  try {
    console.log('resetTutorial: Resetting tutorial state');
    
    // Update Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ has_seen_tutorial: false })
        .eq('id', user.id);
      
      if (error) {
        console.error('resetTutorial: Error resetting has_seen_tutorial in Supabase:', error);
      }
    }
    
    // Clear cache and local storage
    tutorialStateCache = null;
    await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
    await AsyncStorage.removeItem(TUTORIAL_STEP_KEY);
    await AsyncStorage.removeItem(WELCOME_SCREEN_KEY);
    await AsyncStorage.removeItem(FIRST_LOGIN_KEY);
    
    console.log('resetTutorial: Tutorial reset completed');
  } catch (error) {
    console.error('resetTutorial: Error resetting tutorial:', error);
  }
};

export const markStepCompleted = async (stepId: string): Promise<void> => {
  const state = await getTutorialState();
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
    await saveTutorialState(state);
  }
};

export const saveCurrentStep = async (stepNumber: number): Promise<void> => {
  const state = await getTutorialState();
  state.currentStep = stepNumber;
  await saveTutorialState(state);
};

export const markWelcomeScreenSeen = async (): Promise<void> => {
  const state = await getTutorialState();
  state.hasSeenWelcomeScreen = true;
  await saveTutorialState(state);
};

export const markFirstLoginComplete = async (): Promise<void> => {
  const state = await getTutorialState();
  state.isFirstLogin = false;
  await saveTutorialState(state);
};