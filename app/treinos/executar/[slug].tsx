// Executor de treino com timer de descanso (Q11.c, M-ROTINA-TREINO §5).
// Carrega uma RotinaMeta pelo slug, conduz o usuario exercicio por
// exercicio (1/N → descanso → proximo). Ao concluir todos exercicios
// salva uma TreinoSessao no Vault como snapshot imutavel — editar a
// rotina futuramente nao retroage na sessao registrada.
//
// State machine:
//   executando: usuario faz a serie atual e aperta "Concluir serie".
//   descansando: timer regressivo (default exercicio.descanso_seg).
//                Botoes: "Pular descanso" / "+10s" / "-10s".
//   concluido: tela final com sumario, salva no Vault e oferece "Fechar".
//
// Snapshot imutavel: a sessao gravada copia o nome+series+reps+carga
// de cada exercicio NO MOMENTO da execucao. Decisao spec §4.5: editar
// a rotina depois nao retroage. Implementacao via sessaoFromRotina
// reusada (mesmo helper do SeletorRotina).
//
// Cancelar: confirma com modal antes de descartar progresso parcial.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import { Button, Header, Screen, useToast } from '@/components/ui';
import { MidiaExecucaoPlayer } from '@/components/exercicios/MidiaExecucaoPlayer';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { lerRotina } from '@/lib/vault/rotina';
import { sessaoFromRotina } from '@/lib/treino/sessaoFromRotina';
import { saveTreino } from '@/lib/treinos/saveTreino';
import { comTimeout } from '@/lib/util/comTimeout';
import type { RotinaMeta, ExercicioRotina } from '@/lib/schemas/rotina';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

type Estado = 'executando' | 'descansando' | 'concluido';

function formatarTempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExecutarTreino() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [rotina, setRotina] = useState<RotinaMeta | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [idxExercicio, setIdxExercicio] = useState<number>(0);
  const [serieAtual, setSerieAtual] = useState<number>(1);
  const [estado, setEstado] = useState<Estado>('executando');
  const [segundosDescanso, setSegundosDescanso] = useState<number>(0);
  const [modalCancelar, setModalCancelar] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const inicioMs = useMemo(() => Date.now(), []);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      if (!vaultRoot || !slugParam) {
        setRotina(null);
        setCarregando(false);
        return;
      }
      try {
        const lida = await lerRotina(vaultRoot, slugParam);
        if (!cancelado) setRotina(lida);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [vaultRoot, slugParam]);

  const exercicio: ExercicioRotina | null =
    rotina && idxExercicio < rotina.exercicios.length
      ? rotina.exercicios[idxExercicio]
      : null;
  const totalExercicios = rotina?.exercicios.length ?? 0;
  const ehUltimoExercicio = idxExercicio === totalExercicios - 1;
  const ehUltimaSerie = exercicio !== null && serieAtual >= exercicio.series;

  // Timer regressivo do descanso.
  useEffect(() => {
    if (estado !== 'descansando') return;
    if (segundosDescanso <= 0) {
      // Descanso terminou: vibracao curta e volta pra executando.
      void haptics.success();
      setEstado('executando');
      return;
    }
    const t = setTimeout(() => {
      setSegundosDescanso((curr) => curr - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [estado, segundosDescanso]);

  const salvarSessao = useCallback(
    async (rot: RotinaMeta) => {
      if (!vaultRoot) {
        toast.show('Vault não conectado.', 'error');
        return;
      }
      setSalvando(true);
      try {
        // Snapshot imutavel via sessaoFromRotina + duracao calculada
        // a partir do tempo decorrido. Marca data como agora.
        const agora = new Date();
        const TZ = -180;
        const local = new Date(agora.getTime() + TZ * 60_000);
        const y = local.getUTCFullYear();
        const m = String(local.getUTCMonth() + 1).padStart(2, '0');
        const d = String(local.getUTCDate()).padStart(2, '0');
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        const dataIso = `${y}-${m}-${d}T${hh}:${mm}:00-03:00`;

        const snap = sessaoFromRotina(rot, dataIso, pessoaAtiva);
        const duracaoMin = Math.max(
          1,
          Math.round((Date.now() - inicioMs) / 60_000)
        );

        const meta: TreinoSessao = {
          tipo: 'treino_sessao',
          data: dataIso,
          autor: pessoaAtiva,
          rotina: rot.nome,
          duracao_min: duracaoMin,
          exercicios: snap.exercicios ?? [],
        };

        await comTimeout(saveTreino({ meta, vaultRoot }));
        void haptics.vitoria();
        toast.show('Treino registrado.', 'success');
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, pessoaAtiva, toast, inicioMs]
  );

  // Concluir serie atual: avanca para descanso ou proximo exercicio.
  // Quando termina o ultimo exercicio + ultima serie, finaliza treino.
  const concluirSerie = useCallback(() => {
    if (!exercicio || !rotina) return;
    void haptics.light();
    if (ehUltimaSerie) {
      // Acabou esse exercicio
      if (ehUltimoExercicio) {
        // Acabou o treino inteiro
        setEstado('concluido');
        void salvarSessao(rotina);
        return;
      }
      // Proximo exercicio comeca com serie 1 e descanso entre exercicios.
      setIdxExercicio((curr) => curr + 1);
      setSerieAtual(1);
      setEstado('descansando');
      setSegundosDescanso(exercicio.descanso_seg);
      return;
    }
    // Proxima serie do mesmo exercicio
    setSerieAtual((curr) => curr + 1);
    setEstado('descansando');
    setSegundosDescanso(exercicio.descanso_seg);
  }, [
    exercicio,
    rotina,
    ehUltimaSerie,
    ehUltimoExercicio,
    salvarSessao,
  ]);

  const pularDescanso = useCallback(() => {
    void haptics.light();
    setSegundosDescanso(0);
  }, []);

  const ajustarDescanso = useCallback((delta: number) => {
    void haptics.selection();
    setSegundosDescanso((curr) => Math.max(0, curr + delta));
  }, []);

  const handleCancelar = useCallback(() => {
    setModalCancelar(true);
  }, []);

  const handleConfirmarCancelar = useCallback(() => {
    setModalCancelar(false);
    router.back();
  }, [router]);

  if (carregando) {
    return (
      <Screen>
        <Header title="Treino" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!rotina) {
    return (
      <Screen>
        <Header title="Treino" onBack={() => router.back()} />
        <View style={{ flex: 1, paddingTop: spacing.huge }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Rotina não encontrada.
          </Text>
        </View>
      </Screen>
    );
  }

  if (estado === 'concluido') {
    return (
      <Screen>
        <Header title="Treino concluído" />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: spacing.lg,
            paddingBottom: spacing.huge,
            gap: spacing.base,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: colors.green,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 22,
              lineHeight: 30,
              textAlign: 'center',
            }}
            accessibilityLabel="treino concluido"
          >
            {rotina.nome}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            {`${totalExercicios} ${
              totalExercicios === 1 ? 'exercício' : 'exercícios'
            } finalizados.`}
          </Text>
          {salvando ? (
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Salvando…
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button
              label="Voltar"
              onPress={() => router.back()}
              variant="primary"
              disabled={salvando}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={`${idxExercicio + 1}/${totalExercicios}`}
        onBack={handleCancelar}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {exercicio ? (
          <>
            <View
              style={{
                backgroundColor: colors.bgAlt,
                borderRadius: radius.card,
                padding: spacing.lg,
                gap: spacing.sm,
                borderWidth: 1,
                borderColor: colors.bgElev,
              }}
              accessibilityLabel={`exercicio atual ${exercicio.nome}`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.base,
                }}
              >
                {/* Q18.b: thumbnail 96x96 da midia de execucao. */}
                <MidiaExecucaoPlayer
                  path={exercicio.gif}
                  size="sm"
                  accessibilityLabel={`midia ${exercicio.nome}`}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 20,
                    lineHeight: 28,
                  }}
                  numberOfLines={2}
                >
                  {exercicio.nome}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  {`Série ${serieAtual} de ${exercicio.series}`}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  {`${exercicio.reps} reps`}
                </Text>
              </View>
              {exercicio.carga_kg !== null ? (
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {`Carga ${exercicio.carga_kg} kg`}
                </Text>
              ) : (
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Peso corporal
                </Text>
              )}
              {exercicio.observacao !== null &&
              exercicio.observacao.trim().length > 0 ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 13,
                    lineHeight: 20,
                    marginTop: spacing.xs,
                    fontStyle: 'italic',
                  }}
                >
                  {exercicio.observacao}
                </Text>
              ) : null}
            </View>

            {estado === 'descansando' ? (
              <View
                style={{
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.lg,
                }}
                accessibilityLabel="painel descanso"
              >
                <Text
                  style={{
                    color: colors.cyan,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 12,
                    lineHeight: 18,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Descanso
                </Text>
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 48,
                    lineHeight: 56,
                  }}
                  accessibilityLabel={`tempo descanso ${segundosDescanso} segundos`}
                >
                  {formatarTempo(segundosDescanso)}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    marginTop: spacing.base,
                  }}
                >
                  <Pressable
                    onPress={() => ajustarDescanso(-10)}
                    accessibilityRole="button"
                    accessibilityLabel="reduzir descanso 10s"
                    style={{
                      backgroundColor: colors.bgAlt,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.bgElev,
                      paddingHorizontal: spacing.base,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.fg,
                        fontFamily: 'JetBrainsMono_500Medium',
                        fontSize: 14,
                      }}
                    >
                      -10s
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => ajustarDescanso(10)}
                    accessibilityRole="button"
                    accessibilityLabel="aumentar descanso 10s"
                    style={{
                      backgroundColor: colors.bgAlt,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.bgElev,
                      paddingHorizontal: spacing.base,
                      paddingVertical: spacing.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Plus size={14} color={colors.fg} strokeWidth={1.5} />
                    <Text
                      style={{
                        color: colors.fg,
                        fontFamily: 'JetBrainsMono_500Medium',
                        fontSize: 14,
                      }}
                    >
                      10s
                    </Text>
                  </Pressable>
                </View>
                <View style={{ marginTop: spacing.base, width: '100%' }}>
                  <Button
                    label="Pular descanso"
                    onPress={pularDescanso}
                    variant="ghost"
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
                <Button
                  label={
                    ehUltimaSerie && ehUltimoExercicio
                      ? 'Concluir treino'
                      : ehUltimaSerie
                        ? 'Próximo exercício'
                        : 'Concluir série'
                  }
                  onPress={concluirSerie}
                  variant="success"
                />
                <Button
                  label="Cancelar treino"
                  onPress={handleCancelar}
                  variant="ghost"
                />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={modalCancelar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCancelar(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 21, 26, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.modal,
              padding: spacing.lg,
              gap: spacing.base,
              width: '100%',
              maxWidth: 360,
            }}
            accessibilityLabel="modal confirmar cancelar treino"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Cancelar treino?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              O progresso parcial será descartado. A rotina continua salva
              em /rotinas.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar"
                onPress={handleConfirmarCancelar}
                variant="destructive"
              />
              <Button
                label="Continuar treinando"
                onPress={() => setModalCancelar(false)}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
