import { supabase } from './supabase';

export async function fetchScoresForEvent(eventId: string) {
  console.log('[ScoresFetcher] Starting fetch for eventId:', eventId);
  
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .select('*, tournament_competitor: tournament_competitor_id ( name )')
      .eq('event_id', eventId);
    
    if (error) {
      console.error('[ScoresFetcher] Database error:', error.message);
      return [];
    }
    
    console.log('[ScoresFetched]', data);
    
    if (!data || data.length === 0) {
      console.log('[ScoresFetcher] No scores found for event:', eventId);
      return [];
    }
    
    console.log(`[ScoresFetcher] Found ${data.length} scores`);
    
    // Log each entry's details
    data.forEach((entry, index) => {
      console.log(`[ScoresFetcher] Entry ${index + 1}:`, {
        id: entry.id,
        final_rank: entry.final_rank,
        total_score: entry.total_score,
        tournament_competitor_id: entry.tournament_competitor_id,
        competitor_name: entry.tournament_competitor?.name
      });
    });
    
    return data;
    
  } catch (error) {
    console.error('[ScoresFetcher] Unexpected error:', error);
    return [];
  }
}

export function sortCompetitorsByRank(competitors: any[]) {
  console.log('[ScoresFetcher] Sorting competitors by rank');
  
  if (!competitors || competitors.length === 0) {
    console.log('[ScoresFetcher] No competitors to sort');
    return [];
  }
  
  const sorted = competitors.sort((a, b) => {
    if (a.final_rank === null) return 1;
    if (b.final_rank === null) return -1;
    return a.final_rank - b.final_rank;
  });
  
  console.log('[ScoresFetcher] Sorted order:', sorted.map(c => ({ name: c.name, rank: c.final_rank })));
  
  return sorted;
}