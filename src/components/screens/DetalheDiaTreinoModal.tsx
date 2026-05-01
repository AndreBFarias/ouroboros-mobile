// Tela 10 - bottom sheet 60% com detalhe de uma sessao de treino
// passada. Header laranja com data formatada PT-BR ("23 de abril,
// terça"), subtitle cyan ("Rotina A - 28 min - <pessoa>"), lista
// compacta de exercicios (check verde + nome + series x reps - carga),
// observacoes em italico muted, e botoes Editar / Duplicar pra hoje /
// Excluir.
//
// Excluir abre confirm dialog inline (toggle visivel) antes de
// disparar onExcluir.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { Button, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { excluirTreino } from '@/lib/vault/treinos';
import { saveTreino } from '@/lib/treinos/saveTreino';
import { useVault } from '@/lib/stores/vault';
import { nomeDe } from '@/lib/stores/pessoa';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

const MESES_PT: Record<number, string> = {
  0: 'janeiro',
  1: 'fevereiro',
  2: 'março',
  3: 'abril',
  4: 'maio',
  5: 'junho',
  6: 'julho',
  7: 'agosto',
  8: 'setembro',
  9: 'outubro',
  10: 'novembro',
  11: 'dezembro',
};

const DIAS_SEMANA: Record<number, string> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terça',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sábado',
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDate();
  const mes = MESES_PT[d.getMonth()] ?? '';
  const ds = DIAS_SEMANA[d.getDay()] ?? '';
  return `${dia} de ${mes}, ${ds}`;
}

export interface DetalheDiaTreinoModalProps {
  sessao: TreinoSessao;
  // Path relativo (treinos/<...>.md). Usado para excluir/preservar
  // slug em edicao.
  pathRelativo: string;
  onEditar: () => void;
  onExcluido: () => void;
  onFechar: () => void;
}

export function DetalheDiaTreinoModal({
  sessao,
  pathRelativo,
  onEditar,
  onExcluido,
  onFechar,
}: DetalheDiaTreinoModalProps): ReactNode {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [confirmando, setConfirmando] = useState<boolean>(false);
  const [duplicando, setDuplicando] = useState<boolean>(false);

  const handleExcluir = useCallback(async () => {
    if (!vaultRoot) {
      toast.show('Vault não conectado.', 'error');
      return;
    }
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    try {
      await excluirTreino(vaultRoot, pathRelativo);
      haptics.success();
      toast.show('Treino removido.', 'success');
      onExcluido();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha: ${msg}`, 'error');
    }
  }, [vaultRoot, pathRelativo, confirmando, toast, onExcluido]);

  const handleDuplicar = useCallback(async () => {
    if (!vaultRoot) {
      toast.show('Vault não conectado.', 'error');
      return;
    }
    setDuplicando(true);
    try {
      const agora = new Date();
      const TZ = -180;
      const local = new Date(agora.getTime() + TZ * 60_000);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      const hh = String(local.getUTCHours()).padStart(2, '0');
      const mm = String(local.getUTCMinutes()).padStart(2, '0');

      const novaSessao: TreinoSessao = {
        ...sessao,
        data: `${y}-${m}-${d}T${hh}:${mm}:00-03:00`,
      };

      await saveTreino({ meta: novaSessao, vaultRoot });
      haptics.success();
      toast.show('Treino duplicado pra hoje.', 'success');
      onFechar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha: ${msg}`, 'error');
    } finally {
      setDuplicando(false);
    }
  }, [vaultRoot, sessao, toast, onFechar]);

  // Formatar uma linha de exercicio: "<nome>  <series>x<reps> - <carga>kg"
  const formatLinhaExercicio = (
    ex: TreinoSessao['exercicios'][number]
  ): string => {
    const base = `${ex.series}x${ex.reps}`;
    const carga =
      typeof ex.carga_kg === 'number' && ex.carga_kg > 0
        ? ` - ${ex.carga_kg} kg`
        : '';
    return `${base}${carga}`;
  };

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 26,
          }}
        >
          {formatarData(sessao.data)}
        </Text>
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {sessao.rotina ?? 'Treino'} · {sessao.duracao_min} min ·{' '}
          {nomeDe(sessao.autor)}
        </Text>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {sessao.exercicios.map((ex, idx) => (
            <View
              key={`${ex.nome}-${idx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Check size={16} color={colors.green} strokeWidth={2} />
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 14,
                  lineHeight: 22,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {ex.nome}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {formatLinhaExercicio(ex)}
              </Text>
            </View>
          ))}
        </View>

        {sessao.observacoes ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
              fontStyle: 'italic',
              marginTop: spacing.sm,
            }}
          >
            {sessao.observacoes}
          </Text>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label="Editar"
            onPress={onEditar}
            variant="primary"
          />
          <Button
            label="Duplicar pra hoje"
            onPress={() => void handleDuplicar()}
            variant="ghost"
            disabled={duplicando}
          />
          {confirmando ? (
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.red,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  lineHeight: 18,
                  textAlign: 'center',
                }}
              >
                Confirma exclusão? Toque em Excluir novamente.
              </Text>
              <Button
                label="Excluir"
                onPress={() => void handleExcluir()}
                variant="destructive"
              />
              <Button
                label="Cancelar"
                onPress={() => setConfirmando(false)}
                variant="ghost"
              />
            </View>
          ) : (
            <Button
              label="Excluir"
              onPress={() => void handleExcluir()}
              variant="destructive"
            />
          )}
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
