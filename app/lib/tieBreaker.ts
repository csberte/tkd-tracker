export const unstable_settings = { ignore: true };

import { calculateTournamentPoints } from './tournamentPoints';

export interface TieGroup {
  rank: number;
  competitors: string[];
  tieBreakOrder: string[];
  isTop2?: boolean;
  resolvedWinners?: string[];
}

export interface TieBreakerState {
  [scoreId: string]: {
    label: string;
    order: number;
  };
}

export interface CompetitorWithScore {
  id: string;
  competitor_id?: string;
  name: string;
  avatar?: string;
  source_type?: string;
  totalScore: number;
  rank: number;
  finalRank?: number;
  placement?: string;
  isTied?: boolean;
  tie_breaker_status?: string;
  medal?: string;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
  has_video?: boolean;
  video_url?: string;
  tieBreakerLabel?: string;
  tieGroup?: number;
  final_rank?: number;
  points?: number;
  tieBreakerInfo?: {
    status: string;
  };
}

/**
 * CRASH FIX: Calculate rankings for competitors
 */
export function calculateRankings(competitors: CompetitorWithScore[]): CompetitorWithScore[] {
  console.log('[calculateRankings] Processing competitors:', competitors?.length || 0);
  
  // CRITICAL BUG #3 FIX: Ensure competitors is a proper array
  if (!Array.isArray(competitors)) {
    console.error('[TieBreaker] Expected competitors to be an array, received:', competitors);
    return [];
  }
  
  if (competitors.length === 0) {
    return [];
  }
  
  // Sort by totalScore descending
  const sorted = [...competitors].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  
  // Assign ranks
  let currentRank = 1;
  const scoreGroups: { [score: number]: CompetitorWithScore[] } = {};
  
  // Group by score first
  sorted.forEach(competitor => {
    const score = competitor.totalScore || 0;
    if (!scoreGroups[score]) {
      scoreGroups[score] = [];
    }
    scoreGroups[score].push(competitor);
  });
  
  const result: CompetitorWithScore[] = [];
  const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
  
  sortedScores.forEach(score => {
    const group = scoreGroups[score];
    
    // All competitors in same score group get same rank
    group.forEach(competitor => {
      result.push({
        ...competitor,
        rank: currentRank
      });
    });
    
    // Next rank skips by group size
    currentRank += group.length;
  });
  
  console.log('[calculateRankings] Calculated rankings for', result.length, 'competitors');
  return result;
}

export function getTieGroups(competitors: CompetitorWithScore[]): TieGroup[] {
  console.log('[getTieGroups] Processing competitors:', competitors?.length || 0);
  
  // CRITICAL BUG #3 FIX: Ensure competitors is a proper array
  if (!Array.isArray(competitors)) {
    console.error('[TieBreaker] Expected competitors to be an array, received:', competitors);
    return [];
  }
  
  if (competitors.length === 0) {
    console.log('[getTieGroups] No competitors provided, returning empty array');
    return [];
  }
  
  const scoreGroups: { [score: number]: CompetitorWithScore[] } = {};
  
  competitors.forEach(competitor => {
    const score = competitor.totalScore || 0;
    if (!scoreGroups[score]) {
      scoreGroups[score] = [];
    }
    scoreGroups[score].push(competitor);
  });
  
  const tieGroups: TieGroup[] = [];
  let currentRank = 1;
  
  // Sort scores in descending order
  const sortedScores = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
  
  sortedScores.forEach(score => {
    const group = scoreGroups[score];
    if (group.length >= 2) { // Only include actual ties (2+ competitors)
      tieGroups.push({
        rank: currentRank,
        competitors: group.map(c => c.id),
        tieBreakOrder: [],
        isTop2: currentRank <= 2
      });
    }
    currentRank += group.length;
  });
  
  console.log('[getTieGroups] Found tie groups:', tieGroups.length);
  return tieGroups;
}

export function hasTieInTop3(tieGroups: TieGroup[]): boolean {
  console.log('[hasTieInTop3] Checking tie groups:', tieGroups?.length || 0);
  
  if (!Array.isArray(tieGroups)) {
    console.log('[hasTieInTop3] tieGroups is not an array, returning false');
    return false;
  }
  
  const hasTop3Tie = tieGroups.some(group => group.rank <= 3);
  console.log('[hasTieInTop3] Result:', hasTop3Tie);
  return hasTop3Tie;
}

export function hasUnresolvedTieInTop3(competitors: CompetitorWithScore[]): boolean {
  console.log('[hasUnresolvedTieInTop3] Checking competitors:', competitors?.length || 0);
  
  // CRITICAL BUG #3 FIX: Ensure competitors is a proper array
  if (!Array.isArray(competitors)) {
    console.error('[TieBreaker] Expected competitors to be an array, received:', competitors);
    return false;
  }
  
  if (competitors.length < 2) {
    console.log('[hasUnresolvedTieInTop3] Not enough competitors for ties');
    return false;
  }
  
  // Get top 3 competitors by totalScore
  const sortedByScore = [...competitors].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const top3Scores = sortedByScore.slice(0, 3).map(c => c.totalScore || 0);
  
  console.log('[hasUnresolvedTieInTop3] Top 3 scores:', top3Scores);
  
  // Group all competitors by totalScore
  const scoreGroups: { [score: number]: CompetitorWithScore[] } = {};
  competitors.forEach(competitor => {
    const score = competitor.totalScore || 0;
    if (!scoreGroups[score]) {
      scoreGroups[score] = [];
    }
    scoreGroups[score].push(competitor);
  });
  
  // Check each score that appears in top 3
  for (const score of top3Scores) {
    const group = scoreGroups[score];
    if (group && group.length >= 2) { // 2 or more competitors with same score = tie
      console.log(`[hasUnresolvedTieInTop3] Found tie group with score ${score}:`, {
        competitors: group.map(c => ({
          name: c.name,
          totalScore: c.totalScore,
          finalRank: c.finalRank || c.final_rank || c.rank,
          tieBreakerStatus: c.tieBreakerInfo?.status || c.tie_breaker_status || 'unselected'
        }))
      });
      
      // Check if at least one competitor has unselected status
      const hasUnselected = group.some(c => {
        const status = c.tieBreakerInfo?.status || c.tie_breaker_status || 'unselected';
        return status === 'unselected' || !status.startsWith('selected_');
      });
      
      if (hasUnselected) {
        console.log('[hasUnresolvedTieInTop3] Found unresolved tie in top 3 - returning true');
        return true;
      }
    }
  }
  
  console.log('[hasUnresolvedTieInTop3] No unresolved ties in top 3 - returning false');
  return false;
}

export function hasResolvedTiesInTop3(competitors: CompetitorWithScore[]): boolean {
  console.log('[hasResolvedTiesInTop3] Checking competitors:', competitors?.length || 0);
  
  // CRITICAL BUG #3 FIX: Ensure competitors is a proper array
  if (!Array.isArray(competitors)) {
    console.error('[TieBreaker] Expected competitors to be an array, received:', competitors);
    return false;
  }
  
  if (competitors.length === 0) {
    return false;
  }
  
  const top3 = competitors.filter(c => {
    const effectiveRank = c.finalRank || c.final_rank || c.rank;
    return effectiveRank && effectiveRank <= 3;
  });
  
  const hasResolved = top3.some(c => {
    const status = c.tieBreakerInfo?.status || c.tie_breaker_status;
    return status && status.startsWith('selected_');
  });
  
  console.log('[hasResolvedTiesInTop3] Result:', hasResolved);
  return hasResolved;
}