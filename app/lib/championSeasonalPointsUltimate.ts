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
  console.log('[ChampionSeasonalPointsUltimate] Starting query for champion:', championId);
  
  try {
    // First, let's check what tournament_competitors exist for this champion
    const { data: tcData, error: tcError } = await supabase
      .from('tournament_competitors')
      .select('id, source_id, source_type')
      .eq('source_id', championId)
      .eq('source_type', 'champion');
    
    console.log('[ChampionSeasonalPointsUltimate] Tournament competitors found:', tcData?.length || 0);
    
    if (tcError || !tcData || tcData.length === 0) {
      console.log('[ChampionSeasonalPointsUltimate] No tournament competitors found for champion');
      return [];
    }
    
    // Get the tournament_competitor IDs
    const tcIds = tcData.map(tc => tc.id);
    console.log('[ChampionSeasonalPointsUltimate] Tournament competitor IDs:', tcIds);
    
    // Now query event_scores using these tournament_competitor_ids
    const { data: eventScores, error: scoresError } = await supabase
      .from('event_scores')
      .select(`
        id,
        event_id,
        final_rank,
        total_score,
        judge_a_score,
        judge_b_score,
        judge_c_score,
        tournament_competitor_id,
        events!inner (
          id,
          name,
          event_type,
          tournament_id,
          tournaments!inner (
            id,
            name,
            class,
            date
          )
        )
      `)
      .in('tournament_competitor_id', tcIds)
      .not('final_rank', 'is', null);

    console.log(`[ChampionSeasonalPointsUltimate] Raw event scores found: ${eventScores?.length || 0}`);
    
    if (scoresError) {
      console.error('[ChampionSeasonalPointsUltimate] Event scores error:', scoresError);
      return [];
    }

    if (!eventScores || eventScores.length === 0) {
      console.log('[ChampionSeasonalPointsUltimate] No event scores found');
      return [];
    }

    // Process each score
    const processedScores = [];
    let eventsProcessed = 0;
    
    for (const score of eventScores) {
      const event = score.events;
      const tournament = event?.tournaments;
      
      if (!event || !tournament) {
        console.log('Skipping score - missing event or tournament data:', score.id);
        continue;
      }
      
      eventsProcessed++;
      
      const finalRank = score.final_rank;
      const tournamentClass = tournament.class;
      const eventType = event.event_type || 'traditional_forms';
      
      // Skip invalid or non-placing results
      if (!finalRank || finalRank > 3) {
        continue;
      }

      if (!tournamentClass) {
        continue;
      }

      // Get total competitors for this event
      const competitorCount = await getCompetitorCountForEvent(event.id);
      
      // Calculate points
      const calculatedPoints = calculatePoints(tournamentClass, finalRank, competitorCount);
      
      console.log(`[ChampionSeasonalPointsUltimate] Event: ${event.name}, Rank: ${finalRank}, Class: ${tournamentClass}, Points: ${calculatedPoints}`);
      
      // Skip 0-point results
      if (calculatedPoints === 0) {
        continue;
      }
      
      const judgeAScore = score.judge_a_score || 0;
      const judgeBScore = score.judge_b_score || 0;
      const judgeCScore = score.judge_c_score || 0;
      const scoreTotal = score.total_score || (judgeAScore + judgeBScore + judgeCScore);
      
      const processed = {
        id: score.id,
        event_id: event.id,
        event_type: eventType,
        event_name: event.name || 'Unknown Event',
        final_rank: finalRank,
        score_total: scoreTotal,
        judge_a_score: judgeAScore,
        judge_b_score: judgeBScore,
        judge_c_score: judgeCScore,
        points_earned: calculatedPoints,
        tournament_name: tournament.name || 'Unknown Tournament',
        tournament_class: tournamentClass,
        tournament_date: tournament.date,
        points: calculatedPoints,
        total_competitors: competitorCount
      };

      processedScores.push(processed);
    }

    // Sort by tournament date (descending)
    processedScores.sort((a, b) => {
      const dateA = new Date(a.tournament_date || 0);
      const dateB = new Date(b.tournament_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ [ChampionSeasonalPointsUltimate] eventsProcessed: ${eventsProcessed}, Total results: ${processedScores.length}`);
    return processedScores;
    
  } catch (error) {
    console.error('[ChampionSeasonalPointsUltimate] Unexpected error:', error);
    return [];
  }
}