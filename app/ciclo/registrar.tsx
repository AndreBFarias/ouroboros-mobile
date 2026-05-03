// Tela 20.5b - Registro de Ciclo (M14.5). Bottom sheet 80% que vem
// pela rota /ciclo/registrar (M27 moveu de (tabs)/ciclo/registrar
// para raiz). Aceita parametro opcional
// `data` (YYYY-MM-DD); quando ausente, usa hoje.
//
// Estrutura do form:
//   - Toggle "Início do ciclo" no topo (uma vez por ciclo). Quando
//     ligado, recalcula a fase usando essa data como nova
//     dataInicioUltimoCiclo.
//   - ChipGroup single para override manual da fase (folicular,
//     ovulatoria, lutea, menstrual). Default = fase inferida.
//   - ChipsSintomas multi (8 sintomas).
//   - Slider intensidade 1-5.
//   - Slider humor associado 1-5.
//   - Textarea opcional.
//   - Botao Salvar primary.
//
// Pos-Salvar: haptic light + escreverRegistroCiclo + toast "Anotado." +
// router.back para fechar a sheet/voltar para visualizacao.
//
// Sem cache backend: dados ficam apenas no Vault local (privacidade
// reforcada, ADR-0007).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  ChipGroup,
  Header,
  Screen,
  Slider,
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui';
import { ChipsSintomas } from '@/components/ciclo/ChipsSintomas';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useAutoSaveRascunho } from '@/lib/hooks/useAutoSaveRascunho';
import { formatDateYmd } from '@/lib/vault/paths';
import {
  escreverRegistroCiclo,
  inferirFase,
  listarRegistrosCiclo,
  ultimaDataInicio,
} from '@/lib/vault/ciclo';
import {
  CicloMenstrualSchema,
  FASES_CANONICAS,
  FASES_LABELS,
  type FaseCiclo,
  type SintomaCiclo,
  type CicloMenstrualMeta,
} from '@/lib/schemas/ciclo_menstrual';

const FASE_OPTIONS = FASES_CANONICAS.map((f) => ({
  value: f,
  label: FASES_LABELS[f],
  accent: 'purple' as const,
}));

export default function CicloRegistrar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string }>();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const toast = useToast();

  // Data alvo do registro: param da rota ou hoje. Hoje em UTC-3.
  const dataAlvo = useMemo(() => {
    if (typeof params.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.data)) {
      return params.data;
    }
    return formatDateYmd(new Date());
  }, [params.data]);

  // M24: rascunho previo (se existir).
  const rascunho = useSessao((s) => s.rascunhos.cicloRegistrar);

  // Estado do form
  const [marcandoInicio, setMarcandoInicio] = useState(false);
  const [faseManual, setFaseManual] = useState<FaseCiclo | null>(
    () => (rascunho?.fase as FaseCiclo | undefined) ?? null
  );
  const [sintomas, setSintomas] = useState<SintomaCiclo[]>(
    () => rascunho?.sintomas ?? []
  );
  const [intensidade, setIntensidade] = useState<number>(
    () => rascunho?.intensidade ?? 3
  );
  const [humor, setHumor] = useState<number>(
    () => rascunho?.humor_associado ?? 3
  );
  const [texto, setTexto] = useState<string>(() => rascunho?.texto ?? '');
  const [salvando, setSalvando] = useState(false);

  // M24: snapshot do rascunho debounced. Persistimos campos canonicos
  // do CicloMenstrualMeta (sem data e autor, que sao derivados ao
  // salvar de fato).
  const snapshotRascunho = useMemo(
    () => ({
      fase: faseManual ?? undefined,
      sintomas,
      intensidade: sintomas.length > 0 ? intensidade : null,
      humor_associado: humor,
      texto: texto.trim().length > 0 ? texto : null,
    }),
    [faseManual, sintomas, intensidade, humor, texto]
  );
  useAutoSaveRascunho('cicloRegistrar', snapshotRascunho);

  // dataInicioContexto: ultimo data_inicio conhecido ANTES deste
  // registro. Usado para inferir fase default. Carregado do Vault
  // ao montar.
  const [dataInicioContexto, setDataInicioContexto] = useState<string | null>(
    null
  );

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!vaultRoot) return;
      try {
        const lista = await listarRegistrosCiclo(vaultRoot, pessoaAtiva, {
          periodo: 'tudo',
        });
        if (!ativo) return;
        setDataInicioContexto(ultimaDataInicio(lista));
      } catch {
        // Mantemos null se falhar leitura.
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [vaultRoot, pessoaAtiva]);

  // Fase efetiva: override manual se preenchido; senao inferida com
  // base em marcandoInicio (data_inicio igual a dataAlvo) ou no
  // contexto carregado.
  const faseInferida = useMemo<FaseCiclo>(() => {
    const inicioRef = marcandoInicio ? dataAlvo : dataInicioContexto;
    return inferirFase(dataAlvo, inicioRef);
  }, [marcandoInicio, dataAlvo, dataInicioContexto]);

  const faseEfetiva: FaseCiclo = faseManual ?? faseInferida;

  const handleSalvar = useCallback(async () => {
    if (!vaultRoot || salvando) return;
    setSalvando(true);
    try {
      const meta: CicloMenstrualMeta = {
        tipo: 'ciclo_menstrual',
        data: dataAlvo,
        autor: pessoaAtiva,
        data_inicio: marcandoInicio ? dataAlvo : dataInicioContexto,
        fase: faseEfetiva,
        sintomas,
        intensidade: sintomas.length > 0 ? intensidade : null,
        humor_associado: humor,
        texto: texto.trim().length > 0 ? texto.trim() : null,
      };
      // Validação defensiva.
      const parsed = CicloMenstrualSchema.safeParse(meta);
      if (!parsed.success) {
        toast.show('Não foi possível salvar.', 'error');
        return;
      }
      await escreverRegistroCiclo(vaultRoot, parsed.data, '');
      // M24: limpa rascunho pos-save bem-sucedido.
      useSessao.getState().limparRascunho('cicloRegistrar');
      void haptics.light();
      toast.show('Anotado.', 'success');
      router.back();
    } catch {
      toast.show('Não foi possível salvar.', 'error');
    } finally {
      setSalvando(false);
    }
  }, [
    vaultRoot,
    salvando,
    dataAlvo,
    pessoaAtiva,
    marcandoInicio,
    dataInicioContexto,
    faseEfetiva,
    sintomas,
    intensidade,
    humor,
    texto,
    toast,
    router,
  ]);

  const handleFaseChange = useCallback((next: string | null) => {
    if (
      next === 'folicular' ||
      next === 'ovulatoria' ||
      next === 'lutea' ||
      next === 'menstrual'
    ) {
      setFaseManual(next);
    } else {
      setFaseManual(null);
    }
  }, []);

  return (
    <Screen>
      <Header title="Registrar" onBack={() => router.back()} />

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
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Dia
          </Text>
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
            }}
          >
            {dataAlvo}
          </Text>
        </View>

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
              Início do ciclo
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                marginTop: spacing.xs,
              }}
            >
              Marque quando este dia abre um ciclo novo.
            </Text>
          </View>
          <Toggle
            value={marcandoInicio}
            onChange={setMarcandoInicio}
            accessibilityLabel="marcar inicio do ciclo"
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
            Fase
          </Text>
          <ChipGroup
            mode="single"
            value={faseEfetiva}
            onChange={handleFaseChange}
            options={FASE_OPTIONS}
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
            Sintomas
          </Text>
          <ChipsSintomas value={sintomas} onChange={setSintomas} />
        </View>

        {sintomas.length > 0 ? (
          <Slider
            label="Intensidade"
            value={intensidade}
            min={1}
            max={5}
            step={1}
            onChange={setIntensidade}
            accessibilityLabel="intensidade dos sintomas"
          />
        ) : null}

        <Slider
          label="Humor"
          value={humor}
          min={1}
          max={5}
          step={1}
          onChange={setHumor}
          accessibilityLabel="humor associado"
        />

        <Textarea
          label="Texto livre"
          value={texto}
          onChangeText={setTexto}
          placeholder="Anotação rápida (opcional)."
          accessibilityLabel="texto livre"
        />
      </ScrollView>

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Salvar"
          onPress={() => void handleSalvar()}
          variant="primary"
          disabled={salvando || !vaultRoot}
        />
      </View>
    </Screen>
  );
}
