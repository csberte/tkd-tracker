/**
 * Utility to sanitize rank values before database operations
 * Converts ordinal strings like "1st", "2nd" to integers 1, 2
 */

export function sanitizeRank(rank: any): number | null {
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

export function sanitizeFinalRank(finalRank: any): number | null {
  return sanitizeRank(finalRank);
}