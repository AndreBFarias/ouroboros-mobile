// Tela de criacao de Contador (M18). Form:
//   - Input titulo.
//   - Botao revelando DateTimePicker (mode date) com maximumDate=now
//     para bloquear datas futuras (decisão spec seção 11).
//   - Botao Criar primary.
//
// Pos-Salvar: derivar slug -> resolver unicidade -> escrever no
// Vault -> toast "Contador criado." -> router.back.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Button,
  Header,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  escreverContador,
  listarContadores,
} from '@/lib/vault/contadores';
import {
  ContadorSchema,
  slugifyTitulo,
  sufixoRandom,
  type Contador,
} from '@/lib/schemas/contador';
import { formatDateYmd } from '@/lib/vault/paths';

function nowIso(): string {
  // toISOString retorna 'Z' que e aceito pelo IsoDatetime do schema.
  return new Date().toISOString();
}

// Garante slug unico contra contadores existentes. Adiciona sufixo
// random quando colide; loop limitado a 50 tentativas (probabilidade
// de colisao após 50 e desprezivel: 36^4 = 1.6M combinacoes).
async function resolverSlugUnico(
  vaultRoot: string,
  base: string
): Promise<string | null> {
  const existentes = await listarContadores(vaultRoot);
  const usados = new Set(existentes.map((c) => c.slug));
  if (!usados.has(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidato = `${base}-${sufixoRandom()}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

function formatDataLeitura(d: Date): string {
  // Formato "DD de mes de YYYY" para humanos. Sentence case PT-BR.
  // Não usamos toLocaleDateString para não depender de Intl no web.
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export default function ContadoresNovo() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [titulo, setTitulo] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<Date>(() => new Date());
  const [pickerAberto, setPickerAberto] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);

  const tituloValido = titulo.trim().length > 0;
  const formValido = useMemo(() => tituloValido, [tituloValido]);

  const handleDataChange = (
    event: DateTimePickerEvent,
    selecionado?: Date
  ) => {
    if (Platform.OS === 'android') setPickerAberto(false);
    if (event.type === 'dismissed') return;
    if (selecionado) setDataInicio(selecionado);
  };

  const handleSalvar = useCallback(async () => {
    if (!vaultRoot || salvando || !formValido) return;
    setSalvando(true);
    try {
      const baseSlug = slugifyTitulo(titulo);
      if (baseSlug.length === 0) {
        toast.show('Título inválido.', 'error');
        return;
      }
      const slug = await resolverSlugUnico(vaultRoot, baseSlug);
      if (!slug) {
        toast.show('Não foi possível salvar.', 'error');
        return;
      }

      const proposto: Contador = {
        tipo: 'contador',
        slug,
        titulo: titulo.trim(),
        inicio: formatDateYmd(dataInicio),
        recorde: 0,
        resets: [],
        criado_em: nowIso(),
      };

      const parsed = ContadorSchema.safeParse(proposto);
      if (!parsed.success) {
        toast.show('Dados inválidos.', 'error');
        return;
      }

      await escreverContador(vaultRoot, parsed.data);
      void haptics.light();
      toast.show('Contador criado.', 'success');
      router.back();
    } catch {
      toast.show('Não foi possível salvar.', 'error');
    } finally {
      setSalvando(false);
    }
  }, [vaultRoot, salvando, formValido, titulo, dataInicio, toast, router]);

  return (
    <Screen>
      <Header title="Novo contador" onBack={() => router.back()} />

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
          placeholder="Ex.: Sem cigarro"
          accessibilityLabel="titulo do contador"
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
            Início
          </Text>
          <Pressable
            onPress={() => setPickerAberto(true)}
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
                lineHeight: 24,
              }}
            >
              {formatDataLeitura(dataInicio)}
            </Text>
          </Pressable>
          {pickerAberto ? (
            <DateTimePicker
              value={dataInicio}
              mode="date"
              maximumDate={new Date()}
              onChange={handleDataChange}
            />
          ) : null}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Criar"
          onPress={() => void handleSalvar()}
          variant="primary"
          disabled={salvando || !formValido || !vaultRoot}
        />
      </View>
    </Screen>
  );
}
