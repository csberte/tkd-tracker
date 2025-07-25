import { validateUUID } from './utils';

// Global flag to control verbose logging
const verboseLogging = false;

// Global event ID logging system
interface EventIdLogEntry {
  timestamp: string;
  step: string;
  eventId: string;
  metadata?: any;
}

const eventIdLog: EventIdLogEntry[] = [];

// Main logging function
export function logEventId(step: string, eventId: string, metadata?: any): void {
  const entry: EventIdLogEntry = {
    timestamp: new Date().toISOString(),
    step,
    eventId: eventId || 'N/A',
    metadata
  };
  
  eventIdLog.push(entry);
  
  // Validate event ID format
  const isValid = validateUUID(eventId);
  const isObject = typeof eventId === 'object';
  
  // Only log detailed info in verbose mode
  if (__DEV__ && verboseLogging) {
    console.log(`[EventIdLogger] ${step}:`, {
      eventId,
      isValidUUID: isValid,
      isObject,
      metadata
    });
  }
  
  // Always alert on [object Object] detection as this is critical
  if (isObject || eventId === '[object Object]') {
    console.error('🚨 [EventIdLogger] DETECTED [object Object] ERROR:', {
      step,
      eventId,
      metadata
    });
  }
  
  // Always log invalid UUIDs as warnings
  if (!isValid && eventId !== 'N/A') {
    console.warn('⚠️ [EventIdLogger] Invalid UUID detected:', {
      step,
      eventId
    });
  }
  
  // Keep log size manageable
  if (eventIdLog.length > 100) {
    eventIdLog.splice(0, 50);
  }
}

// Debug trace function
export function printEventIdTrace(operation: string, eventId: string, metadata?: any): void {
  // Only show trace in verbose mode
  if (__DEV__ && verboseLogging) {
    console.log(`\n🔍 [EventIdTrace] ${operation}:`);
    console.log('  - Event ID:', eventId);
    console.log('  - Is Valid UUID:', validateUUID(eventId));
    console.log('  - Type:', typeof eventId);
    console.log('  - Metadata:', metadata);
    
    // Show recent log entries for this event
    const recentEntries = eventIdLog
      .filter(entry => entry.eventId === eventId)
      .slice(-5);
    
    if (recentEntries.length > 0) {
      console.log('  - Recent Log Entries:');
      recentEntries.forEach(entry => {
        console.log(`    ${entry.timestamp}: ${entry.step}`);
      });
    }
    
    console.log('\n');
  }
}

// Get full log for debugging
export function getEventIdLog(): EventIdLogEntry[] {
  return [...eventIdLog];
}

// Clear log
export function clearEventIdLog(): void {
  eventIdLog.length = 0;
}

// Specific logging functions for each step
export const EventIdSteps = {
  EVENT_CREATION: 'EVENT_CREATION',
  STATE_UPDATE: 'STATE_UPDATE',
  PARAM_UPDATE: 'PARAM_UPDATE',
  COMPETITOR_INSERT: 'COMPETITOR_INSERT',
  SCORE_ENTRY: 'SCORE_ENTRY',
  FETCH_COMPETITORS: 'FETCH_COMPETITORS'
};