// M34 / I-FRASE (M-SAVE-FRASE-VALIDA): helper de salvamento de frase
// texto-livre. Diferente das midias binarias, frase nao tem arquivo
// separado: o proprio .md guarda frontmatter + body com o texto.
//
// Path canonico apos H2 (layout-por-tipo, ADR-0023):
//   markdown/frase-YYYY-MM-DD-<slug>.md (frasePath em paths.ts).
// Slug derivado das primeiras palavras via slugDeFrase (kebab-case).
//
// I-FRASE (2026-05-07): substitui joinUri local pelo helper canonico
// vaultUriJoin de @/lib/vault, eliminando trailing space, %20 ofensivo
// e barras duplas em URIs SAF (causa raiz parcial dos saves silenciosos
// no APK alpha em OEMs MIUI/OneUI). Adiciona resolucao de colisao por
// sufixo numerico quando duas frases distintas geram o mesmo slug no
// mesmo dia. Erros agora propagam (Result com mensagem) em vez de
// silenciar - caller usa try/catch com timeout para feedback ao usuario.
//
// Comportamento por ambiente:
//   - mobile real: grava .md no Vault. Erros propagam para caller via
//     throw; caller exibe toast.
//   - web: no-op (retorna ok=false). Gauntlet usa mock vault futuro.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { frasePath } from '@/lib/vault/paths';
import { vaultUriJoin } from '@/lib/vault';
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

// Tenta resolver colisao de slug no mesmo dia: se markdown/frase-...md
// ja existe, sufixa -2, -3, ... ate achar um nome livre. Retorna o
// path relativo livre. Limita a 99 tentativas para evitar loop em
// edge cases patologicos.
async function resolverColisao(
  vaultRoot: string,
  basePathRel: string
): Promise<string> {
  const baseDestino = vaultUriJoin(vaultRoot, basePathRel);
  let info = await FileSystem.getInfoAsync(baseDestino);
  if (!info.exists) {
    return basePathRel;
  }
  // Quebra o path em prefixo (sem .md) e extensao para inserir sufixo.
  const m = basePathRel.match(/^(.*)(\.md)$/);
  if (!m) {
    return basePathRel;
  }
  const prefix = m[1] as string;
  const ext = m[2] as string;
  for (let i = 2; i <= 99; i += 1) {
    const candidato = `${prefix}-${i}${ext}`;
    const destinoCand = vaultUriJoin(vaultRoot, candidato);
    info = await FileSystem.getInfoAsync(destinoCand);
    if (!info.exists) {
      return candidato;
    }
  }
  // Fallback: usa timestamp ms para sufixo (improvavel chegar aqui).
  return `${prefix}-${Date.now()}${ext}`;
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
    throw new Error('Vault não conectado.');
  }

  const agora = new Date();
  const slug = slugDeFrase(frase);
  const relBase = frasePath(agora, slug);
  const rel = await resolverColisao(vaultRoot, relBase);
  const destino = vaultUriJoin(vaultRoot, rel);
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
}
