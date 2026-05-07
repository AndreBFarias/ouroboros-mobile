// M34: helper de salvamento de frase texto-livre. Diferente das
// midias binarias, frase nao tem arquivo separado: o proprio .md
// guarda frontmatter + body com o texto.
//
// Path canonico: media/frases/<YYYY-MM-DD>-<slug>.md (mediaFrasesPath
// em paths.ts). Slug derivado das primeiras palavras via slugDeFrase.
//
// Comportamento por ambiente:
//   - mobile real: grava .md no Vault. Erro silencia em false.
//   - web: no-op. Validacao via Gauntlet usa store mock futuro;
//     M34 nao adiciona mock visivel para frase porque a aba Frases
//     ainda nao existe na UI (M39 introduz).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { frasePath } from '@/lib/vault/paths';
import type { Para } from '@/lib/schemas/para';
import {
  slugDeFrase,
  stringifyCompanionMidia,
} from '@/lib/midia/companion';

export interface SalvarFraseOpcoes {
  // Texto da frase. Obrigatorio nao-vazio (caller valida antes).
  frase: string;
  para?: Para;
}

export interface SalvarFraseResultado {
  ok: boolean;
  // Path relativo do .md gravado. null em cancel/erro.
  arquivo: string | null;
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export async function salvarFrase(
  opcoes: SalvarFraseOpcoes
): Promise<SalvarFraseResultado> {
  const frase = opcoes.frase.trim();
  if (frase.length === 0) {
    return { ok: false, arquivo: null };
  }
  const para: Para = opcoes.para ?? { tipo: 'mim' };

  if (Platform.OS === 'web') {
    return { ok: false, arquivo: null };
  }

  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) {
    return { ok: false, arquivo: null };
  }

  try {
    const agora = new Date();
    const slug = slugDeFrase(frase);
    const rel = frasePath(agora, slug);
    const destino = joinUri(vaultRoot, rel);
    const autor = usePessoa.getState().pessoaAtiva;
    const basename = rel.split('/').pop() ?? rel;
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_frase',
      arquivo: basename,
      data: agora.toISOString(),
      autor,
      para,
      legenda: frase,
    });
    await FileSystem.writeAsStringAsync(destino, conteudo);
    return { ok: true, arquivo: rel };
  } catch {
    return { ok: false, arquivo: null };
  }
}
