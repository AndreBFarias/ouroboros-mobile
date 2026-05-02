// Tela 20 - Eventos com lugar. Bottom sheet 80% que abre ao montar.
// Captura: textarea "O que aconteceu?" (obrigatório), bloco "Onde"
// (input livre + botao "Usar localizacao atual" via expo-location +
// chip cyan do bairro detectado), bloco "Quando" (chip "Agora"
// default + chip "Outro horario" abrindo time picker), ChipGroup
// multi "Com quem" (auto-seleciona pessoa_b se tipoCompanhia for
// 'casal' ou 'amigos'), ChipGroup single de categoria (lista
// fechada em src/lib/eventos/categorias.ts), bloco fotos opcional
// (expo-image-picker, cap 6) e slider de intensidade 1-5. Toggle
// modo positivo/negativo no topo, padrao similar ao da Tela 18.
// Botao Registrar variant 'success' em modo positivo / 'destructive'
// em modo negativo. Persiste em eventos/YYYY-MM-DD-<slug>.md via
// saveEvento.
//
// Decisões M07 (spec seção 9):
//  - Auto-selecao pessoa_b uniforme (casal ou amigos -> pre-marca
//    o chip pessoa_b).
//  - Categoria 'exercício' incluida na lista (registro casual; M13
//    cobre dados estruturados de treino).
//  - Time picker nativo Android com fallback Web do proprio
//    componente.
//  - Cap arbitrario de 6 fotos.
//
// Modo negativo não dispara haptic no save (mesmo principio da M06).
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  SHEET_80,
  Slider,
  Textarea,
  useToast,
  type BottomSheetRef,
  type ChipOption,
} from '@/components/ui';
import { LocalizacaoBlock } from '@/components/eventos/LocalizacaoBlock';
import { QuandoBlock, type QuandoMode } from '@/components/eventos/QuandoBlock';
import { FotosBlock } from '@/components/eventos/FotosBlock';
import { MidiaPicker } from '@/components/midia/MidiaPicker';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, nomeDe } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';
import {
  EventoSchema,
  type EventoMeta,
  type EventoModo,
} from '@/lib/schemas/evento';
import {
  EVENTO_CATEGORIAS_OPTIONS,
  type EventoCategoria,
} from '@/lib/eventos/categorias';
import { getBairroAtual } from '@/lib/eventos/localizacao';
import { saveEvento } from '@/lib/eventos/saveEvento';
import type { Midia } from '@/lib/schemas/midia';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

const INTENSIDADE_DEFAULT = 4;
const CATEGORIA_DEFAULT: EventoCategoria = 'rolezinho';

// Formata data ISO 8601 com offset -03:00 (São Paulo, sem DST). O
// caller fornece o Date base (agora ou dataCustom).
function toIsoSaoPaulo(date: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}-03:00`;
}

export default function Eventos() {
  const router = useRouter();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetRef>(null);

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);

  // Estados do form. Modo default 'positivo'; toggle no header
  // alterna para 'negativo'.
  const [modo, setModo] = useState<EventoModo>('positivo');
  const [texto, setTexto] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [bairro, setBairro] = useState<string | null>(null);
  const [detectandoBairro, setDetectandoBairro] = useState<boolean>(false);
  const [quando, setQuando] = useState<QuandoMode>('agora');
  const [dataCustom, setDataCustom] = useState<Date | null>(null);
  // Auto-selecao de pessoa_b quando tipoCompanhia indica duo. Casal
  // ou amigos: comeca com pessoa_b já marcado para reduzir tap-cost.
  // Sozinho: sem pre-selecao.
  const [com, setCom] = useState<PessoaAutor[]>(() =>
    tipoCompanhia === 'sozinho' ? [] : ['pessoa_b']
  );
  const [categoria, setCategoria] = useState<EventoCategoria>(
    CATEGORIA_DEFAULT
  );
  const [fotos, setFotos] = useState<string[]>([]);
  // Midia anexada (M07.x). Obrigatoria em modo positivo via refine.
  // FotosBlock continua existindo separado para fotos rapidas (legado
  // M07); MidiaPicker e usado para conquistas com peso emocional.
  const [midia, setMidia] = useState<Midia[]>([]);
  const [intensidade, setIntensidade] = useState<number>(INTENSIDADE_DEFAULT);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Abre o sheet após a montagem (idempotente em re-mount via
  // navegacao por aba/deeplink futuro).
  useEffect(() => {
    sheetRef.current?.expand();
  }, []);

  // Caso de borda: rota acessada sem onboarding concluido.
  if (!vaultRoot) {
    return <Redirect href="/onboarding" />;
  }

  // Opcoes do chip group "Com quem". Usa nomes runtime via nomeDe
  // para o label visivel; o slug interno e o PessoaAutor.
  const opcoesCom: ChipOption[] = [
    { value: 'pessoa_a', label: nomeDe('pessoa_a'), accent: 'purple' },
    { value: 'pessoa_b', label: nomeDe('pessoa_b'), accent: 'pink' },
  ];

  const corBordaModo = modo === 'positivo' ? colors.green : colors.red;
  const variantBotao = modo === 'positivo' ? 'success' : 'destructive';
  const labelBotao = 'Registrar';

  const tituloSecao = (texto: string) => (
    <Text
      style={{
        color: colors.muted,
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
      }}
    >
      {texto}
    </Text>
  );

  const handleDetectar = async () => {
    setDetectandoBairro(true);
    try {
      const detectado = await getBairroAtual();
      if (detectado) {
        setBairro(detectado);
      } else {
        setBairro(null);
        toast.show('Não foi possível detectar o bairro.', 'info');
      }
    } catch {
      setBairro(null);
      toast.show('Não foi possível detectar o bairro.', 'info');
    } finally {
      setDetectandoBairro(false);
    }
  };

  const handleSave = async () => {
    if (salvando) return;
    if (texto.trim().length < 1) {
      toast.show('Escreva pelo menos uma palavra antes de salvar.', 'warn');
      return;
    }
    // Midia obrigatoria em modo positivo (M07.x). Bloqueio antecipado
    // melhora UX em relacao ao refine do zod (que daria erro generico).
    if (modo === 'positivo' && midia.length === 0) {
      toast.show('Adicione pelo menos uma mídia para conquista.', 'warn');
      return;
    }
    setSalvando(true);

    const lugarTrim = lugar.trim();
    const bairroTrim = bairro && bairro.trim().length > 0 ? bairro.trim() : '';
    const baseDate = quando === 'outro' && dataCustom ? dataCustom : new Date();

    // EventoSchema declara fotos como string[] com default []. As
    // URIs locais entram aqui; o saveEvento copia tudo para
    // assets/ e atualiza meta.fotos com paths relativos antes de
    // gravar o .md.
    const meta: EventoMeta = {
      tipo: 'evento',
      data: toIsoSaoPaulo(baseDate),
      autor: pessoaAtiva,
      modo,
      ...(lugarTrim.length > 0 ? { lugar: lugarTrim } : {}),
      ...(bairroTrim.length > 0 ? { bairro: bairroTrim } : {}),
      com,
      categoria,
      intensidade,
      fotos: [],
      midia,
    };

    const validacao = EventoSchema.safeParse(meta);
    if (!validacao.success) {
      toast.show('Algo ficou inconsistente. Tente de novo.', 'error');
      setSalvando(false);
      return;
    }

    try {
      // O body do .md contem o texto livre. saveEvento usa esse
      // texto também para derivar o slug do nome de arquivo
      // quando bairro estiver vazio.
      await saveEvento({
        meta: validacao.data,
        body: texto.trim(),
        vaultRoot,
        fotos,
      });
      sheetRef.current?.close();
      if (modo === 'positivo') {
        await haptics.success();
        toast.show('Anotado.', 'success');
      } else {
        toast.show('Registrado.', 'success');
      }
      router.back();
    } catch {
      toast.show('Falha ao salvar.', 'error');
      setSalvando(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={SHEET_80}
      index={-1}
      enablePanDownToClose
      onChange={(idx) => {
        if (idx === -1) router.back();
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
          }}
          accessibilityRole="header"
          accessibilityLabel="eventos"
        >
          Eventos
        </Text>

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Modo')}
          <View
            style={{ flexDirection: 'row', gap: spacing.sm }}
            accessibilityLabel="seletor de modo positivo ou negativo"
          >
            <Chip
              label="Positivo"
              accent="green"
              selected={modo === 'positivo'}
              onPress={() => setModo('positivo')}
            />
            <Chip
              label="Negativo"
              accent="red"
              selected={modo === 'negativo'}
              onPress={() => setModo('negativo')}
            />
          </View>
        </View>

        <MotiView
          // Borda esquerda animada acompanha o modo (mesmo padrao
          // da Tela 18). Verde em modo positivo, vermelho em modo
          // negativo. Como apenas borderLeftWidth tem largura > 0,
          // so a faixa esquerda muda visualmente.
          animate={{ borderColor: corBordaModo }}
          transition={springs.subtle}
          style={{
            borderLeftWidth: 2,
            borderTopWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            borderColor: corBordaModo,
            paddingLeft: spacing.base,
            gap: spacing.lg,
          }}
        >
          <Textarea
            label="O que aconteceu?"
            placeholder="Conte com suas palavras."
            value={texto}
            onChangeText={setTexto}
            accessibilityLabel="campo o que aconteceu"
          />

          <LocalizacaoBlock
            lugar={lugar}
            onChangeLugar={setLugar}
            bairro={bairro}
            onDetectar={handleDetectar}
            detectando={detectandoBairro}
          />

          <QuandoBlock
            modo={quando}
            onChangeModo={setQuando}
            dataCustom={dataCustom}
            onChangeDataCustom={setDataCustom}
          />

          <View style={{ gap: spacing.sm }}>
            {tituloSecao('Com quem')}
            <ChipGroup
              mode="multi"
              value={com}
              onChange={(next) => setCom(next as PessoaAutor[])}
              options={opcoesCom}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            {tituloSecao('Categoria')}
            <ChipGroup
              mode="single"
              value={categoria}
              onChange={(next) => {
                if (next !== null) setCategoria(next as EventoCategoria);
              }}
              options={[...EVENTO_CATEGORIAS_OPTIONS]}
            />
          </View>

          <FotosBlock fotos={fotos} onChangeFotos={setFotos} />

          {/* M07.x: midia obrigatoria em modo positivo; opcional em
              modo negativo. Cap e toggle audio via useSettings. */}
          <MidiaPicker
            value={midia}
            onChange={setMidia}
            obrigatorio={modo === 'positivo'}
          />

          <Slider
            label="Como foi?"
            min={1}
            max={5}
            step={1}
            value={intensidade}
            onChange={setIntensidade}
            accessibilityLabel="slider como foi"
          />
        </MotiView>

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
          }}
          accessibilityLabel="rodape privacidade"
        >
          Salvo localmente. Ninguém vê além de vocês dois.
        </Text>

        <Button
          variant={variantBotao}
          label={labelBotao}
          onPress={handleSave}
          disabled={salvando}
        />
      </ScrollView>
    </BottomSheet>
  );
}
