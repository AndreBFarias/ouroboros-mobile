// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — secao opt-in em Settings.
// Renderiza um toggle "Backup automático semanal" + linha discreta
// "Último backup: há X dias.". Tom sobrio (BRIEF §1.8): nada de
// celebracao, exclamacao ou emoji.
//
// Decisao visual: reusa o mesmo padrao das demais secoes (SecaoLista
// + ToggleRow visualmente identico via View+Toggle inline aqui para
// nao depender do helper privado de app/settings/index.tsx). Quando
// toggle OFF, omite a linha de timestamp para manter a tela limpa.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Toggle } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { useSettings } from '@/lib/stores/settings';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  descreverUltimoBackup,
  lerUltimoBackupMs,
} from '@/lib/backup/executarBackup';

export function SecaoBackupAutomatico() {
  const ativo = useSettings((s) => s.featureToggles.backupAutomaticoSemanal);
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);
  const [ultimoMs, setUltimoMs] = useState<number | null>(null);

  // Le timestamp do ultimo backup ao montar e cada vez que o toggle
  // muda (afinal, ligar o toggle pode disparar execucao em sprint
  // futura via avaliarBackupAutomatico no boot).
  useEffect(() => {
    let cancelado = false;
    void lerUltimoBackupMs().then((ms) => {
      if (!cancelado) setUltimoMs(ms);
    });
    return () => {
      cancelado = true;
    };
  }, [ativo]);

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
    </SecaoLista>
  );
}
