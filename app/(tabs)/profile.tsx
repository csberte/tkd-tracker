import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Linking, Platform } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { useTutorial } from '../../components/TutorialProvider';
import ActionButton from '../../components/ActionButton';
import AnimatedTabScreen from '../../components/AnimatedTabScreen';
import BetaFeedbackButton from '../../components/BetaFeedbackButton';

export default function ProfileTab() {
  const { user, signOut } = useAuth();
  const { resetTutorialState } = useTutorial();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Feature coming soon!');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Feature coming soon!');
  };

  const handleResetTutorial = async () => {
    Alert.alert(
      'Reset Tutorial',
      'This will restart the tutorial immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await resetTutorialState();
            // Tutorial will restart immediately after reset
          }
        }
      ]
    );
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Support',
      'This will open your email app to contact us at chris@tkdtracker.com.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            const deviceInfo = Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
            const appVersion = '1.2.5';
            const subject = 'TKD Tracker App Support';
            const body = `App Version: ${appVersion}\nDevice: ${deviceInfo}\nPlease describe your issue or question here:`;
            const mailto = `mailto:chris@tkdtracker.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            Linking.openURL(mailto).catch(() => {
              Alert.alert('Error', 'Unable to open email app');
            });
          }
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About TaeKwonDo Tracker',
      'Version 1.2.5 (Beta)\n\nTrack your TaeKwonDo journey with tournaments, competitors, and events.'
    );
  };

  return (
    <AnimatedTabScreen direction="right">
      <ScrollView style={styles.container}>
        {/* Beta Feedback Button at the top */}
        <BetaFeedbackButton />
        
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/681e5b2d35cc0b905d9e3244_1750460697260_d746c3c1.png' }}
            style={{ width: 100, height: 100, alignSelf: 'center', marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>TKD Tournament Tracker</Text>
          <Text style={styles.version}>Version 1.2.5 (Beta)</Text>
          
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.email}>{user?.email || 'No email'}</Text>
            <Text style={styles.memberSince}>
              Member since {new Date().getFullYear()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <ActionButton 
            title="Edit Profile" 
            onPress={handleEditProfile}
            variant="secondary"
          />
          <ActionButton 
            title="Settings" 
            onPress={handleSettings}
            variant="secondary"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Champions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Tournaments</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <ActionButton 
            title="About" 
            onPress={handleAbout}
            variant="secondary"
          />
          <ActionButton 
            title="Reset Tutorial" 
            onPress={handleResetTutorial}
            variant="secondary"
          />
          <ActionButton 
            title="Contact Us" 
            onPress={handleContactUs}
            variant="secondary"
          />
        </View>

        <View style={styles.section}>
          <ActionButton 
            title="Sign Out" 
            onPress={handleSignOut}
            variant="danger"
          />
        </View>
      </ScrollView>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  userInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
});