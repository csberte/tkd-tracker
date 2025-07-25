import { fetchEventCompetitorsWithScores } from './eventHelpersRest2Enhanced';
import { calculateRankingsWithTies } from './eventHelpers';
import { validateUUID } from './utils';

export interface RefreshEventStateResult {
  success: boolean;
  competitors: any[];
  error?: string;
}

export async function refreshEventState(eventId: string): Promise<RefreshEventStateResult> {
  console.log('🔄 [refreshEventState] Starting refresh for eventId:', eventId);
  
  if (!eventId || !validateUUID(eventId)) {
    console.error('❌ [refreshEventState] Invalid eventId:', eventId);
    return { success: false, competitors: [], error: 'Invalid event ID' };
  }
  
  try {
    const competitors = await fetchEventCompetitorsWithScores(eventId);
    
    if (!competitors || competitors.length === 0) {
      console.log('⚠️ [refreshEventState] No competitors found for event:', eventId);
      return { success: true, competitors: [] };
    }
    
    const rankedCompetitors = calculateRankingsWithTies(competitors);
    
    console.log('✅ [refreshEventState] Successfully refreshed', rankedCompetitors.length, 'competitors');
    
    return {
      success: true,
      competitors: rankedCompetitors
    };
    
  } catch (error: any) {
    console.error('❌ [refreshEventState] Failed to refresh:', error);
    return {
      success: false,
      competitors: [],
      error: error?.message || 'Unknown error'
    };
  }
}

export async function waitForCompetitorRefresh(
  eventId: string,
  competitorId: string,
  maxRetries: number = 10,
  delayMs: number = 500
): Promise<boolean> {
  console.log('⏳ [waitForCompetitorRefresh] Waiting for competitor to appear:', competitorId);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await refreshEventState(eventId);
      
      if (result.success) {
        const competitor = result.competitors.find(c => 
          c.tournament_competitor_id === competitorId || c.id === competitorId
        );
        
        if (competitor && competitor.total_score !== null && competitor.total_score !== undefined) {
          console.log('✅ [waitForCompetitorRefresh] Competitor found with score:', competitor.total_score);
          return true;
        }
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error('❌ [waitForCompetitorRefresh] Error during retry', i + 1, ':', error);
    }
  }
  
  console.log('⚠️ [waitForCompetitorRefresh] Timeout waiting for competitor to appear');
  return false;
}
