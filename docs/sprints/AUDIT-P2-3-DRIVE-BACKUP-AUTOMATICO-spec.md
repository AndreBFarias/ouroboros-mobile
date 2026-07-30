# AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO — ligar o agendamento semanal que a UI já promete

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: alta (a UI afirma um comportamento que não existe; o toggle liga e nada
            acontece — é o mesmo defeito de "UI que mente" catalogado em [P2-5])
DEPENDE:    nenhuma no código. O upload real depende do passo humano
            R-SEC-1 (`docs/sprints/R-SEC-1-GOOGLE-OAUTH-VERIFICATION-spec.md`), ainda
            pendente segundo `STATE.md:325`
ORIGEM:     achados [P2-3] / [IN-03] da auditoria de 2026-07-28. Encontrado por varredura
            de exports sem consumidor em `src/lib/integracoes/`. Reverificado nesta
            materialização em `main @ b5bf2db`: `criarIntegracaoDriveBackup` tem 1 hit em
            `src/` (a própria definição) e nenhum em `app/`; só os testes o exercitam.
DECISAO:    (dono, 2026-07-29) ligar o agendamento semanal, confirmando a
            recomendação do spec. A alternativa de amenizar a copy para
            descrever um toggle sem efeito fica descartada.
```

## Problema (UI que mente)

A tela de contas Google faz uma afirmação factual ao usuário —
`app/settings/contas-google.tsx:266` e `:278`:

```tsx
Backup automático no Drive
...
Envia o ZIP do Vault para o seu Drive uma vez por semana.
```

seguida de um `<Toggle>` que grava `backupDriveAutomatico`
(`app/settings/contas-google.tsx:283-285`).

Nada envia nada uma vez por semana. Não existe agendador. O adaptador que existiria para
isso, `src/lib/integracoes/google/driveBackup.ts:338`, **não tem callers**:

```
$ grep -rn "criarIntegracaoDriveBackup" --include="*.ts" --include="*.tsx" src app
src/lib/integracoes/google/driveBackup.ts:338:export function criarIntegracaoDriveBackup(
```

Único hit: a própria definição. Os demais hits do repositório estão em
`tests/lib/integracoes/google/driveBackup.test.ts` — o adaptador é testado e nunca
executado.

O próprio código descreve um wiring que não existe —
`src/lib/integracoes/google/driveBackup.ts:333-337`:

```ts
// DORMENTE por design: o wiring (app/_layout.tsx) so injeta esta
// integracao no array do scheduler quando featureToggles
// .backupDriveAutomatico === true E o throttle semanal
// (driveBackupUltimaSync) permitir.
```

`app/_layout.tsx:363` injeta **apenas** o Calendar:

```tsx
const r = await orquestrarIntegracoes([integracao]);
```

onde `integracao` vem de `criarIntegracaoCalendar` (`app/_layout.tsx:347`). O array tem um
elemento só, e nunca o do Drive.

O contador de throttle confirma: `driveBackupUltimaSync` só é escrito pelo caminho manual
(`src/lib/stores/settings.ts:423`, acionado por `app/settings/contas-google.tsx:169`).
Nenhum agendador o lê para decidir se já passou uma semana.

### A mentira se propaga para o hub

`src/components/screens/IntegracoesScreen.tsx:595` repete a afirmação como se fosse estado:

```tsx
: driveBackupToggle
  ? 'Backup automático ligado. Envia o ZIP do Vault toda semana.'
  : 'Backup automático desligado. Ligue em Contas Google.'
```

Cenário de falha concreto: `pessoa_a` conecta a conta Google, liga o toggle, lê "Backup
automático ligado. Envia o ZIP do Vault toda semana.", e confia nisso. Passam seis meses.
O celular é perdido. Não existe backup nenhum no Drive — nenhum upload jamais foi
disparado. O único caminho que realmente envia é o botão "Fazer agora"
(`IntegracoesScreen.tsx:379` e `app/settings/contas-google.tsx:169`), que o usuário nunca
teve razão para tocar, já que o app dizia que o automático estava ligado.

## Ligar ou remover

Este achado tinha duas saídas honestas: **ligar o agendamento** ou **corrigir o texto para
descrever a realidade** (um botão manual e um toggle sem efeito).

**Recomendação: LIGAR o agendamento. Decisão do dono, 2026-07-29: LIGAR —
confirmada.** Reescrever a copy para descrever um toggle sem efeito está descartado e não
volta à mesa no passo 0 da execução.

Justificativa:

1. Trocar o texto não resolve, apenas troca de defeito. Restaria um `<Toggle>` que grava
   uma chave que nenhum código lê — exatamente o achado [P2-5]
   (`calendarioConquistas`), que esta mesma onda recomenda remover. Duplicar o
   antipadrão para "consertar" outro é regressão.
2. O custo de ligar é pequeno e simétrico a código que já roda: o `useEffect` de
   `app/_layout.tsx:328-399` já orquestra integrações no boot e a cada foreground, já tem
   throttle e já trata erro; falta empurrar um segundo elemento no array.
3. O adaptador está construído, tem suíte Jest (`tests/lib/integracoes/google/
   driveBackup.test.ts:258-262`) e mapeia corretamente `jaExistia` e no-ops graciosos
   para "sem erro".
4. A perda em jogo é backup do diário do casal. Entre "app que promete e não faz" e "app
   que faz", a segunda opção é a única compatível com a promessa que já está impressa na
   tela.

### Dependência humana: R-SEC-1

`docs/sprints/R-SEC-1-GOOGLE-OAUTH-VERIFICATION-spec.md` existe no repositório (tipo
"docs + cloud-config", tranche R-SEC, fase 4) e trata da configuração do consent screen no
Cloud Console — manter em Testing mode com testers explícitos, submissão para verificação
descopada. `STATE.md:325` a lista entre as **pendências humanas inalteradas**, e
`docs/sprints/R-INT-5-DRIVE-HUB-ATIVO-spec.md:22` já registra o mesmo bloqueio para o
Drive. O código o cita em dois lugares:
`src/lib/integracoes/google/driveBackup.ts:337` e
`src/components/screens/IntegracoesScreen.tsx:591-593`
(*"o upload runtime aguarda o registro do scope no Cloud Console (passo humano R-SEC-1)"*).

Consequência para esta sprint: o wiring pode e deve entrar; o upload só passa a funcionar
de fato depois que o dono concluir R-SEC-1. **Enquanto R-SEC-1 estiver pendente, o texto
da UI não pode afirmar que o envio acontece.** Ver item 4 do Escopo.

## Escopo (mínimo)

Decisão do dono (2026-07-29): **ligar o agendamento semanal**. O item 4 abaixo não é a
alternativa descartada de "amenizar o texto": é o complemento obrigatório de honestidade
enquanto R-SEC-1 estiver pendente, sobre uma copy que já descreve um envio que agora
passa a existir.

1. Em `app/_layout.tsx`, dentro do `useEffect` que já orquestra integrações
   (`:328-399`), montar o array condicionalmente: além do Calendar (guardado por
   `googleCalendarSync`), incluir `criarIntegracaoDriveBackup(vaultRoot, agora, pessoa)`
   quando `featureToggles.backupDriveAutomatico === true` **e** o throttle semanal contra
   `driveBackupUltimaSync` permitir (7 dias).
2. No sucesso da rodada do Drive, gravar `setDriveBackupUltimaSync` — sem isso o throttle
   nunca fecha e o upload repete a cada foreground.
3. Cuidado explícito: `podeDisparar()` em `app/_layout.tsx:333` hoje faz early-return por
   `googleCalendarSync`. O gate do Drive é **independente**; não pode ficar aninhado sob
   o gate do Calendar, ou o achado [P2-2] passa a bloquear também o backup. Separar os
   dois gates é requisito, não detalhe.
4. Alinhar a copy ao estado real enquanto R-SEC-1 estiver pendente: em
   `app/settings/contas-google.tsx:278` e em `IntegracoesScreen.tsx:595`, o texto deve
   descrever o envio semanal **e** sinalizar quando o envio ainda não está autorizado no
   Cloud Console, em vez de afirmar sucesso incondicional. Sem exclamação, sentence case,
   acentuação completa.
5. Atualizar `docs/FEATURES-CANONICAS.md`: o bloco do Google Drive no hub (`:488-489`)
   ainda descreve "(futura) — placeholder, badge Em breve, desabilitado", o que já
   estava atrasado antes desta sprint (o backup manual funciona desde R-INT-5).
   Registrar backup manual, backup automático semanal e a dependência de R-SEC-1.
6. Caso E2E em `tests/e2e/playwright/audit-p2-3-drive-backup-automatico.e2e.ts`, copiado
   de `tests/e2e/playwright/e2e-template.ts`. Assert de comportamento: com
   `backupDriveAutomatico` ligado via `__gauntlet`, o texto do card do Drive em
   `/integracoes` reflete o estado real (ligado com ressalva de autorização pendente) e
   não a afirmação incondicional atual.
7. NÃO-objetivo: implementar `restaurar do Drive`. O card hoje rotulado "Google Drive"
   restaura o ZIP **local** (`IntegracoesScreen.tsx:415`) — divergência registrada na
   auditoria como achado separado, fora deste escopo.
8. NÃO-objetivo: executar R-SEC-1. É passo humano no Cloud Console.
9. NÃO-objetivo: remover o `export` desnecessário de `driveHttpReal`
   (`driveBackup.ts:197`, usado só internamente em `:321`). Órfão trivial, catalogado em
   [NI-16].

## Proof-of-work

```bash
# 1. Antes: adaptador sem caller de producao
grep -rn "criarIntegracaoDriveBackup" --include="*.ts" --include="*.tsx" src app
# esperado antes: 1 hit (a definicao em driveBackup.ts:338)

# 2. Depois: injetado no orquestrador
grep -rn "criarIntegracaoDriveBackup" --include="*.tsx" app/_layout.tsx      # >= 1 hit

# 3. Os dois gates sao independentes (Drive nao herda o early-return do Calendar)
grep -n "googleCalendarSync\|backupDriveAutomatico" app/_layout.tsx
# esperado: as duas chaves aparecem em ramos separados, nao encadeados

# 4. O throttle semanal fecha o ciclo
grep -n "setDriveBackupUltimaSync" app/_layout.tsx                          # >= 1 hit

# 5. Gates do projeto
npx tsc --noEmit                                                            # exit 0
npm test -- driveBackup                                                     # verde
./scripts/smoke.sh                                                          # verde

# 6. Validacao visual obrigatoria (sprint toca UI): Gauntlet Nivel A+
./gauntlet.sh
# navegar: Configuracoes -> Contas Google -> ler a copy do bloco de backup automatico
# e /integracoes -> card Google Drive
# screenshots em docs/sprints/AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO-screenshots-gauntlet/
```

Checkpoint Nível C (celular físico) recomendado no fecho: o upload real toca rede e conta
Google, e só é observável fora do Gauntlet — mas apenas depois de R-SEC-1 concluído.

## Commit

```
feat: audit-p2-3 injeta backup drive semanal no orquestrador e alinha copy ao estado real
```
