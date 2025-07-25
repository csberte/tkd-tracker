import { supabase } from './supabase';

// Data migration to backfill tournament_competitors for existing champions
export async function migrateChampionTournamentCompetitors() {
  console.log('[ChampionDataMigration] Starting data migration...');
  
  try {
    // Step 1: Find all champions who have event_scores but no tournament_competitors
    const { data: championsWithScores, error: scoresError } = await supabase
      .from('event_scores')
      .select(`
        champion_id,
        events (
          tournament_id
        )
      `)
      .not('champion_id', 'is', null);

    if (scoresError) {
      console.error('[ChampionDataMigration] Error fetching champion scores:', scoresError);
      return { success: false, error: scoresError };
    }

    if (!championsWithScores || championsWithScores.length === 0) {
      console.log('[ChampionDataMigration] No champion scores found');
      return { success: true, migrated: 0 };
    }

    // Step 2: Group by champion and tournament
    const championTournamentPairs = new Map<string, Set<string>>();
    
    for (const score of championsWithScores) {
      const championId = score.champion_id;
      const tournamentId = score.events?.tournament_id;
      
      if (championId && tournamentId) {
        if (!championTournamentPairs.has(championId)) {
          championTournamentPairs.set(championId, new Set());
        }
        championTournamentPairs.get(championId)!.add(tournamentId);
      }
    }

    console.log(`[ChampionDataMigration] Found ${championTournamentPairs.size} champions with scores`);

    // Step 3: Check which ones are missing tournament_competitors
    const missingRecords: Array<{ championId: string; tournamentId: string }> = [];
    
    for (const [championId, tournamentIds] of championTournamentPairs) {
      for (const tournamentId of tournamentIds) {
        // Check if tournament_competitor already exists
        const { data: existing, error: checkError } = await supabase
          .from('tournament_competitors')
          .select('id')
          .eq('source_id', championId)
          .eq('type', 'champion')
          .eq('tournament_id', tournamentId)
          .limit(1);

        if (checkError) {
          console.error('[ChampionDataMigration] Error checking existing record:', checkError);
          continue;
        }

        if (!existing || existing.length === 0) {
          missingRecords.push({ championId, tournamentId });
        }
      }
    }

    console.log(`[ChampionDataMigration] Found ${missingRecords.length} missing tournament_competitors records`);

    // Step 4: Create missing records in batches
    const batchSize = 50;
    let migrated = 0;
    
    for (let i = 0; i < missingRecords.length; i += batchSize) {
      const batch = missingRecords.slice(i, i + batchSize);
      const insertData = batch.map(record => ({
        source_id: record.championId,
        type: 'champion',
        tournament_id: record.tournamentId
      }));

      const { error: insertError } = await supabase
        .from('tournament_competitors')
        .insert(insertData);

      if (insertError) {
        console.error('[ChampionDataMigration] Error inserting batch:', insertError);
      } else {
        migrated += batch.length;
        console.log(`[ChampionDataMigration] Migrated batch ${i / batchSize + 1}, total: ${migrated}`);
      }
    }

    console.log(`✅ [ChampionDataMigration] Migration complete. Migrated ${migrated} records.`);
    return { success: true, migrated };
    
  } catch (error) {
    console.error('[ChampionDataMigration] Unexpected error:', error);
    return { success: false, error };
  }
}

// Check migration status
export async function checkMigrationStatus() {
  try {
    // Count champions with scores but no tournament_competitors
    const { data: championsWithScores, error: scoresError } = await supabase
      .from('event_scores')
      .select('champion_id')
      .not('champion_id', 'is', null);

    if (scoresError) {
      return { error: scoresError };
    }

    const uniqueChampions = new Set(championsWithScores?.map(s => s.champion_id) || []);
    
    const { data: championCompetitors, error: competitorsError } = await supabase
      .from('tournament_competitors')
      .select('source_id')
      .eq('type', 'champion');

    if (competitorsError) {
      return { error: competitorsError };
    }

    const championsWithCompetitors = new Set(championCompetitors?.map(c => c.source_id) || []);
    
    const championsNeedingMigration = [...uniqueChampions].filter(
      championId => !championsWithCompetitors.has(championId)
    );

    return {
      totalChampionsWithScores: uniqueChampions.size,
      championsWithCompetitors: championsWithCompetitors.size,
      championsNeedingMigration: championsNeedingMigration.length,
      needsMigration: championsNeedingMigration.length > 0
    };
    
  } catch (error) {
    return { error };
  }
}