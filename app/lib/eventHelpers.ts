import { supabase } from './supabase';
import { Alert } from 'react-native';
import { calculateTournamentPoints } from './tournamentPoints';
import { updateFinalRanks, addCompetitorsToEvent } from './eventHelpersRest';
import { fetchAvailableCompetitors, fetchEventCompetitorsWithScores } from './eventHelpersRest2';
import { processTiebreakerResults } from './tieBreakerHelpers';
import { validateUUID, isProblematicUUID } from './utils';
import { getOrCreateTraditionalFormsEvent } from './traditionalFormsEventManager';

export interface CompetitorWithScore {
  id: string;
  competitor_id?: string;
  tournament_competitor_id?: string;
  name: string;
  avatar?: string;
  source_type?: string;
  totalScore: number;
  rank: number;
  placement?: string;
  isTied?: boolean;
  tie_breaker_status?: string;
  medal?: string;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
  has_video?: boolean;
  video_url?: string;
  final_rank?: number;
  points?: number;
}

// UPDATED: Create event function uses centralized Traditional Forms manager
export async function createEvent(tournamentId: string, eventType: string, userId: string, tournament: any): Promise<any> {
  console.log('[createEvent] Starting event creation:', { tournamentId, eventType, userId });
  
  try {
    // Validate inputs
    if (!validateUUID(tournamentId)) {
      console.error('[createEvent] Invalid tournament ID:', tournamentId);
      Alert.alert('Error', 'Invalid tournament ID');
      return null;
    }
    
    if (!eventType || typeof eventType !== 'string') {
      console.error('[createEvent] Invalid event type:', eventType);
      Alert.alert('Error', 'Invalid event type');
      return null;
    }
    
    // Convert event type to proper format for database
    const dbEventType = eventType.toLowerCase().replace(/\s+/g, '_');
    
    // For Traditional Forms, use the centralized atomic manager
    if (dbEventType === 'traditional_forms') {
      console.log('[createEvent] Using centralized Traditional Forms manager');
      const eventData = await getOrCreateTraditionalFormsEvent({ tournamentId, userId });
      if (!eventData) {
        console.error('[createEvent] Failed to get or create Traditional Forms event');
        Alert.alert('Error', 'Failed to create Traditional Forms event');
        return null;
      }
      console.log(`[createEvent] ✅ Using Traditional Forms event: ${eventData.id}`);
      return eventData;
    }
    
    // For other event types, use existing logic but check for existing first
    const { data: existing } = await supabase
      .from('events')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('event_type', dbEventType)
      .single();
    
    if (existing) {
      console.log(`[createEvent] ✅ Found existing ${dbEventType} event: ${existing.id}`);
      return existing;
    }
    
    // Create new event for non-traditional forms
    const eventName = dbEventType === 'creative_forms' ? 'Creative Forms' : 
                     dbEventType === 'extreme_forms' ? 'Extreme Forms' : 
                     'Traditional Forms';
    
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tournament_id: tournamentId,
        event_type: dbEventType,
        name: eventName,
        description: `${eventName} competition for ${tournament.name}`,
        date: tournament.date,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[createEvent] Insert error:', insertError);
      Alert.alert('Error', 'Failed to create event');
      return null;
    }
    
    console.log(`[createEvent] ✅ Created new ${dbEventType} event: ${newEvent.id}`);
    return newEvent;
    
  } catch (error) {
    console.error('❌ [createEvent] Exception during event creation:', error);
    Alert.alert('Error', 'Failed to create event');
    return null;
  }
}

// Fixed ranking function to properly handle ties
export function calculateRankingsWithTies(competitors: CompetitorWithScore[]): CompetitorWithScore[] {
  const sorted = [...competitors].sort((a, b) => b.totalScore - a.totalScore);
  const byScore: Record<number, CompetitorWithScore[]> = {};
  sorted.forEach(c => {
    const score = c.totalScore || 0;
    if (!byScore[score]) byScore[score] = [];
    byScore[score].push(c);
  });
  
  const sortedScores = Object.keys(byScore).map(Number).sort((a, b) => b - a);
  const rankedCompetitors = [];
  let currentPosition = 1;
  
  for (const score of sortedScores) {
    const group = byScore[score];
    for (const competitor of group) {
      rankedCompetitors.push({
        ...competitor,
        rank: currentPosition,
        isTied: group.length > 1
      });
    }
    currentPosition += group.length;
  }
  
  return rankedCompetitors;
}

function safeCalculateTournamentPoints(rank: any, tournamentClass: any, totalCompetitors: any): number {
  if (typeof rank !== 'number' || typeof tournamentClass !== 'string' || typeof totalCompetitors !== 'number') {
    console.error('[Points Error] Invalid inputs to calculateTournamentPoints:', { rank, tournamentClass, totalCompetitors });
    return 0;
  }
  return calculateTournamentPoints(rank, tournamentClass, totalCompetitors);
}

export async function completeTieBreaker(
  eventId: string,
  tiedGroup: CompetitorWithScore[],
  selectedWinners: string[],
  tournamentClass?: 'AAA' | 'AA' | 'A' | 'B' | 'C'
): Promise<void> {
  console.log('[completeTieBreaker] Called with:', {
    eventId, tiedGroup: tiedGroup.length, selectedWinners: selectedWinners.length
  });
  
  if (!Array.isArray(tiedGroup) || tiedGroup.length === 0) {
    console.warn('[completeTieBreaker] Invalid or empty tie group.');
    return;
  }
  
  const cleanedGroup = tiedGroup.filter(c => c && c.id);
  if (cleanedGroup.length === 0) {
    console.warn('[completeTieBreaker] No valid competitors after filtering.');
    return;
  }
  
  if (!eventId || typeof eventId !== 'string') {
    console.error('[completeTieBreaker] Invalid eventId:', eventId);
    throw new Error('Invalid event ID provided');
  }
  
  if (!selectedWinners || !Array.isArray(selectedWinners) || selectedWinners.length === 0) {
    console.error('[completeTieBreaker] Invalid selectedWinners:', selectedWinners);
    throw new Error('No valid winners selected');
  }
  
  const requiredSelections = cleanedGroup.length - 1;
  if (selectedWinners.length < requiredSelections) {
    console.warn(`[completeTieBreaker] Incomplete selections: ${selectedWinners.length}/${requiredSelections} required`);
    return;
  }
  
  const validWinners = selectedWinners.filter(winnerId => {
    if (!winnerId || typeof winnerId !== 'string') {
      console.warn('[completeTieBreaker] Invalid winner ID:', winnerId);
      return false;
    }
    
    const exists = cleanedGroup.some(c => (c && c.id === winnerId) || (c && c.competitor_id === winnerId));
    if (!exists) {
      console.warn('[completeTieBreaker] Winner not found in competitors:', winnerId);
    }
    return exists;
  });
  
  if (validWinners.length < requiredSelections) {
    console.warn(`[completeTieBreaker] Not enough valid winners: ${validWinners.length}/${requiredSelections} required`);
    return;
  }
  
  try {
    let finalTournamentClass = tournamentClass || 'A';
    
    if (!tournamentClass) {
      try {
        const { data: eventData } = await supabase
          .from('tournament_events')
          .select('tournament_id')
          .eq('id', eventId)
          .maybeSingle();
          
        if (eventData?.tournament_id) {
          const { data: tournamentInfo } = await supabase
            .from('tournaments')
            .select('class')
            .eq('id', eventData.tournament_id)
            .maybeSingle();
            
          if (tournamentInfo?.class) {
            finalTournamentClass = tournamentInfo.class;
          }
        }
      } catch (err) {
        console.error('[completeTieBreaker] Error fetching tournament data:', err);
      }
    }
    
    await processTiebreakerResults(eventId, cleanedGroup, validWinners, finalTournamentClass);
    console.log('[completeTieBreaker] Tiebreaker completion successful');
    
  } catch (error) {
    console.error('[completeTieBreaker] Tiebreaker completion failed:', error);
    throw error;
  }
}

export { updateFinalRanks, fetchEventCompetitorsWithScores, fetchAvailableCompetitors, addCompetitorsToEvent };