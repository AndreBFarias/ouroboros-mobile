// R-INT-5-DRIVE-HUB-ATIVO (2026-05-25): testes do executor puro do
// resumo Drive. So exercitamos montarDriveResumo + helpers de formato;
// o adapter carregarDriveResumo (import lazy nativo) e' coberto via o
// teste do hub (IntegracoesScreen.test.tsx).
import {
  montarDriveResumo,
  formatarBytes,
  textoUltimoUpload,
  type DriveResumoDeps,
} from '@/lib/integracoes/google/driveResumo';
import type { BackupArquivado } from '@/lib/backup/executarBackup';

function backup(bytes: number, nome = 'b.zip'): BackupArquivado {
  return { uri: `/tmp/${nome}`, nome, modificadoEmMs: 1, bytes, snapshot: null };
}

describe('formatarBytes', () => {
  it('formata MB com uma casa', () => {
    expect(formatarBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
  it('formata KB com uma casa', () => {
    expect(formatarBytes(2048)).toBe('2.0 KB');
  });
  it('bytes crus abaixo de 1 KB', () => {
    expect(formatarBytes(512)).toBe('512 B');
  });
  it('zero e negativos caem em 0 KB', () => {
    expect(formatarBytes(0)).toBe('0 KB');
    expect(formatarBytes(-5)).toBe('0 KB');
  });
});

describe('textoUltimoUpload', () => {
  it('null vira "Nenhum backup na nuvem ainda."', () => {
    expect(textoUltimoUpload(null)).toBe('Nenhum backup na nuvem ainda.');
  });
  it('recente vira "agora mesmo"', () => {
    expect(textoUltimoUpload(Date.now())).toBe('Último envio: agora mesmo.');
  });
  it('horas atras', () => {
    const tresHoras = Date.now() - 3 * 60 * 60 * 1000;
    expect(textoUltimoUpload(tresHoras)).toBe('Último envio: há 3h.');
  });
  it('um dia atras (singular)', () => {
    const umDia = Date.now() - 25 * 60 * 60 * 1000;
    expect(textoUltimoUpload(umDia)).toBe('Último envio: há 1 dia.');
  });
});

describe('montarDriveResumo', () => {
  it('sem backups locais devolve texto de orientacao', () => {
    const deps: DriveResumoDeps = {
      backupsLocais: [],
      ultimoUploadIso: null,
    };
    const r = montarDriveResumo(deps);
    expect(r.totalBackups).toBe(0);
    expect(r.bytesTotais).toBe(0);
    expect(r.texto).toBe('Nenhum backup local para enviar ainda.');
  });

  it('agrega contagem, bytes e ultimo envio', () => {
    const iso = new Date().toISOString();
    const deps: DriveResumoDeps = {
      backupsLocais: [backup(1024 * 1024), backup(2 * 1024 * 1024)],
      ultimoUploadIso: iso,
    };
    const r = montarDriveResumo(deps);
    expect(r.totalBackups).toBe(2);
    expect(r.bytesTotais).toBe(3 * 1024 * 1024);
    expect(r.texto).toBe('2 backups · 3.0 MB · Último envio: agora mesmo.');
  });

  it('singular "backup" quando ha um so', () => {
    const deps: DriveResumoDeps = {
      backupsLocais: [backup(1024)],
      ultimoUploadIso: null,
    };
    const r = montarDriveResumo(deps);
    expect(r.texto).toBe('1 backup · 1.0 KB · Nenhum backup na nuvem ainda.');
  });

  it('ignora bytes nao-finitos sem quebrar', () => {
    const ruim = { ...backup(Number.NaN), bytes: Number.NaN };
    const deps: DriveResumoDeps = {
      backupsLocais: [ruim, backup(2048)],
      ultimoUploadIso: 'data-invalida',
    };
    const r = montarDriveResumo(deps);
    expect(r.totalBackups).toBe(2);
    expect(r.bytesTotais).toBe(2048);
    expect(r.ultimoUploadMs).toBeNull();
  });
});
