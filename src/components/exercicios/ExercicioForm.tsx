// Tela 02 - Form de cadastro/edicao de exercicio. Encapsula toda a
// logica de campos para que /exercicios/novo.tsx e
// /exercicios/[slug]/editar.tsx compartilhem a mesma UI.
//
// Campos:
//  - Nome (Input)
//  - Grupo muscular (ChipGroup multi)
//  - Nivel (ChipGroup single)
//  - Equipamento (Input)
//  - Instrucao (Textarea)
//  - Dicas (lista dinamica de inputs com botao + e -)
//  - GIF (botao "Escolher GIF" via expo-document-picker)
//
// Mode 'novo' bloqueia edicao do slug; 'editar' tambem (slug e
// imutavel apos criacao). Botao Salvar dispara onSalvar com meta
// pronto para escrita.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  Button,
  ChipGroup,
  Input,
  Textarea,
  useToast,
  type ChipOption,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { slugifyExercicio } from '@/lib/exercicios/slug';
import { GRUPOS_MUSCULARES_OPTIONS } from '@/lib/exercicios/grupos';
import {
  ExercicioSchema,
  NivelExercicioSchema,
  type Exercicio,
  type NivelExercicio,
} from '@/lib/schemas/exercicio';

const NIVEIS: ChipOption[] = [
  { value: 'iniciante', label: 'Iniciante', accent: 'green' },
  { value: 'intermediario', label: 'Intermediário', accent: 'yellow' },
  { value: 'avancado', label: 'Avançado', accent: 'orange' },
];

export interface ExercicioFormProps {
  // Estado inicial. null em criacao, meta carregada em edicao.
  inicial: Exercicio | null;
  // Modo informa ao caller se deve criar arquivo ou atualizar.
  modo: 'novo' | 'editar';
  // Callback de salvar. Recebe meta validado e URI temporario do
  // GIF (null se usuario nao escolheu novo).
  onSalvar: (args: {
    meta: Exercicio;
    gifTemporario: string | null;
  }) => Promise<void> | void;
  onCancelar: () => void;
}

export function ExercicioForm({
  inicial,
  modo,
  onSalvar,
  onCancelar,
}: ExercicioFormProps) {
  const toast = useToast();

  const [nome, setNome] = useState<string>(inicial?.nome ?? '');
  const [grupos, setGrupos] = useState<string[]>(inicial?.grupo_muscular ?? []);
  const [nivel, setNivel] = useState<NivelExercicio | null>(
    inicial?.nivel ?? null
  );
  const [equipamento, setEquipamento] = useState<string>(
    inicial?.equipamento ?? ''
  );
  const [instrucao, setInstrucao] = useState<string>(inicial?.instrucao ?? '');
  const [dicas, setDicas] = useState<string[]>(inicial?.dicas ?? []);
  const [gifTemporario, setGifTemporario] = useState<string | null>(null);
  const [gifNomeArquivo, setGifNomeArquivo] = useState<string>(
    inicial?.gif ?? ''
  );
  const [salvando, setSalvando] = useState<boolean>(false);

  // Quando inicial muda (caso o componente seja remontado em edicao
  // depois do load), resincroniza estados.
  useEffect(() => {
    if (!inicial) return;
    setNome(inicial.nome);
    setGrupos(inicial.grupo_muscular);
    setNivel(inicial.nivel);
    setEquipamento(inicial.equipamento);
    setInstrucao(inicial.instrucao);
    setDicas(inicial.dicas);
    setGifNomeArquivo(inicial.gif);
  }, [inicial]);

  const adicionarDica = useCallback(() => {
    haptics.selection();
    setDicas((curr) => [...curr, '']);
  }, []);

  const removerDica = useCallback((idx: number) => {
    haptics.selection();
    setDicas((curr) => curr.filter((_, i) => i !== idx));
  }, []);

  const editarDica = useCallback((idx: number, valor: string) => {
    setDicas((curr) => curr.map((d, i) => (i === idx ? valor : d)));
  }, []);

  const escolherGif = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/gif',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      // Validacao de mime quando informado pelo picker. Em alguns
      // providers vem null; aceitamos nesse caso e a validacao real
      // de tamanho fica para saveExercicio.
      if (asset.mimeType && !asset.mimeType.includes('gif')) {
        haptics.error();
        toast.show('Selecione um arquivo .gif', 'error');
        return;
      }
      setGifTemporario(asset.uri);
      setGifNomeArquivo(asset.name);
      haptics.success();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao escolher GIF: ${msg}`, 'error');
    }
  }, [toast]);

  const podeSalvar =
    nome.trim().length > 0 &&
    grupos.length > 0 &&
    nivel !== null &&
    equipamento.trim().length > 0 &&
    instrucao.trim().length > 0;

  const handleSalvar = useCallback(async () => {
    if (!podeSalvar || !nivel) return;

    const slug =
      inicial?.slug ?? slugifyExercicio(nome.trim());

    const dicasLimpas = dicas.map((d) => d.trim()).filter((d) => d.length > 0);

    const meta: Exercicio = {
      tipo: 'exercicio',
      slug,
      nome: nome.trim(),
      grupo_muscular: grupos,
      nivel,
      equipamento: equipamento.trim(),
      instrucao: instrucao.trim(),
      dicas: dicasLimpas,
      gif: inicial?.gif ?? '',
      historico: inicial?.historico ?? [],
    };

    const parsed = ExercicioSchema.safeParse(meta);
    if (!parsed.success) {
      haptics.error();
      toast.show(`Dados inválidos: ${parsed.error.message}`, 'error');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({ meta: parsed.data, gifTemporario });
    } finally {
      setSalvando(false);
    }
  }, [
    podeSalvar,
    nivel,
    inicial,
    nome,
    grupos,
    equipamento,
    instrucao,
    dicas,
    gifTemporario,
    onSalvar,
    toast,
  ]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: spacing.base,
        paddingBottom: spacing.huge,
        gap: spacing.base,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Nome do exercício"
        value={nome}
        onChangeText={setNome}
        placeholder="Agachamento livre"
        accessibilityLabel="campo nome do exercicio"
      />

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
          Grupo muscular
        </Text>
        <ChipGroup
          mode="multi"
          options={GRUPOS_MUSCULARES_OPTIONS as never}
          value={grupos}
          onChange={setGrupos}
        />
      </View>

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
          Nível
        </Text>
        <ChipGroup
          mode="single"
          options={NIVEIS}
          value={nivel}
          onChange={(next) => {
            const parsed = next ? NivelExercicioSchema.safeParse(next) : null;
            setNivel(parsed && parsed.success ? parsed.data : null);
          }}
        />
      </View>

      <Input
        label="Equipamento"
        value={equipamento}
        onChangeText={setEquipamento}
        placeholder="Barra, halteres, peso corporal..."
        accessibilityLabel="campo equipamento"
      />

      <Textarea
        label="Instrução"
        value={instrucao}
        onChangeText={setInstrucao}
        placeholder="Como executar o movimento."
        accessibilityLabel="campo instrucao"
        minHeight={120}
      />

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
          Dicas (opcional)
        </Text>
        {dicas.map((d, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}
          >
            <View style={{ flex: 1 }}>
              <Input
                value={d}
                onChangeText={(v) => editarDica(i, v)}
                placeholder="Mantenha o tronco ereto"
                accessibilityLabel={`campo dica ${i + 1}`}
              />
            </View>
            <Pressable
              onPress={() => removerDica(i)}
              accessibilityRole="button"
              accessibilityLabel={`remover dica ${i + 1}`}
              hitSlop={8}
              style={{
                padding: 8,
              }}
            >
              <Trash2 size={20} color={colors.mutedDecor} strokeWidth={1.5} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={adicionarDica}
          accessibilityRole="button"
          accessibilityLabel="adicionar dica"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingVertical: 8,
          }}
        >
          <Plus size={18} color={colors.purple} strokeWidth={1.5} />
          <Text
            style={{
              color: colors.purple,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Adicionar dica
          </Text>
        </Pressable>
      </View>

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
          GIF demonstrativo (opcional, máx 5 MB)
        </Text>
        <Button
          label={gifNomeArquivo ? 'Trocar GIF' : 'Escolher GIF'}
          onPress={() => void escolherGif()}
          variant="ghost"
        />
        {gifNomeArquivo ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {gifNomeArquivo}
          </Text>
        ) : null}
      </View>

      {/* Botoes finais */}
      <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
        <Button
          label={modo === 'novo' ? 'Criar exercício' : 'Salvar alterações'}
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
      </View>
    </ScrollView>
  );
}
