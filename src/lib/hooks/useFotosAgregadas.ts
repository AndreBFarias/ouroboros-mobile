// Galeria agregada de fotos. Varre 5 fontes do Vault sem duplicar
// arquivos:
//   1. eventos/<...>.md  -> campo fotos: string[] (paths relativos)
//   2. inbox/mente/diario/<...>.md  -> midia (futuro M06.5;
//      atualmente schema diario_emocional nao tem 'midia', mas a
//      sprint M06 deixou aberto. Por ora ignoramos com guarda.)
//   3. medidas/<...>.md  -> M12 entregou; le schema MedidasSchema e
//      adiciona cada foto com origem 'medida'.
//   4. marcos/<...>.md   -> body pode ter referencia futura (ignorado)
//   5. assets/exercicios/  -> GIFs sao demonstrativos, NAO entram aqui
//
// Decisao spec §10: aba Fotos so le, nao copia. Cada item carrega
// origem para o caller saber em qual schema/Tela navegar quando o
// usuario tocar "Abrir registro".
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { VAULT_FOLDERS } from '@/lib/vault/paths';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import { MedidasSchema, type Medida } from '@/lib/schemas/medidas';

// Origens declaradas. Em sprints futuras, novas pastas (medidas,
// inbox/mente/diario com midia, etc) entram nesta enum sem mexer
// em consumidores.
export type FotoOrigem = 'evento' | 'medida' | 'diario';

export interface FotoAgregada {
  // URI absoluto resolvido para <Image source={{ uri }} />.
  uri: string;
  // ISO 8601 da entrada-mae (data do schema, nao mtime do arquivo).
  data: string;
  origem: FotoOrigem;
  // Path relativo do schema-mae (para "Abrir registro").
  origemPath: string;
  // Slug do registro-mae quando aplicavel (ex: cafe-com-pessoa_b).
  origemSlug: string;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Tenta extrair slug do nome de arquivo no formato YYYY-MM-DD-<slug>.md.
function slugDoArquivo(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const ult = decoded.split('/').pop() ?? '';
  const semExt = ult.replace(/\.md$/, '');
  const match = semExt.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return match ? match[1] : semExt;
}

async function lerEventos(
  vaultRoot: string,
  autor: string | null
): Promise<FotoAgregada[]> {
  const folder = joinUri(vaultRoot, VAULT_FOLDERS.eventos);
  const arquivos = await listVaultFolder(folder, '.md');
  const out: FotoAgregada[] = [];

  for (const uri of arquivos) {
    let parsed: { meta: EventoMeta; body: string } | null = null;
    try {
      parsed = await readVaultFile(uri, EventoSchema);
    } catch {
      continue;
    }
    if (!parsed) continue;
    if (autor && parsed.meta.autor !== autor) continue;

    const slug = slugDoArquivo(uri);
    const dataIso = parsed.meta.data;
    for (const fotoRel of parsed.meta.fotos ?? []) {
      // Resolve URI absoluta. Path do meta vem como "assets/foto-x.jpg"
      // (relativo a raiz do Vault).
      const absUri = joinUri(vaultRoot, fotoRel);
      out.push({
        uri: absUri,
        data: dataIso,
        origem: 'evento',
        origemPath: `eventos/${slug}.md`,
        origemSlug: slug,
      });
    }
  }
  return out;
}

// Le todas as fotos de medidas/<YYYY-MM-DD>.md. Slug aqui e a propria
// data (medidas nao tem slug livre); origemSlug fica como YYYY-MM-DD
// para que o caller possa exibir e abrir o registro futuramente.
async function lerMedidas(
  vaultRoot: string,
  autor: string | null
): Promise<FotoAgregada[]> {
  const folder = joinUri(vaultRoot, VAULT_FOLDERS.medidas);
  const arquivos = await listVaultFolder(folder, '.md');
  const out: FotoAgregada[] = [];

  for (const uri of arquivos) {
    let parsed: { meta: Medida; body: string } | null = null;
    try {
      parsed = await readVaultFile(uri, MedidasSchema);
    } catch {
      continue;
    }
    if (!parsed) continue;
    if (autor && parsed.meta.autor !== autor) continue;

    const dataYmd = parsed.meta.data;
    for (const fotoRel of parsed.meta.fotos ?? []) {
      const absUri = joinUri(vaultRoot, fotoRel);
      out.push({
        uri: absUri,
        data: dataYmd,
        origem: 'medida',
        origemPath: `medidas/${dataYmd}.md`,
        origemSlug: dataYmd,
      });
    }
  }
  return out;
}

export interface UseFotosAgregadasResult {
  fotos: FotoAgregada[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useFotosAgregadas(): UseFotosAgregadasResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const filtroPessoa = usePessoa((s) => s.filtroPessoa);

  const [fotos, setFotos] = useState<FotoAgregada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setFotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const autor = filtroPessoa === 'ambos' ? null : pessoaAtiva;
    try {
      // Eventos (M07) + medidas (M12). M06.5 adicionara midia em
      // diario emocional. Estrutura do hook ja esta pronta para
      // crescer sem consumer ter que mudar.
      const [eventos, medidas] = await Promise.all([
        lerEventos(vaultRoot, autor),
        lerMedidas(vaultRoot, autor),
      ]);
      const todas = [...eventos, ...medidas];
      // Mais recentes primeiro.
      todas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setFotos(todas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falha ao carregar fotos');
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, pessoaAtiva, filtroPessoa]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { fotos, loading, error, recarregar: carregar };
}
