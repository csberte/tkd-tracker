import { supabase } from './supabase';
import { validateUUID } from './utils';

// In-memory cache for event IDs to prevent duplicate creation
const eventCache = new Map<string, string>();

// Generate cache key from tournament ID and event type
function getCacheKey(tournamentId: string, eventType: string): string {
  return `${tournamentId}_${eventType.trim().toLowerCase()}`;
}

// Get cached event ID
export function getCachedEventId(tournamentId: string, eventType: string): string | null {
  const key = getCacheKey(tournamentId, eventType);
  return eventCache.get(key) || null;
}

// Set cached event ID
export function setCachedEventId(tournamentId: string, eventType: string, eventId: string): void {
  const key = getCacheKey(tournamentId, eventType);
  eventCache.set(key, eventId);
}

// Clear cache for specific tournament/event
export function clearCachedEventId(tournamentId: string, eventType: string): void {
  const key = getCacheKey(tournamentId, eventType);
  eventCache.delete(key);
}

// Clear all cache
export function clearAllCache(): void {
  eventCache.clear();
}

// Get existing event from database with caching
export async function getExistingEventFromDB(tournamentId: string, eventType: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = getCachedEventId(tournamentId, eventType);
    if (cached) {
      return cached;
    }
    
    // Query database
    const { data: events, error } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType.trim().toLowerCase())
      .limit(1);
    
    if (error || !events || events.length === 0) {
      return null;
    }
    
    const eventId = events[0].id;
    
    // Cache the result
    setCachedEventId(tournamentId, eventType, eventId);
    
    return eventId;
  } catch (error) {
    return null;
  }
}

// Create new event and cache it with conflict resolution
export async function createAndCacheEvent(tournamentId: string, eventType: string): Promise<string | null> {
  try {
    const eventName = eventType === 'traditional_forms' ? 'Traditional Forms' : 
                     eventType === 'creative_forms' ? 'Creative Forms' : 
                     eventType === 'extreme_forms' ? 'Extreme Forms' : 
                     'Traditional Forms';
    
    // Use upsert to handle duplicates silently
    const { data: newEvent, error } = await supabase
      .from('events')
      .upsert({
        tournament_id: tournamentId,
        event_type: eventType.trim().toLowerCase(),
        name: eventName,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'tournament_id,event_type',
        ignoreDuplicates: false
      })
      .select('id')
      .maybeSingle();
    
    if (error) {
      // If duplicate key error, try to get existing event silently
      if (error.message && error.message.includes('duplicate key')) {
        return await getExistingEventFromDB(tournamentId, eventType);
      }
      return null;
    }
    
    if (!newEvent) {
      // Upsert didn't return data, likely because it was a duplicate
      return await getExistingEventFromDB(tournamentId, eventType);
    }
    
    const eventId = newEvent.id;
    
    // Cache the new event
    setCachedEventId(tournamentId, eventType, eventId);
    
    return eventId;
  } catch (error) {
    return null;
  }
}