// Tela 12 - Form de medidas corporais. Grid 2 colunas com 9 inputs
// numericos (peso, cintura, peito, bracos esq/dir, coxas esq/dir,
// barriga, quadril). Cada input mostra placeholder muted-decor com
// a ultima medida (sugestao) ou apenas a unidade quando não ha
// sugestao.
//
// Bloco fotos com 3 botoes 100x100dp (frente / costas / lado), cada
// um abre expo-image-picker. Estado vazio mostra icone Camera muted-
// decor; estado preenchido mostra thumbnail com X overlay para
// remover.
//
// Bloco reflexao com 3 textareas (sentindo / objetivos /
// observacoes); o caller concatena com separador "---" ao serializar
// para o campo unico do schema.
//
// Botao "Salvar" verde full width. Após salvar: toast 'Medidas
// salvas.' + navega de volta para Tela 13.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Button,
  Header,
  Screen,
  Textarea,
  useToast,
} from '@/components/ui';
import { InputMedida } from '@/components/medidas';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { lerUltimaMedida, escreverMedida } from '@/lib/vault/medidas';
import { medidasFotoPath } from '@/lib/vault/paths';
import {
  MEDIDAS_CAMPOS,
  MEDIDAS_LABELS,
  MedidasSchema,
  type Medida,
  type MedidaCampo,
} from '@/lib/schemas/medidas';

// Estado interno: cada campo tem string (vazio = não informado).
// Conversao para número acontece no submit.
type CamposState = Record<MedidaCampo, string>;

function camposVazios(): CamposState {
  return {
    peso: '',
    cintura: '',
    peito: '',
    braco_esq: '',
    braco_dir: '',
    coxa_esq: '',
    coxa_dir: '',
    barriga: '',
    quadril: '',
  };
}

// Aceita virgula ou ponto. Converte para number ou null se invalido
// ou vazio. Números negativos viram null para o schema rejeitar com
// mensagem mais clara.
function parseNumeroBR(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed.length === 0) return null;
  const normalizado = trimmed.replace(',', '.');
  const n = Number.parseFloat(normalizado);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

// YYYY-MM-DD em UTC-3 (mesma logica de paths.formatDateYmd).
function formatHojeYmd(): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Junta as 3 reflexoes em uma string unica com separador.
function unirReflexao(args: {
  sentindo: string;
  objetivos: string;
  observacoes: string;
}): string | undefined {
  const partes: string[] = [];
  if (args.sentindo.trim().length > 0) {
    partes.push(`Sentindo: ${args.sentindo.trim()}`);
  }
  if (args.objetivos.trim().length > 0) {
    partes.push(`Objetivos: ${args.objetivos.trim()}`);
  }
  if (args.observacoes.trim().length > 0) {
    partes.push(`Observações: ${args.observacoes.trim()}`);
  }
  if (partes.length === 0) return undefined;
  return partes.join('\n\n');
}

interface FotoSlot {
  // URI temporario do picker (file:// ou content://). null = sem foto.
  origem: string | null;
}

const LADOS_FOTO: ReadonlyArray<{
  key: 'frente' | 'costas' | 'lado';
  label: string;
}> = [
  { key: 'frente', label: 'Frente' },
  { key: 'costas', label: 'Costas' },
  { key: 'lado', label: 'Lado' },
];

function joinUri(root: string, rel: string): string {
  const trimmed = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmed}/${rel}`;
}

export default function NovaMedida() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [campos, setCampos] = useState<CamposState>(camposVazios());
  const [sugestao, setSugestao] = useState<Medida | null>(null);
  const [fotos, setFotos] = useState<Record<string, FotoSlot>>({
    frente: { origem: null },
    costas: { origem: null },
    lado: { origem: null },
  });
  const [sentindo, setSentindo] = useState('');
  const [objetivos, setObjetivos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carrega ultima medida ao montar (para pre-preencher placeholders).
  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!vaultRoot) return;
      try {
        const ultima = await lerUltimaMedida(vaultRoot);
        if (ativo) setSugestao(ultima);
      } catch {
        // Sem sugestao se houver erro de I/O.
      }
    })();
    return () => {
      ativo = false;
    };
  }, [vaultRoot]);

  const handleChangeCampo = useCallback(
    (campo: MedidaCampo, valor: string) => {
      setCampos((s) => ({ ...s, [campo]: valor }));
    },
    []
  );

  const handleEscolherFoto = useCallback(
    async (lado: 'frente' | 'costas' | 'lado') => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;
      haptics.light();
      setFotos((s) => ({ ...s, [lado]: { origem: result.assets[0].uri } }));
    },
    []
  );

  const handleRemoverFoto = useCallback(
    (lado: 'frente' | 'costas' | 'lado') => {
      haptics.selection();
      setFotos((s) => ({ ...s, [lado]: { origem: null } }));
    },
    []
  );

  const handleSalvar = useCallback(async () => {
    if (salvando) return;
    if (!vaultRoot) {
      haptics.error();
      toast.show('Vault não configurado.', 'error');
      return;
    }
    setSalvando(true);
    try {
      const dataYmd = formatHojeYmd();
      const dataDate = new Date(`${dataYmd}T12:00:00Z`);

      // Copia fotos escolhidas para o Vault sob assets/m-<data>-<lado>.
      const fotosRel: string[] = [];
      for (const { key } of LADOS_FOTO) {
        const slot = fotos[key];
        if (!slot.origem) continue;
        const rel = medidasFotoPath(dataDate, key);
        const destinoUri = joinUri(vaultRoot, rel);
        await FileSystem.copyAsync({ from: slot.origem, to: destinoUri });
        fotosRel.push(rel);
      }

      // Monta meta validado.
      const reflexao = unirReflexao({ sentindo, objetivos, observacoes });
      const metaBruto: Record<string, unknown> = {
        tipo: 'medidas',
        data: dataYmd,
        autor: pessoaAtiva,
        fotos: fotosRel,
      };
      for (const campo of MEDIDAS_CAMPOS) {
        const n = parseNumeroBR(campos[campo]);
        if (n !== null) {
          metaBruto[campo] = n;
        }
      }
      if (reflexao) metaBruto.reflexao = reflexao;

      // Defensivo: roda o schema antes de tocar I/O.
      const parsed = MedidasSchema.safeParse(metaBruto);
      if (!parsed.success) {
        throw new Error(parsed.error.message);
      }

      await escreverMedida(vaultRoot, parsed.data, '');

      haptics.success();
      toast.show('Medidas salvas.', 'success');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha desconhecida';
      haptics.error();
      toast.show(`Falha ao salvar: ${msg}`, 'error');
    } finally {
      setSalvando(false);
    }
  }, [
    salvando,
    vaultRoot,
    fotos,
    campos,
    sentindo,
    objetivos,
    observacoes,
    pessoaAtiva,
    toast,
    router,
  ]);

  // Layout em pares para grid 2 cols.
  const linhas: MedidaCampo[][] = [];
  for (let i = 0; i < MEDIDAS_CAMPOS.length; i += 2) {
    linhas.push([...MEDIDAS_CAMPOS.slice(i, i + 2)]);
  }

  return (
    <Screen>
      <Header title="Novas medidas" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Grid 2 cols com 9 inputs */}
        <View style={{ gap: spacing.sm }}>
          {linhas.map((linha, idx) => (
            <View
              key={`linha-${idx}`}
              style={{ flexDirection: 'row', gap: spacing.sm }}
            >
              {linha.map((campo) => {
                const meta = MEDIDAS_LABELS[campo];
                const valor = campos[campo];
                const sug = sugestao ? sugestao[campo] : null;
                return (
                  <View key={campo} style={{ flex: 1 }}>
                    <InputMedida
                      label={meta.label}
                      unidade={meta.unidade}
                      value={valor}
                      onChangeText={(v) => handleChangeCampo(campo, v)}
                      sugestao={typeof sug === 'number' ? sug : null}
                    />
                  </View>
                );
              })}
              {linha.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>

        {/* Bloco fotos: 3 botoes 100x100dp lado a lado */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            Fotos
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              justifyContent: 'space-between',
            }}
          >
            {LADOS_FOTO.map(({ key, label }) => {
              const slot = fotos[key];
              return (
                <View key={key} style={{ alignItems: 'center', gap: spacing.xs }}>
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 12,
                      backgroundColor: colors.bgAlt,
                      borderWidth: 1,
                      borderColor: colors.bgElev,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {slot.origem ? (
                      <>
                        <Image
                          source={{ uri: slot.origem }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                          accessibilityLabel={`thumbnail foto ${key}`}
                        />
                        <Pressable
                          onPress={() => handleRemoverFoto(key)}
                          accessibilityRole="button"
                          accessibilityLabel={`remover foto ${key}`}
                          hitSlop={6}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: colors.red,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={14} color={colors.bg} strokeWidth={2.4} />
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        onPress={() => handleEscolherFoto(key)}
                        accessibilityRole="button"
                        accessibilityLabel={`escolher foto ${key}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <Camera
                          size={28}
                          color={colors.mutedDecor}
                          strokeWidth={1.5}
                        />
                      </Pressable>
                    )}
                  </View>
                  <Text
                    style={{
                      color: colors.mutedDecor,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 11,
                      lineHeight: 14,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bloco reflexao: 3 textareas */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            Reflexão
          </Text>
          <Textarea
            label="Como você está se sentindo?"
            placeholder="Energia, disposição, ânimo geral."
            value={sentindo}
            onChangeText={setSentindo}
            minHeight={80}
            accessibilityLabel="campo sentindo"
          />
          <Textarea
            label="Objetivos"
            placeholder="O que quer alcançar nesse ciclo."
            value={objetivos}
            onChangeText={setObjetivos}
            minHeight={80}
            accessibilityLabel="campo objetivos"
          />
          <Textarea
            label="Observações"
            placeholder="Notas livres."
            value={observacoes}
            onChangeText={setObservacoes}
            minHeight={80}
            accessibilityLabel="campo observacoes"
          />
        </View>

        {/* Botao salvar */}
        <Button
          label={salvando ? 'Salvando...' : 'Salvar'}
          onPress={handleSalvar}
          variant="success"
          disabled={salvando}
        />
      </ScrollView>
    </Screen>
  );
}
