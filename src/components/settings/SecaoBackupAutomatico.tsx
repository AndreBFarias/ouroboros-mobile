// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — secao opt-in em Settings.
// Renderiza um toggle "Backup automático semanal" + linha discreta
// "Último backup: há X dias.". Tom sobrio (BRIEF §1.8): nada de
// celebracao, exclamacao ou emoji.
//
// R-BACKUP-AUTO (D6=SIM, 2026-05-15): default ON. Estende com:
//   - Lista dos ultimos 4 backups (data + tamanho).
//   - Botao "Fazer backup agora" (forca execucao manual sem esperar
//     o intervalo de 7 dias).
//   - Botao "Restaurar" por backup, com Alert.alert de confirmacao.
//
// Decisao visual: reusa o mesmo padrao das demais secoes (SecaoLista
// + ToggleRow visualmente identico via View+Toggle inline aqui para
// nao depender do helper privado de app/settings/index.tsx). Quando
// toggle OFF, omite a lista e o botao "Fazer backup agora" para
// manter a tela limpa.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Toggle, useToast } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { useSettings } from '@/lib/stores/settings';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  descreverUltimoBackup,
  executarBackup,
  lerUltimoBackupMs,
  listarBackupsArquivados,
  type BackupArquivado,
} from '@/lib/backup/executarBackup';
import { restaurarVaultZip } from '@/lib/services/restaurarVault';
import { haptics } from '@/lib/haptics';

// Formata bytes em string humana ("12,3 MB"). Sem libs externas.
function formatarBytes(b: number): string {
  if (b <= 0) return '—';
  const UM_KB = 1024;
  const UM_MB = UM_KB * 1024;
  if (b < UM_MB) {
    const kb = b / UM_KB;
    // 1 casa decimal com virgula PT-BR.
    return kb.toFixed(1).replace('.', ',') + ' KB';
  }
  const mb = b / UM_MB;
  return mb.toFixed(1).replace('.', ',') + ' MB';
}

// Formata o timestamp do arquivo em "DD/MM HHhmm" (PT-BR). Quando o
// timestamp e 0 (nao foi possivel ler mtime), mostra "—".
function formatarData(ms: number): string {
  if (ms <= 0) return '—';
  const d = new Date(ms);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${h}h${min}`;
}

export function SecaoBackupAutomatico() {
  const ativo = useSettings((s) => s.featureToggles.backupAutomaticoSemanal);
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);
  const [ultimoMs, setUltimoMs] = useState<number | null>(null);
  const [backups, setBackups] = useState<BackupArquivado[]>([]);
  const [executando, setExecutando] = useState(false);
  const toast = useToast();

  // R-INFRA-JEST-LEAK-HUNT-3 (2026-05-20): mountedRef em vez da flag
  // `cancelado` antiga (que era checada apos o setState e nao guardava
  // nada). Agora `recarregar` checa mountedRef antes de cada setState,
  // eliminando warning "update inside test not wrapped in act" que
  // causava flake nas suites jest com mount/unmount rapido.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Carrega lista + ultimo timestamp. Roda ao montar e a cada vez que
  // o toggle muda (ligar o toggle pode disparar execucao via boot).
  const recarregar = useCallback(async () => {
    const [ms, lista] = await Promise.all([
      lerUltimoBackupMs(),
      listarBackupsArquivados(),
    ]);
    if (!mountedRef.current) return;
    setUltimoMs(ms);
    setBackups(lista);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [ativo, recarregar]);

  const fazerBackupAgora = async () => {
    haptics.light();
    if (executando) return;
    setExecutando(true);
    toast.show('Fazendo backup…', 'info');
    try {
      const r = await executarBackup();
      if (!r.uri) {
        toast.show(r.motivo ?? 'Falha ao fazer backup.', 'error');
        return;
      }
      toast.show('Backup salvo.', 'success');
      await recarregar();
    } finally {
      setExecutando(false);
    }
  };

  const restaurarBackup = (item: BackupArquivado) => {
    haptics.light();
    Alert.alert(
      'Restaurar backup',
      `Restaurar o backup de ${formatarData(item.modificadoEmMs)}? Os arquivos serão escritos em uma pasta restaurado-<data>/ no Vault sem sobrescrever os atuais.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'default',
          onPress: async () => {
            toast.show('Restaurando…', 'info');
            const res = await restaurarVaultZip(item.uri);
            if (res.falhas.length > 0) {
              toast.show(
                `Restauração concluída com ${res.falhas.length} falha(s).`,
                'warn'
              );
              return;
            }
            if (!res.ok) {
              toast.show(res.motivo ?? 'Falha ao restaurar.', 'error');
              return;
            }
            toast.show('Restauração concluída.', 'success');
          },
        },
      ]
    );
  };

  return (
    <SecaoLista
      titulo="Backup automático"
      accessibilityLabel="secao backup automatico"
    >
      <View
        accessibilityLabel="linha toggle backup automatico semanal"
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.base,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
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
            Backup semanal
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
            Cópia local em Documents/Ouroboros-Backups/auto/. Últimos 4.
          </Text>
        </View>
        <Toggle
          value={ativo}
          onChange={(v) => setFeatureToggle('backupAutomaticoSemanal', v)}
          accessibilityLabel="toggle backup automatico semanal"
        />
      </View>
      {ativo ? (
        <View
          accessibilityLabel="linha ultimo backup"
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.base,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
              lineHeight:
                typography.caption.size * typography.caption.lineHeight,
            }}
          >
            {descreverUltimoBackup(ultimoMs)}
          </Text>
        </View>
      ) : null}
      {ativo ? (
        <Button
          label={executando ? 'Fazendo backup…' : 'Fazer backup agora'}
          variant="ghost"
          onPress={fazerBackupAgora}
          accessibilityLabel="fazer backup agora"
        />
      ) : null}
      {ativo && backups.length > 0 ? (
        <View
          accessibilityLabel="lista backups"
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.base,
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.caption.size,
              lineHeight:
                typography.caption.size * typography.caption.lineHeight,
            }}
          >
            Backups disponíveis
          </Text>
          {backups.map((b) => (
            <Pressable
              key={b.nome}
              onPress={() => restaurarBackup(b)}
              accessibilityRole="button"
              accessibilityLabel={`restaurar backup ${b.nome}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 44,
                paddingVertical: spacing.xs,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: typography.caption.size,
                  }}
                >
                  {formatarData(b.modificadoEmMs)}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: typography.caption.size,
                  }}
                >
                  {formatarBytes(b.bytes)}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.purple,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: typography.caption.size,
                }}
              >
                Restaurar
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </SecaoLista>
  );
}
