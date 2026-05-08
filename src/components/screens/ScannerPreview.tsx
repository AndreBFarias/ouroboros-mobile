// Preview pos-captura. Mostra a primeira página deskewed em fade-in
// (Moti spring_default), overlay OCR cyan mono caption, formulario
// editável com 5 campos (valor, data, descrição, categoria, pessoa)
// e chip cyan opcional do bairro detectado. Banner amarelo aparece
// quando a confianca OCR cai abaixo de 0.8.
//
// Fluxo: useEffect dispara extrairTexto na primeira URI; com texto
// pronto, popula campos via heurísticas regex; usuário revisa e
// salva. Multi-page consolida em PDF único via expo-print antes de
// gravar no Vault.
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  Button,
  Chip,
  ChipGroup,
  Header,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { springs } from '@/lib/motion';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa, useNomeDe } from '@/lib/stores/pessoa';
import { extrairTexto } from '@/lib/scanner/text-recognition';
import {
  extrairValor,
  extrairData,
  extrairCategoria,
  type CategoriaCanonica,
} from '@/lib/scanner/parsing';
import { consolidarPdf } from '@/lib/scanner/multipage-pdf';
import { saveNota, IMAGEM_PENDENTE } from '@/lib/scanner/saveNota';
import { getBairroAtual } from '@/lib/eventos/localizacao';
import { comTimeout } from '@/lib/util/comTimeout';
import type { FinanceiroNotaMeta } from '@/lib/schemas/financeiro_nota';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// I-SCANNER (M-SAVE-SCANNER-VALIDA, 2026-05-07): timeout 30s
// cobre consolidacao PDF multipagina + copy binario para SAF +
// 2 writes (.md companion + .md semantico). Devices saudaveis
// completam tudo em <2s; 30s da margem para OEMs MIUI/HyperOS
// sem frustrar o usuario.
const SAVE_SCANNER_TIMEOUT_MS = 30_000;

const CATEGORIAS: ReadonlyArray<{ value: CategoriaCanonica; label: string }> = [
  { value: 'mercado', label: 'Mercado' },
  { value: 'farmacia', label: 'Farmácia' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'outro', label: 'Outro' },
];

// Labels da lista de pessoas montadas em runtime (Regra -1: nenhum
// nome real ou rotulo hardcoded). Ver useMemo dentro de ScannerPreview.
const THRESHOLD_REVISAR = 0.8;

export function ScannerPreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uris?: string }>();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const nomeA = useNomeDe('pessoa_a');
  const nomeB = useNomeDe('pessoa_b');
  const opcoesPessoa = useMemo<ReadonlyArray<{ value: PessoaAutor; label: string }>>(
    () => [
      { value: 'pessoa_a', label: nomeA },
      { value: 'pessoa_b', label: nomeB },
    ],
    [nomeA, nomeB]
  );

  const uris: string[] = typeof params.uris === 'string' && params.uris.length > 0
    ? params.uris.split('|')
    : [];

  const [textoOcr, setTextoOcr] = useState<string>('');
  const [confianca, setConfianca] = useState<number>(0);
  const [carregandoOcr, setCarregandoOcr] = useState<boolean>(true);
  const [valor, setValor] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [categoria, setCategoria] = useState<CategoriaCanonica>('outro');
  const [pessoa, setPessoa] = useState<PessoaAutor>(pessoaAtiva);
  const [bairroDetectado, setBairroDetectado] = useState<string | null>(null);
  const [bairroAceito, setBairroAceito] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);

  useEffect(() => {
    let cancelado = false;
    async function rodarOcr() {
      if (uris.length === 0) {
        setCarregandoOcr(false);
        return;
      }
      try {
        const r = await extrairTexto(uris[0]);
        if (cancelado) return;
        setTextoOcr(r.texto);
        setConfianca(r.confianca);
        const v = extrairValor(r.texto);
        if (typeof v === 'number') setValor(v.toFixed(2));
        const d = extrairData(r.texto);
        if (typeof d === 'string') setData(d);
        const c = extrairCategoria(r.texto);
        setCategoria(c);
      } catch {
        if (!cancelado) toast.show('Falha no reconhecimento de texto.', 'error');
      } finally {
        if (!cancelado) setCarregandoOcr(false);
      }
    }
    rodarOcr();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function detectarBairro() {
      const b = await getBairroAtual();
      if (cancelado) return;
      setBairroDetectado(b);
    }
    detectarBairro();
    return () => {
      cancelado = true;
    };
  }, []);

  async function aoSalvar() {
    if (salvando) return;
    if (vaultRoot === null) {
      toast.show('Vault não configurado.', 'error');
      return;
    }
    const valorNumero = Number(valor.replace(',', '.'));
    if (!Number.isFinite(valorNumero) || valorNumero < 0) {
      toast.show('Valor inválido.', 'error');
      return;
    }
    if (descricao.trim().length === 0) {
      toast.show('Descrição obrigatória.', 'error');
      return;
    }
    setSalvando(true);
    try {
      // Multi-page: consolida em PDF unico via expo-print. Tambem
      // dentro do try/catch: se consolidarPdf falhar (memoria,
      // expo-print indisponivel em Expo Go), toast de erro claro.
      let imagemUri = uris[0];
      let isPdf = false;
      if (uris.length > 1) {
        const r = await consolidarPdf(uris);
        imagemUri = r.uri;
        isPdf = true;
      }

      // Data ISO: se vazio, usa agora.
      const dataIso = data.length > 0
        ? `${data}T${new Date().toTimeString().slice(0, 5)}`
        : new Date().toISOString();

      const meta: FinanceiroNotaMeta = {
        tipo: 'financeiro',
        subtipo: 'nota',
        data: dataIso,
        autor: pessoa,
        valor: valorNumero,
        descricao: descricao.trim(),
        categoria,
        // Sentinela: saveNota copia o binario para <ext>/scanner-<slug>.<ext>
        // e sobrescreve este campo com o path real antes de gravar o .md.
        imagem: IMAGEM_PENDENTE,
        ocr_confianca: confianca,
        revisar: confianca < THRESHOLD_REVISAR,
        ...(bairroAceito && bairroDetectado !== null
          ? { bairro: bairroDetectado }
          : {}),
      };

      // comTimeout 30s impede loader infinito quando SAF write trava
      // em devices com OEMs lentos (MIUI/HyperOS/OneUI). Se estourar,
      // toast 'Não foi possível salvar: timeout salvando' e usuario
      // pode tentar de novo (sheet/preview ainda aberto).
      await comTimeout(
        saveNota({
          meta,
          body: textoOcr,
          vaultRoot,
          imagemUri,
          isPdf,
        }),
        SAVE_SCANNER_TIMEOUT_MS
      );

      await haptics.light();
      toast.show('Nota salva.', 'success');
      router.back();
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      console.error('save scanner fail', e);
    } finally {
      setSalvando(false);
    }
  }

  function aoRegravar() {
    router.back();
  }

  const mostraBanner = !carregandoOcr && confianca < THRESHOLD_REVISAR;

  return (
    <Screen>
      <Header title="Preview" onBack={aoRegravar} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          gap: 20,
        }}
      >
        {uris.length > 0 ? (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springs.default}
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              backgroundColor: colors.bgAlt,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: uris[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel="documento capturado"
            />
          </MotiView>
        ) : null}

        {uris.length > 1 ? (
          <Text
            className="font-mono text-cyan text-xs"
            style={{ lineHeight: 18 }}
          >
            {uris.length} páginas serão consolidadas em PDF único.
          </Text>
        ) : null}

        {mostraBanner ? (
          <View
            style={{
              backgroundColor: colors.bgAlt,
              borderLeftWidth: 3,
              borderLeftColor: colors.yellow,
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text
              className="font-mono text-fg text-sm"
              style={{ lineHeight: 22 }}
            >
              Revisar texto reconhecido. Confiança baixa.
            </Text>
          </View>
        ) : null}

        {textoOcr.length > 0 ? (
          <View>
            <Text className="font-mono text-muted text-xs mb-2">
              Texto reconhecido
            </Text>
            <Text
              className="font-mono text-cyan text-xs"
              style={{ lineHeight: 18 }}
            >
              {textoOcr}
            </Text>
          </View>
        ) : null}

        <Input
          label="Valor"
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          keyboardType="decimal-pad"
          accessibilityLabel="valor"
        />

        <Input
          label="Data"
          value={data}
          onChangeText={setData}
          placeholder="2026-04-28"
          accessibilityLabel="data"
        />

        <Input
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Mercado da esquina"
          accessibilityLabel="descricao"
        />

        <View>
          <Text className="font-mono text-muted text-xs mb-2">
            Categoria
          </Text>
          <ChipGroup
            mode="single"
            options={CATEGORIAS.map((c) => ({
              value: c.value,
              label: c.label,
              accent: 'cyan',
            }))}
            value={categoria}
            onChange={(v) => {
              if (v !== null) setCategoria(v as CategoriaCanonica);
            }}
          />
        </View>

        <View>
          <Text className="font-mono text-muted text-xs mb-2">
            Pessoa
          </Text>
          <ChipGroup
            mode="single"
            options={opcoesPessoa.map((p) => ({
              value: p.value,
              label: p.label,
              accent: 'purple',
            }))}
            value={pessoa}
            onChange={(v) => {
              if (v === 'pessoa_a' || v === 'pessoa_b') setPessoa(v);
            }}
          />
        </View>

        {bairroDetectado !== null ? (
          <View>
            <Text className="font-mono text-muted text-xs mb-2">
              Bairro detectado
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Chip
                label={bairroDetectado}
                selected={bairroAceito}
                onPress={() => setBairroAceito((v) => !v)}
                accent="cyan"
              />
            </View>
          </View>
        ) : null}

        <View style={{ gap: 12, marginTop: 12 }}>
          <Button
            label={salvando ? 'Salvando...' : 'Salvar'}
            onPress={aoSalvar}
            variant="success"
            disabled={salvando || carregandoOcr}
          />
          <Button
            label="Regravar"
            onPress={aoRegravar}
            variant="ghost"
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
