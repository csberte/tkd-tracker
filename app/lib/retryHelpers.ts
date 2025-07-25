import { supabase } from './supabase';
import { logEventId } from './eventIdLogger';
import { printEventIdTrace } from './debugHelpers';

export async function waitForEventToExist(
  eventId: string,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<void> {
  const { maxRetries = 10, delayMs = 1000 } = options;
  
  printEventIdTrace(eventId, 'waitForEventToExist - START');
  console.log('[trace] waitForEventToExist called with eventId:', eventId, typeof eventId, JSON.stringify(eventId));
  logEventId('waitForEventToExist - START', eventId, { maxRetries, delayMs });
  
  // Check for phantom UUIDs immediately
  if (eventId === '22b36496-a025-4845-89a8-9001c4bcccd6' || eventId === 'b5c6412d-f8a3-4d2e-9c1a-8b7f6e5d4c3b') {
    printEventIdTrace(eventId, 'waitForEventToExist - PHANTOM UUID DETECTED');
    console.error('[trace] PHANTOM UUID DETECTED in waitForEventToExist:', eventId);
    logEventId('waitForEventToExist - PHANTOM_UUID', eventId);
    throw new Error(`Phantom UUID detected: ${eventId}`);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      printEventIdTrace(eventId, `waitForEventToExist - attempt ${attempt}/${maxRetries}`);
      console.log(`[trace] waitForEventToExist attempt ${attempt}/${maxRetries} for eventId:`, eventId);
      logEventId(`waitForEventToExist - ATTEMPT_${attempt}`, eventId);
      
      const { data: event, error } = await supabase
        .from('events')
        .select('id, tournament_id, created_at')
        .eq('id', eventId)
        .single();
      
      if (event && !error) {
        printEventIdTrace(eventId, `waitForEventToExist - SUCCESS on attempt ${attempt}`);
        console.log(`[trace] waitForEventToExist SUCCESS on attempt ${attempt} for eventId:`, eventId);
        logEventId('waitForEventToExist - SUCCESS', eventId, { attempt, tournamentId: event.tournament_id });
        return;
      }
      
      console.log(`[trace] waitForEventToExist attempt ${attempt} failed for eventId:`, eventId, error?.message);
      logEventId(`waitForEventToExist - ATTEMPT_${attempt}_FAILED`, eventId, { error: error?.message });
      
      if (attempt < maxRetries) {
        console.log(`[trace] waitForEventToExist waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`[trace] waitForEventToExist attempt ${attempt} error:`, error);
      logEventId(`waitForEventToExist - ATTEMPT_${attempt}_ERROR`, eventId, { error: error?.message });
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  const errorMsg = `Event not found after ${maxRetries} attempts`;
  printEventIdTrace(eventId, 'waitForEventToExist - FAILED');
  console.error(`[trace] waitForEventToExist FAILED:`, errorMsg, 'eventId:', eventId);
  logEventId('waitForEventToExist - FAILED', eventId, { maxRetries, error: errorMsg });
  throw new Error(errorMsg);
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  eventId?: string,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  
  if (eventId) {
    printEventIdTrace(eventId, `retryOperation - START - ${operationName}`);
  }
  console.log(`[trace] retryOperation called for ${operationName}`, eventId ? `with eventId: ${eventId}` : '');
  if (eventId) {
    logEventId(`retryOperation - START - ${operationName}`, eventId, { maxRetries, delayMs });
  }
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (eventId) {
        printEventIdTrace(eventId, `retryOperation - attempt ${attempt}/${maxRetries} - ${operationName}`);
      }
      console.log(`[trace] retryOperation attempt ${attempt}/${maxRetries} for ${operationName}`);
      if (eventId) {
        logEventId(`retryOperation - ATTEMPT_${attempt} - ${operationName}`, eventId);
      }
      
      const result = await operation();
      
      if (eventId) {
        printEventIdTrace(eventId, `retryOperation - SUCCESS - ${operationName}`);
      }
      console.log(`[trace] retryOperation SUCCESS on attempt ${attempt} for ${operationName}`);
      if (eventId) {
        logEventId(`retryOperation - SUCCESS - ${operationName}`, eventId, { attempt });
      }
      
      return result;
    } catch (error) {
      console.error(`[trace] retryOperation attempt ${attempt} failed for ${operationName}:`, error);
      if (eventId) {
        logEventId(`retryOperation - ATTEMPT_${attempt}_FAILED - ${operationName}`, eventId, { error: error?.message });
      }
      
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.log(`[trace] retryOperation waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  if (eventId) {
    printEventIdTrace(eventId, `retryOperation - FAILED - ${operationName}`);
  }
  console.error(`[trace] retryOperation FAILED after ${maxRetries} attempts for ${operationName}:`, lastError);
  if (eventId) {
    logEventId(`retryOperation - FAILED - ${operationName}`, eventId, { maxRetries, error: lastError?.message });
  }
  
  throw lastError;
}