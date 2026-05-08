# Sprint V4.0.1 — INFRA-VAULT-MOCK-CONVERGENCIA

```
DEPENDE:    V4.0 fechada
BLOQUEIA:   nada (mobile real intacto); habilita Recap web e validação
            visual completa via Gauntlet
ESTIMATIVA: ~2-3h
STATUS:     [todo]
```

## 1. Objetivo

V4.0 implementou `useVaultMock` zustand com reader/writer interceptando
SAF em web __DEV__. **Mas** os mocks específicos por feature
(`useFrasesMock`, `useGaleriaMock`, `useDiarioMock`, `useEventosMock`,
`useHumorMock`) bypassam o caminho reader/writer e armazenam **dados
de domínio JS**, não conteúdo serializado `.md`.

Resultado: ao rodar `__gauntlet.salvarFraseMock(...)`, a frase fica
em `useFrasesMock` mas **não** em `useVaultMock` —
`__gauntlet.listarVaultMock()` retorna `[]` mesmo após múltiplos saves.
Recap web continua vazio (achado G2.1 ACOL-1).

Em mobile real (SAF funcional) isso **não importa** — os saves passam
pelo writer e gravam `.md` no Vault. Esta sprint cobre **apenas o gap
de validação web**.

## 2. Entregáveis

### Modificar
- `src/lib/dev/frasesMock.ts` — função `adicionar` também serializa
  o item via `stringifyCompanionMidia` e popula `useVaultMock` no
  path canônico.
- `src/lib/dev/galeriaMock.ts` — idem.
- `src/lib/dev/seedDeterministico.ts` — `seedComDados` popula
  `useVaultMock` com `.md` de cada fixture além dos mocks específicos.
- `src/lib/vault/diario.ts:28` (e congêneres em `eventos.ts`,
  `marcos.ts`, `treinos.ts`, `tarefas.ts`, `contadores.ts`,
  `humor.ts`): remover early return `if (vaultRoot.startsWith('web://'))`.
  Reader em web __DEV__ agora delega para `useVaultMock` (V4.0), então
  listar pode rodar normalmente.
- `tests/lib/hooks/useRecap-reflexao.test.ts` (e similares): habilitar
  cenário web seedando via `useVaultMock`.

### Validação
- `__gauntlet.reset() && __gauntlet.seed() && __gauntlet.disparaBootHooks()`
  popula `useVaultMock` com pelo menos `_devices.md`.
- `__gauntlet.seedComDados('diarios-3')` popula 3 entradas reais em
  `useVaultMock` sob `markdown/diario-...md`.
- `__gauntlet.salvarFraseMock(texto, meta)` retorna ok=true E o arquivo
  aparece em `__gauntlet.listarVaultMock()`.
- `/recap` mostra seções com dados (não empty).

## 3. APIs reutilizáveis

- `useVaultMock` (V4.0) — `setArquivo(path, conteudo)` para popular.
- `stringifyCompanionMidia` — serializador determinístico.
- Schemas zod — para gerar conteúdo válido.

## 4. Restrições

- **Mobile real NÃO regride**: Platform.OS branches preservados.
- Branch web __DEV__ apenas.
- `useFrasesMock`, `useHumorMock` etc. continuam servindo dados de
  domínio JS para componentes que renderizam direto (não passam pelo
  reader). A novidade é **espelhar** no `useVaultMock` para o
  reader/Recap.

## 5. Validação Gauntlet

PNGs em `docs/sprints/INFRA-VAULT-MOCK-CONVERGENCIA-screenshots-gauntlet/`:
- `01-listarVaultMock-pos-seed.png`: console mostrando array
  populado após seed.
- `02-recap-com-secoes-populadas.png`: /recap modo Lista com
  Conquistas, Crises, Reflexões com dados reais.

## 6. Procedimento

1. Auditar fluxo de save de cada feature em web __DEV__:
   `frase`, `humor`, `diario`, `evento`, `foto`, `audio`, `video`.
2. Para cada uma, garantir que após o save no mock específico, o
   conteúdo serializado é replicado em `useVaultMock`.
3. Remover early returns `web://` em `listar*` helpers.
4. Re-rodar test E2E V4 com asserts sobre conteúdo real.
5. Validar visualmente no Recap.

## 7. Verificação

```bash
npx tsc --noEmit
npm test
./scripts/smoke.sh
```

E2E V4 já existente (`m-save-devices-index.e2e.ts`) deve passar
runtime real após esta sprint.

## 8. Commit

```
feat: v4.0.1 infra-vault-mock-convergencia mocks feature populam vaultmock
```

## 9. Checkpoint visual

PNGs Gauntlet conforme §5.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`, `docs/GAUNTLET.md`.

## 10. Decisão resolvida

**Espelhar dados de feature no `useVaultMock` em vez de migrar tudo
para `useVaultMock`-only.** Justificativa: stores específicos
(`frasesMock`, `humorMock`) são consumidos diretamente por componentes
para velocidade; reader/Vault é o caminho lento canônico. Mantemos
ambos: stores de domínio para render rápido + `useVaultMock` para
testes/validação que precisam ler `.md` real.
