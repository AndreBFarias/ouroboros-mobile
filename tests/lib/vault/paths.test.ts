import {
  formatDateYmd,
  formatDateYmdHm,
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
  fileMatchesDate,
  VAULT_FOLDERS,
} from '@/lib/vault/paths';

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

describe('VAULT_FOLDERS', () => {
  it('expoe pastas canonicas mobile', () => {
    expect(VAULT_FOLDERS.daily).toBe('daily');
    expect(VAULT_FOLDERS.eventos).toBe('eventos');
    expect(VAULT_FOLDERS.inboxMenteDiario).toBe('inbox/mente/diario');
    expect(VAULT_FOLDERS.assets).toBe('assets');
  });
});
