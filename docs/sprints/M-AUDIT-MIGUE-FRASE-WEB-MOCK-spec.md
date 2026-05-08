# Sprint S1 — M-AUDIT-MIGUE-FRASE-WEB-MOCK

```
DEPENDE:    HEAD em 9c385b3 (auditoria 2026-05-08)
BLOQUEIA:   APK preview (saneamento de débito I-FRASE)
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## 1. Objetivo

Fechar o débito de validação web da sprint I-FRASE (commit `67f6b2d`):
`src/lib/midia/salvarFrase.ts:20` declara `web: no-op (retorna ok=false). Gauntlet usa mock vault futuro.` Implementar mock no Gauntlet via `__gauntlet.salvarFraseMock(texto)` para que o E2E e auditoria visual exerçam o fluxo completo. Em mobile real (Android), comportamento intacto.

## 2. Entregáveis

### Arquivos modificados

- `src/lib/midia/salvarFrase.ts` — em `Platform.OS === 'web' && __DEV__`,
  delegar para `__gauntlet.salvarFraseMock` quando exposto. Manter comportamento
  no-op fora de `__DEV__` (release web não é caso de uso).
- `src/lib/dev/gauntlet.ts` — expor `salvarFraseMock(texto: string): { ok: boolean; uri?: string }`
  e adicionar à API `__gauntlet`.
- `src/lib/dev/seedDeterministico.ts` — opcional: incluir 2 frases seed em `seedComDados`.
- `tests/lib/midia/salvarFrase.test.ts` — adicionar caso "web Gauntlet usa mock" cobrindo o ramo novo.

### Arquivos novos

- `tests/e2e/playwright/m-save-frase.e2e.ts` — caso E2E navegando via FAB+ verde,
  digitando frase, salvando, asserindo registro no estado mock.

## 3. APIs reutilizáveis

- `src/lib/dev/gauntlet.ts` (`GAUNTLET_ATIVO`, padrão de exposição via `__gauntlet`).
- `src/lib/midia/companion.ts` (serializador determinístico do `.md` companion).
- `src/lib/vault/midiaCompanion.ts` (helper canônico de escrita de companion).

## 4. Restrições

Padrão (Regra -1, sentence case PT-BR, sem emojis, TS strict). Sem novas deps.

## 5. Validação Gauntlet OU validação humana adb

**Gauntlet (Nível A+):**
1. `./gauntlet.sh`
2. `__gauntlet.reset() && __gauntlet.seed()`
3. Navegar para `/saude-fisica`, abrir FAB+ verde, escolher "Frase".
4. Preencher textarea, salvar, conferir toast "Frase salva." e estado mock.
5. PNG em `docs/sprints/M-AUDIT-MIGUE-FRASE-WEB-MOCK-screenshots-gauntlet/`.

## 6. Procedimento sugerido

1. Ler `src/lib/midia/salvarFrase.ts` atual (linha 20 tem o comentário canonico).
2. Adicionar branch web `__DEV__`:
   ```ts
   if (Platform.OS === 'web' && __DEV__) {
     const gauntlet = (globalThis as any).__gauntlet;
     if (typeof gauntlet?.salvarFraseMock === 'function') {
       return gauntlet.salvarFraseMock(texto, { autor, para });
     }
     return { ok: false, motivo: 'web-no-mock' };
   }
   ```
3. Em `src/lib/dev/gauntlet.ts` adicionar a interface ApiKey (mesmo padrão do `adicionarFotoMock` linha 103/384):
   ```ts
   salvarFraseMock(texto: string, meta: { autor: 'pessoa_a' | 'pessoa_b'; para: 'mim' | string }):
     { ok: true; uri: string; companion: string };
   ```
   Implementação: gera slug `frase-${YYYY-MM-DD}-${rand6}`, escreve no estado mock vault sob `markdown/<slug>.md` + companion frontmatter via `serializarCompanionDeterministico` de `src/lib/midia/companion.ts`.
4. Atualizar `tests/lib/midia/salvarFrase.test.ts`: caso "web Gauntlet usa mock" + caso "web sem mock retorna ok=false".
5. Criar `tests/e2e/playwright/m-save-frase.e2e.ts` copiando `docs/templates/e2e-template.e2e.ts`.
6. Smoke verde + 3 PNGs em `docs/sprints/M-AUDIT-MIGUE-FRASE-WEB-MOCK-screenshots-gauntlet/`.

## 7. Verificação runtime-real

```bash
./scripts/smoke.sh
npx tsc --noEmit
npm test -- salvarFrase
```

## 8. Commit

```
fix: m-audit-migue-frase-web-mock gauntlet salvarFraseMock + e2e
```

## 9. Checkpoint visual

PNGs Gauntlet do fluxo "abrir captura → frase → salvar → toast".

### Checklist obrigatório de manutenção

- [ ] `docs/FEATURES-CANONICAS.md` atualizado (frase agora validável em web).
- [ ] `STATE.md` atualizado.
- [ ] `ROADMAP.md` atualizado.
- [ ] `CHANGELOG.md` atualizado.

## 10. Dúvidas em aberto

Nenhuma.
