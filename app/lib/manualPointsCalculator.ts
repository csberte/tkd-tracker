export function manuallyCalculatePoints(final_rank: number, tournament_class: string, total_competitors: number): number {
  if (!final_rank || !tournament_class || total_competitors === undefined) return 0;

  const classPoints: Record<string, number[]> = {
    "AAA": [20, 15, 10],
    "AA": [15, 10, 8],
    "A": [8, 5, 2],
    "B": [5, 3, 1],
    "C": total_competitors >= 4
      ? [2, 1, 0]
      : total_competitors === 3
        ? [1, 0, 0]
        : [0, 0, 0],
  };

  const pointsByClass = classPoints[tournament_class] || [0, 0, 0];
  return pointsByClass[final_rank - 1] || 0;
}