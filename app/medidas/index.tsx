// Tela 13 - Comparativo de Medidas. Filtro período (chips 30d / 90d /
// tudo), grid 2 colunas de cards (um por campo de medida) com
// sparkline 12 pontos + delta vs primeira em muted. Bloco fotos no
// fim com SliderFotos para comparativo lado a lado.
//
// Empty state quando não ha registros. FAB '+' navega para Tela 12.
//
// Carrega lista do Vault via listarMedidas(período). Recarrega ao
// focar (para refletir saves recentes).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import { ChipGroup, EmptyState, FAB, Header, Screen } from '@/components/ui';
import { CardComparativo, SliderFotos } from '@/components/medidas';
import type { FotoMedida } from '@/components/medidas';
import type { SparklineMedidaPoint } from '@/components/data';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { useLarguraFrame } from '@/lib/ui/useLarguraFrame';
import { listarMedidas, type MedidasPeriodo } from '@/lib/vault/medidas';
import {
  MEDIDAS_CAMPOS,
  MEDIDAS_LABELS,
  type Medida,
  type MedidaCampo,
} from '@/lib/schemas/medidas';

const PERIODO_OPTIONS = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'tudo', label: 'Tudo' },
];

// Resolve URI absoluto a partir do path relativo. Aceita tanto o
// path canonico atual (media/fotos/medidas-<data>-<lado>.jpg, sprint
// M-VAULT-MD-FIX-medidas-fotos 2026-05-04) quanto o legado
// (assets/m-<data>-<lado>.jpg). Backward-compat: fotos antigas em
// assets/ continuam visiveis.
function resolveUri(vaultRoot: string | null, rel: string): string {
  if (!vaultRoot) return rel;
  const trimmed = vaultRoot.endsWith('/') ? vaultRoot.slice(0, -1) : vaultRoot;
  return `${trimmed}/${rel}`;
}

// Extrai pontos para sparkline de uma medida específica. Ordena
// asc por data (sparkline le esquerda -> direita).
function pontosDoCampo(
  lista: Medida[],
  campo: MedidaCampo
): SparklineMedidaPoint[] {
  const out: SparklineMedidaPoint[] = [];
  for (const m of lista) {
    const v = m[campo];
    if (typeof v === 'number') {
      out.push({ data: m.data, valor: v });
    }
  }
  out.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  return out;
}

// Decodifica nome de arquivo de foto para inferir lado (frente /
// costas / lado). Aceita ambos formatos:
//   - canonico atual (M-VAULT-MD-FIX 2026-05-04):
//     media/fotos/medidas-YYYY-MM-DD-<lado>.jpg
//   - legado: assets/m-YYYY-MM-DD-<lado>.jpg
// Sufixo final do filename antes da extensao decide o lado em ambos.
function inferirLado(rel: string): 'frente' | 'costas' | 'lado' {
  if (rel.endsWith('-costas.jpg')) return 'costas';
  if (rel.endsWith('-lado.jpg')) return 'lado';
  return 'frente';
}

// Monta lista de FotoMedida agregando todas as fotos de todas as
// medidas do período, ordenada asc por data (caller SliderFotos
// espera asc).
function montarFotos(lista: Medida[], vaultRoot: string | null): FotoMedida[] {
  const out: FotoMedida[] = [];
  for (const m of lista) {
    for (const rel of m.fotos) {
      out.push({
        data: m.data,
        uri: resolveUri(vaultRoot, rel),
        lado: inferirLado(rel),
      });
    }
  }
  out.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  return out;
}

export default function ComparativoMedidas() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const larguraFrame = useLarguraFrame();

  const [periodo, setPeriodo] = useState<MedidasPeriodo>('tudo');
  const [lista, setLista] = useState<Medida[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setLista([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const out = await listarMedidas(vaultRoot, { periodo });
      setLista(out);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  // Largura disponível para cada card (grid 2 cols com gap, padding
  // lateral 20dp da Screen, gap interno 8dp). Em web usa FRAME_W
  // via useLarguraFrame para respeitar o frame mobile do Gauntlet.
  const larguraCard = useMemo(() => {
    const padding = spacing.lg * 2;
    const gap = spacing.sm;
    return Math.floor((larguraFrame - padding - gap) / 2);
  }, [larguraFrame]);

  // Largura para SliderFotos (full width menos padding lateral).
  const larguraSlider = useMemo(
    () => Math.max(0, larguraFrame - spacing.lg * 2),
    [larguraFrame]
  );

  const fotosAgregadas = useMemo(
    () => montarFotos(lista, vaultRoot),
    [lista, vaultRoot]
  );

  const handleNovo = useCallback(() => {
    router.push('/medidas/novo');
  }, [router]);

  const handlePeriodoChange = useCallback((v: string | null) => {
    if (v === '30d' || v === '90d' || v === 'tudo') {
      setPeriodo(v);
    }
  }, []);

  // Empty state quando não ha medida nenhuma carregada.
  const semDados = !carregando && lista.length === 0;

  // Layout em pares para grid 2 cols.
  const linhas = useMemo(() => {
    const out: MedidaCampo[][] = [];
    for (let i = 0; i < MEDIDAS_CAMPOS.length; i += 2) {
      out.push([...MEDIDAS_CAMPOS.slice(i, i + 2)]);
    }
    return out;
  }, []);

  return (
    <Screen>
      <Header title="Medidas" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filtro período */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Período
          </Text>
          <ChipGroup
            mode="single"
            options={PERIODO_OPTIONS}
            value={periodo}
            onChange={handlePeriodoChange}
          />
        </View>

        {semDados ? (
          <EmptyState frase="Suas medidas vão aparecer aqui." />
        ) : null}

        {/* Grid 2 cols de cards */}
        {!semDados ? (
          <View style={{ gap: spacing.sm }}>
            {linhas.map((linha, idx) => (
              <View
                key={`linha-${idx}`}
                style={{ flexDirection: 'row', gap: spacing.sm }}
              >
                {linha.map((campo) => {
                  const pontos = pontosDoCampo(lista, campo);
                  const valorAtual =
                    pontos.length > 0 ? pontos[pontos.length - 1].valor : null;
                  const valorPrimeira =
                    pontos.length >= 2 ? pontos[0].valor : null;
                  const meta = MEDIDAS_LABELS[campo];

                  return (
                    <View key={campo} style={{ flex: 1 }}>
                      <CardComparativo
                        nome={meta.label}
                        valorAtual={valorAtual}
                        unidade={meta.unidade}
                        valorPrimeira={valorPrimeira}
                        pontos={pontos}
                        largura={larguraCard}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}

        {/* Bloco comparativo de fotos */}
        {!semDados && fotosAgregadas.length > 0 ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 14,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Fotos
            </Text>
            <SliderFotos fotos={fotosAgregadas} largura={larguraSlider} />
          </View>
        ) : null}
      </ScrollView>

      <FAB
        icon={<Plus size={24} color={colors.bg} strokeWidth={2} />}
        onPress={handleNovo}
        accessibilityLabel="adicionar medidas"
      />
    </Screen>
  );
}
