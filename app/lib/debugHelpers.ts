/**
 * Debug utility functions for event ID tracing and diagnostics
 */

// Global flag to control verbose logging
const verboseLogging = false;

export function printEventIdTrace(eventId: string, source: string = 'UNKNOWN') {
  // Only log if verbose logging is enabled in development
  if (__DEV__ && verboseLogging) {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [eventIdTrace] Detected eventId: ${eventId}`);
    console.log(`🔍 [eventIdTrace] Source: ${source}`);
    console.log(`🔍 [eventIdTrace] Time: ${timestamp}`);
    console.trace(`🔍 [eventIdTrace] Stack trace for eventId: ${eventId}`);
  }
}

/**
 * Additional debug helper to detect phantom UUIDs
 */
export function detectPhantomEventId(eventId: string, source: string = 'UNKNOWN') {
  const phantomPatterns = [
    '22b36496-a025-4845-89a8-9001c4bcccd6',
    'b5c6412d',
    // Add other known phantom IDs here
  ];
  
  const isPhantom = phantomPatterns.some(pattern => 
    eventId && eventId.includes(pattern)
  );
  
  // Always log phantom detection as this is critical
  if (isPhantom) {
    console.error(`\n🚨 [PHANTOM DETECTED] Found phantom eventId: ${eventId}`);
    console.error(`🚨 [PHANTOM DETECTED] Source: ${source}`);
    console.trace(`🚨 [PHANTOM DETECTED] Stack trace for phantom eventId`);
  }
  
  return isPhantom;
}

/**
 * Validate eventId format and log issues
 */
export function validateEventIdFormat(eventId: any, source: string = 'UNKNOWN') {
  // Only show detailed validation logs in verbose mode
  if (__DEV__ && verboseLogging) {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [validateEventId] Checking eventId from ${source}`);
    console.log(`🔍 [validateEventId] Value: ${eventId}`);
    console.log(`🔍 [validateEventId] Type: ${typeof eventId}`);
    console.log(`🔍 [validateEventId] Time: ${timestamp}`);
  }
  
  // Always log errors and warnings
  if (typeof eventId !== 'string') {
    console.error(`❌ [validateEventId] Invalid type: expected string, got ${typeof eventId}`);
    return false;
  }
  
  if (!eventId || eventId.length === 0) {
    console.error(`❌ [validateEventId] Empty or null eventId`);
    return false;
  }
  
  // Check for UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(eventId)) {
    console.error(`❌ [validateEventId] Invalid UUID format: ${eventId}`);
    return false;
  }
  
  // Check for phantom IDs
  if (detectPhantomEventId(eventId, source)) {
    console.error(`❌ [validateEventId] Phantom eventId detected`);
    return false;
  }
  
  // Only log success in verbose mode
  if (__DEV__ && verboseLogging) {
    console.log(`✅ [validateEventId] Valid eventId format`);
  }
  return true;
}