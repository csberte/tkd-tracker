import { supabase } from './supabase';
import { logEventId } from './eventIdLogger';

export async function retryFetchWithBackoff<T>(
  fetchFn: () => Promise<T[]>,
  operationName: string,
  eventId: string,
  options: {
    maxRetries?: number;
    delayMs?: number;
    minResults?: number;
  } = {}
): Promise<T[]> {
  const {
    maxRetries = 5,
    delayMs = 100,
    minResults = 0,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fetchFn();
    if (result.length >= minResults) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
  }

  return [];
}

export async function waitForScoreToExist({
  supabase,
  eventId,
  tournamentCompetitorId,
  maxAttempts = 5
}: {
  supabase: any;
  eventId: string;
  tournamentCompetitorId: string;
  maxAttempts?: number;
}) {
  let attempt = 0;
  let delay = 100;

  while (attempt < maxAttempts) {
    const { data, error } = await supabase
      .from('event_scores')
      .select('id')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', tournamentCompetitorId)
      .maybeSingle();

    if (data && !error) return true;

    await new Promise(res => setTimeout(res, delay));
    delay *= 2;
    attempt += 1;
  }

  console.error('[ERROR] Score not found after max attempts for:', { eventId, tournamentCompetitorId });
  return false;
}

export async function waitForCompetitorToHaveScore({
  eventId,
  competitorId,
  timeoutMs = 5000,
  intervalMs = 500,
}: {
  eventId: string;
  competitorId: string;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<{ success: boolean; timedOut: boolean }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from('event_scores')
      .select('id')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', competitorId)
      .gt('score', 0);
    if (data && data.length > 0) return { success: true, timedOut: false };
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log('[waitForCompetitorToHaveScore] Timeout - proceeding gracefully');
  return { success: false, timedOut: true };
}

export async function confirmScoreInsert(
  eventId: string,
  competitorId: string,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<boolean> {
  const { maxRetries = 5, delayMs = 100 } = options;
  
  logEventId('confirmScoreInsert - START', eventId, { competitorId, maxRetries, delayMs });
  console.log(`🔍 Score inserted for competitor: ${competitorId}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 [confirmScoreInsert] Attempt ${attempt}/${maxRetries} to confirm score exists`);
      
      const { data: score, error } = await supabase
        .from('event_scores')
        .select('id, total_score')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .maybeSingle();
      
      if (error) {
        console.error(`❌ [confirmScoreInsert] Attempt ${attempt} error:`, error);
        logEventId(`confirmScoreInsert - ATTEMPT_${attempt}_ERROR`, eventId, { error: error.message });
        
        if (attempt < maxRetries) {
          const delay = delayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
      
      if (score) {
        console.log(`✅ [confirmScoreInsert] Confirmed score exists after ${attempt} retries`);
        logEventId('confirmScoreInsert - SUCCESS', eventId, { attempt, scoreId: score.id });
        return true;
      }
      
      console.log(`⏳ [confirmScoreInsert] Attempt ${attempt}: Score not found yet`);
      logEventId(`confirmScoreInsert - ATTEMPT_${attempt}_NOT_FOUND`, eventId);
      
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ [confirmScoreInsert] Attempt ${attempt} failed:`, error);
      logEventId(`confirmScoreInsert - ATTEMPT_${attempt}_FAILED`, eventId, { error: error?.message });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`❌ [confirmScoreInsert] Failed to confirm score after ${maxRetries} attempts`);
  logEventId('confirmScoreInsert - FAILED', eventId, { maxRetries });
  return false;
}