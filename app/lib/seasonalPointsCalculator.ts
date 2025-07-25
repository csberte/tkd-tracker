export function calculateSeasonalPoints(
  rank: number,
  tournamentClass: string,
  totalCompetitors: number
): number {
  // No points for 4th place or higher
  if (!rank || rank > 3) return 0;

  // Standard point matrix for most classes
  const pointsMatrix = {
    AAA: [20, 15, 10],
    AA: [15, 10, 8],
    A: [8, 5, 2],
    B: [5, 3, 1]
  };

  // Handle C-class special rules
  if (tournamentClass === 'C') {
    if (totalCompetitors <= 2) {
      return 0; // Everyone gets 0 points
    } else if (totalCompetitors === 3) {
      return rank === 1 ? 1 : 0; // Only 1st gets 1 point
    } else {
      // 4+ competitors: 1st=2, 2nd=1, 3rd=0
      const cPoints = [2, 1, 0];
      return cPoints[rank - 1] || 0;
    }
  }

  // Use standard matrix for other classes
  const values = pointsMatrix[tournamentClass] || [0, 0, 0];
  return values[rank - 1] || 0;
}