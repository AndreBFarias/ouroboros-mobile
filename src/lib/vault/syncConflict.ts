// Helper canonico para detectar arquivos de conflito do Syncthing.
//
// Quando dois dispositivos pareados editam o mesmo arquivo do Vault
// "ao mesmo tempo" (janela de segundos antes da reconciliacao),
// Syncthing nao escolhe vencedor: mantem o arquivo original e cria
// uma copia com sufixo `.sync-conflict-<YYYYMMDD>-<HHMMSS>-<dispid>`
// inserido antes da extensao. Exemplos reais observados:
//
//   humor-2026-05-06.sync-conflict-20260506-093412-OURO1.md
//   alarme-medicacao.sync-conflict-20260506-093412-OURO1.md
//   _devices.sync-conflict-20260506-093412-OURO1.md
//
// Sem filtro, listadores de Vault devolvem essas copias como se
// fossem registros legitimos: o parse falha (frontmatter sem campos
// necessarios) ou pior, parse passa e a UI mostra duplicata. Cada
// caller que itera o filesystem do Vault filtra com `ehSyncConflict`
// no nome decodificado antes de invocar `readVaultFile`.
//
// Decisao: filtro fica responsabilidade do caller (nao em
// `listVaultFolder`) porque `devicesIndex` e ferramentas de
// diagnostico futuras podem querer ver conflitos para reportar ao
// usuario. `listVaultFolder` continua low-level sem opiniao.
//
// Comentarios sem acento (convencao shell/CI).

// Sync-conflict insere o token em qualquer ponto do nome do arquivo,
// antes da extensao. Regex case-insensitive porque Syncthing tem
// configuracao opcional de capitalizacao em alguns forks.
export const SYNC_CONFLICT_REGEX = /\.sync-conflict-/i;

// Retorna true quando o nome contem o marcador de conflito do
// Syncthing. Aceita basename ou URI completo (decode via try interno).
export function ehSyncConflict(nomeOuUri: string): boolean {
  const decoded = (() => {
    try {
      return decodeURIComponent(nomeOuUri);
    } catch {
      return nomeOuUri;
    }
  })();
  return SYNC_CONFLICT_REGEX.test(decoded);
}
