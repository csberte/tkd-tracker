import { supabase } from './supabase';
import { logEventId } from './eventIdLogger';
import { retryFetchWithBackoff } from './scoreConfirmationHelpers';

export async function updateFinalRanksWithRetry(eventId: string, includeTieBreakers: boolean = true): Promise<void> {
  try {
    console.log('🔄 [updateFinalRanksWithRetry] Starting rank update for event:', eventId);
    logEventId('updateFinalRanksWithRetry - START', eventId, { includeTieBreakers });
    
    // Fetch scores with retry logic to ensure they exist
    const fetchScoresOperation = async () => {
      const { data: scores, error } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .order('total_score', { ascending: false });
      
      if (error) {
        console.error('❌ [updateFinalRanksWithRetry] Error fetching scores:', error);
        throw error;
      }
      
      if (!scores || scores.length === 0) {
        console.log('ℹ️ [updateFinalRanksWithRetry] No scores found for ranking');
        return [];
      }
      
      return scores;
    };
    
    const scores = await retryFetchWithBackoff(
      fetchScoresOperation,
      'updateFinalRanksWithRetry-fetchScores',
      eventId,
      {
        maxRetries: 3,
        delayMs: 100,
        minResults: 0 // Allow empty results
      }
    );
    
    if (scores.length === 0) {
      console.log('ℹ️ [updateFinalRanksWithRetry] No scores to rank');
      return;
    }
    
    // Calculate ranks
    let currentRank = 1;
    let previousScore = null;
    let sameScoreCount = 0;
    
    const rankedScores = scores.map((score, index) => {
      if (previousScore !== null && score.total_score !== previousScore) {
        currentRank = index + 1;
        sameScoreCount = 0;
      } else if (previousScore !== null && score.total_score === previousScore) {
        sameScoreCount++;
      }
      
      previousScore = score.total_score;
      
      return {
        ...score,
        rank: currentRank,
        final_rank: currentRank
      };
    });
    
    // Update ranks in database
    for (const score of rankedScores) {
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({
          rank: score.rank,
          final_rank: score.final_rank
        })
        .eq('id', score.id);
      
      if (updateError) {
        console.error('❌ [updateFinalRanksWithRetry] Error updating rank for score:', score.id, updateError);
        throw updateError;
      }
    }
    
    console.log('✅ [updateFinalRanksWithRetry] Successfully updated ranks for', rankedScores.length, 'scores');
    logEventId('updateFinalRanksWithRetry - SUCCESS', eventId, { scoresUpdated: rankedScores.length });
  } catch (error) {
    console.error('❌ [updateFinalRanksWithRetry] Failed:', error);
    logEventId('updateFinalRanksWithRetry - ERROR', eventId, { error: error?.message });
    throw error;
  }
}

export async function calculateAndSaveFinalRanksWithRetry(eventId: string): Promise<void> {
  try {
    console.log('🔄 [calculateAndSaveFinalRanksWithRetry] Starting for event:', eventId);
    logEventId('calculateAndSaveFinalRanksWithRetry - START', eventId);
    
    // Wait for scores to exist before calculating ranks
    const waitForScoresOperation = async () => {
      const { data: scores, error } = await supabase
        .from('event_scores')
        .select('id, total_score')
        .eq('event_id', eventId);
      
      if (error) {
        console.error('❌ [calculateAndSaveFinalRanksWithRetry] Error checking scores:', error);
        throw error;
      }
      
      return scores || [];
    };
    
    const scores = await retryFetchWithBackoff(
      waitForScoresOperation,
      'calculateAndSaveFinalRanksWithRetry-waitForScores',
      eventId,
      {
        maxRetries: 5,
        delayMs: 200,
        minResults: 1 // Wait for at least 1 score
      }
    );
    
    if (scores.length === 0) {
      console.log('ℹ️ [calculateAndSaveFinalRanksWithRetry] No scores found to rank');
      return;
    }
    
    // Now update the ranks
    await updateFinalRanksWithRetry(eventId, false);
    
    console.log('✅ [calculateAndSaveFinalRanksWithRetry] Successfully calculated and saved ranks');
    logEventId('calculateAndSaveFinalRanksWithRetry - SUCCESS', eventId);
  } catch (error) {
    console.error('❌ [calculateAndSaveFinalRanksWithRetry] Failed:', error);
    logEventId('calculateAndSaveFinalRanksWithRetry - ERROR', eventId, { error: error?.message });
    throw error;
  }
}