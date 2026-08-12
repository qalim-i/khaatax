import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { colors } from '@/constants/design-tokens';

function TabIcon(name: IconName) {
  return ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Icon name={name} width={size} height={size} color={color as string} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen name="cylinders" options={{ title: 'Cylinders', tabBarIcon: TabIcon('tank') }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses', tabBarIcon: TabIcon('card') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: TabIcon('more') }} />
    </Tabs>
  );
}
