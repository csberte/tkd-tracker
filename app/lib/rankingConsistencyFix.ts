import { supabase } from './supabase';

/**
 * Ensures consistent ranking display by:
 * 1. Using final_rank for sorting when available
 * 2. Using placement for medal display
 * 3. Fetching both fields from database
 */

export interface RankingData {
  final_rank: number | null;
  rank: number | null;
  placement: string | null;
  medal: string | null;
}

/**
 * Get the display rank - prioritizes final_rank over rank
 */
export function getDisplayRank(data: RankingData): number {
  return data.final_rank || data.rank || 999;
}

/**
 * Get medal emoji based on rank position
 */
export function getMedalForRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

/**
 * Sort competitors by final_rank first, then rank
 */
export function sortByFinalRank<T extends RankingData>(competitors: T[]): T[] {
  return [...competitors].sort((a, b) => {
    const rankA = getDisplayRank(a);
    const rankB = getDisplayRank(b);
    return rankA - rankB;
  });
}

/**
 * Fetch event participants with both final_rank and placement
 */
export async function fetchEventParticipantsWithRanking(eventId: string) {
  const { data: scoresData, error } = await supabase
    .from('event_scores')
    .select('*, tournament_competitor_id, final_rank, rank, placement, medal')
    .eq('event_id', eventId);
    
  if (error) throw error;
  
  return scoresData || [];
}

/**
 * Update both final_rank and placement consistently
 */
export async function updateRankingFields(scoreId: string, rank: number) {
  const medal = getMedalForRank(rank);
  
  const { error } = await supabase
    .from('event_scores')
    .update({
      final_rank: rank,
      placement: rank <= 3 ? rank.toString() : null,
      medal: medal || null
    })
    .eq('id', scoreId);
    
  if (error) throw error;
}