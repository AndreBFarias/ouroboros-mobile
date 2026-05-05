// Rota raiz /agenda (M37.1). 5 estados explicitos:
//   - nao-conectado: empty + botao Conectar conta Google.
//   - conectando: OuroborosLoader compacto.
//   - invalido: banner reconectar + botao.
//   - offline: banner "Mostrando cache" sobre UI normal.
//   - online: CalendarGrid mensal + lista do dia + chip pessoa.
//
// Em web __DEV__, o store useGoogleAuth.autenticar() injeta token
// sintetico para validacao Nivel A sem rede real (decisao §4 spec).
//
// Comentarios sem acento (convencao shell/CI). Strings UI em PT-BR
// sentence case com acentuacao completa. accessibilityLabel sem
// acento (convencao screen reader).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import {
  Button,
  EmptyState,
  Header,
  Screen,
  useToast,
} from '@/components/ui';
import { CalendarGrid } from '@/components/agenda/CalendarGrid';
import { OuroborosLoader } from '@/components/brand';
import { Calendar as CalendarIcon } from '@/lib/icons';
import { colors, spacing, typography } from '@/theme/tokens';
import { useGoogleAuth } from '@/lib/stores/googleAuth';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import { ApiError, listarEventos, type EventoCalendar } from '@/lib/services/calendarApi';
import {
  cacheEstaFresco,
  lerCacheEventos,
  salvarCacheEventos,
} from '@/lib/services/calendarCache';

type EstadoAgenda =
  | 'nao-conectado'
  | 'conectando'
  | 'carregando'
  | 'online'
  | 'offline'
  | 'invalido';

function dataIsoHoje(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function eventosDoDia(eventos: EventoCalendar[], iso: string): EventoCalendar[] {
  return eventos.filter((e) => e.inicio.slice(0, 10) === iso);
}

function formatarHora(iso: string): string {
  const m = iso.slice(11, 16);
  if (m.length !== 5 || m[2] !== ':') return 'dia inteiro';
  return m;
}

export default function AgendaScreen() {
  const router = useRouter();
  const toast = useToast();
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const conta = useGoogleAuth((s) => s.contas[pessoaAtiva]);
  const autenticar = useGoogleAuth((s) => s.autenticar);
  const refreshIfNeeded = useGoogleAuth((s) => s.refreshIfNeeded);
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [estado, setEstado] = useState<EstadoAgenda>('nao-conectado');
  const [eventos, setEventos] = useState<EventoCalendar[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string>(dataIsoHoje());
  const [online, setOnline] = useState<boolean>(true);

  const sincronizar = useCallback(async () => {
    const token = await refreshIfNeeded(pessoaAtiva);
    if (token === null) {
      setEstado('invalido');
      return;
    }
    const agora = new Date();
    const ate = new Date(agora.getTime() + 30 * 86400_000);
    try {
      const lista = await listarEventos(token, agora, ate, pessoaAtiva);
      setEventos(lista);
      if (typeof vaultRoot === 'string' && vaultRoot.length > 0) {
        try {
          await salvarCacheEventos(vaultRoot, pessoaAtiva, lista);
        } catch {
          // best-effort
        }
      }
      setEstado('online');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'invalido') {
          setEstado('invalido');
          return;
        }
        if (e.code === 'rede') {
          setEstado('offline');
          return;
        }
        if (e.code === 'quota') {
          toast.show('Limite Google atingido. Tente em alguns minutos.', 'error');
        } else {
          toast.show('Erro ao buscar eventos. Tente novamente.', 'error');
        }
        setEstado('online');
        return;
      }
      setEstado('online');
    }
  }, [pessoaAtiva, refreshIfNeeded, toast, vaultRoot]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (conta.invalido) {
        if (ativo) setEstado('invalido');
        return;
      }
      if (typeof conta.accessToken !== 'string' || conta.accessToken.length === 0) {
        if (ativo) setEstado('nao-conectado');
        return;
      }

      if (typeof vaultRoot === 'string' && vaultRoot.length > 0) {
        const cache = await lerCacheEventos(vaultRoot, pessoaAtiva);
        if (cache !== null && ativo) {
          setEventos(cache.eventos);
          if (cacheEstaFresco(cache.geradoEm)) {
            setEstado('online');
            return;
          }
        }
      }

      if (ativo) setEstado('carregando');
      await sincronizar();
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [conta.accessToken, conta.invalido, pessoaAtiva, sincronizar, vaultRoot]);

  useEffect(() => {
    const desfazer = NetInfo.addEventListener((s) => {
      setOnline(s.isConnected !== false && s.isInternetReachable !== false);
    });
    return () => {
      desfazer();
    };
  }, []);

  const onConectar = useCallback(async () => {
    setEstado('conectando');
    const r = await autenticar(pessoaAtiva);
    if (!r.ok) {
      if (r.motivo === 'cancelado') {
        setEstado('nao-conectado');
        return;
      }
      if (r.motivo === 'sem_client_id') {
        toast.show('Configuração OAuth ausente. Veja a documentação.', 'error');
      } else {
        toast.show('Não foi possível conectar. Tente novamente.', 'error');
      }
      setEstado('nao-conectado');
      return;
    }
    setEstado('carregando');
    await sincronizar();
  }, [autenticar, pessoaAtiva, sincronizar, toast]);

  const eventosDia = useMemo(
    () => eventosDoDia(eventos, diaSelecionado),
    [eventos, diaSelecionado]
  );

  return (
    <Screen>
      <Header title="Agenda" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        accessibilityLabel="agenda root"
      >
        {estado === 'nao-conectado' ? (
          <View style={{ paddingTop: spacing.huge }}>
            <EmptyState
              Icon={CalendarIcon}
              frase="Conecte sua conta Google para ver os próximos 30 dias da sua agenda."
            />
            <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
              <Button
                label="Conectar conta Google"
                onPress={onConectar}
                accessibilityLabel="conectar conta google"
              />
            </View>
          </View>
        ) : null}

        {estado === 'conectando' || estado === 'carregando' ? (
          <View
            style={{
              paddingTop: spacing.huge,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="agenda carregando"
          >
            <OuroborosLoader compacto />
            <Text
              style={{
                marginTop: spacing.lg,
                color: colors.muted,
                fontSize: typography.body.size,
              }}
            >
              {estado === 'conectando' ? 'Conectando…' : 'Buscando eventos…'}
            </Text>
          </View>
        ) : null}

        {estado === 'invalido' ? (
          <View style={{ paddingTop: spacing.xl }}>
            <View
              style={{
                backgroundColor: colors.bgAlt,
                borderLeftWidth: 3,
                borderLeftColor: colors.red,
                paddingVertical: spacing.base,
                paddingHorizontal: spacing.lg,
                borderRadius: 8,
              }}
              accessibilityLabel="banner invalido"
            >
              <Text
                style={{
                  color: colors.fg,
                  fontSize: typography.body.size,
                  lineHeight: typography.body.size * typography.body.lineHeight,
                }}
              >
                Sua conexão Google expirou. Reconecte para ver sua agenda.
              </Text>
            </View>
            <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
              <Button
                label="Reconectar"
                onPress={onConectar}
                accessibilityLabel="reconectar conta google"
              />
            </View>
          </View>
        ) : null}

        {estado === 'online' || estado === 'offline' ? (
          <View style={{ paddingTop: spacing.base }}>
            {estado === 'offline' || online === false ? (
              <View
                style={{
                  backgroundColor: colors.bgAlt,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.yellow,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.base,
                  borderRadius: 8,
                  marginBottom: spacing.base,
                }}
                accessibilityLabel="banner offline"
              >
                <Text style={{ color: colors.fg, fontSize: typography.caption.size }}>
                  Sem conexão. Mostrando eventos do cache.
                </Text>
              </View>
            ) : null}

            <CalendarGrid
              eventos={eventos}
              selecionado={diaSelecionado}
              onDayPress={setDiaSelecionado}
            />

            <View style={{ marginTop: spacing.xl }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: typography.caption.size,
                  marginBottom: spacing.sm,
                }}
              >
                Eventos do dia
              </Text>
              {eventosDia.length === 0 ? (
                <Text
                  style={{
                    color: colors.mutedDecor,
                    fontSize: typography.body.size,
                    paddingVertical: spacing.base,
                  }}
                >
                  Nenhum evento neste dia.
                </Text>
              ) : (
                eventosDia.map((e) => (
                  <View
                    key={e.id}
                    style={{
                      backgroundColor: colors.bg,
                      paddingVertical: spacing.base,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 12,
                      marginBottom: spacing.sm,
                    }}
                    accessibilityLabel={`evento ${e.id}`}
                  >
                    <Text
                      style={{
                        color: colors.fg,
                        fontSize: typography.body.size,
                        lineHeight: typography.body.size * typography.body.lineHeight,
                      }}
                    >
                      {e.titulo}
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: typography.caption.size,
                        marginTop: spacing.xs,
                      }}
                    >
                      {formatarHora(e.inicio)}
                      {typeof e.local === 'string' && e.local.length > 0
                        ? ` · ${e.local}`
                        : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
