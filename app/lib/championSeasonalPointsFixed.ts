import { supabase } from './supabase';

// Helper function to parse tournament class from formatted strings
const parseClassFromString = (classString: string): string => {
  if (!classString) return '';
  
  // Extract the first word (class prefix) from strings like 'AA - Nationals' or 'C - Regionals'
  const parsed = classString.trim().split(' ')[0].toUpperCase();
  console.log(`[parseClassFromString] Input: '${classString}' → Parsed: '${parsed}'`);
  return parsed;
};

// Calculate seasonal points based on tournament class, rank, and competitor count
const calculatePoints = (tournamentClass: string, finalRank: number, competitorCount: number): number => {
  // Parse the class string to extract just the classification (AA, A, B, C, AAA)
  const normalizedClass = parseClassFromString(tournamentClass);
  
  console.log(`[calculatePoints] Original: '${tournamentClass}' → Parsed: '${normalizedClass}', Rank: ${finalRank}, Competitors: ${competitorCount}`);
  
  // Handle Class C special rules FIRST (only class that uses competitor count)
  if (normalizedClass === 'C') {
    console.log(`[calculatePoints] Processing Class C with ${competitorCount} competitors`);
    if (competitorCount >= 4) {
      // 4+ competitors: 1st = 2, 2nd = 1, 3rd = 0
      const classCPoints = { 1: 2, 2: 1, 3: 0 };
      const points = classCPoints[finalRank] || 0;
      console.log(`[calculatePoints] Class C (4+ competitors): Rank ${finalRank} = ${points} points`);
      return points;
    } else if (competitorCount === 3) {
      // 3 competitors: 1st = 1, 2nd = 0, 3rd = 0
      const points = finalRank === 1 ? 1 : 0;
      console.log(`[calculatePoints] Class C (3 competitors): Rank ${finalRank} = ${points} points`);
      return points;
    } else {
      // 2 or fewer competitors: All = 0 pts
      console.log(`[calculatePoints] Class C (≤2 competitors): Rank ${finalRank} = 0 points`);
      return 0;
    }
  }
  
  // Standard points table for AAA, AA, A, B classes (IGNORE competitor count)
  const standardPointsTable = {
    AAA: { 1: 20, 2: 15, 3: 10 },
    AA:  { 1: 15, 2: 10, 3: 8 },
    A:   { 1: 8,  2: 5,  3: 2 },
    B:   { 1: 5,  2: 3,  3: 1 }
  };
  
  // Handle standard classes (AAA, AA, A, B) - fixed points regardless of competitor count
  if (standardPointsTable[normalizedClass]) {
    const points = standardPointsTable[normalizedClass][finalRank] || 0;
    console.log(`[calculatePoints] Class ${normalizedClass}: Rank ${finalRank} = ${points} points (fixed, ignoring competitor count)`);
    return points;
  }
  
  // Unknown class - return 0 points
  console.warn(`[calculatePoints] Unknown tournament class: ${tournamentClass} (parsed: ${normalizedClass})`);
  return 0;
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
  console.log('[ChampionSeasonalPointsFixed] Starting query for champion:', championId);
  
  try {
    // Get tournament competitors using champion_id instead of polymorphic fields
    const { data: tcData, error: tcError } = await supabase
      .from('tournament_competitors')
      .select('id')
      .eq('champion_id', championId);
    
    console.log('[ChampionSeasonalPointsFixed] Tournament competitors found:', tcData?.length || 0);
    
    if (tcError || !tcData || tcData.length === 0) {
      console.log('[ChampionSeasonalPointsFixed] No tournament competitors found for champion');
      return [];
    }
    
    // Get the tournament_competitor IDs
    const tcIds = tcData.map(tc => tc.id);
    console.log('[ChampionSeasonalPointsFixed] Tournament competitor IDs:', tcIds);
    
    // Query event_scores using these tournament_competitor_ids
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

    console.log(`[ChampionSeasonalPointsFixed] Raw event scores found: ${eventScores?.length || 0}`);
    
    if (scoresError) {
      console.error('[ChampionSeasonalPointsFixed] Event scores error:', scoresError);
      return [];
    }

    if (!eventScores || eventScores.length === 0) {
      console.log('[ChampionSeasonalPointsFixed] No event scores found');
      return [];
    }

    // Process each score - include ALL events regardless of points
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
      
      console.log(`[ChampionSeasonalPointsFixed] Processing event: ${event.name}, Rank: ${finalRank}, Class: ${tournamentClass}`);
      
      // Skip invalid results but allow all ranks
      if (!finalRank || finalRank < 1) {
        console.log(`Skipping invalid rank for event ${event.name}: ${finalRank}`);
        continue;
      }

      if (!tournamentClass) {
        console.log(`Skipping event ${event.name} - missing tournament class`);
        continue;
      }

      // Get total competitors for this event (only needed for Class C)
      const competitorCount = await getCompetitorCountForEvent(event.id);
      
      // Calculate points using the manual calculation function with parsed class
      const calculatedPoints = calculatePoints(tournamentClass, finalRank, competitorCount);
      
      console.log(`✅ [ChampionSeasonalPointsFixed] FINAL: Event: ${event.name}, Rank: ${finalRank}, Class: ${tournamentClass}, Competitors: ${competitorCount}, Points: ${calculatedPoints}`);
      
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

    const totalPoints = processedScores.reduce((sum, item) => sum + item.points, 0);
    console.log(`✅ [ChampionSeasonalPointsFixed] eventsProcessed: ${eventsProcessed}, Total results: ${processedScores.length}, Total Points: ${totalPoints}`);
    return processedScores;
    
  } catch (error) {
    console.error('[ChampionSeasonalPointsFixed] Unexpected error:', error);
    return [];
  }
}