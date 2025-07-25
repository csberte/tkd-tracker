import { supabase } from './supabase';
import { investigateFinalRankPersistence, monitorFinalRankUpdates } from './finalRankInvestigation';
import { runDatabaseInvestigation } from './databaseSchemaCheck';
import { trackedUpdate, printUpdateSummary, clearUpdateLog } from './updateTracker';

/**
 * Comprehensive test script to investigate final_rank persistence issues
 */
export class FinalRankTestScript {
  private eventId: string;
  private monitorSubscription: any;
  private testResults: any = {};

  constructor(eventId: string) {
    this.eventId = eventId;
  }

  /**
   * Run the complete investigation
   */
  async runFullInvestigation() {
    console.log('🚀 STARTING FINAL_RANK INVESTIGATION');
    console.log('='.repeat(80));
    console.log(`Event ID: ${this.eventId}`);
    console.log('Time:', new Date().toISOString());
    console.log('='.repeat(80));

    try {
      // Clear previous logs
      clearUpdateLog();

      // Step 1: Database schema investigation
      console.log('\n📋 STEP 1: Database Schema Check');
      console.log('-'.repeat(50));
      await runDatabaseInvestigation(this.eventId);
      this.testResults.schemaCheck = 'completed';

      // Step 2: Current state analysis
      console.log('\n🔍 STEP 2: Current State Analysis');
      console.log('-'.repeat(50));
      await investigateFinalRankPersistence(this.eventId);
      this.testResults.stateAnalysis = 'completed';

      // Step 3: Start real-time monitoring
      console.log('\n👁️  STEP 3: Starting Real-time Monitoring');
      console.log('-'.repeat(50));
      this.monitorSubscription = monitorFinalRankUpdates(this.eventId);
      this.testResults.monitoring = 'active';

      // Step 4: Test tracked updates
      console.log('\n🧪 STEP 4: Testing Tracked Updates');
      console.log('-'.repeat(50));
      await this.testTrackedUpdates();
      this.testResults.trackedUpdates = 'completed';

      // Step 5: Generate summary
      console.log('\n📊 STEP 5: Investigation Summary');
      console.log('-'.repeat(50));
      this.generateSummary();

    } catch (error) {
      console.error('❌ Investigation failed:', error);
      this.testResults.error = error;
    }
  }

  /**
   * Test tracked update functionality
   */
  private async testTrackedUpdates() {
    try {
      // Get a sample score to test with
      const { data: scores, error } = await supabase
        .from('event_scores')
        .select('id, final_rank, rank, placement')
        .eq('event_id', this.eventId)
        .limit(1);

      if (error || !scores || scores.length === 0) {
        console.log('⚠️  No scores found to test with');
        return;
      }

      const testScore = scores[0];
      console.log('🎯 Testing with score ID:', testScore.id);
      console.log('   Current final_rank:', testScore.final_rank);

      // Test 1: Simple final_rank update
      const testFinalRank = (testScore.final_rank || 0) === 999 ? 998 : 999;
      console.log('\n🧪 TEST 1: Simple final_rank update');
      await trackedUpdate(
        testScore.id,
        this.eventId,
        { final_rank: testFinalRank },
        'TEST_FINAL_RANK_UPDATE'
      );

      // Test 2: Combined rank fields update
      console.log('\n🧪 TEST 2: Combined rank fields update');
      await trackedUpdate(
        testScore.id,
        this.eventId,
        {
          final_rank: testFinalRank + 1,
          rank: testFinalRank + 1,
          placement: testFinalRank + 1
        },
        'TEST_COMBINED_RANKS_UPDATE'
      );

      // Test 3: Restore original values
      console.log('\n🧪 TEST 3: Restore original values');
      await trackedUpdate(
        testScore.id,
        this.eventId,
        {
          final_rank: testScore.final_rank,
          rank: testScore.rank,
          placement: testScore.placement
        },
        'TEST_RESTORE_VALUES'
      );

    } catch (error) {
      console.error('❌ Tracked update test failed:', error);
    }
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary() {
    console.log('\n📋 FINAL INVESTIGATION SUMMARY');
    console.log('='.repeat(80));
    
    // Print update summary
    printUpdateSummary();
    
    console.log('\n🎯 KEY FINDINGS:');
    console.log('-'.repeat(40));
    
    // Analyze test results
    if (this.testResults.error) {
      console.log('❌ CRITICAL: Investigation failed with error');
      console.log('   Error:', this.testResults.error.message);
    } else {
      console.log('✅ Investigation completed successfully');
    }
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('-'.repeat(40));
    console.log('1. Check the console logs above for specific error messages');
    console.log('2. Look for "🚨 FINDING:" messages that indicate root causes');
    console.log('3. Pay attention to verification results after updates');
    console.log('4. If monitoring is active, try re-scoring a competitor now');
    console.log('5. Run stopMonitoring() when done testing');
    
    console.log('\n📞 DIAGNOSTIC QUESTIONS:');
    console.log('-'.repeat(40));
    console.log('• Are final_rank updates failing at the database level?');
    console.log('• Are updates succeeding but not persisting?');
    console.log('• Are there RLS policies blocking the updates?');
    console.log('• Are database triggers interfering?');
    console.log('• Is the app logic not calling the update functions?');
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 INVESTIGATION COMPLETE - Review findings above');
    console.log('='.repeat(80));
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    if (this.monitorSubscription) {
      this.monitorSubscription.unsubscribe();
      console.log('🛑 Real-time monitoring stopped');
    }
  }

  /**
   * Get current test results
   */
  getResults() {
    return this.testResults;
  }
}

/**
 * Quick helper function to run investigation on current Traditional Forms event
 */
export async function investigateCurrentTraditionalFormsEvent() {
  console.log('🔍 Finding current Traditional Forms event...');
  
  try {
    // Find the most recent Traditional Forms event
    const { data: events, error } = await supabase
      .from('tournament_events')
      .select('id, event_name, tournament_id')
      .ilike('event_name', '%traditional%forms%')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !events || events.length === 0) {
      console.error('❌ No Traditional Forms events found');
      return;
    }
    
    const eventId = events[0].id;
    console.log('✅ Found Traditional Forms event:', events[0].event_name);
    console.log('   Event ID:', eventId);
    
    const testScript = new FinalRankTestScript(eventId);
    await testScript.runFullInvestigation();
    
    return testScript;
  } catch (error) {
    console.error('❌ Failed to investigate current event:', error);
  }
}
