import { supabase } from './supabase';
import { calculateTournamentPoints } from './tournamentPoints';

export async function getChampionSeasonalPoints(championId: string) {
  console.log('[ChampionPointsCalc] Starting query for champion:', championId);
  
  try {
    // Step 1: Fetch all tournament competitor IDs for this champion
    const { data: competitorIds, error: compIdError } = await supabase
      .from('tournament_competitors')
      .select('id')
      .eq('champion_id', championId);

    if (compIdError) {
      console.error('[ChampionPointsCalc] Error loading competitor IDs:', compIdError);
      return [];
    }

    // Step 2: Extract all IDs into a flat array
    const competitorIdList = competitorIds?.map(c => c.id) || [];
    console.log('[ChampionPointsCalc] Found tournament_competitor_ids:', competitorIdList);

    if (competitorIdList.length === 0) {
      console.log('[ChampionPointsCalc] No tournament competitors found for champion:', championId);
      return [];
    }

    // Step 3: Query with proper joins: event_scores → events → tournaments
    const { data: scores, error: scoresError } = await supabase
      .from('event_scores')
      .select(`
        *,
        event:events (
          id,
          name,
          event_type,
          tournament_id,
          tournament:tournaments (
            id,
            name,
            date,
            class
          )
        )
      `)
      .in('tournament_competitor_id', competitorIdList);

    if (scoresError) {
      console.error('[ChampionPointsCalc] Error loading event scores:', scoresError);
      return [];
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      console.log('[ChampionPointsCalc] Found event_scores:', 0);
      return [];
    }

    console.log('[ChampionPointsCalc] Found event_scores:', scores.length);
    
    // Group by event_id to calculate total competitors and deduplicate
    const eventGroups = new Map();
    const eventScoresMap = new Map();
    
    // First pass: collect all scores by event
    for (const score of scores) {
      const eventId = score.event_id;
      if (!eventScoresMap.has(eventId)) {
        eventScoresMap.set(eventId, []);
      }
      eventScoresMap.get(eventId).push(score);
    }
    
    // Second pass: process each event with calculated total competitors
    for (const score of scores) {
      const event = score.event;
      const tournament = event?.tournament;
      
      if (!event || !tournament || !score.final_rank) {
        console.log('[ChampionPointsCalc] Skipping invalid record:', { event: !!event, tournament: !!tournament, final_rank: score.final_rank });
        continue;
      }

      const eventId = score.event_id;
      const scoresForThisEvent = eventScoresMap.get(eventId) || [];
      const totalCompetitors = scoresForThisEvent.length;

      // Extract tournament class from the tournament.class field
      const tournamentClass = tournament.class;
      
      // Use the updated calculateTournamentPoints function with correct parameter order
      const pointsEarned = calculateTournamentPoints(
        tournamentClass,
        score.final_rank,
        totalCompetitors
      );

      console.log('[ChampionPointsCalc] Event:', event.name, 'Rank:', score.final_rank, 'Class:', tournament.class, 'Total Competitors:', totalCompetitors, 'Points Earned:', pointsEarned);

      const processedScore = {
        id: score.id,
        event_id: eventId,
        event_type: event.event_type,
        event_name: event.name,
        final_rank: score.final_rank,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        judge_a_score: score.judge_a_score,
        tournament_name: tournament.name,
        tournament_class: tournament.class,
        tournament_date: tournament.date,
        points: pointsEarned,
        total_competitors: totalCompetitors
      };

      // Deduplicate by event_id, preferring lowest final_rank
      const existing = eventGroups.get(eventId);
      
      if (!existing || 
          score.final_rank < existing.final_rank ||
          (score.final_rank === existing.final_rank && score.id > existing.id)) {
        eventGroups.set(eventId, processedScore);
      }
    }

    const results = Array.from(eventGroups.values());
    console.log('[ChampionPointsCalc] Final results:', results.length, 'unique events');
    
    return results;
    
  } catch (error) {
    console.error('[ChampionPointsCalc] Error loading event scores:', error);
    return [];
  }
}