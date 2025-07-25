import { supabase } from './supabase';
import { calculateTournamentPoints } from './tournamentPoints';

export interface CompetitorWithScore {
  id: string;
  tournament_competitor_id?: string;
  name: string;
  totalScore: number;
  rank: number;
  final_rank?: number;
  tie_breaker_status?: string;
  medal?: string;
  points?: number;
}

export function getUnresolvedTieGroupsInTop3(competitors: CompetitorWithScore[]): CompetitorWithScore[][] {
  if (!Array.isArray(competitors) || competitors.length < 2) {
    return [];
  }
  
  const sorted = [...competitors].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  const scoreGroups: { [score: number]: CompetitorWithScore[] } = {};
  sorted.forEach(competitor => {
    const score = competitor.totalScore || 0;
    if (!scoreGroups[score]) {
      scoreGroups[score] = [];
    }
    scoreGroups[score].push(competitor);
  });
  
  let currentRank = 1;
  const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
  const tieGroups: CompetitorWithScore[][] = [];
  
  for (const score of sortedScores) {
    const group = scoreGroups[score];
    
    if (currentRank <= 3 && group.length >= 2) {
      // Check if this tie is unresolved (no tie_breaker_status)
      const hasUnresolvedTie = group.some(c => !c.tie_breaker_status);
      if (hasUnresolvedTie) {
        tieGroups.push(group);
      }
    }
    
    currentRank += group.length;
    
    if (currentRank > 3) {
      break;
    }
  }
  
  return tieGroups;
}

export function getAllTieGroupsInTop3(competitors: CompetitorWithScore[]): CompetitorWithScore[][] {
  if (!Array.isArray(competitors) || competitors.length < 2) {
    return [];
  }
  
  const sorted = [...competitors].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  const scoreGroups: { [score: number]: CompetitorWithScore[] } = {};
  sorted.forEach(competitor => {
    const score = competitor.totalScore || 0;
    if (!scoreGroups[score]) {
      scoreGroups[score] = [];
    }
    scoreGroups[score].push(competitor);
  });
  
  let currentRank = 1;
  const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
  const tieGroups: CompetitorWithScore[][] = [];
  
  for (const score of sortedScores) {
    const group = scoreGroups[score];
    
    if (currentRank <= 3 && group.length >= 2) {
      tieGroups.push(group);
    }
    
    currentRank += group.length;
    
    if (currentRank > 3) {
      break;
    }
  }
  
  return tieGroups;
}

export function getTieGroupResolutionStatus(competitors: CompetitorWithScore[]): boolean[] {
  const allTieGroups = getAllTieGroupsInTop3(competitors);
  return allTieGroups.map(group => 
    group.every(c => c.tie_breaker_status && c.tie_breaker_status !== '')
  );
}

export async function processTiebreakerResults(
  eventId: string,
  tiedGroup: CompetitorWithScore[],
  selectedWinners: any[],
  tournamentClass: string = 'A',
  skipRefresh: boolean = false
): Promise<void> {
  if (!Array.isArray(tiedGroup) || tiedGroup.length === 0) {
    console.warn('[processTiebreakerResults] No tied group provided');
    return;
  }
  
  if (!Array.isArray(selectedWinners) || selectedWinners.length === 0) {
    console.warn('[processTiebreakerResults] No winners selected');
    return;
  }
  
  const selectedIds = selectedWinners.map(w => {
    if (typeof w === 'string') {
      return w;
    }
    if (w && typeof w === 'object' && w.id) {
      return w.id;
    }
    if (w && typeof w === 'object' && w.tournament_competitor_id) {
      return w.tournament_competitor_id;
    }
    return null;
  }).filter(id => id !== null);
  
  if (selectedIds.length === 0) {
    console.error('[processTiebreakerResults] No valid IDs extracted');
    return;
  }
  
  try {
    const { data: totalCompetitorsData, error: totalError } = await supabase
      .from('event_participants')
      .select('tournament_competitor_id')
      .eq('event_id', eventId);
      
    if (totalError) throw totalError;
    const totalCompetitors = totalCompetitorsData?.length || 0;
    
    const baseRank = Math.min(...tiedGroup.map(c => c.rank || 999));
    const updates = [];
    
    for (let i = 0; i < selectedIds.length; i++) {
      const winnerId = selectedIds[i];
      const winner = tiedGroup.find(c => 
        c.id === winnerId || 
        c.tournament_competitor_id === winnerId
      );
      
      if (!winner?.id) continue;
      
      const newRank = baseRank + i;
      let medal = null;
      if (newRank === 1) medal = '🥇';
      else if (newRank === 2) medal = '🥈';
      else if (newRank === 3) medal = '🥉';
      
      const points = calculateTournamentPoints(newRank, tournamentClass, totalCompetitors);
      
      updates.push({
        score_id: winner.id,
        final_rank: newRank,
        medal,
        points,
        tie_breaker_status: `selected_${i + 1}`
      });
    }
    
    const unselectedCompetitors = tiedGroup.filter(c => 
      c?.id && !selectedIds.includes(c.id) && !selectedIds.includes(c.tournament_competitor_id || '')
    );
    
    for (let i = 0; i < unselectedCompetitors.length; i++) {
      const competitor = unselectedCompetitors[i];
      if (!competitor?.id) continue;
      
      const newRank = baseRank + selectedIds.length + i;
      let medal = null;
      if (newRank === 1) medal = '🥇';
      else if (newRank === 2) medal = '🥈';
      else if (newRank === 3) medal = '🥉';
      
      const points = calculateTournamentPoints(newRank, tournamentClass, totalCompetitors);
      
      updates.push({
        score_id: competitor.id,
        final_rank: newRank,
        medal,
        points,
        tie_breaker_status: 'unselected'
      });
    }
    
    for (const update of updates) {
      if (!update?.score_id) continue;
      
      const { error } = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          medal: update.medal,
          points: update.points,
          tie_breaker_status: update.tie_breaker_status
        })
        .eq('id', update.score_id);
        
      if (error) {
        console.error('[processTiebreakerResults] Update failed:', error);
        throw error;
      }
    }
    
    console.log('✅ Tiebreaker resolved successfully');
    
  } catch (error) {
    console.error('[processTiebreakerResults] Processing failed:', error);
    throw error;
  }
}