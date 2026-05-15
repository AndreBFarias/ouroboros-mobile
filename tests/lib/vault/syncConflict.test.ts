// Cobertura do helper canonico de deteccao de copias de conflito
// Syncthing (B6 da sprint AUDIT-T1-BUGS). Casos exercitados:
//  - basename limpo
//  - basename com marcador de conflito
//  - URI cheia (file:// + encode) com marcador de conflito
//  - URI cheia legitima (sem conflito)
//  - tolerancia a decode falhando (string com %xx invalido)
//  - case-insensitivity
//
// Comentarios sem acento (convencao shell/CI).
import { ehSyncConflict, SYNC_CONFLICT_REGEX } from '@/lib/vault/syncConflict';

describe('ehSyncConflict', () => {
  it('retorna false para basename limpo', () => {
    expect(ehSyncConflict('humor-2026-05-06.md')).toBe(false);
    expect(ehSyncConflict('alarme-medicacao.md')).toBe(false);
    expect(ehSyncConflict('_devices.md')).toBe(false);
  });

  it('retorna true para basename com marcador Syncthing', () => {
    expect(
      ehSyncConflict('humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md')
    ).toBe(true);
    expect(
      ehSyncConflict(
        'alarme-medicacao.sync-conflict-20260506-093412-OURO1.md'
      )
    ).toBe(true);
    expect(
      ehSyncConflict('_devices.sync-conflict-20260506-093412-OURO1.md')
    ).toBe(true);
  });

  it('retorna true para URI completa com marcador (encoded)', () => {
    const uri =
      'file:///vault/markdown/humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md';
    expect(ehSyncConflict(uri)).toBe(true);
    const encoded =
      'file:///vault/markdown/' +
      encodeURIComponent(
        'humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md'
      );
    expect(ehSyncConflict(encoded)).toBe(true);
  });

  it('retorna false para URI completa sem marcador', () => {
    expect(ehSyncConflict('file:///vault/markdown/humor-2026-05-06.md')).toBe(
      false
    );
    expect(
      ehSyncConflict(
        'content://com.android.externalstorage/document/primary%3AVault%2Fmarkdown%2Fhumor-2026-05-06.md'
      )
    ).toBe(false);
  });

  it('tolera decode falhando (sequencia %xx invalida)', () => {
    // String com % isolado nao gera throw porque a funcao captura.
    // Resultado: usa string crua e ainda detecta presenca do marker.
    expect(
      ehSyncConflict('%E0%foo.sync-conflict-20260506-093412-OURO1.md')
    ).toBe(true);
    expect(ehSyncConflict('%E0%foo.md')).toBe(false);
  });

  it('regex e case-insensitive', () => {
    expect(SYNC_CONFLICT_REGEX.test('.SYNC-CONFLICT-20260506')).toBe(true);
    expect(SYNC_CONFLICT_REGEX.test('.Sync-Conflict-20260506')).toBe(true);
  });
});
