// Sub-tela /settings/contas-google (M37.1). Lista contas Google
// conectadas para pessoa_a e pessoa_b com email + "conectado ha X dias"
// + botao Revogar. Quando nenhuma conta esta conectada, mostra empty
// state com link para /agenda.
//
// Comentarios sem acento. Strings UI em PT-BR sentence case com
// acentuacao. accessibilityLabel sem acento.
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Screen, Toggle, useToast } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useGoogleAuth, type ContaGoogle } from '@/lib/stores/googleAuth';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import { fazerBackupDrive } from '@/lib/integracoes/google/driveBackup';
import { usePessoa, nomeDe } from '@/lib/stores/pessoa';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function diasDesde(epochMs: number): number {
  if (epochMs <= 0) return 0;
  const dt = Date.now() - epochMs;
  return Math.max(0, Math.floor(dt / 86400_000));
}

function rotuloDias(d: number): string {
  if (d === 0) return 'hoje';
  if (d === 1) return 'há 1 dia';
  return `há ${d} dias`;
}

interface CartaoContaProps {
  pessoa: PessoaAutor;
  conta: ContaGoogle;
  onRevogar: () => void;
}

function CartaoConta({ pessoa, conta, onRevogar }: CartaoContaProps) {
  const nome = nomeDe(pessoa);
  const conectado =
    typeof conta.accessToken === 'string' && conta.accessToken.length > 0;
  const corBorda = pessoa === 'pessoa_a' ? colors.purple : colors.pink;

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: radius.card,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      }}
      accessibilityLabel={`conta google ${pessoa}`}
    >
      <Text
        style={{
          color: colors.fg,
          fontSize: typography.body.size,
          fontFamily: 'JetBrainsMono_500Medium',
        }}
      >
        {nome}
      </Text>
      {conta.invalido ? (
        <Text
          style={{
            color: colors.red,
            fontSize: typography.caption.size,
            marginTop: spacing.xs,
          }}
        >
          Conexão expirada. Reconecte na Agenda.
        </Text>
      ) : conectado ? (
        <>
          <Text
            style={{
              color: colors.muted,
              fontSize: typography.caption.size,
              marginTop: spacing.xs,
            }}
          >
            {typeof conta.email === 'string' && conta.email.length > 0
              ? conta.email
              : 'Conta conectada'}
          </Text>
          <Text
            style={{
              color: colors.mutedDecor,
              fontSize: typography.micro.size,
              marginTop: spacing.xs,
            }}
          >
            Conectado {rotuloDias(diasDesde(conta.ultimaConexao))}
          </Text>
          <Text
            style={{
              color: colors.mutedDecor,
              fontSize: typography.micro.size,
              marginTop: spacing.xs,
            }}
            accessibilityLabel={`escopo google ${pessoa}`}
          >
            {conta.escoposConcedidos === 'write'
              ? 'Permissão: leitura e escrita'
              : 'Permissão: apenas leitura'}
          </Text>
          <View style={{ marginTop: spacing.base, alignSelf: 'flex-start' }}>
            <Button
              label="Revogar"
              variant="ghost"
              onPress={onRevogar}
              accessibilityLabel={`revogar ${pessoa}`}
            />
          </View>
        </>
      ) : (
        <Text
          style={{
            color: colors.mutedDecor,
            fontSize: typography.caption.size,
            marginTop: spacing.xs,
          }}
        >
          Nenhuma conta conectada.
        </Text>
      )}
    </View>
  );
}

export default function ContasGoogleScreen() {
  const router = useRouter();
  const toast = useToast();
  // R-HOME-4f: reserva a zona do FABMenu global para a ultima secao nao
  // ficar atras do FAB.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
  const contas = useGoogleAuth((s) => s.contas);
  const revogar = useGoogleAuth((s) => s.revogar);
  const tipoCompanhia = usePessoa((s) => s.filtroPessoa);
  const [revogando, setRevogando] = useState<PessoaAutor | null>(null);
  // R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO: toggle + acao manual de backup Drive.
  const driveBackupToggle = useSettings(
    (s) => s.featureToggles.backupDriveAutomatico
  );
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);
  const setDriveBackupUltimaSync = useSettings(
    (s) => s.setDriveBackupUltimaSync
  );
  // AUDIT-P2-2: toggle do auto-sync periodico do Google Calendar. A chave
  // ja existia no store e no gate de app/_layout.tsx, mas nenhuma tela a
  // escrevia -- o auto-sync e a notificacao pre-evento nasciam e morriam
  // desligados. Mesmo gate de habilitacao do backup Drive: depende de
  // conta Google conectada.
  const calendarSyncToggle = useSettings(
    (s) => s.featureToggles.googleCalendarSync
  );
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [enviandoDrive, setEnviandoDrive] = useState(false);
  // Pelo menos uma conta Google conectada habilita o backup Drive.
  const algumGoogleConectado =
    (typeof contas.pessoa_a.accessToken === 'string' &&
      contas.pessoa_a.accessToken.length > 0) ||
    (typeof contas.pessoa_b.accessToken === 'string' &&
      contas.pessoa_b.accessToken.length > 0);

  const handleBackupDriveAgora = useCallback(async () => {
    if (enviandoDrive) return;
    setEnviandoDrive(true);
    try {
      const r = await fazerBackupDrive(vaultRoot ?? '', new Date());
      if (r.uploadado) {
        setDriveBackupUltimaSync(new Date().toISOString());
        toast.show('Backup enviado ao Drive.', 'info');
      } else if (r.jaExistia) {
        toast.show('Este backup já está no Drive.', 'info');
      } else {
        toast.show(r.erro ?? 'Não foi possível enviar.', 'error');
      }
    } catch {
      toast.show('Erro ao enviar o backup. Tente novamente.', 'error');
    } finally {
      setEnviandoDrive(false);
    }
  }, [enviandoDrive, vaultRoot, setDriveBackupUltimaSync, toast]);

  const handleRevogar = useCallback(
    async (pessoa: PessoaAutor) => {
      setRevogando(pessoa);
      try {
        await revogar(pessoa);
        toast.show('Conta revogada.', 'info');
      } catch {
        toast.show('Erro ao revogar. Tente novamente.', 'error');
      } finally {
        setRevogando(null);
      }
    },
    [revogar, toast]
  );

  // Sempre mostra pessoa_a; pessoa_b so quando filtro indica casal.
  const mostrarPessoaB =
    tipoCompanhia === 'ambos' || tipoCompanhia === 'pessoa_b';

  return (
    <Screen>
      <Header title="Contas Google" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: paddingBottomFab,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
            marginTop: spacing.lg,
          }}
        >
          Conecte sua conta Google para visualizar a agenda dos próximos 30
          dias. Tokens ficam só no seu dispositivo. Sem servidor próprio.
        </Text>

        <SecaoLista titulo="Contas conectadas">
          <CartaoConta
            pessoa="pessoa_a"
            conta={contas.pessoa_a}
            onRevogar={() => {
              if (revogando === null) void handleRevogar('pessoa_a');
            }}
          />
          {mostrarPessoaB ? (
            <CartaoConta
              pessoa="pessoa_b"
              conta={contas.pessoa_b}
              onRevogar={() => {
                if (revogando === null) void handleRevogar('pessoa_b');
              }}
            />
          ) : null}
        </SecaoLista>

        <SecaoLista titulo="Agenda">
          <View
            accessibilityLabel="linha toggle calendar sync"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 56,
              paddingHorizontal: spacing.base,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: typography.body.size,
                  lineHeight: typography.body.size * typography.body.lineHeight,
                }}
              >
                Sincronizar agenda automaticamente
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: typography.caption.size,
                  lineHeight:
                    typography.caption.size * typography.caption.lineHeight,
                  marginTop: 2,
                }}
              >
                Atualiza os próximos compromissos em segundo plano e avisa 15
                minutos antes de cada um.
              </Text>
            </View>
            <Toggle
              value={calendarSyncToggle}
              onChange={(v) => setFeatureToggle('googleCalendarSync', v)}
              disabled={!algumGoogleConectado}
              accessibilityLabel="toggle sincronizar agenda automaticamente"
            />
          </View>
          {!algumGoogleConectado ? (
            <Text
              style={{
                color: colors.mutedDecor,
                fontSize: typography.caption.size,
                paddingHorizontal: spacing.base,
                marginTop: spacing.xs,
              }}
            >
              Conecte uma conta Google acima para sincronizar a agenda.
            </Text>
          ) : null}
        </SecaoLista>

        <SecaoLista titulo="Backup no Google Drive">
          <View
            accessibilityLabel="linha toggle backup drive"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 56,
              paddingHorizontal: spacing.base,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: typography.body.size,
                  lineHeight: typography.body.size * typography.body.lineHeight,
                }}
              >
                Backup automático no Drive
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: typography.caption.size,
                  lineHeight:
                    typography.caption.size * typography.caption.lineHeight,
                  marginTop: 2,
                }}
              >
                Envia o ZIP do Vault para o seu Drive uma vez por semana. O
                envio começa quando o acesso ao Drive for autorizado na sua
                conta Google.
              </Text>
            </View>
            <Toggle
              value={driveBackupToggle}
              onChange={(v) => setFeatureToggle('backupDriveAutomatico', v)}
              disabled={!algumGoogleConectado}
              accessibilityLabel="toggle backup automatico drive"
            />
          </View>
          {!algumGoogleConectado ? (
            <Text
              style={{
                color: colors.mutedDecor,
                fontSize: typography.caption.size,
                paddingHorizontal: spacing.base,
                marginTop: spacing.xs,
              }}
            >
              Conecte uma conta Google acima para ativar o backup na nuvem.
            </Text>
          ) : (
            <View
              style={{
                marginTop: spacing.base,
                paddingHorizontal: spacing.base,
                alignSelf: 'flex-start',
              }}
            >
              <Button
                label={enviandoDrive ? 'Enviando...' : 'Fazer backup agora'}
                variant="ghost"
                onPress={() => {
                  void handleBackupDriveAgora();
                }}
                disabled={enviandoDrive}
                accessibilityLabel="fazer backup drive agora"
              />
            </View>
          )}
        </SecaoLista>

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Button
            label="Abrir agenda"
            onPress={() => router.push('/agenda')}
            accessibilityLabel="abrir agenda"
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
