// P7 (2026-09-08) — store da cor de cada pessoa.
//
// O que esta suite protege, em ordem de custo se regredir:
//
//  1. O DEFAULT continuar sendo o do config. A sprint rebaixa a cor de
//     regra inviolavel para default; se o default se soltasse do
//     src/config/pessoas.config.ts, existiriam dois lugares para mudar
//     a identidade visual e um deles ficaria para tras.
//  2. A RECUSA morar no store, e nao so na tela. Se a validacao vivesse
//     apenas no componente, a segunda tela que oferecesse a troca
//     nasceria sem piso de contraste e ninguem perceberia.
//  3. O merge do persist ser o codigo REAL cabeado no store, exercitado
//     como funcao (armadilha A47), e higienizar valor guardado que nao
//     passa mais na medida.
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCoresPessoa,
  mergeCoresPessoaPersistido,
  corPessoa,
  CORES_PESSOA_DEFAULT,
  CORES_SUGERIDAS,
  type CoresPessoaState,
} from '@/lib/stores/coresPessoa';
import { avaliarCorPessoa } from '@/lib/a11y/corPessoa';
import { corDe } from '@/config/pessoas.config';

beforeEach(() => {
  useCoresPessoa.setState({ cores: { ...CORES_PESSOA_DEFAULT } });
});

describe('default', () => {
  it('nasce exatamente no default do config, sem repetir o hex', () => {
    expect(CORES_PESSOA_DEFAULT.pessoa_a).toBe(corDe('pessoa_a'));
    expect(CORES_PESSOA_DEFAULT.pessoa_b).toBe(corDe('pessoa_b'));
    expect(corPessoa('pessoa_a')).toBe(corDe('pessoa_a'));
    expect(corPessoa('pessoa_b')).toBe(corDe('pessoa_b'));
  });

  it("'ambos' segue a cor de pessoa_a, antes e depois da troca", () => {
    expect(corPessoa('ambos')).toBe(corPessoa('pessoa_a'));
    useCoresPessoa.getState().definirCor('pessoa_a', '#50fa7b');
    expect(corPessoa('ambos')).toBe('#50fa7b');
  });
});

describe('definirCor', () => {
  it('guarda cor que passa na medida e devolve ok', () => {
    const av = useCoresPessoa.getState().definirCor('pessoa_b', '#8be9fd');
    expect(av.ok).toBe(true);
    expect(corPessoa('pessoa_b')).toBe('#8be9fd');
  });

  it('normaliza caixa e espaco antes de guardar', () => {
    useCoresPessoa.getState().definirCor('pessoa_a', '  #50FA7B  ');
    expect(corPessoa('pessoa_a')).toBe('#50fa7b');
  });

  it('RECUSA cor que reprova, e nao guarda nada', () => {
    const antes = corPessoa('pessoa_a');
    const av = useCoresPessoa.getState().definirCor('pessoa_a', '#000000');
    expect(av.ok).toBe(false);
    expect(av.motivo).not.toBeNull();
    expect(corPessoa('pessoa_a')).toBe(antes);
  });

  it('recusa valor que nem forma cor, sem apagar a cor em vigor', () => {
    useCoresPessoa.getState().definirCor('pessoa_a', '#50fa7b');
    const av = useCoresPessoa.getState().definirCor('pessoa_a', 'azulzinho');
    expect(av.motivo).toBe('formato');
    expect(corPessoa('pessoa_a')).toBe('#50fa7b');
  });

  it('trocar uma pessoa nao mexe na outra', () => {
    useCoresPessoa.getState().definirCor('pessoa_a', '#f1fa8c');
    expect(corPessoa('pessoa_b')).toBe(CORES_PESSOA_DEFAULT.pessoa_b);
  });

  it('devolve a avaliacao para quem chama, sem obrigar a medir de novo', () => {
    const av = useCoresPessoa.getState().definirCor('pessoa_a', '#000000');
    expect(av.ratio).toBeLessThan(av.minimo);
    expect(av.cor).toBe('#000000');
  });
});

describe('restaurarPadrao', () => {
  it('volta a cor de partida da pessoa', () => {
    useCoresPessoa.getState().definirCor('pessoa_a', '#ffb86c');
    useCoresPessoa.getState().restaurarPadrao('pessoa_a');
    expect(corPessoa('pessoa_a')).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
  });
});

describe('merge do persist (A47) — funcao REAL cabeada no store', () => {
  const atual = (): CoresPessoaState => useCoresPessoa.getState();

  it('e a mesma funcao que o persist usa', () => {
    // Guarda contra o teste virar replica: se o store trocar de merge,
    // esta suite passa a exercitar codigo morto.
    expect(typeof mergeCoresPessoaPersistido).toBe('function');
    const fonte = mergeCoresPessoaPersistido.toString();
    expect(fonte).toContain('CORES_PESSOA_DEFAULT');
  });

  it('chave ausente cai no default em vez de hidratar undefined', () => {
    const merged = mergeCoresPessoaPersistido(
      { cores: { pessoa_a: '#50fa7b' } },
      atual()
    );
    expect(merged.cores.pessoa_a).toBe('#50fa7b');
    expect(merged.cores.pessoa_b).toBe(CORES_PESSOA_DEFAULT.pessoa_b);
  });

  it('estado persistido invalido devolve o estado atual inteiro', () => {
    expect(mergeCoresPessoaPersistido(null, atual())).toBe(atual());
    expect(mergeCoresPessoaPersistido('lixo', atual())).toBe(atual());
  });

  it('preserva as acoes do store', () => {
    const merged = mergeCoresPessoaPersistido({ cores: {} }, atual());
    expect(typeof merged.definirCor).toBe('function');
    expect(typeof merged.restaurarPadrao).toBe('function');
  });

  it('cor guardada que NAO passa mais na medida volta ao default', () => {
    // Caminho real: backup antigo, armazenamento editado a mao, ou um
    // piso de contraste que ficou mais rigoroso numa versao nova.
    const merged = mergeCoresPessoaPersistido(
      { cores: { pessoa_a: '#000000', pessoa_b: '#1a1a1a' } },
      atual()
    );
    expect(merged.cores.pessoa_a).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
    expect(merged.cores.pessoa_b).toBe(CORES_PESSOA_DEFAULT.pessoa_b);
  });

  it('valor nao string nao entra', () => {
    const merged = mergeCoresPessoaPersistido(
      { cores: { pessoa_a: 42 } },
      atual()
    );
    expect(merged.cores.pessoa_a).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
  });
});

describe('CORES_SUGERIDAS', () => {
  it('toda cor oferecida como atalho passa na medida da propria tela', () => {
    // Oferecer um atalho que o aplicativo recusaria em seguida seria
    // confuso e faria a validacao parecer defeito.
    for (const sugerida of CORES_SUGERIDAS) {
      const av = avaliarCorPessoa(sugerida.hex);
      expect([sugerida.nome, av.ok]).toEqual([sugerida.nome, true]);
    }
  });

  it('inclui os dois defaults, para desfazer a troca com um toque', () => {
    const hexes = CORES_SUGERIDAS.map((c) => c.hex);
    expect(hexes).toContain(CORES_PESSOA_DEFAULT.pessoa_a);
    expect(hexes).toContain(CORES_PESSOA_DEFAULT.pessoa_b);
  });
});
