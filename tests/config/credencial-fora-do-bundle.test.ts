// P4 (2026-09-08) — duas garantias estruturais que nenhum teste de
// comportamento pega, porque as duas falham em SILENCIO.
//
// GARANTIA 1: nenhum modulo de src/ ou app/ resolve env.json.
//
// Enquanto o import era estatico, quem clonava o repositorio sem
// env.json nao passava do Metro: "Unable to resolve module
// ../../../env.json", uma mensagem que fala de arquivo ausente e nao de
// OAuth. As armadilhas A39 (CI reprova, smoke local passa) e A43 (suite
// falha so dentro de copia de trabalho, por causa do symlink) tinham a
// mesma origem. O jest.config.js mapeia env.json para um fixture, entao
// nenhuma suite de comportamento consegue notar a volta do import: o
// teste precisa ser sobre o TEXTO dos arquivos.
//
// GARANTIA 2: o aviso de credencial nao vaza para tela de nucleo.
//
// Vault, humor, diario, tarefas, contadores, marcos, treinos, Recap,
// midia, leitura de texto em imagem, Conexao Saude, compartilhamento e
// backup em ZIP funcionam sem credencial nenhuma. Um aviso de
// credencial numa dessas telas seria mentira, e do tipo que assusta:
// sugeriria que a pessoa precisa de um cadastro para usar o que ja e'
// dela.
//
// Comentarios sem acento (convencao shell/CI).
import * as fs from 'fs';
import * as path from 'path';
import { useCredenciais } from '@/lib/stores/credenciais';
import { pickClientIdSafe as pickClientIdSafeGoogle } from '@/lib/services/googleAuthFlow';
import { pickClientIdSafe as pickClientIdSafeSpotify } from '@/lib/integracoes/spotify/oauth';

const RAIZ = path.resolve(__dirname, '..', '..');

function listarArquivos(dir: string, exts: string[]): string[] {
  const saida: string[] = [];
  const pilha = [dir];
  while (pilha.length > 0) {
    const atual = pilha.pop() as string;
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules') continue;
        pilha.push(completo);
        continue;
      }
      if (exts.some((e) => entrada.name.endsWith(e))) saida.push(completo);
    }
  }
  return saida;
}

const ARQUIVOS_APP = listarArquivos(path.join(RAIZ, 'app'), ['.ts', '.tsx']);
const ARQUIVOS_SRC = listarArquivos(path.join(RAIZ, 'src'), ['.ts', '.tsx']);

describe('env.json nao e dependencia de build (P4)', () => {
  it('nenhum arquivo de src/ ou app/ importa env.json', () => {
    // Casa tanto `import x from '../../env.json'` quanto
    // `require('../env.json')`, com aspas simples ou duplas.
    const padrao = /(?:from|require\()\s*['"][^'"]*env\.json['"]/;
    const infratores = [...ARQUIVOS_APP, ...ARQUIVOS_SRC].filter((f) =>
      padrao.test(fs.readFileSync(f, 'utf8'))
    );
    expect(infratores.map((f) => path.relative(RAIZ, f))).toEqual([]);
  });

  it('os dois fluxos OAuth carregam e respondem sem credencial nenhuma', () => {
    // Contraparte de comportamento da garantia acima: importar os
    // modulos que liam env.json nao pode lancar em tempo de carga, e
    // com o store vazio o resultado precisa ser o ramo defensivo, nao
    // uma excecao. E' o que permite a tela renderizar em clone limpo.
    useCredenciais.setState({ google: null, spotify: null });

    const google = pickClientIdSafeGoogle();
    const spotify = pickClientIdSafeSpotify();

    expect('erro' in google).toBe(true);
    expect('erro' in spotify).toBe(true);
  });
});

describe('aviso de credencial nao vaza para o nucleo (P4)', () => {
  // As quatro unicas superficies onde falar de credencial e' honesto:
  // a tela de cadastro, a linha que leva ate ela no menu de
  // Configuracoes, o hub de integracoes e a Agenda, que e' a integracao
  // com convite proprio na navegacao.
  const PERMITIDOS = [
    path.join('app', 'settings', 'credenciais.tsx'),
    path.join('app', 'settings', 'index.tsx'),
    path.join('app', 'agenda.tsx'),
    path.join('src', 'components', 'screens', 'IntegracoesScreen.tsx'),
  ];

  const VOCABULARIO = [
    /credencial/i,
    /credenciais/i,
    /client[ _]id/i,
    /código próprio/i,
    /código seu/i,
  ];

  it('nenhuma outra tela menciona credencial', () => {
    const infratores: string[] = [];
    for (const arquivo of [...ARQUIVOS_APP, ...ARQUIVOS_SRC]) {
      const rel = path.relative(RAIZ, arquivo);
      if (PERMITIDOS.includes(rel)) continue;
      // Modulos de dominio (src/lib) tratam credencial por dever de
      // oficio; o que nao pode e' a palavra chegar a uma TELA.
      if (rel.startsWith(path.join('src', 'lib'))) continue;
      if (rel.startsWith(path.join('src', 'types'))) continue;
      const conteudo = fs.readFileSync(arquivo, 'utf8');
      if (VOCABULARIO.some((p) => p.test(conteudo))) infratores.push(rel);
    }
    expect(infratores).toEqual([]);
  });

  it('as telas de nucleo existem e seguem no lugar', () => {
    // Guarda contra o teste acima passar por vacuidade, se um refactor
    // mover as rotas de nucleo para fora de app/.
    const nucleo = [
      'app/index.tsx',
      'app/diario.tsx',
      'app/humor.tsx',
      'app/recap.tsx',
    ].filter((r) => fs.existsSync(path.join(RAIZ, r)));
    expect(nucleo.length).toBeGreaterThan(0);
    for (const rota of nucleo) {
      expect(ARQUIVOS_APP).toContain(path.join(RAIZ, rota));
    }
  });
});
