/**
 * Core rank sanitization utilities to prevent '1st', '2nd' database errors
 * Ensures all rank values are stored as integers (1, 2, 3) not strings
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

export function sanitizeAllRankFields(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Sanitize common rank fields
  if ('rank' in sanitized) {
    sanitized.rank = sanitizeRank(sanitized.rank);
  }
  
  if ('final_rank' in sanitized) {
    sanitized.final_rank = sanitizeFinalRank(sanitized.final_rank);
  }
  
  if ('placement' in sanitized) {
    sanitized.placement = sanitizeRank(sanitized.placement);
  }
  
  return sanitized;
}

/**
 * Sanitize rank data before any database operation
 */
export function sanitizeForDatabase(payload: any): any {
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizeAllRankFields(item));
  }
  
  return sanitizeAllRankFields(payload);
}