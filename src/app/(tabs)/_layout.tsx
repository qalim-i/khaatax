import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { colors } from '@/constants/design-tokens';

function TabIcon(name: IconName) {
  // Named rather than returned anonymously so React DevTools and any error
  // boundary report "TabIcon(cylinders)" instead of a bare "Anonymous".
  function TabBarIcon({ color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Icon name={name} width={size} height={size} color={color as string} />;
  }
  TabBarIcon.displayName = `TabIcon(${name})`;
  return TabBarIcon;
}

/*
  56px had to hold icon + label + the gesture bar's inset, which squeezed the icons.
  The bar is now 64px of content plus whatever the device reserves at the bottom.

  Only `paddingBottom` is set, and only to the inset: react-navigation lays the icon
  and label out inside whatever vertical space the style leaves it, so any padding of
  our own is taken straight out of the label's box — on web that clipped the labels to
  a 7px sliver of a 12px font.
*/
const TAB_BAR_CONTENT_HEIGHT = 64;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
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
