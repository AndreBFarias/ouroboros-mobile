// Sub-tela de Settings -> Vault (H3, M-VAULT-PASTA-NAO-HARDCODED,
// ADR-0022). Permite ao usuario:
//   - Visualizar o path atual do Vault (truncado se longo).
//   - Trocar a pasta do Vault via SAF picker apos confirmar que os
//     dados antigos NAO sao movidos automaticamente.
//   - Reinicializar a pasta atual: recria as 8 subpastas canonicas
//     (markdown, png, jpg, m4a, mp4, pdf, gif, .ouroboros/cache) e
//     persiste de novo o vaultRoot.
//
// Decisao H3 (spec §7): trocar pasta NAO move dados. A migracao
// SAF<->SAF e cara e o usuario pode preferir manter historico
// antigo. Diagonal explicita do tipo "exporta ZIP, importa no novo"
// fica como fluxo manual sugerido pelo dialogo de confirmacao.
//
// Comentarios sem acento (convencao shell/CI). Strings UI em
// Sentence case com acentuacao PT-BR completa.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Screen, useToast } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import {
  inicializarVaultEscolhido,
  requestVaultPermission,
} from '@/lib/vault/permissions';
import { useVault } from '@/lib/stores/vault';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function VaultTela() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [confirmandoTroca, setConfirmandoTroca] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const trocarPasta = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const uri = await requestVaultPermission();
      if (!uri) {
        // Usuario cancelou o picker. Nada a fazer.
        setConfirmandoTroca(false);
        return;
      }
      await inicializarVaultEscolhido(uri);
      toast.show('Pasta do Vault atualizada.', 'success');
      setConfirmandoTroca(false);
    } catch {
      toast.show('Não foi possível usar essa pasta. Tente novamente.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const reinicializar = async () => {
    if (ocupado) return;
    if (!vaultRoot) {
      toast.show('Nenhuma pasta configurada ainda.', 'warn');
      return;
    }
    haptics.medium();
    setOcupado(true);
    try {
      await inicializarVaultEscolhido(vaultRoot);
      toast.show('Pasta verificada.', 'success');
    } catch {
      toast.show('Falha ao verificar a pasta.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Screen>
      <Header title="Vault" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SecaoLista titulo="Pasta atual" accessibilityLabel="secao pasta atual">
          <BlocoPathAtual vaultRoot={vaultRoot} />
        </SecaoLista>

        <SecaoLista titulo="Ações" accessibilityLabel="secao acoes vault">
          {confirmandoTroca ? (
            <BlocoConfirmacaoTroca
              ocupado={ocupado}
              onConfirmar={() => void trocarPasta()}
              onCancelar={() => setConfirmandoTroca(false)}
            />
          ) : (
            <Button
              label="Trocar pasta do Vault"
              variant="ghost"
              onPress={() => {
                haptics.light();
                setConfirmandoTroca(true);
              }}
              accessibilityLabel="trocar pasta do vault"
            />
          )}

          <Button
            label="Reinicializar pasta"
            variant="ghost"
            onPress={() => void reinicializar()}
            disabled={ocupado || !vaultRoot}
            accessibilityLabel="reinicializar pasta do vault"
          />
        </SecaoLista>
      </ScrollView>
    </Screen>
  );
}

function BlocoPathAtual({ vaultRoot }: { vaultRoot: string | null }) {
  const valor = vaultRoot ?? 'Nenhuma pasta configurada.';
  return (
    <View
      accessibilityLabel="bloco path atual"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.xs,
        minHeight: 56,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        Caminho
      </Text>
      <Text
        accessibilityLabel="path vault atual"
        numberOfLines={3}
        ellipsizeMode="middle"
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
          lineHeight: typography.body.size * typography.body.lineHeight,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}

interface BlocoConfirmacaoTrocaProps {
  ocupado: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Aviso explicito antes do SAF picker abrir. Trocar a pasta NAO move
// dados antigos automaticamente (decisao H3 spec §7). O usuario
// continua tendo acesso ao historico via export/import ZIP do
// Settings principal.
function BlocoConfirmacaoTroca({
  ocupado,
  onConfirmar,
  onCancelar,
}: BlocoConfirmacaoTrocaProps) {
  return (
    <View
      accessibilityLabel="confirmacao trocar pasta"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.body.size,
          lineHeight: typography.body.size * typography.body.lineHeight,
        }}
      >
        Confirmar troca da pasta?
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        Os dados ficam na pasta antiga. Mova manualmente se quiser levar o
        histórico junto, ou exporte um backup pela tela anterior antes de
        trocar.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Cancelar"
            variant="ghost"
            onPress={onCancelar}
            disabled={ocupado}
            accessibilityLabel="cancelar troca pasta"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Continuar"
            onPress={onConfirmar}
            disabled={ocupado}
            accessibilityLabel="confirmar troca pasta"
          />
        </View>
      </View>
    </View>
  );
}
