# Sprint V4.0 — INFRA-VAULT-WEB-MOCK

```
DEPENDE:    HEAD em f888bed
BLOQUEIA:   V4 (M-AUDIT-E2E-SAVE-DEVICES-INDEX) e qualquer sprint que
            queira validar conteúdo de arquivo via Gauntlet
ESTIMATIVA: ~2h
STATUS:     [todo]
```

## 1. Objetivo

Achado durante V4 (M-AUDIT-E2E-SAVE-DEVICES-INDEX): em web/dev, todos
os caminhos que escrevem no Vault via
`StorageAccessFramework.{read,write}AsStringAsync` lançam
`UnavailabilityError`, e o erro é silenciosamente engolido em boot
hooks (`reagendarTodosBootHooks`) e em saves de feature. **Nenhum
arquivo `.md` é escrito em web.** E2Es de save (`m-save-*.e2e.ts`) só
asseguram "não crasha"; não conseguem validar conteúdo.

Esta sprint implementa um **mock store SAF web** que intercepta
`read/writeAsStringAsync` e armazena conteúdo em memória, expondo
helpers via `__gauntlet.lerVaultMock(path)` e
`__gauntlet.listarVaultMock()`. Mobile real continua usando SAF nativo.

## 2. Entregáveis

### Novo
- `src/lib/dev/vaultMockStore.ts` — `Map<uri, string>` exposto via
  zustand `useVaultMock`, com `getArquivo(path)`, `setArquivo(path,
  conteudo)`, `listar()`, `limpar()`.
- `tests/lib/dev/vaultMockStore.test.ts` — 4 casos: write+read,
  overwrite, list, gauntlet api expose.

### Modificar
- `src/lib/vault/reader.ts` — branch `Platform.OS === 'web' && __DEV__`:
  ler do `useVaultMock` em vez de SAF.
- `src/lib/vault/writer.ts` — branch `Platform.OS === 'web' && __DEV__`:
  escrever no `useVaultMock` em vez de SAF.
- `src/lib/dev/gauntlet.ts` — expor `lerVaultMock(path)` e
  `listarVaultMock()` no `__gauntletApi`. `aplicarReset` chama
  `useVaultMock.getState().limpar()`.

## 3. APIs reutilizáveis

- Padrão de stores zustand mock (`useFrasesMock`, `useHumorMock`,
  `useGaleriaMock`).
- `comGuard(GAUNTLET_ATIVO)` em métodos públicos do `gauntlet.ts`.

## 4. Restrições

- Mobile real (`Platform.OS !== 'web'`) **NÃO** regride: SAF continua
  sendo usado para read/write em produção.
- Comportamento web/dev: estado **em memória apenas**, perdido em
  reload. `aplicarReset` zera explicitamente.
- E2Es existentes (`m-save-*.e2e.ts`) continuam passando — agora podem
  ser estendidos para validar conteúdo.

## 5. Validação

```bash
npx tsc --noEmit                                     # exit 0
npm test -- vaultMockStore                           # 4 testes passando
./scripts/smoke.sh                                   # smoke verde
```

Validação manual via Gauntlet:
- `__gauntlet.reset() && __gauntlet.seed()`.
- `__gauntlet.lerVaultMock('markdown/_devices.md')` → conteúdo
  serializado real (frontmatter `deviceId:`, `nome_amigavel:`, etc.).
- `__gauntlet.listarVaultMock()` → array de paths existentes.

## 6. Procedimento

1. Implementar `vaultMockStore.ts` (zustand store + helpers).
2. Estender `reader.ts` e `writer.ts` com branch web __DEV__.
3. Expor APIs em `gauntlet.ts`.
4. Hook `aplicarReset` para limpar.
5. Testes unit + smoke verde.
6. Documentar em `docs/GAUNTLET.md`.

## 7. Verificação

```bash
npx tsc --noEmit
npm test -- vaultMockStore reader writer
./scripts/smoke.sh
```

## 8. Commit

```
feat: infra-vault-web-mock store + reader writer branch web dev
```

## 9. Checkpoint visual

Sprint dev-only — sem UI. Testar via console JS no Gauntlet.

### Checklist

- [ ] `STATE.md`, `ROADMAP.md`, `CHANGELOG.md`.
- [ ] `docs/GAUNTLET.md` atualizado com novas APIs.

## 10. Decisão resolvida

`Map<uri, string>` em zustand store dedicado é mais simples que
intercept de mock global. Cada arquivo virtual tem URI canônica
(mesma do SAF) e conteúdo serializado. `listarVaultMock()` ordena
alfabeticamente para asserções determinísticas.
