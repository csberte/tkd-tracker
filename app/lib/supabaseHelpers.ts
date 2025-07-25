import { supabase } from './supabase';
import { logEventId } from './eventIdLogger';
import { getOrCreateTraditionalFormsEvent } from './traditionalFormsEventManager';
import { deepClone } from './utils';

export async function createTournament(data: any): Promise<any> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting current user:', userError);
      throw new Error('User not authenticated');
    }
    
    console.log('Using deepClone with React Native compatible fallback');
    const tournamentData = deepClone({
      name: data.name,
      location: data.location,
      date: data.date,
      class: data.class,
      tournament_class: data.class,
      season: data.season,
      archived: data.archived || false,
      user_id: user.id
    });
    
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert(tournamentData)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }

    return tournament;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

export async function ensureEventParticipant(
  eventId: string,
  tournamentCompetitorId: string,
  tournamentId: string
): Promise<string> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', tournamentCompetitorId)
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    if (existing) {
      return existing.id;
    }
    
    const { data: newParticipant, error: insertError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        tournament_competitor_id: tournamentCompetitorId,
        tournament_id: tournamentId
      })
      .select('id')
      .maybeSingle();
    
    if (insertError) {
      throw insertError;
    }
    
    return newParticipant.id;
  } catch (error) {
    console.error('Failed to ensure event participant:', error);
    throw error;
  }
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

export async function ensureTournamentCompetitor(
  tournamentId: string,
  competitorData: any
): Promise<string> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('tournament_competitors')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('name', competitorData.name)
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    if (existing) {
      return existing.id;
    }
    
    const { data: newCompetitor, error: insertError } = await supabase
      .from('tournament_competitors')
      .insert({
        tournament_id: tournamentId,
        name: competitorData.name,
        avatar: competitorData.avatar,
        source_type: competitorData.source_type || 'manual'
      })
      .select('id')
      .maybeSingle();
    
    if (insertError) {
      throw insertError;
    }
    
    return newCompetitor.id;
  } catch (error) {
    console.error('Failed to ensure tournament competitor:', error);
    throw error;
  }
}

export async function createChampionFrom(payload: { name: string; avatar?: string; school?: string; location?: string }) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting current user:', userError);
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('champions')
      .insert({
        name: payload.name,
        avatar: payload.avatar || null,
        school: payload.school || null,
        location: payload.location || null,
        wins: 0,
        losses: 0,
        email: '',
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating champion:', error);
    throw error;
  }
}

export async function createCompetitorFrom(payload: { name: string; avatar?: string; school?: string; location?: string }) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting current user:', userError);
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('competitors')
      .insert({
        name: payload.name,
        avatar: payload.avatar || null,
        school: payload.school || null,
        location: payload.location || null,
        age: null,
        email: '',
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating competitor:', error);
    throw error;
  }
}

export async function promoteCompetitor(
  tournamentCompetitorId: string,
  target: "Champion" | "Competitor",
  sourceId: string
) {
  try {
    const { data, error } = await supabase
      .from('tournament_competitors')
      .update({
        source_type: target.toLowerCase(),
        source_id: sourceId
      })
      .eq('id', tournamentCompetitorId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error promoting competitor:', error);
    throw error;
  }
}