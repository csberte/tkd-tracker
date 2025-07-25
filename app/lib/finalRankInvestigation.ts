import { supabase } from './supabase';

/**
 * Investigation tool to analyze final_rank persistence issues
 * This will help us understand why final_rank is not being saved to the database
 */
export async function investigateFinalRankPersistence(eventId: string) {
  console.log('🔍 INVESTIGATION: Starting final_rank persistence analysis for eventId:', eventId);
  
  try {
    // 1. Check current state of event_scores table
    const { data: currentScores, error: scoresError } = await supabase
      .from('event_scores')
      .select('id, tournament_competitor_id, total_score, rank, final_rank, placement, updated_at')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (scoresError) {
      console.error('❌ Error fetching scores:', scoresError);
      return;
    }
    
    console.log('📊 Current event_scores state:');
    currentScores?.forEach((score, index) => {
      console.log(`  ${index + 1}. ID: ${score.id}`);
      console.log(`     Competitor: ${score.tournament_competitor_id}`);
      console.log(`     Total Score: ${score.total_score}`);
      console.log(`     Rank: ${score.rank}`);
      console.log(`     Final Rank: ${score.final_rank}`);
      console.log(`     Placement: ${score.placement}`);
      console.log(`     Updated: ${score.updated_at}`);
      console.log('     ---');
    });
    
    // 2. Check if final_rank column exists and has proper permissions
    const { data: tableInfo, error: tableError } = await supabase
      .from('event_scores')
      .select('final_rank')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table structure issue:', tableError);
      console.log('🚨 FINDING: final_rank column may not exist or lack permissions');
    } else {
      console.log('✅ final_rank column is accessible');
    }
    
    // 3. Analyze the data patterns
    const scoresWithoutFinalRank = currentScores?.filter(s => !s.final_rank || s.final_rank === 0) || [];
    const scoresWithFinalRank = currentScores?.filter(s => s.final_rank && s.final_rank > 0) || [];
    
    console.log(`📈 ANALYSIS:`);
    console.log(`   Total scores: ${currentScores?.length || 0}`);
    console.log(`   Scores WITHOUT final_rank: ${scoresWithoutFinalRank.length}`);
    console.log(`   Scores WITH final_rank: ${scoresWithFinalRank.length}`);
    
    if (scoresWithoutFinalRank.length > 0) {
      console.log('🚨 FINDING: Some scores are missing final_rank values');
      console.log('   This suggests either:');
      console.log('   1. Updates are not including final_rank field');
      console.log('   2. Database constraints are preventing the update');
      console.log('   3. Race conditions are overwriting the values');
    }
    
    // 4. Check for any database triggers or constraints
    console.log('🔧 Attempting test update to verify write permissions...');
    
    if (currentScores && currentScores.length > 0) {
      const testScore = currentScores[0];
      const testFinalRank = 999; // Use obvious test value
      
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({ final_rank: testFinalRank })
        .eq('id', testScore.id);
      
      if (updateError) {
        console.error('❌ Test update failed:', updateError);
        console.log('🚨 FINDING: Cannot write to final_rank field - permission or constraint issue');
      } else {
        console.log('✅ Test update succeeded');
        
        // Verify the update persisted
        const { data: verifyData, error: verifyError } = await supabase
          .from('event_scores')
          .select('final_rank')
          .eq('id', testScore.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Verification read failed:', verifyError);
        } else if (verifyData.final_rank === testFinalRank) {
          console.log('✅ Test value persisted correctly');
          
          // Restore original value
          await supabase
            .from('event_scores')
            .update({ final_rank: testScore.final_rank })
            .eq('id', testScore.id);
        } else {
          console.log('🚨 FINDING: Test value did not persist - possible trigger overriding');
          console.log(`   Expected: ${testFinalRank}, Got: ${verifyData.final_rank}`);
        }
      }
    }
    
    // 5. Summary of findings
    console.log('\n📋 INVESTIGATION SUMMARY:');
    if (scoresWithoutFinalRank.length === currentScores?.length) {
      console.log('🚨 CRITICAL: ALL scores are missing final_rank values');
      console.log('   This indicates a systematic issue with final_rank updates');
    } else if (scoresWithoutFinalRank.length > 0) {
      console.log('⚠️  PARTIAL: Some scores missing final_rank values');
      console.log('   This suggests inconsistent update logic');
    } else {
      console.log('✅ All scores have final_rank values');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

/**
 * Monitor real-time updates to final_rank field
 */
export function monitorFinalRankUpdates(eventId: string) {
  console.log('👁️  Starting real-time monitoring of final_rank updates for eventId:', eventId);
  
  const subscription = supabase
    .channel(`final_rank_monitor_${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_scores',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => {
        console.log('📡 Real-time update detected:', {
          id: payload.new.id,
          old_final_rank: payload.old?.final_rank,
          new_final_rank: payload.new?.final_rank,
          old_rank: payload.old?.rank,
          new_rank: payload.new?.rank,
          timestamp: new Date().toISOString()
        });
        
        if (payload.old?.final_rank !== payload.new?.final_rank) {
          console.log('✅ final_rank changed in real-time');
        } else {
          console.log('⚠️  final_rank unchanged despite update');
        }
      }
    )
    .subscribe();
    
  return subscription;
}