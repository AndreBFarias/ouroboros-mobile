// Categorias do share intent receiver (Tela 17, M08). Mapa entre o
// chip selecionado pelo usuario e a pasta de destino dentro do
// Vault.
//
// Granularidade canonica: inbox/<area>/<subtipo>/, com 4 areas e 8
// subtipos. Ordem dos chips na UI segue a ordem desta lista
// (financeiro primeiro, outros por ultimo) para alinhar com o flow
// PIX-em-5s prometido.
import type { ChipOption } from '@/components/ui';
import type { InboxArquivoSubtipo } from '@/lib/schemas/inbox_arquivo';

// Areas canonicas. Mantidas como union literal para garantir tipagem
// ao longo do path-resolver.
export type InboxArea = 'financeiro' | 'saude' | 'casa' | 'outros';

// Mapa estatico subtipo -> area + chave de pasta em VAULT_FOLDERS.
// O `folderKey` referência diretamente as entradas adicionadas em
// src/lib/vault/paths.ts (M08). Usar string literal aqui evitaria
// a importacao circular com paths.ts.
interface SubtipoMeta {
  readonly area: InboxArea;
  // Caminho relativo da pasta dentro do Vault. Mantemos como string
  // literal para evitar dependencia circular com paths.ts; os testes
  // de path-resolver checam que estes valores baten com VAULT_FOLDERS.
  readonly folder: string;
  readonly label: string;
  readonly accent: ChipOption['accent'];
}

export const INBOX_SUBTIPOS: Record<InboxArquivoSubtipo, SubtipoMeta> = {
  pix: {
    area: 'financeiro',
    folder: 'inbox/financeiro/pix',
    label: 'PIX',
    accent: 'green',
  },
  extrato: {
    area: 'financeiro',
    folder: 'inbox/financeiro/extrato',
    label: 'Extrato',
    accent: 'green',
  },
  nota: {
    area: 'financeiro',
    folder: 'inbox/financeiro/nota',
    label: 'Nota',
    accent: 'green',
  },
  exame: {
    area: 'saude',
    folder: 'inbox/saude/exame',
    label: 'Exame',
    accent: 'cyan',
  },
  receita: {
    area: 'saude',
    folder: 'inbox/saude/receita',
    label: 'Receita',
    accent: 'cyan',
  },
  garantia: {
    area: 'casa',
    folder: 'inbox/casa/garantia',
    label: 'Garantia',
    accent: 'orange',
  },
  contrato: {
    area: 'casa',
    folder: 'inbox/casa/contrato',
    label: 'Contrato',
    accent: 'orange',
  },
  outro: {
    area: 'outros',
    folder: 'inbox/outros',
    label: 'Outro',
    accent: 'purple',
  },
};

// Ordem visual canonica para o ChipGroup. Financeiro primeiro
// (suporta o flow PIX), saude e casa em sequência, 'outro' como
// fallback no fim.
export const INBOX_SUBTIPOS_ORDEM: readonly InboxArquivoSubtipo[] = [
  'pix',
  'extrato',
  'nota',
  'exame',
  'receita',
  'garantia',
  'contrato',
  'outro',
];

// Pronto para consumo direto pelo <ChipGroup mode="single">.
export const INBOX_SUBTIPO_OPTIONS: readonly ChipOption[] =
  INBOX_SUBTIPOS_ORDEM.map((s) => ({
    value: s,
    label: INBOX_SUBTIPOS[s].label,
    accent: INBOX_SUBTIPOS[s].accent,
  }));

// Helper: devolve o folder canonico (path relativo ao Vault) para um
// subtipo. Lanca quando recebe valor desconhecido em vez de retornar
// fallback silencioso, para não mascarar bug.
export function pastaParaSubtipo(subtipo: InboxArquivoSubtipo): string {
  const meta = INBOX_SUBTIPOS[subtipo];
  if (!meta) {
    throw new Error(`subtipo desconhecido: ${subtipo}`);
  }
  return meta.folder;
}

// Inferencia heuristica de subtipo default a partir do mime type.
// Quando o intent traz application/pdf, comecamos em 'extrato'
// (caso PIX o usuario re-seleciona). Imagens entram em 'nota' por
// default (foto de comprovante e o caso mais comum). Esses defaults
// são apenas pre-selecao do chip; o usuario pode trocar antes de
// salvar.
export function subtipoDefault(mimeType: string): InboxArquivoSubtipo {
  if (mimeType.startsWith('image/')) return 'nota';
  if (mimeType === 'application/pdf') return 'extrato';
  return 'outro';
}
