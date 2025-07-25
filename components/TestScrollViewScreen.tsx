import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoManagementSection from './VideoManagementSection';

export default function TestScrollViewScreen() {
  const [scrollViewContentHeight, setScrollViewContentHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Mock data for testing
  const mockCompetitor = {
    id: 'test-competitor',
    name: 'Test Competitor',
    source_type: 'manual'
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'flex-start',
              paddingBottom: 300,
            }}
            onContentSizeChange={(width, height) => {
              setScrollViewContentHeight(height);
              console.log('SCREEN - Window height:', Dimensions.get('window').height);
              console.log('SCREEN - ScrollView content height:', height);
            }}
            onLayout={(event) => {
              console.log('SCREEN - ScrollView layout height:', event.nativeEvent.layout.height);
            }}
          >
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Test ScrollView Screen</Text>
              
              <Text style={{ fontSize: 18, marginBottom: 10 }}>Judge Scores</Text>
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text>Judge A</Text>
                  <View style={{ height: 40, backgroundColor: '#f0f0f0', borderRadius: 5 }} />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text>Judge B</Text>
                  <View style={{ height: 40, backgroundColor: '#f0f0f0', borderRadius: 5 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text>Judge C</Text>
                  <View style={{ height: 40, backgroundColor: '#f0f0f0', borderRadius: 5 }} />
                </View>
              </View>
              
              <VideoManagementSection 
                competitorId={mockCompetitor.id} 
                eventId="test-event"
                tournamentId="test-tournament" 
                scoreId="" 
                competitorName={mockCompetitor.name}
                eventName="Traditional Forms" 
                judgeScores={[8, 9, 7]}
                totalScore={24}
                rank={1} 
                competitor={mockCompetitor}
                event={{ name: 'Traditional Forms' }} 
                sortedCompetitors={[]} 
              />
              
              {/* Yellow test block with red border - LAST ELEMENT */}
              <View style={{ borderWidth: 2, borderColor: 'red' }}>
                <View style={{ height: 500, backgroundColor: 'yellow' }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}