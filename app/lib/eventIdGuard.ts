import { validateUUID, isProblematicUUID } from './utils';
import { logEventId } from './eventIdLogger';
import { printEventIdTrace } from './debugHelpers';
import { supabase } from './supabase';

// Global flag to control verbose logging
const verboseLogging = false;

// One-time awaitable guard to ensure event ID is validated and ready
export async function createEventIdGuard(
  eventId: string,
  setCurrentEventId: (id: string) => void,
  router: any
): Promise<string> {
  try {
    printEventIdTrace(eventId, 'eventIdGuard - createEventIdGuard START');
    if (__DEV__ && verboseLogging) {
      console.log('[trace] createEventIdGuard called with eventId:', eventId, typeof eventId, JSON.stringify(eventId));
    }
    logEventId('eventIdGuard - START', eventId);
    
    // Step 1: Validate event ID format
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      printEventIdTrace(eventId, 'eventIdGuard - INVALID_FORMAT');
      console.error('[eventIdGuard] INVALID_FORMAT:', eventId);
      logEventId('eventIdGuard - INVALID_FORMAT', eventId);
      throw new Error(`Invalid event ID format: ${eventId}`);
    }
    
    // Step 2: Verify event exists in database
    printEventIdTrace(eventId, 'eventIdGuard - checking database');
    if (__DEV__ && verboseLogging) {
      console.log('[trace] createEventIdGuard - checking database for eventId:', eventId);
    }
    const { data: event, error } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .single();
    
    if (error || !event) {
      printEventIdTrace(eventId, 'eventIdGuard - EVENT_NOT_FOUND');
      console.error('[eventIdGuard] EVENT_NOT_FOUND:', eventId, error?.message);
      logEventId('eventIdGuard - EVENT_NOT_FOUND', eventId, { error: error?.message });
      throw new Error(`Event not found in database: ${eventId}`);
    }
    
    // Step 3: Ensure state and router are synchronized
    printEventIdTrace(eventId, 'eventIdGuard - syncing state');
    if (__DEV__ && verboseLogging) {
      console.log('[trace] createEventIdGuard - syncing state with eventId:', eventId);
    }
    logEventId('eventIdGuard - SYNC_STATE', eventId);
    setCurrentEventId(eventId);
    
    printEventIdTrace(eventId, 'eventIdGuard - syncing router');
    if (__DEV__ && verboseLogging) {
      console.log('[trace] createEventIdGuard - syncing router with eventId:', eventId);
    }
    logEventId('eventIdGuard - SYNC_ROUTER', eventId);
    router.setParams({ eventId });
    
    // Step 4: Final validation
    printEventIdTrace(eventId, 'eventIdGuard - SUCCESS');
    logEventId('eventIdGuard - SUCCESS', eventId, { tournamentId: event.tournament_id });
    
    console.log('✅ [eventIdGuard] Event ID validated and synchronized:', eventId);
    return eventId;
  } catch (error) {
    printEventIdTrace(eventId, 'eventIdGuard - ERROR');
    console.error('[eventIdGuard] ERROR:', error.message);
    logEventId('eventIdGuard - ERROR', eventId, { error: error.message });
    console.error('❌ [eventIdGuard] Failed:', error.message);
    throw error;
  }
}

// Guard for downstream operations - ensures event ID is ready before proceeding
export async function guardDownstreamOperation(
  eventId: string,
  operationName: string
): Promise<void> {
  try {
    printEventIdTrace(eventId, `guardDownstreamOperation - ${operationName} START`);
    if (__DEV__ && verboseLogging) {
      console.log(`[trace] guardDownstreamOperation called for ${operationName} with eventId:`, eventId, typeof eventId, JSON.stringify(eventId));
    }
    logEventId(`${operationName} - GUARD_START`, eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      printEventIdTrace(eventId, `guardDownstreamOperation - INVALID eventId for ${operationName}`);
      console.error(`[guardDownstreamOperation] INVALID eventId for ${operationName}:`, eventId);
      throw new Error(`Invalid event ID for ${operationName}: ${eventId}`);
    }
    
    // Check for phantom UUIDs
    if (eventId === '22b36496-a025-4845-89a8-9001c4bcccd6' || eventId === 'b5c6412d-f8a3-4d2e-9c1a-8b7f6e5d4c3b') {
      printEventIdTrace(eventId, `guardDownstreamOperation - PHANTOM UUID DETECTED for ${operationName}`);
      console.error(`[guardDownstreamOperation] PHANTOM UUID DETECTED for ${operationName}:`, eventId);
      throw new Error(`Phantom UUID detected in ${operationName}: ${eventId}`);
    }
    
    // Verify event still exists
    printEventIdTrace(eventId, `guardDownstreamOperation - checking database for ${operationName}`);
    if (__DEV__ && verboseLogging) {
      console.log(`[trace] guardDownstreamOperation - checking database for ${operationName} with eventId:`, eventId);
    }
    const { data: event, error } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();
    
    if (error || !event) {
      printEventIdTrace(eventId, `guardDownstreamOperation - EVENT_NOT_FOUND for ${operationName}`);
      console.error(`[guardDownstreamOperation] EVENT_NOT_FOUND for ${operationName}:`, eventId, error?.message);
      throw new Error(`Event not found for ${operationName}: ${eventId}`);
    }
    
    printEventIdTrace(eventId, `guardDownstreamOperation - ${operationName} SUCCESS`);
    logEventId(`${operationName} - GUARD_SUCCESS`, eventId);
    if (__DEV__ && verboseLogging) {
      console.log(`✅ [guardDownstreamOperation] ${operationName} cleared for event:`, eventId);
    }
  } catch (error) {
    printEventIdTrace(eventId, `guardDownstreamOperation - ${operationName} ERROR`);
    console.error(`[guardDownstreamOperation] ERROR for ${operationName}:`, error.message);
    logEventId(`${operationName} - GUARD_ERROR`, eventId, { error: error.message });
    console.error(`❌ [guardDownstreamOperation] ${operationName} blocked:`, error.message);
    throw error;
  }
}

// Wait for event to exist with detailed tracing
export async function waitForEventToExist(
  eventId: string,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<void> {
  const { maxRetries = 10, delayMs = 1000 } = options;
  
  printEventIdTrace(eventId, 'waitForEventToExist START');
  if (__DEV__ && verboseLogging) {
    console.log('[trace] waitForEventToExist called with eventId:', eventId, typeof eventId, JSON.stringify(eventId));
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      printEventIdTrace(eventId, `waitForEventToExist attempt ${attempt}/${maxRetries}`);
      if (__DEV__ && verboseLogging) {
        console.log(`[trace] waitForEventToExist attempt ${attempt}/${maxRetries} for eventId:`, eventId);
      }
      
      const { data: event, error } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (event && !error) {
        printEventIdTrace(eventId, `waitForEventToExist SUCCESS on attempt ${attempt}`);
        if (__DEV__ && verboseLogging) {
          console.log(`[trace] waitForEventToExist SUCCESS on attempt ${attempt} for eventId:`, eventId);
        }
        return;
      }
      
      if (__DEV__ && verboseLogging) {
        console.log(`[trace] waitForEventToExist attempt ${attempt} failed for eventId:`, eventId, error?.message);
      }
      
      if (attempt < maxRetries) {
        if (__DEV__ && verboseLogging) {
          console.log(`[trace] waitForEventToExist waiting ${delayMs}ms before retry...`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`[waitForEventToExist] attempt ${attempt} error:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  const errorMsg = `Event not found after ${maxRetries} attempts`;
  printEventIdTrace(eventId, 'waitForEventToExist FAILED');
  console.error(`[waitForEventToExist] FAILED:`, errorMsg, 'eventId:', eventId);
  throw new Error(errorMsg);
}