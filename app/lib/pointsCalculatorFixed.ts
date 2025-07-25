// Fixed points calculation based on tournament class and rank
export function calculateTournamentPoints(
  rank: number,
  tournamentClass: string,
  totalCompetitors: number
): number {
  console.log('[Points] Calculating points for rank:', rank, 'class:', tournamentClass, 'total:', totalCompetitors);
  
  // Handle invalid inputs
  if (rank <= 0 || totalCompetitors <= 0) return 0;
  
  const normalizedClass = normalizeTournamentClass(tournamentClass);
  
  // Points matrix based on tournament class
  const pointsMatrix = {
    'AAA': { 1: 20, 2: 15, 3: 10 },
    'AA': { 1: 15, 2: 10, 3: 8 },
    'A': { 1: 8, 2: 5, 3: 2 },
    'B': { 1: 5, 2: 3, 3: 1 }
  };
  
  if (normalizedClass === 'C') {
    const points = calculateCClassPoints(rank, totalCompetitors);
    console.log('[Points] C class points:', points);
    return points;
  }
  
  const classPoints = pointsMatrix[normalizedClass];
  if (!classPoints) {
    console.warn('[Points] Unknown tournament class:', normalizedClass);
    return 0;
  }
  
  const points = classPoints[rank] || 0;
  console.log('[Points] Final points:', points);
  return points;
}

function calculateCClassPoints(rank: number, totalCompetitors: number): number {
  if (totalCompetitors >= 4) {
    return { 1: 2, 2: 1, 3: 0 }[rank] || 0;
  } else if (totalCompetitors === 3) {
    return { 1: 1, 2: 0, 3: 0 }[rank] || 0;
  } else {
    return 0; // 2 or fewer entries = 0 points
  }
}

export function normalizeTournamentClass(classString: string): string {
  if (!classString) return 'A';
  const match = classString.match(/^(AAA|AA|A|B|C)(?:\s*[-–]|\s|$)/);
  return match ? match[1] : 'A';
}

// Legacy export for compatibility
export { calculateTournamentPoints as calculateSeasonalPoints };