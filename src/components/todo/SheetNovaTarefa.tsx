// BottomSheet para criar tarefa nova ou editar existente (M17). Snap
// 60%. Conteudo: titulo (Text "Nova tarefa" / "Editar tarefa") +
// input com autoFocus + botoes Salvar / Cancelar.
//
// Caller cuida de abrir/fechar o sheet (ref.expand/close); este
// componente apenas renderiza o conteudo interno e dispara onSalvar
// com o titulo. Estado interno do input persiste entre abrir/fechar
// se caller não desmontar.
//
// Armadilha A17 (BRIEF): BottomSheetTextInput com autoFocus em RN Web
// dispara erro 'RNTextInput.default.State.currentlyFocusedInput is
// not a function'. Em nativo (Android/iOS) funciona normalmente.
// Mantemos autoFocus condicional para preservar UX em mobile e
// permitir validação Nível A em web.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import {
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export interface SheetNovaTarefaProps {
  // Titulo inicial. Em modo criacao = ''. Em modo edicao = titulo
  // atual da tarefa.
  tituloInicial?: string;
  // Modo de operacao: 'criar' (default) ou 'editar'. Ajusta o cabecalho
  // do sheet e o label do botao primario.
  modo?: 'criar' | 'editar';
  onSalvar: (titulo: string) => void;
  onCancelar: () => void;
  // Quando true, bloqueia botao Salvar (durante I/O). Caller controla.
  salvando?: boolean;
}

export function SheetNovaTarefa({
  tituloInicial = '',
  modo = 'criar',
  onSalvar,
  onCancelar,
  salvando = false,
}: SheetNovaTarefaProps): ReactNode {
  const [titulo, setTitulo] = useState<string>(tituloInicial);

  // Re-sincroniza estado interno quando caller troca tituloInicial
  // (ex: long-press editar em outra tarefa). Effect simples para
  // resetar o input.
  useEffect(() => {
    setTitulo(tituloInicial);
  }, [tituloInicial]);

  const podeSalvar = titulo.trim().length > 0;
  const cabecalho = modo === 'criar' ? 'Nova tarefa' : 'Editar tarefa';
  const labelBotao = modo === 'criar' ? 'Salvar' : 'Atualizar';

  const handleSalvar = () => {
    if (!podeSalvar || salvando) return;
    onSalvar(titulo.trim());
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
          {cabecalho}
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
            Título
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.bgElev,
              paddingHorizontal: spacing.base,
              paddingVertical: 10,
            }}
          >
            <BottomSheetTextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Comprar pão"
              placeholderTextColor={colors.mutedDecor}
              autoFocus={Platform.OS !== 'web'}
              autoCapitalize="sentences"
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 44,
              }}
              accessibilityLabel="campo titulo da tarefa"
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label={labelBotao}
            onPress={handleSalvar}
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
    </BottomSheetView>
  );
}
