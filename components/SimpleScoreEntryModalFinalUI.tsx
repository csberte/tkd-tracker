import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModalWrapper from './ModalWrapper';
import SyncingOverlay from './SyncingOverlay';

interface SimpleScoreEntryModalUIProps {
  visible: boolean;
  onClose: () => void;
  competitor: { name: string };
  judgeAScore: string;
  judgeBScore: string;
  judgeCScore: string;
  setJudgeAScore: (score: string) => void;
  setJudgeBScore: (score: string) => void;
  setJudgeCScore: (score: string) => void;
  judgeBRef: React.RefObject<TextInput>;
  judgeCRef: React.RefObject<TextInput>;
  handleScoreChange: (score: string, setter: (s: string) => void, nextRef?: React.RefObject<TextInput>) => void;
  canSave: boolean;
  saving: boolean;
  handleSave: () => void;
  syncingStatus: 'syncing' | 'failed' | null;
  handleRetry: () => void;
  handleCancelSync: () => void;
}

export default function SimpleScoreEntryModalUI({
  visible,
  onClose,
  competitor,
  judgeAScore,
  judgeBScore,
  judgeCScore,
  setJudgeAScore,
  setJudgeBScore,
  setJudgeCScore,
  judgeBRef,
  judgeCRef,
  handleScoreChange,
  canSave,
  saving,
  handleSave,
  syncingStatus,
  handleRetry,
  handleCancelSync
}: SimpleScoreEntryModalUIProps) {
  return (
    <>
      <ModalWrapper visible={visible} onClose={onClose}>
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, margin: 20, maxWidth: 400, width: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Score Entry</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>{competitor.name}</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge A</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  textAlign: 'center'
                }}
                value={judgeAScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeAScore, judgeBRef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
            
            <View style={{ flex: 1, marginHorizontal: 5 }}>
              <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge B</Text>
              <TextInput
                ref={judgeBRef}
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  textAlign: 'center'
                }}
                value={judgeBScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
            
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge C</Text>
              <TextInput
                ref={judgeCRef}
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  textAlign: 'center'
                }}
                value={judgeCScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeCScore)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#f0f0f0',
                padding: 15,
                borderRadius: 8,
                marginRight: 10
              }}
              onPress={onClose}
            >
              <Text style={{ textAlign: 'center', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: canSave ? '#007AFF' : '#ccc',
                padding: 15,
                borderRadius: 8,
                marginLeft: 10
              }}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={{ textAlign: 'center', fontSize: 16, color: 'white' }}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModalWrapper>
      
      <SyncingOverlay
        visible={syncingStatus !== null}
        status={syncingStatus || 'syncing'}
        onRetry={handleRetry}
        onCancel={handleCancelSync}
      />
    </>
  );
}