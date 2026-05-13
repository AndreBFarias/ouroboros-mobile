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
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Settings as SettingsIcon } from '@/lib/icons';
import { Button, Header, Screen, useToast } from '@/components/ui';
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

  const handleConectar = useCallback(async () => {
    if (status !== 'available' || salvando) return;
    setSalvando(true);
    try {
      const concedidas = await solicitarPermissoesCanonicas();
      setPermissoes(concedidas);
      if (concedidas.length > 0) {
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

  const statusLabel: Record<HealthSdkStatus, string> = {
    available: 'Disponível',
    needs_update: 'Atualização necessária',
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
            {carregando
              ? 'Verificando…'
              : `Status: ${statusLabel[status]}.`}
          </Text>
          {status === 'available' && permissoes.length > 0 ? (
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
            {status === 'available' && permissoes.length === 0 ? (
              <Button
                label="Conectar"
                onPress={handleConectar}
                variant="primary"
                disabled={salvando}
              />
            ) : null}
            {status === 'available' && permissoes.length > 0 ? (
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
            {status === 'needs_update' ? (
              <Button
                label="Atualizar Conexão Saúde"
                onPress={handleAbrirSettings}
                variant="primary"
              />
            ) : null}
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
