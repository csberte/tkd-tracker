import { calculateSeasonalPoints } from './pointsCalculator';
import { normalizeRank } from './rankUtils';

export interface ScoreType {
  id: string;
  tournament_competitor_id: string;
  total_score: number;
  final_rank?: number;
  points_earned?: number;
  tie_breaker_status?: string;
}

export interface RankedScore extends ScoreType {
  final_rank: number;
  points_earned: number;
}

/**
 * Calculate rankings with ties for event scores
 * Returns scores with final_rank and points_earned calculated
 */
export function calculateRankingsWithTies(scores: ScoreType[]): RankedScore[] {
  console.log('[calculateRankingsWithTies] Processing scores:', scores?.length || 0);
  
  if (!Array.isArray(scores) || scores.length === 0) {
    console.log('[calculateRankingsWithTies] No valid scores provided');
    return [];
  }

  // Sort by total_score descending
  const sortedScores = [...scores].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  
  // Group by score to handle ties
  const scoreGroups: { [score: number]: ScoreType[] } = {};
  sortedScores.forEach(score => {
    const totalScore = score.total_score || 0;
    if (!scoreGroups[totalScore]) {
      scoreGroups[totalScore] = [];
    }
    scoreGroups[totalScore].push(score);
  });

  const result: RankedScore[] = [];
  let currentRank = 1;
  const totalCompetitors = scores.length;
  
  // Process each score group
  const sortedScoreValues = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
  
  sortedScoreValues.forEach(scoreValue => {
    const group = scoreGroups[scoreValue];
    
    // All competitors in the same score group get the same rank
    group.forEach(score => {
      const points = calculateSeasonalPoints(currentRank, 'A', totalCompetitors); // Default to A class
      
      result.push({
        ...score,
        final_rank: currentRank,
        points_earned: points
      });
    });
    
    // Next rank increments by group size
    currentRank += group.length;
  });

  console.log('[calculateRankingsWithTies] Calculated rankings:', result.map(r => ({
    id: r.id,
    total_score: r.total_score,
    final_rank: r.final_rank,
    points_earned: r.points_earned
  })));
  
  return result;
}
