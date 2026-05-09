// Tela 17 - Share Intent Receiver (M08). Rota modal raiz que recebe
// o arquivo compartilhado por outro app (banco, galeria, gerenciador
// de arquivos), permite classificar o subtipo, exibe o path canonico
// dinamico e salva no Vault inbox copiando o binario via SAF e
// gravando .md companion via writeVaultFile.
//
// O componente visual fica em src/components/screens/ShareReceiver;
// aqui orquestramos states, side effects (copyAsync) e fluxo de
// conflito.
//
// Convencao (CONTRACT 1.7): a activity nunca abre a Stack principal.
// Cancelar e salvar fecham via router.dismissAll() para devolver
// foco ao app de origem em <5s.
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { ShareReceiver, type ConflitoAcao } from '@/components/screens/ShareReceiver';
import { useToast } from '@/components/ui';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import {
  parseIntentParams,
  nomeAmigavel,
  type SharedIntentInput,
} from '@/lib/share/intent';
import {
  resolverDestino,
  aplicarSufixoNumerico,
  pathMdCompanion,
} from '@/lib/share/path-resolver';
import { subtipoDefault } from '@/lib/share/categorias';
import {
  InboxArquivoSchema,
  type InboxArquivoMeta,
  type InboxArquivoSubtipo,
} from '@/lib/schemas/inbox_arquivo';
import { writeVaultFile } from '@/lib/vault';
import { haptics } from '@/lib/haptics';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Concatena vaultRoot SAF com path relativo. Mesmo padrao usado em
// saveEvento.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Formata data ISO 8601 com offset -03:00 (São Paulo, sem DST).
// Mesmo helper usado em app/eventos.tsx.
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

// Verifica se um path já existe via SAF.getInfoAsync. Em caso de
// erro (URI invalida, sem permissao), trata como "não existe" para
// não bloquear o flow. O caller usa o retorno para decidir entre
// path canonico ou fallback com sufixo.
async function pathExiste(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return Boolean(info?.exists);
  } catch {
    return false;
  }
}

export default function ShareReceiveRoute() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    uri?: string | string[];
    mime?: string | string[];
    nome?: string | string[];
    origem?: string | string[];
  }>();

  const intent: SharedIntentInput | null = useMemo(
    () => parseIntentParams(params),
    [params]
  );

  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const nomePessoaA = usePessoa((s) => s.nomes.pessoa_a);
  const nomePessoaB = usePessoa((s) => s.nomes.pessoa_b);

  const [subtipo, setSubtipo] = useState<InboxArquivoSubtipo>(() =>
    intent ? subtipoDefault(intent.mimeType) : 'outro'
  );
  const [pessoa, setPessoa] = useState<PessoaAutor>(pessoaAtiva);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [conflito, setConflito] = useState<{ pathExistente: string } | null>(
    null
  );

  // Estado degenerado: rota acessada sem uri. Mostra mensagem curta
  // e sai. Não redirecionamos para nada porque a activity de share
  // raramente entra aqui sem uri; melhor falhar suave.
  if (!intent || !vaultRoot) {
    return (
      <ShareReceiver
        uri=""
        mimeType="application/octet-stream"
        nome={!vaultRoot ? 'Vault não autorizado' : 'Sem arquivo'}
        subtipo={subtipo}
        onChangeSubtipo={setSubtipo}
        pessoa={pessoa}
        onChangePessoa={setPessoa}
        pathDisplay={!vaultRoot ? 'Abra o app uma vez para autorizar.' : '—'}
        salvando={false}
        conflito={null}
        onResolverConflito={() => undefined}
        onSalvar={() => {
          toast.show(
            !vaultRoot
              ? 'Vault não autorizado. Abra o app uma vez antes.'
              : 'Nenhum arquivo recebido.',
            'warn'
          );
        }}
        onCancelar={() => router.dismissAll()}
        nomePessoaA={nomePessoaA}
        nomePessoaB={nomePessoaB}
      />
    );
  }

  const nomeBase = nomeAmigavel(intent);

  // Após o early-return acima, vaultRoot e intent estao garantidos
  // como não-nulos. TS não narrowa para closures aninhadas; usamos
  // aliases locais para preservar a tipagem não-nullable.
  const vaultRootSafe: string = vaultRoot;
  const intentSafe: SharedIntentInput = intent;

  // Path canonico recalculado em todo render quando subtipo muda.
  // Como a hora vai variar entre cliques, usamos um snapshot fixo
  // por sessao para que o path display não "mexa" sozinho. Isso
  // também garante que o save use o mesmo path do display.
  const agora = useMemo(() => new Date(), []);
  const pathCanonico = useMemo(
    () =>
      resolverDestino({
        subtipo,
        mimeType: intentSafe.mimeType,
        agora,
        nome: intentSafe.nomeSugerido,
        slug: nomeBase ? nomeBase.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined,
      }),
    [subtipo, intentSafe.mimeType, intentSafe.nomeSugerido, agora, nomeBase]
  );

  // V4.0.2: garante pasta-pai do destino antes de qualquer write.
  // share intent persiste em inbox/financeiro/<subtipo>/ que NAO esta
  // em SUBPASTAS_CANONICAS — sem isso, o FileOutputStream interno do
  // copyAsync para content://->file:// falha por parent ausente.
  async function ensureParentDir(destinoUri: string): Promise<void> {
    const lastSlash = destinoUri.lastIndexOf('/');
    if (lastSlash === -1) return;
    const parentUri = destinoUri.substring(0, lastSlash);
    try {
      await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
    } catch {
      // Ja existe ou backend rejeitou; copy posterior decide.
    }
  }

  // Helpers para gravar binario + meta. Ambos lancam em erro de I/O;
  // o caller (handleSalvar) faz wrap em try/catch.
  async function gravarBinario(rel: string): Promise<void> {
    const destinoUri = joinUri(vaultRootSafe, rel);
    await ensureParentDir(destinoUri);
    await FileSystem.copyAsync({ from: intentSafe.uri, to: destinoUri });
  }

  async function gravarMd(
    rel: string,
    relMd: string,
    tamanhoBytes: number
  ): Promise<void> {
    const meta: InboxArquivoMeta = {
      tipo: 'inbox_arquivo',
      subtipo,
      data: toIsoSaoPaulo(agora),
      autor: pessoa,
      arquivo: rel,
      mime_type: intentSafe.mimeType,
      tamanho_bytes: tamanhoBytes,
      origem: intentSafe.origem,
      revisar: true,
    };
    const validacao = InboxArquivoSchema.safeParse(meta);
    if (!validacao.success) {
      throw new Error(`inbox_arquivo invalido: ${validacao.error.message}`);
    }
    const mdUri = joinUri(vaultRootSafe, relMd);
    await ensureParentDir(mdUri);
    // Body livre do .md fica vazio no caso default. Caller futuro
    // pode adicionar texto extraido por OCR (M09).
    await writeVaultFile<InboxArquivoMeta>(mdUri, validacao.data, '');
  }

  // Tenta medir tamanho via SAF.getInfoAsync. Em erro, devolve 0
  // (schema permite). Não queremos bloquear save por isso.
  async function medirTamanho(): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(intentSafe.uri);
      if (info && 'size' in info && typeof info.size === 'number') {
        return info.size;
      }
    } catch {
      // ignora
    }
    return 0;
  }

  // Loop de busca de slot livre quando já existe o canonico. Limite
  // defensivo de 9 tentativas com sufixos -1 a -9 antes de cair em
  // timestamp.
  async function acharSlotLivre(rel: string): Promise<string> {
    const ja = await pathExiste(joinUri(vaultRootSafe, rel));
    if (!ja) return rel;
    for (let n = 1; n <= 9; n++) {
      const candidato = aplicarSufixoNumerico(rel, n);
      if (!(await pathExiste(joinUri(vaultRootSafe, candidato)))) {
        return candidato;
      }
    }
    return aplicarSufixoNumerico(rel, Date.now());
  }

  // Resolucao do conflito: o usuario clicou em uma das 3 opcoes do
  // banner. Cancelar fecha tudo; renomear automático aplica sufixo
  // e salva; substituir grava por cima.
  async function handleResolverConflito(acao: ConflitoAcao): Promise<void> {
    if (acao === 'cancelar') {
      setConflito(null);
      setSalvando(false);
      return;
    }
    setConflito(null);
    if (acao === 'renomear') {
      const slot = await acharSlotLivre(pathCanonico);
      await executarSave(slot);
    } else {
      // substituir: usa o path canonico mesmo (SAF.copyAsync sobrepoe).
      await executarSave(pathCanonico);
    }
  }

  // Pipeline final: copia binario, grava .md, fecha modal.
  async function executarSave(rel: string): Promise<void> {
    setSalvando(true);
    toast.show('Salvando...', 'info');
    try {
      const tamanho = await medirTamanho();
      await gravarBinario(rel);
      await gravarMd(rel, pathMdCompanion(rel), tamanho);
      await haptics.light();
      toast.show('Salvo.', 'success');
      router.dismissAll();
    } catch {
      toast.show('Falha ao salvar.', 'error');
      setSalvando(false);
    }
  }

  // Click no botao Salvar. Verifica conflito antes; se houver, abre
  // banner. Senao, salva direto.
  async function handleSalvar(): Promise<void> {
    if (salvando) return;
    setSalvando(true);
    const uriCanonico = joinUri(vaultRootSafe, pathCanonico);
    const ja = await pathExiste(uriCanonico);
    if (ja) {
      // Mostra banner. Mantemos `salvando` true para travar o botao;
      // o resolver conflito muda esse estado.
      setConflito({ pathExistente: pathCanonico });
      return;
    }
    await executarSave(pathCanonico);
  }

  function handleCancelar(): void {
    if (salvando && !conflito) return;
    router.dismissAll();
  }

  return (
    <ShareReceiver
      uri={intent.uri}
      mimeType={intent.mimeType}
      nome={nomeBase}
      subtipo={subtipo}
      onChangeSubtipo={(s) => {
        setSubtipo(s);
        // Subtipo trocou: o conflito anterior provavelmente não se
        // aplica mais (path muda). Limpa o banner.
        if (conflito) setConflito(null);
      }}
      pessoa={pessoa}
      onChangePessoa={setPessoa}
      pathDisplay={pathCanonico}
      salvando={salvando}
      conflito={conflito}
      onResolverConflito={(a) => {
        void handleResolverConflito(a);
      }}
      onSalvar={() => {
        void handleSalvar();
      }}
      onCancelar={handleCancelar}
      nomePessoaA={nomePessoaA}
      nomePessoaB={nomePessoaB}
    />
  );
}
