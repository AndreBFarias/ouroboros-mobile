# Sprint M28 — Nomes reais em todas as UIs (substitui "Pessoa A/B/Sobreposto")

```
DEPENDE:    M27 (menu lateral consolida estrutura final)
BLOQUEIA:   M29 (settings v2 — varredura aproveita)
ESTIMATIVA: 3-4h
```

## 1. Objetivo

Remover toda string hardcoded "Pessoa A", "Pessoa B", "Sobreposto",
"Ambos" do código de UI, substituindo por chamadas a `nomeDe()` ou
novo helper `rotuloPessoa()` que devolve nome runtime + "Casal" para
o caso `'ambos'`.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/stores/rotuloPessoa.test.ts`
  — testes do helper.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — adicionar:
  ```ts
  export function rotuloPessoa(autor: PessoaAutor | 'ambos'): string {
    const nomes = usePessoa.getState().nomes;
    if (autor === 'ambos') return 'Casal';
    return nomes[autor] ?? autor;
  }
  ```
  Hook reativo `useRotuloPessoa(autor)` para componentes:
  ```ts
  export function useRotuloPessoa(autor: PessoaAutor | 'ambos'): string {
    const nomes = usePessoa((s) => s.nomes);
    if (autor === 'ambos') return 'Casal';
    return nomes[autor] ?? autor;
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MiniHumorScreen.tsx`
  — substituir constantes `CHIP_OPTIONS_COMPARTILHADO` e
  `CHIP_OPTIONS_PRIVADO` por `useMemo` consumindo `useRotuloPessoa`.
  Labels viram nomes reais + "Casal".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MiniFinanceiroScreen.tsx`
  — auditar e atualizar (mesmo padrão).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/calendario/FiltrosBar.tsx`
  — atualizar chips de filtro pessoa.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/index.tsx`
  — `<RadioPessoa>` já consome `nomes` (linhas 344-355). Auditar e
  garantir que outras strings não estejam hardcoded.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/data/HumorHeatmapStats.tsx`
  — se mostrar labels "Pessoa A média", trocar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/data/PessoaFilterBar.tsx`
  — se existir, atualizar.
- Outros arquivos detectados pela varredura (ver Procedimento §5).

### Testes atualizados

- Atualizar testes que mockavam labels "Pessoa A" — passar a usar
  nomes mockados ("André", "Vitória").

## 3. APIs reutilizáveis

- `usePessoa.nomes` — store já existente.
- `nomeDe()` — helper já existente.
- `useMemo` para evitar re-criar arrays de chips a cada render.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Helper `rotuloPessoa` / `useRotuloPessoa`:** adições à store
  `usePessoa`. Sem schema novo.
- **Sem mudança em rotas, app.json, captureRoutes.**
- Sprint puramente de varredura cosmética + helper.

## 4. Restrições

- **Regra −1 reforçada**: nomes reais NUNCA aparecem em código
  versionado. `rotuloPessoa()` lê de `usePessoa.nomes` (SecureStore
  runtime).
- Sentence case + acentuação completa.
- TS strict.
- Testes: usar nomes neutros como "Nome_A" / "Nome_B" no setup,
  ou stub `usePessoa` para retornar nomes específicos quando
  necessário.
- **Não tocar** em `accessibilityLabel` (continua sem acento;
  identificação técnica).

## 5. Procedimento sugerido

1. Adicionar `rotuloPessoa` + `useRotuloPessoa` em `pessoa.ts`.
2. Varredura completa:
   ```bash
   grep -rn "'Pessoa A'\|'Pessoa B'\|'Sobreposto'\|'Ambos'\|\"Pessoa A\"\|\"Pessoa B\"\|\"Sobreposto\"\|\"Ambos\"" app/ src/
   ```
   Listar todos os call sites; classificar:
   - **String visível ao usuário**: substituir por `useRotuloPessoa(autor)`.
   - **`accessibilityLabel`**: manter como está (sem acento).
   - **Constante de teste / mock**: revisar caso a caso.
3. Atualizar cada arquivo da lista.
4. Atualizar testes que conferiam "Pessoa A" textualmente.
5. Adicionar teste de regressão: render `MiniHumorScreen` com
   `usePessoa` stub `{ nomes: { pessoa_a: 'André', pessoa_b: 'Vitória' } }`
   e confirmar que chip mostra "André" / "Vitória" / "Casal".

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m28-export && rm -rf /tmp/m28-export

# Verificação manual:
grep -rn "'Pessoa A'\|'Pessoa B'\|'Sobreposto'" app/ src/ \
  | grep -v "accessibilityLabel\|test\|spec"
# espera: vazio
```

## 7. Commit

```
refactor: m28 rotulo pessoa real em todas as ui substitui pessoa a b
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M28-screenshots/`:
- `A-humor-chips-nomes-reais.png` — MiniHumorScreen com chips
  "André / Vitória / Casal".
- `A-settings-radio-nomes.png` — Settings Pessoa com radio "André" /
  "Vitória".
- `A-calendario-filtros-nomes.png` — FiltrosBar com nomes.

## 9. Decisões tomadas

- **Helper síncrono `rotuloPessoa()` + hook reativo
  `useRotuloPessoa()`**: o primeiro para uso fora de componentes
  (logging, sort), o segundo para UI reativa.
- **"Casal" para `'ambos'`**: termo afetuoso e claro. "Ambos" é
  ambíguo (poderia ser "ambos os tipos" em outro contexto).
- **Fallback `nomes[autor] ?? autor`**: se SecureStore estiver vazio
  (nunca deve, com onboarding completo), exibe `'pessoa_a'` / `'pessoa_b'`
  literal — preferível a crash.
- **Não alterar accessibilityLabel**: `accessibilityLabel="chip pessoa
  pessoa_a"` é técnico, não muda. Screen reader pronuncia o nome via
  conteúdo `<Text>` da própria label visível.

Sprint pronta para execução sem perguntas pendentes.
