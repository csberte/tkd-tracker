import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { showAllScoresForEvent, investigateEventRanks } from './lib/debugHelpersFixed';
import { calculateAndUpdateRanks } from './lib/autoRankCalculator';
import { supabase } from './lib/supabase';

export default function FinalRankTestFixedScreen() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string>('');
  const [manualEventId, setManualEventId] = useState<string>('');

  const runInvestigation = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResults('🚀 Starting comprehensive investigation...\n');
    
    try {
      if (!manualEventId.trim()) {
        setResults(prev => prev + '⚠️ Please enter an Event ID first\n');
        return;
      }
      
      const originalLog = console.log;
      const originalError = console.error;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      console.error = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logOutput += '❌ ' + message + '\n';
        originalError(...args);
      };
      
      console.log(`🎯 Investigating event ID: ${manualEventId.trim()}`);
      await investigateEventRanks(manualEventId.trim());
      
      console.log = originalLog;
      console.error = originalError;
      
      setResults(logOutput);
      
    } catch (error) {
      setResults(prev => prev + `\n❌ Investigation failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const showAllScores = async () => {
    if (!manualEventId.trim()) {
      setResults(prev => prev + '\n⚠️ Please enter an Event ID first\n');
      return;
    }
    
    try {
      const scores = await showAllScoresForEvent(manualEventId.trim());
      setResults(prev => prev + `\n📊 Found ${scores?.length || 0} scores (including null ranks):\n${JSON.stringify(scores, null, 2)}\n`);
    } catch (error) {
      console.error('❌ Failed to fetch scores:', error);
      setResults(prev => prev + `\n❌ Failed to fetch scores: ${error}\n`);
    }
  };

  const recalculateRanks = async () => {
    if (!manualEventId.trim()) {
      setResults(prev => prev + '\n⚠️ Please enter an Event ID first\n');
      return;
    }
    
    setResults(prev => prev + '\n🏆 Manually recalculating ranks and points...\n');
    
    try {
      await calculateAndUpdateRanks(manualEventId.trim());
      setResults(prev => prev + '✅ Ranks and points recalculated successfully!\n');
      
      // Show updated scores
      setTimeout(async () => {
        const scores = await showAllScoresForEvent(manualEventId.trim());
        setResults(prev => prev + `\n📊 Updated scores:\n${JSON.stringify(scores, null, 2)}\n`);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to recalculate ranks:', error);
      setResults(prev => prev + `\n❌ Failed to recalculate ranks: ${error}\n`);
    }
  };

  const clearResults = () => {
    setResults('');
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          backgroundColor: '#666',
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
          alignSelf: 'flex-start'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>⬅ Back to Profile</Text>
      </TouchableOpacity>
      
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        Final Rank Investigation Tool (Fixed)
      </Text>
      
      <View style={{ marginBottom: 20 }}>
        <TextInput
          style={{
            backgroundColor: 'white',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ddd',
            marginBottom: 10,
            fontSize: 16
          }}
          placeholder="Enter Event ID manually"
          value={manualEventId}
          onChangeText={setManualEventId}
        />
        
        <TouchableOpacity
          onPress={runInvestigation}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#ccc' : '#007AFF',
            padding: 15,
            borderRadius: 8,
            marginBottom: 10
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            {isRunning ? '🔄 Running Investigation...' : '🚀 Run Full Investigation'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={showAllScores}
          style={{
            backgroundColor: '#FF9500',
            padding: 15,
            borderRadius: 8,
            marginBottom: 10
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🧪 Show All Scores (Including Null Ranks)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={recalculateRanks}
          style={{
            backgroundColor: '#34C759',
            padding: 15,
            borderRadius: 8,
            marginBottom: 10
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🏆 Recalculate Rankings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#666',
            padding: 15,
            borderRadius: 8
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🗑️ Clear Results
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={{
        backgroundColor: '#000',
        padding: 15,
        borderRadius: 8,
        minHeight: 400
      }}>
        <Text style={{ color: '#00FF00', fontFamily: 'monospace', fontSize: 12 }}>
          {results || '💡 Enter an Event ID and use the buttons above:\n\n• "Show All Scores" - View all event_scores rows (including null ranks)\n• "Run Full Investigation" - Comprehensive analysis\n• "Recalculate Rankings" - Manually trigger rank/points calculation\n\nThis will help identify why final_rank and points_earned are null.'}
        </Text>
      </View>
      
      <View style={{ marginTop: 20, padding: 15, backgroundColor: '#fff', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>📋 Fixed Debug Process:</Text>
        <Text style={{ marginBottom: 5 }}>1. Enter an Event ID in the input field</Text>
        <Text style={{ marginBottom: 5 }}>2. Tap "Show All Scores" to see existing rows (including null ranks)</Text>
        <Text style={{ marginBottom: 5 }}>3. If scores exist but have null final_rank, tap "Recalculate Rankings"</Text>
        <Text style={{ marginBottom: 5 }}>4. Verify ranks and points are now populated</Text>
        <Text style={{ color: '#666', fontStyle: 'italic' }}>The debug tools now show ALL scores, not just ranked ones.</Text>
      </View>
    </ScrollView>
  );
}
