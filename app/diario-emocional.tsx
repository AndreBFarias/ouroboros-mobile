// Tela 18 — Diario emocional. Bottom sheet 90% com toggle inicial
// trigger <-> vitoria que muda a borda esquerda do form (red 2px /
// green 2px). Grid de chips de emocao multi-select (negativas em
// trigger, positivas em vitoria). Slider de intensidade 1-5.
// Textarea livre obrigatoria. ChipGroup multi "com quem" com 4
// opcoes fixas. Bloco condicional em modo trigger: textarea
// estrategia + toggle "Funcionou?". Botao final destructive
// (trigger) ou success (vitoria). Persiste em
// inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md via saveDiario.
//
// Decisoes M06 (spec secao 9):
//  - Texto livre obrigatorio (minimo 1 caractere).
//  - Listas de emocoes e "com quem" fechadas; expansao em sprint
//    futura se demanda surgir.
//  - modo=audio inicializa como vitoria e marca audioRequested
//    interno; gravacao real chega na M06.5.
//
// Restricao do schema (achado registrado para sprint nova): o
// schema diario_emocional v1 aceita apenas PessoaId em `com`, mas
// a UI desta tela tambem oferece amigos/sozinho. Persistimos no
// frontmatter so os PessoaId validos e marcamos contexto extra no
// corpo livre do .md como linha "Com: <quem>." legivel pelo humano.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  SHEET_90,
  Slider,
  Textarea,
  Toggle,
  useToast,
  type BottomSheetRef,
  type ChipOption,
} from '@/components/ui';
import { EmocaoChips } from '@/components/diario/EmocaoChips';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, nomeDe } from '@/lib/stores/pessoa';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
  type DiarioEmocionalModo,
} from '@/lib/schemas/diario_emocional';
import { saveDiario } from '@/lib/diario/saveDiario';
import { formatEmocao } from '@/lib/diario/emocoes';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

type ModoParam = DiarioEmocionalModo | 'audio';

// "Com quem" inclui PessoaIds validos no schema (pessoa_a, pessoa_b)
// e dois flags de contexto social (amigos, sozinho). Os flags nao
// passam no PessoaIdSchema; sao anotados no corpo do .md.
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

const MODOS_VALIDOS: readonly ModoParam[] = ['trigger', 'vitoria', 'audio'];

function isModoParam(value: unknown): value is ModoParam {
  return (
    typeof value === 'string' &&
    (MODOS_VALIDOS as readonly string[]).includes(value)
  );
}

const INTENSIDADE_DEFAULT = 3;

// Formata data ISO 8601 com offset -03:00 (Sao Paulo, sem DST).
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
// ja guarda os campos estruturados; o corpo replica em prosa para
// leitura humana no Obsidian e absorve o contexto social que o
// schema atual nao serializa.
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
  const params = useLocalSearchParams<{ modo?: string }>();
  const modoBruto = Array.isArray(params.modo) ? params.modo[0] : params.modo;
  const modoParam: ModoParam = isModoParam(modoBruto) ? modoBruto : 'vitoria';

  // Modo inicial: 'audio' inicializa como 'vitoria' por default. A
  // gravacao real chega na M06.5; por enquanto so marcamos a flag
  // interna audioRequested para a sprint futura acoplar.
  const modoInicial: DiarioEmocionalModo =
    modoParam === 'audio' ? 'vitoria' : modoParam;
  const [audioRequested] = useState<boolean>(modoParam === 'audio');

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [modo, setModo] = useState<DiarioEmocionalModo>(modoInicial);
  const [emocoes, setEmocoes] = useState<string[]>([]);
  const [intensidade, setIntensidade] = useState<number>(INTENSIDADE_DEFAULT);
  const [texto, setTexto] = useState<string>('');
  const [com, setCom] = useState<ComQuem[]>([]);
  const [estrategia, setEstrategia] = useState<string>('');
  const [funcionou, setFuncionou] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Reset das emocoes ao trocar de modo: lista negativa nao bate
  // com positiva, preservar slug seria payload invalido.
  useEffect(() => {
    setEmocoes([]);
  }, [modo]);

  // Abre o sheet apos a montagem (idempotente em re-mount via FAB).
  useEffect(() => {
    sheetRef.current?.expand();
  }, []);

  // Memoizado antes do early return para nao quebrar regra dos hooks.
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

  const corBordaModo = modo === 'trigger' ? colors.red : colors.green;
  const variantBotao = modo === 'trigger' ? 'destructive' : 'success';
  const labelBotao = modo === 'trigger' ? 'Registrar' : 'Anotar';
  const tituloModo =
    modo === 'trigger' ? 'O que aconteceu agora.' : 'O que rolou de bom.';

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
      audio: null,
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
      await saveDiario(validacao.data, body, vaultRoot);
      sheetRef.current?.close();
      if (modo === 'vitoria') {
        await haptics.success();
        toast.show('Anotado.', 'success');
      } else {
        toast.show('Registrado.', 'success');
      }
      router.back();
    } catch {
      toast.show('Falha ao salvar. Verifique a pasta do Vault.', 'error');
      setSalvando(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={SHEET_90}
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
          accessibilityLabel="diario emocional"
        >
          Diário emocional
        </Text>

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Modo')}
          <View
            style={{ flexDirection: 'row', gap: spacing.sm }}
            accessibilityLabel="seletor de modo trigger ou vitoria"
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

          <Textarea
            label="O que aconteceu?"
            placeholder="Conte com suas palavras."
            value={texto}
            onChangeText={setTexto}
            accessibilityLabel="campo o que aconteceu"
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

        {/* audioRequested fica disponivel para a M06.5 acoplar a UI
            de gravacao. Esta sprint apenas marca a flag interna. */}
        {audioRequested ? (
          <Text
            style={{
              color: colors.mutedDecor,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textAlign: 'center',
            }}
            accessibilityLabel="aviso audio pendente"
          >
            Gravação de áudio chega em breve.
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
