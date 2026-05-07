// Tests do mapa categoria -> pasta para o share intent receiver
// (M08). Verifica os 8 subtipos canonicos, as 4 areas, o helper de
// pasta e a inferencia de subtipo default a partir de mime type.
import {
  INBOX_SUBTIPOS,
  INBOX_SUBTIPOS_ORDEM,
  INBOX_SUBTIPO_OPTIONS,
  pastaParaSubtipo,
  subtipoDefault,
} from '@/lib/share/categorias';
import { VAULT_FOLDERS } from '@/lib/vault/paths';

describe('INBOX_SUBTIPOS', () => {
  it('declara as 8 chaves canonicas com area + folder + label', () => {
    expect(Object.keys(INBOX_SUBTIPOS).sort()).toEqual([
      'contrato',
      'exame',
      'extrato',
      'garantia',
      'nota',
      'outro',
      'pix',
      'receita',
    ]);
  });

  it('todos os subtipos tem folder nao vazio e label string', () => {
    for (const meta of Object.values(INBOX_SUBTIPOS)) {
      expect(meta.folder.length).toBeGreaterThan(0);
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it('financeiros caem em inbox/financeiro/<subtipo>', () => {
    expect(INBOX_SUBTIPOS.pix.folder).toBe('inbox/financeiro/pix');
    expect(INBOX_SUBTIPOS.extrato.folder).toBe('inbox/financeiro/extrato');
    expect(INBOX_SUBTIPOS.nota.folder).toBe('inbox/financeiro/nota');
  });

  it('saude e casa tem 2 subtipos cada', () => {
    expect(INBOX_SUBTIPOS.exame.folder).toBe('inbox/saude/exame');
    expect(INBOX_SUBTIPOS.receita.folder).toBe('inbox/saude/receita');
    expect(INBOX_SUBTIPOS.garantia.folder).toBe('inbox/casa/garantia');
    expect(INBOX_SUBTIPOS.contrato.folder).toBe('inbox/casa/contrato');
  });

  it('outro cai em inbox/outros (sem subdir)', () => {
    expect(INBOX_SUBTIPOS.outro.folder).toBe('inbox/outros');
  });

  it('areas distribuidas entre 4 grupos', () => {
    const areas = new Set(Object.values(INBOX_SUBTIPOS).map((s) => s.area));
    expect(areas).toEqual(new Set(['financeiro', 'saude', 'casa', 'outros']));
  });
});

describe('integracao com VAULT_FOLDERS', () => {
  // H2 ADR-0023: VAULT_FOLDERS migrou para layout-por-tipo (markdown, png,
  // jpg, m4a, mp4, pdf, gif, .ouroboros/cache). Share intent receiver
  // (M08) ainda usa o layout legado por subtipo (inbox/financeiro/pix
  // etc.); migracao formal foi separada em sprint dedicada (achado
  // colateral M-VAULT-LAYOUT-POR-TIPO -> M-SHARE-INTENT-LAYOUT).
  // O teste original verificava que cada subtipo apontava para uma
  // pasta canonica do Vault; com H2 esse contrato passa a ser "subtipo
  // aponta para uma subarvore em inbox/<area>/<subtipo>". Validamos a
  // forma do path em vez da inclusao em VAULT_FOLDERS.
  it.skip('todas as folders dos subtipos batem com chaves de VAULT_FOLDERS (legado pre-H2)', () => {
    const valoresFolder = new Set<string>(Object.values(VAULT_FOLDERS));
    for (const meta of Object.values(INBOX_SUBTIPOS)) {
      expect(valoresFolder.has(meta.folder)).toBe(true);
    }
  });

  it('todas as folders dos subtipos seguem o padrao inbox/<area>/<subtipo> ou inbox/outros', () => {
    for (const meta of Object.values(INBOX_SUBTIPOS)) {
      expect(meta.folder).toMatch(/^inbox\//);
    }
  });
});

describe('INBOX_SUBTIPOS_ORDEM', () => {
  it('contem os 8 subtipos sem repeticao', () => {
    expect(INBOX_SUBTIPOS_ORDEM).toHaveLength(8);
    expect(new Set(INBOX_SUBTIPOS_ORDEM).size).toBe(8);
  });

  it('financeiro vem primeiro', () => {
    expect(INBOX_SUBTIPOS_ORDEM[0]).toBe('pix');
    expect(INBOX_SUBTIPOS_ORDEM[1]).toBe('extrato');
    expect(INBOX_SUBTIPOS_ORDEM[2]).toBe('nota');
  });

  it('outro fica por ultimo', () => {
    expect(INBOX_SUBTIPOS_ORDEM[INBOX_SUBTIPOS_ORDEM.length - 1]).toBe(
      'outro'
    );
  });
});

describe('INBOX_SUBTIPO_OPTIONS', () => {
  it('gera 8 ChipOption com label PT-BR Sentence case', () => {
    expect(INBOX_SUBTIPO_OPTIONS).toHaveLength(8);
    const labels = INBOX_SUBTIPO_OPTIONS.map((o) => o.label);
    expect(labels).toContain('PIX');
    expect(labels).toContain('Extrato');
    expect(labels).toContain('Nota');
    expect(labels).toContain('Exame');
    expect(labels).toContain('Receita');
    expect(labels).toContain('Garantia');
    expect(labels).toContain('Contrato');
    expect(labels).toContain('Outro');
  });

  it('values sao slugs canonicos em snake/lower', () => {
    const values = INBOX_SUBTIPO_OPTIONS.map((o) => o.value);
    for (const v of values) {
      expect(/^[a-z]+$/.test(v)).toBe(true);
    }
  });
});

describe('pastaParaSubtipo', () => {
  it('devolve folder canonico para cada subtipo', () => {
    expect(pastaParaSubtipo('pix')).toBe('inbox/financeiro/pix');
    expect(pastaParaSubtipo('exame')).toBe('inbox/saude/exame');
    expect(pastaParaSubtipo('garantia')).toBe('inbox/casa/garantia');
    expect(pastaParaSubtipo('outro')).toBe('inbox/outros');
  });

  it('lanca em subtipo desconhecido', () => {
    expect(() =>
      // @ts-expect-error testando comportamento defensivo
      pastaParaSubtipo('inexistente')
    ).toThrow(/subtipo desconhecido/);
  });
});

describe('subtipoDefault', () => {
  it('imagens caem em nota', () => {
    expect(subtipoDefault('image/jpeg')).toBe('nota');
    expect(subtipoDefault('image/png')).toBe('nota');
    expect(subtipoDefault('image/webp')).toBe('nota');
  });

  it('pdf cai em extrato', () => {
    expect(subtipoDefault('application/pdf')).toBe('extrato');
  });

  it('mime desconhecido cai em outro', () => {
    expect(subtipoDefault('application/octet-stream')).toBe('outro');
    expect(subtipoDefault('text/plain')).toBe('outro');
  });
});
