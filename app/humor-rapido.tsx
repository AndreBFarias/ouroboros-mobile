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
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  BottomSheet,
  Button,
  ChipGroup,
  Input,
  SHEET_70,
  Slider,
  Textarea,
  useToast,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { formatDateYmd } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import { TAGS_RAPIDAS } from '@/lib/humor/tagsRapidas';
import { saveHumor } from '@/lib/humor/saveHumor';

const SLIDER_DEFAULT = 3;

export default function HumorRapido() {
  const router = useRouter();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetRef>(null);

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [humorVal, setHumorVal] = useState<number>(SLIDER_DEFAULT);
  const [energia, setEnergia] = useState<number>(SLIDER_DEFAULT);
  const [ansiedade, setAnsiedade] = useState<number>(SLIDER_DEFAULT);
  const [foco, setFoco] = useState<number>(SLIDER_DEFAULT);
  const [medicacao, setMedicacao] = useState<string>('');
  const [horasSonoTexto, setHorasSonoTexto] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [frase, setFrase] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  // Abre o sheet automaticamente após a montagem. Index 0 = primeiro
  // snap point ('70%'). Usamos ref para controlar imperativamente, em
  // vez de prop index, porque queremos garantir abertura mesmo se a
  // rota for re-montada (caso comum em navegacao via FAB Radial).
  useEffect(() => {
    sheetRef.current?.expand();
  }, []);

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
      const { conflito } = await saveHumor(validacao.data, vaultRoot);
      sheetRef.current?.close();
      toast.show(
        conflito ? 'Salvo com sufixo de pessoa.' : 'Salvo.',
        'success'
      );
      await haptics.success();
      router.back();
    } catch {
      toast.show('Falha ao salvar. Verifique a pasta do Vault.', 'error');
      setSalvando(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={SHEET_70}
      index={-1}
      enablePanDownToClose
      onChange={(idx) => {
        if (idx === -1) {
          // Sheet foi fechado (gesto ou imperativo). Volta para a
          // tela anterior. router.back e idempotente quando já saiu.
          router.back();
        }
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
      </ScrollView>
    </BottomSheet>
  );
}
