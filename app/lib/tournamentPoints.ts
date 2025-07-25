export function calculateTournamentPoints(tournamentClass: string, finalRank: number, numCompetitors?: number): number {
  switch (tournamentClass) {
    case "AAA - Worlds":
      if (finalRank === 1) return 20;
      if (finalRank === 2) return 15;
      if (finalRank === 3) return 10;
      return 0;

    case "AA - Nationals":
      if (finalRank === 1) return 15;
      if (finalRank === 2) return 10;
      if (finalRank === 3) return 8;
      return 0;

    case "A - Regional":
      if (finalRank === 1) return 8;
      if (finalRank === 2) return 5;
      if (finalRank === 3) return 2;
      return 0;

    case "B - Regional":
      if (finalRank === 1) return 5;
      if (finalRank === 2) return 3;
      if (finalRank === 3) return 1;
      return 0;

    case "C":
      if (!numCompetitors || numCompetitors < 1) return 0;
      if (numCompetitors >= 4) {
        if (finalRank === 1) return 2;
        if (finalRank === 2) return 1;
        return 0;
      } else if (numCompetitors === 3) {
        return finalRank === 1 ? 1 : 0;
      } else {
        return 0;
      }

    default:
      return 0;
  }
}