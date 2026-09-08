// Testes do boot hook EXE-1 migrarTreinosParaPathComHora, que renomeia
// sessoes de treino do formato legado 'treinos/YYYY-MM-DD-<slug>.md'
// para o formato com hora 'treinos/YYYY-MM-DD-HHmm-<slug>.md'.
//
// O vault e' um Map em memoria de MARKDOWN SERIALIZADO, nao de objetos:
// o mock de writeVaultFile chama o `stringifyFrontmatter` real e o de
// readVaultFile chama o `parseFrontmatter` real, no mesmo molde de
// tests/lib/exercicios/registrarHistoricoDaSessao.test.ts. Guardar
// { meta, body } direto num Map curto-circuitaria justamente o trecho
// que decide se o rename preserva o arquivo: teste que mocka o
// serializador nao prova nada sobre serializacao (commit 60ebfdb).
//
// O que passar por YAML de verdade tornou visivel, e por isso tem caso
// dedicado aqui: este rename NAO e' byte a byte. `readVaultFile`
// parseia com TreinoSessaoSchema, que e' z.object puro, e o Zod 4 poda
// chave desconhecida (src/lib/vault/frontmatter.ts:21); a migracao
// regrava esse meta ja podado. E `stringifyFrontmatter` aplica
// body.trim() (frontmatter.ts:106), entao linha em branco no fim do
// corpo tambem nao volta. Os dois ultimos casos deste describe medem
// exatamente essa perda, para que ela pare de ser invisivel.
//
// A contagem de sessoes e' medida pelo listarTreinos REAL contra o
// mesmo Map. E' o unico jeito de a invariante que importa -- "a
// contagem antes e depois e' identica" -- significar alguma coisa: se a
// migracao apagar sem escrever, ou escrever duas vezes, o numero muda
// aqui.
//
// Mocka:
//  - @/lib/vault/reader: listVaultFolder + readVaultFile (a leitura em
//    lote de leituraLote.ts reusa readVaultFile).
//  - @/lib/vault/writer e @/lib/vault/remover: escrita e exclusao.
//  - useSessao.flags / useVault.vaultRoot: stores reais (zustand
//    in-memory), resetados entre testes.
//
// Comentarios sem acento (convencao shell/CI).
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';

const mockListVaultFolder = jest.fn();
const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockDeleteVaultFile = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('@/lib/vault/remover', () => ({
  __esModule: true,
  deleteVaultFile: (...args: unknown[]) => mockDeleteVaultFile(...args),
  moverArquivoParaLixeira: jest.fn(),
}));

import { migrarTreinosParaPathComHora } from '@/lib/boot/migrarTreinosParaPathComHora';
import { BOOT_HOOKS } from '@/lib/boot/reagendamento';
import { listarTreinos } from '@/lib/vault/treinos';
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';

// Helpers REAIS de frontmatter: e' o caminho que writer.ts e reader.ts
// usam em producao, e o que os mocks abaixo emprestam.
const frontmatter = jest.requireActual(
  '@/lib/vault/frontmatter'
) as typeof import('@/lib/vault/frontmatter');

const VAULT_ROOT = 'content://test/vault';
const TREINOS = `${VAULT_ROOT}/treinos`;

const sessaoBase: TreinoSessao = {
  tipo: 'treino_sessao',
  data: '2026-04-23T07:12:00-03:00',
  autor: 'pessoa_a',
  rotina: 'Rotina A',
  duracao_min: 30,
  exercicios: [{ nome: 'supino', series: 3, reps: 8 }],
};

// Vault em memoria: uri -> conteudo .md serializado.
let disco: Map<string, string>;

function serializar(meta: unknown, body: string): string {
  return frontmatter.stringifyFrontmatter(meta, body);
}

// Semeia um arquivo a partir de um meta tipado.
function por(nome: string, meta: Partial<TreinoSessao>, body = ''): void {
  disco.set(`${TREINOS}/${nome}`, serializar({ ...sessaoBase, ...meta }, body));
}

// Semeia markdown cru, para o caso em que o arquivo do disco tem algo
// que o schema nao produz (chave escrita a mao, corpo nao normalizado).
function porCru(nome: string, raw: string): void {
  disco.set(`${TREINOS}/${nome}`, raw);
}

// Le do disco pelo mesmo parser de producao.
function ler(nome: string): { meta: TreinoSessao; body: string } | null {
  const raw = disco.get(`${TREINOS}/${nome}`);
  if (raw === undefined) return null;
  return frontmatter.parseFrontmatter(raw, TreinoSessaoSchema);
}

beforeEach(() => {
  jest.clearAllMocks();
  disco = new Map();

  mockListVaultFolder.mockImplementation(async (folderUri: string) =>
    [...disco.keys()].filter((u) => u.startsWith(`${folderUri}/`))
  );
  mockReadVaultFile.mockImplementation(async (uri: string, schema: unknown) => {
    const raw = disco.get(uri);
    if (raw === undefined) return null;
    return frontmatter.parseFrontmatter(raw, schema as never);
  });
  mockWriteVaultFile.mockImplementation(
    async (uri: string, meta: unknown, body: string) => {
      disco.set(uri, serializar(meta, body ?? ''));
    }
  );
  mockDeleteVaultFile.mockImplementation(async (uri: string) => {
    disco.delete(uri);
  });

  useSessao.getState().resetar();
  useVault.setState({ vaultRoot: VAULT_ROOT });
});

describe('migrarTreinosParaPathComHora', () => {
  it('AC-6: migra 3 legados, deixa o formato novo em paz e nao muda a contagem', async () => {
    por('2026-04-23-rotina-a.md', { data: '2026-04-23T07:12:00-03:00' });
    por('2026-04-22-rotina-b.md', { data: '2026-04-22T19:40:00-03:00' });
    por('2026-04-21-treino.md', {
      data: '2026-04-21T08:00:00-03:00',
      rotina: undefined,
    });
    por('2026-04-20-0930-rotina-a.md', { data: '2026-04-20T09:30:00-03:00' });

    const antes = await listarTreinos(VAULT_ROOT);
    expect(antes).toHaveLength(4);

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 3, colisoes: 0, ignorados: 0 });

    const depois = await listarTreinos(VAULT_ROOT);
    expect(depois).toHaveLength(antes.length);

    const nomes = [...disco.keys()].map((u) => u.split('/').pop()).sort();
    expect(nomes).toEqual([
      '2026-04-20-0930-rotina-a.md',
      '2026-04-21-0800-treino.md',
      '2026-04-22-1940-rotina-b.md',
      '2026-04-23-0712-rotina-a.md',
    ]);
  });

  it('preserva o corpo do arquivo no rename', async () => {
    por('2026-04-23-rotina-a.md', {}, 'sessao pesada, ombro doeu.\n');

    await migrarTreinosParaPathComHora();

    expect(ler('2026-04-23-0712-rotina-a.md')?.body).toBe(
      'sessao pesada, ombro doeu.\n'
    );
  });

  it('deriva o slug do NOME do arquivo, nao de meta.rotina', async () => {
    // Usuario renomeou a rotina no Obsidian; o nome do arquivo e' o que
    // ele escolheu manter.
    por('2026-04-23-nome-escolhido-a-mao.md', { rotina: 'Outra coisa' });

    await migrarTreinosParaPathComHora();

    expect(
      disco.has(`${TREINOS}/2026-04-23-0712-nome-escolhido-a-mao.md`)
    ).toBe(true);
  });

  it('segunda execucao e no-op por flag', async () => {
    por('2026-04-23-rotina-a.md', {});

    const primeira = await migrarTreinosParaPathComHora();
    expect(primeira.migrados).toBe(1);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(true);

    mockWriteVaultFile.mockClear();
    mockDeleteVaultFile.mockClear();

    const segunda = await migrarTreinosParaPathComHora();
    expect(segunda).toEqual({ migrados: 0, colisoes: 0, ignorados: 0 });
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(mockDeleteVaultFile).not.toHaveBeenCalled();
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(1);
  });

  it('colisao ganha sufixo -2 e nao apaga nem sobrescreve nada', async () => {
    // O destino do legado ja existe (o usuario gravou a sessao de novo
    // depois do update, ou o Syncthing trouxe do outro device).
    por('2026-04-23-rotina-a.md', {
      data: '2026-04-23T07:12:00-03:00',
      duracao_min: 30,
    });
    por('2026-04-23-0712-rotina-a.md', {
      data: '2026-04-23T07:12:00-03:00',
      duracao_min: 55,
    });

    const antes = await listarTreinos(VAULT_ROOT);
    expect(antes).toHaveLength(2);

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 1, colisoes: 1, ignorados: 0 });
    // O ocupante original continua intacto, com a duracao dele.
    expect(ler('2026-04-23-0712-rotina-a.md')?.meta.duracao_min).toBe(55);
    // O legado virou o -2, com a duracao dele.
    expect(ler('2026-04-23-0712-rotina-a-2.md')?.meta.duracao_min).toBe(30);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(antes.length);
  });

  it('falha de escrita nao apaga a origem, conta ignorado e segura a flag', async () => {
    por('2026-04-23-rotina-a.md', {});
    mockWriteVaultFile.mockRejectedValueOnce(new Error('EACCES'));

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 1 });
    expect(mockDeleteVaultFile).not.toHaveBeenCalled();
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(true);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(false);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(1);
  });

  it('falha ao apagar a origem desfaz o destino e mantem a contagem', async () => {
    por('2026-04-23-rotina-a.md', {});
    // O delete da ORIGEM falha; o rollback (delete do destino) roda.
    mockDeleteVaultFile.mockRejectedValueOnce(new Error('EACCES'));

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 1 });
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(true);
    expect(disco.has(`${TREINOS}/2026-04-23-0712-rotina-a.md`)).toBe(false);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(1);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(false);
  });

  it('arquivo ilegivel conta ignorado e fica onde esta', async () => {
    por('2026-04-23-rotina-a.md', {});
    mockReadVaultFile.mockResolvedValueOnce(null);

    const out = await migrarTreinosParaPathComHora();

    expect(out.ignorados).toBe(1);
    expect(out.migrados).toBe(0);
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(true);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(false);
  });

  it('ignora sync-conflict e draft, sem contar como falha', async () => {
    por('2026-04-23-rotina-a.sync-conflict-20260423-070000-ABCDEF.md', {});
    disco.set(
      `${TREINOS}/draft/2026-04-23-livre.md`,
      serializar(sessaoBase, '')
    );

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 0 });
    expect(
      disco.has(
        `${TREINOS}/2026-04-23-rotina-a.sync-conflict-20260423-070000-ABCDEF.md`
      )
    ).toBe(true);
    expect(disco.has(`${TREINOS}/draft/2026-04-23-livre.md`)).toBe(true);
  });

  it('nome fora do padrao de sessao fica onde esta, sem virar falha', async () => {
    por('anotacoes.md', {});

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 0 });
    expect(disco.has(`${TREINOS}/anotacoes.md`)).toBe(true);
    // Sem ignorados, a flag sobe: nao ha o que tentar de novo.
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(true);
  });

  it('sem vaultRoot no store, no-op sem tocar I/O', async () => {
    useVault.setState({ vaultRoot: null });

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 0 });
    expect(mockListVaultFolder).not.toHaveBeenCalled();
  });

  // Ressalvas do painel adversarial de 2026-09-08. Os tres primeiros
  // falham contra o codigo anterior a elas: o sufixo de colisao nao
  // tinha teto, e o rollback do destino rodava sem reconferir a origem.

  it('A1: teto de sufixo -- 9 destinos ocupados nao geram copia nova', async () => {
    // Cenario que so' se materializa quando o delete da origem falha E o
    // rollback do destino falha junto, boot apos boot: a pasta ja tem o
    // destino base e os sufixos -2 ate' -9. Sem teto, este boot
    // escreveria o -10 e o proximo o -11, sem fim.
    por('2026-04-23-rotina-a.md', {});
    por('2026-04-23-0712-rotina-a.md', {});
    for (let n = 2; n <= 9; n += 1) {
      por(`2026-04-23-0712-rotina-a-${n}.md`, {});
    }

    const antes = await listarTreinos(VAULT_ROOT);
    expect(antes).toHaveLength(10);

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 1 });
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
    expect(mockDeleteVaultFile).not.toHaveBeenCalled();
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(true);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(antes.length);
    // Trabalho pendente segura a flag: o boot seguinte reavalia.
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(false);
  });

  it('A1: delete que lanca DEPOIS de apagar a origem nao destroi o destino', async () => {
    // A origem some por sync concorrente entre a listagem e o delete: a
    // chamada sai por erro, mas o arquivo ja nao esta la'. Rollback cego
    // apagaria o destino recem escrito e a sessao sumiria das duas
    // pontas -- que e' a perda que a trava 5 impede.
    por('2026-04-23-rotina-a.md', {}, 'corpo que nao pode sumir.');
    mockDeleteVaultFile.mockImplementationOnce(async (uri: string) => {
      disco.delete(uri);
      throw new Error('ENOENT');
    });

    const antes = await listarTreinos(VAULT_ROOT);
    expect(antes).toHaveLength(1);

    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 1, colisoes: 0, ignorados: 0 });
    expect(ler('2026-04-23-0712-rotina-a.md')?.body).toBe(
      'corpo que nao pode sumir.\n'
    );
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(false);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(antes.length);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(true);
  });

  it('A1: reconferencia inconclusiva no erro do delete nao apaga nada', async () => {
    por('2026-04-23-rotina-a.md', {});

    const antes = await listarTreinos(VAULT_ROOT);
    expect(antes).toHaveLength(1);

    mockDeleteVaultFile.mockRejectedValueOnce(new Error('EACCES'));
    // Primeira listagem normal; a relistagem de reconferencia volta
    // vazia, que e' o que listVaultFolder devolve em qualquer erro de
    // I/O. Nao da' para afirmar sucesso nem para autorizar descarte.
    //
    // Contador em vez de mockImplementationOnce de proposito: fila de
    // `Once` nao consumida sobrevive ao jest.clearAllMocks do beforeEach
    // (mockClear nao limpa implementacao) e vazaria para o teste
    // seguinte. O mockImplementation daqui e' substituido no proximo
    // beforeEach.
    let listagens = 0;
    mockListVaultFolder.mockImplementation(async (folderUri: string) => {
      listagens += 1;
      if (listagens >= 2) return [];
      return [...disco.keys()].filter((u) => u.startsWith(`${folderUri}/`));
    });

    const out = await migrarTreinosParaPathComHora();

    // Duas listagens: a da pasta e a reconferencia no catch do delete.
    expect(listagens).toBe(2);
    expect(out).toEqual({ migrados: 0, colisoes: 0, ignorados: 1 });
    // Uma chamada so': a da origem. O rollback do destino nao rodou.
    expect(mockDeleteVaultFile).toHaveBeenCalledTimes(1);
    expect(disco.has(`${TREINOS}/2026-04-23-rotina-a.md`)).toBe(true);
    expect(disco.has(`${TREINOS}/2026-04-23-0712-rotina-a.md`)).toBe(true);
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(false);
  });

  it('A8: colisao nao segura a flag, e a copia com sufixo e permanente', async () => {
    // Decisao explicita, nao descuido: colisao NAO e' falha. A origem
    // legada ja foi renomeada nesta mesma passada, entao o boot seguinte
    // nao teria o que refazer. O custo da decisao fica travado aqui.
    por('2026-04-23-rotina-a.md', { duracao_min: 30 });
    por('2026-04-23-0712-rotina-a.md', { duracao_min: 55 });

    const antes = await listarTreinos(VAULT_ROOT);
    const out = await migrarTreinosParaPathComHora();

    expect(out).toEqual({ migrados: 1, colisoes: 1, ignorados: 0 });
    expect(useSessao.getState().flags.treinosPathHoraMigrado).toBe(true);
    expect(disco.has(`${TREINOS}/2026-04-23-0712-rotina-a-2.md`)).toBe(true);
    expect(await listarTreinos(VAULT_ROOT)).toHaveLength(antes.length);

    // Segundo boot: a flag ja subiu, nada roda -- e a copia -2 continua
    // onde esta, para o usuario resolver pela aba Treinos.
    const segunda = await migrarTreinosParaPathComHora();
    expect(segunda).toEqual({ migrados: 0, colisoes: 0, ignorados: 0 });
    expect(disco.has(`${TREINOS}/2026-04-23-0712-rotina-a-2.md`)).toBe(true);
  });

  // Os dois casos abaixo medem o custo do rename ser um round-trip
  // (ler -> parsear -> regravar) em vez de uma copia de bytes. Nenhum
  // dos dois e' comportamento desejado: sao o estado atual, medido pelo
  // caminho real, para que a decisao de mudar ou nao seja tomada com o
  // numero na mao. O conserto, se vier, e' na migracao -- reemitir o
  // frontmatter original em vez do meta parseado -- e nao aqui.
  it('perde chave de frontmatter que o schema nao conhece', async () => {
    // Frontmatter com duas chaves escritas a mao no Obsidian, fora do
    // TreinoSessaoSchema (z.object puro, treino_sessao.ts:45). Zod 4
    // poda o desconhecido no safeParse e a migracao regrava so' o que
    // sobrou -- num hook de boot, que roda sem o usuario pedir.
    porCru(
      '2026-04-23-rotina-a.md',
      [
        '---',
        'tipo: treino_sessao',
        'data: 2026-04-23T07:12:00-03:00',
        'autor: pessoa_a',
        'rotina: Rotina A',
        'duracao_min: 30',
        'exercicios:',
        '  - nome: supino',
        '    series: 3',
        '    reps: 8',
        'tags:',
        '  - ombro',
        'avaliacao_pessoal: pesado',
        '---',
        '',
        'sessao pesada.',
        '',
      ].join('\n')
    );

    const out = await migrarTreinosParaPathComHora();
    expect(out).toEqual({ migrados: 1, colisoes: 0, ignorados: 0 });

    const destino = disco.get(`${TREINOS}/2026-04-23-0712-rotina-a.md`);
    // O que o schema conhece atravessa inteiro, corpo incluso.
    expect(destino).toContain('rotina: Rotina A');
    expect(ler('2026-04-23-0712-rotina-a.md')?.meta.duracao_min).toBe(30);
    expect(ler('2026-04-23-0712-rotina-a.md')?.body).toBe('sessao pesada.\n');
    // O que ele nao conhece some do disco do usuario, sem aviso.
    expect(destino).not.toContain('tags:');
    expect(destino).not.toContain('ombro');
    expect(destino).not.toContain('avaliacao_pessoal');
  });

  it('nao e byte a byte: o corpo perde a linha em branco do fim', async () => {
    // Mesmo sem chave estranha nenhuma, o arquivo que sai nao e'
    // identico ao que entrou: stringifyFrontmatter aplica body.trim()
    // (frontmatter.ts:106).
    const origemRaw = `${serializar(sessaoBase, 'linha um.\n\nlinha dois.')}\n\n`;
    porCru('2026-04-23-rotina-a.md', origemRaw);
    expect(origemRaw.endsWith('linha dois.\n\n\n')).toBe(true);

    const out = await migrarTreinosParaPathComHora();
    expect(out).toEqual({ migrados: 1, colisoes: 0, ignorados: 0 });

    const destino = disco.get(`${TREINOS}/2026-04-23-0712-rotina-a.md`);
    expect(destino).not.toBe(origemRaw);
    // A diferenca e' exatamente essa, e nada mais: as duas quebras de
    // linha do fim viraram uma.
    expect(destino).toBe(origemRaw.replace(/\n+$/, '\n'));
  });
});

// Registro na fila de boot. A licao da AUDIT-P1-1A: funcao correta que
// ninguem chama e' indistinguivel de funcao ausente -- o wrapper do
// dreno do widget viveu meses com zero call sites enquanto o comentario
// dele afirmava estar plugado.
describe('BOOT_HOOKS: registro do rename de path de treino', () => {
  const nomes = (): string[] => BOOT_HOOKS.map((h) => h.name);

  it('inclui o wrapper exatamente uma vez', () => {
    expect(nomes().filter((n) => n === 'migrarTreinosPathHoraHook')).toEqual([
      'migrarTreinosPathHoraHook',
    ]);
  });

  it('roda depois da migracao de drafts e antes dos marcos automaticos', () => {
    // Depois de migrarDraftsHook porque ele ainda cria sessao a partir
    // de draft; antes de marcosAutoHook porque o marco de "tres treinos
    // na semana" conta sessoes e precisa contar o estado ja
    // consolidado num formato so'.
    const lista = nomes();
    const iRename = lista.indexOf('migrarTreinosPathHoraHook');
    const iDrafts = lista.indexOf('migrarDraftsHook');
    const iMarcos = lista.indexOf('marcosAutoHook');
    expect(iDrafts).toBeGreaterThanOrEqual(0);
    expect(iMarcos).toBeGreaterThanOrEqual(0);
    expect(iRename).toBeGreaterThan(iDrafts);
    expect(iRename).toBeLessThan(iMarcos);
  });
});
