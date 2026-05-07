import {
  vaultUriJoin,
  formatDateYmd,
  formatDateYmdHm,
  formatDateYmdHms,
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
  inboxFinanceiroPath,
  fileMatchesDate,
  tarefasPath,
  medidasFotoPath,
  mediaScannerPath,
  VAULT_FOLDERS,
} from '@/lib/vault/paths';

describe('vaultUriJoin', () => {
  it('concatena root + rel simples', () => {
    expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', 'humor.md'))
      .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
  });

  it('remove trailing whitespace do root', () => {
    expect(vaultUriJoin('content://...primary:Ouroboros ', 'tarefas/x.md'))
      .toBe('content://...primary:Ouroboros/tarefas/x.md');
  });

  it('remove trailing %20 do root', () => {
    expect(vaultUriJoin('content://...primary:Ouroboros%20', 'tarefas/x.md'))
      .toBe('content://...primary:Ouroboros/tarefas/x.md');
  });

  it('remove trailing slashes do root', () => {
    expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros/', 'humor.md'))
      .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
  });

  it('remove leading slashes do rel', () => {
    expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', '/humor.md'))
      .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
  });

  it('remove leading whitespace do rel', () => {
    expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', ' humor.md'))
      .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
  });

  it('lança erro com root vazio', () => {
    expect(() => vaultUriJoin('', 'humor.md')).toThrow('vault não inicializado');
  });

  it('lança erro com rel vazio', () => {
    expect(() => vaultUriJoin('file:///sdcard', '')).toThrow('rel vazio');
  });

  it('lança erro com root só whitespace', () => {
    expect(() => vaultUriJoin('   ', 'humor.md')).toThrow('vault não inicializado');
  });

  it('preserva subpaths complexos com slashes intermediários', () => {
    expect(vaultUriJoin('file:///vault', 'inbox/mente/diario/2026-05-06.md'))
      .toBe('file:///vault/inbox/mente/diario/2026-05-06.md');
  });
});

describe('formatDateYmd', () => {
  it('formata em UTC-3 a meia-noite local', () => {
    // 2026-04-29 03:00:00 UTC = 2026-04-29 00:00:00 em UTC-3
    const d = new Date('2026-04-29T03:00:00.000Z');
    expect(formatDateYmd(d)).toBe('2026-04-29');
  });

  it('considera virada de dia em UTC-3', () => {
    // 2026-04-29 02:30:00 UTC = 2026-04-28 23:30 em UTC-3
    const d = new Date('2026-04-29T02:30:00.000Z');
    expect(formatDateYmd(d)).toBe('2026-04-28');
  });

  it('preserva ordem lexicografica', () => {
    const a = formatDateYmd(new Date('2026-01-15T15:00:00.000Z'));
    const b = formatDateYmd(new Date('2026-12-15T15:00:00.000Z'));
    expect(a < b).toBe(true);
  });
});

describe('formatDateYmdHm', () => {
  it('formata data hora em UTC-3', () => {
    // 2026-04-29 17:30 UTC = 2026-04-29 14:30 em UTC-3
    const d = new Date('2026-04-29T17:30:00.000Z');
    expect(formatDateYmdHm(d)).toBe('2026-04-29-1430');
  });
});

describe('formatDateYmdHms', () => {
  it('formata YYYY-MM-DD-HHmmss em UTC-3', () => {
    // 2026-04-30 12:30:45 UTC = 09:30:45 em UTC-3
    const d = new Date('2026-04-30T12:30:45.000Z');
    expect(formatDateYmdHms(d)).toBe('2026-04-30-093045');
  });

  it('preserva ordem lexicografica entre segundos', () => {
    const a = formatDateYmdHms(new Date('2026-04-30T12:30:00.000Z'));
    const b = formatDateYmdHms(new Date('2026-04-30T12:30:45.000Z'));
    expect(a < b).toBe(true);
  });
});

describe('inboxFinanceiroPath', () => {
  it('gera inbox/financeiro/<sub>/<ts>.<ext>', () => {
    const d = new Date('2026-04-30T12:30:45.000Z');
    expect(inboxFinanceiroPath('pix', d, { ext: 'pdf' })).toBe(
      'inbox/financeiro/pix/2026-04-30-093045.pdf'
    );
  });

  it('inclui slug quando passado', () => {
    const d = new Date('2026-04-30T12:30:45.000Z');
    expect(
      inboxFinanceiroPath('extrato', d, { ext: 'pdf', slug: 'banco' })
    ).toBe('inbox/financeiro/extrato/2026-04-30-093045-banco.pdf');
  });

  it('aceita ext vazia (sem ponto)', () => {
    const d = new Date('2026-04-30T12:30:45.000Z');
    expect(inboxFinanceiroPath('nota', d, { ext: '' })).toBe(
      'inbox/financeiro/nota/2026-04-30-093045'
    );
  });
});

describe('dailyPath', () => {
  it('gera daily/YYYY-MM-DD.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(dailyPath(d)).toBe('daily/2026-04-29.md');
  });
});

describe('eventosPath', () => {
  it('gera eventos/YYYY-MM-DD-slug.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(eventosPath(d, 'cafe')).toBe('eventos/2026-04-29-cafe.md');
  });
});

describe('diarioEmocionalPath', () => {
  it('gera inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md', () => {
    const d = new Date('2026-04-29T17:30:00.000Z');
    expect(diarioEmocionalPath(d, 'conflito')).toBe(
      'inbox/mente/diario/2026-04-29-1430-conflito.md'
    );
  });
});

describe('assetsPath', () => {
  it('gera assets/<filename>', () => {
    expect(assetsPath('foto.jpg')).toBe('assets/foto.jpg');
  });
});

describe('fileMatchesDate', () => {
  it('aceita arquivos com prefixo igual a data', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(fileMatchesDate('2026-04-29-cafe.md', d)).toBe(true);
    expect(fileMatchesDate('2026-04-29.md', d)).toBe(true);
  });

  it('rejeita outras datas', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(fileMatchesDate('2026-04-28.md', d)).toBe(false);
  });
});

describe('tarefasPath', () => {
  it('gera tarefas/YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(tarefasPath(d, 'comprar-pao-7k2x')).toBe(
      'tarefas/2026-04-29-comprar-pao-7k2x.md'
    );
  });

  it('respeita virada de dia em UTC-3', () => {
    // 02:30 UTC = 23:30 do dia anterior em UTC-3.
    const d = new Date('2026-04-29T02:30:00.000Z');
    expect(tarefasPath(d, 's')).toBe('tarefas/2026-04-28-s.md');
  });
});

describe('medidasFotoPath (M-VAULT-MD-FIX-medidas-fotos)', () => {
  it('gera media/fotos/medidas-YYYY-MM-DD-<lado>.jpg para os 3 lados', () => {
    const d = new Date('2026-05-04T15:00:00.000Z');
    expect(medidasFotoPath(d, 'frente')).toBe(
      'media/fotos/medidas-2026-05-04-frente.jpg'
    );
    expect(medidasFotoPath(d, 'costas')).toBe(
      'media/fotos/medidas-2026-05-04-costas.jpg'
    );
    expect(medidasFotoPath(d, 'lado')).toBe(
      'media/fotos/medidas-2026-05-04-lado.jpg'
    );
  });

  it('respeita virada de dia em UTC-3', () => {
    // 02:30 UTC = 23:30 do dia anterior em UTC-3.
    const d = new Date('2026-04-29T02:30:00.000Z');
    expect(medidasFotoPath(d, 'frente')).toBe(
      'media/fotos/medidas-2026-04-28-frente.jpg'
    );
  });

  it('NAO usa o legado assets/m-* (path migrado)', () => {
    const d = new Date('2026-05-04T15:00:00.000Z');
    const path = medidasFotoPath(d, 'frente');
    expect(path.startsWith('assets/')).toBe(false);
    expect(path.startsWith('media/fotos/')).toBe(true);
  });
});

describe('mediaScannerPath (M-VAULT-MD-FIX-scanner)', () => {
  it('overload legado de 1 arg mantem media/scanner/<slug>.jpg', () => {
    expect(mediaScannerPath('nota-mercado')).toBe(
      'media/scanner/nota-mercado.jpg'
    );
  });

  it('overload com (basename, ext) gera media/scanner/<basename>.<ext>', () => {
    expect(mediaScannerPath('2026-05-04-1230-nota-multipagina', 'pdf')).toBe(
      'media/scanner/2026-05-04-1230-nota-multipagina.pdf'
    );
    expect(mediaScannerPath('2026-05-04-1230-nota', 'md')).toBe(
      'media/scanner/2026-05-04-1230-nota.md'
    );
  });

  it('binario e companion compartilham basename', () => {
    const base = '2026-05-04-1230-nota';
    const bin = mediaScannerPath(base, 'jpg');
    const md = mediaScannerPath(base, 'md');
    const baseBin = bin.replace(/\.jpg$/, '');
    const baseMd = md.replace(/\.md$/, '');
    expect(baseBin).toBe(baseMd);
  });
});

describe('VAULT_FOLDERS', () => {
  it('expoe pastas canonicas mobile', () => {
    expect(VAULT_FOLDERS.daily).toBe('daily');
    expect(VAULT_FOLDERS.eventos).toBe('eventos');
    expect(VAULT_FOLDERS.inboxMenteDiario).toBe('inbox/mente/diario');
    expect(VAULT_FOLDERS.assets).toBe('assets');
    expect(VAULT_FOLDERS.tarefas).toBe('tarefas');
  });

  it('expoe as 7 entradas inbox adicionadas pela M08', () => {
    expect(VAULT_FOLDERS.inboxFinanceiroExtrato).toBe(
      'inbox/financeiro/extrato'
    );
    expect(VAULT_FOLDERS.inboxFinanceiroNota).toBe('inbox/financeiro/nota');
    expect(VAULT_FOLDERS.inboxSaudeExame).toBe('inbox/saude/exame');
    expect(VAULT_FOLDERS.inboxSaudeReceita).toBe('inbox/saude/receita');
    expect(VAULT_FOLDERS.inboxCasaGarantia).toBe('inbox/casa/garantia');
    expect(VAULT_FOLDERS.inboxCasaContrato).toBe('inbox/casa/contrato');
    expect(VAULT_FOLDERS.inboxOutros).toBe('inbox/outros');
  });
});
