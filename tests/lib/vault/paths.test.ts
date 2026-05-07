// Sprint H2 (M-VAULT-LAYOUT-POR-TIPO, ADR-0023): tests dos novos
// helpers layout-por-tipo + tests preservados dos helpers legados.
import {
  vaultUriJoin,
  formatDateYmd,
  formatDateYmdHm,
  formatDateYmdHms,
  // helpers novos H2
  humorPath,
  diarioPath,
  eventoPath,
  marcoPath,
  medidasPath,
  medidasFotoPath,
  medidasFotoCompanionPath,
  exercicioPath,
  exercicioGifPath,
  cicloPath,
  alarmePath,
  tarefaPath,
  contadorPath,
  notaPath,
  notaArquivoPath,
  fotoPath,
  fotoCompanionPath,
  audioPath,
  audioCompanionPath,
  videoPath,
  videoCompanionPath,
  frasePath,
  scannerPath,
  scannerCompanionPath,
  avatarPath,
  agendaEventoPath,
  devicesIndexPath,
  // helpers legados (mantidos)
  dailyPath,
  eventosPath,
  diarioEmocionalPath,
  assetsPath,
  inboxFinanceiroPath,
  tarefasPath,
  mediaScannerPath,
  // utilitarios
  fileMatchesDate,
  matchesFeaturePrefix,
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
    expect(vaultUriJoin('file:///vault', 'markdown/diario-2026-05-06.md'))
      .toBe('file:///vault/markdown/diario-2026-05-06.md');
  });
});

describe('formatDateYmd', () => {
  it('formata em UTC-3 a meia-noite local', () => {
    const d = new Date('2026-04-29T03:00:00.000Z');
    expect(formatDateYmd(d)).toBe('2026-04-29');
  });

  it('considera virada de dia em UTC-3', () => {
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
    const d = new Date('2026-04-29T17:30:00.000Z');
    expect(formatDateYmdHm(d)).toBe('2026-04-29-1430');
  });
});

describe('formatDateYmdHms', () => {
  it('formata YYYY-MM-DD-HHmmss em UTC-3', () => {
    const d = new Date('2026-04-30T12:30:45.000Z');
    expect(formatDateYmdHms(d)).toBe('2026-04-30-093045');
  });

  it('preserva ordem lexicografica entre segundos', () => {
    const a = formatDateYmdHms(new Date('2026-04-30T12:30:00.000Z'));
    const b = formatDateYmdHms(new Date('2026-04-30T12:30:45.000Z'));
    expect(a < b).toBe(true);
  });
});

// =====================================================================
// Helpers H2 layout-por-tipo (ADR-0023)
// =====================================================================

describe('humorPath (H2)', () => {
  it('gera markdown/humor-YYYY-MM-DD.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(humorPath(d)).toBe('markdown/humor-2026-04-29.md');
  });
});

describe('diarioPath (H2)', () => {
  it('gera markdown/diario-YYYY-MM-DD-HHmm-<slug>.md', () => {
    const d = new Date('2026-04-29T17:30:00.000Z');
    expect(diarioPath(d, 'conflito')).toBe(
      'markdown/diario-2026-04-29-1430-conflito.md'
    );
  });
});

describe('eventoPath (H2)', () => {
  it('gera markdown/evento-YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(eventoPath(d, 'cafe')).toBe('markdown/evento-2026-04-29-cafe.md');
  });
});

describe('marcoPath (H2)', () => {
  it('gera markdown/marco-YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-23T15:00:00.000Z');
    expect(marcoPath(d, 'tres-treinos')).toBe(
      'markdown/marco-2026-04-23-tres-treinos.md'
    );
  });
});

describe('medidasPath (H2)', () => {
  it('gera markdown/medidas-YYYY-MM-DD.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(medidasPath(d)).toBe('markdown/medidas-2026-04-29.md');
  });
});

describe('medidasFotoPath (H2)', () => {
  it('gera jpg/medidas-YYYY-MM-DD-<lado>.jpg para os 3 lados', () => {
    const d = new Date('2026-05-04T15:00:00.000Z');
    expect(medidasFotoPath(d, 'frente')).toBe('jpg/medidas-2026-05-04-frente.jpg');
    expect(medidasFotoPath(d, 'costas')).toBe('jpg/medidas-2026-05-04-costas.jpg');
    expect(medidasFotoPath(d, 'lado')).toBe('jpg/medidas-2026-05-04-lado.jpg');
  });

  it('respeita virada de dia em UTC-3', () => {
    const d = new Date('2026-04-29T02:30:00.000Z');
    expect(medidasFotoPath(d, 'frente')).toBe('jpg/medidas-2026-04-28-frente.jpg');
  });
});

describe('medidasFotoCompanionPath (H2)', () => {
  it('gera markdown/medidas-foto-YYYY-MM-DD-<lado>.md', () => {
    const d = new Date('2026-05-04T15:00:00.000Z');
    expect(medidasFotoCompanionPath(d, 'frente')).toBe(
      'markdown/medidas-foto-2026-05-04-frente.md'
    );
  });
});

describe('exercicioPath (H2)', () => {
  it('gera markdown/exercicio-<slug>.md', () => {
    expect(exercicioPath('triceps-rosca')).toBe(
      'markdown/exercicio-triceps-rosca.md'
    );
  });
});

describe('exercicioGifPath (H2)', () => {
  it('gera gif/exercicio-<slug>.gif', () => {
    expect(exercicioGifPath('triceps-rosca')).toBe(
      'gif/exercicio-triceps-rosca.gif'
    );
  });
});

describe('cicloPath (H2)', () => {
  it('gera markdown/ciclo-YYYY-MM-DD.md', () => {
    const d = new Date('2026-05-04T15:00:00.000Z');
    expect(cicloPath(d)).toBe('markdown/ciclo-2026-05-04.md');
  });
});

describe('alarmePath (H2)', () => {
  it('gera markdown/alarme-<slug>.md', () => {
    expect(alarmePath('acordar')).toBe('markdown/alarme-acordar.md');
  });
});

describe('tarefaPath (H2)', () => {
  it('gera markdown/tarefa-<slug>.md sem data no path', () => {
    expect(tarefaPath('limpar-gatos')).toBe('markdown/tarefa-limpar-gatos.md');
  });
});

describe('contadorPath (H2)', () => {
  it('gera markdown/contador-<slug>.md', () => {
    expect(contadorPath('dias-sem-x')).toBe('markdown/contador-dias-sem-x.md');
  });
});

describe('notaPath e notaArquivoPath (H2)', () => {
  it('notaPath gera markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md', () => {
    const d = new Date('2026-05-06T17:30:45.000Z');
    expect(notaPath(d, 'mercado')).toBe(
      'markdown/nota-2026-05-06-143045-mercado.md'
    );
  });

  it('notaArquivoPath gera <ext>/nota-YYYY-MM-DD-HHmmss-<slug>.<ext>', () => {
    const d = new Date('2026-05-06T17:30:45.000Z');
    expect(notaArquivoPath(d, 'mercado', 'pdf')).toBe(
      'pdf/nota-2026-05-06-143045-mercado.pdf'
    );
    expect(notaArquivoPath(d, 'mercado', 'JPG')).toBe(
      'jpg/nota-2026-05-06-143045-mercado.jpg'
    );
  });
});

describe('fotoPath e fotoCompanionPath (H2)', () => {
  it('fotoPath gera <ext>/foto-YYYY-MM-DD-<rand>.<ext>', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(fotoPath(d, 'abcd', 'jpg')).toBe('jpg/foto-2026-05-06-abcd.jpg');
    expect(fotoPath(d, 'abcd', 'png')).toBe('png/foto-2026-05-06-abcd.png');
  });

  it('fotoCompanionPath gera markdown/foto-YYYY-MM-DD-<rand>.md', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(fotoCompanionPath(d, 'abcd')).toBe(
      'markdown/foto-2026-05-06-abcd.md'
    );
  });
});

describe('audioPath e audioCompanionPath (H2)', () => {
  it('audioPath gera m4a/audio-YYYY-MM-DD-<rand>.m4a', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(audioPath(d, 'xyz')).toBe('m4a/audio-2026-05-06-xyz.m4a');
  });

  it('audioCompanionPath gera markdown/audio-YYYY-MM-DD-<rand>.md', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(audioCompanionPath(d, 'xyz')).toBe(
      'markdown/audio-2026-05-06-xyz.md'
    );
  });
});

describe('videoPath e videoCompanionPath (H2)', () => {
  it('videoPath gera mp4/video-YYYY-MM-DD-<rand>.mp4', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(videoPath(d, 'qrs')).toBe('mp4/video-2026-05-06-qrs.mp4');
  });

  it('videoCompanionPath gera markdown/video-YYYY-MM-DD-<rand>.md', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(videoCompanionPath(d, 'qrs')).toBe(
      'markdown/video-2026-05-06-qrs.md'
    );
  });
});

describe('frasePath (H2)', () => {
  it('gera markdown/frase-YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-05-06T15:00:00.000Z');
    expect(frasePath(d, 'frase-do-dia')).toBe(
      'markdown/frase-2026-05-06-frase-do-dia.md'
    );
  });
});

describe('scannerPath e scannerCompanionPath (H2)', () => {
  it('scannerPath gera <ext>/scanner-<slug>.<ext>', () => {
    expect(scannerPath('recibo-2026-05-06', 'jpg')).toBe(
      'jpg/scanner-recibo-2026-05-06.jpg'
    );
    expect(scannerPath('recibo-2026-05-06', 'pdf')).toBe(
      'pdf/scanner-recibo-2026-05-06.pdf'
    );
  });

  it('scannerCompanionPath gera markdown/scanner-<slug>.md', () => {
    expect(scannerCompanionPath('recibo-2026-05-06')).toBe(
      'markdown/scanner-recibo-2026-05-06.md'
    );
  });
});

describe('avatarPath (H2)', () => {
  it('gera jpg/avatar-<pessoa>-<ts>.jpg', () => {
    expect(avatarPath('pessoa_a', 1715000000000)).toBe(
      'jpg/avatar-pessoa_a-1715000000000.jpg'
    );
  });
});

describe('agendaEventoPath (H2)', () => {
  it('gera markdown/agenda-<pessoa>-YYYY-MM-DD-<eventId>.md', () => {
    expect(
      agendaEventoPath('pessoa_a', '2026-05-07T10:00:00-03:00', 'evt123')
    ).toBe('markdown/agenda-pessoa_a-2026-05-07-evt123.md');
  });
});

describe('devicesIndexPath (H2)', () => {
  it('gera markdown/_devices.md', () => {
    expect(devicesIndexPath()).toBe('markdown/_devices.md');
  });
});

// =====================================================================
// Helpers legados (mantidos para compatibilidade fora do escopo H2)
// =====================================================================

describe('dailyPath (legado)', () => {
  it('gera daily/YYYY-MM-DD.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(dailyPath(d)).toBe('daily/2026-04-29.md');
  });
});

describe('eventosPath (legado)', () => {
  it('gera eventos/YYYY-MM-DD-slug.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(eventosPath(d, 'cafe')).toBe('eventos/2026-04-29-cafe.md');
  });
});

describe('diarioEmocionalPath (legado)', () => {
  it('gera inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md', () => {
    const d = new Date('2026-04-29T17:30:00.000Z');
    expect(diarioEmocionalPath(d, 'conflito')).toBe(
      'inbox/mente/diario/2026-04-29-1430-conflito.md'
    );
  });
});

describe('assetsPath (legado)', () => {
  it('gera assets/<filename>', () => {
    expect(assetsPath('foto.jpg')).toBe('assets/foto.jpg');
  });
});

describe('inboxFinanceiroPath (legado)', () => {
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

describe('tarefasPath (legado, com data no path)', () => {
  it('gera tarefas/YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(tarefasPath(d, 'comprar-pao-7k2x')).toBe(
      'tarefas/2026-04-29-comprar-pao-7k2x.md'
    );
  });
});

describe('mediaScannerPath (legado)', () => {
  it('overload legado de 1 arg mantem media/scanner/<slug>.jpg', () => {
    expect(mediaScannerPath('nota-mercado')).toBe(
      'media/scanner/nota-mercado.jpg'
    );
  });

  it('overload com (basename, ext) gera media/scanner/<basename>.<ext>', () => {
    expect(mediaScannerPath('2026-05-04-1230-nota-multipagina', 'pdf')).toBe(
      'media/scanner/2026-05-04-1230-nota-multipagina.pdf'
    );
  });
});

describe('fileMatchesDate', () => {
  it('aceita arquivos contendo a data (layout-por-tipo H2)', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    // H2: data aparece apos prefixo de feature.
    expect(fileMatchesDate('humor-2026-04-29.md', d)).toBe(true);
    expect(fileMatchesDate('evento-2026-04-29-cafe.md', d)).toBe(true);
    // Legado: data como prefixo.
    expect(fileMatchesDate('2026-04-29-cafe.md', d)).toBe(true);
  });

  it('rejeita outras datas', () => {
    const d = new Date('2026-04-29T15:00:00.000Z');
    expect(fileMatchesDate('humor-2026-04-28.md', d)).toBe(false);
  });
});

describe('matchesFeaturePrefix', () => {
  it('detecta prefixo no basename de URI completo', () => {
    expect(
      matchesFeaturePrefix(
        'content://com.android.externalstorage/.../markdown/humor-2026-05-06.md',
        'humor-'
      )
    ).toBe(true);
  });

  it('rejeita prefixo nao-bate', () => {
    expect(
      matchesFeaturePrefix('markdown/diario-2026-05-06.md', 'humor-')
    ).toBe(false);
  });

  it('separa medidas- de medidas-foto-', () => {
    expect(matchesFeaturePrefix('markdown/medidas-2026-05-06.md', 'medidas-')).toBe(true);
    expect(matchesFeaturePrefix('markdown/medidas-foto-2026-05-06-frente.md', 'medidas-')).toBe(true);
    expect(matchesFeaturePrefix('markdown/medidas-foto-2026-05-06-frente.md', 'medidas-foto-')).toBe(true);
    expect(matchesFeaturePrefix('markdown/medidas-2026-05-06.md', 'medidas-foto-')).toBe(false);
  });
});

describe('VAULT_FOLDERS (H2 layout-por-tipo)', () => {
  it('expoe 8 pastas canonicas em ordem', () => {
    expect(VAULT_FOLDERS).toEqual([
      'markdown',
      'png',
      'jpg',
      'm4a',
      'mp4',
      'pdf',
      'gif',
      '.ouroboros/cache',
    ]);
  });

  it('inclui .ouroboros/cache (excecao ADR-0019)', () => {
    expect(VAULT_FOLDERS).toContain('.ouroboros/cache');
  });

  it('inclui markdown como primeira pasta (consolidacao .md)', () => {
    expect(VAULT_FOLDERS[0]).toBe('markdown');
  });
});
