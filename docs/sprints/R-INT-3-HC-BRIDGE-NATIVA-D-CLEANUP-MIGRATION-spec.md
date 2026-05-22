# R-INT-3-HC-BRIDGE-NATIVA-D — Cleanup migration sync.ts + remocao react-native-health-connect

**Tipo:** refactor + cleanup
**Prioridade:** P1 (fecha bridge nativa completa)
**Estimativa:** 0.5d
**Fase:** 3
**Depende de:** sub-sprints B + C (readRecords + insertRecords implementados)

## Contexto

`src/lib/health/sync.ts` (357 linhas) ainda importa `react-native-health-connect` (linha 42: `require('react-native-health-connect')`). Sub-sprints A/B/C entregaram bridge nativa completa em `modules/health-connect/`. Esta sprint migra o sync.ts para usar o modulo local e remove a lib obsoleta do projeto.

## Objetivo

1. Trocar `require('react-native-health-connect')` por `require('../../../modules/health-connect/src')` em `src/lib/health/sync.ts`.
2. Remover `Reflect.get` defensivo (era contra Proxy lancante do upstream — bridge nativa nao tem isso).
3. Remover `react-native-health-connect` do `package.json.dependencies`.
4. Remover plugin `react-native-health-connect` do `app.json.plugins` (provisionamento manifest agora vem do nosso plugin `modules/health-connect/app.plugin.js`).
5. Atualizar comentarios em `src/lib/health/{availability,permissions,sync}.ts` removendo referencias a `R-INT-3-HC-PROXY-REFLECT-HARDENING` (nao mais necessario).
6. Smoke verde + build APK confirma autosuficiencia.

## Escopo

### A. Investigacao obrigatoria

```bash
# Confirma sub-sprints B+C entregues:
grep -c "AsyncFunction(\"readRecords\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
grep -c "AsyncFunction(\"insertRecords\")" modules/health-connect/android/src/main/java/com/ouroboros/healthconnect/HealthConnectModule.kt
# Esperado: 1 cada

# Confirma uso atual de react-native-health-connect:
grep -rn "react-native-health-connect" src/ app/ modules/ | head
# Esperado: src/lib/health/sync.ts (1 ocorrencia) — esta sprint elimina
```

### B. Mudancas codigo

1. `src/lib/health/sync.ts`:
   - Trocar `require('react-native-health-connect')` por `require('../../../modules/health-connect/src')`.
   - Remover `Reflect.get` defensivo (linhas ~49-50 e demais).
   - Manter API publica do sync.ts intacta (callers em `src/lib/services/{saveTreino,escreverMedida,escreverRegistroCiclo}.ts` nao mudam).

2. `package.json`:
   - Remover `"react-native-health-connect": "^3.5.3"` de `dependencies`.
   - Remover `postinstall: "patch-package"` se nao houver outros patches (verificar `patches/` vazio).
   - Remover `patch-package` de devDependencies se foi instalado so para HC.

3. `app.json`:
   - Remover `"react-native-health-connect"` do array `plugins`.
   - Confirmar `"./modules/health-connect/app.plugin.js"` continua presente.

4. `src/lib/health/{availability,permissions}.ts`:
   - Limpar comentarios sobre `R-INT-3-HC-PROXY-REFLECT-HARDENING`.

### C. Testes ajustados

- Specs em `tests/lib/health/*.test.ts` que mockam `'react-native-health-connect'` precisam trocar para `'ouroboros-health-connect'` ou mockar o caminho relativo `'../../../modules/health-connect/src'`.

## OFF-LIMITS

**Pode tocar:** `src/lib/health/sync.ts`, `src/lib/health/availability.ts`, `src/lib/health/permissions.ts`, `package.json`, `package-lock.json`, `app.json`, `tests/lib/health/*.test.ts`.

**Nao pode tocar:** `modules/health-connect/` (entregue em A/B/C), `src/lib/services/*` (callers do sync mantem API), CLAUDE/ROADMAP/STATE/BRIEF/Checkpoint.

## Verificacao canonica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh
for i in 1 2 3; do npx jest --silent 2>&1 | grep "Test Suites:" | tail -1; done
# Build APK alpha-XX via tag — esperado: bundle MENOR (lib removida) + nada quebrado
```

## Proof-of-work

1. Lista de arquivos modificados.
2. `npx jest --silent | tail -5`.
3. Hash commit + build APK successful.
4. Confirmar `grep -r "react-native-health-connect" src/ app/` retorna zero matches.
5. Validacao live: instalar APK, criar TreinoSessao, abrir HC nativo, confirmar ExerciseSession listado (write end-to-end via bridge nativa).

## Referencias

- Sub-sprints A/B/C: `R-INT-3-HC-BRIDGE-NATIVA-{A,B,C}-*-spec.md`
- Padrao migracao: `modules/widget-homescreen/` (Q24.b.c.b) — sucessor de lib upstream removida.
