// M37.2: conteudo do BottomSheet para criar um evento novo no Google
// Calendar pela rota /agenda. Form: titulo (obrigatorio) + data + hora
// inicio + hora fim + local + descricao + <SeletorPara>. Botao "Criar"
// verde (variant success).
//
// A18 (BRIEF): o caller (app/agenda.tsx) renderiza este conteudo dentro
// de um <BottomSheet> que por sua vez fica dentro de <Screen>, entao o
// requisito de ter <Screen> por tras ja e satisfeito no callsite.
//
// Armadilha A17: BottomSheetTextInput com autoFocus em RN Web dispara
// erro de foco. autoFocus fica condicional (Platform.OS !== 'web').
//
// Timezone fixo America/Sao_Paulo (decisao M37.2 secao 9): o Brasil
// aboliu horario de verao em 2019, entao o offset e -03:00 o ano todo.
// Montamos o ISO manualmente para evitar bug de fuso do device.
//
// Comentarios sem acento (convencao shell/CI). Strings UI em PT-BR
// sentence case com acentuacao. accessibilityLabel sem acento.
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Button, SeletorPara } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Para } from '@/lib/schemas/para';

// Timezone canonica da sprint (fuso fixo Brasil). Passada ao caller para
// entrar no NovoEventoInput.timeZone e usada no offset do ISO local.
export const TIMEZONE_PADRAO = 'America/Sao_Paulo';
const OFFSET_BRASIL = '-03:00';

// Payload entregue ao caller no submit. inicioIso/fimIso ja combinam
// data + hora com o offset fixo. O caller monta o NovoEventoInput
// (adiciona timeZone) e chama criarEvento com o token da conta alvo.
export interface SheetNovoEventoPayload {
  titulo: string;
  inicioIso: string;
  fimIso: string;
  local?: string;
  descricao?: string;
  para: Para;
}

export interface SheetNovoEventoProps {
  onSalvar: (payload: SheetNovoEventoPayload) => void;
  onCancelar: () => void;
  // Quando true, bloqueia o botao Criar (durante I/O). Caller controla.
  salvando?: boolean;
  // Incrementar reseta o form aos defaults (apos criar com sucesso).
  resetKey?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Combina a parte de data de `data` com a parte de hora de `hora` num
// ISO 8601 com offset fixo Brasil (-03:00).
function montarIsoLocal(data: Date, hora: Date): string {
  const y = data.getFullYear();
  const m = pad(data.getMonth() + 1);
  const d = pad(data.getDate());
  const hh = pad(hora.getHours());
  const mm = pad(hora.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}:00${OFFSET_BRASIL}`;
}

// Agora arredondado para cima ao proximo multiplo de 15 minutos. Se ja
// esta num limite de 15, mantem.
function agoraArredondado15(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  const min = d.getMinutes();
  const resto = min % 15;
  if (resto !== 0) d.setMinutes(min + (15 - resto));
  return d;
}

function umaHoraDepois(base: Date): Date {
  const d = new Date(base.getTime());
  d.setHours(d.getHours() + 1);
  return d;
}

function minutosDoDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function somarDias(d: Date, dias: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + dias);
  return out;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function formatarHora(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const LABEL_STYLE = {
  color: colors.muted,
  fontFamily: 'JetBrainsMono_400Regular' as const,
  fontSize: 11,
  lineHeight: 14,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
};

type PickerAberto = 'data' | 'inicio' | 'fim' | null;

function defaults(): { data: Date; inicio: Date; fim: Date } {
  const inicio = agoraArredondado15();
  return { data: new Date(), inicio, fim: umaHoraDepois(inicio) };
}

export function SheetNovoEvento({
  onSalvar,
  onCancelar,
  salvando = false,
  resetKey = 0,
}: SheetNovoEventoProps): ReactNode {
  const iniciais = defaults();
  const [titulo, setTitulo] = useState<string>('');
  const [data, setData] = useState<Date>(iniciais.data);
  const [horaInicio, setHoraInicio] = useState<Date>(iniciais.inicio);
  const [horaFim, setHoraFim] = useState<Date>(iniciais.fim);
  const [local, setLocal] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [para, setPara] = useState<Para>({ tipo: 'mim' });
  const [pickerAberto, setPickerAberto] = useState<PickerAberto>(null);

  // Reset aos defaults quando o caller sinaliza (apos criar com sucesso).
  useEffect(() => {
    if (resetKey === 0) return;
    const d = defaults();
    setTitulo('');
    setData(d.data);
    setHoraInicio(d.inicio);
    setHoraFim(d.fim);
    setLocal('');
    setDescricao('');
    setPara({ tipo: 'mim' });
    setPickerAberto(null);
  }, [resetKey]);

  const inicioIso = montarIsoLocal(data, horaInicio);
  // Se o fim tem hora-do-dia <= a do inicio, o evento cruza a meia-noite:
  // o fim cai no dia seguinte. Evita default invalido quando "agora" e
  // tarde (ex: inicio 23:30 -> fim 00:30 do dia seguinte).
  const fimCruzaMeiaNoite = minutosDoDia(horaFim) <= minutosDoDia(horaInicio);
  const dataFim = fimCruzaMeiaNoite ? somarDias(data, 1) : data;
  const fimIso = montarIsoLocal(dataFim, horaFim);
  const podeSalvar = titulo.trim().length > 0;

  const handleSalvar = () => {
    if (!podeSalvar || salvando) return;
    const payload: SheetNovoEventoPayload = {
      titulo: titulo.trim(),
      inicioIso,
      fimIso,
      para,
    };
    const localLimpo = local.trim();
    if (localLimpo.length > 0) payload.local = localLimpo;
    const descLimpa = descricao.trim();
    if (descLimpa.length > 0) payload.descricao = descLimpa;
    onSalvar(payload);
  };

  const handlePickerChange = (
    campo: PickerAberto,
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerAberto(null);
    if (event.type === 'dismissed' || !selecionado) return;
    if (campo === 'data') setData(selecionado);
    else if (campo === 'inicio') {
      setHoraInicio(selecionado);
      // Se o fim ficou antes/igual ao novo inicio (mesmo dia), empurra o
      // fim +1h para manter uma duracao positiva por default.
      if (minutosDoDia(horaFim) <= minutosDoDia(selecionado)) {
        setHoraFim(umaHoraDepois(selecionado));
      }
    } else if (campo === 'fim') setHoraFim(selecionado);
  };

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
            color: colors.green,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          Novo evento
        </Text>

        {/* Titulo (obrigatorio) */}
        <View style={{ gap: spacing.sm }}>
          <Text style={LABEL_STYLE}>Título</Text>
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
              placeholder="Almoço com a família"
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
              accessibilityLabel="campo titulo do evento"
            />
          </View>
        </View>

        {/* Data */}
        <View style={{ gap: spacing.sm }}>
          <Text style={LABEL_STYLE}>Data</Text>
          <Pressable
            onPress={() => setPickerAberto('data')}
            accessibilityRole="button"
            accessibilityLabel="abrir seletor de data do evento"
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
              {formatarData(data)}
            </Text>
          </Pressable>
          {pickerAberto === 'data' ? (
            <DateTimePicker
              value={data}
              mode="date"
              onChange={(e, s) => handlePickerChange('data', e, s)}
            />
          ) : null}
        </View>

        {/* Hora inicio + hora fim lado a lado */}
        <View style={{ flexDirection: 'row', gap: spacing.base }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={LABEL_STYLE}>Início</Text>
            <Pressable
              onPress={() => setPickerAberto('inicio')}
              accessibilityRole="button"
              accessibilityLabel="abrir seletor de hora inicio"
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
                {formatarHora(horaInicio)}
              </Text>
            </Pressable>
            {pickerAberto === 'inicio' ? (
              <DateTimePicker
                value={horaInicio}
                mode="time"
                is24Hour
                onChange={(e, s) => handlePickerChange('inicio', e, s)}
              />
            ) : null}
          </View>

          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={LABEL_STYLE}>Fim</Text>
            <Pressable
              onPress={() => setPickerAberto('fim')}
              accessibilityRole="button"
              accessibilityLabel="abrir seletor de hora fim"
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
                {formatarHora(horaFim)}
              </Text>
            </Pressable>
            {pickerAberto === 'fim' ? (
              <DateTimePicker
                value={horaFim}
                mode="time"
                is24Hour
                onChange={(e, s) => handlePickerChange('fim', e, s)}
              />
            ) : null}
          </View>
        </View>
        {fimCruzaMeiaNoite ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
            }}
            accessibilityLabel="aviso evento cruza meia noite"
          >
            Termina no dia seguinte.
          </Text>
        ) : null}

        {/* Local (opcional) */}
        <View style={{ gap: spacing.sm }}>
          <Text style={LABEL_STYLE}>Local</Text>
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
              value={local}
              onChangeText={setLocal}
              placeholder="Opcional"
              placeholderTextColor={colors.mutedDecor}
              autoCapitalize="sentences"
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 44,
              }}
              accessibilityLabel="campo local do evento"
            />
          </View>
        </View>

        {/* Descricao (opcional, multiline) */}
        <View style={{ gap: spacing.sm }}>
          <Text style={LABEL_STYLE}>Descrição</Text>
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
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Opcional"
              placeholderTextColor={colors.mutedDecor}
              autoCapitalize="sentences"
              multiline
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 14,
                lineHeight: 22,
                minHeight: 66,
                textAlignVertical: 'top',
              }}
              accessibilityLabel="campo descricao do evento"
            />
          </View>
        </View>

        {/* SeletorPara (M33): oculto em modo sozinho */}
        <SeletorPara value={para} onChange={setPara} disabled={salvando} />

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label="Criar"
            onPress={handleSalvar}
            variant="success"
            disabled={!podeSalvar || salvando}
            accessibilityLabel="criar evento"
          />
          <Button
            label="Cancelar"
            onPress={onCancelar}
            variant="ghost"
            disabled={salvando}
            accessibilityLabel="cancelar novo evento"
          />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
