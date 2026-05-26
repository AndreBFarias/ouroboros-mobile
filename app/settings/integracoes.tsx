// Tela /settings/integracoes — hub das integracoes externas do
// Ouroboros (Q17.a, Onda Q 2026-05-13). V1 cobre apenas Health
// Connect Android. Futuras integracoes (Google Calendar avancado,
// Spotify play history, etc.) entram aqui.
//
// Status do SDK do Health Connect e listagem de permissions atuais
// vivem em hooks separados (carregamento lazy do modulo nativo,
// evita crash em ambiente sem suporte).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Footprints, Minus, Plus } from '@/lib/icons';
import { Button, Header, Screen, Toggle, useToast } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import {
  verificarDisponibilidade,
  inicializarHealthConnect,
  abrirSettingsHealthConnect,
  type HealthSdkStatus,
} from '@/lib/health/availability';
import {
  solicitarPermissoesCanonicas,
  listarPermissoesConcedidas,
  revogarTodas,
  type PermissionItem,
} from '@/lib/health/permissions';
import { useSettings } from '@/lib/stores/settings';

function rotuloPermission(p: PermissionItem): string {
  const map: Record<string, string> = {
    Steps: 'Passos',
    ExerciseSession: 'Sessões de treino',
    Weight: 'Peso',
    BodyFat: 'Percentual de gordura',
    HeartRate: 'Frequência cardíaca',
    SleepSession: 'Sono',
    MenstruationFlow: 'Ciclo menstrual',
  };
  const acao = p.accessType === 'read' ? 'ler' : 'escrever';
  return `${acao} ${map[p.recordType] ?? p.recordType}`;
}

export default function SettingsIntegracoesScreen() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<HealthSdkStatus>('unavailable');
  const [permissoes, setPermissoes] = useState<PermissionItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const s = await verificarDisponibilidade();
      setStatus(s);
      if (s === 'available') {
        await inicializarHealthConnect();
        const atuais = await listarPermissoesConcedidas();
        setPermissoes(atuais);
      } else {
        setPermissoes([]);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // R-INT-3-HC-EMPIRICAL (2026-05-22): gate antigo `status === 'available'`
  // era falso bloqueio. Validacao live com alpha-30 confirmou que HC moderno
  // (com.google.android.apps.healthdata 2026.04.16.00.release) aceita
  // requestPermission e concede acesso mesmo retornando getSdkStatus=3
  // (PROVIDER_UPDATE_REQUIRED). Portanto: nao gate por status, apenas por
  // `unavailable` (caso HC nao esteja instalado). Status 'needs_update' e
  // tratado igual 'available'.
  const handleConectar = useCallback(async () => {
    if (status === 'unavailable' || salvando) return;
    setSalvando(true);
    try {
      const concedidas = await solicitarPermissoesCanonicas();
      setPermissoes(concedidas);
      if (concedidas.length > 0) {
        // Q17.c: ao aceitar permissoes, liga o toggle de sync para
        // saves futuros escreverem em HC automaticamente.
        useSettings.getState().setFeatureToggle('healthConnectSync', true);
        void haptics.success();
        toast.show(`Conectado: ${concedidas.length} tipos.`, 'success');
      } else {
        toast.show('Nenhuma permissão concedida.', 'warn');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível conectar: ${msg}`, 'error');
    } finally {
      setSalvando(false);
    }
  }, [status, salvando, toast]);

  const handleRevogar = useCallback(async () => {
    setSalvando(true);
    try {
      await revogarTodas();
      // Q17.c: ao revogar, desativa sync para evitar tentativas
      // futuras que falhariam silentemente.
      useSettings.getState().setFeatureToggle('healthConnectSync', false);
      setPermissoes([]);
      toast.show('Conexão removida.', 'success');
    } finally {
      setSalvando(false);
    }
  }, [toast]);

  const handleAbrirSettings = useCallback(() => {
    void haptics.light();
    abrirSettingsHealthConnect();
  }, []);

  // R-INT-3-HC-NOTIF-META-PASSOS: meta diaria de passos. Stepper de
  // +/- 1000 passos. O setter do store aplica clamp (1..100000).
  const metaPassosDia = useSettings((s) => s.metaPassosDia);
  const setMetaPassosDia = useSettings((s) => s.setMetaPassosDia);
  const PASSO_META = 1000;
  const ajustarMeta = useCallback(
    (delta: number) => {
      void haptics.light();
      setMetaPassosDia(metaPassosDia + delta);
    },
    [metaPassosDia, setMetaPassosDia]
  );

  // R-INT-3-HC-AUTOPULL-BACKGROUND: opt-in para o autopull rodar com o app
  // fechado (task de background). Default false. O wiring em _layout reage a
  // este toggle e registra/desregistra a task guarded.
  const hcBackgroundToggle = useSettings(
    (s) => s.featureToggles.hcAutopullBackground
  );
  const alternarHcBackground = useCallback((proximo: boolean) => {
    useSettings.getState().setFeatureToggle('hcAutopullBackground', proximo);
  }, []);

  // R-INT-3-HC-EMPIRICAL: 'needs_update' nao bloqueia funcionalidade
  // (HC moderno aceita request mesmo reportando SDK obsoleto). Label
  // reflete realidade do device.
  const statusLabel: Record<HealthSdkStatus, string> = {
    available: 'Disponível',
    needs_update: 'Disponível',
    unavailable: 'Indisponível neste dispositivo',
  };

  return (
    <Screen>
      <Header title="Integrações" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.lg,
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.bgElev,
          }}
          accessibilityLabel="card integracao health connect"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Heart size={20} color={colors.pink} strokeWidth={1.75} />
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Conexão Saúde (Android)
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {carregando ? 'Verificando…' : `Status: ${statusLabel[status]}.`}
          </Text>
          {permissoes.length > 0 ? (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 12,
                  lineHeight: 18,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {`Conectado a ${permissoes.length} ${
                  permissoes.length === 1 ? 'tipo' : 'tipos'
                }`}
              </Text>
              {permissoes.slice(0, 12).map((p, i) => (
                <Text
                  key={`${p.recordType}-${p.accessType}-${i}`}
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {`• ${rotuloPermission(p)}`}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
            {status !== 'unavailable' && permissoes.length === 0 ? (
              <Button
                label="Conectar"
                onPress={handleConectar}
                variant="primary"
                disabled={salvando}
              />
            ) : null}
            {permissoes.length > 0 ? (
              <>
                <Button
                  label="Abrir Conexão Saúde"
                  onPress={handleAbrirSettings}
                  variant="ghost"
                />
                <Button
                  label="Desconectar"
                  onPress={handleRevogar}
                  variant="destructive"
                  disabled={salvando}
                />
              </>
            ) : null}
          </View>
          {permissoes.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.base,
                marginTop: spacing.sm,
              }}
              accessibilityLabel="linha sincronizar em segundo plano"
            >
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  Sincronizar em segundo plano
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Atualiza os dados mesmo com o app fechado. Usa mais bateria.
                </Text>
              </View>
              <Toggle
                value={hcBackgroundToggle}
                onChange={alternarHcBackground}
                accessibilityLabel="sincronizar em segundo plano"
              />
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.lg,
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.bgElev,
          }}
          accessibilityLabel="card meta de passos"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Footprints size={20} color={colors.cyan} strokeWidth={1.75} />
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Meta diária de passos
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Aparece na Tela Hoje como acompanhamento ao vivo.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.sm,
            }}
          >
            <Pressable
              onPress={() => ajustarMeta(-PASSO_META)}
              accessibilityRole="button"
              accessibilityLabel="diminuir meta de passos"
              hitSlop={8}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.card,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgElev,
              }}
            >
              <Minus size={20} color={colors.fg} strokeWidth={2} />
            </Pressable>
            <Text
              accessibilityLabel={`meta atual ${metaPassosDia} passos`}
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 20,
                lineHeight: 28,
              }}
            >
              {`${metaPassosDia.toLocaleString('pt-BR')} passos`}
            </Text>
            <Pressable
              onPress={() => ajustarMeta(PASSO_META)}
              accessibilityRole="button"
              accessibilityLabel="aumentar meta de passos"
              hitSlop={8}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.card,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgElev,
              }}
            >
              <Plus size={20} color={colors.fg} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            paddingHorizontal: spacing.base,
          }}
        >
          Próximas integrações em sprints futuras.
        </Text>
      </ScrollView>
    </Screen>
  );
}
