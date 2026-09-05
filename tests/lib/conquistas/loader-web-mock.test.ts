// AUDIT-P2-12: reproduz o Recap cego no Gauntlet.
//
// Medido em 2026-09-05: com o Gauntlet web semeado por
// `seedComDados('eventos-7')`, os sete eventos ficam gravados no path
// canonico do vault mock e passam no EventoSchema -- e mesmo assim os
// dois modos do Recap renderizam empty state.
//
// O caminho web/dev de `reader.ts` so e exercido quando
// `Platform.OS === 'web'`, e o preset de teste do React Native reporta
// 'ios'. Por isso a suite inteira do projeto passava sem nunca tocar
// esse ramo: o defeito mora exatamente no galho que os testes nao
// visitam. Aqui forcamos 'web' para reproduzir.
//
// Comentarios sem acento (convencao shell/CI).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'web' },
}));

import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { lerConquistas } from '@/lib/conquistas/loader';

const RAIZ = 'web://mock-vault/Ouroboros';

function eventoMarkdown(dia: string, slug: string): string {
  return [
    '---',
    '_schema_version: 1',
    'tipo: evento',
    `data: ${dia}T12:00:00-03:00`,
    'autor: pessoa_a',
    'modo: positivo',
    'lugar: casa',
    'categoria: rolezinho',
    'com:',
    '  - pessoa_a',
    'intensidade: 3',
    'fotos: []',
    'midia:',
    '  - tipo: foto',
    `    path: media/fotos/${slug}.jpg`,
    'para:',
    '  tipo: mim',
    '---',
    '',
    `Registro de ${slug}.`,
    '',
  ].join('\n');
}

beforeEach(() => {
  useVaultMock.getState().limpar();
});

describe('lerConquistas no vault mock web', () => {
  it('enxerga os eventos que o seed do Gauntlet grava', async () => {
    // Paths identicos aos que `seedEventos` produz -- copiados do
    // `listarVaultMock()` do aparelho de teste, nao inventados.
    const dias = [
      ['2026-08-29', 'casa-6'],
      ['2026-08-30', 'parque-5'],
      ['2026-08-31', 'praca-4'],
    ];
    for (const [dia, slug] of dias) {
      useVaultMock
        .getState()
        .setArquivo(
          `${RAIZ}/markdown/evento-${dia}-${slug}.md`,
          eventoMarkdown(dia, slug)
        );
    }

    const r = await lerConquistas(RAIZ);
    expect(r.conquistas).toHaveLength(3);
    expect(r.totaisPorOrigem.evento_positivo).toBe(3);
  });
});
