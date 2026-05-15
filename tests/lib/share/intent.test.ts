// Tests dos helpers de intent do share receiver (M08). Funcoes
// puras: parseIntentParams, mimeAceito, extensaoDe, nomeAmigavel.
import {
  mimeAceito,
  extensaoDe,
  nomeAmigavel,
  parseIntentParams,
} from '@/lib/share/intent';

describe('mimeAceito', () => {
  it('aceita application/pdf', () => {
    expect(mimeAceito('application/pdf')).toBe(true);
  });

  it('aceita qualquer image/*', () => {
    expect(mimeAceito('image/jpeg')).toBe(true);
    expect(mimeAceito('image/png')).toBe(true);
    expect(mimeAceito('image/webp')).toBe(true);
    expect(mimeAceito('image/heic')).toBe(true);
  });

  it('rejeita mime fora do contrato', () => {
    expect(mimeAceito('text/plain')).toBe(false);
    expect(mimeAceito('application/octet-stream')).toBe(false);
    expect(mimeAceito('video/mp4')).toBe(false);
  });
});

describe('extensaoDe', () => {
  it('extrai extensao do nome quando presente', () => {
    expect(extensaoDe('application/pdf', 'comprovante.pdf')).toBe('pdf');
    expect(extensaoDe('image/jpeg', 'foto.JPG')).toBe('jpg');
  });

  it('deduz pelo mime quando nome ausente', () => {
    expect(extensaoDe('application/pdf')).toBe('pdf');
    expect(extensaoDe('image/jpeg')).toBe('jpg');
    expect(extensaoDe('image/png')).toBe('png');
    expect(extensaoDe('image/webp')).toBe('webp');
  });

  it('imagem generica cai em img', () => {
    expect(extensaoDe('image/svg+xml')).toBe('img');
  });

  it('mime desconhecido devolve string vazia', () => {
    expect(extensaoDe('application/octet-stream')).toBe('');
  });

  it('ignora extensao com mais de 6 chars do nome', () => {
    expect(extensaoDe('application/pdf', 'arquivo.algoMuitoLongo')).toBe('pdf');
  });

  it('sanitiza extensao com caracteres invalidos', () => {
    expect(extensaoDe('image/jpeg', 'foto.j-pg')).toBe('jpg');
  });
});

describe('parseIntentParams', () => {
  it('devolve null sem uri', () => {
    expect(parseIntentParams({})).toBeNull();
    expect(parseIntentParams({ uri: '' })).toBeNull();
    expect(parseIntentParams({ uri: null })).toBeNull();
  });

  it('extrai uri obrigatoria', () => {
    const out = parseIntentParams({ uri: 'content://docs/abc' });
    expect(out).toEqual({
      uri: 'content://docs/abc',
      mimeType: 'application/octet-stream',
      origem: null,
      nomeSugerido: null,
    });
  });

  it('preserva mime + origem + nome quando presentes', () => {
    const out = parseIntentParams({
      uri: 'content://docs/abc',
      mime: 'application/pdf',
      origem: 'com.nu.production',
      nome: 'comprovante.pdf',
    });
    expect(out).toEqual({
      uri: 'content://docs/abc',
      mimeType: 'application/pdf',
      origem: 'com.nu.production',
      nomeSugerido: 'comprovante.pdf',
    });
  });

  it('aceita arrays e pega o primeiro', () => {
    const out = parseIntentParams({
      uri: ['content://docs/abc', 'content://docs/def'],
      mime: ['image/jpeg'],
    });
    expect(out?.uri).toBe('content://docs/abc');
    expect(out?.mimeType).toBe('image/jpeg');
  });

  it('strings vazias nos opcionais viram null', () => {
    const out = parseIntentParams({
      uri: 'content://x',
      mime: '',
      origem: '',
      nome: '',
    });
    expect(out?.mimeType).toBe('application/octet-stream');
    expect(out?.origem).toBeNull();
    expect(out?.nomeSugerido).toBeNull();
  });
});

describe('nomeAmigavel', () => {
  it('usa nomeSugerido sem extensao', () => {
    const r = nomeAmigavel({
      uri: 'content://docs/abc',
      mimeType: 'application/pdf',
      origem: null,
      nomeSugerido: 'comprovante-pix.pdf',
    });
    expect(r).toBe('comprovante-pix');
  });

  it('quando nome ausente, pega segmento da uri', () => {
    const r = nomeAmigavel({
      uri: 'content://docs/folder/relatorio.pdf',
      mimeType: 'application/pdf',
      origem: null,
      nomeSugerido: null,
    });
    expect(r).toBe('relatorio');
  });

  it('mime pdf default sem nome', () => {
    const r = nomeAmigavel({
      uri: '',
      mimeType: 'application/pdf',
      origem: null,
      nomeSugerido: null,
    });
    expect(r).toBe('documento');
  });

  it('mime imagem default sem nome', () => {
    const r = nomeAmigavel({
      uri: '',
      mimeType: 'image/png',
      origem: null,
      nomeSugerido: null,
    });
    expect(r).toBe('imagem');
  });

  it('mime desconhecido + sem nome cai em arquivo', () => {
    const r = nomeAmigavel({
      uri: '',
      mimeType: 'application/octet-stream',
      origem: null,
      nomeSugerido: null,
    });
    expect(r).toBe('arquivo');
  });
});
