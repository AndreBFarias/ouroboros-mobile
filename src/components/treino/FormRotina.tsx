// Form de criacao/edicao de Rotina de Treino (Q11.a). Reusado por
// app/rotinas/novo.tsx e app/rotinas/[slug].tsx para evitar duplicacao
// de logica de input + validacao + lista dinamica de exercicios.
//
// Caller fornece:
//  - inicial: dados pre-existentes (edicao) ou null (criacao).
//  - onSubmit: callback acionado quando o usuario aperta Salvar com
//    form valido. Recebe os 3 campos do nivel da rotina + array de
//    exercicios. Caller monta RotinaMeta completo (slug, autor,
//    data_criacao) e persiste.
//  - onApagar: opcional. Quando definido renderiza botao "Apagar" no
//    rodape (com confirmation). Caller decide o que fazer (excluir
//    + back). Quando undefined, botao nao aparece.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Trash2 } from '@/lib/icons';
import { Button, Input, Textarea } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import type { ExercicioRotina } from '@/lib/schemas/rotina';

export interface FormRotinaInicial {
  nome: string;
  descricao: string;
  exercicios: ExercicioRotina[];
}

export interface FormRotinaSubmit {
  nome: string;
  descricao: string | null;
  exercicios: ExercicioRotina[];
}

export interface FormRotinaProps {
  inicial?: FormRotinaInicial;
  onSubmit: (dados: FormRotinaSubmit) => Promise<void> | void;
  onCancelar: () => void;
  onApagar?: () => Promise<void> | void;
  rotuloSalvar?: string;
  salvando?: boolean;
}

// Linha individual de exercicio na lista. carga_kg null = peso
// corporal (input vazio nesse caso); usuario digita numero pra mudar.
interface LinhaExercicioProps {
  index: number;
  exercicio: ExercicioRotina;
  onChange: (patch: Partial<ExercicioRotina>) => void;
  onRemover: () => void;
}

function LinhaExercicio({
  index,
  exercicio,
  onChange,
  onRemover,
}: LinhaExercicioProps) {
  const [cargaTexto, setCargaTexto] = useState<string>(
    exercicio.carga_kg === null ? '' : String(exercicio.carga_kg)
  );
  const [seriesTexto, setSeriesTexto] = useState<string>(
    String(exercicio.series)
  );
  const [descansoTexto, setDescansoTexto] = useState<string>(
    String(exercicio.descanso_seg)
  );

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        padding: spacing.base,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.bgElev,
      }}
      accessibilityLabel={`exercicio ${index + 1}`}
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
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {`Exercício ${index + 1}`}
        </Text>
        <Pressable
          onPress={onRemover}
          accessibilityRole="button"
          accessibilityLabel={`remover exercicio ${index + 1}`}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <Trash2 size={16} color={colors.mutedDecor} strokeWidth={1.5} />
        </Pressable>
      </View>

      <Input
        label="Nome"
        value={exercicio.nome}
        onChangeText={(v) => onChange({ nome: v })}
        placeholder="Ex.: Agachamento"
        accessibilityLabel={`nome exercicio ${index + 1}`}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text className="font-mono text-muted text-xs mb-2">Carga (kg)</Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
            }}
          >
            <TextInput
              value={cargaTexto}
              onChangeText={(v) => {
                setCargaTexto(v);
                const limpo = v.replace(',', '.').trim();
                if (limpo.length === 0) {
                  onChange({ carga_kg: null });
                  return;
                }
                const n = parseFloat(limpo);
                if (Number.isFinite(n) && n >= 0) {
                  onChange({ carga_kg: n });
                }
              }}
              keyboardType="decimal-pad"
              placeholder="vazio = peso corporal"
              placeholderTextColor={colors.mutedDecor}
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              accessibilityLabel={`carga exercicio ${index + 1}`}
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text className="font-mono text-muted text-xs mb-2">Séries</Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
            }}
          >
            <TextInput
              value={seriesTexto}
              onChangeText={(v) => {
                setSeriesTexto(v);
                const n = parseInt(v.trim(), 10);
                if (Number.isFinite(n) && n > 0) {
                  onChange({ series: n });
                }
              }}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={colors.mutedDecor}
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              accessibilityLabel={`series exercicio ${index + 1}`}
            />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Reps"
            value={exercicio.reps}
            onChangeText={(v) => onChange({ reps: v })}
            placeholder="12 ou 8-10 ou amrap"
            accessibilityLabel={`reps exercicio ${index + 1}`}
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-mono text-muted text-xs mb-2">
            Descanso (s)
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
            }}
          >
            <TextInput
              value={descansoTexto}
              onChangeText={(v) => {
                setDescansoTexto(v);
                const n = parseInt(v.trim(), 10);
                if (Number.isFinite(n) && n > 0) {
                  onChange({ descanso_seg: n });
                }
              }}
              keyboardType="number-pad"
              placeholder="90"
              placeholderTextColor={colors.mutedDecor}
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              accessibilityLabel={`descanso exercicio ${index + 1}`}
            />
          </View>
        </View>
      </View>

      <Input
        label="Observação"
        value={exercicio.observacao ?? ''}
        onChangeText={(v) =>
          onChange({ observacao: v.length > 0 ? v : null })
        }
        placeholder="Opcional"
        accessibilityLabel={`observacao exercicio ${index + 1}`}
      />
    </View>
  );
}

function exercicioVazio(): ExercicioRotina {
  return {
    nome: '',
    carga_kg: null,
    series: 3,
    reps: '10',
    descanso_seg: 90,
    observacao: null,
  };
}

export function FormRotina({
  inicial,
  onSubmit,
  onCancelar,
  onApagar,
  rotuloSalvar = 'Salvar',
  salvando = false,
}: FormRotinaProps) {
  const [nome, setNome] = useState<string>(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState<string>(inicial?.descricao ?? '');
  const [exercicios, setExercicios] = useState<ExercicioRotina[]>(
    inicial && inicial.exercicios.length > 0
      ? inicial.exercicios
      : [exercicioVazio()]
  );
  const [modalApagar, setModalApagar] = useState<boolean>(false);
  const [modalRemoverIndex, setModalRemoverIndex] = useState<number | null>(
    null
  );

  const adicionarExercicio = useCallback(() => {
    haptics.light();
    setExercicios((curr) => {
      if (curr.length >= 20) return curr;
      return [...curr, exercicioVazio()];
    });
  }, []);

  const editarExercicio = useCallback(
    (index: number, patch: Partial<ExercicioRotina>) => {
      setExercicios((curr) =>
        curr.map((e, i) => (i === index ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const pedirRemover = useCallback(
    (index: number) => {
      const ex = exercicios[index];
      const temDados =
        ex.nome.trim().length > 0 ||
        (ex.observacao !== null && ex.observacao.trim().length > 0);
      if (temDados) {
        setModalRemoverIndex(index);
      } else {
        removerConfirmado(index);
      }
    },
    [exercicios]
  );

  const removerConfirmado = useCallback((index: number) => {
    haptics.medium();
    setExercicios((curr) => {
      if (curr.length <= 1) return curr;
      return curr.filter((_, i) => i !== index);
    });
    setModalRemoverIndex(null);
  }, []);

  const podeSalvar =
    nome.trim().length > 0 &&
    exercicios.length >= 1 &&
    exercicios.every((e) => e.nome.trim().length > 0 && e.reps.trim().length > 0);

  const handleSalvar = useCallback(async () => {
    if (!podeSalvar || salvando) return;
    await onSubmit({
      nome: nome.trim(),
      descricao: descricao.trim().length > 0 ? descricao.trim() : null,
      exercicios: exercicios.map((e) => ({
        ...e,
        nome: e.nome.trim(),
        reps: e.reps.trim(),
        observacao:
          e.observacao !== null && e.observacao.trim().length > 0
            ? e.observacao.trim()
            : null,
      })),
    });
  }, [podeSalvar, salvando, nome, descricao, exercicios, onSubmit]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Treino A — peito e tríceps"
          accessibilityLabel="nome da rotina"
        />

        <Textarea
          label="Descrição (opcional)"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Foco, dia da semana, lembretes."
          accessibilityLabel="descricao da rotina"
        />

        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Exercícios
          </Text>

          {exercicios.map((ex, idx) => (
            <LinhaExercicio
              key={`ex-${idx}`}
              index={idx}
              exercicio={ex}
              onChange={(patch) => editarExercicio(idx, patch)}
              onRemover={() => pedirRemover(idx)}
            />
          ))}

          <Button
            label="Adicionar exercício"
            onPress={adicionarExercicio}
            variant="ghost"
            disabled={exercicios.length >= 20}
          />
          {exercicios.length >= 20 ? (
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 16,
                textAlign: 'center',
              }}
            >
              Cap de 20 exercícios por rotina.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: spacing.base, gap: spacing.sm }}>
        <Button
          label={rotuloSalvar}
          onPress={() => void handleSalvar()}
          variant="primary"
          disabled={!podeSalvar || salvando}
        />
        <Button
          label="Cancelar"
          onPress={onCancelar}
          variant="ghost"
          disabled={salvando}
        />
        {onApagar ? (
          <Button
            label="Apagar"
            onPress={() => setModalApagar(true)}
            variant="destructive"
            disabled={salvando}
          />
        ) : null}
      </View>

      {/* Modal confirmar apagar rotina */}
      <Modal
        visible={modalApagar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalApagar(false)}
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
            accessibilityLabel="modal confirmar apagar rotina"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Apagar rotina?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              A rotina será removida. Sessões de treino já salvas com esta
              rotina continuam intactas.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar"
                onPress={() => {
                  setModalApagar(false);
                  if (onApagar) void onApagar();
                }}
                variant="destructive"
                disabled={salvando}
              />
              <Button
                label="Cancelar"
                onPress={() => setModalApagar(false)}
                variant="ghost"
                disabled={salvando}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal confirmar remover exercicio (apenas se tinha dados) */}
      <Modal
        visible={modalRemoverIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRemoverIndex(null)}
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
            accessibilityLabel="modal confirmar remover exercicio"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Remover exercício?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              Os dados deste exercício serão descartados.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar"
                onPress={() => {
                  if (modalRemoverIndex !== null) {
                    removerConfirmado(modalRemoverIndex);
                  }
                }}
                variant="destructive"
              />
              <Button
                label="Cancelar"
                onPress={() => setModalRemoverIndex(null)}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
