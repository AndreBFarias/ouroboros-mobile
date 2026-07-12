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
import { orquestrarHCAutopull } from '@/lib/health/autopullScheduler';
import type { TipoHC } from '@/lib/health/tipos';
import { puxadorPassos } from '@/lib/health/puxadores/passos';
import { puxadorExercicio } from '@/lib/health/puxadores/exercicio';
import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
import { puxadorMenstruacao } from '@/lib/health/puxadores/menstruacao';
import { puxadorSono } from '@/lib/health/puxadores/sleep';
import { haRelativoDeIso } from '@/lib/datetime/haRelativo';

// Rotulos PT-BR (sentence case, com acento) dos tipos HC. Reusado pela
// lista de permissoes e pelo painel "Sincronizacao" (ultima sync por
// tipo). Mantido alinhado com o map de availability/permissions.
const ROTULO_TIPO: Record<TipoHC, string> = {
  Steps: 'Passos',
  ExerciseSession: 'Sessões de treino',
  Weight: 'Peso',
  BodyFat: 'Percentual de gordura',
  HeartRate: 'Frequência cardíaca',
  SleepSession: 'Sono',
  MenstruationFlow: 'Ciclo menstrual',
};

function rotuloPermission(p: PermissionItem): string {
  const acao = p.accessType === 'read' ? 'ler' : 'escrever';
  return `${acao} ${ROTULO_TIPO[p.recordType as TipoHC] ?? p.recordType}`;
}

// R-INT-3-HC-SYNC-PAINEL: mesmo array de puxadores injetado no boot path
// (app/_layout.tsx). Sao singletons canonicos importados; reusa-los aqui
// garante que o botao "Sincronizar agora" exerce exatamente a mesma
// rodada que o autopull foreground.
const PUXADORES_AUTOPULL = [
  puxadorPassos,
  puxadorExercicio,
  puxadorMedidas,
  puxadorMenstruacao,
  puxadorSono,
];

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

  // R-INT-3-HC-SYNC-PAINEL: painel de sincronizacao. Le do store o
  // tracking de ultima sync por tipo e a telemetria da ultima rodada.
  // Subscricao por campo para re-render quando o autopull (manual ou
  // foreground) atualizar.
  const hcAutopullUltimaSync = useSettings((s) => s.hcAutopullUltimaSync);
  const hcAutopullUltimaRodada = useSettings((s) => s.hcAutopullUltimaRodada);
  const [sincronizando, setSincronizando] = useState<boolean>(false);

  // Ordem canonica dos tipos para a lista (estavel, nao depende de
  // ordem de chaves do objeto). So entram tipos com sync registrada
  // (non-null) — listar 7x "Nunca sincronizado" seria ruido.
  const ORDEM_TIPOS: TipoHC[] = [
    'Steps',
    'ExerciseSession',
    'Weight',
    'BodyFat',
    'HeartRate',
    'SleepSession',
    'MenstruationFlow',
  ];
  const linhasUltimaSync = ORDEM_TIPOS.map((tipo) => ({
    tipo,
    rotulo: ROTULO_TIPO[tipo],
    relativo: haRelativoDeIso(hcAutopullUltimaSync[tipo]),
  })).filter((l) => l.relativo !== null);

  // R-INT-3-HC-AUTOPULL-UI-MANUAL: dispara uma rodada de autopull sob
  // demanda. Reusa o orquestrador (que ja grava a telemetria). Toast
  // factual (ADR-0005: sem exclamacao, sem gamificacao, sem comparativo).
  const handleSincronizarAgora = useCallback(async () => {
    if (sincronizando) return;
    setSincronizando(true);
    void haptics.light();
    try {
      const r = await orquestrarHCAutopull(PUXADORES_AUTOPULL);
      const novos = r.tipos.reduce((acc, t) => acc + t.novos, 0);
      const erros = r.tipos.filter((t) => t.erro !== null).length;
      if (erros > 0) {
        toast.show(
          `Sincronizado com ${erros} ${
            erros === 1 ? 'aviso' : 'avisos'
          }. ${novos} ${novos === 1 ? 'novo registro' : 'novos registros'}.`,
          'warn'
        );
      } else {
        toast.show(
          `Sincronizado. ${novos} ${
            novos === 1 ? 'novo registro' : 'novos registros'
          }.`,
          'success'
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível sincronizar: ${msg}`, 'error');
    } finally {
      setSincronizando(false);
    }
  }, [sincronizando, toast]);

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
          {permissoes.length > 0 ? (
            <View
              style={{
                marginTop: spacing.base,
                paddingTop: spacing.base,
                borderTopWidth: 1,
                borderTopColor: colors.bgElev,
                gap: spacing.sm,
              }}
              accessibilityLabel="painel sincronizacao health connect"
            >
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
                Sincronização
              </Text>
              {linhasUltimaSync.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  {linhasUltimaSync.map((l) => (
                    <Text
                      key={l.tipo}
                      style={{
                        color: colors.mutedDecor,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {`Última sync: ${l.rotulo} ${l.relativo}`}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Ainda sem sincronização registrada.
                </Text>
              )}
              {hcAutopullUltimaRodada ? (
                <Text
                  accessibilityLabel="telemetria ultima rodada"
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {(() => {
                    const n = hcAutopullUltimaRodada.novos;
                    const quando = haRelativoDeIso(
                      hcAutopullUltimaRodada.rodadoEm
                    );
                    const base = `Última rodada: ${n} ${
                      n === 1 ? 'novo registro' : 'novos registros'
                    }`;
                    return quando ? `${base} (${quando})` : `${base}.`;
                  })()}
                </Text>
              ) : null}
              <Button
                label="Sincronizar agora"
                onPress={handleSincronizarAgora}
                variant="ghost"
                disabled={sincronizando}
                accessibilityLabel="sincronizar agora"
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
