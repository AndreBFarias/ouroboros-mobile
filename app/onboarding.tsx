// Onboarding inicial em 4 frames (H3 / M-VAULT-PASTA-NAO-HARDCODED).
// Versoes anteriores tinham 3 frames (M23) com a inicializacao do
// Vault implicita ao final. ADR-0022 introduz a pergunta explicita
// "Onde salvar?" como Frame 2, deixando "Tudo pronto" como Frame 3.
//
// Frame 0: Como voce se chama?
// Frame 1: Mais alguem usa este Vault com voce?
// Frame 2: Onde salvar seus dados? (sugestao Documents/Ouroboros vs
//          escolher manual via SAF picker)
// Frame 3: Tudo pronto, <nome>.
//
// O Frame 2 substitui o tap implicito de "Comecar" como gatilho do
// SAF picker. Agora o caminho A (sugestao default) chama
// pedirPermissaoStorage + inicializarVaultEscolhido(sugestao); o
// caminho B (Outra pasta) chama requestVaultPermission para abrir o
// SAF picker e em seguida inicializarVaultEscolhido(uri retornada).
// Em web ambos os caminhos caem no mesmo no-op (URI mock) para nao
// bloquear validacao Gauntlet.
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
import { ScrollView, Text, View } from 'react-native';
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
  Card,
  ChipGroup,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  useOnboarding,
  type TipoCompanhia,
} from '@/lib/stores/onboarding';
import {
  inicializarVaultEscolhido,
  pedirPermissaoStorage,
  requestVaultPermission,
  sugestaoVaultPathDefault,
  sugestaoVaultUriDefault,
} from '@/lib/vault';

type FrameId = 0 | 1 | 2 | 3;

export default function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const setNome = usePessoa((s) => s.setNome);
  const nomeA = usePessoa((s) => s.nomes.pessoa_a);
  const nomeB = usePessoa((s) => s.nomes.pessoa_b);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  const setTipoCompanhia = useOnboarding((s) => s.setTipoCompanhia);
  const marcarConcluido = useOnboarding((s) => s.marcarConcluido);

  const [frame, setFrame] = useState<FrameId>(0);
  const [nomeInput, setNomeInput] = useState('');
  const [duo, setDuo] = useState<boolean | null>(null);
  const [nomeBInput, setNomeBInput] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [escolhendoPasta, setEscolhendoPasta] = useState(false);

  const avancar = () =>
    setFrame((f) => (f >= 3 ? 3 : ((f + 1) as FrameId)));

  const handleFrame0 = () => {
    const nome = nomeInput.trim();
    if (nome.length < 1) {
      toast.show('Por favor, digite um nome.', 'error');
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
      setNome('pessoa_b', nome);
    } else {
      setTipoCompanhia('sozinho');
    }
    avancar();
  };

  // Caminho A do Frame 2: usuario aceitou a sugestao
  // /sdcard/Documents/Ouroboros/. Pede permissao de armazenamento
  // (Intent ALL_FILES em Android >=11; PermissionsAndroid em <11) e
  // inicializa direto na URI sugerida. Se o probe falhar (OEM
  // agressivo), exibe toast e mantem usuario no Frame 2 para tentar
  // "Outra pasta".
  const handleUsarSugestao = async () => {
    if (escolhendoPasta) return;
    setEscolhendoPasta(true);
    try {
      await pedirPermissaoStorage();
      await inicializarVaultEscolhido(sugestaoVaultUriDefault());
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

  // Caminho B do Frame 2: usuario escolheu "Outra pasta" via SAF
  // picker. requestVaultPermission abre o picker; ao receber a URI,
  // chamamos inicializarVaultEscolhido(uri) que cria as 8 subpastas
  // (H2) e persiste o vaultRoot.
  const handleEscolherOutra = async () => {
    if (escolhendoPasta) return;
    setEscolhendoPasta(true);
    try {
      const uri = await requestVaultPermission();
      if (!uri) {
        // Usuario cancelou o picker: mantem Frame 2 sem mensagem.
        return;
      }
      await inicializarVaultEscolhido(uri);
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
              <Frame3
                nomeA={nomeA}
                nomeB={duo ? nomeB : null}
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
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 32,
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

interface Frame0Props {
  nome: string;
  onChange: (next: string) => void;
  onContinue: () => void;
}

function Frame0({ nome, onChange, onContinue }: Frame0Props) {
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
  onContinue: () => void;
}

function Frame1({
  duo,
  setDuo,
  tipoCompanhia,
  setTipo,
  nomeB,
  setNomeB,
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

      {duo === true ? <Frame1Expand tipoCompanhia={tipoCompanhia} setTipo={setTipo} nomeB={nomeB} setNomeB={setNomeB} /> : null}

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
}: {
  tipoCompanhia: TipoCompanhia;
  setTipo: (t: TipoCompanhia) => void;
  nomeB: string;
  setNomeB: (next: string) => void;
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
    </Animated.View>
  );
}

interface CardEscolhaProps {
  ativo: boolean;
  label: string;
  onPress: () => void;
}

function CardEscolha({ ativo, label, onPress }: CardEscolhaProps) {
  return (
    <Card variant={ativo ? 'active' : 'default'} onPress={onPress} accessibilityLabel={`escolher ${label.toLowerCase()}`}>
      <View style={{ minHeight: 80, justifyContent: 'center', alignItems: 'center' }}>
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
    </Card>
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

interface Frame3Props {
  nomeA: string;
  nomeB: string | null;
  iniciando: boolean;
  onConcluir: () => void;
}

function Frame3({ nomeA, nomeB, iniciando, onConcluir }: Frame3Props) {
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
