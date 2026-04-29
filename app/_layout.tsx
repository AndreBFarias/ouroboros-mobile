import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ui';
import '../global.css';

// Mantem a splash visivel ate as fontes carregarem.
SplashScreen.preventAutoHideAsync();

// Suprime warning de SafeAreaView vindo de dependencia transitiva.
// Migracao para react-native-safe-area-context ja foi feita no codigo
// proprio (ver Screen.tsx). Warning persiste por terceiros.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function RootLayout() {
  const [loaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#282a36' },
          }}
        />
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
