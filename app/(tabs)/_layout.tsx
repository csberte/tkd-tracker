import { Tabs } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { Redirect } from 'expo-router';
import { View, Text, Image, Dimensions } from 'react-native';
import { TabBarTutorial } from '../../components/TabBarTutorial';

const screenWidth = Dimensions.get('window').width;
const tabWidth = screenWidth / 6;

function TabIcon({ emoji, title, focused }: { emoji: string; title: string; focused: boolean }) {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
      minHeight: 60,
      width: tabWidth,
      flex: 1,
    }}>
      <Text style={{
        fontSize: 18,
        marginBottom: 2,
        lineHeight: 22,
      }}>
        {emoji}
      </Text>
      <Text style={{
        fontSize: 10,
        fontWeight: '500',
        color: focused ? '#FF0000' : '#666666',
        textAlign: 'center',
        lineHeight: 12,
        maxWidth: tabWidth - 4,
        numberOfLines: 1,
        flexShrink: 1,
      }} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function HeaderLogo() {
  return (
    <Image
      source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/681e5b2d35cc0b905d9e3244_1750460697260_d746c3c1.png' }}
      style={{ width: 28, height: 28, marginLeft: 12 }}
      resizeMode="contain"
    />
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <TabBarTutorial />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#FF0000',
          tabBarInactiveTintColor: '#666666',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            height: 80,
            paddingBottom: 10,
            paddingTop: 8,
            flexDirection: 'row',
            justifyContent: 'space-around',
          },
          tabBarShowLabel: false,
          tabBarScrollEnabled: false,
          headerStyle: {
            backgroundColor: '#FF0000',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" title="Home" focused={focused} />
            ),
            headerTitle: 'TaeKwonDo Tracker',
            headerLeft: () => <HeaderLogo />,
          }}
        />
        <Tabs.Screen
          name="tournaments"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏆" title="Tournaments" focused={focused} />
            ),
            headerTitle: 'Tournaments',
          }}
        />
        <Tabs.Screen
          name="competitors"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🧑‍🤝‍🧑" title="Competitors" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="videos"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🎥" title="Videos" focused={focused} />
            ),
            headerTitle: 'Videos',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👤" title="Profile" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="coaching"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🥋" title="Coaching" focused={focused} />
            ),
            headerTitle: 'Coaching',
          }}
        />
      </Tabs>
    </>
  );
}