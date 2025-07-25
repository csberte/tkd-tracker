// Helper function to determine placement display
export const getPlacementDisplay = (rank?: number): string => {
  if (!rank) return 'No placement';
  
  switch (rank) {
    case 1:
      return '🥇 First Place';
    case 2:
      return '🥈 Second Place';
    case 3:
      return '🥉 Third Place';
    default:
      return 'No placement';
  }
};

// Helper function to calculate placement from event scores
export const calculatePlacement = async (eventId: string, competitorId: string, supabase: any): Promise<number | undefined> => {
  try {
    // Get all scores for this event
    const { data: allScores, error } = await supabase
      .from('event_scores')
      .select('competitor_id, total_score')
      .eq('event_id', eventId)
      .not('total_score', 'is', null)
      .order('total_score', { ascending: false });

    if (error || !allScores) {
      console.error('Error fetching scores for placement:', error);
      return undefined;
    }

    // Find the competitor's rank
    const competitorIndex = allScores.findIndex(score => score.competitor_id === competitorId);
    
    if (competitorIndex === -1) {
      return undefined;
    }

    // Return rank (1-based)
    return competitorIndex + 1;
  } catch (error) {
    console.error('Error calculating placement:', error);
    return undefined;
  }
};