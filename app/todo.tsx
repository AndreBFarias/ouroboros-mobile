// Tela unica de Tarefas (M17). Toggle todoLeve em Settings habilita
// a aba; sem ele, esta tela so e acessivel por deep link manual.
//
// Layout:
//  - Header "Tarefas" laranja.
//  - BarraBusca (sticky no topo do FlatList interno).
//  - ListaArrastavel com pendentes (drag & drop por long-press).
//  - Collapse "Feitas (N)" abaixo, sem drag.
//  - FAB '+' canto inferior direito abre <SheetNovaTarefa>.
//  - Modal confirmacao de exclusao via <Pressable> dentro de Modal RN.
//
// Persistencia da ordem custom em SecureStore chave
// 'ouroboros.todo.ordem.v1' (array de paths em ordem).
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import {
  BottomSheet,
  Button,
  EmptyState,
  FAB,
  Header,
  Screen,
  SHEET_60,
  useToast,
  type BottomSheetRef,
} from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  TarefaSchema,
  slugifyTitulo,
  sufixoRandom,
  type Tarefa,
  type TarefaAlarme,
  type TarefaCategoria,
  type TarefaPessoaDestino,
} from '@/lib/schemas/tarefa';
import {
  criarTarefa,
  excluirTarefa,
  listarTarefas,
  marcarFeito,
  escreverTarefa,
  reabrirTarefa,
  type TarefaListada,
} from '@/lib/vault/tarefas';
import { ItemTarefa } from '@/components/todo/ItemTarefa';
import {
  SheetNovaTarefa,
  type SheetNovaTarefaPayload,
} from '@/components/todo/SheetNovaTarefa';
import { MenuLongPress } from '@/components/todo/MenuLongPress';
import { BarraBusca, normalizarBusca } from '@/components/todo/BarraBusca';
import { ListaArrastavel } from '@/components/todo/ListaArrastavel';
import { SecaoConcluidas } from '@/components/todo/SecaoConcluidas';

// Chave SecureStore para ordem custom dos pendentes (array de paths
// relativos). Tarefas novas ou não listadas caem para o topo
// (mantendo ordem natural por data desc após as conhecidas).
const KEY_ORDEM = 'ouroboros.todo.ordem.v1';

async function lerOrdemSalva(): Promise<string[]> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(KEY_ORDEM);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? (parsed.filter((x) => typeof x === 'string') as string[])
        : [];
    } catch {
      return [];
    }
  }
  const raw = await SecureStore.getItemAsync(KEY_ORDEM);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed.filter((x) => typeof x === 'string') as string[])
      : [];
  } catch {
    return [];
  }
}

async function gravarOrdemSalva(rels: string[]): Promise<void> {
  const json = JSON.stringify(rels);
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(KEY_ORDEM, json);
    return;
  }
  await SecureStore.setItemAsync(KEY_ORDEM, json);
}

// Aplica ordem custom no array de pendentes. Tarefas em `salva` vem
// primeiro na ordem que aparecem ali; tarefas não listadas mantem
// ordem natural depois.
function aplicarOrdem(
  pendentes: TarefaListada[],
  salva: string[]
): TarefaListada[] {
  if (salva.length === 0) return pendentes;
  const indice = new Map<string, number>();
  for (let i = 0; i < salva.length; i++) indice.set(salva[i], i);

  return [...pendentes].sort((a, b) => {
    const ia = indice.get(a.rel);
    const ib = indice.get(b.rel);
    const aTem = ia !== undefined;
    const bTem = ib !== undefined;
    if (aTem && bTem) return (ia as number) - (ib as number);
    if (aTem) return -1;
    if (bTem) return 1;
    return 0;
  });
}

// Nova fixture meta (criar). Caller injeta payload completo do Sheet
// M31 (titulo + categoria + destino + alarme).
function novaTarefa(
  autor: 'pessoa_a' | 'pessoa_b',
  payload: {
    titulo: string;
    categoria: TarefaCategoria;
    pessoa_destino: TarefaPessoaDestino;
    alarme: TarefaAlarme | null;
  }
): {
  meta: Tarefa;
  slug: string;
} {
  const agora = new Date();
  const TZ = -180;
  const local = new Date(agora.getTime() + TZ * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const data = `${y}-${m}-${d}`;
  const slugBase = slugifyTitulo(payload.titulo);
  const slug = `${slugBase}-${sufixoRandom()}`;
  const meta: Tarefa = {
    tipo: 'tarefa',
    data,
    autor,
    titulo: payload.titulo,
    feito: false,
    feito_em: null,
    categoria: payload.categoria,
    pessoa_destino: payload.pessoa_destino,
    alarme: payload.alarme,
  };
  return { meta, slug };
}

export default function TelaTarefas() {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const toast = useToast();

  const [tarefas, setTarefas] = useState<TarefaListada[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);
  const [ordemSalva, setOrdemSalva] = useState<string[]>([]);

  // Sheet de criacao/edicao.
  const sheetRef = useRef<BottomSheetRef>(null);
  const [sheetAberto, setSheetAberto] = useState<boolean>(false);
  const [modoSheet, setModoSheet] = useState<'criar' | 'editar'>('criar');
  const [tituloEditando, setTituloEditando] = useState<string>('');
  // M31: campos M31 carregados quando o usuario abre edicao. Sheet le
  // estes para popular categoria/destino/alarme atuais.
  const [categoriaEditando, setCategoriaEditando] =
    useState<TarefaCategoria | undefined>(undefined);
  const [destinoEditando, setDestinoEditando] =
    useState<TarefaPessoaDestino | undefined>(undefined);
  const [alarmeEditando, setAlarmeEditando] =
    useState<TarefaAlarme | null | undefined>(undefined);
  const [relEditando, setRelEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Menu long-press.
  const [menuAlvo, setMenuAlvo] = useState<TarefaListada | null>(null);
  const [modalExcluirVisivel, setModalExcluirVisivel] =
    useState<boolean>(false);
  const [tarefaParaExcluir, setTarefaParaExcluir] =
    useState<TarefaListada | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setTarefas([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarTarefas(vaultRoot);
      setTarefas(lista);
      const ordem = await lerOrdemSalva();
      setOrdemSalva(ordem);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  // Particiona pendentes / feitas com filtro de busca aplicado, e
  // aplica ordem custom nos pendentes.
  const { pendentes, feitas } = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    const pred = (t: TarefaListada) =>
      termo.length === 0
        ? true
        : normalizarBusca(t.meta.titulo).includes(termo);

    const filtradas = tarefas.filter(pred);
    const pend = filtradas.filter((t) => !t.meta.feito);
    const ft = filtradas.filter((t) => t.meta.feito);
    return {
      pendentes: aplicarOrdem(pend, ordemSalva),
      feitas: ft,
    };
  }, [tarefas, busca, ordemSalva]);

  const handleAbrirCriar = useCallback(() => {
    setModoSheet('criar');
    setTituloEditando('');
    setCategoriaEditando(undefined);
    setDestinoEditando(undefined);
    setAlarmeEditando(undefined);
    setRelEditando(null);
    setSheetAberto(true);
    sheetRef.current?.expand();
  }, []);

  const handleFecharSheet = useCallback(() => {
    setSheetAberto(false);
    sheetRef.current?.close();
  }, []);

  const handleSalvarSheet = useCallback(
    async (payload: SheetNovaTarefaPayload) => {
      if (!vaultRoot) {
        toast.show('Vault não conectado.', 'error');
        return;
      }
      setSalvando(true);
      try {
        if (modoSheet === 'criar') {
          const { meta, slug } = novaTarefa(pessoaAtiva, payload);
          const parsed = TarefaSchema.parse(meta);
          await criarTarefa(vaultRoot, parsed, slug);
          haptics.success();
          toast.show('Tarefa anotada.', 'success');
        } else if (relEditando) {
          // Re-ler atual para preservar feito/feito_em durante edicao.
          // M31: tambem aplica categoria/destino/alarme do payload.
          const atual = tarefas.find((t) => t.rel === relEditando);
          if (atual) {
            const atualizado: Tarefa = {
              ...atual.meta,
              titulo: payload.titulo,
              categoria: payload.categoria,
              pessoa_destino: payload.pessoa_destino,
              alarme: payload.alarme,
            };
            await escreverTarefa(vaultRoot, relEditando, atualizado);
            haptics.success();
            toast.show('Tarefa atualizada.', 'success');
          }
        }
        handleFecharSheet();
        await carregar();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha desconhecida';
        haptics.error();
        toast.show(`Falha ao salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [
      vaultRoot,
      modoSheet,
      relEditando,
      pessoaAtiva,
      tarefas,
      toast,
      handleFecharSheet,
      carregar,
    ]
  );

  const handleTap = useCallback(
    async (item: TarefaListada) => {
      if (!vaultRoot) return;
      try {
        await marcarFeito(vaultRoot, item.rel, !item.meta.feito);
        haptics.selection();
        // Atualiza estado local sem recarregar do disco para a animacao
        // de slide/fade ficar suave.
        setTarefas((cur) =>
          cur.map((t) =>
            t.rel === item.rel
              ? {
                  ...t,
                  meta: {
                    ...t.meta,
                    feito: !t.meta.feito,
                    feito_em: !t.meta.feito ? new Date().toISOString() : null,
                  },
                }
              : t
          )
        );
      } catch {
        toast.show('Não foi possível alterar a tarefa.', 'error');
      }
    },
    [vaultRoot, toast]
  );

  // M31: tap em concluida nao alterna feito (ja eh true) - reabre
  // imediatamente. Decisao alinhada ao mesmo gesto da pendente: tap
  // resolve um lado, long-press abre menu para opcoes destrutivas.
  const handleTapConcluida = useCallback(
    async (item: TarefaListada) => {
      if (!vaultRoot) return;
      try {
        await reabrirTarefa(vaultRoot, item.rel);
        haptics.selection();
        setTarefas((cur) =>
          cur.map((t) =>
            t.rel === item.rel
              ? {
                  ...t,
                  meta: { ...t.meta, feito: false, feito_em: null },
                }
              : t
          )
        );
        toast.show('Tarefa reaberta.', 'success');
      } catch {
        toast.show('Não foi possível reabrir.', 'error');
      }
    },
    [vaultRoot, toast]
  );

  const handleLongPress = useCallback((item: TarefaListada) => {
    setMenuAlvo(item);
  }, []);

  const handleAbrirEditar = useCallback(() => {
    if (!menuAlvo) return;
    setModoSheet('editar');
    setTituloEditando(menuAlvo.meta.titulo);
    setCategoriaEditando(menuAlvo.meta.categoria);
    setDestinoEditando(menuAlvo.meta.pessoa_destino);
    setAlarmeEditando(menuAlvo.meta.alarme);
    setRelEditando(menuAlvo.rel);
    setMenuAlvo(null);
    setSheetAberto(true);
    sheetRef.current?.expand();
  }, [menuAlvo]);

  const handleAbrirExcluir = useCallback(() => {
    if (!menuAlvo) return;
    setTarefaParaExcluir(menuAlvo);
    setMenuAlvo(null);
    setModalExcluirVisivel(true);
  }, [menuAlvo]);

  // M31: reabrir a partir do menu long-press de uma tarefa concluida.
  // Inverte feito + atualiza estado local (sem reload pesado).
  const handleReabrirMenu = useCallback(async () => {
    if (!menuAlvo || !vaultRoot) return;
    try {
      await reabrirTarefa(vaultRoot, menuAlvo.rel);
      haptics.success();
      toast.show('Tarefa reaberta.', 'success');
      setTarefas((cur) =>
        cur.map((t) =>
          t.rel === menuAlvo.rel
            ? {
                ...t,
                meta: { ...t.meta, feito: false, feito_em: null },
              }
            : t
        )
      );
      setMenuAlvo(null);
    } catch {
      haptics.error();
      toast.show('Não foi possível reabrir.', 'error');
    }
  }, [menuAlvo, vaultRoot, toast]);

  const handleConfirmarExclusao = useCallback(async () => {
    if (!vaultRoot || !tarefaParaExcluir) return;
    try {
      await excluirTarefa(vaultRoot, tarefaParaExcluir.rel);
      haptics.success();
      toast.show('Tarefa movida para a lixeira.', 'success');
      setModalExcluirVisivel(false);
      setTarefaParaExcluir(null);
      await carregar();
    } catch {
      haptics.error();
      toast.show('Falha ao excluir.', 'error');
    }
  }, [vaultRoot, tarefaParaExcluir, toast, carregar]);

  const handleReorder = useCallback(
    (nova: TarefaListada[]) => {
      const rels = nova.map((t) => t.rel);
      setOrdemSalva(rels);
      // Atualiza a estrutura tarefas reordenando pendentes; feitas
      // ficam intactas.
      setTarefas((cur) => {
        const ft = cur.filter((t) => t.meta.feito);
        return [...nova, ...ft];
      });
      void gravarOrdemSalva(rels);
    },
    []
  );

  const handleResetarOrdem = useCallback(async () => {
    setOrdemSalva([]);
    await gravarOrdemSalva([]);
    haptics.light();
    toast.show('Ordem padrão restaurada.', 'success');
    await carregar();
  }, [toast, carregar]);

  const semDados = !carregando && tarefas.length === 0;
  const buscaSemResultado =
    !carregando &&
    tarefas.length > 0 &&
    pendentes.length === 0 &&
    feitas.length === 0;

  // Header da lista (sticky-ish via ListHeaderComponent).
  const listHeader = (
    <View
      style={{ paddingBottom: spacing.base, gap: spacing.base }}
    >
      <BarraBusca value={busca} onChangeText={setBusca} />
      {ordemSalva.length > 0 && busca.length === 0 ? (
        <Pressable
          onPress={() => void handleResetarOrdem()}
          accessibilityRole="button"
          accessibilityLabel="restaurar ordem padrao"
          style={{ alignSelf: 'flex-end' }}
        >
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Restaurar ordem
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  // M31: footer agora delega para SecaoConcluidas (collapsable, empty
  // state silencioso, default colapsada quando >5). Tap em concluida
  // reabre via handleTapConcluida; long-press abre menu Reabrir/Apagar.
  const listFooter = (
    <SecaoConcluidas
      itens={feitas}
      onTap={(item) => void handleTapConcluida(item)}
      onLongPress={(item) => handleLongPress(item)}
    />
  );

  return (
    <Screen>
      <Header title="Tarefas" />

      {semDados ? (
        <View style={{ paddingTop: spacing.huge }}>
          <EmptyState
            frase="Sem tarefas. Crie quando quiser."
            Icon={ListChecks}
          />
        </View>
      ) : (
        <View style={{ flex: 1, paddingTop: spacing.base }}>
          <ListaArrastavel
            data={pendentes}
            onReorder={handleReorder}
            ListHeaderComponent={listHeader}
            ListFooterComponent={
              <>
                {buscaSemResultado ? (
                  <View style={{ paddingTop: spacing.lg }}>
                    <EmptyState
                      frase="Nenhuma tarefa encontrada."
                      Icon={ListChecks}
                    />
                  </View>
                ) : null}
                {listFooter}
              </>
            }
            renderItem={({ item, drag, isActive }) => (
              <MotiView
                animate={{ opacity: isActive ? 0.85 : 1 }}
                transition={springs.subtle}
                style={{ paddingHorizontal: 0 }}
              >
                <ItemTarefa
                  tarefa={item.meta}
                  onTap={() => void handleTap(item)}
                  onLongPress={() => {
                    drag();
                    handleLongPress(item);
                  }}
                />
              </MotiView>
            )}
          />
        </View>
      )}

      <FAB onPress={handleAbrirCriar} accessibilityLabel="nova tarefa" />

      {/* BottomSheet criar/editar. Mantemos sempre montado; abre/fecha
          via ref. */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={SHEET_60}
        index={sheetAberto ? 0 : -1}
        onChange={(idx) => setSheetAberto(idx >= 0)}
      >
        <SheetNovaTarefa
          tituloInicial={tituloEditando}
          modo={modoSheet}
          categoriaInicial={categoriaEditando}
          destinoInicial={destinoEditando}
          alarmeInicial={alarmeEditando}
          onSalvar={(payload) => void handleSalvarSheet(payload)}
          onCancelar={handleFecharSheet}
          salvando={salvando}
        />
      </BottomSheet>

      {/* Menu long-press. M31: tarefa concluida abre acoes Reabrir/
          Apagar definitivo; pendente mantem Editar/Excluir (M17). */}
      <MenuLongPress
        visible={menuAlvo !== null}
        tituloAlvo={menuAlvo?.meta.titulo}
        onEditar={handleAbrirEditar}
        onExcluir={handleAbrirExcluir}
        acoes={
          menuAlvo?.meta.feito
            ? [
                {
                  label: 'Reabrir',
                  corTexto: colors.fg,
                  onPress: () => void handleReabrirMenu(),
                  accessibilityLabel: 'reabrir tarefa concluida',
                },
                {
                  label: 'Apagar definitivo',
                  corTexto: colors.red,
                  onPress: handleAbrirExcluir,
                  accessibilityLabel: 'apagar tarefa definitivamente',
                },
              ]
            : undefined
        }
        onFechar={() => setMenuAlvo(null)}
      />

      {/* Modal confirmacao de exclusao. */}
      <Modal
        visible={modalExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExcluirVisivel(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 21, 26, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.modal,
              padding: spacing.lg,
              gap: spacing.base,
              width: '100%',
              maxWidth: 360,
            }}
            accessibilityLabel="modal confirmar exclusao tarefa"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 22,
              }}
            >
              Excluir tarefa?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              A tarefa será movida para a lixeira. Você pode
              recuperá-la manualmente em até 30 dias.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar exclusão"
                onPress={() => void handleConfirmarExclusao()}
                variant="destructive"
              />
              <Button
                label="Cancelar"
                onPress={() => setModalExcluirVisivel(false)}
                variant="ghost"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
