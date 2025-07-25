export function normalizeTournamentClass(classString: string): string {
  console.log('[DEBUG] normalizeTournamentClass received:', classString);
  const match = classString.match(/^(AAA|AA|A|B|C)(?:\s*[-–]|\s|$)/);
  console.log('[DEBUG] normalized class:', match?.[1] ?? 'NO MATCH');
  return match ? match[1] : 'A';
}

export function calculateSeasonalPoints(rank: number, tournamentClass: string, totalCompetitors: number): number {
  console.log('[DEBUG] calculateSeasonalPoints input:', tournamentClass);
  
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
    console.log('[DEBUG] calculateSeasonalPoints output:', points);
    return points;
  }
  
  const classPoints = pointsMatrix[normalizedClass];
  if (!classPoints) {
    throw new Error(`Unknown tournament class: ${normalizedClass}`);
  }
  
  const points = classPoints[rank] || 0;
  console.log('[DEBUG] calculateSeasonalPoints output:', points);
  return points;
}

function calculateCClassPoints(rank: number, totalCompetitors: number): number {
  if (totalCompetitors >= 5) {
    return { 1: 3, 2: 2, 3: 1 }[rank] || 0;
  } else if (totalCompetitors === 4) {
    return { 1: 2, 2: 1, 3: 0 }[rank] || 0;
  } else if (totalCompetitors === 3) {
    return { 1: 1, 2: 0, 3: 0 }[rank] || 0;
  } else {
    return 0;
  }
}