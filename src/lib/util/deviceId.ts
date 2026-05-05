// M38 -- identificador unico por instalacao para conflict resolution
// de Syncthing entre 4 nos (2 desktops + 2 celulares).
//
// Estrategia: SecureStore guarda um id curto (6 chars alfanumericos)
// gerado uma unica vez por instalacao. Em colisao de slug entre dois
// devices que escrevem o mesmo registro (ex: humor de hoje), o suffixo
// '-<deviceId>.md' e aplicado. Caminho feliz mantem nome canonico
// (ex: 'daily/2026-05-04.md').
//
// Decisoes (M38 spec secao 9):
//   - 6 chars alfanumericos (36^6 = 2.1 bi combinacoes; zero risco
//     de colisao entre 4 nos).
//   - Math.random aceitavel (e id de arquivo, nao secret).
//   - SecureStore (< 32 bytes, cabe em A20 sem risco).
//   - Persistente: nunca regenera salvo se SecureStore for zerado
//     por uninstall+reinstall sem backup.
//
// Comentarios sem acento (convencao shell/CI).
import * as SecureStore from 'expo-secure-store';

export const DEVICE_ID_KEY = 'ouroboros.device.id';

// Devolve o deviceId desta instalacao. Le do SecureStore (cache de
// instancia tambem mantido em memoria pra evitar I/O repetido) ou
// gera um novo na primeira chamada. Idempotente.
let cacheMemoria: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cacheMemoria) return cacheMemoria;
  const cached = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (cached) {
    cacheMemoria = cached;
    return cached;
  }
  const novo = `ouro-${randomShort()}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, novo);
  cacheMemoria = novo;
  return novo;
}

// So usado em testes para forcar regeneracao. Nao expor em UI.
export function _resetDeviceIdCache(): void {
  cacheMemoria = null;
}

function randomShort(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}

// Aplica suffixo de deviceId no rel '.md':
//   'daily/2026-05-04.md' + 'ouro-abc123' -> 'daily/2026-05-04-ouro-abc123.md'
//   'tarefas/2026-05-04-comprar-pao.md' + 'ouro-xyz' ->
//     'tarefas/2026-05-04-comprar-pao-ouro-xyz.md'
// Helper puro: nao toca I/O. Caller decide quando aplicar.
export function applyDeviceIdSuffix(rel: string, deviceId: string): string {
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}-${deviceId}`;
  return `${rel.slice(0, dotIdx)}-${deviceId}${rel.slice(dotIdx)}`;
}
