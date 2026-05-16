# R-DX-SECURESTORE-WEB-DEV-FALLBACK — Fallback web pro getDeviceId em ambiente dev

**Tipo**: infra + DX
**Prioridade**: P2-medium (afeta dev experience + validação visual)
**Estimativa**: 1-2h
**Fase**: 3 (DX)
**Origem**: achado colateral durável R-RECAP-4 (commit `afa22bc`); também observado em R-VAULT-B e R-RECAP-2 (overlay error em web dev).

## Histórico do problema

Em ambiente **dev web** (`__DEV__=true` + `Platform.OS === 'web'`), qualquer setter de store que dispare subscriber de R-VAULT-A (`escreverEstadoCanonico`) cai em:

```
TypeError: ExpoSecureStore.default.getValueWithKeyAsync is not a function
```

Causa: `src/lib/util/deviceId.ts:30` (getter) chama `SecureStore.getItemAsync()` diretamente. Em web, `expo-secure-store` não tem implementação direta — só o adapter `secureStorage` em `src/lib/stores/persist.ts` tem fallback `webStorage`.

Resultado em web dev:
- Overlay vermelho de erro aparece a cada interação que muda settings.
- Bloqueia validação visual via Gauntlet/playwright em telas de settings.
- 3 sprints já reportaram isto como achado: R-RECAP-2, R-VAULT-B, R-RECAP-4.

Em **mobile real** (Android/iOS) e **web release** (`__DEV__=false`), funciona normal — SecureStore nativo respondeu; overlay é dead-code em release. NÃO bloqueia release.

## Objetivo

Eliminar o overlay de erro em web dev. Duas abordagens viáveis:

### Opção A — try/catch + webStorage fallback em `getDeviceId`

```typescript
// src/lib/util/deviceId.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { webStorage } from '@/lib/stores/persist'; // já existe

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    return getOrCreateInWebStorage();
  }
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
    // ... create + persist
  } catch {
    // Web dev sem polyfill: fallback in-memory
    return getOrCreateInMemory();
  }
}
```

Pró: mudança cirúrgica, 1 arquivo. Não muda contrato de outros callers.
Contra: ainda chama SecureStore primeiro em web (overhead trivial mas evitável).

### Opção B — early return em Platform.OS === 'web'

Antes de chamar SecureStore, detectar web e usar `webStorage` adapter direto.

Pró: zero overhead, intent claro.
Contra: precisa importar `webStorage` (ciclo possível).

**Recomendação: Opção A** — mais robusta a edge cases (SecureStore quebrar em outras plataformas no futuro).

## Entregáveis

### Fix em `src/lib/util/deviceId.ts`

- Adicionar early return ou try/catch com fallback web
- Manter contrato público: `getDeviceId(): Promise<string>` continua igual
- Em web dev: deviceId persiste em `localStorage` (mesma chave canônica)
- Em web release: idem
- Em mobile: comportamento atual preservado

### Testes

`tests/lib/util/deviceId.test.ts` (ESTENDER, não criar novo):

- Mock `Platform.OS === 'web'` → fallback webStorage funciona
- Mock `Platform.OS === 'android'` + SecureStore mock → comportamento atual
- Mock `Platform.OS === 'ios'` → idem android

Esperado: +3 a +5 testes.

### Validação

Após fix, rodar Gauntlet e tocar settings em web dev — overlay NÃO deve aparecer.

## OFF-LIMITS

**Pode tocar**:
- `src/lib/util/deviceId.ts` (fix)
- `tests/lib/util/deviceId.test.ts` (estender)

**Não pode tocar**:
- `src/lib/stores/persist.ts` (`webStorage` adapter já existe)
- `src/lib/vault/escreverEstado.ts` (consumer, OK como está)
- Outros callers de `getDeviceId` (16 lugares, contrato preservado)

## Verificação canônica

```bash
./scripts/smoke.sh
# Gauntlet: tocar toggle em settings, overlay NÃO aparece
```

## Proof-of-work

1. Lista de arquivos modificados (esperado: 1-2).
2. Saída `npx jest --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit (OBRIGATÓRIO).
5. Path do worktree + branch.
6. Screenshot Gauntlet: settings tocando toggle SEM overlay.
7. Achados colaterais.

## Decisão

- Opção A escolhida (mais robusta).
- P2 porque bloqueia dev experience mas não release.
- Pode ser feita em paralelo com outras sprints de DX (R-DX-EXECUTOR-WORKTREE-ENFORCE, R-INFRA-WORKTREE-BOOTSTRAP).
