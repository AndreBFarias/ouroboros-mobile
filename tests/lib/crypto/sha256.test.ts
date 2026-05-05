// Sprint M-EXPORT-COMPLETO (A5): hash determinista para o MANIFEST do
// export. Testes confirmam vetores oficiais NIST + paridade com
// Node crypto (best-effort).
//
// Comentarios sem acento (convencao shell/CI).
import * as crypto from 'node:crypto';
import {
  sha256Bytes,
  sha256Utf8,
  sha256Base64,
} from '@/lib/crypto/sha256';

describe('sha256 puro JS', () => {
  it('vetor NIST: string vazia', () => {
    expect(sha256Utf8('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('vetor NIST: "abc"', () => {
    expect(sha256Utf8('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('vetor NIST: 56 bytes (boundary do padding)', () => {
    expect(
      sha256Utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')
    ).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    );
  });

  it('paridade com Node crypto para texto longo', () => {
    const txt = 'Lorem ipsum '.repeat(1000) + 'final unicode acento ção é';
    const noss = sha256Utf8(txt);
    const node = crypto.createHash('sha256').update(txt, 'utf8').digest('hex');
    expect(noss).toBe(node);
  });

  it('sha256Base64 bate com Node crypto sobre bytes decodificados', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const b64 = Buffer.from(bytes).toString('base64');
    const noss = sha256Base64(b64);
    const node = crypto.createHash('sha256').update(bytes).digest('hex');
    expect(noss).toBe(node);
  });

  it('sha256Bytes em buffer pequeno (1 byte)', () => {
    const node = crypto.createHash('sha256').update(new Uint8Array([0x61])).digest('hex');
    expect(sha256Bytes(new Uint8Array([0x61]))).toBe(node);
  });

  it('sha256Bytes em buffer multi-bloco', () => {
    const buf = new Uint8Array(2048);
    for (let i = 0; i < buf.length; i++) buf[i] = i & 0xff;
    const node = crypto.createHash('sha256').update(buf).digest('hex');
    expect(sha256Bytes(buf)).toBe(node);
  });
});
