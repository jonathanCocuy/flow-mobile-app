import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text variant="largeTitle" align="center">404</Text>
        <Text variant="body" color="gray" align="center" style={{ marginTop: 8 }}>
          This screen doesn't exist.
        </Text>
        <Link href="/" style={{ marginTop: 24 }}>
          <Text variant="headline" color="#007AFF">Go home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
