import { supabase } from './supabase';

// Calculate seasonal points based on tournament class, rank, and competitor count
const calculatePoints = (tournamentClass: string, finalRank: number, competitorCount: number): number => {
  const pointsTable = {
    AAA: { 1: 20, 2: 15, 3: 10 },
    AA:  { 1: 15, 2: 10, 3: 8 },
    A:   { 1: 8,  2: 5,  3: 2 },
    B:   { 1: 5,  2: 3,  3: 1 },
    C:   competitorCount >= 4 ? { 1: 2, 2: 1, 3: 0 } :
         competitorCount === 3 ? { 1: 1, 2: 0, 3: 0 } :
                                  { 1: 0, 2: 0, 3: 0 },
  };
  return pointsTable[tournamentClass]?.[finalRank] ?? 0;
};

// Get competitor count for a specific event
async function getCompetitorCountForEvent(eventId: string): Promise<number> {
  const { data, error } = await supabase
    .from('event_scores')
    .select('id')
    .eq('event_id', eventId);
  
  if (error) {
    console.error('Error getting competitor count:', error);
    return 1;
  }
  
  return data?.length || 1;
}

export async function getChampionSeasonalPoints(championId: string) {
  console.log('[ChampionSeasonalPointsFallback] Starting query for champion:', championId);
  
  try {
    // Primary query using correct join structure with champion_id
    const { data, error } = await supabase
      .from('event_scores')
      .select(`
        id,
        event_id,
        final_rank,
        total_score,
        tournament_competitor_id,
        tournaments ( id, name, class, start_date ),
        events ( id, name, event_type ),
        tournament_competitors (
          id,
          champion_id
        )
      `)
      .eq('tournament_competitors.champion_id', championId);

    console.log('[ChampionSeasonalPointsFallback] Query result:', { 
      championId, 
      scoresFound: data?.length || 0,
      error 
    });

    if (error) {
      console.error('[ChampionSeasonalPointsFallback] Query error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[ChampionSeasonalPointsFallback] No scores found');
      return [];
    }

    return await processScoresFromCorrectQuery(data);
    
  } catch (error) {
    console.error('[ChampionSeasonalPointsFallback] Unexpected error:', error);
    return [];
  }
}

// Process scores from the correct tournament_competitors query
async function processScoresFromCorrectQuery(eventScores: any[]) {
  console.log(`[ChampionSeasonalPointsFallback] Processing ${eventScores.length} scores`);
  
  const processedScores = [];
  
  for (const score of eventScores) {
    const event = score.events;
    const tournament = score.tournaments;
    
    if (!event || !tournament) {
      continue;
    }
    
    const finalRank = score.final_rank;
    const tournamentClass = tournament.class;
    
    if (!finalRank || finalRank > 3 || !tournamentClass) {
      continue;
    }

    const competitorCount = await getCompetitorCountForEvent(score.event_id);
    const calculatedPoints = calculatePoints(tournamentClass, finalRank, competitorCount);
    
    if (calculatedPoints === 0) {
      continue;
    }
    
    const processed = {
      id: score.id,
      event_id: score.event_id,
      event_type: event.event_type || 'traditional_forms',
      event_name: event.name || 'Unknown Event',
      final_rank: finalRank,
      score_total: score.total_score || 0,
      points_earned: calculatedPoints,
      tournament_name: tournament.name || 'Unknown Tournament',
      tournament_class: tournamentClass,
      tournament_date: tournament.start_date,
      points: calculatedPoints,
      total_competitors: competitorCount
    };

    processedScores.push(processed);
  }

  processedScores.sort((a, b) => {
    const dateA = new Date(a.tournament_date || 0);
    const dateB = new Date(b.tournament_date || 0);
    return dateB.getTime() - dateA.getTime();
  });

  console.log(`✅ [ChampionSeasonalPointsFallback] Processed: ${processedScores.length} events`);
  return processedScores;
}