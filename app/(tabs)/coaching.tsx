import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function CoachingScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Coaching</Text>
        <Text style={styles.subheading}>Coming Soon — AI & Live Mentorship</Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>Personalized AI feedback on forms and sparring</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>One-on-one mentoring with certified coaches</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>Voice-over video reviews</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>Side-by-side technique analysis</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>Direct feedback on uploaded performances</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.featureText}>Custom training drills and improvement plans</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 18,
    color: '#FF0000',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 400,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  bullet: {
    fontSize: 16,
    color: '#FF0000',
    marginRight: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    lineHeight: 22,
  },
});