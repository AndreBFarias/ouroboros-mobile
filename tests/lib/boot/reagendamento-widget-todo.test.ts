// AUDIT-P1-1A (2026-07-28): garante que o dreno da fila do widget
// Quick To-do esta REGISTRADO em BOOT_HOOKS e na posicao certa.
//
// Por que este teste existe: tests/lib/widget/sincronizarWidget.test.ts
// ja tinha 7 casos verdes exercitando drenarFilaTodoWidget e
// sincronizarCountPendentes — chamando-as diretamente. Eles provavam
// que as funcoes funcionam, nunca que alguem as chama. O wrapper
// sincronizarWidgetTodoBootHook existia com zero call sites no repo
// inteiro, enquanto seu proprio comentario afirmava estar plugado em
// BOOT_HOOKS. Resultado: entry enfileirada pelo widget morria no
// cacheDir (que o Android apaga sob pressao de armazenamento) sem
// erro, sem log e sem aviso. Este arquivo cobre exatamente essa
// lacuna: o REGISTRO, nao o comportamento das funcoes.
//
// HISTORICO DO HARNESS (AUDIT-P1-9, 2026-09-05): ate' esta data nao dava
// para provar o registro invocando reagendarTodosBootHooks() e espiando um
// mock do modulo. Os 16 wrappers usam `await import(...)` lazy (para evitar
// ciclo entre @/lib/boot/* e os modulos donos), babel-preset-expo
// preservava o import dinamico verbatim, e o VM CJS do Jest o rejeitava com
// "A dynamic import callback was invoked without --experimental-vm-modules".
// O try/catch do orquestrador engolia esse erro, entao TODO mock de modulo
// registrava zero chamadas e o teste passava verde tanto com o hook plugado
// quanto sem ele.
//
// AUDIT-P1-9 fechou o buraco habilitando babel-plugin-dynamic-import-node em
// env.test (babel.config.js), com canario em
// tests/lib/boot/dynamic-import-canario.test.ts. A prova de EXECUCAO das
// tres migrations de Vault vive agora em
// tests/lib/boot/reagendamento-migrations-vault.test.ts.
//
// Este arquivo continua provando o REGISTRO (nome, indice e ordem relativa),
// que e' o que ele sempre se propos a cobrir e segue valendo:
//   (1) o array BOOT_HOOKS contem o wrapper, por nome e em que indice;
//   (2) reagendarTodosBootHooks percorre o array em ordem, sequencialmente,
//       isolando erros -- provado com hooks sinteticos.
// Juntas: estar no indice 15 implica executar depois do indice 10
// (migrarLayoutVaultHook) e do 11 (migrarT2DeviceIdSuffixHook).
//
// A drenagem real ponta-a-ponta so e observavel em device Android
// (bridge nativa); e evidencia da AUDIT-P1-1B.
//
// Comentarios sem acentuacao (convencao shell/CI).
import { readFileSync } from 'fs';
import { join } from 'path';
import { BOOT_HOOKS, reagendarTodosBootHooks } from '@/lib/boot/reagendamento';

const nomes = () => BOOT_HOOKS.map((h) => h.name);

describe('BOOT_HOOKS: registro do dreno do widget de tarefas', () => {
  it('registra 16 hooks (15 pre-sprint + o dreno do widget de tarefas)', () => {
    expect(BOOT_HOOKS).toHaveLength(16);
  });

  it('inclui o wrapper do dreno exatamente uma vez', () => {
    const ocorrencias = nomes().filter(
      (n) => n === 'sincronizarWidgetTodoHook'
    );
    expect(ocorrencias).toHaveLength(1);
  });

  it('posiciona o dreno por ultimo na fila', () => {
    expect(BOOT_HOOKS[BOOT_HOOKS.length - 1].name).toBe(
      'sincronizarWidgetTodoHook'
    );
  });

  it('roda o dreno DEPOIS das migrations que definem o layout do Vault', () => {
    // drenarFilaTodoWidget grava via criarTarefa e
    // sincronizarCountPendentes conta via listarTarefas, que varre
    // MARKDOWN_FOLDER. Antes destas duas migrations, a tarefa nasceria
    // no meio de uma reorganizacao de layout e o count sairia de uma
    // varredura de pasta que ainda vai mudar.
    const lista = nomes();
    const iDreno = lista.indexOf('sincronizarWidgetTodoHook');
    const iLayout = lista.indexOf('migrarLayoutVaultHook');
    const iDeviceId = lista.indexOf('migrarT2DeviceIdSuffixHook');
    expect(iLayout).toBeGreaterThanOrEqual(0);
    expect(iDeviceId).toBeGreaterThanOrEqual(0);
    expect(iDreno).toBeGreaterThan(iLayout);
    expect(iDreno).toBeGreaterThan(iDeviceId);
  });

  it('o wrapper registrado aponta para sincronizarWidgetTodoBootHook', () => {
    // Complemento do assert por nome: amarra o wrapper ao modulo que
    // ele deve importar. Feito sobre o fonte porque o dynamic import
    // nao executa em Jest (vide cabecalho); sem isto, renomear o alvo
    // do import passaria despercebido.
    const fonte = readFileSync(
      join(__dirname, '../../../src/lib/boot/reagendamento.ts'),
      'utf8'
    );
    // lastIndexOf: o cabecalho do arquivo tambem cita "BOOT_HOOKS.push"
    // em prosa; a chamada real e a ultima ocorrencia.
    const bloco = fonte.slice(
      fonte.indexOf('const sincronizarWidgetTodoHook'),
      fonte.lastIndexOf('BOOT_HOOKS.push(')
    );
    expect(bloco.length).toBeGreaterThan(0);
    expect(bloco).toContain("await import('@/lib/widget/sincronizarWidget')");
    expect(bloco).toContain('await sincronizarWidgetTodoBootHook()');
  });
});

describe('reagendarTodosBootHooks: contrato de execucao da fila', () => {
  // Metade (2) da prova: o orquestrador percorre BOOT_HOOKS em ordem,
  // sequencialmente, isolando erro de hook individual. Hooks sinteticos
  // (sem dynamic import) para rodar de verdade no harness. Restaurados
  // no afterEach porque BOOT_HOOKS e array mutavel exportado.
  const original = [...BOOT_HOOKS];

  afterEach(() => {
    BOOT_HOOKS.length = 0;
    BOOT_HOOKS.push(...original);
  });

  it('executa os hooks na ordem do array, um apos o outro', async () => {
    const ordem: string[] = [];
    BOOT_HOOKS.length = 0;
    BOOT_HOOKS.push(
      async () => {
        await Promise.resolve();
        ordem.push('primeiro');
      },
      async () => {
        ordem.push('segundo');
      },
      async () => {
        ordem.push('ultimo');
      }
    );
    await reagendarTodosBootHooks();
    expect(ordem).toEqual(['primeiro', 'segundo', 'ultimo']);
  });

  it('hook que lanca nao impede os seguintes nem propaga o erro', async () => {
    const ordem: string[] = [];
    BOOT_HOOKS.length = 0;
    BOOT_HOOKS.push(
      async () => {
        ordem.push('antes');
      },
      async () => {
        throw new Error('bridge nativa indisponivel');
      },
      async () => {
        ordem.push('depois');
      }
    );
    await expect(reagendarTodosBootHooks()).resolves.toBeUndefined();
    expect(ordem).toEqual(['antes', 'depois']);
  });
});
