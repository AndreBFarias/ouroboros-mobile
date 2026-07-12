// Tela de configuracao do widget Quick To-do (R-WIDG-1, 2026-05-17).
//
// E uma "configuration activity" leve no formato Expo Router. Nao
// substitui a Android Configuration Activity nativa (que abriria
// automaticamente ao arrastar o widget para a home; pulada por
// simplicidade conforme spec "opcional, pode usar default"). Esta
// tela existe para o usuario entender o que o widget faz, ver
// instrucoes de uso e processar a fila pendente manualmente quando
// quiser forcar sync (sem esperar boot).
//
// Acesso: o item "Widget tarefas" em Settings -> Features aponta
// pra aqui via deep link /widget-config.
//
// Strings em Sentence case com acentuacao PT-BR completa
// (BRIEFING.md secao 1.4). Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListChecks } from '@/lib/icons';
import {
  Button,
  Card,
  EmptyState,
  Header,
  Screen,
  Toggle,
  useToast,
} from '@/components/ui';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import {
  drenarFilaTodoWidget,
  sincronizarCountPendentes,
} from '@/lib/widget/sincronizarWidget';
import { colors, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

export default function WidgetConfigTela() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const widgetAtivo = useSettings(
    (s) => s.featureToggles.widgetHomescreen
  );
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);
  const [sincronizando, setSincronizando] = useState<boolean>(false);

  // Aciona o drain manual: le entries pendentes da fila do widget,
  // cria Tarefas reais e atualiza count. Toast em PT-BR completo.
  const handleSincronizarAgora = useCallback(async () => {
    if (!vaultRoot) {
      toast.show('Vault não conectado.', 'error');
      return;
    }
    setSincronizando(true);
    try {
      const resultado = await drenarFilaTodoWidget();
      haptics.success();
      if (resultado.tentadas === 0) {
        toast.show('Nada pendente no widget.', 'success');
      } else {
        toast.show(
          `Sincronizadas ${resultado.criadas} de ${resultado.tentadas} tarefas.`,
          'success'
        );
      }
    } catch {
      haptics.error();
      toast.show('Não foi possível sincronizar.', 'error');
    } finally {
      setSincronizando(false);
    }
  }, [vaultRoot, toast]);

  // Atualiza so o count exibido pelo widget sem drenar fila. Util
  // para confirmar que count reflete estado pos-edicao manual.
  const handleAtualizarCount = useCallback(async () => {
    setSincronizando(true);
    try {
      await sincronizarCountPendentes();
      haptics.light();
      toast.show('Count atualizado.', 'success');
    } catch {
      haptics.error();
      toast.show('Não foi possível atualizar.', 'error');
    } finally {
      setSincronizando(false);
    }
  }, [toast]);

  return (
    <Screen>
      <Header title="Widget tarefas" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityRole="text" style={{ marginBottom: spacing.lg }}>
          <EmptyState
            frase="Adicione tarefas direto da tela inicial."
            Icon={ListChecks}
          />
        </View>

        <Card>
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.body.size,
              marginBottom: spacing.sm,
            }}
          >
            Como usar
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
              lineHeight: typography.caption.size * 1.6,
            }}
          >
            Pressione e segure na tela inicial, escolha "Widgets" e
            arraste "Ouroboros tarefas" para o lugar desejado. Toque no
            campo para escrever uma nova tarefa, depois confirme. A
            tarefa aparece em "Tarefas" na próxima abertura do app.
          </Text>
        </Card>

        <View style={{ height: spacing.lg }} />

        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: typography.body.size,
              }}
            >
              Widget ativo
            </Text>
            <Toggle
              value={widgetAtivo}
              onChange={(v) => setFeatureToggle('widgetHomescreen', v)}
              accessibilityLabel="toggle widget tarefas"
            />
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
              lineHeight: typography.caption.size * 1.6,
            }}
          >
            Quando desligado, o widget mostra zero pendentes e novas
            entradas pelo widget só aparecem aqui depois de religar.
          </Text>
        </Card>

        <View style={{ height: spacing.lg }} />

        <Button
          label="Sincronizar agora"
          variant="primary"
          onPress={handleSincronizarAgora}
          disabled={sincronizando}
          accessibilityLabel="sincronizar fila widget agora"
        />
        <View style={{ height: spacing.sm }} />
        <Button
          label="Atualizar contador"
          variant="ghost"
          onPress={handleAtualizarCount}
          disabled={sincronizando}
          accessibilityLabel="atualizar contador widget"
        />
      </ScrollView>
    </Screen>
  );
}
