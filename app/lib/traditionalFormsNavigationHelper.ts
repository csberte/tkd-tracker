import { router } from 'expo-router';
import { getOrCreateTraditionalFormsEvent } from './traditionalFormsEventManager';
import { validateUUID } from './utils';

export async function navigateToTraditionalFormsScreen(tournamentId: string): Promise<void> {
  console.log('[navigateToTraditionalFormsScreen] Called with tournamentId:', tournamentId);
  
  if (!tournamentId || typeof tournamentId !== 'string') {
    console.error('[navigateToTraditionalFormsScreen] Invalid tournamentId');
    return;
  }
  
  try {
    if (!validateUUID(tournamentId)) {
      console.error('Invalid tournament ID format:', tournamentId);
      throw new Error('Invalid tournament ID format');
    }
    
    const event = await getOrCreateTraditionalFormsEvent(tournamentId);
    
    if (!event || !event.id) {
      console.error('Failed to get/create Traditional Forms event');
      throw new Error('Failed to initialize Traditional Forms event');
    }
    
    console.log('Navigating to Traditional Forms with eventId:', event.id, 'tournamentId:', tournamentId);
    
    router.push(`/traditional-forms/${event.id}?tournamentId=${tournamentId}`);
    
    console.log('Navigation complete');
    
  } catch (error) {
    console.error('Navigation failed:', error.message);
    throw error;
  }
}

export async function navigateToTraditionalFormsWithSync(router: any, tournamentId: string): Promise<void> {
  return navigateToTraditionalFormsScreen(tournamentId);
}

export async function navigateToTraditionalFormsWithSyncEnhanced(router: any, tournamentId: string): Promise<void> {
  return navigateToTraditionalFormsScreen(tournamentId);
}