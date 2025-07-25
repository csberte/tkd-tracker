// Tournament sorting utility
// Sorts tournaments by class (AAA->AA->A->B->C) then by date (newest first)

export interface TournamentWithClass {
  tournament_class?: string;
  class?: string;
  tournament_date?: string;
  date?: string;
  created_at?: string;
}

// Extract tournament class from various formats
function extractTournamentClass(tournament: TournamentWithClass): string {
  const classValue = tournament.tournament_class || tournament.class || '';
  
  // Handle formats like "AA - Nationals" or "AAA"
  if (classValue.includes(' - ')) {
    return classValue.split(' - ')[0].trim();
  }
  
  return classValue;
}

// Get date for sorting
function getTournamentDate(tournament: TournamentWithClass): Date {
  const dateValue = tournament.tournament_date || tournament.date || tournament.created_at || '';
  return new Date(dateValue);
}

// Sort tournaments by class then date
export function sortTournaments<T extends TournamentWithClass>(tournaments: T[]): T[] {
  const classOrder: Record<string, number> = {
    'AAA': 0,
    'AA': 1, 
    'A': 2,
    'B': 3,
    'C': 4
  };
  
  return [...tournaments].sort((a, b) => {
    // First sort by tournament class
    const aClass = extractTournamentClass(a);
    const bClass = extractTournamentClass(b);
    
    const aClassOrder = classOrder[aClass] ?? 999;
    const bClassOrder = classOrder[bClass] ?? 999;
    
    if (aClassOrder !== bClassOrder) {
      return aClassOrder - bClassOrder;
    }
    
    // Then sort by date (newest first)
    const aDate = getTournamentDate(a);
    const bDate = getTournamentDate(b);
    
    return bDate.getTime() - aDate.getTime();
  });
}