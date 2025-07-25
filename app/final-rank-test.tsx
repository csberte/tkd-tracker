import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { FinalRankTestScript, investigateCurrentTraditionalFormsEvent } from './lib/finalRankTestScript';
import { supabase } from './lib/supabase';

export default function FinalRankTestScreen() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [testScript, setTestScript] = useState<FinalRankTestScript | null>(null);
  const [results, setResults] = useState<string>('');
  const [manualEventId, setManualEventId] = useState<string>('');

  const runInvestigation = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResults('🚀 Starting investigation...\n');
    
    try {
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
      
      let script;
      
      if (manualEventId.trim()) {
        console.log(`🎯 Using manual event ID: ${manualEventId.trim()}`);
        script = new FinalRankTestScript(manualEventId.trim());
        await script.runFullInvestigation();
      } else {
        console.log('🔍 Auto-detecting Traditional Forms event...');
        script = await investigateCurrentTraditionalFormsEventEnhanced();
      }
      
      setTestScript(script || null);
      
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
      console.log('🔍 Fetching all scores for event:', manualEventId.trim());
      
      const { data: scores, error } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', manualEventId.trim())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching scores:', error);
        setResults(prev => prev + `\n❌ Error fetching scores: ${error.message}\n`);
        return;
      }
      
      console.log('📊 All scores for event:', JSON.stringify(scores, null, 2));
      setResults(prev => prev + `\n📊 Found ${scores?.length || 0} scores:\n${JSON.stringify(scores, null, 2)}\n`);
      
    } catch (error) {
      console.error('❌ Failed to fetch scores:', error);
      setResults(prev => prev + `\n❌ Failed to fetch scores: ${error}\n`);
    }
  };

  const stopMonitoring = () => {
    if (testScript) {
      testScript.stopMonitoring();
      setResults(prev => prev + '\n🛑 Monitoring stopped');
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
        Final Rank Investigation Tool
      </Text>
      
      <View style={{ marginBottom: 20 }}>
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
          placeholder="Enter Event ID manually (optional)"
          value={manualEventId}
          onChangeText={setManualEventId}
        />
        
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
            🧪 Show All Scores
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={stopMonitoring}
          disabled={!testScript}
          style={{
            backgroundColor: testScript ? '#FF3B30' : '#ccc',
            padding: 15,
            borderRadius: 8,
            marginBottom: 10
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🛑 Stop Monitoring
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#34C759',
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
          {results || '💡 Tap "Run Full Investigation" to start\n\nThis will:\n• Check database schema\n• Analyze current final_rank values\n• Test update permissions\n• Monitor real-time changes\n• Provide diagnostic summary\n\nAfter running, try re-scoring a competitor to see real-time monitoring in action.'}
        </Text>
      </View>
      
      <View style={{ marginTop: 20, padding: 15, backgroundColor: '#fff', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>📋 Instructions:</Text>
        <Text style={{ marginBottom: 5 }}>1. Enter an Event ID manually in the input field</Text>
        <Text style={{ marginBottom: 5 }}>2. Tap "Show All Scores" to see existing event_scores rows</Text>
        <Text style={{ marginBottom: 5 }}>3. Go score a competitor in that event</Text>
        <Text style={{ marginBottom: 5 }}>4. Return and tap "Show All Scores" again to verify the new score</Text>
        <Text style={{ color: '#666', fontStyle: 'italic' }}>This will help us identify if scores are being inserted properly.</Text>
      </View>
    </ScrollView>
  );
}

async function investigateCurrentTraditionalFormsEventEnhanced() {
  console.log('🔍 Finding current Traditional Forms event...');
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('user_id', user.id);
    
    if (tournamentsError) {
      console.error('❌ Failed to fetch tournaments:', tournamentsError);
      return;
    }
    
    if (!tournaments || tournaments.length === 0) {
      console.log('⚠️ No tournaments found for current user');
      return;
    }
    
    console.log(`✅ Found ${tournaments.length} tournaments for user`);
    const tournamentIds = tournaments.map(t => t.id);
    
    console.log('🔍 Searching for Traditional Forms events...');
    console.log('   Query: tournament_events WHERE tournament_id IN', tournamentIds);
    console.log('   Filter: event_type = "traditional_forms"');
    console.log('   Order: created_at DESC');
    
    const { data: events, error: eventsError } = await supabase
      .from('tournament_events')
      .select('id, event_name, tournament_id, event_type, created_at')
      .in('tournament_id', tournamentIds)
      .eq('event_type', 'traditional_forms')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('📊 Query results:', {
      error: eventsError,
      eventCount: events?.length || 0,
      events: events?.map(e => ({
        id: e.id,
        name: e.event_name,
        type: e.event_type,
        created: e.created_at
      }))
    });
    
    if (eventsError) {
      console.error('❌ Failed to fetch events:', eventsError);
      return;
    }
    
    if (!events || events.length === 0) {
      console.log('⚠️ No matching Traditional Forms event found. Try entering an event ID manually below.');
      return;
    }
    
    const eventId = events[0].id;
    console.log('✅ Found Traditional Forms event:', events[0].event_name);
    console.log('   Event ID:', eventId);
    console.log('   Tournament ID:', events[0].tournament_id);
    
    const testScript = new FinalRankTestScript(eventId);
    await testScript.runFullInvestigation();
    
    return testScript;
  } catch (error) {
    console.error('❌ Failed to investigate current event:', error);
  }
}