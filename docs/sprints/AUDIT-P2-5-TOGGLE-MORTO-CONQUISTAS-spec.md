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
DECISAO:    (dono, 2026-07-29) REMOVER o toggle, e a rota `/calendario` NÃO volta. A rota
            caiu por decisão de produto baseada em confusão real de uso registrada em
            field test (ADR-0021:37-44), não por débito técnico. O que se perdeu de
            concreto foram os 5 filtros de conquista, e isso é escopo de `AUDIT-P2-11`.
            Sai apenas a `<ToggleRow>`; a chave permanece no schema.
```

## Problema (switch morto, resíduo do ADR-0021)

`app/settings/index.tsx:343-348` renderiza um controle que o usuário pode ligar e
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
app/settings/index.tsx:345          valor={...}                   (leitura para pintar o switch)
app/settings/index.tsx:346          onChange={...}                (escrita)
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

`docs/FEATURES-CANONICAS.md:876-885` documenta a mesma consolidação e registra que
`CalendarioConquistasScreen` foi removido. (A referência anterior deste spec apontava para
`:851-859`, posição válida em 2026-07-28 e deslocada desde então pela inclusão da §7.2.)

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

### Decisão do dono, 2026-07-29 — a rota `/calendario` não volta

Registrado aqui em prosa para que ninguém reabra o assunto numa auditoria futura lendo
apenas "toggle sem leitor" e concluindo que basta devolver a rota.

**A rota `/calendario` caiu por evidência de campo, não por débito técnico.**
`docs/ADRs/0021-recap-calendario-unificado.md:37-44` registra, literalmente, o field test
do APK `v1.0.0-alpha` (commit `ada414e`) em que o **próprio dono**, usando o app, perguntou:

> "Recap e Calendário são a mesma coisa? São diferentes? Qual eu uso?"

Dois itens no menu lateral apontando para a mesma abstração subjacente — conquistas
agregadas num intervalo de tempo — produziram ambiguidade em uso real. O mesmo trecho
registra o custo do lado do código: *"manter as duas telas dobrava a superfície de
manutenção (dois caminhos de filtro, dois empty states, dois testes E2E) sem benefício de
produto."*

Consequência: **restaurar a rota reintroduziria o problema.** Nada mudou desde 2026-05-07
que invalide aquele field test. O roteiro de reversão que o `ADR-0021:139-152` guarda
existe para completude documental, não como convite.

### O que de fato se perdeu — e onde o valor é endereçado

A investigação de 2026-07-29 separou as duas perguntas que "religar isso" pode significar,
e elas têm respostas opostas:

- **Devolver a rota e dar função ao toggle: não.** É o parágrafo acima.
- **Devolver a capacidade perdida: sim, mas não é aqui.** O que se perdeu de concreto na
  unificação foram **os 5 filtros de conquista** (pessoa, mês, tipo de mídia, intensidade,
  bairro) — a única perda que o próprio ADR admite por escrito: *"usuário que dependia dos
  filtros perde-os temporariamente"* (`ADR-0021:111-114`). O lugar certo de devolvê-los é
  **dentro do modo Calendário do Recap**, que é literalmente o que o `ADR-0021:86-94`
  prometeu. Isso é escopo da sprint **`AUDIT-P2-11-FILTROSBAR-RECAP`**, não desta.

As outras duas perdas são de forma, não de função: a `<Timeline>` horizontal tem
substituição declarada em documento canônico (`docs/FEATURES-CANONICAS.md:876-885`), e o
item de menu dedicado foi removido **de propósito** — era a causa da ambiguidade.

## Escopo (mínimo)

1. Remover o `<ToggleRow>` de `app/settings/index.tsx:343-348` (label em `:344`, leitura em
   `:345`, escrita em `:346`). É a única alteração de comportamento da sprint.
2. **Manter a chave `calendarioConquistas` no schema e na store — decisão do dono,
   2026-07-29.** Não remover de `src/lib/stores/settings.ts` (tipo em `:49`, default em
   `:287`) nem de `src/lib/schemas/vault_estado.ts:65`. Motivo verificado: no schema o campo
   é `z.boolean()` **não-opcional**, dentro do objeto `featureToggles`
   (`vault_estado.ts:60-70`) — removê-lo do schema quebraria a validação do estado
   espelhado do Vault, que é contrato de arquivo, e obrigaria a uma migração para pagar uma
   dívida puramente cosmética. A chave passa a ser um campo persistido inerte, e isso é
   aceitável: o problema visível é a UI que mente, e ela sai no item 1.
3. Documentar a inércia no código, para a auditoria seguinte não relistar o achado: um
   comentário curto na declaração de `src/lib/stores/settings.ts:49` e/ou em
   `src/lib/schemas/vault_estado.ts:65` dizendo que a chave sobrevive por contrato de Vault
   (ADR-0021, AUDIT-P2-5) e que nenhum código ramifica nela. Sem migração, sem mudança de
   default.
4. Resíduo de teste: remover a escrita sem assert em
   `tests/components/chrome/MenuLateral.test.tsx:108`, que monta a chave dentro de um caso
   cujos asserts não a exercitam. **Não** mexer nas fixtures que montam a chave por
   exigência do schema (`tests/lib/stores/settings.test.ts`,
   `tests/lib/vault/escreverEstado.test.ts`, `tests/lib/services/restaurarVault.test.ts`,
   `tests/lib/stores/settings-merge-backfill.test.ts`) — pelo item 2 elas continuam
   corretas como estão.
5. Atualizar `docs/FEATURES-CANONICAS.md`: a lista de toggles de Configurações perde um
   item; §8 (Calendário Visual de Conquistas, nota histórica em `:876-885`) ganha a nota de
   que o interruptor residual saiu de Configurações em 2026-07-29, que a chave permanece no
   schema por contrato de Vault, e que a rota `/calendario` não volta.
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
9. NÃO-objetivo, por decisão do dono de 2026-07-29: recriar `app/calendario.tsx`, o
   `CalendarioConquistasScreen` ou o item "Calendário" do `MenuLateral`. A rota não volta.
10. NÃO-objetivo: expor os 5 filtros de conquista. É `AUDIT-P2-11-FILTROSBAR-RECAP`.

## Proof-of-work

```bash
# 1. Antes: a chave existe e nenhum leitor ramifica nela
grep -rn "calendarioConquistas" --include="*.ts" --include="*.tsx" src app   # 5 hits
grep -n "calendarioConquistas" src/components/chrome/MenuLateral.tsx         # 0 hits

# 2. Depois: sai de app/settings/ e so' de la'
grep -rn "calendarioConquistas" app/settings/                                # 0 hits
grep -rn "calendarioConquistas" --include="*.ts" --include="*.tsx" src app   # 3 hits:
#   src/lib/stores/settings.ts (tipo + default) e src/lib/schemas/vault_estado.ts
grep -rn "Calendário de conquistas" app/                                     # 0 hits

# 3. A chave permanece no contrato de Vault (item 2 do escopo) — guarda contra
#    remocao acidental que quebraria a validacao do estado espelhado
grep -n "calendarioConquistas" src/lib/schemas/vault_estado.ts               # 1 hit (:65)

# 4. Resto do resido de teste: so' a escrita sem assert do MenuLateral sai
grep -rn "calendarioConquistas" tests/components/chrome/MenuLateral.test.tsx # 0 hits

# 5. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test --silent                                    # baseline nao regride
./scripts/smoke.sh                                   # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> secao Features
# esperado: o item "Calendario de conquistas" nao aparece; os vizinhos seguem la'
# screenshots em docs/sprints/AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS-screenshots-gauntlet/
```

Checkpoint extra recomendado: hidratar uma instalação que já tenha a chave persistida
(seed no Gauntlet com o valor antigo, nos dois estados) e confirmar que a seção Features
renderiza inteira e que o escrever/restaurar do estado espelhado do Vault segue verde —
prova de que remover só a UI não mexeu no contrato de arquivo.

## Commit

```
refactor: audit-p2-5 remove togglerow calendarioconquistas de settings chave fica no schema
```
