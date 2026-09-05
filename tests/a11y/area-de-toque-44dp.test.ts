// AUDIT-P4-5: os controles pequenos precisam de 44x44dp de area de toque
// (WCAG 2.5.5), sem mudar um pixel do que e desenhado.
//
// POR QUE ISTO E JEST, E NAO E2E
//
// A primeira versao desta prova era um caso Playwright que baixava o
// source pelo dev server e casava regex sobre o texto. Frageis demais em
// tres frentes ao mesmo tempo: a janela de leitura era relativa a uma
// ancora (`accessibilityLabel`), mas `hitSlop` aparece ANTES dela e
// `height` DEPOIS, entao nenhuma janela unica pegava os dois; qualquer
// comentario inserido no meio deslocava tudo; e o runner e2e trata
// INCONCLUSIVO como warn-only, ou seja o caso passaria verde no CI sem
// ter medido nada -- a mesma falsa conformidade que esta sprint existe
// para corrigir, reintroduzida no artefato de prova.
//
// Lendo o arquivo do disco e recortando o bloco do proprio JSX, a prova
// vira deterministica: sem dev server, sem bundle, sem tempo.
//
// Comentarios sem acento (convencao dos testes de a11y).
import { readFileSync } from 'fs';
import { join } from 'path';

const RAIZ = join(__dirname, '../..');
const ALVO_DP = 44;

interface Alvo {
  path: string;
  ancora: string;
  // Lado visivel do controle, em dp, como esta no style.
  lado: number;
}

// Cada alvo e um controle pequeno que ja existia; a sprint so acrescentou
// hitSlop. O lado visivel continua o mesmo de antes.
const ALVOS: Alvo[] = [
  {
    path: 'src/components/todo/BarraBusca.tsx',
    ancora: 'accessibilityLabel="limpar busca"',
    lado: 22,
  },
  {
    path: 'src/components/midia/MidiaPicker.tsx',
    ancora: 'accessibilityLabel="remover midia"',
    lado: 22,
  },
  {
    path: 'src/components/eventos/FotosBlock.tsx',
    ancora: 'accessibilityLabel={`remover foto ${idx + 1}`}',
    lado: 22,
  },
];

type Slop = { top: number; right: number; bottom: number; left: number };

// Recorta do inicio da tag <Pressable ...> ate o fechamento do seu
// primeiro filho. Ancorar na abertura da tag, e nao no accessibilityLabel,
// e o que faz hitSlop e style caberem no mesmo recorte.
function blocoDoControle(fonte: string, ancora: string): string | null {
  const idxAncora = fonte.indexOf(ancora);
  if (idxAncora < 0) return null;
  const idxTag = fonte.lastIndexOf('<Pressable', idxAncora);
  if (idxTag < 0) return null;
  return fonte.slice(idxTag, idxAncora + 1200);
}

function lerSlop(bloco: string): Slop | null {
  const objeto = bloco.match(/hitSlop=\{\{([^}]*)\}\}/);
  if (objeto) {
    const lado = (nome: string): number => {
      const m = objeto[1].match(new RegExp(`${nome}:\\s*(\\d+)`));
      return m ? parseInt(m[1], 10) : 0;
    };
    return {
      top: lado('top'),
      right: lado('right'),
      bottom: lado('bottom'),
      left: lado('left'),
    };
  }
  const escalar = bloco.match(/hitSlop=\{(\d+)\}/);
  if (escalar) {
    const n = parseInt(escalar[1], 10);
    return { top: n, right: n, bottom: n, left: n };
  }
  return null;
}

describe('AUDIT-P4-5 — area de toque de 44dp nos controles pequenos', () => {
  it.each(ALVOS.map((a) => [a.path, a] as const))(
    '%s tem hitSlop que leva o alvo a 44dp nos dois eixos',
    (_path, alvo) => {
      const fonte = readFileSync(join(RAIZ, alvo.path), 'utf8');
      const bloco = blocoDoControle(fonte, alvo.ancora);
      expect(bloco).not.toBeNull();

      const slop = lerSlop(bloco as string);
      expect(slop).not.toBeNull();
      const s = slop as Slop;

      // O lado visivel nao pode ter mudado: a sprint promete "sem mexer
      // em um pixel renderizado".
      expect(bloco).toMatch(new RegExp(`width:\\s*${alvo.lado}\\b`));
      expect(bloco).toMatch(new RegExp(`height:\\s*${alvo.lado}\\b`));

      const larguraTocavel = s.left + alvo.lado + s.right;
      const alturaTocavel = s.top + alvo.lado + s.bottom;

      expect(larguraTocavel).toBeGreaterThanOrEqual(ALVO_DP);
      expect(alturaTocavel).toBeGreaterThanOrEqual(ALVO_DP);
    }
  );

  it('nenhum alvo perdeu o accessibilityLabel ao ganhar hitSlop', () => {
    for (const alvo of ALVOS) {
      const fonte = readFileSync(join(RAIZ, alvo.path), 'utf8');
      expect(fonte).toContain(alvo.ancora);
    }
  });
});
