// Tela 18 — Diario emocional. Bottom sheet 90% com toggle inicial
// trigger <-> vitoria que muda a borda esquerda do form (red 2px /
// green 2px). Grid de chips de emocao multi-select (negativas em
// trigger, positivas em vitoria). Slider de intensidade 1-5.
// Textarea livre obrigatória. ChipGroup multi "com quem" com 4
// opcoes fixas. Bloco condicional em modo trigger: textarea
// estrategia + toggle "Funcionou?". Botao final destructive
// (trigger) ou success (vitoria). Persiste em
// inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md via saveDiario.
//
// Decisões M06 (spec seção 9):
//  - Texto livre obrigatório (minimo 1 caractere).
//  - Listas de emocoes e "com quem" fechadas; expansao em sprint
//    futura se demanda surgir.
//  - modo=audio inicializa como vitoria e marca audioRequested
//    interno; gravação real chega na M06.5.
//
// Restricao do schema (achado registrado para sprint nova): o
// schema diario_emocional v1 aceita apenas PessoaId em `com`, mas
// a UI desta tela também oferece amigos/sozinho. Persistimos no
// frontmatter so os PessoaId validos e marcamos contexto extra no
// corpo livre do .md como linha "Com: <quem>." legivel pelo humano.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  Screen,
  SeletorPara,
  SHEET_90,
  Slider,
  Textarea,
  Toggle,
  useToast,
  type BottomSheetRef,
  type ChipOption,
} from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { EmocaoChips } from '@/components/diario/EmocaoChips';
import { MicrofoneButton } from '@/components/diario/MicrofoneButton';
import { TranscreverButton } from '@/components/diario/TranscreverButton';
import { MidiaPicker } from '@/components/midia/MidiaPicker';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, nomeDe } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';
import { useSessao } from '@/lib/stores/sessao';
import { useAutoSaveRascunho } from '@/lib/hooks/useAutoSaveRascunho';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
  type DiarioEmocionalModo,
} from '@/lib/schemas/diario_emocional';
import type { Para } from '@/lib/schemas/para';
import { saveDiario } from '@/lib/diario/saveDiario';
import { formatEmocao } from '@/lib/diario/emocoes';
import type { Midia } from '@/lib/schemas/midia';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { comTimeout } from '@/lib/util/comTimeout';

// I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): aplica padrao canonico
// de save resilient do template Bloco I (§2.2): try/catch + timeout
// 10s + toast PT-BR sentence case com acentuacao completa. comTimeout
// agora vive em @/lib/util/comTimeout (helper compartilhado entre
// FRASE, HUMOR e DIARIO).

type ModoParam = DiarioEmocionalModo | 'audio';

// "Com quem" inclui PessoaIds validos no schema (pessoa_a, pessoa_b)
// e dois flags de contexto social (amigos, sozinho). Os flags não
// passam no PessoaIdSchema; são anotados no corpo do .md.
type ComQuem = PessoaAutor | 'amigos' | 'sozinho';
const COM_QUEM_FLAGS: readonly ComQuem[] = [
  'pessoa_a',
  'pessoa_b',
  'amigos',
  'sozinho',
] as const;

// Type-guard: separa PessoaAutor dos flags sociais.
function ehPessoaAutor(c: ComQuem): c is PessoaAutor {
  return c === 'pessoa_a' || c === 'pessoa_b';
}

// Label humano para os flags sociais. PessoaIds usam nomeDe().
function labelComQuem(c: ComQuem): string {
  if (c === 'amigos') return 'Amigos';
  if (c === 'sozinho') return 'Sozinho';
  return nomeDe(c);
}

const MODOS_VALIDOS: readonly ModoParam[] = [
  'trigger',
  'vitoria',
  'reflexao',
  'audio',
];

function isModoParam(value: unknown): value is ModoParam {
  return (
    typeof value === 'string' &&
    (MODOS_VALIDOS as readonly string[]).includes(value)
  );
}

const INTENSIDADE_DEFAULT = 3;

// Formata data ISO 8601 com offset -03:00 (São Paulo, sem DST).
// Modelo: '2026-04-29T10:15:00-03:00'.
function nowIsoSaoPaulo(): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}-03:00`;
}

// Monta o corpo do .md a partir dos campos do registro. O frontmatter
// já guarda os campos estruturados; o corpo replica em prosa para
// leitura humana no Obsidian e absorve o contexto social que o
// schema atual não serializa.
function buildBody(args: {
  texto: string;
  estrategia?: string;
  com: ComQuem[];
  emocoes: string[];
  intensidade: number;
}): string {
  const linhas: string[] = [];
  linhas.push(args.texto.trim());
  if (args.estrategia && args.estrategia.trim().length > 0) {
    linhas.push('');
    linhas.push(`Estrategia que tentei: ${args.estrategia.trim()}`);
  }
  if (args.com.length > 0) {
    const nomes = args.com.map(labelComQuem).join(', ');
    linhas.push('');
    linhas.push(`Com: ${nomes}.`);
  }
  if (args.emocoes.length > 0) {
    const labels = args.emocoes.map(formatEmocao).join(', ');
    linhas.push('');
    linhas.push(`Emocoes: ${labels} (intensidade ${args.intensidade}/5).`);
  }
  return linhas.join('\n');
}

export default function DiarioEmocional() {
  const router = useRouter();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetRef>(null);
  // Q6 fix (Onda Q): garante router.back() chamado uma unica vez por
  // sessao do sheet. Save + onChange(-1) ambos disparam back, mas a
  // 2a chamada falhava com "GO_BACK was not handled by any navigator".
  const backCalledRef = useRef(false);
  const goBackOnce = () => {
    if (backCalledRef.current) return;
    backCalledRef.current = true;
    router.back();
  };
  const params = useLocalSearchParams<{ modo?: string }>();
  const modoBruto = Array.isArray(params.modo) ? params.modo[0] : params.modo;
  const modoParam: ModoParam = isModoParam(modoBruto) ? modoBruto : 'vitoria';

  // Modo inicial: 'audio' inicializa como 'vitoria' por default. A
  // partir da M06.5 o MicrofoneButton fica sempre disponivel
  // (gated em useSettings.midia.permitirAudio); modoParam === 'audio'
  // do FAB so serve para escolher o tom inicial do form.
  const modoInicial: DiarioEmocionalModo =
    modoParam === 'audio' ? 'vitoria' : modoParam;

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Gate da gravacao de audio: usuario pode desligar em Settings
  // (M15) sem afetar o resto do form. Se off, o MicrofoneButton
  // some inteiro - nao basta desabilitar.
  const permitirAudio = useSettings((s) => s.midia.permitirAudio);
  // M24: rascunho previo (caso exista). Seed dos useState abaixo;
  // ComQuem extra fica fora porque o rascunho persiste apenas
  // PessoaAutor[] do schema (contexto social fica em contexto_social).
  const rascunho = useSessao((s) => s.rascunhos.diarioEmocional);

  const [modo, setModo] = useState<DiarioEmocionalModo>(
    () => rascunho?.modo ?? modoInicial
  );
  const [emocoes, setEmocoes] = useState<string[]>(
    () => rascunho?.emocoes ?? []
  );
  const [intensidade, setIntensidade] = useState<number>(
    () => rascunho?.intensidade ?? INTENSIDADE_DEFAULT
  );
  const [texto, setTexto] = useState<string>(() => rascunho?.texto ?? '');
  const [com, setCom] = useState<ComQuem[]>(() => {
    const semente: ComQuem[] = [];
    if (Array.isArray(rascunho?.com)) {
      // PessoaIdSchema aceita 'ambos' mas a UI desta tela so distingue
      // pessoa_a/pessoa_b individualmente. Filtramos 'ambos' do
      // rascunho ao restaurar.
      for (const c of rascunho.com) {
        if (c === 'pessoa_a' || c === 'pessoa_b') semente.push(c);
      }
    }
    if (Array.isArray(rascunho?.contexto_social)) {
      for (const c of rascunho.contexto_social) semente.push(c);
    }
    return semente;
  });
  const [estrategia, setEstrategia] = useState<string>(
    () => rascunho?.estrategia ?? ''
  );
  const [funcionou, setFuncionou] = useState<boolean>(
    () => rascunho?.funcionou ?? false
  );
  const [salvando, setSalvando] = useState<boolean>(false);
  // Audio anexo: M06.5 cabea path relativo aqui quando o usuario
  // grava no MicrofoneButton. Frontmatter recebe via meta.audio.
  const [audioPath, setAudioPath] = useState<string | null>(
    () => rascunho?.audio ?? null
  );
  // Midia anexada (M07.x). Em modo vitoria, save bloqueia se array
  // vazio (refine zod + check explicito antes do safeParse).
  const [midia, setMidia] = useState<Midia[]>(() => rascunho?.midia ?? []);
  // M33: destinatario / tema da anotacao. Default {tipo:'mim'}.
  const [para, setPara] = useState<Para>({ tipo: 'mim' });

  // M24: snapshot do rascunho para auto-save debounced. So serializa
  // campos compativeis com o schema; ComQuem 'amigos'/'sozinho' vira
  // contexto_social. audioPath fica em audio (compativel com Meta).
  const snapshotRascunho = useMemo(() => {
    const comPessoaIds = com.filter(ehPessoaAutor);
    const contextoSocial = com.filter(
      (c): c is 'amigos' | 'sozinho' => c === 'amigos' || c === 'sozinho'
    );
    return {
      modo,
      emocoes,
      intensidade,
      texto,
      com: comPessoaIds,
      contexto_social: contextoSocial,
      ...(modo === 'trigger' ? { funcionou } : {}),
      ...(modo === 'trigger' && estrategia.trim().length > 0
        ? { estrategia }
        : {}),
      audio: audioPath,
      midia,
    };
  }, [
    modo,
    emocoes,
    intensidade,
    texto,
    com,
    estrategia,
    funcionou,
    audioPath,
    midia,
  ]);
  useAutoSaveRascunho('diarioEmocional', snapshotRascunho);

  // Reset das emocoes ao trocar de modo: lista negativa não bate
  // com positiva, preservar slug seria payload invalido.
  useEffect(() => {
    setEmocoes([]);
  }, [modo]);

  // M26: sheet abre via index={0} direto. Ver humor-rapido.tsx para
  // racional completo (Armadilhas A17/A18).
  // M-SHEET-MODAL-SNAP: DOM patch em Web no BottomSheet wrapper
  // corrige snap inicial preso em y=windowH; ver humor-rapido.tsx.

  // Memoizado antes do early return para não quebrar regra dos hooks.
  const opcoesComQuem = useMemo<ChipOption[]>(
    () =>
      COM_QUEM_FLAGS.map((c) => ({
        value: c,
        label: labelComQuem(c),
        accent: 'cyan',
      })),
    []
  );

  // Caso de borda: sem onboarding concluido. Fluxo equivalente ao
  // humor-rapido: redireciona para /onboarding.
  if (!vaultRoot) {
    return <Redirect href="/onboarding" />;
  }

  // Sprint G2: borda/variant/label/titulo agora cobrem 3 modos.
  // Reflexao usa cyan (contemplativo, sem polaridade) e variant
  // primary (default neutro) com label "Refletir".
  const corBordaModo =
    modo === 'trigger'
      ? colors.red
      : modo === 'vitoria'
        ? colors.green
        : colors.cyan;
  const variantBotao: 'destructive' | 'success' | 'primary' =
    modo === 'trigger'
      ? 'destructive'
      : modo === 'vitoria'
        ? 'success'
        : 'primary';
  const labelBotao =
    modo === 'trigger'
      ? 'Registrar'
      : modo === 'vitoria'
        ? 'Anotar'
        : 'Refletir';
  const tituloModo =
    modo === 'trigger'
      ? 'O que aconteceu agora.'
      : modo === 'vitoria'
        ? 'O que rolou de bom.'
        : 'O que está passando pela cabeça.';

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

  const handleSave = async () => {
    if (salvando) return;
    if (texto.trim().length < 1) {
      toast.show('Escreva pelo menos uma palavra antes de salvar.', 'warn');
      return;
    }
    // Midia obrigatoria em modo vitoria (M07.x). Bloqueio antecipado
    // melhora UX em relacao ao refine do zod (que daria erro generico).
    if (modo === 'vitoria' && midia.length === 0) {
      toast.show('Adicione pelo menos uma mídia para conquista.', 'warn');
      return;
    }
    setSalvando(true);

    const ehTrigger = modo === 'trigger';
    const comPessoaIds = com.filter(ehPessoaAutor);
    // Contexto social: amigos / sozinho viram campo estruturado no
    // frontmatter desde M06.X. O corpo livre do .md mantem a linha
    // "Com:" para legibilidade no Obsidian (redundancia intencional).
    const contextoSocial = com.filter(
      (c): c is 'amigos' | 'sozinho' => c === 'amigos' || c === 'sozinho'
    );
    const estrategiaTrim = estrategia.trim();

    const meta: DiarioEmocionalMeta = {
      tipo: 'diario_emocional',
      data: nowIsoSaoPaulo(),
      autor: pessoaAtiva,
      modo,
      emocoes,
      intensidade,
      com: comPessoaIds,
      contexto_social: contextoSocial,
      texto: texto.trim(),
      ...(ehTrigger && estrategiaTrim.length > 0
        ? { estrategia: estrategiaTrim }
        : {}),
      ...(ehTrigger ? { funcionou } : {}),
      audio: audioPath,
      midia,
      para,
    };

    const validacao = DiarioEmocionalSchema.safeParse(meta);
    if (!validacao.success) {
      toast.show('Algo ficou inconsistente. Tente de novo.', 'error');
      setSalvando(false);
      return;
    }

    const body = buildBody({
      texto: texto.trim(),
      ...(ehTrigger ? { estrategia: estrategiaTrim } : {}),
      com,
      emocoes,
      intensidade,
    });

    try {
      await comTimeout(saveDiario(validacao.data, body, vaultRoot));
      // M24: limpa rascunho pos-save bem-sucedido.
      useSessao.getState().limparRascunho('diarioEmocional');
      if (modo === 'vitoria') {
        // anonimato-allow: substantivo comum (conquista) na frase abaixo.
        // Conquista registrada — respeita Settings.somVibracao.vitoria.
        await haptics.vitoria();
        toast.show('Diário salvo.', 'success');
      } else if (ehTrigger) {
        // Gatilho emocional — respeita Settings.somVibracao.trigger.
        await haptics.trigger();
        toast.show('Diário salvo.', 'success');
      } else {
        toast.show('Diário salvo.', 'success');
      }
      // Q6 fix (Onda Q, 2026-05-12): usa goBackOnce ref pra evitar
      // dupla chamada de router.back() (save → close → onChange(-1)).
      // A 2a chamada falhava com "GO_BACK was not handled by any
      // navigator". Fecha o sheet (UX de close anim) + volta uma vez.
      goBackOnce();
      sheetRef.current?.close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      console.error('save diario fail', e);
      setSalvando(false);
    }
  };

  return (
    <Screen padded={false}>
      <View
        pointerEvents="none"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <OuroborosLoader compacto />
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={SHEET_90}
        index={0}
        enablePanDownToClose
        onChange={(idx) => {
          if (idx === -1) goBackOnce();
        }}
      >
      <BottomSheetScrollView
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
          accessibilityLabel="diario emocional"
        >
          Diário emocional
        </Text>

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Modo')}
          <View
            style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}
            accessibilityLabel="seletor de modo trigger vitoria ou reflexao"
          >
            <Chip
              label="Trigger"
              accent="red"
              selected={modo === 'trigger'}
              onPress={() => setModo('trigger')}
            />
            <Chip
              label="Vitória" // anonimato-allow: substantivo comum (conquista)
              accent="green"
              selected={modo === 'vitoria'}
              onPress={() => setModo('vitoria')}
            />
            <Chip
              label="Reflexão"
              accent="cyan"
              selected={modo === 'reflexao'}
              onPress={() => setModo('reflexao')}
            />
          </View>
        </View>

        <MotiView
          // borderColor anima na whitelist do moti; como apenas a
          // borda esquerda tem largura > 0 (borderLeftWidth: 2), o
          // efeito visual e a faixa lateral mudando de cor sem que
          // as outras tres bordas apareceam.
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
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 21,
            }}
          >
            {tituloModo}
          </Text>

          <View style={{ gap: spacing.sm }}>
            {tituloSecao('Emoções')}
            <EmocaoChips
              modo={modo}
              value={emocoes}
              onChange={setEmocoes}
            />
          </View>

          <Slider
            label="Intensidade"
            min={1}
            max={5}
            step={1}
            value={intensidade}
            onChange={setIntensidade}
            accessibilityLabel="slider intensidade"
          />

          {permitirAudio ? (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.lg,
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
              accessibilityLabel="botoes de audio e transcricao"
            >
              <MicrofoneButton
                onAudioGravado={(relPath) => setAudioPath(relPath)}
              />
              {/* Q5.1: botao separado pra transcrever fala em texto
                  sem gravar audio (evita conflito de microfone com o
                  expo-av Audio.Recording). */}
              <TranscreverButton
                onTextoTranscrito={(transcrito) => {
                  // Append: preserva digitacao previa do usuario.
                  // Inclui espaco se ja havia texto, evitando colagem
                  // "tudoJunto".
                  setTexto((prev) => {
                    const limpo = transcrito.trim();
                    if (limpo.length === 0) return prev;
                    if (prev.length === 0) return limpo;
                    return `${prev.trimEnd()} ${limpo}`;
                  });
                }}
              />
            </View>
          ) : null}

          <Textarea
            label="O que aconteceu?"
            placeholder="Conte com suas palavras."
            value={texto}
            onChangeText={setTexto}
            accessibilityLabel="campo o que aconteceu"
          />

          {/* M07.x: midia obrigatoria em modo vitoria; opcional em
              modo trigger. MidiaPicker ja respeita o cap e o toggle
              permitirAudio internamente. */}
          <MidiaPicker
            value={midia}
            onChange={setMidia}
            obrigatorio={modo === 'vitoria'}
          />

          <View style={{ gap: spacing.sm }}>
            {tituloSecao('Com quem')}
            <ChipGroup
              mode="multi"
              value={com}
              onChange={(next) => setCom(next as ComQuem[])}
              options={opcoesComQuem}
            />
          </View>

          {modo === 'trigger' ? (
            <View style={{ gap: spacing.lg }}>
              <Textarea
                label="Estratégia que tentou"
                placeholder="Opcional"
                value={estrategia}
                onChangeText={setEstrategia}
                accessibilityLabel="campo estrategia"
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.base,
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: 'JetBrainsMono_400Regular',
                    fontSize: 13,
                  }}
                >
                  Funcionou?
                </Text>
                <Toggle
                  value={funcionou}
                  onChange={setFuncionou}
                  accessibilityLabel="toggle funcionou"
                />
              </View>
            </View>
          ) : null}
        </MotiView>

        {/* M33: destinatario / tema da anotacao. Render dinamico via
            useSettings.pessoa.tipoCompanhia; em modo sozinho retorna
            null e o default {tipo:'mim'} ja esta seedado. */}
        <SeletorPara value={para} onChange={setPara} disabled={salvando} />

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

        {/* M06.5: gravacao de audio agora vive inline acima do
            textarea via MicrofoneButton; placeholder antigo removido. */}
      </BottomSheetScrollView>
      </BottomSheet>
    </Screen>
  );
}
