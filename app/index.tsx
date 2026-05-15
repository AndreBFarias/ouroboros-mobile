// Tela 01 (hoje) — entrada do app v2 (M40). Le do Vault os registros
// do dia e renderiza em sentence case com acentuacao PT-BR completa.
// Se o onboarding não foi concluido, redireciona para /onboarding
// (substituiu o PermissaoVaultModal da M02 a partir da M03).
//
// M27: a Tela Hoje deixou de hospedar FABRadial. O FAB principal
// virou item global (FABMenu, canto inferior esquerdo) renderizado
// no _layout raiz e o menu de captura migrou para o MenuLateral.
//
// M40: layout v2.
//   - Header: avatar(es) + botao "Recap" -> /recap.
//     -- sozinho: 1 avatar md.
//     -- duo: 2 avatares sm lado a lado.
//   - SecaoStatusCasal so em duo (humor + ultima atividade de cada).
//   - SecaoProximos: alarmes 4h + tarefas com alarme hoje.
//   - SecaoHumor: bloco do dia (humor/energia/ansiedade/foco).
//   - SecaoDiariosEventosAgrupado: timeline cronologica unica
//     substituindo as duas secoes separadas.
//   - Botao storybook so em __DEV__.
//
// Fonte de verdade visual: docs/Ouroboros_24_telas-standalone.html
// artboard 'tela 01 — hoje'. Fonte de verdade de schemas:
// docs/BRIEFING.md secao 7.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import {
  Card,
  EmptyState,
  Header,
  PersonAvatar,
  Screen,
  Slider,
  ChipGroup,
  Button,
} from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

// Q2.2 (Onda Q): Recap inline. Pressable direto resolve o problema do
// Button generico colapsar layout flex no celular real (W1 do M-AUDIT
// fixava isso em Q2, mas no APK new arch o MotiView ainda hidratava
// sem propagar o flex row interno). Custom resolve em ~30 linhas.
interface BotaoRecapProps {
  onPress: () => void;
}
function BotaoRecap({ onPress }: BotaoRecapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Recap"
      hitSlop={8}
      style={{
        // Q2.3 (Onda Q): row + flexShrink 0 evita o wrap "Re/ca/p" que
        // apareceu no celular real. O Header right={} aplica flex 1 ao
        // wrapper externo e o filho Pressable herdava largura limitada.
        // alignSelf flex-end + flexShrink 0 + minWidth conteudo garante
        // que o pill use largura intrinseca (icone + label + paddings).
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        alignSelf: 'flex-end',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(189,147,249,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(189,147,249,0.45)',
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <Sparkles size={14} color={colors.purple} strokeWidth={2.25} />
      <Text
        numberOfLines={1}
        style={{
          color: colors.purple,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
          lineHeight: 18,
          flexShrink: 0,
        }}
      >
        Recap
      </Text>
    </Pressable>
  );
}
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { loadVaultRoot } from '@/lib/vault';
import { useHoje } from '@/lib/hooks/useHoje';
import { SecaoStatusCasal } from '@/components/screens/SecaoStatusCasal';
import { SecaoProximos } from '@/components/screens/SecaoProximos';
import { SecaoDiariosEventosAgrupado } from '@/components/screens/SecaoDiariosEventosAgrupado';

export default function TelaHoje() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const setVaultRoot = useVault((s) => s.setVaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const setPessoaAtiva = usePessoa((s) => s.setPessoaAtiva);
  const onboardingDone = useOnboarding((s) => s.done);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);

  // Espera as 3 stores hidratarem do SecureStore antes de qualquer
  // decisão de redirect, senao o gate dispara com defaults (done=false,
  // vaultRoot=null) e causa flicker indo/voltando da tela de
  // onboarding até o persist terminar.
  const onbHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const pessoaHidratada = useHasHydrated(usePessoa);
  const tudoHidratado = onbHidratado && vaultHidratado && pessoaHidratada;

  // Restaura URI do SecureStore na primeira montagem (caso o
  // middleware persist ainda não tenha hidratado).
  useEffect(() => {
    if (vaultRoot) return;
    let cancelled = false;
    loadVaultRoot().then((uri) => {
      if (!cancelled && uri) setVaultRoot(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultRoot, setVaultRoot]);

  // Splash silencioso enquanto persist carrega.
  if (!tudoHidratado) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  // Gate de onboarding.
  if (!onboardingDone || !vaultRoot) {
    return <Redirect href="/onboarding" />;
  }

  const ehSozinho = tipoCompanhia === 'sozinho';
  const handleAvatarPress = ehSozinho
    ? undefined
    : () =>
        setPessoaAtiva(pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a');

  return (
    <TelaHojeConteudo
      ehSozinho={ehSozinho}
      onAvatarPress={handleAvatarPress}
      onComponentsPress={() => router.push('/_components')}
      // /recap criado em paralelo (M36/B5). Cast para evitar dependencia
      // dura no tipo gerado pelo expo-router antes do paralelo fechar.
      onRecapPress={() => router.push('/recap' as never)}
    />
  );
}

interface ConteudoProps {
  ehSozinho: boolean;
  // undefined quando sozinho: avatar não tem toggle.
  onAvatarPress: (() => void) | undefined;
  onComponentsPress: () => void;
  onRecapPress: () => void;
}

function TelaHojeConteudo({
  ehSozinho,
  onAvatarPress,
  onComponentsPress,
  onRecapPress,
}: ConteudoProps) {
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const fotos = usePessoa((s) => s.fotos);
  const fotoAtiva = fotos[pessoaAtiva];
  const { humor, diarios, eventos, loading, error } = useHoje();

  return (
    <Screen>
      <Header
        title="Hoje"
        right={
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
            }}
          >
            {ehSozinho ? (
              <PersonAvatar
                pessoa={pessoaAtiva}
                size="md"
                onPress={onAvatarPress}
                photoUri={fotoAtiva}
              />
            ) : (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <PersonAvatar
                  pessoa="pessoa_a"
                  size="sm"
                  onPress={onAvatarPress}
                  photoUri={fotos.pessoa_a}
                />
                <PersonAvatar
                  pessoa="pessoa_b"
                  size="sm"
                  onPress={onAvatarPress}
                  photoUri={fotos.pessoa_b}
                />
              </View>
            )}
            {/* Q2/Q2.1/Q2.2 (Onda Q): Recap como Pressable custom em vez
                de Button generico — Button mete justifyContent center no
                MotiView e o filho View com flex row colapsava no celular
                real (mostrava so o icone). Aqui controlamos o layout
                direto: pill purple/16 + borda purple/45 + Sparkles 14dp
                + label 14dp, padding 20dp horizontal + 10dp vertical,
                radius 999 chip, gap 6dp. */}
            <BotaoRecap onPress={onRecapPress} />
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {error ? <BannerErro mensagem={error} /> : null}

        {!ehSozinho ? <SecaoStatusCasal /> : null}
        <SecaoProximos />
        <SecaoHumor humor={humor} loading={loading} />
        <SecaoDiariosEventosAgrupado
          diarios={diarios}
          eventos={eventos}
          loading={loading}
        />

        {__DEV__ ? (
          <Button
            variant="ghost"
            onPress={onComponentsPress}
            label="Ver storybook de componentes"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

interface BannerErroProps {
  mensagem: string;
}

function BannerErro({ mensagem }: BannerErroProps) {
  return (
    <View
      style={{
        backgroundColor: colors.bgElev,
        borderLeftWidth: 3,
        borderLeftColor: colors.red,
        borderRadius: 8,
        padding: spacing.base,
      }}
      accessibilityRole="alert"
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        Não foi possível ler o Vault: {mensagem}
      </Text>
    </View>
  );
}

// Converte slug snake_case do YAML em rotulo legivel:
//   'trabalho_pesado' -> 'Trabalho pesado'
//   'boa_conversa'    -> 'Boa conversa'
function formatTag(slug: string): string {
  const limpo = slug.replace(/_/g, ' ').trim();
  if (limpo.length === 0) return slug;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

interface SecaoHumorProps {
  humor: ReturnType<typeof useHoje>['humor'];
  loading: boolean;
}

function SecaoHumor({ humor, loading }: SecaoHumorProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Humor do dia
      </Text>
      {loading ? (
        <Card>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
            }}
          >
            Carregando...
          </Text>
        </Card>
      ) : !humor ? (
        <Card>
          <EmptyState frase="Nenhum registro de humor hoje. Toque + para começar." />
        </Card>
      ) : (
        <Card>
          <View style={{ gap: spacing.md }}>
            <Slider
              value={humor.humor}
              min={1}
              max={5}
              onChange={() => undefined}
              disabled
              label="Humor"
            />
            <Slider
              value={humor.energia}
              min={1}
              max={5}
              onChange={() => undefined}
              disabled
              label="Energia"
            />
            <Slider
              value={humor.ansiedade}
              min={1}
              max={5}
              onChange={() => undefined}
              disabled
              label="Ansiedade"
            />
            <Slider
              value={humor.foco}
              min={1}
              max={5}
              onChange={() => undefined}
              disabled
              label="Foco"
            />
            {humor.frase ? (
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  fontStyle: 'italic',
                  lineHeight: 22,
                }}
              >
                {humor.frase}
              </Text>
            ) : null}
            {humor.tags.length > 0 ? (
              <ChipGroup
                mode="multi"
                value={humor.tags}
                onChange={() => undefined}
                options={humor.tags.map((t) => ({
                  value: t,
                  label: formatTag(t),
                  accent: 'cyan',
                }))}
                disabled
              />
            ) : null}
          </View>
        </Card>
      )}
    </View>
  );
}
