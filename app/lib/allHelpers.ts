export function calculateTournamentPoints({
  tournamentClass,
  finalRank,
  totalCompetitors,
}: {
  tournamentClass: string;
  finalRank: number;
  totalCompetitors: number;
}): number {
  if (!finalRank || !tournamentClass || totalCompetitors === undefined) return 0;

  const classPoints: Record<string, number[]> = {
    "AAA": [20, 15, 10],
    "AA": [15, 10, 8],
    "A": [8, 5, 2],
    "B": [5, 3, 1],
    "C": totalCompetitors >= 4
      ? [2, 1, 0]
      : totalCompetitors === 3
        ? [1, 0, 0]
        : [0, 0, 0],
  };

  const pointsByClass = classPoints[tournamentClass] || [0, 0, 0];
  return pointsByClass[finalRank - 1] || 0;
}

// Export the calculateRankingsWithTies function
export { calculateRankingsWithTies } from './calculateRankingsWithTies';
