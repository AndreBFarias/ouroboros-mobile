// Tela 01 (hoje) — entrada do app. Le do Vault os registros do dia
// (humor / diarios emocionais / eventos) e renderiza em sentence
// case com acentuacao PT-BR completa. Sem permissao de Vault, mostra
// modal de onboarding com botao para conceder via SAF.
//
// Fonte de verdade visual: docs/Ouroboros_22_telas-standalone.html
// artboard 'tela 01 — hoje'. Fonte de verdade de schemas:
// docs/BRIEFING.md secao 7. Esta tela substitui o re-export do
// storybook que vivia aqui na M01.5.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Card,
  EmptyState,
  FAB,
  Header,
  PersonAvatar,
  Screen,
  Slider,
  ChipGroup,
  Button,
  useToast,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { requestVaultPermission, loadVaultRoot } from '@/lib/vault';
import { useHoje } from '@/lib/hooks/useHoje';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { EventoMeta } from '@/lib/schemas/evento';

export default function TelaHoje() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const setVaultRoot = useVault((s) => s.setVaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const setPessoaAtiva = usePessoa((s) => s.setPessoaAtiva);

  // Restaura URI do SecureStore na primeira montagem (caso o
  // middleware persist ainda nao tenha hidratado).
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

  if (!vaultRoot) {
    return <PermissaoVaultModal onGrant={setVaultRoot} />;
  }

  return <TelaHojeConteudo onFabPress={() => toast.show('FAB radial chega na M04', 'info')} onAvatarPress={() => setPessoaAtiva(pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a')} onComponentsPress={() => router.push('/_components')} />;
}

interface PermissaoVaultModalProps {
  onGrant: (uri: string) => void;
}

function PermissaoVaultModal({ onGrant }: PermissaoVaultModalProps) {
  const [pedindo, setPedindo] = useState(false);

  const pedir = async () => {
    setPedindo(true);
    try {
      const uri = await requestVaultPermission();
      if (uri) onGrant(uri);
    } finally {
      setPedindo(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 20,
            textAlign: 'center',
          }}
        >
          Bem-vindo
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
          O Ouroboros precisa do acesso à pasta do seu Vault para ler e
          escrever os arquivos diários. Os dados ficam apenas no seu
          dispositivo.
        </Text>
        <Button
          variant="primary"
          onPress={pedir}
          disabled={pedindo}
          label={pedindo ? 'Aguardando...' : 'Permitir acesso ao Vault'}
        />
      </View>
    </Screen>
  );
}

interface ConteudoProps {
  onFabPress: () => void;
  onAvatarPress: () => void;
  onComponentsPress: () => void;
}

function TelaHojeConteudo({ onFabPress, onAvatarPress, onComponentsPress }: ConteudoProps) {
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const { humor, diarios, eventos, loading, error } = useHoje();

  return (
    <Screen>
      <Header
        title="Hoje"
        right={
          <PersonAvatar pessoa={pessoaAtiva} size="md" onPress={onAvatarPress} />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: spacing.base, paddingBottom: 120, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {error ? <BannerErro mensagem={error} /> : null}

        <SecaoHumor humor={humor} loading={loading} />
        <SecaoDiarios diarios={diarios} loading={loading} />
        <SecaoEventos eventos={eventos} loading={loading} />

        <Button
          variant="ghost"
          onPress={onComponentsPress}
          label="Ver storybook de componentes"
        />
      </ScrollView>

      <FAB onPress={onFabPress} accessibilityLabel="acao rapida" />
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
          <Text style={{ color: colors.muted, fontFamily: 'JetBrainsMono_400Regular' }}>
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
            <Slider value={humor.humor} min={1} max={5} onChange={() => undefined} disabled label="Humor" />
            <Slider value={humor.energia} min={1} max={5} onChange={() => undefined} disabled label="Energia" />
            <Slider value={humor.ansiedade} min={1} max={5} onChange={() => undefined} disabled label="Ansiedade" />
            <Slider value={humor.foco} min={1} max={5} onChange={() => undefined} disabled label="Foco" />
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
                options={humor.tags.map((t) => ({ value: t, label: t, accent: 'cyan' }))}
                disabled
              />
            ) : null}
          </View>
        </Card>
      )}
    </View>
  );
}

interface SecaoDiariosProps {
  diarios: DiarioEmocionalMeta[];
  loading: boolean;
}

function SecaoDiarios({ diarios, loading }: SecaoDiariosProps) {
  const ordenados = useMemo(
    () => [...diarios].sort((a, b) => a.data.localeCompare(b.data)),
    [diarios]
  );

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Diário emocional
      </Text>
      {loading ? null : ordenados.length === 0 ? (
        <Card>
          <EmptyState frase="Nada hoje. Tudo bem." />
        </Card>
      ) : (
        ordenados.map((d, idx) => <ItemDiario key={`${d.data}-${idx}`} diario={d} />)
      )}
    </View>
  );
}

interface ItemDiarioProps {
  diario: DiarioEmocionalMeta;
}

function ItemDiario({ diario }: ItemDiarioProps) {
  const corBorda = diario.modo === 'trigger' ? colors.red : colors.green;
  const hora = diario.data.slice(11, 16);

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        padding: spacing.base,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        {hora}
      </Text>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
        }}
        numberOfLines={2}
      >
        {diario.texto}
      </Text>
    </View>
  );
}

interface SecaoEventosProps {
  eventos: EventoMeta[];
  loading: boolean;
}

function SecaoEventos({ eventos, loading }: SecaoEventosProps) {
  const ordenados = useMemo(
    () => [...eventos].sort((a, b) => a.data.localeCompare(b.data)),
    [eventos]
  );

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Eventos
      </Text>
      {loading ? null : ordenados.length === 0 ? (
        <Card>
          <EmptyState frase="Sem eventos registrados hoje." />
        </Card>
      ) : (
        ordenados.map((e, idx) => <ItemEvento key={`${e.data}-${idx}`} evento={e} />)
      )}
    </View>
  );
}

interface ItemEventoProps {
  evento: EventoMeta;
}

function ItemEvento({ evento }: ItemEventoProps) {
  const corBorda = evento.modo === 'positivo' ? colors.green : colors.red;
  const hora = evento.data.slice(11, 16);

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        padding: spacing.base,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        {hora}
        {evento.lugar ? ` · ${evento.lugar}` : ''}
        {evento.bairro ? ` · ${evento.bairro}` : ''}
      </Text>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
        }}
      >
        {evento.categoria ?? 'Evento'}
      </Text>
    </View>
  );
}
