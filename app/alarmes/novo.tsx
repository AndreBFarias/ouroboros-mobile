// Tela de cadastro/edicao de Alarme (M16). Reusada como /alarmes/novo
// (criar) e /alarmes/[slug] (editar) via export compartilhado.
//
// Form contem:
//   - Input titulo.
//   - Botao revelando DateTimePicker para horario HH:MM.
//   - SeletorDias (chips redondos 36dp).
//   - ChipGroup tag (medicacao, treino, outro).
//   - ChipGroup som (gentle, normal, forte).
//   - Slider snooze 1-30 min (default 5).
//   - Toggle ativo (default on para novo).
//   - Botao Salvar primary, Excluir destructive (so em edicao).
//
// Pos-Salvar: agendar via wrapper -> escrever no Vault -> toast
// "Alarme salvo." -> router.back.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Button,
  ChipGroup,
  Header,
  Input,
  Screen,
  Slider,
  Toggle,
  useToast,
} from '@/components/ui';
import { SeletorDias } from '@/components/alarmes/SeletorDias';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { useSessao } from '@/lib/stores/sessao';
import { useAutoSaveRascunho } from '@/lib/hooks/useAutoSaveRascunho';
import {
  escreverAlarme,
  excluirAlarme,
  lerAlarme,
  listarAlarmes,
} from '@/lib/vault/alarmes';
import {
  agendarAlarme,
  cancelarAlarme,
} from '@/lib/services/alarmesNotificacoes';
import { comTimeout } from '@/lib/util/comTimeout';
import {
  AlarmeSchema,
  RECORRENCIAS_CANONICAS,
  RECORRENCIA_LABELS,
  SONS_CANONICOS,
  SOM_LABELS,
  TAGS_CANONICAS,
  TAG_LABELS,
  slugifyTitulo,
  type Alarme,
  type AlarmeSom,
  type AlarmeTag,
  type Recorrencia,
} from '@/lib/schemas/alarme';

const TAG_OPTIONS = TAGS_CANONICAS.map((t) => ({
  value: t,
  label: TAG_LABELS[t],
  accent: 'orange' as const,
}));

const SOM_OPTIONS = SONS_CANONICOS.map((s) => ({
  value: s,
  label: SOM_LABELS[s],
  accent: 'cyan' as const,
}));

// M30: opcoes de recorrencia. Roxo Dracula (--purple) reforca que e
// um seletor de cadencia, nao categoria conceitual.
const RECORRENCIA_OPTIONS = RECORRENCIAS_CANONICAS.map((r) => ({
  value: r,
  label: RECORRENCIA_LABELS[r],
  accent: 'purple' as const,
}));

// Helpers para data_unica em ISO. parsearDataUnica devolve Date ou
// data corrente como fallback. formatIso devolve string ISO com offset
// (compativel com IsoDatetime do schema).
function parsearDataUnica(iso: string | undefined): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function formatIso(d: Date): string {
  return d.toISOString().replace('Z', '+00:00');
}

function parseHoraParaDate(hora: string): Date {
  const [h, m] = hora.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10) || 9, parseInt(m, 10) || 0, 0, 0);
  return d;
}

function formatHora(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function nowIso(): string {
  // Formato com offset; alinha com IsoDatetime do AlarmeSchema. Usamos
  // toISOString (Z) e convertemos para -03:00 simbolicamente: o schema
  // aceita Z também, entao basta retornar toISOString.
  return new Date().toISOString().replace('Z', '+00:00');
}

// Garante que slug não colida com outro alarme existente. Se já existe,
// adiciona sufixo numerico ('-2', '-3', ...) até disponível. Retorna
// null se não foi possivel resolver (improvavel; loop limitado a 50).
async function resolverSlugUnico(
  vaultRoot: string,
  base: string,
  ignorar?: string
): Promise<string | null> {
  const existentes = await listarAlarmes(vaultRoot);
  const usados = new Set(
    existentes.filter((a) => a.slug !== ignorar).map((a) => a.slug)
  );
  if (!usados.has(base)) return base;
  for (let i = 2; i <= 50; i++) {
    const candidato = `${base}-${i}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

export default function AlarmesNovoOuEditar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const editando = slugParam !== null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  // M24: rascunho previo. So usado em modo criacao - edicao popula
  // dados a partir do alarme persistido (fonte da verdade) e nao deve
  // ser sobrescrita por rascunho antigo de outra criacao.
  const rascunho = useSessao((s) => s.rascunhos.alarmesNovo);
  const usarRascunho = !editando;

  const [titulo, setTitulo] = useState(() =>
    usarRascunho ? (rascunho?.titulo ?? '') : ''
  );
  const [horario, setHorario] = useState(() =>
    usarRascunho ? (rascunho?.horario ?? '08:00') : '08:00'
  );
  const [diasSemana, setDiasSemana] = useState<number[]>(() =>
    usarRascunho ? (rascunho?.dias_semana ?? [1, 2, 3, 4, 5]) : [1, 2, 3, 4, 5]
  );
  const [tag, setTag] = useState<AlarmeTag>(() =>
    usarRascunho ? (rascunho?.tag ?? 'medicacao') : 'medicacao'
  );
  const [som, setSom] = useState<AlarmeSom>(() =>
    usarRascunho ? (rascunho?.som ?? 'gentle') : 'gentle'
  );
  const [snoozeMinutos, setSnoozeMinutos] = useState<number>(() =>
    usarRascunho ? (rascunho?.snooze_minutos ?? 5) : 5
  );
  const [ativo, setAtivo] = useState<boolean>(() =>
    usarRascunho ? (rascunho?.ativo ?? true) : true
  );
  // M30: recorrencia v2. Default 'semanal' preserva fluxo v1 do
  // formulario (chips de dia da semana visiveis).
  const [recorrencia, setRecorrencia] = useState<Recorrencia>(() =>
    usarRascunho ? (rascunho?.recorrencia ?? 'semanal') : 'semanal'
  );
  // M30: data_unica para recorrencia 'unica' e dia derivado para
  // 'mensal'. Default uma hora a frente da hora atual para evitar
  // alarme imediato/atrasado em criacao apressada.
  const [dataUnica, setDataUnica] = useState<string | undefined>(() =>
    usarRascunho ? rascunho?.data_unica : undefined
  );

  const [pickerAberto, setPickerAberto] = useState(false);
  // M30: picker dedicado para data_unica (mode date). Independente do
  // pickerAberto que controla horario (mode time).
  const [pickerDataAberto, setPickerDataAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);

  // Original carregado em edicao (usado para preservar criado_em e
  // notification_ids pre-existentes até re-agendar).
  const [original, setOriginal] = useState<Alarme | null>(null);

  // M24: snapshot do rascunho debounced. So salva em modo criacao.
  // Edicao tem fonte da verdade no Vault e nao deve poluir rascunho.
  const snapshotRascunho = useMemo(
    () => ({
      titulo,
      horario,
      dias_semana: diasSemana,
      recorrencia,
      data_unica: dataUnica,
      tag,
      som,
      snooze_minutos: snoozeMinutos,
      ativo,
    }),
    [
      titulo,
      horario,
      diasSemana,
      recorrencia,
      dataUnica,
      tag,
      som,
      snoozeMinutos,
      ativo,
    ]
  );
  // Hook chamado sempre (regra dos hooks); guard interno evita
  // overwrite indevido em modo edicao.
  useAutoSaveRascunho(
    'alarmesNovo',
    usarRascunho ? snapshotRascunho : (rascunho ?? snapshotRascunho)
  );

  // Carregamento inicial em edicao.
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!editando || !vaultRoot || !slugParam) return;
      try {
        const lido = await lerAlarme(vaultRoot, slugParam);
        if (!ativo || !lido) return;
        setOriginal(lido);
        setTitulo(lido.titulo);
        setHorario(lido.horario);
        setDiasSemana(lido.dias_semana);
        setRecorrencia(lido.recorrencia);
        setDataUnica(lido.data_unica);
        setTag(lido.tag);
        setSom(lido.som);
        setSnoozeMinutos(lido.snooze_minutos);
        setAtivo(lido.ativo);
      } catch {
        // Mantem defaults; UI mostra erro no salvar.
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [editando, vaultRoot, slugParam]);

  const tituloValido = titulo.trim().length > 0;
  const formValido = useMemo(() => {
    if (!tituloValido) return false;
    if (!/^\d{1,2}:\d{2}$/.test(horario)) return false;
    // M30: validacao por recorrencia. semanal exige >=1 dia; unica
    // exige data_unica preenchida; diaria/mensal nao tem requisito
    // adicional alem de horario.
    if (recorrencia === 'semanal' && diasSemana.length === 0) return false;
    if (recorrencia === 'unica' && !dataUnica) return false;
    return true;
  }, [tituloValido, horario, recorrencia, diasSemana, dataUnica]);

  const handleHorarioChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerAberto(false);
    if (event.type === 'dismissed') return;
    if (selecionado) setHorario(formatHora(selecionado));
  };

  // M30: handler do DateTimePicker em modo date para recorrencia
  // 'unica' (data + hora) e 'mensal' (dia do mes). No caso unica
  // tambem atualizamos horario para alinhar com o instante escolhido.
  const handleDataUnicaChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerDataAberto(false);
    if (event.type === 'dismissed') return;
    if (!selecionado) return;
    setDataUnica(formatIso(selecionado));
    if (recorrencia === 'unica') {
      setHorario(formatHora(selecionado));
    }
  };

  const handleRecorrenciaChange = useCallback((next: string | null) => {
    if (
      next === 'unica' ||
      next === 'diaria' ||
      next === 'semanal' ||
      next === 'mensal'
    ) {
      setRecorrencia(next);
    }
  }, []);

  const handleSalvar = useCallback(async () => {
    if (!vaultRoot || salvando || !formValido) return;
    setSalvando(true);
    try {
      const baseSlug = editando && original
        ? original.slug
        : slugifyTitulo(titulo);
      if (baseSlug.length === 0) {
        toast.show('Título inválido.', 'error');
        return;
      }

      const slug = await resolverSlugUnico(
        vaultRoot,
        baseSlug,
        editando ? baseSlug : undefined
      );
      if (!slug) {
        toast.show('Não foi possível salvar.', 'error');
        return;
      }

      // Cancela schedules antigos (edicao). Novo alarme não tem nada
      // a cancelar mas o helper e idempotente. Envolvido em comTimeout
      // para impedir loader infinito caso expo-notifications trave em
      // OEMs com Doze agressivo (I-ALARME).
      await comTimeout(cancelarAlarme(slug));

      const proposto: Alarme = {
        tipo: 'alarme',
        slug,
        titulo: titulo.trim(),
        horario,
        // M30: dias_semana so faz sentido em recorrencia 'semanal'.
        // Para outras formas, gravamos array vazio para manter o blob
        // limpo (cross-field do schema permite).
        dias_semana: recorrencia === 'semanal' ? diasSemana : [],
        recorrencia,
        // M30: data_unica preservada apenas para 'unica' e 'mensal'
        // (mensal a usa para derivar dia do mes). Nas outras viramos
        // undefined explicitamente.
        data_unica:
          recorrencia === 'unica' || recorrencia === 'mensal'
            ? dataUnica
            : undefined,
        tag,
        som,
        ativo,
        snooze_minutos: snoozeMinutos,
        criado_em: original?.criado_em ?? nowIso(),
        ultimo_disparo: original?.ultimo_disparo ?? null,
        notification_ids: [],
        snooze_id: null,
      };

      const parsed = AlarmeSchema.safeParse(proposto);
      if (!parsed.success) {
        toast.show('Dados inválidos.', 'error');
        return;
      }

      // Agenda primeiro: precisamos dos ids pra salvar no .md.
      // I-ALARME: agendarAlarme sob comTimeout - APIs nativas de
      // notif podem travar em OEMs MIUI/OneUI quando o channel ainda
      // nao foi criado.
      let notificationIds: string[] = [];
      if (parsed.data.ativo) {
        const res = await comTimeout(agendarAlarme(parsed.data));
        if (res.estourou) {
          toast.show(
            'Limite de 64 alarmes atingido. Desative algum antes de criar.',
            'error'
          );
          return;
        }
        notificationIds = res.ids;
      }

      const persistido: Alarme = {
        ...parsed.data,
        notification_ids: notificationIds,
      };
      // M38: passa modoCriacao=!editando para que escreverAlarme
      // aplique suffix '-<deviceId>' caso outro device ja tenha
      // criado alarme com mesmo slug (conflict resolution Syncthing).
      // I-ALARME: comTimeout impede loader infinito quando SAF write
      // trava (A29 - URI corrupta em OEMs).
      await comTimeout(escreverAlarme(vaultRoot, persistido, '', !editando));
      // M24: limpa rascunho de criacao pos-save bem-sucedido. Em
      // modo edicao tambem limpamos para nao recarregar dados antigos
      // se o usuario abrir /alarmes/novo depois.
      useSessao.getState().limparRascunho('alarmesNovo');
      void haptics.light();
      toast.show('Alarme salvo.', 'success');
      router.back();
    } catch (e) {
      // I-ALARME: expoe a causa raiz no toast (timeout salvando, URI
      // invalida, permission denied) para suportar diagnose pelo
      // usuario sem precisar de adb.
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      // eslint-disable-next-line no-console
      console.error('save alarme fail', e);
    } finally {
      setSalvando(false);
    }
  }, [
    vaultRoot,
    salvando,
    formValido,
    editando,
    original,
    titulo,
    horario,
    diasSemana,
    recorrencia,
    dataUnica,
    tag,
    som,
    ativo,
    snoozeMinutos,
    toast,
    router,
  ]);

  const handleExcluir = useCallback(async () => {
    if (!vaultRoot || !original) return;
    try {
      await cancelarAlarme(original.slug);
      await excluirAlarme(vaultRoot, original.slug);
      toast.show('Alarme removido.', 'success');
      router.back();
    } catch {
      toast.show('Não foi possível remover.', 'error');
    }
  }, [vaultRoot, original, toast, router]);

  const handleTagChange = useCallback((next: string | null) => {
    if (next === 'medicacao' || next === 'treino' || next === 'outro') {
      setTag(next);
    }
  }, []);

  const handleSomChange = useCallback((next: string | null) => {
    if (next === 'gentle' || next === 'normal' || next === 'forte') {
      setSom(next);
    }
  }, []);

  const tituloHeader = editando ? 'Editar alarme' : 'Novo alarme';

  return (
    <Screen>
      <Header title={tituloHeader} onBack={() => router.back()} />

      {carregando ? (
        <View style={{ flex: 1 }} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: spacing.base,
            paddingBottom: spacing.huge,
            gap: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Título"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex.: Medicação da manhã"
            accessibilityLabel="titulo do alarme"
          />

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Horário
            </Text>
            <Pressable
              onPress={() => setPickerAberto(true)}
              accessibilityRole="button"
              accessibilityLabel="abrir seletor de horario"
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
                  fontSize: 20,
                }}
              >
                {horario}
              </Text>
            </Pressable>
            {pickerAberto ? (
              <DateTimePicker
                value={parseHoraParaDate(horario)}
                mode="time"
                is24Hour
                onChange={handleHorarioChange}
              />
            ) : null}
          </View>

          {/* M30: ChipGroup de recorrencia. Vem antes dos seletores
              dependentes (dias_semana, data_unica) porque a escolha
              aqui condiciona quais campos sao mostrados abaixo. */}
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Recorrência
            </Text>
            <ChipGroup
              mode="single"
              value={recorrencia}
              onChange={handleRecorrenciaChange}
              options={RECORRENCIA_OPTIONS}
            />
          </View>

          {recorrencia === 'semanal' ? (
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Dias da semana
              </Text>
              <SeletorDias value={diasSemana} onChange={setDiasSemana} />
            </View>
          ) : null}

          {recorrencia === 'unica' || recorrencia === 'mensal' ? (
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {recorrencia === 'unica' ? 'Data' : 'Dia do mês'}
              </Text>
              <Pressable
                onPress={() => setPickerDataAberto(true)}
                accessibilityRole="button"
                accessibilityLabel="abrir seletor de data"
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
                  }}
                >
                  {dataUnica
                    ? recorrencia === 'mensal'
                      ? `Dia ${parsearDataUnica(dataUnica).getDate()}`
                      : parsearDataUnica(dataUnica).toLocaleDateString(
                          'pt-BR'
                        )
                    : 'Selecionar'}
                </Text>
              </Pressable>
              {pickerDataAberto ? (
                <DateTimePicker
                  value={parsearDataUnica(dataUnica)}
                  mode="date"
                  onChange={handleDataUnicaChange}
                />
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Categoria
            </Text>
            <ChipGroup
              mode="single"
              value={tag}
              onChange={handleTagChange}
              options={TAG_OPTIONS}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Som
            </Text>
            <ChipGroup
              mode="single"
              value={som}
              onChange={handleSomChange}
              options={SOM_OPTIONS}
            />
          </View>

          <Slider
            label={`Soneca ${snoozeMinutos} min`}
            value={snoozeMinutos}
            min={1}
            max={30}
            step={1}
            onChange={setSnoozeMinutos}
            accessibilityLabel="duracao da soneca em minutos"
          />

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
                }}
              >
                Ativo
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  marginTop: spacing.xs,
                }}
              >
                Quando desligado, o alarme não dispara.
              </Text>
            </View>
            <Toggle
              value={ativo}
              onChange={setAtivo}
              accessibilityLabel="alternar alarme ativo"
            />
          </View>

          {editando ? (
            <View style={{ marginTop: spacing.base }}>
              <Button
                label="Excluir alarme"
                onPress={() => void handleExcluir()}
                variant="destructive"
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Salvar"
          onPress={() => void handleSalvar()}
          variant="primary"
          disabled={salvando || !formValido || !vaultRoot}
        />
      </View>
    </Screen>
  );
}
