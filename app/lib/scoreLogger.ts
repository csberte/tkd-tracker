import { supabase } from './supabase';

/**
 * Enhanced logging for score save operations
 */
export const saveScoreToDatabase = async (
  tournamentId: string,
  eventId: string,
  competitorId: string,
  judgeAScore: number,
  judgeBScore: number,
  judgeCScore: number
) => {
  const totalScore = judgeAScore + judgeBScore + judgeCScore;
  
  console.log('🎯 [SCORE_SAVE] Starting score save process');
  console.log('   Competitor ID:', competitorId);
  console.log('   Tournament ID:', tournamentId);
  console.log('   Event ID:', eventId);
  console.log('   Scores:', { judgeA: judgeAScore, judgeB: judgeBScore, judgeC: judgeCScore });
  console.log('   Total Score:', totalScore);
  
  const scoreData = {
    tournament_id: tournamentId,
    event_id: eventId,
    tournament_competitor_id: competitorId,
    score_1: judgeAScore,
    score_2: judgeBScore,
    score_3: judgeCScore,
    final_score: totalScore,
    judge_a_score: judgeAScore,
    judge_b_score: judgeBScore,
    judge_c_score: judgeCScore,
    total_score: totalScore,
    rank: 0,
    final_rank: 0,
    placement: null,
    medal: null
  };
  
  console.log('🎯 [SCORE_SAVE] Inserting score data:', scoreData);
  
  const { data: insertResult, error: insertError } = await supabase
    .from('event_scores')
    .insert(scoreData)
    .select();
  
  if (insertError) {
    console.error('❌ [SCORE_SAVE] Insert failed:', insertError);
    console.error('   Error details:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    });
    throw insertError;
  }
  
  console.log('✅ [SCORE_SAVE] Score inserted successfully:', insertResult);
  
  // Verify the insert by querying back
  const { data: verifyData, error: verifyError } = await supabase
    .from('event_scores')
    .select('*')
    .eq('event_id', eventId)
    .eq('tournament_competitor_id', competitorId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (verifyError) {
    console.error('⚠️ [SCORE_SAVE] Verification query failed:', verifyError);
  } else {
    console.log('✅ [SCORE_SAVE] Verification successful:', verifyData);
  }
  
  return insertResult;
};