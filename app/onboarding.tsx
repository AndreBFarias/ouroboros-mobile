// Onboarding inicial em 5 frames (J1 / M-ONBOARDING-PERMISSOES).
// Versoes anteriores: 3 frames (M23) -> 4 frames (H3, ADR-0022).
// J1 introduz seletor de sexo no Frame 0/1 e novo Frame 3
// "Permissoes" entre Pasta (antigo Frame 2) e "Tudo pronto"
// (antigo Frame 3, agora Frame 4).
//
// Frame 0: Como voce se chama? + foto + sexo (pessoa_a)
// Frame 1: Mais alguem usa? (companhia + nome/foto/sexo da pessoa_b
//          quando duo)
// Frame 2: Onde salvar? (sugestao Documents/Ouroboros vs SAF picker)
// Frame 3: Permissoes (4 toggles: camera/microfone/notificacoes/
//          localizacao). Continuar pede cada toggle ON em sequencia.
// Frame 4: Tudo pronto, <nome>. Mostra resumo "N permissoes
//          concedidas".
//
// Storage e implicito em Frame 2 (caminho A pede pedirPermissaoStorage,
// caminho B abre SAF picker). Outras 4 permissoes sao opt-in com
// defaults sensatos: camera/microfone/notificacoes ON, localizacao OFF.
//
// Decisao M03: Sentence case + acentuacao PT-BR completa nas strings
// de UI. accessibilityLabel sem acento. Comentarios sem acento
// (convencao shell).
//
// A28: animacao do FrameAnim usa Reanimated puro (Animated.View +
// useSharedValue + withSpring) em vez de moti porque moti+Reanimated 4
// emite transform como string em frames iniciais e crasha New Arch
// (Fabric) com ClassCastException.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Check } from '@/lib/icons';
import { OuroborosLoader } from '@/components/brand';
import {
  AvatarPicker,
  Button,
  ChipGroup,
  Input,
  Screen,
  Toggle,
  useToast,
} from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { hexToRgba } from '@/lib/a11y/contraste';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  useOnboarding,
  type SexoDeclarado,
  type TipoCompanhia,
} from '@/lib/stores/onboarding';
import {
  inicializarVaultEscolhido,
  pedirPermissaoStorage,
  requestVaultPermission,
  sugestaoVaultPathDefault,
  sugestaoVaultUriDefault,
} from '@/lib/vault';
import {
  requestCameraPermission,
  requestLocalizacaoPermission,
  requestMicrofonePermission,
  requestNotificacoesPermission,
} from '@/lib/permissoes/requestOnboarding';

type FrameId = 0 | 1 | 2 | 3 | 4;

const SEXO_OPTIONS: ReadonlyArray<{ value: NonNullable<SexoDeclarado>; label: string }> = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'nao-binario', label: 'Não-binário' },
  { value: 'prefiro-nao-dizer', label: 'Prefiro não dizer' },
];

export default function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const setNome = usePessoa((s) => s.setNome);
  const nomeA = usePessoa((s) => s.nomes.pessoa_a);
  const nomeB = usePessoa((s) => s.nomes.pessoa_b);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  const setTipoCompanhia = useOnboarding((s) => s.setTipoCompanhia);
  const sexoDeclarado = useOnboarding((s) => s.sexoDeclarado);
  const setSexoDeclarado = useOnboarding((s) => s.setSexoDeclarado);
  const permissoes = useOnboarding((s) => s.permissoes);
  const setPermissao = useOnboarding((s) => s.setPermissao);
  const marcarConcluido = useOnboarding((s) => s.marcarConcluido);

  const [frame, setFrame] = useState<FrameId>(0);
  const [nomeInput, setNomeInput] = useState('');
  const [duo, setDuo] = useState<boolean | null>(null);
  const [nomeBInput, setNomeBInput] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [escolhendoPasta, setEscolhendoPasta] = useState(false);
  const [pedindoPermissoes, setPedindoPermissoes] = useState(false);

  // Toggles locais do Frame 3 antes de chamar request*. Defaults
  // canonicos: camera/microfone/notificacoes ON, localizacao OFF.
  const [togCamera, setTogCamera] = useState(true);
  const [togMicrofone, setTogMicrofone] = useState(true);
  const [togNotificacoes, setTogNotificacoes] = useState(true);
  const [togLocalizacao, setTogLocalizacao] = useState(false);

  const avancar = () =>
    setFrame((f) => (f >= 4 ? 4 : ((f + 1) as FrameId)));

  const handleFrame0 = () => {
    const nome = nomeInput.trim();
    if (nome.length < 1) {
      toast.show('Por favor, digite um nome.', 'error');
      return;
    }
    if (sexoDeclarado.pessoa_a === null) {
      toast.show('Escolha uma das opções de sexo.', 'error');
      return;
    }
    setNome('pessoa_a', nome);
    avancar();
  };

  const handleFrame1 = () => {
    if (duo === null) {
      toast.show('Escolha uma das opções.', 'error');
      return;
    }
    if (duo) {
      if (!tipoSelecionado) {
        toast.show('Vocês são casal ou amigos?', 'error');
        return;
      }
      const nome = nomeBInput.trim();
      if (nome.length < 1) {
        toast.show('Por favor, digite o nome da segunda pessoa.', 'error');
        return;
      }
      if (sexoDeclarado.pessoa_b === null) {
        toast.show('Escolha o sexo da segunda pessoa.', 'error');
        return;
      }
      setNome('pessoa_b', nome);
    } else {
      setTipoCompanhia('sozinho');
    }
    avancar();
  };

  // Caminho A do Frame 2 (V4.0.2): usuario aceitou a sugestao
  // /sdcard/Documents/Ouroboros/. Tenta inicializar direto; se falhar
  // por permissao, abre tela de configuracoes e aguarda usuario voltar
  // com MANAGE_EXTERNAL_STORAGE concedido; depois retry.
  const handleUsarSugestao = async () => {
    if (escolhendoPasta) return;
    setEscolhendoPasta(true);
    try {
      // 1a tentativa: pode ja ter permissao concedida.
      try {
        await inicializarVaultEscolhido(sugestaoVaultUriDefault());
        setPermissao('storage', true);
        avancar();
        return;
      } catch {
        // Probe falhou: assumimos falta de permissao.
      }
      // Pede permissao bloqueante (espera retorno do usuario).
      const granted = await pedirPermissaoStorage();
      if (!granted) {
        toast.show(
          'Permissão necessária. Toque "Permitir gerenciar todos os arquivos" e volte.',
          'error'
        );
        return;
      }
      // 2a tentativa apos grant.
      await inicializarVaultEscolhido(sugestaoVaultUriDefault());
      setPermissao('storage', true);
      avancar();
    } catch {
      toast.show(
        'Não foi possível usar essa pasta. Tente "Outra pasta".',
        'error'
      );
    } finally {
      setEscolhendoPasta(false);
    }
  };

  // Caminho B do Frame 2 (V4.0.2): usuario escolheu "Outra pasta" via
  // SAF picker. requestVaultPermission abre o picker; converte tree
  // URI para file:// equivalente; garante MANAGE concedido; entao
  // inicializa.
  const handleEscolherOutra = async () => {
    if (escolhendoPasta) return;
    setEscolhendoPasta(true);
    try {
      const fileUri = await requestVaultPermission();
      if (!fileUri) {
        // Cancelou ou volume secundario nao suportado.
        toast.show(
          'Pasta não suportada. Use uma pasta no armazenamento principal.',
          'error'
        );
        return;
      }
      // Garante MANAGE concedido (necessario para writes file://).
      const granted = await pedirPermissaoStorage();
      if (!granted) {
        toast.show(
          'Permissão necessária. Toque "Permitir gerenciar todos os arquivos" e volte.',
          'error'
        );
        return;
      }
      await inicializarVaultEscolhido(fileUri);
      setPermissao('storage', true);
      avancar();
    } catch {
      toast.show(
        'Não foi possível usar essa pasta. Tente novamente.',
        'error'
      );
    } finally {
      setEscolhendoPasta(false);
    }
  };

  // Continuar do Frame 3: para cada toggle ON, chama o request
  // correspondente em sequencia (camera -> microfone -> notif ->
  // location). Persiste cada resultado em useOnboarding.permissoes.
  // Toggle OFF persiste false direto (usuario escolheu nao pedir).
  const handlePermissoes = async () => {
    if (pedindoPermissoes) return;
    setPedindoPermissoes(true);
    try {
      if (togCamera) {
        const ok = await requestCameraPermission();
        setPermissao('camera', ok);
      } else {
        setPermissao('camera', false);
      }
      if (togMicrofone) {
        const ok = await requestMicrofonePermission();
        setPermissao('microfone', ok);
      } else {
        setPermissao('microfone', false);
      }
      if (togNotificacoes) {
        const ok = await requestNotificacoesPermission();
        setPermissao('notificacoes', ok);
      } else {
        setPermissao('notificacoes', false);
      }
      if (togLocalizacao) {
        const ok = await requestLocalizacaoPermission();
        setPermissao('localizacao', ok);
      } else {
        setPermissao('localizacao', false);
      }
      avancar();
    } finally {
      setPedindoPermissoes(false);
    }
  };

  const handleConcluir = async () => {
    if (iniciando) return;
    setIniciando(true);
    try {
      marcarConcluido();
      router.replace('/');
    } finally {
      setIniciando(false);
    }
  };

  // Resumo "N permissoes concedidas" no Frame final. Conta storage
  // + camera + microfone + notificacoes + localizacao (max 5).
  const permissoesConcedidas =
    (permissoes.storage ? 1 : 0) +
    (permissoes.camera ? 1 : 0) +
    (permissoes.microfone ? 1 : 0) +
    (permissoes.notificacoes ? 1 : 0) +
    (permissoes.localizacao ? 1 : 0);

  // Renderiza apenas o frame ativo. ScrollView envolve o conteudo
  // para caber forms longos.
  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.xl }}>
        <Indicador frameAtivo={frame} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: spacing.xl,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FrameAnim frameKey={frame}>
            {frame === 0 && (
              <Frame0
                nome={nomeInput}
                onChange={setNomeInput}
                sexo={sexoDeclarado.pessoa_a}
                onSexoChange={(next) => setSexoDeclarado('pessoa_a', next)}
                onContinue={handleFrame0}
              />
            )}
            {frame === 1 && (
              <Frame1
                duo={duo}
                setDuo={setDuo}
                tipoCompanhia={tipoCompanhia}
                setTipo={(t) => {
                  setTipoCompanhia(t);
                  setTipoSelecionado(true);
                }}
                nomeB={nomeBInput}
                setNomeB={setNomeBInput}
                sexoB={sexoDeclarado.pessoa_b}
                onSexoBChange={(next) => setSexoDeclarado('pessoa_b', next)}
                onContinue={handleFrame1}
              />
            )}
            {frame === 2 && (
              <Frame2
                ocupado={escolhendoPasta}
                onUsarSugestao={handleUsarSugestao}
                onEscolherOutra={handleEscolherOutra}
              />
            )}
            {frame === 3 && (
              <Frame3Permissoes
                togCamera={togCamera}
                togMicrofone={togMicrofone}
                togNotificacoes={togNotificacoes}
                togLocalizacao={togLocalizacao}
                setTogCamera={setTogCamera}
                setTogMicrofone={setTogMicrofone}
                setTogNotificacoes={setTogNotificacoes}
                setTogLocalizacao={setTogLocalizacao}
                ocupado={pedindoPermissoes}
                onContinue={handlePermissoes}
              />
            )}
            {frame === 4 && (
              <Frame4
                nomeA={nomeA}
                nomeB={duo ? nomeB : null}
                permissoesConcedidas={permissoesConcedidas}
                iniciando={iniciando}
                onConcluir={handleConcluir}
              />
            )}
          </FrameAnim>
        </ScrollView>
      </View>
    </Screen>
  );
}

function Indicador({ frameAtivo }: { frameAtivo: FrameId }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        alignSelf: 'center',
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 28,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= frameAtivo ? colors.purple : colors.bgElev,
          }}
        />
      ))}
    </View>
  );
}

// Anima cada troca de frame: o `frameKey` na key forca remontagem,
// e o Animated.View entra de translateX 60 + opacity 0 para 0 / 1
// com spring. Sem exit para evitar janela branca. A28: Reanimated
// puro em vez de MotiView para compatibilidade New Arch (Fabric).
function FrameAnim({
  frameKey,
  children,
}: {
  frameKey: FrameId;
  children: ReactNode;
}) {
  const translateX = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withSpring(1, { damping: 18, stiffness: 200 });
  }, [frameKey, translateX, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View key={frameKey} style={style}>
      {children}
    </Animated.View>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.fg,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 22,
        lineHeight: 30,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </Text>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 13,
        lineHeight: 22,
        marginBottom: spacing.xl,
      }}
    >
      {children}
    </Text>
  );
}

function MicroOrange({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.orange,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 12,
        lineHeight: 18,
        letterSpacing: 0.4,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

interface SeletorSexoProps {
  valor: SexoDeclarado;
  onChange: (next: SexoDeclarado) => void;
  pessoa: 'pessoa_a' | 'pessoa_b';
}

function SeletorSexo({ valor, onChange, pessoa }: SeletorSexoProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
        }}
      >
        Sexo
      </Text>
      <ChipGroup
        mode="single"
        value={valor}
        onChange={(next) => {
          if (next === null) {
            onChange(null);
            return;
          }
          if (
            next === 'masculino' ||
            next === 'feminino' ||
            next === 'nao-binario' ||
            next === 'prefiro-nao-dizer'
          ) {
            onChange(next);
          }
        }}
        options={SEXO_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          accent: pessoa === 'pessoa_a' ? 'purple' : 'pink',
        }))}
      />
    </View>
  );
}

interface Frame0Props {
  nome: string;
  onChange: (next: string) => void;
  sexo: SexoDeclarado;
  onSexoChange: (next: SexoDeclarado) => void;
  onContinue: () => void;
}

function Frame0({ nome, onChange, sexo, onSexoChange, onContinue }: Frame0Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Antes de começar</MicroOrange>
      <Heading>Como você se chama?</Heading>
      <Sub>
        Esse nome e a foto aparecem nos seus registros e no cabeçalho
        da tela inicial. Você pode trocar depois nos ajustes.
      </Sub>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <AvatarPicker pessoa="pessoa_a" size={96} />
      </View>
      <Input
        value={nome}
        onChangeText={onChange}
        placeholder="Seu nome"
        accessibilityLabel="campo nome"
      />
      <SeletorSexo valor={sexo} onChange={onSexoChange} pessoa="pessoa_a" />
      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} />
    </View>
  );
}

interface Frame1Props {
  duo: boolean | null;
  setDuo: (v: boolean) => void;
  tipoCompanhia: TipoCompanhia;
  setTipo: (t: TipoCompanhia) => void;
  nomeB: string;
  setNomeB: (next: string) => void;
  sexoB: SexoDeclarado;
  onSexoBChange: (next: SexoDeclarado) => void;
  onContinue: () => void;
}

function Frame1({
  duo,
  setDuo,
  tipoCompanhia,
  setTipo,
  nomeB,
  setNomeB,
  sexoB,
  onSexoBChange,
  onContinue,
}: Frame1Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Companhia</MicroOrange>
      <Heading>Mais alguém usa este Vault com você?</Heading>
      <Sub>
        Você pode usar sozinho. Se for compartilhar, tudo o que vocês
        registrarem aparece para os dois.
      </Sub>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <CardEscolha
            ativo={duo === false}
            label="Sozinho"
            onPress={() => setDuo(false)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CardEscolha
            ativo={duo === true}
            label="Com mais alguém"
            onPress={() => setDuo(true)}
          />
        </View>
      </View>

      {duo === true ? (
        <Frame1Expand
          tipoCompanhia={tipoCompanhia}
          setTipo={setTipo}
          nomeB={nomeB}
          setNomeB={setNomeB}
          sexoB={sexoB}
          onSexoBChange={onSexoBChange}
        />
      ) : null}

      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} />
    </View>
  );
}

// Extraido para componente proprio para usar useSharedValue +
// useAnimatedStyle (hooks nao podem condicionalmente rodar dentro
// de Frame1). Anima opacidade e translateY ao mount com spring.
function Frame1Expand({
  tipoCompanhia,
  setTipo,
  nomeB,
  setNomeB,
  sexoB,
  onSexoBChange,
}: {
  tipoCompanhia: TipoCompanhia;
  setTipo: (t: TipoCompanhia) => void;
  nomeB: string;
  setNomeB: (next: string) => void;
  sexoB: SexoDeclarado;
  onSexoBChange: (next: SexoDeclarado) => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 18, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, { gap: spacing.md }]}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          marginTop: spacing.md,
        }}
      >
        Vocês são…
      </Text>
      <ChipGroup
        mode="single"
        value={tipoCompanhia === 'sozinho' ? null : tipoCompanhia}
        onChange={(next) => {
          if (next === 'casal' || next === 'amigos') setTipo(next);
        }}
        options={[
          { value: 'casal', label: 'Casal', accent: 'purple' },
          { value: 'amigos', label: 'Amigos', accent: 'cyan' },
        ]}
      />
      <Input
        value={nomeB}
        onChangeText={setNomeB}
        placeholder="Como ela ou ele se chama?"
        accessibilityLabel="campo nome segunda pessoa"
      />
      <View style={{ alignItems: 'center', marginTop: spacing.md }}>
        <AvatarPicker pessoa="pessoa_b" size={96} />
      </View>
      <SeletorSexo valor={sexoB} onChange={onSexoBChange} pessoa="pessoa_b" />
    </Animated.View>
  );
}

interface CardEscolhaProps {
  ativo: boolean;
  label: string;
  onPress: () => void;
}

// W1 (M-AUDIT-VISUAL-WARNS): outline 1px bgElev em default, fundo
// purple30 + borda purple em selected. Padroniza affordance com
// chips do Frame 0 (ChipGroup) sem alterar o componente Card global.
function CardEscolha({ ativo, label, onPress }: CardEscolhaProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`escolher ${label.toLowerCase()}`}
      accessibilityState={{ selected: ativo }}
    >
      <View
        style={{
          backgroundColor: ativo ? hexToRgba(colors.purple, 0.3) : colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.base,
          borderWidth: 1,
          borderColor: ativo ? colors.purple : colors.bgElev,
          minHeight: 80,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: ativo ? colors.purple : colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

interface Frame2Props {
  ocupado: boolean;
  onUsarSugestao: () => void;
  onEscolherOutra: () => void;
}

// Frame 2 (H3, ADR-0022): pergunta onde salvar os dados. Dois cards
// empilhados verticalmente, cada um com titulo + descricao + botao.
// Ocupado bloqueia ambos enquanto a permissao/SAF picker esta em
// andamento.
function Frame2({
  ocupado,
  onUsarSugestao,
  onEscolherOutra,
}: Frame2Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Pasta do Vault</MicroOrange>
      <Heading>Onde salvar seus dados?</Heading>
      <Sub>
        Tudo o que você registrar fica em arquivos de texto numa pasta
        do seu celular. Você decide onde.
      </Sub>

      <CardPasta
        titulo="Sugestão: Documents/Ouroboros"
        descricao="Pasta dedicada visível no seu file manager. Fácil de sincronizar com Obsidian ou Syncthing."
        path={sugestaoVaultPathDefault()}
        botaoLabel="Usar essa"
        accessibilityLabel="usar sugestao documents ouroboros"
        onPress={onUsarSugestao}
        ocupado={ocupado}
      />

      <CardPasta
        titulo="Outra pasta"
        descricao="Escolher manualmente onde salvar (por exemplo, a pasta de outro Vault Obsidian que você já usa)."
        botaoLabel="Escolher"
        accessibilityLabel="escolher outra pasta"
        onPress={onEscolherOutra}
        ocupado={ocupado}
      />
    </View>
  );
}

interface CardPastaProps {
  titulo: string;
  descricao: string;
  path?: string;
  botaoLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
  ocupado: boolean;
}

function CardPasta({
  titulo,
  descricao,
  path,
  botaoLabel,
  accessibilityLabel,
  onPress,
  ocupado,
}: CardPastaProps) {
  return (
    <View
      accessibilityLabel={`card ${accessibilityLabel}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 16,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {titulo}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 22,
        }}
      >
        {descricao}
      </Text>
      {path ? (
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {path}
        </Text>
      ) : null}
      <Button
        label={botaoLabel}
        onPress={onPress}
        disabled={ocupado}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

interface Frame3PermissoesProps {
  togCamera: boolean;
  togMicrofone: boolean;
  togNotificacoes: boolean;
  togLocalizacao: boolean;
  setTogCamera: (v: boolean) => void;
  setTogMicrofone: (v: boolean) => void;
  setTogNotificacoes: (v: boolean) => void;
  setTogLocalizacao: (v: boolean) => void;
  ocupado: boolean;
  onContinue: () => void;
}

// Frame 3 (J1): cards com toggle para cada permissao opcional.
// Storage e implicito (Frame 2 ja pediu). Ordem fixa pelo spec
// canonico: camera -> microfone -> notificacoes -> localizacao.
function Frame3Permissoes({
  togCamera,
  togMicrofone,
  togNotificacoes,
  togLocalizacao,
  setTogCamera,
  setTogMicrofone,
  setTogNotificacoes,
  setTogLocalizacao,
  ocupado,
  onContinue,
}: Frame3PermissoesProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Permissões</MicroOrange>
      <Heading>Libere o que faz sentido pra você.</Heading>
      <Sub>Para a melhor experiência, libere o acesso a:</Sub>

      <CardPermissao
        titulo="Câmera"
        descricao="Para tirar fotos e escanear documentos."
        valor={togCamera}
        onChange={setTogCamera}
        accessibilityLabel="toggle permissao camera"
      />
      <CardPermissao
        titulo="Microfone"
        descricao="Para gravar áudios no diário."
        valor={togMicrofone}
        onChange={setTogMicrofone}
        accessibilityLabel="toggle permissao microfone"
      />
      <CardPermissao
        titulo="Notificações"
        descricao="Para alarmes e lembretes."
        valor={togNotificacoes}
        onChange={setTogNotificacoes}
        accessibilityLabel="toggle permissao notificacoes"
      />
      <CardPermissao
        titulo="Localização"
        descricao="Para detectar bairro nos eventos."
        valor={togLocalizacao}
        onChange={setTogLocalizacao}
        accessibilityLabel="toggle permissao localizacao"
      />

      <View style={{ height: spacing.md }} />
      <Button
        label={ocupado ? 'Pedindo…' : 'Continuar'}
        onPress={onContinue}
        disabled={ocupado}
      />
    </View>
  );
}

interface CardPermissaoProps {
  titulo: string;
  descricao: string;
  valor: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}

function CardPermissao({
  titulo,
  descricao,
  valor,
  onChange,
  accessibilityLabel,
}: CardPermissaoProps) {
  return (
    <View
      accessibilityLabel={`linha ${accessibilityLabel}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
          }}
        >
          {titulo}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
            marginTop: 2,
          }}
        >
          {descricao}
        </Text>
      </View>
      <Toggle
        value={valor}
        onChange={onChange}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

interface Frame4Props {
  nomeA: string;
  nomeB: string | null;
  permissoesConcedidas: number;
  iniciando: boolean;
  onConcluir: () => void;
}

function Frame4({
  nomeA,
  nomeB,
  permissoesConcedidas,
  iniciando,
  onConcluir,
}: Frame4Props) {
  // Plural cuidado: 1 -> "1 permissão concedida", 0 ou >1 ->
  // "N permissões concedidas". 0 e exibido com mesma forma.
  const resumoPermissoes =
    permissoesConcedidas === 1
      ? '1 permissão concedida.'
      : `${permissoesConcedidas} permissões concedidas.`;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iniciando ? (
          <OuroborosLoader compacto />
        ) : (
          <Check size={48} color={colors.green} strokeWidth={2.4} />
        )}
      </View>
      <Heading>Tudo pronto, {nomeA}.</Heading>
      <Text
        accessibilityLabel="resumo permissoes onboarding"
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {resumoPermissoes}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {nomeB
          ? `Você e ${nomeB} estão configurados. Toque + para começar.`
          : 'Toque + para começar.'}
      </Text>
      <View style={{ height: spacing.lg }} />
      <View style={{ alignSelf: 'stretch' }}>
        <Button
          label={iniciando ? 'Preparando…' : 'Começar'}
          onPress={onConcluir}
          disabled={iniciando}
        />
      </View>
    </View>
  );
}
