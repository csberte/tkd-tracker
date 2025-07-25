import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TestModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TestModal({ visible, onClose }: TestModalProps) {
  const [scrollViewContentHeight, setScrollViewContentHeight] = useState(0);
  
  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 160 }}
            onContentSizeChange={(width, height) => {
              setScrollViewContentHeight(height);
              console.log('MODAL - Window height:', Dimensions.get('window').height);
              console.log('MODAL - ScrollView content height:', height);
            }}
            onLayout={(event) => {
              console.log('MODAL - ScrollView layout height:', event.nativeEvent.layout.height);
              console.log('MODAL - Modal container height:', event.nativeEvent.layout.height);
            }}
          >
            <View style={{ padding: 10, backgroundColor: 'orange' }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Platform: {Platform.OS}
              </Text>
            </View>
            
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Test Modal</Text>
              
              <Text style={{ fontSize: 16, marginBottom: 8 }}>This is a test modal to verify layout structure.</Text>
              
              <View style={{ height: 200, backgroundColor: '#f0f0f0', marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Placeholder Content Area</Text>
              </View>
              
              <View style={{ height: 200, backgroundColor: '#e0e0e0', marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
                <Text>More Content</Text>
              </View>
              
              <View style={{ height: 200, backgroundColor: '#d0d0d0', marginBottom: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Even More Content</Text>
              </View>
              
              {/* Yellow test block with red border - LAST ELEMENT */}
              <View style={{ borderWidth: 2, borderColor: 'red' }}>
                <View style={{ height: 500, backgroundColor: 'yellow' }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}