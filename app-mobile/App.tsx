import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';

import AppNavigator from './src/navigation/AppNavigator';

WebBrowser.maybeCompleteAuthSession();

// Mostrar notificaciones push incluso cuando el app está en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#F89937" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#f0f4f8" />
      <AppNavigator />
    </NavigationContainer>
  );
}
