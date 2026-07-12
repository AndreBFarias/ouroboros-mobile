// Badge "X / Y passos" da Tela Hoje.
// R-INT-3-HC-NOTIF-META-PASSOS (2026-05-25).
//
// Le os passos de HOJE ao vivo do Health Connect (lerPassosHojeHC) e a
// meta diaria do settings (metaPassosDia). Renderiza "X / Y passos"
// com separador de milhar PT-BR. Ao computar os passos, dispara o
// gatilho da notificacao silenciosa de meta atingida (1x/dia).
//
// Decisao do dono: dado ao VIVO do HC, nao D-1 do Vault -- o autopull
// filtra o dia em curso, entao a badge consulta o HC diretamente.
//
// A badge fica OCULTA (nao renderiza nada) quando:
//   - o toggle healthConnectSync esta off (usuario nao conectou), OU
//   - lerPassosHojeHC retorna null (sem modulo nativo / sem permissao /
//     erro). Em web/Expo Go isso e sempre o caso -> no-op visual.
//
// Dracula/tokens, sobrio, sem emoji.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Footprints } from '@/lib/icons';
import { colors, radius, spacing } from '@/theme/tokens';
import { useSettings } from '@/lib/stores/settings';
import { lerPassosHojeHC } from '@/lib/health/passosHoje';
import { checarEnotificarMeta } from '@/lib/notifications/metaPassos';

// Formata inteiro com ponto de milhar PT-BR (ex: 8000 -> "8.000").
// Manual (sem Intl) para previsibilidade em todos os ambientes/testes.
function formatarMilhar(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  const partes: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    partes.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return partes.join('.');
}

export function BadgePassos() {
  const hcSyncToggle = useSettings((s) => s.featureToggles.healthConnectSync);
  const meta = useSettings((s) => s.metaPassosDia);
  const [passos, setPassos] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Sem opt-in: nem tenta ler o HC. Mantem passos=null (badge oculta).
    if (!hcSyncToggle) {
      setPassos(null);
      return;
    }
    void (async () => {
      const total = await lerPassosHojeHC();
      if (!mountedRef.current) return;
      setPassos(total);
      // Dispara a notificacao silenciosa de meta (guard 1x/dia interno).
      // So quando ha leitura valida (total != null).
      if (total !== null) {
        void checarEnotificarMeta(total, meta);
      }
    })();
  }, [hcSyncToggle, meta]);

  // Badge oculta: sem opt-in ou sem leitura confiavel.
  if (!hcSyncToggle || passos === null) return null;

  const atingiu = passos >= meta;

  return (
    <View
      accessibilityLabel={`passos hoje ${passos} de ${meta}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.card,
        backgroundColor: colors.bgAlt,
        borderWidth: 1,
        borderColor: atingiu ? colors.green : colors.bgElev,
      }}
    >
      <Footprints
        size={16}
        color={atingiu ? colors.green : colors.cyan}
        strokeWidth={1.75}
      />
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {`${formatarMilhar(passos)} / ${formatarMilhar(meta)} passos`}
      </Text>
    </View>
  );
}

export default BadgePassos;
