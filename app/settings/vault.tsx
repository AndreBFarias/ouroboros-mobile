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
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Screen, useToast } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { CardStatus } from '@/components/settings/CardStatus';
import {
  descreverDelta,
  verificarSyncStatus,
  type SyncStatus,
} from '@/lib/services/syncStatus';
import {
  inicializarVaultEscolhido,
  requestVaultPermission,
} from '@/lib/vault/permissions';
import { useVault } from '@/lib/stores/vault';
import { haptics } from '@/lib/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function VaultTela() {
  const router = useRouter();
  // R-HOME-4f: reserva a zona do FABMenu global para a ultima secao nao
  // ficar atras do FAB.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
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
          paddingBottom: paddingBottomFab,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SecaoLista titulo="Pasta atual" accessibilityLabel="secao pasta atual">
          <BlocoPathAtual vaultRoot={vaultRoot} />
          <BlocoStatusSync vaultRoot={vaultRoot} />
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

// AUDIT-P2-7-SYNCSTATUS-M15 (2026-09-05): o servico
// lib/services/syncStatus.ts e o componente settings/CardStatus.tsx
// existiam desde o M15 e nunca tinham sido renderizados -- nenhum
// import, nenhum caller. Este bloco liga os dois. E o unico lugar do
// app onde da' pra saber se o Vault sincronizou (ADR-0002: o mobile
// "so observa status e mostra na UI").
//
// Os quatro estados sao derivados de vaultRoot E de status, nao so da
// cor: em web verificarSyncStatus devolve 'desconhecido' tanto com
// pasta quanto sem pasta (syncStatus.ts:43), e as duas situacoes
// merecem copy diferente.
//
// RESSALVA conhecida (nao resolvida nesta sprint, ver NAO-objetivo 8):
// a heuristica de conflito olha .stversions/, que e a pasta de FILE
// VERSIONING do Syncthing, nao um marcador de conflito. Quem usa
// versioning tem .stversions/ populada em operacao normal e veria o
// aviso para sempre. O detector real de conflito deste repo e
// ehSyncConflict de src/lib/vault/syncConflict.ts (prefixo
// .sync-conflict- no nome do arquivo). Por isso o subtitulo aqui
// relata o fato observado ("ha arquivos em .stversions") em vez de
// afirmar que existe conflito. Trocar o detector exige decisao do dono.
function BlocoStatusSync({ vaultRoot }: { vaultRoot: string | null }) {
  // null = ainda verificando. Reinicia a cada troca de pasta.
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let ativo = true;
    setStatus(null);
    void verificarSyncStatus(vaultRoot).then((s) => {
      if (ativo) setStatus(s);
    });
    return () => {
      ativo = false;
    };
  }, [vaultRoot]);

  if (!vaultRoot) {
    return (
      <CardStatus
        cor="desconhecido"
        titulo="Sem pasta para verificar."
        subtitulo="Escolha uma pasta para o app conseguir verificar a sincronização."
        accessibilityLabel="card status sync sem pasta"
      />
    );
  }

  if (!status) {
    return (
      <CardStatus
        cor="desconhecido"
        titulo="Verificando sincronização…"
        accessibilityLabel="card status sync verificando"
      />
    );
  }

  if (status.cor === 'desconhecido') {
    return (
      <CardStatus
        cor="desconhecido"
        titulo="Sincronização indisponível nesta plataforma."
        subtitulo="A verificação depende do sistema de arquivos do aparelho."
        accessibilityLabel="card status sync indisponivel"
      />
    );
  }

  // AUDIT-P2-7: pasta inacessivel tem render proprio, e nao o mesmo do
  // Vault desatualizado.
  //
  // Os tres caminhos que produzem {vermelho, ultimaModificacao: null} --
  // diretorio inexistente, getInfoAsync que lanca, info sem
  // modificationTime -- significam "nao consegui ler a pasta", nao "faz
  // muito tempo que nao sincroniza". Mostrar "Vault desatualizado" ali
  // manda a pessoa esperar sincronizacao quando a acao correta e
  // reconceder permissao ou trocar de pasta -- os dois botoes que estao
  // logo abaixo, nesta mesma tela.
  //
  // O cenario nao e hipotetico: apagar ou mover a pasta pelo gerenciador
  // de arquivos entre sessoes e o que o VaultBootGate ja trata no boot.
  if (status.cor === 'vermelho' && status.ultimaModificacao === null) {
    return (
      <CardStatus
        cor="vermelho"
        titulo="Não foi possível ler a pasta do Vault."
        subtitulo="Reconceda a permissão ou escolha a pasta de novo abaixo."
        accessibilityLabel="card status sync inacessivel"
      />
    );
  }

  return (
    <CardStatus
      cor={status.cor}
      titulo={TITULO_POR_COR[status.cor]}
      subtitulo={
        status.conflito
          ? 'Há arquivos em .stversions. Verifique o Syncthing.'
          : descreverDelta(status.ultimaModificacao)
      }
      accessibilityLabel={`card status sync ${status.cor}`}
    />
  );
}

// Titulo por cor, no contrato do cabecalho de syncStatus.ts: verde =
// mtime < 30min, amarelo = 30min a 6h, vermelho = > 6h ou pasta
// inacessivel ou .stversions com arquivos.
const TITULO_POR_COR: Record<'verde' | 'amarelo' | 'vermelho', string> = {
  verde: 'Vault atualizado.',
  amarelo: 'Vault pode estar atrasado.',
  vermelho: 'Vault desatualizado.',
};

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
