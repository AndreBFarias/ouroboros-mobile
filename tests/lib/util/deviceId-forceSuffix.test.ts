// Testes da funcao forceDeviceIdSuffix (T2-LOCK-VAULT, 2026-05-15).
//
// Diferenca para applyDeviceIdSuffix (M38):
//  - applyDeviceIdSuffix: sempre concatena, sem checagem (helper puro
//    do M38, mantido como deprecated em deviceId.ts).
//  - forceDeviceIdSuffix: idempotente quando ja tem suffix do MESMO
//    deviceId; lanca erro quando tem suffix de OUTRO deviceId.
//
// Comentarios sem acento (convencao shell/CI).
import { forceDeviceIdSuffix } from '@/lib/util/deviceId';

describe('forceDeviceIdSuffix T2-LOCK-VAULT', () => {
  it('aplica suffix antes da extensao .md em path sem suffix', () => {
    expect(
      forceDeviceIdSuffix('markdown/humor-2026-05-15.md', 'ouro-a4b2cd')
    ).toBe('markdown/humor-2026-05-15-ouro-a4b2cd.md');
  });

  it('aplica suffix em path com slug intermediario', () => {
    expect(
      forceDeviceIdSuffix(
        'markdown/diario-2026-05-15-0930-raiva.md',
        'ouro-xyz999'
      )
    ).toBe('markdown/diario-2026-05-15-0930-raiva-ouro-xyz999.md');
  });

  it('idempotente: retorna inalterado quando ja tem suffix do MESMO device', () => {
    const rel = 'markdown/humor-2026-05-15-ouro-a4b2cd.md';
    expect(forceDeviceIdSuffix(rel, 'ouro-a4b2cd')).toBe(rel);
  });

  it('idempotente: nao duplica suffix em chamadas repetidas', () => {
    const inicial = 'markdown/humor-2026-05-15.md';
    const deviceId = 'ouro-a4b2cd';
    const primeiro = forceDeviceIdSuffix(inicial, deviceId);
    const segundo = forceDeviceIdSuffix(primeiro, deviceId);
    const terceiro = forceDeviceIdSuffix(segundo, deviceId);
    expect(primeiro).toBe('markdown/humor-2026-05-15-ouro-a4b2cd.md');
    expect(segundo).toBe(primeiro);
    expect(terceiro).toBe(primeiro);
  });

  it('lanca erro quando rel ja tem suffix de OUTRO device', () => {
    expect(() =>
      forceDeviceIdSuffix(
        'markdown/humor-2026-05-15-ouro-xxxxxx.md',
        'ouro-a4b2cd'
      )
    ).toThrow(/cross-device nao permitido/);
  });

  it('lanca erro com contexto util na mensagem (rel + ambos deviceIds)', () => {
    try {
      forceDeviceIdSuffix(
        'markdown/humor-2026-05-15-ouro-aaaaaa.md',
        'ouro-bbbbbb'
      );
      fail('Deveria ter lancado erro');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/humor-2026-05-15-ouro-aaaaaa\.md/);
      expect(msg).toMatch(/ouro-aaaaaa/);
      expect(msg).toMatch(/ouro-bbbbbb/);
    }
  });

  it('append no final quando nao ha extensao', () => {
    expect(forceDeviceIdSuffix('markdown/notas-2026-05-15', 'ouro-abc123')).toBe(
      'markdown/notas-2026-05-15-ouro-abc123'
    );
  });

  it('preserva extensoes nao .md ao aplicar suffix (caso edge)', () => {
    // forceDeviceIdSuffix nao impoe .md; e' helper puro.
    expect(forceDeviceIdSuffix('jpg/foto-2026-05-15.jpg', 'ouro-z12345')).toBe(
      'jpg/foto-2026-05-15-ouro-z12345.jpg'
    );
  });

  it('path multi-segmento profundo recebe suffix corretamente', () => {
    expect(
      forceDeviceIdSuffix(
        'pasta-a/pasta-b/markdown/evento-2026-05-15-festa.md',
        'ouro-deep01'
      )
    ).toBe('pasta-a/pasta-b/markdown/evento-2026-05-15-festa-ouro-deep01.md');
  });

  it('detecta suffix mesmo em path sem extensao', () => {
    // Nesse edge case, regex casa pelo final da string (sem extensao).
    const rel = 'markdown/algo-ouro-abc123';
    expect(forceDeviceIdSuffix(rel, 'ouro-abc123')).toBe(rel);
  });

  it('regex do suffix detecta exatamente 6 chars alfanumericos', () => {
    // 5 chars: nao casa como suffix; entra como caminho feliz.
    expect(
      forceDeviceIdSuffix('markdown/humor-2026-05-15-ouro-12345.md', 'ouro-abc123')
    ).toBe('markdown/humor-2026-05-15-ouro-12345-ouro-abc123.md');
  });

  it('regex do suffix nao casa quando prefixo nao e ouro-', () => {
    // "device-XXXXXX" nao casa o regex M38 (que e' '-ouro-' + 6 chars).
    // Entao aplica suffix normal.
    expect(
      forceDeviceIdSuffix(
        'markdown/humor-2026-05-15-device-abc123.md',
        'ouro-xyz789'
      )
    ).toBe('markdown/humor-2026-05-15-device-abc123-ouro-xyz789.md');
  });
});
