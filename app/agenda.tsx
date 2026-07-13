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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import {
  BottomSheet,
  Button,
  ConfirmarExclusao,
  EmptyState,
  FAB,
  Header,
  Screen,
  SHEET_80,
  useToast,
  type BottomSheetRef,
} from '@/components/ui';
import { CalendarGrid } from '@/components/agenda/CalendarGrid';
import {
  SheetNovoEvento,
  TIMEZONE_PADRAO,
  type SheetNovoEventoPayload,
} from '@/components/agenda/SheetNovoEvento';
import { OuroborosLoader } from '@/components/brand';
import { Calendar as CalendarIcon, Plus } from '@/lib/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, spacing, typography } from '@/theme/tokens';
import { useGoogleAuth } from '@/lib/stores/googleAuth';
import { usePessoa, nomeDe } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import {
  ApiError,
  criarEvento,
  deletarEvento,
  listarEventos,
  type EventoCalendar,
  type NovoEventoInput,
} from '@/lib/services/calendarApi';
import {
  adicionarEventoNoCache,
  cacheEstaFresco,
  lerCacheEventos,
  removerEventoDoCache,
  salvarCacheEventos,
} from '@/lib/services/calendarCache';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { comTimeout } from '@/lib/util/comTimeout';

// Timeout maior para sync agenda: snapshot pode ter ate 30 dias de
// eventos e cada um vira um .md no Vault SAF (write em massa em
// OEMs lentos chega em 20s+). Pattern Bloco I do plano golden-zebra.
const AGENDA_SYNC_TIMEOUT_MS = 30_000;

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

function eventosDoDia(
  eventos: EventoCalendar[],
  iso: string
): EventoCalendar[] {
  return eventos.filter((e) => e.inicio.slice(0, 10) === iso);
}

function formatarHora(iso: string): string {
  const m = iso.slice(11, 16);
  if (m.length !== 5 || m[2] !== ':') return 'dia inteiro';
  return m;
}

export default function AgendaScreen() {
  const router = useRouter();
  // R-HOME-4f: reserva a zona do FABMenu global (base + altura do FAB +
  // respiro) para o ultimo evento da lista nao ficar atras do FAB.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
  const toast = useToast();
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const conta = useGoogleAuth((s) => s.contas[pessoaAtiva]);
  const contas = useGoogleAuth((s) => s.contas);
  const autenticar = useGoogleAuth((s) => s.autenticar);
  const autenticarComEscopoEscrita = useGoogleAuth(
    (s) => s.autenticarComEscopoEscrita
  );
  const refreshIfNeeded = useGoogleAuth((s) => s.refreshIfNeeded);
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [estado, setEstado] = useState<EstadoAgenda>('nao-conectado');
  const [eventos, setEventos] = useState<EventoCalendar[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string>(dataIsoHoje());
  const [online, setOnline] = useState<boolean>(true);

  // M37.2: escrita. sheetRef controla o SheetNovoEvento; resetKeyEvento
  // reseta o form apos criar; eventoParaApagar dirige o ConfirmarExclusao.
  const sheetRef = useRef<BottomSheetRef>(null);
  const [resetKeyEvento, setResetKeyEvento] = useState<number>(0);
  const [salvandoEvento, setSalvandoEvento] = useState<boolean>(false);
  const [eventoParaApagar, setEventoParaApagar] =
    useState<EventoCalendar | null>(null);
  const [apagando, setApagando] = useState<boolean>(false);
  const [reautorizando, setReautorizando] = useState<boolean>(false);

  // Escopo de escrita da conta ativa. Contas conectadas antes de M37.2
  // nao trazem o campo (undefined => sem escrita ate reautorizar).
  const temEscrita = conta.escoposConcedidos === 'write';

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
          await comTimeout(
            salvarCacheEventos(vaultRoot, pessoaAtiva, lista),
            AGENDA_SYNC_TIMEOUT_MS
          );
          toast.show('Agenda atualizada.', 'success');
        } catch (err) {
          // Save resiliente (Bloco I do plano golden-zebra): travar
          // por timeout em SAF lento (MIUI/HyperOS/OneUI) ou erro de
          // schema nao deve quebrar a UI — eventos seguem em memoria.
          const msg =
            err instanceof Error && err.message.length > 0
              ? err.message
              : 'erro desconhecido';
          toast.show(`Não foi possível atualizar: ${msg}`, 'error');
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
          toast.show(
            'Limite Google atingido. Tente em alguns minutos.',
            'error'
          );
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
      if (
        typeof conta.accessToken !== 'string' ||
        conta.accessToken.length === 0
      ) {
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

  // M37.2: sobe o escopo de readonly para write (reconsentimento OAuth).
  const handleReautorizar = useCallback(async () => {
    if (reautorizando) return;
    setReautorizando(true);
    const r = await autenticarComEscopoEscrita(pessoaAtiva);
    setReautorizando(false);
    if (!r.ok) {
      if (r.motivo !== 'cancelado') {
        toast.show('Não foi possível reautorizar. Tente novamente.', 'error');
      }
      return;
    }
    toast.show('Pronto. Você já pode criar eventos.', 'success');
    await sincronizar();
  }, [autenticarComEscopoEscrita, pessoaAtiva, reautorizando, sincronizar, toast]);

  // Abre o sheet de novo evento. Sem rede, o FAB nao cria (decisao M37.2
  // secao 9: sem fila offline) -- avisa e mantem fechado.
  const handleAbrirNovoEvento = useCallback(() => {
    if (online === false) {
      toast.show('Sem conexão. Tente quando voltar a rede.', 'error');
      return;
    }
    sheetRef.current?.expand();
  }, [online, toast]);

  // Cria o evento no Google Calendar da conta alvo (definida pelo
  // SeletorPara: 'mim'/'casal' => conta ativa; 'outra' => parceiro).
  // Atualizacao otimista: adiciona ao estado + cache antes do proximo
  // refresh completo. Idempotencia via id gerado dentro de criarEvento.
  const handleCriarEvento = useCallback(
    async (payload: SheetNovoEventoPayload) => {
      const alvo: PessoaAutor =
        payload.para.tipo === 'outra' ? payload.para.pessoa : pessoaAtiva;
      const contaAlvo = contas[alvo];
      const alvoTemEscrita =
        contaAlvo.escoposConcedidos === 'write' &&
        typeof contaAlvo.accessToken === 'string' &&
        contaAlvo.accessToken.length > 0 &&
        !contaAlvo.invalido;
      if (!alvoTemEscrita) {
        toast.show(
          alvo === pessoaAtiva
            ? 'Reautorize para criar eventos.'
            : `Conecte a conta de ${nomeDe(alvo)} com permissão de escrita.`,
          'error'
        );
        return;
      }

      setSalvandoEvento(true);
      try {
        const token = await refreshIfNeeded(alvo);
        if (token === null) {
          toast.show('Conexão expirada. Reconecte.', 'error');
          if (alvo === pessoaAtiva) setEstado('invalido');
          return;
        }
        const input: NovoEventoInput = {
          titulo: payload.titulo,
          inicioIso: payload.inicioIso,
          fimIso: payload.fimIso,
          timeZone: TIMEZONE_PADRAO,
        };
        if (typeof payload.local === 'string') input.local = payload.local;
        if (typeof payload.descricao === 'string') {
          input.descricao = payload.descricao;
        }
        const evento = await criarEvento(token, input, alvo);

        // Otimista: se o evento e da conta que estamos vendo, entra na
        // lista imediatamente. Se e do parceiro (outra conta), so vai ao
        // cache dele e aparece quando o usuario trocar de pessoa.
        if (alvo === pessoaAtiva) {
          setEventos((prev) => [...prev, evento]);
        }
        if (typeof vaultRoot === 'string' && vaultRoot.length > 0) {
          try {
            await comTimeout(
              adicionarEventoNoCache(vaultRoot, alvo, evento),
              AGENDA_SYNC_TIMEOUT_MS
            );
          } catch {
            // Save resiliente: falha de cache local nao desfaz a criacao
            // remota; o proximo refresh reconcilia.
          }
        }
        toast.show('Evento criado.', 'success');
        setResetKeyEvento((n) => n + 1);
        sheetRef.current?.close();
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === 'conflito') {
            toast.show('Esse evento já existe.', 'error');
          } else if (e.code === 'invalido') {
            toast.show('Conexão expirada. Reconecte.', 'error');
            if (alvo === pessoaAtiva) setEstado('invalido');
          } else if (e.code === 'quota') {
            toast.show(
              'Limite Google atingido. Tente em alguns minutos.',
              'error'
            );
          } else if (e.code === 'rede') {
            toast.show('Sem conexão. Tente novamente.', 'error');
          } else {
            toast.show('Não foi possível criar o evento.', 'error');
          }
        } else {
          toast.show('Não foi possível criar o evento.', 'error');
        }
      } finally {
        setSalvandoEvento(false);
      }
    },
    [contas, pessoaAtiva, refreshIfNeeded, toast, vaultRoot]
  );

  // Long-press na lista do dia abre a confirmacao de exclusao. So permite
  // quando a conta ativa tem escrita (apagar readonly retornaria 403).
  const handleLongPressEvento = useCallback(
    (evento: EventoCalendar) => {
      if (!temEscrita) {
        toast.show('Reautorize para gerenciar eventos.', 'error');
        return;
      }
      setEventoParaApagar(evento);
    },
    [temEscrita, toast]
  );

  const handleConfirmarApagar = useCallback(async () => {
    if (eventoParaApagar === null || apagando) return;
    setApagando(true);
    const alvo = eventoParaApagar;
    try {
      const token = await refreshIfNeeded(pessoaAtiva);
      if (token === null) {
        toast.show('Conexão expirada. Reconecte.', 'error');
        setEstado('invalido');
        return;
      }
      await deletarEvento(token, alvo.id, pessoaAtiva);
      setEventos((prev) => prev.filter((e) => e.id !== alvo.id));
      if (typeof vaultRoot === 'string' && vaultRoot.length > 0) {
        try {
          await comTimeout(
            removerEventoDoCache(vaultRoot, pessoaAtiva, alvo.id),
            AGENDA_SYNC_TIMEOUT_MS
          );
        } catch {
          // Save resiliente: cache local reconcilia no proximo refresh.
        }
      }
      toast.show('Evento apagado.', 'info');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalido') {
        setEstado('invalido');
        toast.show('Conexão expirada. Reconecte.', 'error');
      } else {
        toast.show('Não foi possível apagar. Tente novamente.', 'error');
      }
    } finally {
      setApagando(false);
      setEventoParaApagar(null);
    }
  }, [apagando, eventoParaApagar, pessoaAtiva, refreshIfNeeded, toast, vaultRoot]);

  const eventosDia = useMemo(
    () => eventosDoDia(eventos, diaSelecionado),
    [eventos, diaSelecionado]
  );

  return (
    <Screen>
      <Header title="Agenda" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: paddingBottomFab,
        }}
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
                fullWidth
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
                <Text
                  style={{
                    color: colors.fg,
                    fontSize: typography.caption.size,
                  }}
                >
                  Sem conexão. Mostrando eventos do cache.
                </Text>
              </View>
            ) : null}

            {!temEscrita ? (
              <View
                style={{
                  backgroundColor: colors.bgAlt,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.green,
                  paddingVertical: spacing.base,
                  paddingHorizontal: spacing.lg,
                  borderRadius: 8,
                  marginBottom: spacing.base,
                }}
                accessibilityLabel="banner reautorizar escrita"
              >
                <Text
                  style={{
                    color: colors.fg,
                    fontSize: typography.body.size,
                    lineHeight:
                      typography.body.size * typography.body.lineHeight,
                  }}
                >
                  Reautorize para criar eventos direto na sua agenda.
                </Text>
                <View style={{ marginTop: spacing.base, alignSelf: 'flex-start' }}>
                  <Button
                    label={reautorizando ? 'Abrindo…' : 'Reautorizar'}
                    onPress={() => {
                      void handleReautorizar();
                    }}
                    variant="success"
                    disabled={reautorizando}
                    accessibilityLabel="reautorizar escopo escrita"
                  />
                </View>
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
                  <Pressable
                    key={e.id}
                    onLongPress={() => handleLongPressEvento(e)}
                    delayLongPress={400}
                    accessibilityRole="button"
                    style={{
                      backgroundColor: colors.bg,
                      paddingVertical: spacing.base,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 12,
                      marginBottom: spacing.sm,
                    }}
                    accessibilityLabel={`evento ${e.id}`}
                    accessibilityHint="segure para apagar"
                  >
                    <Text
                      style={{
                        color: colors.fg,
                        fontSize: typography.body.size,
                        lineHeight:
                          typography.body.size * typography.body.lineHeight,
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
                  </Pressable>
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* M37.2: FAB verde "Novo evento" no canto inferior direito. So
          aparece com a conta ativa conectada e com escopo de escrita
          (senao o banner de reautorizar assume o papel). Nao conflita
          com o FABMenu roxo (canto esquerdo). */}
      {(estado === 'online' || estado === 'offline') && temEscrita ? (
        <FAB
          onPress={handleAbrirNovoEvento}
          background={colors.green}
          icon={<Plus size={24} color={colors.bg} strokeWidth={2} />}
          accessibilityLabel="novo evento"
          disabled={online === false}
        />
      ) : null}

      <BottomSheet ref={sheetRef} snapPoints={SHEET_80} index={-1}>
        <SheetNovoEvento
          onSalvar={(payload) => {
            void handleCriarEvento(payload);
          }}
          onCancelar={() => sheetRef.current?.close()}
          salvando={salvandoEvento}
          resetKey={resetKeyEvento}
        />
      </BottomSheet>

      <ConfirmarExclusao
        visible={eventoParaApagar !== null}
        titulo="Apagar evento?"
        descricao={
          eventoParaApagar !== null
            ? `"${eventoParaApagar.titulo}" será removido do Google Calendar.`
            : undefined
        }
        onConfirmar={() => {
          void handleConfirmarApagar();
        }}
        onCancelar={() => {
          if (!apagando) setEventoParaApagar(null);
        }}
        excluindo={apagando}
      />
    </Screen>
  );
}
