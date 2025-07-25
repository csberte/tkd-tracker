import { supabase } from './supabase';
import { calculateTournamentPoints } from './tournamentPoints';
import { normalizeRank } from './rankUtils';
import { persistTiebreakerRanks } from './persistTiebreakerRanksFixed';

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

export async function processTiebreakerResultsEnhanced(
  eventId: string,
  tiedGroup: CompetitorWithScore[],
  selectedWinners: any[],
  tournamentClass: string = 'A'
): Promise<void> {
  if (!Array.isArray(tiedGroup) || tiedGroup.length === 0) {
    console.warn('[processTiebreakerResultsEnhanced] No tied group provided');
    return;
  }
  
  if (!Array.isArray(selectedWinners) || selectedWinners.length === 0) {
    console.warn('[processTiebreakerResultsEnhanced] No winners selected');
    return;
  }
  
  console.log('[processTiebreakerResultsEnhanced] Processing tiebreaker for event:', eventId);
  console.log('[processTiebreakerResultsEnhanced] Tied group:', tiedGroup.map(c => ({ id: c.id, name: c.name })));
  console.log('[processTiebreakerResultsEnhanced] Selected winners:', selectedWinners);
  
  const selectedIds = selectedWinners.map(w => {
    if (typeof w === 'string') return w;
    if (w?.id) return w.id;
    if (w?.tournament_competitor_id) return w.tournament_competitor_id;
    return null;
  }).filter(id => id !== null);
  
  if (selectedIds.length === 0) {
    console.error('[processTiebreakerResultsEnhanced] No valid IDs extracted');
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
    const updatedCompetitors = [];
    
    console.log('[processTiebreakerResultsEnhanced] Base rank:', baseRank);
    console.log('[processTiebreakerResultsEnhanced] Total competitors in event:', totalCompetitors);
    
    // Process selected winners
    for (let i = 0; i < selectedIds.length; i++) {
      const winnerId = selectedIds[i];
      const winner = tiedGroup.find(c => 
        c.id === winnerId || c.tournament_competitor_id === winnerId
      );
      
      if (!winner?.id) {
        console.error('[processTiebreakerResultsEnhanced] Winner not found:', winnerId);
        continue;
      }
      
      const newRank = normalizeRank(baseRank + i);
      let medal = null;
      if (newRank === 1) medal = '🥇';
      else if (newRank === 2) medal = '🥈';
      else if (newRank === 3) medal = '🥉';
      
      const points = calculateTournamentPoints(newRank, tournamentClass, totalCompetitors);
      
      console.log(`[processTiebreakerResultsEnhanced] Winner ${i + 1}:`, {
        id: winner.id,
        name: winner.name,
        newRank,
        medal,
        points
      });
      
      updatedCompetitors.push({
        ...winner,
        final_rank: newRank,
        rank: newRank,
        medal,
        points,
        tie_breaker_status: `selected_${i + 1}`
      });
    }
    
    // Process unselected competitors
    const unselectedCompetitors = tiedGroup.filter(c => 
      c?.id && !selectedIds.includes(c.id) && !selectedIds.includes(c.tournament_competitor_id || '')
    );
    
    console.log('[processTiebreakerResultsEnhanced] Unselected competitors:', unselectedCompetitors.length);
    
    for (let i = 0; i < unselectedCompetitors.length; i++) {
      const competitor = unselectedCompetitors[i];
      if (!competitor?.id) continue;
      
      const newRank = normalizeRank(baseRank + selectedIds.length + i);
      let medal = null;
      if (newRank === 1) medal = '🥇';
      else if (newRank === 2) medal = '🥈';
      else if (newRank === 3) medal = '🥉';
      
      const points = calculateTournamentPoints(newRank, tournamentClass, totalCompetitors);
      
      console.log(`[processTiebreakerResultsEnhanced] Unselected ${i + 1}:`, {
        id: competitor.id,
        name: competitor.name,
        newRank,
        medal,
        points
      });
      
      updatedCompetitors.push({
        ...competitor,
        final_rank: newRank,
        rank: newRank,
        medal,
        points,
        tie_breaker_status: 'unselected'
      });
    }
    
    console.log('[processTiebreakerResultsEnhanced] Final updated competitors:', updatedCompetitors.length);
    
    // Persist the tiebreaker results to database
    const success = await persistTiebreakerRanks(eventId, updatedCompetitors);
    
    if (success) {
      console.log('[processTiebreakerResultsEnhanced] Tiebreaker results processed and persisted successfully');
    } else {
      console.error('[processTiebreakerResultsEnhanced] Failed to persist tiebreaker results');
      throw new Error('Failed to persist tiebreaker results');
    }
    
  } catch (error) {
    console.error('[processTiebreakerResultsEnhanced] Processing failed:', error);
    throw error;
  }
}