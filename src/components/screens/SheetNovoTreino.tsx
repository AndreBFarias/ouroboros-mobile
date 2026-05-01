// Sheet para criacao/edicao de sessao de treino formal. Abre em
// snap 90%. Form:
//  - Input rotina (texto livre).
//  - Slider duracao_min 1-240.
//  - ChipGroup exercicios (do exercicios/) - usuario seleciona quais
//    exercicios usou; cada selecao gera entrada na lista com series/
//    reps/carga editaveis.
//  - Textarea observacoes.
//  - Botao Salvar verde.
//
// Edicao (`inicial` != null) preserva a rotina, duracao, lista; o
// caller pode passar `slugOverride` ao salvar para preservar o slug
// do .md original. Em criacao novo arquivo deriva slug da rotina.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Trash2 } from 'lucide-react-native';
import {
  Button,
  ChipGroup,
  Slider,
  useToast,
  type ChipOption,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { saveTreino } from '@/lib/treinos/saveTreino';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarExercicios } from '@/lib/vault/exercicios';
import type { Exercicio } from '@/lib/schemas/exercicio';
import type {
  TreinoSessao,
  ExercicioSessao,
} from '@/lib/schemas/treino_sessao';

export interface SheetNovoTreinoProps {
  // Quando null = criacao; quando preenchido = edicao com pre-fill.
  inicial: TreinoSessao | null;
  // Path relativo do .md original (ex: 'treinos/2026-04-23-rotina-a.md').
  // Caller fornece em edicao para preservar slug.
  slugOriginal?: string;
  onSalvo: () => void;
  onCancelar: () => void;
}

export function SheetNovoTreino({
  inicial,
  slugOriginal,
  onSalvo,
  onCancelar,
}: SheetNovoTreinoProps): ReactNode {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [rotina, setRotina] = useState<string>(inicial?.rotina ?? '');
  const [duracao, setDuracao] = useState<number>(inicial?.duracao_min ?? 30);
  const [observacoes, setObservacoes] = useState<string>(
    inicial?.observacoes ?? ''
  );
  const [exercicios, setExercicios] = useState<ExercicioSessao[]>(
    inicial?.exercicios ?? []
  );
  const [salvando, setSalvando] = useState<boolean>(false);
  const [exerciciosBiblioteca, setExerciciosBiblioteca] = useState<
    Exercicio[]
  >([]);

  // Carrega lista de exercicios da biblioteca para popular o ChipGroup.
  useEffect(() => {
    if (!vaultRoot) return;
    void (async () => {
      try {
        const lista = await listarExercicios(vaultRoot);
        setExerciciosBiblioteca(lista);
      } catch {
        // Silencioso - sheet pode operar com lista vazia (usuario
        // adiciona via input livre ou cria exercicio antes).
      }
    })();
  }, [vaultRoot]);

  // Sincroniza com inicial em remount.
  useEffect(() => {
    if (!inicial) return;
    setRotina(inicial.rotina ?? '');
    setDuracao(inicial.duracao_min);
    setObservacoes(inicial.observacoes ?? '');
    setExercicios(inicial.exercicios);
  }, [inicial]);

  const opcoesExercicios: ChipOption[] = useMemo(
    () =>
      exerciciosBiblioteca.map((e) => ({
        value: e.nome,
        label: e.nome,
        accent: 'purple' as const,
      })),
    [exerciciosBiblioteca]
  );

  const valoresSelecionados = useMemo(
    () => exercicios.map((e) => e.nome),
    [exercicios]
  );

  const toggleExercicio = useCallback((nomes: string[]) => {
    setExercicios((curr) => {
      const map = new Map(curr.map((e) => [e.nome, e]));
      const next: ExercicioSessao[] = nomes.map(
        (nome) =>
          map.get(nome) ?? {
            nome,
            series: 3,
            reps: 10,
          }
      );
      return next;
    });
  }, []);

  const editarExercicio = useCallback(
    (idx: number, patch: Partial<ExercicioSessao>) => {
      setExercicios((curr) =>
        curr.map((e, i) => (i === idx ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const removerExercicio = useCallback((idx: number) => {
    haptics.selection();
    setExercicios((curr) => curr.filter((_, i) => i !== idx));
  }, []);

  const podeSalvar =
    rotina.trim().length > 0 &&
    duracao >= 1 &&
    duracao <= 240 &&
    exercicios.length >= 1;

  const handleSalvar = useCallback(async () => {
    if (!podeSalvar || !vaultRoot) {
      toast.show('Vault não conectado.', 'error');
      return;
    }
    setSalvando(true);
    try {
      const agora = inicial ? new Date(inicial.data) : new Date();
      const TZ = -180;
      const local = new Date(agora.getTime() + TZ * 60_000);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      const hh = String(local.getUTCHours()).padStart(2, '0');
      const mm = String(local.getUTCMinutes()).padStart(2, '0');

      const meta: TreinoSessao = {
        tipo: 'treino_sessao',
        data: `${y}-${m}-${d}T${hh}:${mm}:00-03:00`,
        autor: pessoaAtiva,
        rotina: rotina.trim(),
        duracao_min: duracao,
        exercicios,
        observacoes: observacoes.trim().length > 0 ? observacoes.trim() : undefined,
      };

      // Em edicao, preserva slug original (extraido do path).
      const slugOverride = slugOriginal
        ? slugOriginal
            .split('/')
            .pop()
            ?.replace(/\.md$/, '')
            ?.replace(/^\d{4}-\d{2}-\d{2}-/, '')
        : undefined;

      await saveTreino({ meta, vaultRoot, slugOverride });
      haptics.success();
      toast.show('Treino salvo.', 'success');
      onSalvo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao salvar: ${msg}`, 'error');
    } finally {
      setSalvando(false);
    }
  }, [
    podeSalvar,
    vaultRoot,
    pessoaAtiva,
    rotina,
    duracao,
    exercicios,
    observacoes,
    inicial,
    slugOriginal,
    toast,
    onSalvo,
  ]);

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {inicial ? 'Editar treino' : 'Novo treino'}
        </Text>

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
            Rotina
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
              paddingHorizontal: spacing.base,
              paddingVertical: 12,
            }}
          >
            <BottomSheetTextInput
              value={rotina}
              onChangeText={setRotina}
              placeholder="Rotina A"
              placeholderTextColor={colors.mutedDecor}
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 24,
              }}
              accessibilityLabel="campo rotina do treino"
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Slider
            value={duracao}
            min={1}
            max={240}
            step={5}
            onChange={setDuracao}
            label="Duração (min)"
            accessibilityLabel="slider duracao do treino"
          />
        </View>

        {opcoesExercicios.length > 0 ? (
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
              Exercícios
            </Text>
            <ChipGroup
              mode="multi"
              options={opcoesExercicios}
              value={valoresSelecionados}
              onChange={toggleExercicio}
            />
          </View>
        ) : (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Cadastre exercícios na aba Galeria antes de montar um
            treino.
          </Text>
        )}

        {exercicios.map((ex, idx) => (
          <View
            key={`ex-${idx}-${ex.nome}`}
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 12,
              padding: spacing.base,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 14,
                  lineHeight: 22,
                }}
                numberOfLines={1}
              >
                {ex.nome}
              </Text>
              <Pressable
                onPress={() => removerExercicio(idx)}
                accessibilityRole="button"
                accessibilityLabel={`remover ${ex.nome}`}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Trash2 size={16} color={colors.mutedDecor} strokeWidth={1.5} />
              </Pressable>
            </View>
            <Slider
              value={ex.series}
              min={1}
              max={20}
              step={1}
              onChange={(v) => editarExercicio(idx, { series: v })}
              label="Séries"
              accessibilityLabel={`series ${ex.nome}`}
            />
            <Slider
              value={ex.reps}
              min={1}
              max={100}
              step={1}
              onChange={(v) => editarExercicio(idx, { reps: v })}
              label="Reps"
              accessibilityLabel={`reps ${ex.nome}`}
            />
            <Slider
              value={ex.carga_kg ?? 0}
              min={0}
              max={300}
              step={1}
              onChange={(v) =>
                editarExercicio(idx, { carga_kg: v > 0 ? v : undefined })
              }
              label="Carga (kg)"
              accessibilityLabel={`carga ${ex.nome}`}
            />
          </View>
        ))}

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
            Observações (opcional)
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
              minHeight: 72,
              paddingHorizontal: spacing.base,
              paddingVertical: 12,
            }}
          >
            <BottomSheetTextInput
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Como foi o treino, sensações."
              placeholderTextColor={colors.mutedDecor}
              multiline
              textAlignVertical="top"
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 56,
              }}
              accessibilityLabel="campo observacoes do treino"
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label={inicial ? 'Salvar alterações' : 'Salvar'}
            onPress={() => void handleSalvar()}
            variant="success"
            disabled={!podeSalvar || salvando}
          />
          <Button
            label="Cancelar"
            onPress={onCancelar}
            variant="ghost"
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
