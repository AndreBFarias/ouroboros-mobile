# AUDIT-P2-7-SYNCSTATUS-M15 — renderizar o status de sync do Vault e consolidar os thresholds duplicados

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (o feedback central do modelo de sync do app — ADR-0002 — está
            construído, testado nas partes puras e nunca renderizado)
DEPENDE:    nenhuma
ORIGEM:     achados [P2-7] / [NI-07] da auditoria de 2026-07-28. Encontrado por varredura
            de componentes sem consumidor em `src/components/**`. Reverificado nesta
            materialização em `main @ b5bf2db`: `verificarSyncStatus` tem exatamente 1
            hit no repositório inteiro — a própria definição.
```

## Problema (feature M15 inteira construída e nunca renderizada)

`src/lib/services/syncStatus.ts` tem 124 linhas e implementa a heurística de status de
sync do Vault por `mtime`, incluindo detecção de conflito do Syncthing via `.stversions/`.
O cabeçalho do arquivo (`:5-9`) descreve o contrato de cores:

```ts
// Cores (CONTRACT seção 1.5 + spec M15):
//   - 'verde'    = mtime < 30min atras (atualizado).
//   - 'amarelo'  = entre 30min e 6h.
//   - 'vermelho' = > 6h, OU diretorio não existe, OU conflito
//     detectado em <vault>/.stversions/ (Syncthing).
```

A função pública que produz esse status não é chamada por ninguém:

```
$ grep -rn "verificarSyncStatus" --include="*.ts" --include="*.tsx" src app tests
src/lib/services/syncStatus.ts:40:export async function verificarSyncStatus(
```

**Um único hit no repositório inteiro, incluindo `tests/`.**
`tests/lib/services/syncStatus.test.ts:1` importa apenas `classificar` e `descreverDelta`,
as duas funções puras — a função que faz o I/O e monta o resultado nunca foi exercitada,
nem em teste.

O componente que a exibiria, `src/components/settings/CardStatus.tsx` (86 linhas), aparece
3 vezes fora dos testes, e as três são **comentários**:

```
src/components/settings/SecaoLista.tsx:3            "Cada filho assume layout proprio (Toggle, LinkSubTela, CardStatus, ..."
src/components/screens/IntegracoesScreen.tsx:245    "...consistencia visual com o CardStatus do Settings."
src/components/settings/CardStatus.tsx:6            exemplo de uso no proprio cabecalho
```

Nenhum `import`, nenhum `<CardStatus`. Só `tests/components/settings/CardStatus.test.tsx`
o instancia. O tipo `SyncCor` é importado apenas por `CardStatus.tsx:9` — o acoplamento é
entre dois órfãos.

Cenário de falha concreto: `pessoa_b` liga o celular depois de uma semana fora, o
Syncthing não rodou, e o Vault está desatualizado. O app abre normalmente e mostra dados
antigos como se fossem atuais. Não existe nenhum lugar em Configurações onde ela possa
verificar quando o Vault sincronizou pela última vez, nem descobrir que há conflito em
`.stversions/`. `docs/ADRs/0002-sync-delegado.md:14` afirma que o mobile *"só observa
status e mostra na UI"* — a segunda metade da frase não acontece.

### O agravante da duplicação — com uma correção ao enquadramento

O achado registrou que `src/components/screens/IntegracoesScreen.tsx:244` reimplementou os
thresholds à mão em vez de reusar o serviço. A verificação confirma a duplicação dos
**números**, mas o comentário do próprio código explica que a semântica é diferente
(`IntegracoesScreen.tsx:243-247`):

```tsx
// Texto humano para "Última sincronizacao". Calculo manual em
// thresholds proximos a descreverDelta de syncStatus.ts (60s, 30min,
// 6h) pra manter consistencia visual com o CardStatus do Settings.
// Independente daquele util porque a copy ali diz "Atualizado" e
// aqui dizemos "Sincronizado".
```

`textoUltimaSync` (`:248`) descreve a **última sincronização de uma integração** (epoch em
milissegundos vindo do store); `descreverDelta` (`syncStatus.ts:110`) descreve o **mtime da
pasta do Vault**. São medidas de coisas distintas que compartilham a mesma escala de
tempo. O defeito real é os cortes de 60 s / 30 min / 6 h existirem escritos duas vezes em
lugares que precisam concordar visualmente — não que uma função esteja reimplementando a
outra. Registrado aqui para que a execução não parta de premissa errada e tente forçar uma
consolidação que quebraria a copy.

## Ligar ou remover

**Recomendação: LIGAR.**

Justificativa:

1. O app inteiro se apoia em sync delegado (ADR-0002): não há servidor, não há telemetria,
   e a integridade dos dados do casal depende do Syncthing ter rodado. Saber se o Vault
   está fresco não é enfeite — é o único sinal de saúde do modelo de dados.
2. A detecção de conflito via `.stversions/` já está implementada e não tem substituto em
   nenhum outro lugar do app. Remover é apagar a única deteção de conflito de sync que
   existe.
3. O custo é de aproximadamente 25 linhas: `useState` + `useEffect` chamando
   `verificarSyncStatus(vaultRoot)` numa seção existente, renderizando `<CardStatus>` já
   pronto e já testado.

Onde renderizar — decisão: **`app/settings/vault.tsx`**, na seção "Pasta atual"
(`app/settings/vault.tsx:92-94`). É a tela dedicada ao Vault, alcançável por
`app/settings/index.tsx:199`, e o card fica ao lado da informação da pasta a que ele se
refere. Alternativa descartada: `app/settings/index.tsx`, que já é longo e cujo topo é de
identidade das pessoas, não de armazenamento.

## Escopo (mínimo)

1. Renderizar `<CardStatus>` em `app/settings/vault.tsx`, dentro da seção "Pasta atual",
   alimentado por `verificarSyncStatus(vaultRoot)` em `useEffect`. Estado de carregamento
   e de vault não autorizado precisam ter render próprio (a função já devolve
   `'desconhecido'` em web e vermelho com `ultimaModificacao: null` quando o diretório não
   existe).
2. Extrair os cortes de tempo (60 s / 30 min / 6 h) para um único lugar compartilhado e
   consumido pelos dois textos — `descreverDelta` em `syncStatus.ts:110` e
   `textoUltimaSync` em `IntegracoesScreen.tsx:248` —, **preservando as duas copies
   distintas** ("Atualizado" para o Vault, "Sincronizado" para integração). Consolidar os
   números, não as frases. Verificar se `src/lib/datetime/haRelativo.ts` (que já se declara
   relacionado a `syncStatus.descreverDelta` no comentário `:8`) é o lugar certo antes de
   criar módulo novo.
3. Adicionar cobertura Jest para `verificarSyncStatus` — hoje ela é a única função pública
   do arquivo sem nenhum teste, inclusive o caminho de conflito `.stversions/`.
4. Atualizar `docs/FEATURES-CANONICAS.md`: registrar o card de status de sync do Vault na
   seção de Configurações / Vault, com as três cores e o significado de cada uma.
5. Caso E2E em `tests/e2e/playwright/audit-p2-7-syncstatus-m15.e2e.ts`, copiado de
   `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: em
   `/settings/vault`, o card de status existe e sua cor/texto mudam conforme o estado do
   vault mock (com vault configurado versus sem vault). Presença estática não basta.
6. NÃO-objetivo: chamar a API do Syncthing. A heurística é local por decisão do ADR-0002 e
   continua local.
7. NÃO-objetivo: alterar o comportamento de `IntegracoesScreen` além da consolidação dos
   cortes numéricos do item 2.
8. NÃO-objetivo: criar UI de resolução de conflito. Esta sprint mostra que existe
   conflito; resolver é outra sprint.

## Proof-of-work

```bash
# 1. Antes: servico sem caller e componente sem render
grep -rn "verificarSyncStatus" --include="*.ts" --include="*.tsx" src app tests   # 1 hit
grep -rn "<CardStatus" --include="*.tsx" src app                                  # 0 hits

# 2. Depois: ambos ligados
grep -rn "verificarSyncStatus" --include="*.tsx" app/settings/vault.tsx           # >= 1 hit
grep -rn "<CardStatus" --include="*.tsx" app src                                  # >= 1 hit

# 3. Thresholds em um lugar so'
grep -rn "30 \* 60 \* 1000\|6 \* 60 \* 60 \* 1000" --include="*.ts" --include="*.tsx" src app
# esperado: definidos uma vez, importados nos dois consumidores

# 4. Gates do projeto
npx tsc --noEmit                                     # exit 0
npm test -- syncStatus                               # verde, agora cobrindo verificarSyncStatus
npm test -- CardStatus                               # verde
./scripts/smoke.sh                                   # verde

# 5. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> Vault
# esperado: card de status visivel na secao "Pasta atual", com cor e texto coerentes
# screenshots em docs/sprints/AUDIT-P2-7-SYNCSTATUS-M15-screenshots-gauntlet/
```

Nota de plataforma: em web o serviço devolve `'desconhecido'` por design
(`syncStatus.ts:11-13`). O Gauntlet valida o render e os estados; a verificação da
heurística de `mtime` real e do `.stversions/` exige Nível B (emulador) ou Nível C
(celular), recomendado como checkpoint de fecho.

## Commit

```
feat: audit-p2-7 renderiza card de status de sync do vault e consolida thresholds
```
