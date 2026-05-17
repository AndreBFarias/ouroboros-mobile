# R-INT-3-HC-PROXY-REFLECT-HARDENING — Detecção robusta de Proxy em react-native-health-connect

**Tipo**: hardening + DX
**Prioridade**: P2-medium
**Estimativa**: 1h
**Fase**: 3
**Origem**: achado durá­vel R-INT-3 (commit `726dec4`)

## Contexto

R-INT-3 documentou que `react-native-health-connect@3.5.0` retorna um Proxy não-bloqueante em ambientes não-Android (Expo Go iOS, web desktop, Jest). O Proxy lança ao acessar qualquer propriedade via getter.

A função `carregarModulo` em `src/lib/health/sync.ts`, `availability.ts` e `permissions.ts` testa:

```typescript
if (typeof mod.readRecords !== 'function' ||
    typeof mod.insertRecords !== 'function') return null;
```

Esse check pode **passar inadvertidamente** quando o módulo é um Proxy que lança no getter — o getter lança ANTES de retornar valor, e o `typeof` em getter que lança pode comportar-se de forma inconsistente em diferentes engines JS (V8, JavaScriptCore, Hermes).

Resultado em runtime Android: módulo real funciona. Em ambiente HC indisponível: Jest captura corretamente porque mocks são plain objects; runtime real sem HC nativo pode mascarar.

## Objetivo

Substituir o pattern por algo mais robusto:

```typescript
function carregarModuloSeguro(): HealthConnectModule | null {
  try {
    const mod = require('react-native-health-connect');
    // Reflect.get força evaluation do getter sem chamar a função
    const readRecords = Reflect.get(mod, 'readRecords');
    const insertRecords = Reflect.get(mod, 'insertRecords');
    if (typeof readRecords !== 'function' || typeof insertRecords !== 'function') {
      return null;
    }
    return mod as HealthConnectModule;
  } catch {
    return null;
  }
}
```

O `Reflect.get` força a avaliação do getter dentro do try, capturando o lance e retornando null limpo.

## Entregáveis

### Fix em 3 arquivos

- `src/lib/health/sync.ts`: substituir `carregarModulo`
- `src/lib/health/availability.ts`: idem (se tem padrão similar)
- `src/lib/health/permissions.ts`: idem

### Testes novos

Estender `tests/lib/health/sync.test.ts` com:
- Mock `react-native-health-connect` como Proxy que lança em getter → `carregarModuloSeguro` retorna null sem propagar exception
- Mock plain object com `readRecords` ausente → null
- Mock plain object completo → retorna módulo

Esperado: +3 testes.

## OFF-LIMITS

**Pode tocar**:
- `src/lib/health/sync.ts`, `availability.ts`, `permissions.ts` (apenas `carregarModulo`)
- Testes correspondentes

**Não pode tocar**:
- `escreverXEmHC` (R-INT-3 já entregou eventBus + toast)
- `useHCToast` (R-INT-3)
- AndroidManifest, app.json, app-level config

## Verificação

```bash
./scripts/smoke.sh
# Esperado: testes novos passam + smoke continua verde
```

## Proof-of-work

1. Lista de arquivos modificados (esperado: 3 src + 1 test).
2. Saída `npx jest tests/lib/health/ --silent | tail -5`.
3. Saída `./scripts/smoke.sh`.
4. Hash do commit.
5. 3 testes novos cobrindo: Proxy lançante, ausência de método, módulo completo.

## Decisão

- P2 porque é hardening de borda, não bloqueia release (R-INT-3 entregue funcionalmente).
- Pode ser agrupada com outras DX (R-DX-SECURESTORE-WEB-DEV-FALLBACK trata problema similar de Proxy/polyfill).
