// Tela 15 — Humor rapido. Bottom sheet 70% que abre ao montar a
// rota. Coleta 4 sliders 1-5 (humor/energia/ansiedade/foco), texto
// livre opcional de medicacao, horas de sono, tags rapidas (multi)
// e uma frase opcional. Persiste em daily/YYYY-MM-DD.md no Vault.
//
// Decisões M05 (spec seção 9):
//  - Frase fica no frontmatter (corpo vazio).
//  - Tags em lista fechada (8 slugs em src/lib/humor/tagsRapidas.ts).
//  - Medicacao e texto livre opcional. Vazio = campo omitido.
//
// Conflito A5 (Syncthing entre celulares no mesmo dia): tratado
// dentro de saveHumor; aqui apenas mostramos toast diferenciado se
// retornar conflito=true.
//
// I-HUMOR (M-SAVE-HUMOR-VALIDA, 2026-05-07): aplica padrao canonico
// de save resilient do template Bloco I (§2.2): try/catch + timeout
// 10s + toast PT-BR sentence case com acentuacao completa. Botao
// 'Salvar' continua desabilitado durante I/O via prop disabled. Em
// timeout, toast 'Não foi possível salvar: timeout salvando' libera
// o usuario sem loader infinito.
import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  BottomSheet,
  Button,
  ChipGroup,
  Input,
  Screen,
  SHEET_70,
  Slider,
  Textarea,
  useToast,
  type BottomSheetRef,
} from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useAutoSaveRascunho } from '@/lib/hooks/useAutoSaveRascunho';
import { formatDateYmd } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import { TAGS_RAPIDAS } from '@/lib/humor/tagsRapidas';
import { saveHumor } from '@/lib/humor/saveHumor';
import { comTimeout } from '@/lib/util/comTimeout';

const SLIDER_DEFAULT = 3;

// I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): comTimeout extraido
// para @/lib/util/comTimeout (helper canonico do Bloco I). Default
// 10s mora no helper. Toast permanece 'Não foi possível salvar:
// timeout salvando' (PT-BR sentence case + acentuacao completa).

export default function HumorRapido() {
  const router = useRouter();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetRef>(null);

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // M24: rascunho previo (caso exista). Usado apenas como seed inicial
  // dos useState; mudancas posteriores nao precisam ler do store.
  const rascunho = useSessao((s) => s.rascunhos.humorRapido);

  const [humorVal, setHumorVal] = useState<number>(
    () => rascunho?.humor ?? SLIDER_DEFAULT
  );
  const [energia, setEnergia] = useState<number>(
    () => rascunho?.energia ?? SLIDER_DEFAULT
  );
  const [ansiedade, setAnsiedade] = useState<number>(
    () => rascunho?.ansiedade ?? SLIDER_DEFAULT
  );
  const [foco, setFoco] = useState<number>(
    () => rascunho?.foco ?? SLIDER_DEFAULT
  );
  const [medicacao, setMedicacao] = useState<string>(
    () => rascunho?.medicacao ?? ''
  );
  const [horasSonoTexto, setHorasSonoTexto] = useState<string>(() =>
    typeof rascunho?.horas_sono === 'number'
      ? String(rascunho.horas_sono)
      : ''
  );
  const [tags, setTags] = useState<string[]>(() => rascunho?.tags ?? []);
  const [frase, setFrase] = useState<string>(() => rascunho?.frase ?? '');
  const [salvando, setSalvando] = useState<boolean>(false);

  // M24: snapshot do rascunho atual; debounced via useAutoSaveRascunho.
  // Memoizado para nao redisparar o effect a cada render.
  const snapshotRascunho = useMemo(
    () => ({
      humor: humorVal,
      energia,
      ansiedade,
      foco,
      tags,
      ...(medicacao.trim().length > 0 ? { medicacao } : {}),
      ...(horasSonoTexto.trim().length > 0 &&
      Number.isFinite(Number(horasSonoTexto))
        ? { horas_sono: Number(horasSonoTexto) }
        : {}),
      ...(frase.trim().length > 0 ? { frase } : {}),
    }),
    [humorVal, energia, ansiedade, foco, tags, medicacao, horasSonoTexto, frase]
  );
  useAutoSaveRascunho('humorRapido', snapshotRascunho);

  // M26: sheet abre via index={0} direto (sem useEffect+expand). Evita
  // Armadilha A17 (race entre montagem e expand) e A18 (tela preta se
  // expand falha). O Screen opaco por tras garante fundo Dracula
  // visivel mesmo se Reanimated falhar em algum dispositivo.
  //
  // M-SHEET-MODAL-SNAP (2026-05-05): em Web (Gauntlet) o BottomSheet
  // wrapper aplica DOM patch automatico apos mount para corrigir o
  // snap inicial que o gorhom deixa em y=windowH (Armadilha A17
  // reincidente). Em mobile real (Android Expo Go/APK) o patch e
  // no-op, e o gorhom anima normalmente para SHEET_70 = ['70%'].

  // Caso de borda: rota acessada sem onboarding concluido. M03 já
  // protege a Tela 01, mas se chegou aqui via deep link sem vault,
  // redirecionamos para o fluxo correto.
  if (!vaultRoot) {
    return <Redirect href="/onboarding" />;
  }

  const handleSave = async () => {
    if (salvando) return;
    setSalvando(true);

    // Monta o meta a partir do estado local. Campos opcionais so
    // entram no payload quando preenchidos para não poluir o YAML.
    const horasSono = horasSonoTexto.trim();
    const medicacaoTrim = medicacao.trim();
    const fraseTrim = frase.trim();

    const meta: HumorMeta = {
      tipo: 'humor',
      data: formatDateYmd(new Date()),
      autor: pessoaAtiva,
      humor: humorVal,
      energia,
      ansiedade,
      foco,
      tags,
      ...(medicacaoTrim.length > 0 ? { medicacao: medicacaoTrim } : {}),
      ...(horasSono.length > 0 && Number.isFinite(Number(horasSono))
        ? { horas_sono: Number(horasSono) }
        : {}),
      ...(fraseTrim.length > 0 ? { frase: fraseTrim } : {}),
    };

    const validacao = HumorSchema.safeParse(meta);
    if (!validacao.success) {
      toast.show('Algo ficou inconsistente. Tente de novo.', 'error');
      setSalvando(false);
      return;
    }

    try {
      const { conflito } = await comTimeout(
        saveHumor(validacao.data, vaultRoot)
      );
      // M24: limpa o rascunho pos-save para nao restaurar dados ja
      // persistidos no Vault no proximo boot.
      useSessao.getState().limparRascunho('humorRapido');
      sheetRef.current?.close();
      toast.show(
        conflito ? 'Salvo com sufixo de pessoa.' : 'Humor salvo.',
        'success'
      );
      // Contextual: respeita Settings.somVibracao.humor. Registro de
      // humor é a interação central da Tela 16, tem toggle dedicado.
      await haptics.humor();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      console.error('save humor fail', e);
      setSalvando(false);
    }
  };

  return (
    <Screen padded={false}>
      {/* M26: marca de fundo. pointerEvents='none' garante que o sheet
          continua interativo. Visivel apenas se o sheet falhar ou
          durante a animacao de entrada. */}
      <View
        pointerEvents="none"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <OuroborosLoader compacto />
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={SHEET_70}
        index={0}
        enablePanDownToClose
        onChange={(idx) => {
          if (idx === -1) {
            // Sheet foi fechado (gesto ou imperativo). Volta para a
            // tela anterior. router.back e idempotente quando já saiu.
            router.back();
          }
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
          accessibilityLabel="humor rapido"
        >
          Humor rápido
        </Text>

        <View style={{ gap: spacing.md }}>
          <Slider
            label="Humor"
            min={1}
            max={5}
            step={1}
            value={humorVal}
            onChange={setHumorVal}
            accessibilityLabel="slider humor"
          />
          <Slider
            label="Energia"
            min={1}
            max={5}
            step={1}
            value={energia}
            onChange={setEnergia}
            accessibilityLabel="slider energia"
          />
          <Slider
            label="Ansiedade"
            min={1}
            max={5}
            step={1}
            value={ansiedade}
            onChange={setAnsiedade}
            accessibilityLabel="slider ansiedade"
          />
          <Slider
            label="Foco"
            min={1}
            max={5}
            step={1}
            value={foco}
            onChange={setFoco}
            accessibilityLabel="slider foco"
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Input
            label="Medicação tomada"
            placeholder="Ex.: Fluoxetina 20mg (opcional)"
            value={medicacao}
            onChangeText={setMedicacao}
            autoCapitalize="sentences"
            accessibilityLabel="campo medicacao"
          />
          <Input
            label="Horas de sono ontem"
            placeholder="0 a 24"
            value={horasSonoTexto}
            onChangeText={setHorasSonoTexto}
            keyboardType="numeric"
            accessibilityLabel="campo horas de sono"
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
            }}
          >
            Tags rápidas
          </Text>
          <ChipGroup
            mode="multi"
            value={tags}
            onChange={setTags}
            options={[...TAGS_RAPIDAS]}
          />
        </View>

        <Textarea
          label="Uma frase sobre hoje"
          placeholder="Opcional"
          value={frase}
          onChangeText={setFrase}
          accessibilityLabel="campo frase do dia"
        />

        <Button
          variant="success"
          label="Salvar"
          onPress={handleSave}
          disabled={salvando}
        />
      </BottomSheetScrollView>
      </BottomSheet>
    </Screen>
  );
}
