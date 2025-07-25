import { supabase } from './supabase';

/**
 * Track and log all update operations to event_scores table
 * This will help us understand exactly what's being written to the database
 */
interface UpdateOperation {
  timestamp: string;
  operation: string;
  scoreId: string;
  eventId: string;
  data: any;
  success: boolean;
  error?: any;
}

const updateLog: UpdateOperation[] = [];

/**
 * Log an update operation
 */
function logUpdate(operation: string, scoreId: string, eventId: string, data: any, success: boolean, error?: any) {
  const entry: UpdateOperation = {
    timestamp: new Date().toISOString(),
    operation,
    scoreId,
    eventId,
    data,
    success,
    error
  };
  
  updateLog.push(entry);
  
  console.log(`📝 UPDATE LOG [${operation}]:`, {
    scoreId,
    eventId,
    data,
    success,
    error: error?.message || null
  });
  
  // Keep only last 50 entries to prevent memory issues
  if (updateLog.length > 50) {
    updateLog.shift();
  }
}

/**
 * Wrapper for supabase updates that includes logging
 */
export async function trackedUpdate(scoreId: string, eventId: string, updateData: any, operation: string = 'UPDATE') {
  console.log(`🔄 TRACKED UPDATE: Starting ${operation} for score ${scoreId}`);
  console.log(`📊 Update data:`, updateData);
  
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .update(updateData)
      .eq('id', scoreId)
      .select();
    
    if (error) {
      logUpdate(operation, scoreId, eventId, updateData, false, error);
      console.error(`❌ ${operation} failed:`, error);
      return { data: null, error };
    }
    
    logUpdate(operation, scoreId, eventId, updateData, true);
    console.log(`✅ ${operation} succeeded:`, data);
    
    // Verify the update actually persisted
    if (updateData.final_rank !== undefined) {
      const { data: verifyData, error: verifyError } = await supabase
        .from('event_scores')
        .select('final_rank, rank, placement')
        .eq('id', scoreId)
        .single();
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
      } else {
        console.log('🔍 VERIFICATION:', {
          expected_final_rank: updateData.final_rank,
          actual_final_rank: verifyData.final_rank,
          matches: verifyData.final_rank === updateData.final_rank
        });
        
        if (verifyData.final_rank !== updateData.final_rank) {
          console.log('🚨 CRITICAL: final_rank did not persist correctly!');
          console.log('   This indicates a database-level issue');
        }
      }
    }
    
    return { data, error: null };
  } catch (exception) {
    logUpdate(operation, scoreId, eventId, updateData, false, exception);
    console.error(`❌ ${operation} exception:`, exception);
    return { data: null, error: exception };
  }
}

/**
 * Wrapper for upsert operations
 */
export async function trackedUpsert(eventId: string, upsertData: any, conflictColumns: string[], operation: string = 'UPSERT') {
  console.log(`🔄 TRACKED UPSERT: Starting ${operation} for event ${eventId}`);
  console.log(`📊 Upsert data:`, upsertData);
  
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .upsert(upsertData, {
        onConflict: conflictColumns.join(',')
      })
      .select();
    
    if (error) {
      logUpdate(operation, 'UPSERT', eventId, upsertData, false, error);
      console.error(`❌ ${operation} failed:`, error);
      return { data: null, error };
    }
    
    logUpdate(operation, data?.[0]?.id || 'UPSERT', eventId, upsertData, true);
    console.log(`✅ ${operation} succeeded:`, data);
    
    // Verify upserted data if final_rank was included
    if (data && data[0] && upsertData.final_rank !== undefined) {
      const scoreId = data[0].id;
      const { data: verifyData, error: verifyError } = await supabase
        .from('event_scores')
        .select('final_rank, rank, placement')
        .eq('id', scoreId)
        .single();
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
      } else {
        console.log('🔍 VERIFICATION:', {
          expected_final_rank: upsertData.final_rank,
          actual_final_rank: verifyData.final_rank,
          matches: verifyData.final_rank === upsertData.final_rank
        });
      }
    }
    
    return { data, error: null };
  } catch (exception) {
    logUpdate(operation, 'UPSERT', eventId, upsertData, false, exception);
    console.error(`❌ ${operation} exception:`, exception);
    return { data: null, error: exception };
  }
}

/**
 * Get the update log for debugging
 */
export function getUpdateLog(): UpdateOperation[] {
  return [...updateLog];
}

/**
 * Clear the update log
 */
export function clearUpdateLog(): void {
  updateLog.length = 0;
  console.log('🗑️  Update log cleared');
}

/**
 * Print a summary of recent updates
 */
export function printUpdateSummary(): void {
  console.log('📋 UPDATE SUMMARY:');
  console.log(`   Total operations: ${updateLog.length}`);
  
  const successful = updateLog.filter(op => op.success).length;
  const failed = updateLog.filter(op => !op.success).length;
  
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('❌ Failed operations:');
    updateLog.filter(op => !op.success).forEach((op, index) => {
      console.log(`   ${index + 1}. ${op.operation} at ${op.timestamp}`);
      console.log(`      Error: ${op.error?.message || 'Unknown'}`);
    });
  }
  
  // Check for final_rank specific issues
  const finalRankUpdates = updateLog.filter(op => op.data?.final_rank !== undefined);
  console.log(`   final_rank updates: ${finalRankUpdates.length}`);
  
  const failedFinalRankUpdates = finalRankUpdates.filter(op => !op.success);
  if (failedFinalRankUpdates.length > 0) {
    console.log('🚨 Failed final_rank updates:');
    failedFinalRankUpdates.forEach((op, index) => {
      console.log(`   ${index + 1}. ${op.error?.message || 'Unknown error'}`);
    });
  }
}