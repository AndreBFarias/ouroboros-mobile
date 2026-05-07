// M34: serializador do .md companion preliminar para itens de
// captura unificada (foto, audio, video, frase). Formato estavel
// adotado nesta sprint; M39 ratifica via ADR-0017 estendendo
// campos opcionais (transcricao, duracao, tags).
//
// Decisao: stringificacao manual em vez de stringifyFrontmatter do
// modulo vault. O companion aqui e leve, sem schema zod (M39
// formaliza), e gravamos linha-a-linha para garantir ordem
// deterministica nos testes e legibilidade direta no Obsidian.
//
// Comentarios sem acento (convencao shell/CI).
import type { Para } from '@/lib/schemas/para';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// midia_pdf adicionado em M-VAULT-MD-FIX-scanner: nota fiscal multi
// page consolidada via expo-print salva binario em media/scanner/
// junto com companion .md de mesmo basename. Tratamento generico
// segue o caminho dos demais tipos (frontmatter sem body extra).
export type TipoMidia =
  | 'midia_foto'
  | 'midia_audio'
  | 'midia_video'
  | 'midia_frase'
  | 'midia_pdf';

export interface CompanionMidiaInput {
  tipo: TipoMidia;
  arquivo: string;
  // ISO 8601 da captura. Caller normalmente passa new Date().toISOString().
  data: string;
  autor: PessoaAutor;
  para: Para;
  // Texto opcional digitado pelo usuario. Em frase tambem entra como
  // body apos o frontmatter; caller controla.
  legenda?: string;
  // Sprint M-VAULT-MD-FIX-medidas-fotos (2026-05-04): referencia
  // opcional ao registro-mae (ex: 'YYYY-MM-DD' para medidas/<data>.md
  // ou slug para eventos/<...>.md). Quando presente vai para o
  // frontmatter como `medida_ref: <ref>`. Consumido pela
  // SecaoEvolucaoCorporal (M11.4) e por hooks de agregacao que
  // precisam reverse-link da media para a entrada-mae sem reparsear
  // todo o Vault.
  medida_ref?: string;
  // I-AUDIO (M-SAVE-AUDIO-VALIDA, 2026-05-07): texto transcrito do
  // audio (STT on-device via expo-speech-recognition). Best-effort:
  // quando ausente/undefined, companion omite o campo (semantica
  // canonica null no schema zod). Quando presente, vai como
  // `transcricao: "<texto>"` no frontmatter + body com o texto
  // integral apos os ---. Espelha midia_frase no comportamento de
  // body. Schema canonico ja tem o campo (MidiaCompanionSchema
  // §65 - transcricao opcional).
  transcricao?: string;
}

// Serializa o destinatario em string canonica para frontmatter:
//  - { tipo:'mim' }     -> "mim"
//  - { tipo:'casal' }   -> "casal"
//  - { tipo:'outra', pessoa:'pessoa_a' } -> "outra:pessoa_a"
function serializarPara(p: Para): string {
  if (p.tipo === 'mim') return 'mim';
  if (p.tipo === 'casal') return 'casal';
  return `outra:${p.pessoa}`;
}

// Serializa o companion como bloco YAML simples + body opcional. O
// body, por enquanto, repete a legenda quando presente para que o
// Obsidian renderize um trecho legivel ao abrir o .md (M39 expande).
export function stringifyCompanionMidia(
  input: CompanionMidiaInput
): string {
  const linhas: string[] = ['---'];
  linhas.push(`tipo: ${input.tipo}`);
  linhas.push(`arquivo: ${input.arquivo}`);
  linhas.push(`data: ${input.data}`);
  linhas.push(`autor: ${input.autor}`);
  linhas.push(`para: ${serializarPara(input.para)}`);
  if (typeof input.legenda === 'string' && input.legenda.length > 0) {
    // Legenda em uma unica linha, escapando aspas duplas para nao
    // quebrar o YAML quando o usuario digitar texto livre.
    const escapada = input.legenda.replace(/"/g, '\\"');
    linhas.push(`legenda: "${escapada}"`);
  }
  if (
    typeof input.medida_ref === 'string' &&
    input.medida_ref.length > 0
  ) {
    // Referencia ao registro-mae. Sem aspas: slug ASCII / data sem
    // espacos, seguro como YAML scalar simples.
    linhas.push(`medida_ref: ${input.medida_ref}`);
  }
  if (
    typeof input.transcricao === 'string' &&
    input.transcricao.length > 0
  ) {
    // I-AUDIO: transcricao em uma unica linha YAML (escapando aspas
    // como na legenda). Quando STT falhou ou foi pulado, o caller
    // passa undefined e o campo simplesmente nao aparece no .md —
    // semantica canonica null para quem le via MidiaCompanionSchema.
    const escapada = input.transcricao.replace(/"/g, '\\"');
    linhas.push(`transcricao: "${escapada}"`);
  }
  linhas.push('---');
  // Body: para midia_frase, repete o texto integral apos o
  // frontmatter para legibilidade direta no Obsidian. Para os demais
  // tipos, body fica vazio (so frontmatter).
  // I-AUDIO (2026-05-07): midia_audio com transcricao tambem replica
  // o texto no body. Permite leitura direta no Obsidian sem clicar no
  // .m4a. Quando transcricao ausente, body fica vazio (so frontmatter).
  if (input.tipo === 'midia_frase' && typeof input.legenda === 'string') {
    linhas.push('');
    linhas.push(input.legenda);
  } else if (
    input.tipo === 'midia_audio' &&
    typeof input.transcricao === 'string' &&
    input.transcricao.length > 0
  ) {
    linhas.push('');
    linhas.push(input.transcricao);
  }
  // Termina com newline final para consistencia POSIX.
  linhas.push('');
  return linhas.join('\n');
}

// Slug curto a partir das primeiras palavras de uma frase. ASCII
// kebab-case, max 32 chars. Fallback 'frase' quando vazio. Usado pelo
// salvarFrase para montar media/frases/<data>-<slug>.md.
export function slugDeFrase(frase: string): string {
  // Remove diacriticos (combining marks U+0300 a U+036F) apos NFD;
  // fonte unica de verdade para slug ASCII em todo midia/.
  const limpo = frase
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32)
    .replace(/-+$/, '');
  return limpo.length > 0 ? limpo : 'frase';
}
