import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ui';
import { useDeepLinkListener } from '@/lib/boot/deepLink';
import { BiometriaGate } from '@/lib/boot/biometriaGate';
import { reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import { applyDraculaWeb } from '@/lib/web/draculaPolish';
import '../global.css';

// Mantem a splash visivel ate as fontes carregarem.
SplashScreen.preventAutoHideAsync();

// Suprime warning de SafeAreaView vindo de dependencia transitiva.
// Migracao para react-native-safe-area-context ja foi feita no codigo
// proprio (ver Screen.tsx). Warning persiste por terceiros.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

// ADR-008: Dracula e identidade, nao tema selecionavel. Forcamos dark
// sempre em todas as plataformas.
// - tailwind.config.js darkMode='class' alinhado com setFlag.
// - Em RN nativo (Android/iOS), Appearance.setColorScheme('dark').
// - No Web, adicionamos a classe 'dark' no documentElement para o
//   CSS gerado pelo NativeWind aplicar as variantes dark:.
// Em Web o Appearance pode nao expor setColorScheme; usamos try/catch.
try {
  (StyleSheet as unknown as { setFlag?: (k: string, v: string) => void })
    .setFlag?.('darkMode', 'class');
  Appearance.setColorScheme?.('dark');
} catch {
  // Plataforma nao suporta uma das duas APIs (web).
}
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}
// Polish CSS adicional para Web (M00.6). Inerte em nativo. Roda
// uma unica vez na carga do bundle; applyDraculaWeb e idempotente.
applyDraculaWeb();

export default function RootLayout() {
  const [loaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Boot hook: registra listener de share intent (M00.5; M08 plugara
  // o fluxo real). Hook idempotente ao desmontar.
  useDeepLinkListener();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Boot hook: reagenda alarmes/limpeza/marcos auto/widget. M00.5
  // cria o orquestrador vazio; cada sprint dona faz BOOT_HOOKS.push
  // no proprio modulo.
  useEffect(() => {
    void reagendarTodosBootHooks();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BiometriaGate>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#282a36' },
            }}
          >
            {/* Rota modal raiz para o share intent receiver (M08). A
                activity de share abre direto aqui sem expor a Stack
                principal; cancelar/salvar usam router.dismissAll()
                para devolver foco ao app de origem. */}
            <Stack.Screen
              name="share-receive"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>
        </ToastProvider>
      </BiometriaGate>
    </GestureHandlerRootView>
  );
}
