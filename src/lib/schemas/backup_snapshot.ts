// R-BACKUP-AUTO -- schema canonico do snapshot de backup automatico.
//
// Contexto: a sprint M-BACKUP-AUTOMATICO (Bloco C5) ja entregou o
// fluxo runtime (agendarBackup + executarBackup + restaurarVaultZip),
// que zipava o Vault inteiro com MANIFEST.json interno + sha256 por
// arquivo. Falta(va) um schema isolado descrevendo o snapshot no
// nivel do backup (tipo, versao, origem, contagem, sha256 do zip
// completo) para companion .md lateral e para a UI mostrar metadados
// rapidos sem precisar abrir o zip.
//
// Decisoes (R-BACKUP-AUTO D6=SIM):
//   - tipo fixo backup_snapshot (frontmatter-friendly).
//   - versao 1 (espelha o BACKUP_SNAPSHOT_SCHEMA_VERSION abaixo).
//   - origem = deviceId desta instalacao (M38, src/lib/util/deviceId.ts).
//   - arquivos_incluidos = total fisico dentro do zip; nao conta o
//     proprio MANIFEST.json (que e metadado).
//   - bytes_totais = soma dos bytes ORIGINAIS dos arquivos (nao do
//     zip comprimido; comprimido fica em uri).
//   - sha256 = hash do zip completo, calculado em runtime via leitura
//     base64 + sha256Base64.
//   - criado_em = ISO 8601 com offset (mesma convencao do projeto).
//
// Sem dependencia runtime: util tanto pra escrever companion .md
// quanto pra parser sibling-Python do Vault. Schema canonico isolado
// faz a feature documentavel sem precisar abrir o zip.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

// Versao do schema de snapshot. Incrementar quando o shape mudar de
// forma incompativel para o parser sibling/UI.
export const BACKUP_SNAPSHOT_SCHEMA_VERSION = 1 as const;

// ISO datetime com offset ou Z (mesmo padrao de schemas existentes).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

export const BackupSnapshotSchema = z.object({
  tipo: z.literal('backup_snapshot'),
  versao: z.literal(BACKUP_SNAPSHOT_SCHEMA_VERSION),
  criado_em: IsoDatetime,
  origem: z
    .string()
    .min(1, 'origem deve ser o deviceId nao-vazio')
    .max(64, 'origem nao pode passar de 64 chars'),
  arquivos_incluidos: z.number().int().nonnegative(),
  bytes_totais: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'sha256 deve ser hex de 64 chars'),
});

export type BackupSnapshot = z.infer<typeof BackupSnapshotSchema>;

// Serializa o snapshot como frontmatter YAML simples (4 chaves
// escalares + 4 numericas). Util para gravar o companion .md lateral
// ao .zip. Sem yaml lib externa: snapshot tem shape conhecido e fixo,
// gravamos com aspas explicitas em strings.
//
// Saida exemplo:
// ---
// tipo: backup_snapshot
// versao: 1
// criado_em: "2026-05-17T03:42:00-03:00"
// origem: "ouro-xj9k2"
// arquivos_incluidos: 142
// bytes_totais: 8432091
// sha256: "8a4b..."
// ---
export function serializarFrontmatter(snap: BackupSnapshot): string {
  const linhas = [
    '---',
    'tipo: backup_snapshot',
    'versao: ' + String(snap.versao),
    'criado_em: "' + snap.criado_em + '"',
    'origem: "' + snap.origem + '"',
    'arquivos_incluidos: ' + String(snap.arquivos_incluidos),
    'bytes_totais: ' + String(snap.bytes_totais),
    'sha256: "' + snap.sha256 + '"',
    '---',
    '',
  ];
  return linhas.join('\n');
}

// Parse defensivo do frontmatter gerado por serializarFrontmatter.
// Aceita o bloco entre '---' linhas; ignora corpo apos. Devolve null
// quando o frontmatter nao conforma ao schema (sem lancar excecao).
export function parseFrontmatter(texto: string): BackupSnapshot | null {
  const match = /^---\n([\s\S]*?)\n---/m.exec(texto);
  if (!match) return null;
  const corpo = match[1];
  const obj: Record<string, unknown> = {};
  for (const raw of corpo.split('\n')) {
    const linha = raw.trim();
    if (!linha) continue;
    const sep = linha.indexOf(':');
    if (sep < 0) continue;
    const chave = linha.slice(0, sep).trim();
    let valor: string | number = linha.slice(sep + 1).trim();
    // Remove aspas duplas envoltorias.
    if (
      typeof valor === 'string' &&
      valor.length >= 2 &&
      valor.startsWith('"') &&
      valor.endsWith('"')
    ) {
      valor = valor.slice(1, -1);
    }
    // Numeric coercion para chaves conhecidas inteiras.
    if (
      chave === 'versao' ||
      chave === 'arquivos_incluidos' ||
      chave === 'bytes_totais'
    ) {
      const n = Number(valor);
      if (!Number.isFinite(n)) return null;
      valor = n;
    }
    obj[chave] = valor;
  }
  const parsed = BackupSnapshotSchema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}
