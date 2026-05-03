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
import { ToastProvider, useToast } from '@/components/ui';
import { useDeepLinkListener } from '@/lib/boot/deepLink';
import { BiometriaGate } from '@/lib/boot/biometriaGate';
import { reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import { registrarCategoriasAlarme } from '@/lib/services/notificationActions';
import { applyDraculaWeb } from '@/lib/web/draculaPolish';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { inicializarVaultCanonico } from '@/lib/vault/permissions';
import '../global.css';

// Mantem a splash visivel até as fontes carregarem.
SplashScreen.preventAutoHideAsync();

// Suprime warning de SafeAreaView vindo de dependencia transitiva.
// Migracao para react-native-safe-area-context já foi feita no código
// proprio (ver Screen.tsx). Warning persiste por terceiros.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

// ADR-008: Dracula e identidade, não tema selecionavel. Forcamos dark
// sempre em todas as plataformas.
// - tailwind.config.js darkMode='class' alinhado com setFlag.
// - Em RN nativo (Android/iOS), Appearance.setColorScheme('dark').
// - No Web, adicionamos a classe 'dark' no documentElement para o
//   CSS gerado pelo NativeWind aplicar as variantes dark:.
// Em Web o Appearance pode não expor setColorScheme; usamos try/catch.
try {
  (StyleSheet as unknown as { setFlag?: (k: string, v: string) => void })
    .setFlag?.('darkMode', 'class');
  Appearance.setColorScheme?.('dark');
} catch {
  // Plataforma não suporta uma das duas APIs (web).
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

  // M16 categorias de notificação com action buttons (Soneca/Desligar).
  // Idempotente: chamar de novo sobrescreve a categoria com mesmo ID.
  // Roda uma vez no mount; em Web vira no-op.
  useEffect(() => {
    void registrarCategoriasAlarme();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BiometriaGate>
        <ToastProvider>
          <VaultBootGate />
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

// M22: gate critico de Vault. Roda dentro do ToastProvider porque o
// erro de permissao precisa propagar visualmente ao usuario (toast),
// nao pode ser silenciado em BOOT_HOOKS (vide CONTRACT secao 7.9).
// Reentra na inicializacao quando o usuario fecha o onboarding com
// done=true mas o vaultRoot ainda esta null - cobre o caso de o
// usuario apagar a pasta no file manager entre sessoes.
function VaultBootGate() {
  const toast = useToast();
  useEffect(() => {
    const onboardingDone = useOnboarding.getState().done;
    const vaultRoot = useVault.getState().vaultRoot;
    if (!onboardingDone || vaultRoot) return;
    inicializarVaultCanonico().catch(() => {
      toast.show(
        'Não foi possível acessar a pasta do Vault. Verifique as permissões em Configurações.',
        'error'
      );
    });
    // toast trocaria identidade entre renders; usamos snapshot via
    // useEffect uma unica vez na mount do gate. Plugin react-hooks
    // nao habilitado no eslint config do projeto.
  }, []);
  return null;
}
