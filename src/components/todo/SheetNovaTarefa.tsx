// BottomSheet para criar tarefa nova ou editar existente (M17 + M31).
// Conteudo: titulo + ChipGroup de categoria (8 slugs) + SeletorPessoaDestino
// + Toggle de alarme expansivel (DateTimePicker + chip recorrencia).
//
// Caller cuida de abrir/fechar o sheet (ref.expand/close); este
// componente apenas renderiza o conteudo interno e dispara onSalvar
// com um payload completo (titulo + categoria + destino + alarme).
//
// Compat: o callback onSalvar recebe um objeto com campos novos
// (modelo M31) e nao mais string solta. O caller (app/todo.tsx)
// monta o Tarefa final com data/autor/feito.
//
// Armadilha A17 (BRIEF): BottomSheetTextInput com autoFocus em RN Web
// dispara erro 'RNTextInput.default.State.currentlyFocusedInput is
// not a function'. Em nativo (Android/iOS) funciona normalmente.
// Mantemos autoFocus condicional para preservar UX em mobile e
// permitir validação Nível A em web.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import {
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Briefcase,
  Heart,
  HelpCircle,
  Home,
  Repeat,
  Scale,
  Sparkles,
  Wallet,
  type LucideIcon,
} from '@/lib/icons';
import { Button, ChipGroup, Toggle } from '@/components/ui';
import type { ChipAccent } from '@/components/ui/Chip';
import { colors, radius, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { useSessao } from '@/lib/stores/sessao';
import { useAutoSaveRascunho } from '@/lib/hooks/useAutoSaveRascunho';
import {
  TAREFA_CATEGORIAS,
  TAREFA_CATEGORIA_LABELS,
  type TarefaAlarme,
  type TarefaCategoria,
  type TarefaPessoaDestino,
} from '@/lib/schemas/tarefa';
import { SeletorPessoaDestino } from '@/components/todo/SeletorPessoaDestino';

// Payload entregue ao caller no submit. Mantem campos do M17 (titulo)
// e adiciona os campos M31 (categoria/destino/alarme). Caller monta
// Tarefa final com data, autor e feito.
export interface SheetNovaTarefaPayload {
  titulo: string;
  categoria: TarefaCategoria;
  pessoa_destino: TarefaPessoaDestino;
  alarme: TarefaAlarme | null;
}

export interface SheetNovaTarefaProps {
  // Titulo inicial. Em modo criacao = ''. Em modo edicao = titulo
  // atual da tarefa.
  tituloInicial?: string;
  // Modo de operacao: 'criar' (default) ou 'editar'. Ajusta o cabecalho
  // do sheet e o label do botao primario.
  modo?: 'criar' | 'editar';
  // Defaults dos campos M31 quando em edicao. Em criacao, usa defaults
  // canonicos (categoria 'outro', destino 'mim', alarme null).
  categoriaInicial?: TarefaCategoria;
  destinoInicial?: TarefaPessoaDestino;
  alarmeInicial?: TarefaAlarme | null;
  onSalvar: (payload: SheetNovaTarefaPayload) => void;
  onCancelar: () => void;
  // Quando true, bloqueia botao Salvar (durante I/O). Caller controla.
  salvando?: boolean;
}

// Mapeamento de categoria -> icone lucide. Tamanho 18dp dentro do chip
// nao cabe direto no ChipGroup atual (label-only); usamos legenda
// separada acima dos chips. Decisao M31 §9: ChipGroup ja existe e
// label-only e mais consistente com Recorrencia/Tag dos alarmes.
const CATEGORIA_ICON: Record<TarefaCategoria, LucideIcon> = {
  trabalho: Briefcase,
  casa: Home,
  rotina: Repeat,
  financas: Wallet,
  desenvolvimento_pessoal: Sparkles,
  obrigacoes: Scale,
  saude: Heart,
  outro: HelpCircle,
};

// M-DEBITO-UI-UX-SEED-DUO: "outro" e' opcao neutra/generica e nao
// deve competir visualmente com as categorias de cor semantica.
// Aplica accent 'ghost' (muted-decor quando selected) para ele e
// mantem 'orange' para o resto do grupo. Coerente com ADR-010
// hierarquia por contraste.
const CATEGORIA_ACCENTS: Record<TarefaCategoria, ChipAccent> = {
  trabalho: 'orange',
  casa: 'orange',
  rotina: 'orange',
  financas: 'orange',
  desenvolvimento_pessoal: 'orange',
  obrigacoes: 'orange',
  saude: 'orange',
  outro: 'ghost',
};

const CATEGORIA_OPTIONS = TAREFA_CATEGORIAS.map((c) => ({
  value: c,
  label: TAREFA_CATEGORIA_LABELS[c],
  accent: CATEGORIA_ACCENTS[c],
}));

const RECORRENCIA_OPTIONS: ReadonlyArray<{
  value: TarefaAlarme['recorrencia'];
  label: string;
}> = [
  { value: 'unica', label: 'Única' },
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
];

const RECORRENCIA_CHIP_OPTIONS = RECORRENCIA_OPTIONS.map((r) => ({
  value: r.value,
  label: r.label,
  accent: 'purple' as const,
}));

// Defaults canonicos M31 quando criando do zero.
const CATEGORIA_DEFAULT: TarefaCategoria = 'outro';
const DESTINO_DEFAULT: TarefaPessoaDestino = { tipo: 'mim' };

function umaHoraNoFuturo(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function formatIso(d: Date): string {
  return d.toISOString().replace('Z', '+00:00');
}

function parseIso(iso: string | null | undefined): Date {
  if (!iso) return umaHoraNoFuturo();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? umaHoraNoFuturo() : d;
}

function formatDataHoraLegivel(iso: string): string {
  const d = parseIso(iso);
  const data = d.toLocaleDateString('pt-BR');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${data} ${hh}:${mm}`;
}

export function SheetNovaTarefa({
  tituloInicial = '',
  modo = 'criar',
  categoriaInicial,
  destinoInicial,
  alarmeInicial,
  onSalvar,
  onCancelar,
  salvando = false,
}: SheetNovaTarefaProps): ReactNode {
  // M24: rascunho previo (so para modo 'criar'). Em 'editar' a fonte
  // da verdade e tituloInicial passado pelo caller.
  const rascunho = useSessao((s) => s.rascunhos.tarefasNova);
  const sementeTitulo =
    modo === 'criar' && tituloInicial.length === 0 && rascunho?.titulo
      ? rascunho.titulo
      : tituloInicial;

  const [titulo, setTitulo] = useState<string>(sementeTitulo);
  const [categoria, setCategoria] = useState<TarefaCategoria>(
    categoriaInicial ?? CATEGORIA_DEFAULT
  );
  const [destino, setDestino] = useState<TarefaPessoaDestino>(
    destinoInicial ?? DESTINO_DEFAULT
  );
  const [alarmeAtivo, setAlarmeAtivo] = useState<boolean>(
    alarmeInicial?.ativo ?? false
  );
  const [alarmeDataHora, setAlarmeDataHora] = useState<string>(
    alarmeInicial?.data_hora_iso ?? formatIso(umaHoraNoFuturo())
  );
  const [alarmeRecorrencia, setAlarmeRecorrencia] = useState<
    TarefaAlarme['recorrencia']
  >(alarmeInicial?.recorrencia ?? 'unica');
  const [pickerAberto, setPickerAberto] = useState<boolean>(false);

  // Re-sincroniza estado interno quando caller troca tituloInicial
  // (ex: long-press editar em outra tarefa).
  useEffect(() => {
    if (modo === 'editar' || tituloInicial.length > 0) {
      setTitulo(tituloInicial);
    }
  }, [tituloInicial, modo]);

  useEffect(() => {
    if (modo === 'editar') {
      if (categoriaInicial) setCategoria(categoriaInicial);
      if (destinoInicial) setDestino(destinoInicial);
      if (alarmeInicial) {
        setAlarmeAtivo(alarmeInicial.ativo);
        setAlarmeDataHora(
          alarmeInicial.data_hora_iso ?? formatIso(umaHoraNoFuturo())
        );
        setAlarmeRecorrencia(alarmeInicial.recorrencia);
      } else {
        setAlarmeAtivo(false);
      }
    }
  }, [modo, categoriaInicial, destinoInicial, alarmeInicial]);

  // M24: snapshot do rascunho debounced. So salva em 'criar'; em
  // 'editar', escrevemos um objeto vazio para evitar poluir o
  // rascunho com titulo de tarefa ja existente.
  const snapshotRascunho = useMemo(
    () => (modo === 'criar' ? { titulo } : {}),
    [modo, titulo]
  );
  useAutoSaveRascunho('tarefasNova', snapshotRascunho);

  const podeSalvar = titulo.trim().length > 0;
  const cabecalho = modo === 'criar' ? 'Nova tarefa' : 'Editar tarefa';
  const labelBotao = modo === 'criar' ? 'Salvar' : 'Atualizar';

  const handleSalvar = () => {
    if (!podeSalvar || salvando) return;
    if (modo === 'criar') {
      useSessao.getState().limparRascunho('tarefasNova');
    }
    const alarmeFinal: TarefaAlarme | null = alarmeAtivo
      ? {
          ativo: true,
          data_hora_iso: alarmeDataHora,
          recorrencia: alarmeRecorrencia,
        }
      : null;
    onSalvar({
      titulo: titulo.trim(),
      categoria,
      pessoa_destino: destino,
      alarme: alarmeFinal,
    });
  };

  const handleCategoriaChange = (next: string | null) => {
    if (!next) return;
    if ((TAREFA_CATEGORIAS as readonly string[]).includes(next)) {
      setCategoria(next as TarefaCategoria);
    }
  };

  const handleRecorrenciaChange = (next: string | null) => {
    if (
      next === 'unica' ||
      next === 'diaria' ||
      next === 'semanal' ||
      next === 'mensal'
    ) {
      setAlarmeRecorrencia(next);
    }
  };

  const handleDataHoraChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerAberto(false);
    if (event.type === 'dismissed') return;
    if (selecionado) setAlarmeDataHora(formatIso(selecionado));
  };

  const IconeCategoriaAtiva = CATEGORIA_ICON[categoria];

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {cabecalho}
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Título
          </Text>
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: colors.bgElev,
              paddingHorizontal: spacing.base,
              paddingVertical: 10,
            }}
          >
            <BottomSheetTextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Comprar pão"
              placeholderTextColor={colors.mutedDecor}
              autoFocus={Platform.OS !== 'web'}
              autoCapitalize="sentences"
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 44,
              }}
              accessibilityLabel="campo titulo da tarefa"
            />
          </View>
        </View>

        {/* M31: ChipGroup categoria. 8 slugs com ícone visual da
            categoria selecionada acima do grupo (pre-visualizacao). */}
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 14,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Categoria
            </Text>
            <IconeCategoriaAtiva
              size={16}
              color={colors.orange}
              strokeWidth={2}
              accessibilityLabel={`icone categoria ${categoria}`}
            />
          </View>
          <ChipGroup
            mode="single"
            value={categoria}
            onChange={handleCategoriaChange}
            options={CATEGORIA_OPTIONS}
            disabled={salvando}
          />
        </View>

        {/* M31: SeletorPessoaDestino consciente de tipoCompanhia. */}
        <SeletorPessoaDestino
          value={destino}
          onChange={setDestino}
          disabled={salvando}
        />

        {/* M31: toggle de alarme com expansao para data/hora + recorrencia. */}
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: spacing.base,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                Lembrar com alarme
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                  marginTop: spacing.xs,
                }}
              >
                Cria um alarme companion vinculado à tarefa.
              </Text>
            </View>
            <Toggle
              value={alarmeAtivo}
              onChange={setAlarmeAtivo}
              accessibilityLabel="alternar lembrete com alarme"
            />
          </View>

          {/* M-DEBITO-UI-UX-SEED-DUO: bloco expansivel envolto em
              AnimatePresence + MotiView com spring snappy em vez de
              mount/unmount instantaneo. Coerente com ADR-010 (fisica,
              nao duration linear). aria-label inerente para validacao
              E2E na transicao on/off. */}
          <AnimatePresence>
            {alarmeAtivo ? (
              <MotiView
                key="alarme-bloco"
                from={{ opacity: 0, scale: 0.96, translateY: -8 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.96, translateY: -8 }}
                transition={springs.snappy}
                style={{
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                  overflow: 'hidden',
                }}
                accessibilityLabel="bloco alarme expandido"
              >
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Data e hora
              </Text>
              <Pressable
                onPress={() => setPickerAberto(true)}
                accessibilityRole="button"
                accessibilityLabel="abrir seletor de data e hora do alarme"
                style={{
                  backgroundColor: colors.bgAlt,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: colors.bgElev,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                >
                  {formatDataHoraLegivel(alarmeDataHora)}
                </Text>
              </Pressable>
              {pickerAberto ? (
                <DateTimePicker
                  value={parseIso(alarmeDataHora)}
                  mode="datetime"
                  onChange={handleDataHoraChange}
                />
              ) : null}

              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  lineHeight: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginTop: spacing.xs,
                }}
              >
                Recorrência
              </Text>
              <ChipGroup
                mode="single"
                value={alarmeRecorrencia}
                onChange={handleRecorrenciaChange}
                options={RECORRENCIA_CHIP_OPTIONS}
                disabled={salvando}
              />
              </MotiView>
            ) : null}
          </AnimatePresence>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label={labelBotao}
            onPress={handleSalvar}
            variant="primary"
            disabled={!podeSalvar || salvando}
          />
          <Button
            label="Cancelar"
            onPress={onCancelar}
            variant="ghost"
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
