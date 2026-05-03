import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Appearance, LogBox, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OuroborosLoader } from '@/components/brand';
import { ToastProvider, useToast } from '@/components/ui';
import { MenuLateral } from '@/components/chrome/MenuLateral';
import { FABMenu } from '@/components/chrome/FABMenu';
import { colors } from '@/theme/tokens';
import { useDeepLinkListener } from '@/lib/boot/deepLink';
import { BiometriaGate } from '@/lib/boot/biometriaGate';
import { reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import { registrarCategoriasAlarme } from '@/lib/services/notificationActions';
import { applyDraculaWeb } from '@/lib/web/draculaPolish';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { useSessao } from '@/lib/stores/sessao';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { useUltimaRota, isRotaRestauravel } from '@/lib/hooks/useUltimaRota';
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

  // M27.1: guard contra useFonts oscilante em SDK 54 web. Em web, o
  // hook useFonts as vezes alterna loaded=true/false apos primeira
  // hidratacao quando o documento.fonts re-emite eventos, fazendo o
  // early-return abaixo re-montar o OuroborosLoader e causar piscar
  // de boot screen sobre a Home. Uma vez true, fica true para a
  // sessao toda (re-mount real do app passa pelo SplashScreen
  // novamente, separado).
  const fontesPersistentementeCarregadas = useRef(false);
  if (loaded) {
    fontesPersistentementeCarregadas.current = true;
  }
  const mostrarBootScreen =
    !loaded && !fontesPersistentementeCarregadas.current;

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

  if (mostrarBootScreen) {
    // M25: enquanto JetBrainsMono carrega, mostra a marca animada em
    // fundo bg-page (Dracula). Substitui o `return null` antigo que
    // deixava a tela preta vazia. O loader vive dentro do early return
    // (CONTRACT secao 7.9: nao e BOOT_HOOK, e UI bloqueante visivel).
    // M27.1: usa flag persistente para evitar oscilacao de useFonts
    // em web (vide guard fontesPersistentementeCarregadas acima).
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgPage,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <OuroborosLoader />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BiometriaGate>
        <ToastProvider>
          <VaultBootGate />
          <SessaoBootGate />
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
            {/* M26: 4 rotas modais raiz que abrem BottomSheet. Sao
                registradas com presentation='transparentModal' para que
                o root Stack (#282a36) nao vaze por baixo, e
                contentStyle.backgroundColor=#14151a (bgPage Dracula)
                forca fundo opaco. Combina com Screen padded={false}
                dentro de cada rota para eliminar a Armadilha A18
                (tela preta quando expand do sheet falha). */}
            <Stack.Screen
              name="humor-rapido"
              options={{
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: '#14151a' },
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="diario-emocional"
              options={{
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: '#14151a' },
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="eventos"
              options={{
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: '#14151a' },
                animation: 'fade_from_bottom',
              }}
            />
            <Stack.Screen
              name="scanner"
              options={{
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: '#14151a' },
                animation: 'fade_from_bottom',
              }}
            />
          </Stack>
          {/* M27: overlays globais. Ordem de zIndex declarada em
              CONTRACT secao 7.10 (Stack 0 -> FABMenu 10 ->
              MenuLateral 20 -> BiometriaGate 30 -> Toast 40).
              Renderizados FORA da Stack para sobrepor qualquer
              rota; FABMenu se auto-esconde em rotas modais via
              rotaEsconderFAB(usePathname()). */}
          <FABMenu />
          <MenuLateral />
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

// M24: gate de sessao. Espera as 3 stores (onboarding, vault, sessao)
// hidratarem do SecureStore e, em uma unica execucao, restaura a
// ultima rota visitada via router.replace - desde que essa rota nao
// seja modal e o onboarding esteja concluido. Em paralelo, mantem o
// ultimaRota atualizado a cada navegacao via useUltimaRota.
//
// Decisao CONTRACT secao 7.9: useEffect direto (nao BOOT_HOOKS)
// porque a logica precisa do router e da hidratacao multi-store; um
// hook idempotente em background desacoplaria do timing de boot.
function SessaoBootGate() {
  const router = useRouter();
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const sessaoHidratada = useHasHydrated(useSessao);
  // Lock para garantir que o restore so acontece uma vez por mount.
  // Sem isso, useEffect re-disparado por mudanca de hidratacao
  // poderia tentar router.replace varias vezes.
  const restauradoRef = useRef<boolean>(false);

  // Atualiza ultima rota a cada navegacao. Usa pathname interno; nada
  // a fazer enquanto a sessao nao hidrata (evita gravar rota inicial
  // antes do restore).
  useUltimaRota();

  useEffect(() => {
    if (restauradoRef.current) return;
    if (!onboardingHidratado || !vaultHidratado || !sessaoHidratada) return;
    restauradoRef.current = true;

    const onboardingDone = useOnboarding.getState().done;
    if (!onboardingDone) return;
    const vaultRoot = useVault.getState().vaultRoot;
    if (!vaultRoot) return;

    const ultimaRota = useSessao.getState().ultimaRota;
    if (!isRotaRestauravel(ultimaRota)) return;
    if (ultimaRota === null) return;

    // router.replace porque "boot na rota X" nao deve criar entrada de
    // historico que volte para a rota inicial. Cast porque expo-router
    // usa template literal types restritivas; o pathname guardado e
    // sempre devolvido pelo proprio router via usePathname(), entao
    // garantidamente valido em runtime.
    router.replace(ultimaRota as Parameters<typeof router.replace>[0]);
  }, [onboardingHidratado, vaultHidratado, sessaoHidratada, router]);

  return null;
}
