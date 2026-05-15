// Tela 20.5 - Acompanhamento de Ciclo (M14.5). Visualizacao opt-in
// que so aparece quando o toggle featureToggles.cicloMenstrual em
// useSettings esta ligado. Renderiza:
//   - Header "Acompanhamento do ciclo".
//   - Linha micro muted: "Registro voluntario. Pula dias sem culpa."
//   - CalendarioFases 28-35 dias adaptativo.
//   - Botao primario "Registrar hoje" no rodape.
//
// Empty state quando não ha registros: frase canonica
// "Pode registrar o início do primeiro ciclo quando quiser." e
// botao "Registrar hoje" continua visivel para que o usuario
// possa criar o primeiro registro.
//
// Carrega registros do Vault via listarRegistrosCiclo filtrando por
// pessoaAtiva (privacidade visual entre as duas pessoas, M14.5 spec).
// Recarrega ao focar (useFocusEffect) para refletir saves recentes.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { CalendarioFases } from '@/components/ciclo/CalendarioFases';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import { autorPadrao } from '@/lib/ciclo/inferencia';
import {
  listarRegistrosCiclo,
  duracaoCicloDetectada,
  ultimaDataInicio,
} from '@/lib/vault/ciclo';
import {
  FASES_LABELS,
  SINTOMAS_LABELS,
  type CicloMenstrualMeta,
  type FaseCiclo,
} from '@/lib/schemas/ciclo_menstrual';

// Q8 (Onda Q): cores Dracula por fase para chips visuais. Tom sobrio
// (sem celebração, ADR-0005). Acompanha FASES_LABELS do schema.
const FASE_COR: Record<FaseCiclo, string> = {
  folicular: colors.cyan,
  ovulatoria: colors.pink,
  lutea: colors.orange,
  menstrual: colors.red,
};

function formatarDataLista(ymd: string): string {
  // YYYY-MM-DD -> "qua 12/05"
  const [, m, d] = ymd.split('-');
  const date = new Date(`${ymd}T12:00:00Z`);
  const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const dia = diasSemana[date.getUTCDay()];
  return `${dia} ${d}/${m}`;
}

export default function CicloIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  const sexoA = useOnboarding((s) => s.sexoDeclarado.pessoa_a);
  const sexoB = useOnboarding((s) => s.sexoDeclarado.pessoa_b);

  // Onda Q fix Bloqueador A: simetria com registrar.tsx — load tem que
  // usar o mesmo autor inferido que o save usa. Sem isso, em casal
  // masculino+feminino o save grava 'pessoa_b' (feminina inferida) e o
  // load filtra por pessoaAtiva 'pessoa_a' (default do store), causando
  // empty state apesar do registro persistir no disco.
  const autorListagem = useMemo(
    () => autorPadrao(tipoCompanhia, sexoA, sexoB) ?? pessoaAtiva,
    [tipoCompanhia, sexoA, sexoB, pessoaAtiva]
  );

  const [registros, setRegistros] = useState<CicloMenstrualMeta[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setRegistros([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const out = await listarRegistrosCiclo(vaultRoot, autorListagem, {
        periodo: 'tudo',
      });
      setRegistros(out);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, autorListagem]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const dataInicio = useMemo(() => ultimaDataInicio(registros), [registros]);
  const duracao = useMemo(() => duracaoCicloDetectada(registros), [registros]);

  // Q8 (Onda Q): calculo de dia atual do ciclo. Diferenca em dias
  // entre hoje e dataInicio + 1 (1-indexed). null se nao houver
  // dataInicio (antes do primeiro registro).
  const diaAtualCiclo = useMemo(() => {
    if (!dataInicio) return null;
    const hoje = new Date();
    const inicio = new Date(`${dataInicio}T00:00:00Z`);
    const diffDias = Math.floor(
      (hoje.getTime() - inicio.getTime()) / 86_400_000
    );
    return Math.max(1, diffDias + 1);
  }, [dataInicio]);

  // Q8 (Onda Q): lista descendente dos ultimos 14 registros para
  // visualizacao "Ultimos registros". Slice rapido sobre o array
  // ja ordenado asc; reverse imuta o original entao mapeamos para
  // nova lista. Cap em 14 pra evitar scroll infinito; usuario abre
  // calendario para ver mais.
  const ultimosRegistros = useMemo(() => {
    return [...registros].reverse().slice(0, 14);
  }, [registros]);

  const semDados = !carregando && registros.length === 0;

  const handleRegistrarHoje = useCallback(() => {
    router.push('/ciclo/registrar');
  }, [router]);

  const handleSelectDay = useCallback(
    (data: string) => {
      router.push({
        pathname: '/ciclo/registrar',
        params: { data },
      });
    },
    [router]
  );

  return (
    <Screen>
      <Header title="Acompanhamento do ciclo" />

      <View style={{ marginTop: spacing.xs, marginBottom: spacing.base }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          Registro voluntário. Pula dias sem culpa.
        </Text>
      </View>

      {/* Q8 (Onda Q): mini-stats no topo — dia atual do ciclo e
          duração media detectada. Texto sobrio, sem badges nem cores
          de festa (ADR-0005). Só renderiza quando ha dataInicio. */}
      {dataInicio && diaAtualCiclo !== null ? (
        <View
          style={{
            marginBottom: spacing.base,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: 8,
            backgroundColor: colors.bgElev,
          }}
        >
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Dia {diaAtualCiclo} do ciclo
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Duração média detectada: {duracao} dias
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {semDados || !dataInicio ? (
          <EmptyState
            frase={
              dataInicio
                ? 'Registre quando quiser.'
                : 'Pode registrar o início do primeiro ciclo quando quiser.'
            }
          />
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: spacing.base }}>
              <CalendarioFases
                registros={registros}
                dataInicioUltimoCiclo={dataInicio}
                duracao={duracao}
                onSelectDay={handleSelectDay}
              />
            </View>

            {/* Q8 (Onda Q): lista cronológica dos ultimos 14 registros.
                Tap em item navega para edicao do dia. Critica: usuario
                relatou "nao consigo ver o que registro nem acompanhar".
                Mostra fase + sintomas resumidos + data. */}
            {ultimosRegistros.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  Últimos registros
                </Text>
                {ultimosRegistros.map((r) => (
                  <ItemRegistroCiclo
                    key={r.data}
                    registro={r}
                    onPress={() => handleSelectDay(r.data)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Registrar hoje"
          onPress={handleRegistrarHoje}
          variant="primary"
        />
      </View>
    </Screen>
  );
}

// Q8 (Onda Q): item da lista "Ultimos registros". Mostra chip de fase
// + data formatada + sintomas resumidos. Tap navega para edicao do
// dia (handleSelectDay no parent). Tom sobrio: sem celebracao, sem
// gamificacao (ADR-0005).
interface ItemRegistroProps {
  registro: CicloMenstrualMeta;
  onPress: () => void;
}

function ItemRegistroCiclo({ registro, onPress }: ItemRegistroProps) {
  const corFase = FASE_COR[registro.fase];
  const sintomasResumo = registro.sintomas
    .slice(0, 3)
    .map((s) => SINTOMAS_LABELS[s])
    .join(' · ');
  const sintomasExtras =
    registro.sintomas.length > 3 ? ` +${registro.sintomas.length - 3}` : '';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`editar registro de ${registro.data} fase ${registro.fase}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.bgElev,
        borderLeftWidth: 3,
        borderLeftColor: corFase,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: corFase,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {FASES_LABELS[registro.fase]}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {formatarDataLista(registro.data)}
          </Text>
        </View>
        {registro.sintomas.length > 0 ? (
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {sintomasResumo}
            {sintomasExtras}
          </Text>
        ) : registro.texto ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
              fontStyle: 'italic',
            }}
            numberOfLines={1}
          >
            {registro.texto}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
