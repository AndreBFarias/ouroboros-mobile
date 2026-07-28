# AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS — remover o toggle "Calendário de conquistas" que não controla nada

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (baixo custo, mas é UI que mente: o usuário acredita estar configurando
            algo e o valor não é lido por nenhum código desde o ADR-0021)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-5] / [NI-05] da auditoria de 2026-07-28. Encontrado ao cruzar as
            chaves de `featureToggles` com seus leitores. Reverificado nesta
            materialização em `main @ b5bf2db`: `calendarioConquistas` aparece 5 vezes em
            `src/` e `app/`, nenhuma delas ramificando comportamento.
```

## Problema (switch morto, resíduo do ADR-0021)

`app/settings/index.tsx:342-347` renderiza um controle que o usuário pode ligar e
desligar:

```tsx
<ToggleRow
  label="Calendário de conquistas"
  valor={featureToggles.calendarioConquistas}
  onChange={(v) => setFeatureToggle('calendarioConquistas', v)}
  a11y="toggle calendario conquistas"
/>
```

Nada lê o valor. `grep -rn "calendarioConquistas" --include="*.ts" --include="*.tsx" src
app` devolve exatamente 5 hits, e todos são declaração ou escrita:

```
src/lib/stores/settings.ts:49       tipo da chave
src/lib/stores/settings.ts:287      calendarioConquistas: true    (default)
src/lib/schemas/vault_estado.ts:65  campo do schema persistido
app/settings/index.tsx:344          valor={...}                   (leitura para pintar o switch)
app/settings/index.tsx:345          onChange={...}                (escrita)
```

**Nenhum `if`, nenhuma renderização condicional, nenhum filtro** depende dessa chave.

### Por que ficou órfã

`docs/ADRs/0021-recap-calendario-unificado.md` (Aceito, 2026-05-07, sprint
`M-RECAP-CALENDARIO-UNIFICAR`) unificou Recap e Calendário numa tela só. A rota top-level
`/calendario` foi apagada e o item de menu que ela controlava saiu junto —
`src/components/chrome/MenuLateral.tsx:168-171`:

```tsx
// L2 (M-RECAP-CALENDARIO-UNIFICAR, 2026-05-07): item "Calendario"
// removido. Recap (toggle modo Lista/Calendario) absorveu a tela.
// ADR-0021. Subrota /calendario/[id] (detalhe da conquista)
// continua acessivel via tap no ConquistaCard dentro do Recap.
```

Verificação do resíduo pedida no achado: `grep -n "calendarioConquistas"
src/components/chrome/MenuLateral.tsx` → **0 hits**. O gate saiu limpo do menu; o que
sobreviveu foi só o interruptor em Configurações, agora ligado a fio nenhum.

`docs/FEATURES-CANONICAS.md:851-859` documenta a mesma consolidação e registra que
`CalendarioConquistasScreen` foi removido.

Cenário de falha concreto: `pessoa_a` abre Configurações, vê "Calendário de conquistas"
entre "Acompanhamento do ciclo menstrual" e "Widget na tela inicial" — todos os vizinhos
funcionam —, desliga, volta ao app e não observa mudança nenhuma. Não há como distinguir
"desliguei e não fez efeito" de "desliguei errado". O switch é indistinguível de um bug.

### Resíduo em teste

`tests/components/chrome/MenuLateral.test.tsx:108` ainda escreve a chave dentro do caso
"Opcionais não aparece quando todos os toggles estao off":

```ts
useSettings.getState().setFeatureToggle('calendarioConquistas', false);
```

O caso passa hoje e passaria igual sem essa linha — os asserts cobrem
`item tarefas`, `item alarmes`, `item contadores` e `item ciclo`, nenhum ligado a
conquistas. É escrita sem assert correspondente.

## Ligar ou remover

**Recomendação: REMOVER.**

Justificativa: não existe nada para ligar. A tela que o toggle controlava foi apagada por
decisão arquitetural aceita (ADR-0021), e a funcionalidade equivalente vive hoje como modo
do Recap — que não é opcional nem deveria ser, porque é um dos dois modos do mesmo
componente. Restaurar um gate sobre o modo Calendário do Recap seria reintroduzir a
ambiguidade que o ADR-0021 removeu de propósito ("Recap e Calendário são a mesma coisa?").

A alternativa de manter o toggle "por precaução" é o que produziu este achado.

## Escopo (mínimo)

1. Remover o `<ToggleRow>` de `app/settings/index.tsx:342-347`.
2. Remover a chave `calendarioConquistas` de `src/lib/stores/settings.ts` (tipo em `:49`,
   default em `:287`) e do schema persistido `src/lib/schemas/vault_estado.ts:65`.
3. Tratar a migração de instalações existentes: a chave está persistida em SecureStore e
   no `.md` de estado do Vault. Verificar o comportamento de `mesclarDefaults` /
   `merge` custom de `settings.ts` para que uma chave extra no `persistedState` não
   quebre a hidratação nem apague as demais. Se o caminho existente já ignora chaves
   desconhecidas, registrar isso no spec de execução como evidência em vez de escrever
   migration nova.
4. Limpar o resíduo de teste em `tests/components/chrome/MenuLateral.test.tsx:108` e os
   demais arquivos de teste que apenas montam a chave em fixtures
   (`tests/lib/stores/settings.test.ts`, `tests/lib/vault/escreverEstado.test.ts`,
   `tests/lib/services/restaurarVault.test.ts`,
   `tests/lib/stores/settings-merge-backfill.test.ts`). Ajustar os asserts de contagem de
   chaves, se houver.
5. Atualizar `docs/FEATURES-CANONICAS.md`: a lista de toggles de Configurações perde um
   item; §8 (Calendário Visual de Conquistas) ganha a nota de que o toggle residual foi
   removido em 2026-07-28.
6. Caso E2E em `tests/e2e/playwright/audit-p2-5-toggle-morto-conquistas.e2e.ts`, copiado
   de `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: na seção Features
   de Configurações, os toggles listados são exatamente os que têm leitor — o item
   "Calendário de conquistas" não é renderizado, e os vizinhos ("Acompanhamento do ciclo
   menstrual", "Widget na tela inicial") continuam presentes e funcionais. O E2E existe
   para provar que a remoção não levou vizinho junto.
7. NÃO-objetivo: mexer no modo Calendário do Recap, em `RecapModoCalendario.tsx` ou na
   subrota `/calendario/[id]`, que continua viva via `<ConquistaCard>`.
8. NÃO-objetivo: remover a flag `recapAmbientAudio` (achado [NI-15], mesma classe de
   resíduo, sprint própria).

## Proof-of-work

```bash
# 1. Antes: a chave existe e nenhum leitor ramifica nela
grep -rn "calendarioConquistas" --include="*.ts" --include="*.tsx" src app   # 5 hits
grep -n "calendarioConquistas" src/components/chrome/MenuLateral.tsx         # 0 hits

# 2. Depois: some de src/ e app/
grep -rn "calendarioConquistas" --include="*.ts" --include="*.tsx" src app   # 0 hits

# 3. E some dos testes que so' a montavam
grep -rn "calendarioConquistas" tests/                                        # 0 hits

# 4. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test --silent                                    # baseline nao regride
./scripts/smoke.sh                                   # verde

# 5. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> secao Features
# esperado: o item "Calendario de conquistas" nao aparece; os vizinhos seguem la'
# screenshots em docs/sprints/AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS-screenshots-gauntlet/
```

Checkpoint extra recomendado: hidratar uma instalação que já tenha a chave persistida
(seed no Gauntlet com o valor antigo) e confirmar que os demais toggles sobrevivem à
remoção da chave.

## Commit

```
refactor: audit-p2-5 remove toggle calendarioconquistas sem leitor residuo do adr-0021
```
