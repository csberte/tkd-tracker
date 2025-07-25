export type SortOption = 'date' | 'tournament' | 'event' | 'competitor';

export interface VideoData {
  id: string;
  competitor_name: string;
  event_name: string;
  event_type: string;
  tournament_name: string;
  tournament_date: string;
  tournament_location: string;
  placement: number;
  total_score: number;
  video_url: string;
  created_at: string;
  competitor_id: string;
  event_id?: string;
}

export interface Competitor {
  id: string;
  name: string;
  avatar_url?: string;
}

export function sortVideos(videos: VideoData[], sortBy: SortOption): VideoData[] {
  return [...videos].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.tournament_date).getTime() - new Date(a.tournament_date).getTime();
      case 'tournament':
        return a.tournament_name.localeCompare(b.tournament_name);
      case 'event':
        return a.event_name.localeCompare(b.event_name);
      case 'competitor':
        return a.competitor_name.localeCompare(b.competitor_name);
      default:
        return 0;
    }
  });
}

export function filterVideos(
  videos: VideoData[],
  eventTypeFilter: string,
  competitorFilter: string
): VideoData[] {
  return videos.filter(video => {
    const eventTypeMatch = eventTypeFilter === 'all' || 
      video.event_type === eventTypeFilter;
    
    const competitorMatch = competitorFilter === 'all' || 
      video.competitor_id === competitorFilter;
    
    return eventTypeMatch && competitorMatch;
  });
}

export function getUniqueCompetitors(videos: VideoData[]): Competitor[] {
  const competitorMap = new Map<string, Competitor>();
  
  videos.forEach(video => {
    if (!competitorMap.has(video.competitor_id)) {
      competitorMap.set(video.competitor_id, {
        id: video.competitor_id,
        name: video.competitor_name,
        avatar_url: undefined // Will be populated from database if needed
      });
    }
  });
  
  return Array.from(competitorMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}

export function getEventTypeFromEventName(eventName: string): string {
  const lowerName = eventName.toLowerCase();
  
  if (lowerName.includes('traditional') && lowerName.includes('forms')) {
    return 'traditional_forms';
  }
  if (lowerName.includes('creative') && lowerName.includes('forms')) {
    return 'creative_forms';
  }
  if (lowerName.includes('extreme') && lowerName.includes('forms')) {
    return 'extreme_forms';
  }
  if (lowerName.includes('traditional') && lowerName.includes('weapons')) {
    return 'traditional_weapons';
  }
  if (lowerName.includes('creative') && lowerName.includes('weapons')) {
    return 'creative_weapons';
  }
  if (lowerName.includes('extreme') && lowerName.includes('weapons')) {
    return 'extreme_weapons';
  }
  if (lowerName.includes('traditional') && lowerName.includes('sparring')) {
    return 'traditional_sparring';
  }
  if (lowerName.includes('combat') && lowerName.includes('sparring')) {
    return 'combat_sparring';
  }
  
  return 'all';
}