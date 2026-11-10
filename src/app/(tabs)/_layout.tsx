import { Tabs } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { FontFamily } from '@/constants/Typography';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 0.5,
            height: Spacing.tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontFamily: FontFamily.interMedium,
            fontSize: 10,
            letterSpacing: 0,
          },
          tabBarItemStyle: {
            paddingTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="house" color={color as string} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="list" color={color as string} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="chart" color={color as string} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="target" color={color as string} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="person" color={color as string} focused={focused} />
            ),
          }}
        />
      </Tabs>
  );
}
