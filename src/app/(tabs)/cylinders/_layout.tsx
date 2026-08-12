import { Stack } from 'expo-router';

export default function CylindersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="stock" />
      <Stack.Screen name="outstanding" />
      <Stack.Screen name="parties/index" />
      <Stack.Screen name="parties/[id]" />
    </Stack>
  );
}
