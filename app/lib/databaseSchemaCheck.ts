import { supabase } from './supabase';

/**
 * Check the database schema for event_scores table to understand final_rank field
 */
export async function checkEventScoresSchema() {
  console.log('🔍 SCHEMA CHECK: Analyzing event_scores table structure');
  
  try {
    // 1. Check if we can query the information_schema (may not work with RLS)
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'event_scores' })
      .select();
    
    if (schemaError) {
      console.log('⚠️  Cannot access schema info directly, using alternative method');
    } else {
      console.log('📋 Table columns from schema:', columns);
    }
    
    // 2. Alternative: Try to select all columns to see what exists
    const { data: sampleRow, error: sampleError } = await supabase
      .from('event_scores')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (sampleError) {
      console.error('❌ Cannot access event_scores table:', sampleError);
      return;
    }
    
    if (sampleRow) {
      console.log('📊 Sample row structure:', Object.keys(sampleRow));
      console.log('🎯 final_rank field exists:', 'final_rank' in sampleRow);
      console.log('🎯 final_rank value type:', typeof sampleRow.final_rank);
      console.log('🎯 final_rank current value:', sampleRow.final_rank);
    } else {
      console.log('📊 No rows in event_scores table to analyze');
    }
    
    // 3. Test field accessibility by trying to update
    if (sampleRow) {
      console.log('🧪 Testing field write permissions...');
      
      const originalValue = sampleRow.final_rank;
      const testValue = originalValue === 999 ? 998 : 999;
      
      // Try to update final_rank
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({ final_rank: testValue })
        .eq('id', sampleRow.id);
      
      if (updateError) {
        console.error('❌ Cannot update final_rank:', updateError);
        console.log('🚨 FINDING: final_rank field may be read-only or have constraints');
      } else {
        console.log('✅ final_rank field is writable');
        
        // Verify the write
        const { data: verifyRow, error: verifyError } = await supabase
          .from('event_scores')
          .select('final_rank')
          .eq('id', sampleRow.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Cannot verify update:', verifyError);
        } else if (verifyRow.final_rank === testValue) {
          console.log('✅ Update verified successfully');
          
          // Restore original value
          await supabase
            .from('event_scores')
            .update({ final_rank: originalValue })
            .eq('id', sampleRow.id);
          console.log('✅ Original value restored');
        } else {
          console.log('🚨 FINDING: Update did not persist');
          console.log(`   Expected: ${testValue}, Got: ${verifyRow.final_rank}`);
        }
      }
    }
    
    // 4. Check for any database policies that might affect updates
    console.log('🔒 Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('get_table_policies', { table_name: 'event_scores' })
      .select();
    
    if (policyError) {
      console.log('⚠️  Cannot access policy information');
    } else {
      console.log('🔒 Table policies:', policies);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

/**
 * Check for database triggers that might affect final_rank updates
 */
export async function checkDatabaseTriggers() {
  console.log('⚡ TRIGGER CHECK: Looking for database triggers on event_scores');
  
  try {
    const { data: triggers, error } = await supabase
      .rpc('get_table_triggers', { table_name: 'event_scores' })
      .select();
    
    if (error) {
      console.log('⚠️  Cannot access trigger information:', error.message);
    } else {
      console.log('⚡ Database triggers:', triggers);
      
      if (triggers && triggers.length > 0) {
        console.log('🚨 FINDING: Database triggers detected - these may interfere with final_rank updates');
        triggers.forEach((trigger, index) => {
          console.log(`   ${index + 1}. ${trigger.trigger_name}: ${trigger.event_manipulation}`);
        });
      } else {
        console.log('✅ No triggers found that would interfere with updates');
      }
    }
  } catch (error) {
    console.error('❌ Trigger check failed:', error);
  }
}

/**
 * Comprehensive database investigation
 */
export async function runDatabaseInvestigation(eventId?: string) {
  console.log('🕵️  STARTING COMPREHENSIVE DATABASE INVESTIGATION');
  console.log('=' .repeat(60));
  
  await checkEventScoresSchema();
  console.log('\n' + '-'.repeat(40) + '\n');
  
  await checkDatabaseTriggers();
  console.log('\n' + '-'.repeat(40) + '\n');
  
  if (eventId) {
    const { investigateFinalRankPersistence } = await import('./finalRankInvestigation');
    await investigateFinalRankPersistence(eventId);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🕵️  DATABASE INVESTIGATION COMPLETE');
}