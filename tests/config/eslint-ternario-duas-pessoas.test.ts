// P6 (2026-09-08): trava a regra de lint que congela o ternario de duas
// pessoas como padrao proibido em codigo novo.
//
// A decisao do dono foi congelar, nao refatorar: os pontos que ja existem
// ficam como estao, e a regra existe para impedir que entrem novos. Uma
// regra assim so' vale se alguem provar que ela de fato dispara -- seletor
// AST errado nao quebra nada, so' passa a nunca acusar, e o congelamento
// vira decoracao.
//
// O teste fecha o circuito no consumidor real: carrega o eslint.config.js
// REAL e entrega os trechos ao Linter do proprio ESLint, o mesmo motor que
// o smoke roda em `npx eslint app/ src/`. Nao ha regex sobre o texto do
// arquivo de config -- isso passaria com um seletor que nao casa nada.
//
// Comentarios sem acentuacao, como o resto dos testes de config.
import { Linter } from 'eslint';
import * as path from 'path';

const CONFIG_REAL = require(
  path.resolve(__dirname, '..', '..', 'eslint.config.js')
) as Linter.Config[];

const REGRA = 'no-restricted-syntax';

// Caminho virtual: nao precisa existir no disco, mas precisa casar o
// `files: ['**/*.ts']` do bloco real da config.
const ARQUIVO = 'src/fixture-lint-p6.ts';

function avisosDaRegra(codigo: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  return linter
    .verify(codigo, CONFIG_REAL, ARQUIVO)
    .filter((m) => m.ruleId === REGRA);
}

describe('P6: ternario de duas pessoas congelado no lint', () => {
  it('sinaliza a derivacao da outra pessoa', () => {
    const avisos = avisosDaRegra(
      `const pessoaAtiva: string = 'pessoa_a';\n` +
        `export const parceiro = pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';\n`
    );

    expect(avisos).toHaveLength(1);
    expect(avisos[0].line).toBe(2);
  });

  it('sinaliza tambem a coercao que colapsa o universo em duas', () => {
    // Variante com o teste invertido e com `!==`: o seletor nao olha o
    // teste, entao trocar a forma da condicao nao e' rota de fuga.
    const avisos = avisosDaRegra(
      `export function comoAutor(s: string) {\n` +
        `  return s !== 'pessoa_b' ? 'pessoa_a' : 'pessoa_b';\n` +
        `}\n`
    );

    expect(avisos).toHaveLength(1);
  });

  it('nao sinaliza codigo que resolve a pessoa sem ternario binario', () => {
    const avisos = avisosDaRegra(
      `declare function outraPessoa(p: string): string;\n` +
        `declare const pessoas: string[];\n` +
        `const pessoaAtiva: string = 'pessoa_a';\n` +
        `export const parceiro = outraPessoa(pessoaAtiva);\n` +
        `export const primeira = pessoas.length > 0 ? pessoas[0] : pessoaAtiva;\n` +
        `export const rotulo = pessoaAtiva === 'pessoa_a' ? 'Primeira' : 'Segunda';\n`
    );

    expect(avisos).toEqual([]);
  });

  it('entra como aviso e aponta para a decisao P6', () => {
    // A severidade e' parte da decisao, nao detalhe: como erro, os pontos
    // que ja existem abortariam o smoke no ato. Promover exige limpa-los
    // antes, e este teste e' o lembrete.
    const [aviso] = avisosDaRegra(
      `export const p = ('x' as string) === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';\n`
    );

    expect(aviso.severity).toBe(1);
    expect(aviso.message).toContain('P6');
  });
});
