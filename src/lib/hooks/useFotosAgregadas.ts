// Galeria agregada de fotos. Varre 5 fontes do Vault sem duplicar
// arquivos:
//   1. eventos/<...>.md  -> campo fotos: string[] (paths relativos)
//   2. inbox/mente/diario/<...>.md  -> midia (futuro M06.5;
//      atualmente schema diario_emocional não tem 'midia', mas a
//      sprint M06 deixou aberto. Por ora ignoramos com guarda.)
//   3. medidas/<...>.md  -> M12 entregou; le schema MedidasSchema e
//      adiciona cada foto com origem 'medida'.
//   4. marcos/<...>.md   -> body pode ter referência futura (ignorado)
//   5. assets/exercicios/  -> GIFs são demonstrativos, NÃO entram aqui
//
// Decisão spec §10: aba Fotos so le, não copia. Cada item carrega
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
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import { MedidasSchema, type Medida } from '@/lib/schemas/medidas';
import { useGaleriaMock, type FotoMock } from '@/lib/dev/galeriaMock';
import { GAUNTLET_ATIVO } from '@/lib/dev/gauntlet';

// Origens declaradas. M11.1 adicionou 'galeria-manual' para fotos
// inseridas via FAB + na aba Fotos da MemoriasScreen. Em sprints
// futuras, novas pastas (inbox/mente/diario com midia, etc) entram
// nesta enum sem mexer em consumidores.
export type FotoOrigem = 'evento' | 'medida' | 'diario' | 'galeria-manual';

export interface FotoAgregada {
  // URI absoluto resolvido para <Image source={{ uri }} />.
  uri: string;
  // ISO 8601 da entrada-mae (data do schema, não mtime do arquivo).
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
// data (medidas não tem slug livre); origemSlug fica como YYYY-MM-DD
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

// M11.1 + M34: le pasta media/fotos/<YYYY-MM-DD>-<rand>.<ext>. Em M11.1
// o helper canonico (mediaFotosPath) gerava .jpg sem companion; M34
// ampliou a captura para escrever tambem .md companion ao lado de cada
// binario (formato preliminar; M39 ratifica via ADR-0017). Aqui
// ignoramos os .md (sao metadata, nao thumbnail) e varremos .jpg /
// .jpeg / .png para suportar pickers que devolvem PNG. Data extraida
// do nome do arquivo (10 chars iniciais).
async function lerGaleriaManual(vaultRoot: string): Promise<FotoAgregada[]> {
  const folder = joinUri(vaultRoot, VAULT_FOLDERS.mediaFotos);
  // Varre 3 extensoes em paralelo. listVaultFolder filtra por sufixo
  // exato; para cobrir .jpg + .jpeg + .png chamamos 3 vezes e
  // concatenamos. Em mobile real o picker padrao devolve .jpg; .png e
  // .jpeg ficam como rede de seguranca.
  const [jpg, jpeg, png] = await Promise.all([
    listVaultFolder(folder, '.jpg'),
    listVaultFolder(folder, '.jpeg'),
    listVaultFolder(folder, '.png'),
  ]);
  const arquivos = [...jpg, ...jpeg, ...png];
  const out: FotoAgregada[] = [];
  for (const uri of arquivos) {
    const nome = decodeURIComponent(uri).split('/').pop() ?? '';
    const semExt = nome.replace(/\.(jpg|jpeg|png)$/i, '');
    // Espera padrao YYYY-MM-DD-<rand>. Se nao bater, ignora.
    const match = semExt.match(/^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/);
    if (!match) continue;
    const data = match[1];
    const slug = match[2] ?? semExt;
    out.push({
      uri,
      data,
      origem: 'galeria-manual',
      origemPath: `${VAULT_FOLDERS.mediaFotos}/${nome}`,
      origemSlug: slug,
    });
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
  // Filtro efetivo respeita pessoa.vaultCompartilhado.
  const filtroPessoa = useFiltroPessoaEfetivo();

  const [fotos, setFotos] = useState<FotoAgregada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // M11.2: leitura do store dev movida para useEffect guardado por
  // GAUNTLET_ATIVO. Em release Android (GAUNTLET_ATIVO === false) o
  // effect retorna early e o estado permanece [] - o store mock nao
  // contribui para o render. Em web/dev assina mudancas via
  // subscribe() para reagir a __gauntlet.adicionarFotoMock().
  const [fotosMock, setFotosMock] = useState<FotoMock[]>([]);
  useEffect(() => {
    if (!GAUNTLET_ATIVO) return;
    setFotosMock(useGaleriaMock.getState().fotos);
    return useGaleriaMock.subscribe((s) => setFotosMock(s.fotos));
  }, []);

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
      // Eventos (M07) + medidas (M12) + galeria-manual (M11.1).
      // M06.5 adicionara midia em diario emocional. Estrutura do
      // hook ja esta pronta para crescer sem consumer ter que mudar.
      const [eventos, medidas, galeriaManual] = await Promise.all([
        lerEventos(vaultRoot, autor),
        lerMedidas(vaultRoot, autor),
        lerGaleriaManual(vaultRoot),
      ]);
      const todas = [...eventos, ...medidas, ...galeriaManual];
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

  // M11.1: em web/dev (GAUNTLET_ATIVO), mescla as entradas da galeria
  // mock por cima das do Vault. Em mobile real fotosMock e sempre []
  // (a store nunca recebe entrada fora do helper guardado), entao
  // este merge e benigno.
  const fotosFinais: FotoAgregada[] = GAUNTLET_ATIVO && fotosMock.length > 0
    ? [
        ...fotosMock.map((m) => ({
          uri: m.uri,
          data: m.data,
          origem: 'galeria-manual' as FotoOrigem,
          origemPath: m.origemPath,
          origemSlug: m.origemSlug,
        })),
        ...fotos,
      ]
    : fotos;

  return { fotos: fotosFinais, loading, error, recarregar: carregar };
}
