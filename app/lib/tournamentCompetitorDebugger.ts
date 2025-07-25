import { supabase } from './supabase';

export const debugTournamentCompetitors = async (tournamentId: string) => {
  console.log('------ Tournament Competitor Debug ------');
  
  const { data: allTournamentCompetitors } = await supabase
    .from('tournament_competitors')
    .select('*')
    .eq('tournament_id', tournamentId);
  
  console.log('Total tournament competitors:', allTournamentCompetitors?.length || 0);
  
  // Log each tournament competitor with ID and name
  console.log('Tournament competitors details:');
  allTournamentCompetitors?.forEach(tc => {
    console.log(`ID: ${tc.id}, Name: ${tc.name}, Competitor ID: ${tc.competitor_id}, Source: ${tc.source_type}`);
  });
  
  // Check for duplicates with same name, competitor_id, and source_type but different UUIDs
  const duplicateCheck = new Map();
  allTournamentCompetitors?.forEach(tc => {
    const key = `${tc.name.toLowerCase()}-${tc.competitor_id}-${tc.source_type}`;
    if (duplicateCheck.has(key)) {
      console.log(`🚨 DUPLICATE FOUND: ${tc.name}`);
      console.log(`  Existing: ID=${duplicateCheck.get(key).id}`);
      console.log(`  Duplicate: ID=${tc.id}`);
    } else {
      duplicateCheck.set(key, tc);
    }
  });
  
  return allTournamentCompetitors;
};

export const deduplicateCompetitorsByName = (competitors: any[]) => {
  const seenNames = new Set();
  return competitors.filter((c) => {
    const nameLower = c.name.toLowerCase();
    if (seenNames.has(nameLower)) {
      console.log(`🔄 Removing duplicate name: ${c.name} (ID: ${c.id})`);
      return false;
    }
    seenNames.add(nameLower);
    return true;
  });
};