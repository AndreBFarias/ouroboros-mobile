# Sprint M-BRIEF-A25 — Registrar Armadilha A25 no VALIDATOR_BRIEF §4

```
DEPENDE:    M37.1 (workaround aplicado em metro.config.js)
BLOQUEIA:   nada (anti-débito documental)
ESTIMATIVA: 0,3h (só doc)
PRIORIDADE: baixa (preventiva)
STATUS:     [todo]
```

## 1. Achado

M37.1 revelou que `react-native-calendars` (e potencialmente
outros pacotes RN antigos) quebra com Metro `unstable_enablePackageExports = true`.

**Sintoma literal:**
```
Unable to resolve "./period" from
"node_modules/react-native-calendars/src/calendar/day/index.js"
```

**Causa raiz:** o pacote usa imports relativos sem extensão
(`./period`) para diretórios com `index.js`, e a colateralidade
com `.d.ts` arquivos confunde o resolver Metro quando package
exports estão habilitados.

**Workaround canônico aplicado em `metro.config.js`:**
`resolveRequest` custom que cobre apenas paths internos do
`react-native-calendars/src/`, sem afetar resolução global.

## 2. Tarefa

Adicionar entrada **A25** na seção §4 do `VALIDATOR_BRIEF.md`,
em formato consistente com A1–A24. Conteúdo mínimo:

- **Nome**: A25 — Metro package exports vs imports relativos
  sem extensão.
- **Sintoma**: mensagem `Unable to resolve "./X" from .../index.js`
  durante `npx expo export` ou `expo start`.
- **Causa raiz**: `unstable_enablePackageExports: true` (default
  Expo SDK 54) com pacotes que usam pattern legado de imports
  internos.
- **Workaround**: `resolveRequest` custom em `metro.config.js`
  filtrado ao pacote afetado (não desabilitar globalmente).
- **Pacotes conhecidos afetados**:
  - `react-native-calendars@1.x` (M37.1, 2026-05-05).
- **Diagnóstico rápido**: rodar `npx expo export --platform web`
  e checar se erro casa o sintoma.
- **Não-fix**: desabilitar `unstable_enablePackageExports`
  globalmente quebra peer com Reanimated 4 + outras deps SDK 54.

## 3. Restrições

- Anonimato Regra −1.
- PT-BR completo no corpo da entrada.
- Manter formato visual idêntico às outras armadilhas (A1–A24).

## 4. Verificação

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
grep -c "^### A25" VALIDATOR_BRIEF.md   # >= 1
grep -c "package.exports" VALIDATOR_BRIEF.md   # >= 1
grep -c "react-native-calendars" VALIDATOR_BRIEF.md   # >= 2 (corpo + pacotes afetados)
```

Sem mudanças de código nem testes.

## 5. Commit

```
docs: brief a25 metro package exports react-native-calendars
```

## 6. Decisões tomadas

- Documentar como armadilha em vez de desabilitar
  `unstable_enablePackageExports` global: o flag é necessário
  para outras deps (Reanimated 4, etc) e o workaround é local.
- Lista de pacotes afetados é viva — futuras sprints que
  adicionarem deps RN antigas devem checar contra A25 e
  estender a lista.
