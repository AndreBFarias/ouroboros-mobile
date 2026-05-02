// Sheet para criacao manual de marco. Abre em snap 70%. Form:
//  - Textarea descricao (obrigatória, min 1 char).
//  - ChipGroup multi de tags (sugestoes pre-definidas + livre).
//  - Botao Salvar verde.
//
// Decisão M11 §10 - sem ranking, badge ou pontuacao. Marco e
// descritivo neutro.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  Button,
  ChipGroup,
  useToast,
  type ChipOption,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { saveMarco } from '@/lib/marcos/saveMarco';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import type { Marco } from '@/lib/schemas/marco';

const TAGS_SUGERIDAS: ChipOption[] = [
  { value: 'treino', label: 'Treino', accent: 'green' },
  { value: 'consistencia', label: 'Consistência', accent: 'cyan' },
  { value: 'emocional', label: 'Emocional', accent: 'purple' },
  { value: 'vitoria', label: 'Vitória', accent: 'green' }, // anonimato-allow: substantivo comum sucesso/conquista
  { value: 'retomada', label: 'Retomada', accent: 'yellow' },
];

export interface SheetNovoMarcoProps {
  onSalvo: () => void;
  onCancelar: () => void;
}

export function SheetNovoMarco({
  onSalvo,
  onCancelar,
}: SheetNovoMarcoProps): ReactNode {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [descricao, setDescricao] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [salvando, setSalvando] = useState<boolean>(false);

  const podeSalvar = descricao.trim().length > 0;

  const handleSalvar = useCallback(async () => {
    if (!podeSalvar || !vaultRoot) {
      toast.show('Vault não conectado.', 'error');
      return;
    }
    setSalvando(true);
    try {
      const agora = new Date();
      const TZ = -180;
      const local = new Date(agora.getTime() + TZ * 60_000);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      const hh = String(local.getUTCHours()).padStart(2, '0');
      const mm = String(local.getUTCMinutes()).padStart(2, '0');

      const meta: Marco = {
        tipo: 'marco',
        data: `${y}-${m}-${d}T${hh}:${mm}:00-03:00`,
        autor: pessoaAtiva,
        descricao: descricao.trim(),
        tags,
        auto: false,
      };

      await saveMarco({ meta, vaultRoot });
      // Marco anotado é vitória — respeita Settings.somVibracao.vitoria.
      haptics.vitoria();
      toast.show('Marco anotado.', 'success');
      onSalvo();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao salvar: ${msg}`, 'error');
    } finally {
      setSalvando(false);
    }
  }, [podeSalvar, vaultRoot, pessoaAtiva, descricao, tags, toast, onSalvo]);

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
          Novo marco
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
            Descrição
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
              minHeight: 96,
              paddingHorizontal: spacing.base,
              paddingVertical: 12,
            }}
          >
            <BottomSheetTextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Sete dias de prática constante."
              placeholderTextColor={colors.mutedDecor}
              multiline
              textAlignVertical="top"
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 72,
              }}
              accessibilityLabel="campo descricao do marco"
            />
          </View>
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
            Tags
          </Text>
          <ChipGroup
            mode="multi"
            options={TAGS_SUGERIDAS}
            value={tags}
            onChange={setTags}
          />
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label="Salvar"
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
