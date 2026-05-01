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
import {
  AlarmeSchema,
  SONS_CANONICOS,
  SOM_LABELS,
  TAGS_CANONICAS,
  TAG_LABELS,
  slugifyTitulo,
  type Alarme,
  type AlarmeSom,
  type AlarmeTag,
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
  // aceita Z tambem, entao basta retornar toISOString.
  return new Date().toISOString().replace('Z', '+00:00');
}

// Garante que slug nao colida com outro alarme existente. Se ja existe,
// adiciona sufixo numerico ('-2', '-3', ...) ate disponivel. Retorna
// null se nao foi possivel resolver (improvavel; loop limitado a 50).
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

  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tag, setTag] = useState<AlarmeTag>('medicacao');
  const [som, setSom] = useState<AlarmeSom>('gentle');
  const [snoozeMinutos, setSnoozeMinutos] = useState<number>(5);
  const [ativo, setAtivo] = useState<boolean>(true);

  const [pickerAberto, setPickerAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);

  // Original carregado em edicao (usado para preservar criado_em e
  // notification_ids pre-existentes ate re-agendar).
  const [original, setOriginal] = useState<Alarme | null>(null);

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
  const formValido = useMemo(
    () => tituloValido && diasSemana.length > 0 && /^\d{1,2}:\d{2}$/.test(horario),
    [tituloValido, diasSemana, horario]
  );

  const handleHorarioChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerAberto(false);
    if (event.type === 'dismissed') return;
    if (selecionado) setHorario(formatHora(selecionado));
  };

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

      // Cancela schedules antigos (edicao). Novo alarme nao tem nada
      // a cancelar mas o helper e idempotente.
      await cancelarAlarme(slug);

      const proposto: Alarme = {
        tipo: 'alarme',
        slug,
        titulo: titulo.trim(),
        horario,
        dias_semana: diasSemana,
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
      let notificationIds: string[] = [];
      if (parsed.data.ativo) {
        const res = await agendarAlarme(parsed.data);
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
      await escreverAlarme(vaultRoot, persistido);
      void haptics.light();
      toast.show('Alarme salvo.', 'success');
      router.back();
    } catch {
      toast.show('Não foi possível salvar.', 'error');
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
