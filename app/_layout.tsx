import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Stack, useRouter, usePathname } from 'expo-router';
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
import { useAppPronto } from '@/lib/boot/useAppPronto';
import { registrarCategoriasAlarme } from '@/lib/services/notificationActions';
import { pedirPermissao as pedirPermissaoNotificacao } from '@/lib/services/alarmesNotificacoes';
import { applyDraculaWeb } from '@/lib/web/draculaPolish';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { useSessao } from '@/lib/stores/sessao';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { useUltimaRota, isRotaRestauravel } from '@/lib/hooks/useUltimaRota';
import { useBootStatus, selectBootPronto } from '@/lib/boot/useBootStatus';
import {
  inicializarVaultEscolhido,
  loadVaultRoot,
  pedirPermissaoStorage,
  sugestaoVaultUriDefault,
} from '@/lib/vault/permissions';
// M-GAUNTLET-DEAD-CODE-V2: imports diretos de @/lib/dev/gauntlet
// vazavam 5 markers no bytecode Hermes Android (__gauntlet,
// instalarGauntlet, useGaleriaMock, MODO_DEV_WEB, adicionarFotoMock).
// Substituidos por:
//   - MODO_DEV_WEB do micro-modulo gauntletAtivo (zero markers).
//   - bootstrap* do gauntletBootstrap (require lazy guardado por
//     __DEV__; Babel/Metro DCE elimina o branch em release).
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import {
  iniciarModoDev,
  sinalizarBootDev,
  registrarRouterDev,
  registrarPathnameDev,
} from '@/lib/dev/gauntletBootstrap';
import '../global.css';

// Mantem a splash visivel até as fontes carregarem.
SplashScreen.preventAutoHideAsync();

// Suprime warning de SafeAreaView vindo de dependencia transitiva.
// Migracao para react-native-safe-area-context já foi feita no código
// proprio (ver Screen.tsx). Warning persiste por terceiros.
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  // A28 (2026-05-06): suprime red box de autolinking RN para
  // modulos nativos que so existem em dev-client/release APK
  // (Expo Go tem set fixo de modulos pre-compilados). Wrappers
  // em src/lib/diario/transcribe.ts, src/lib/scanner/launch.ts,
  // src/lib/scanner/text-recognition.ts ja sao require lazy +
  // safe stubs; em Expo Go retornam erro gracioso quando a
  // funcao e chamada. O log ainda aparece via console.warn mas
  // sem dialog vermelho bloqueante.
  'Cannot find native module',
  'expo-notifications',
  'expo-av',
]);

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

  // M27.3: substitui o guard useRef do M27.1 por hook agregador
  // useAppPronto que combina useFonts + hidratacao das 3 stores
  // criticas (onboarding, vault, sessao) com latch em store global
  // (useBootStatus). Uma vez pronto, sempre pronto -- elimina o
  // residual de oscilacao em sessao fresh do Chrome dev quando
  // useFonts SDK 54 demora 30-60s e BiometriaGate/SessaoBootGate
  // disparam re-renders intermediarios.
  //
  // Mantemos a variavel local mostrarBootScreen com a mesma
  // semantica anterior (true = renderiza OuroborosLoader bloqueante)
  // para reduzir delta no JSX abaixo.
  const appPronto = useAppPronto({ fontesProntas: loaded });
  const mostrarBootScreen = !appPronto;

  // Boot hook: registra listener de share intent (M00.5; M08 plugara
  // o fluxo real). Hook idempotente ao desmontar.
  useDeepLinkListener();

  // M27.3: hideAsync idempotente. Spec exige UMA unica chamada.
  // Ref guard local ao componente; useFonts em SDK 54 web pode
  // oscilar e re-entregar loaded=true (ja documentado em M27.1).
  // O appPronto e o gatilho canonico de "tudo pronto" (fontes +
  // stores hidratadas), entao usamos ele como trigger principal.
  const splashEsconderRef = useRef<boolean>(false);
  useEffect(() => {
    if (!appPronto) return;
    if (splashEsconderRef.current) return;
    splashEsconderRef.current = true;
    SplashScreen.hideAsync();
    // Auditoria 2026-05-04: sinaliza boot completo para o
    // orquestrador via __gauntlet.aguardarBoot() / tempoDeBoot().
    if (MODO_DEV_WEB) sinalizarBootDev();
  }, [appPronto]);

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

  // M30: pedir permissao de notificacao proativamente apos onboarding.
  // useEffect DIRETO (nao BOOT_HOOKS) - decisao CONTRACT 7.9: falha
  // precisa propagar a UI via toast. Idempotente uma vez por instalacao
  // via useSessao.permissoesPedidas.notif. Em web no-op (pedirPermissao
  // ja retorna false silenciosamente). Renderizado dentro do provider
  // ToastProvider via PermissaoNotificacaoGate (precisa do hook
  // useToast); aqui o componente e montado abaixo no JSX.

  // M-GAUNTLET: em web + EXPO_PUBLIC_GAUNTLET=1, instala
  // window.__gauntlet com APIs JS deterministicas (seed, reset,
  // setNomes, abrir, abrirSheet, etc). Em mobile release, dead-code
  // (Platform.OS bloqueia MODO_DEV_WEB).
  useEffect(() => {
    if (MODO_DEV_WEB) iniciarModoDev();
  }, []);

  if (mostrarBootScreen) {
    // M25: enquanto JetBrainsMono carrega, mostra a marca animada em
    // fundo bg-page (Dracula). Substitui o `return null` antigo que
    // deixava a tela preta vazia. O loader vive dentro do early return
    // (CONTRACT secao 7.9: nao e BOOT_HOOK, e UI bloqueante visivel).
    // M27.1: usa flag persistente para evitar oscilacao de useFonts
    // em web (vide guard fontesPersistentementeCarregadas acima).
    // M-GAUNTLET: envolve em FrameMobileDev para que captura
    // visual respeite viewport mobile mesmo durante boot.
    return (
      <FrameMobileDev>
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
      </FrameMobileDev>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FrameMobileDev>
      <BiometriaGate bypass={MODO_DEV_WEB}>
        <ToastProvider>
          <OnboardingGuard />
          <VaultBootGate />
          <SessaoBootGate />
          <PermissaoNotificacaoGate />
          <PathnameSyncDev />
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
            {/* M-CAPTURA-UNIFICADA: rota modal de decisao entre
                "Registrar momento" e "Escanear documento". Mesmo
                padrao M26 (transparentModal + bg Dracula opaco)
                para mitigar Armadilha A18 (tela preta se sheet
                falha em expand). */}
            <Stack.Screen
              name="captura"
              options={{
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: '#14151a' },
                animation: 'fade_from_bottom',
              }}
            />
            {/* M36: rota modal /recap. Espelho otimista do Vault em
                periodo selecionavel. Apresentacao modal padrao (slide
                de baixo) com fundo opaco Dracula (#14151a) ja garantido
                pelo Screen e pelo contentStyle do Stack raiz. */}
            <Stack.Screen
              name="recap"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                contentStyle: { backgroundColor: '#14151a' },
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
      </FrameMobileDev>
    </GestureHandlerRootView>
  );
}

// M-GAUNTLET: em web + MODO_DEV_WEB, envolve toda a UI em um frame
// 412x892dp centralizado para que captura visual reflita celular real
// sem stretch desktop. Em mobile nativo (Platform.OS !== 'web') vira
// pass-through. Sem isto, validacao em Chrome desktop pega layout
// esticado e esconde bugs de overflow horizontal.
function FrameMobileDev({ children }: { children: React.ReactNode }) {
  if (!MODO_DEV_WEB) {
    return <>{children}</>;
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0a0e',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flex: 1,
          width: 412,
          maxWidth: 412,
          minHeight: 892,
          backgroundColor: colors.bgPage,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.bgElev,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

// A28 (2026-05-06): guard global para forcar /onboarding como rota
// raiz sempre que onboarding nao foi concluido. Sem este guard, em
// cenarios de Expo Go com expo-router state stale, share intent OEM
// ou deeplink residual, o app pode abrir direto em /share-receive
// ou outra rota -- gerando "Vault nao autorizado" e POP_TO_TOP error
// quando o usuario tenta voltar (Stack vazia). useEffect direto roda
// apos mount; idempotente via verificacao de pathname atual.
function OnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const onboardingDone = useOnboarding((s) => s.done);

  useEffect(() => {
    if (!onboardingHidratado) return;
    if (onboardingDone) return;
    // ja esta em onboarding ou em algum subpath dele -> nao redireciona.
    if (pathname?.startsWith('/onboarding')) return;
    router.replace('/onboarding');
  }, [onboardingHidratado, onboardingDone, pathname, router]);

  return null;
}

// M-GAUNTLET: sincroniza routerRef + pathnameRef do modulo gauntlet
// com o expo-router runtime. Sem isto, window.__gauntlet.abrir() nao
// tem como navegar (router so existe dentro de hooks). Componente
// inerte (return null) que so chama setters em useEffect. No-op em
// mobile real e em web sem flag.
function PathnameSyncDev() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!MODO_DEV_WEB) return;
    registrarRouterDev({
      replace: (rota: string) =>
        router.replace(rota as Parameters<typeof router.replace>[0]),
      push: (rota: string) =>
        router.push(rota as Parameters<typeof router.push>[0]),
    });
  }, [router]);
  useEffect(() => {
    if (!MODO_DEV_WEB) return;
    registrarPathnameDev(pathname ?? '/');
  }, [pathname]);
  return null;
}

// M30: gate de permissao de notificacao. Roda dentro do ToastProvider
// porque a falha precisa propagar a UI via toast (decisao CONTRACT
// secao 7.9: nao pode ser silenciado em BOOT_HOOKS). Idempotente uma
// vez por instalacao via useSessao.permissoesPedidas.notif.
//
// Logica:
//  1. Espera onboarding done E permissoesPedidas.notif === false.
//  2. Chama pedirPermissao() (no-op em web).
//  3. Marca via useSessao.marcarPermissaoPedida('notif') APOS request -
//     independente do resultado, para nao reciclar dialog do SO.
//  4. Em falha (granted === false), exibe toast informativo.
//
// useEffect direto (nao BOOT_HOOKS) garante que toast.show tenha o
// provider hidratado e o gate seja re-acionado se o usuario fechar e
// reabrir antes de hidratar onboarding.done (raro, mas defensivo).
function PermissaoNotificacaoGate() {
  const toast = useToast();
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const sessaoHidratada = useHasHydrated(useSessao);
  // Lock por mount: evita re-disparar se a hidratacao oscilar.
  const pedidoRef = useRef<boolean>(false);

  useEffect(() => {
    if (pedidoRef.current) return;
    if (!onboardingHidratado || !sessaoHidratada) return;
    const onboardingDone = useOnboarding.getState().done;
    if (!onboardingDone) return;
    const jaPedido = useSessao.getState().permissoesPedidas.notif;
    if (jaPedido) return;
    pedidoRef.current = true;
    void (async () => {
      let concedida = false;
      try {
        concedida = await pedirPermissaoNotificacao();
      } catch {
        concedida = false;
      }
      // Marca como pedida independente do resultado para nao tentar
      // de novo no proximo boot (pessoa ja decidiu, respeitar).
      try {
        useSessao.getState().marcarPermissaoPedida('notif');
      } catch {
        // Store sem hidratacao; ok, proximo boot tenta de novo.
      }
      if (!concedida) {
        toast.show(
          'Permita notificações em Configurações para receber alarmes.',
          'info'
        );
      }
    })();
    // toast captura snapshot uma unica vez na mount; segue padrao
    // de VaultBootGate.
  }, [onboardingHidratado, sessaoHidratada]);
  return null;
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
    // H3 (ADR-0022): a URI nao e mais hardcoded. Tentativa de
    // recuperacao em ordem:
    //   1. Le do SecureStore (pode estar persistida mas o store em
    //      memoria foi limpo).
    //   2. Cai na sugestao default (/sdcard/Documents/Ouroboros/) +
    //      pedido de permissao. Se o probe falhar, exibe toast e o
    //      usuario re-escolhe via Settings/Vault.
    (async () => {
      try {
        const persisted = await loadVaultRoot();
        if (persisted && persisted.trim().length > 0) {
          await inicializarVaultEscolhido(persisted);
          return;
        }
        await pedirPermissaoStorage();
        await inicializarVaultEscolhido(sugestaoVaultUriDefault());
      } catch {
        toast.show(
          'Não foi possível acessar a pasta do Vault. Verifique as permissões em Configurações.',
          'error'
        );
      }
    })();
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
//
// M27.4 (Caminho A -- latch persistente): le useBootStatus.pronto via
// selector estavel. Se o latch global ja virou true em algum momento
// anterior (boot completado em sessao previa do componente, ou em
// cenario gauntlet onde reset()+seed()+abrir() reciclam as 3 stores
// em sequencia rapida e o componente re-monta), tratamos como "ja
// restaurado" -- nao tentamos novo router.replace. Sem isto, a
// cascata `useHasHydrated` apos reset disparava re-render do efeito,
// e em conjunto com `useUltimaRota` (M24.1) gerava "Maximum update
// depth exceeded" em sequencia <2s. Documentado em M27.4-spec.md.
function SessaoBootGate() {
  const router = useRouter();
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const sessaoHidratada = useHasHydrated(useSessao);
  // M27.4: latch global -- uma vez bootstrapado, gate vira no-op.
  // Selector estavel evita re-subscribe a cada render.
  const bootPronto = useBootStatus(selectBootPronto);
  // Lock para garantir que o restore so acontece uma vez por mount.
  // Sem isso, useEffect re-disparado por mudanca de hidratacao
  // poderia tentar router.replace varias vezes.
  const restauradoRef = useRef<boolean>(false);

  // Atualiza ultima rota a cada navegacao. Usa pathname interno; nada
  // a fazer enquanto a sessao nao hidrata (evita gravar rota inicial
  // antes do restore).
  useUltimaRota();

  useEffect(() => {
    // M27.4 fast-path: latch global ja indica que o boot foi
    // concluido alguma vez. Nada a restaurar -- evita cascata em
    // reset()+seed()+abrir() do gauntlet.
    if (bootPronto && !restauradoRef.current) {
      restauradoRef.current = true;
      return;
    }
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
  }, [
    bootPronto,
    onboardingHidratado,
    vaultHidratado,
    sessaoHidratada,
    router,
  ]);

  return null;
}
