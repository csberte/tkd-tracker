  useEffect(() => {
    loadVideos();
  }, [championId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('source_id', championId);

      if (competitorError || !competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          uploaded_at,
          created_at,
          event_id,
          competitor_id,
          events!inner(id, name, tournament_id),
          tournaments!inner(id, name, date, class)
        `)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (videoError || !videoData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const { data: tournamentCompetitors } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .in('id', competitorIds);

      const eventIds = videoData.map(v => v.event_id).filter(Boolean);
      
      const { data: eventScores } = await supabase
        .from('event_scores')
        .select('event_id, tournament_competitor_id, final_rank, total_score, judge_a_score, judge_b_score, judge_c_score')
        .in('event_id', eventIds)
        .in('tournament_competitor_id', competitorIds);

      const formattedVideos = (videoData ?? []).map(video => {
        const eventScore = (eventScores ?? []).find(es => 
          es.event_id === video.event_id && 
          es.tournament_competitor_id === video.competitor_id
        );

        const competitorInfo = (tournamentCompetitors ?? []).find(tc => tc.id === video.competitor_id);
        
        const rank = eventScore?.final_rank;

        return {
          id: video.id,
          video_url: video.video_url,
          uploaded_at: video.uploaded_at,
          created_at: video.created_at || video.uploaded_at,
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          event_name: video.events?.name || 'Event',
          event_type: getEventTypeFromEventName(video.events?.name || ''),
          tournament_name: video.tournaments?.name || 'Tournament',
          tournament_class: video.tournaments?.class || '',
          tournament_date: video.tournaments?.date,
          competitor_name: competitorInfo?.name || 'Unknown',
          total_score: eventScore?.total_score,
          rank,
          points: eventScore?.total_score,
          judge_scores: eventScore && eventScore.judge_a_score != null && eventScore.judge_b_score != null && eventScore.judge_c_score != null ? {
            judge_a_score: eventScore.judge_a_score,
            judge_b_score: eventScore.judge_b_score,
            judge_c_score: eventScore.judge_c_score
          } : undefined
        };
      });

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedVideos = React.useMemo(() => {
    return sortVideos(videos, sortBy);
  }, [videos, sortBy]);

  const handleShare = async (video: Video) => {
    setSharing(video.id);
    
    try {
      if (!video.video_url) {
        Alert.alert('Error', 'No video URL available');
        return;
      }
      
      if (!video.event_id) {
        Alert.alert('Share Error', 'Missing event information.');
        return;
      }
      
      await shareVideoFixed({
        videoUrl: video.video_url,
        competitorName: video.competitor_name || 'Unknown',
        eventName: video.event_name || 'Event',
        tournamentName: video.tournament_name || 'Tournament',
        tournamentClass: video.tournament_class || '',
        judgeScores: video.judge_scores,
        totalScore: video.total_score,
        rank: video.rank,
        points: video.points,
        eventId: video.event_id,
        competitor: {
          id: video.competitor_id,
          tournament_competitor_id: video.competitor_id,
          name: video.competitor_name || 'Unknown'
        }
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  const handleWatch = (videoUrl: string) => {
    setSelectedVideo(videoUrl);
    setShowPlayer(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  if (sortedVideos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No videos found for this champion</Text>
      </View>
    );
  }

  const eventTypeGroups = sortedVideos.reduce((groups, video) => {
    const eventType = video.event_type || 'Unknown Event';
    if (!groups[eventType]) {
      groups[eventType] = [];
    }
    groups[eventType].push(video);
    return groups;
  }, {} as Record<string, Video[]>);

  return (
    <View style={styles.container}>
      <View style={styles.headerFixed}>
        <VideoSortDropdown
          sortBy={sortBy}
          onSortChange={setSortBy}
          showModal={showSortModal}
          setShowModal={setShowSortModal}
        />
        <Text style={styles.headerTitle}>Videos</Text>
        <View style={styles.placeholder} />
      </View>

      {Object.entries(eventTypeGroups).map(([eventType, eventVideos]) => (
        <CollapsibleVideoSection
          key={eventType}
          title={eventType}
          videos={eventVideos}
          onShare={handleShare}
          onWatch={handleWatch}
          sharing={sharing}
        />
      ))}
      
      <VideoPlayerModal
        visible={showPlayer}
        videoUrl={selectedVideo || ''}
        onClose={() => {
          setShowPlayer(false);
          setSelectedVideo(null);
        }}
      />
    </View>
  );
}

export default ChampionVideosUpdated;