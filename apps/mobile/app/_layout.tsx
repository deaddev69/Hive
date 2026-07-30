import { Stack } from 'expo-router';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import '../global.css';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://benevolent-seahorse-336.convex.cloud';
const convex = new ConvexReactClient(convexUrl);

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ConvexProvider client={convex}>
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#ffffff' },
            }}
          />
        </View>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
