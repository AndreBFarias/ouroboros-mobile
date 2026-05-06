// Onboarding inicial em 3 frames (M23). Substitui o fluxo de 5
// frames anterior. Coleta nome do usuario primario e companhia
// (sozinho/duo + nome do parceiro). Frame final dispara
// inicializarVaultCanonico() (M22) que cuida sozinho de pedir
// permissao de armazenamento, criar a estrutura de pastas e
// persistir o vaultRoot. Em caso de OEM agressivo o helper cai em
// SAF interativo (modo saf-fallback) e retorna sucesso; o usuario
// recebe toast amarelo informando.
//
// Decisao M03: Sentence case + acentuacao PT-BR completa nas strings
// de UI. accessibilityLabel sem acento. Comentarios sem acento
// (convencao shell).
//
// Decisao M23: nao toca mais em useVault diretamente, nem em
// requestVaultPermission. Quem cuida do vaultRoot e
// inicializarVaultCanonico(). M25 substitui o placeholder
// ActivityIndicator pelo OuroborosLoader compacto.
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
// A27 (2026-05-06): substituir moti por Reanimated puro nos 2
// componentes animados deste arquivo. Em New Arch (Fabric), moti +
// Reanimated 4 emite transform como string interpolada em frames
// iniciais, causando ClassCastException ("String cannot be cast to
// ReadableArray") em RNSVG/View ManagerDelegate.setProperty. Solução
// canônica: Animated.View do Reanimated puro com useSharedValue +
// useAnimatedStyle + withSpring (transform sempre array).
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
import { inicializarVaultCanonico } from '@/lib/vault';

type FrameId = 0 | 1 | 2;

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

  const avancar = () =>
    setFrame((f) => (f >= 2 ? 2 : ((f + 1) as FrameId)));

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

  const handleConcluir = async () => {
    if (iniciando) return;
    setIniciando(true);
    try {
      const res = await inicializarVaultCanonico();
      if (res.modo === 'saf-fallback') {
        toast.show('Pasta criada em local alternativo.', 'warn');
      }
      marcarConcluido();
      router.replace('/');
    } catch {
      toast.show(
        'Não foi possível criar a pasta. Tente novamente.',
        'error'
      );
    } finally {
      setIniciando(false);
    }
  };

  // Renderiza apenas o frame ativo. O conteudo de cada frame entra
  // com translate da direita; nao usamos AnimatePresence/exit para
  // evitar tela em branco enquanto o exit do frame anterior anima.
  // ScrollView envolve o conteudo para caber forms longos (Frame 1
  // com avatar do parceiro).
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
      {[0, 1, 2].map((i) => (
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
// com spring. Sem exit para evitar janela branca. A27: Reanimated
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

// A27: extraido para componente proprio para usar useSharedValue +
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
  nomeA: string;
  nomeB: string | null;
  iniciando: boolean;
  onConcluir: () => void;
}

function Frame2({ nomeA, nomeB, iniciando, onConcluir }: Frame2Props) {
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
