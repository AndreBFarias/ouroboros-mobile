// Q19.b -- Form de criacao/edicao de Grupo de Treino. Reusado pelas
// rotas app/grupos/novo.tsx e app/grupos/[slug].tsx para evitar
// duplicacao. Reproduz padrao do FormRotina (Q11.a) na estrutura
// caller-side (inicial / onSubmit / onApagar opcional / rotuloSalvar).
//
// Body simples: Input nome + Textarea descricao + SeletorMultiRotinas
// (multi-select 1..10 rotinas existentes). Validacao no submit:
// nome obrigatorio, 1..10 slugs selecionados.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Trash2 } from '@/lib/icons';
import { Button, ConfirmarExclusao, Input, Textarea } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { SeletorMultiRotinas } from './SeletorMultiRotinas';

const NOME_MAX = 80;
const ROTINAS_MIN = 1;
const ROTINAS_MAX = 10;

export interface FormGrupoInicial {
  nome: string;
  descricao: string;
  rotina_slugs: string[];
}

export interface FormGrupoSubmit {
  nome: string;
  descricao: string | null;
  rotina_slugs: string[];
}

export interface FormGrupoProps {
  inicial?: FormGrupoInicial;
  onSubmit: (dados: FormGrupoSubmit) => Promise<void> | void;
  onCancelar: () => void;
  onApagar?: () => Promise<void> | void;
  rotuloSalvar?: string;
  salvando?: boolean;
}

export function FormGrupo({
  inicial,
  onSubmit,
  onCancelar,
  onApagar,
  rotuloSalvar = 'Salvar grupo',
  salvando = false,
}: FormGrupoProps): ReactNode {
  const [nome, setNome] = useState<string>(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState<string>(inicial?.descricao ?? '');
  const [rotinaSlugs, setRotinaSlugs] = useState<string[]>(
    inicial?.rotina_slugs ?? []
  );
  const [erro, setErro] = useState<string | null>(null);
  const [modalApagarVisivel, setModalApagarVisivel] = useState<boolean>(false);

  const validar = useCallback((): string | null => {
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length === 0) return 'Nome do grupo é obrigatório.';
    if (nomeLimpo.length > NOME_MAX) {
      return `Nome do grupo deve ter no máximo ${NOME_MAX} caracteres.`;
    }
    if (rotinaSlugs.length < ROTINAS_MIN) {
      return 'Selecione ao menos uma rotina.';
    }
    if (rotinaSlugs.length > ROTINAS_MAX) {
      return `Selecione no máximo ${ROTINAS_MAX} rotinas.`;
    }
    return null;
  }, [nome, rotinaSlugs]);

  const handleSalvar = useCallback(async () => {
    const motivo = validar();
    if (motivo) {
      setErro(motivo);
      haptics.error();
      return;
    }
    setErro(null);
    haptics.light();
    await onSubmit({
      nome: nome.trim(),
      descricao: descricao.trim().length > 0 ? descricao.trim() : null,
      rotina_slugs: rotinaSlugs,
    });
  }, [validar, onSubmit, nome, descricao, rotinaSlugs]);

  const handleConfirmarApagar = useCallback(async () => {
    if (!onApagar) return;
    setModalApagarVisivel(false);
    await onApagar();
  }, [onApagar]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.base,
        paddingBottom: spacing.huge,
        gap: spacing.base,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Input
        label="Nome"
        value={nome}
        onChangeText={(t) => {
          setNome(t.slice(0, NOME_MAX));
          if (erro) setErro(null);
        }}
        placeholder="Treino do Quaresma"
        accessibilityLabel="nome do grupo"
      />

      <Textarea
        label="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ciclo de hipertrofia, 6 semanas, com cardio leve nos dias B."
        accessibilityLabel="descricao do grupo"
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
          {`Rotinas no grupo (${rotinaSlugs.length}/${ROTINAS_MAX})`}
        </Text>
        <SeletorMultiRotinas
          selecionados={rotinaSlugs}
          onChange={(slugs) => {
            setRotinaSlugs(slugs);
            if (erro) setErro(null);
          }}
        />
      </View>

      {erro ? (
        <Text
          style={{
            color: colors.red,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
          accessibilityLiveRegion="polite"
        >
          {erro}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
        <Button
          label={rotuloSalvar}
          onPress={() => void handleSalvar()}
          variant="primary"
          disabled={salvando}
        />
        <Button label="Cancelar" onPress={onCancelar} variant="ghost" />
        {onApagar ? (
          <Pressable
            onPress={() => {
              haptics.light();
              setModalApagarVisivel(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="apagar grupo"
            style={{
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: spacing.xs,
            }}
          >
            <Trash2 size={16} color={colors.red} strokeWidth={2} />
            <Text
              style={{
                color: colors.red,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Apagar grupo
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* R-NAV-3-V2: confirmacao de apagar grupo via componente canonico. */}
      {onApagar ? (
        <ConfirmarExclusao
          visible={modalApagarVisivel}
          titulo="Excluir grupo?"
          descricao="Apenas o agrupamento será removido. As rotinas vinculadas permanecem disponíveis em /rotinas."
          onConfirmar={() => void handleConfirmarApagar()}
          onCancelar={() => setModalApagarVisivel(false)}
        />
      ) : null}
    </ScrollView>
  );
}
