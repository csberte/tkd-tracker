/**
 * Utility functions for handling rank values consistently
 * Ensures ranks are always stored and processed as integers
 */

/**
 * Convert any rank value to integer
 * Handles "1st", "2nd", "3rd" -> 1, 2, 3
 */
export function normalizeRank(rank: any): number | null {
  if (rank === null || rank === undefined) {
    return null;
  }
  
  // If already a number, return it
  if (typeof rank === 'number') {
    return Math.floor(rank) || null;
  }
  
  // Clean string rank - remove ALL non-digits and convert to integer
  const cleanedRank = parseInt(String(rank).replace(/\D/g, ''), 10);
  
  // Return null if invalid, otherwise return the integer
  return isNaN(cleanedRank) ? null : cleanedRank;
}

/**
 * Get medal emoji for numeric rank
 */
export function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
}

/**
 * Format rank for display (1st, 2nd, 3rd)
 */
export function formatRankDisplay(rank: number): string {
  if (!rank || rank < 1) return '';
  
  const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
  return `${rank}${suffix}`;
}

/**
 * Get rank color for display
 */
export function getRankColor(rank: number): string {
  switch (rank) {
    case 1: return '#FFD700'; // Gold
    case 2: return '#007AFF'; // Blue
    case 3: return '#007AFF'; // Blue
    default: return '#666666'; // Gray
  }
}

/**
 * Get placement text for clipboard sharing
 */
export function getPlacementText(rank: number): string {
  switch (rank) {
    case 1: return '🥇 First Place';
    case 2: return '🥈 Second Place';
    case 3: return '🥉 Third Place';
    default: return '';
  }
}