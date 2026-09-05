# Auditoria 2026-07-28 — índice e ordem de execução

```
STATUS:     materializada 2026-07-28
ESCOPO:     varredura completa do repositório em 9 frentes independentes
            (build/testes, mocks, código não integrado, integrações externas,
            roadmap vs código, bugs de lógica, cobertura, segurança/privacidade,
            conformidade de UI), com verificação independente dos achados de
            maior impacto antes da materialização.
RESULTADO:  39 sprints. Nenhuma linha de código foi alterada nesta onda.
```

## Leitura em uma página

O projeto **não sofre de descuido — sofre de desconexão**. Quase todo achado sério
tem a mesma forma: a peça existe, está bem construída, tem teste verde, e não está
ligada em nada. Isso vale para o código (boot hook, OAuth, pipeline de stats) e vale
para os próprios mecanismos de qualidade (CI gate, validador PT-BR, detector de
fantasmas, suíte E2E).

O rigor declarado no arquivo de regras da raiz é real e foi genuinamente executado. O que falhou foi
a **última milha de cada mecanismo**: o `push`, o `BOOT_HOOKS.push`, o `required check`,
o `|| exit 1`.

Duas evidências de que isso não é desleixo:

- De 15 sprints declaradas concluídas, **zero** são falso-concluídas. O drift é
  unidirecional: o projeto subdeclara o que entregou.
- `tsc --noEmit` limpo, 3351 testes passando, zero segredos versionados, zero mockups
  vivos, OAuth com PKCE e `state` validado, 139/139 `Pressable` acessíveis.

## Ordem de execução recomendada

### Fase 0 — parar a hemorragia (fazer antes de qualquer código)

| Sprint | Por quê agora |
|---|---|
| `AUDIT-P0-1-RASTREABILIDADE-GIT` | **Resolvida (2026-07-29).** Os 599 commits estão num bundle git anexado à release `arquivo-2026-07-28` do repositório privado. Os specs seguem parcialmente versionados **por decisão de compliance**, não por descuido. |
| `AUDIT-P0-2-BRAND-3-COMMIT` | Sprint pronta e não commitada; um `git clean` a apaga e o `FEATURES-CANONICAS` seguiria afirmando que existe. |
| `AUDIT-P0-3-ALLOWBACKUP` | Uma linha em `app.json`. Maior retorno por caractere de toda a fila. |

### Fase 1 — dado do usuário

Ordem interna livre; todas são independentes exceto o par do widget.

| Sprint | Natureza |
|---|---|
| `AUDIT-P1-2-DIASENTRE-FUSO` | Dano **permanente** (recorde inflado por `Math.max`). Corrigir antes que mais instalações acumulem. |
| `AUDIT-P1-1A-WIDGET-TODO-DRENO` | Para a perda de dado da fila. Mergeável sem device. |
| `AUDIT-P1-1B-WIDGET-TODO-REMOTEINPUT` | Depende da 1A. Exige rebuild de dev-client e validação Nível C. |
| `AUDIT-P1-5-MIGRACAO-FLAG-INCONDICIONAL` | Registro do usuário some sem erro nem log. |
| `AUDIT-P1-4-AGENDA-EVENTO-DUPLICADO` | Duplicata permanente; inclui limpeza do que já foi criado. |
| `AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA` | `cancelarAlarme` já está importada no arquivo. |
| `AUDIT-P1-6-BIOMETRIA-RELOCK` | Maior que aparenta: esbarra em 4 pontos do slice `privacidade`. |
| `AUDIT-P1-7-BUGS-MEDIOS` | Quatro defeitos pequenos e independentes. |
| `AUDIT-P1-8-STORES-MERGE-A47` | Preventiva: sem dano hoje, guard ausente onde a armadilha já mordeu uma vez. |

### Fase 2 — gates, antes de abrir frente nova

Sequência importa. Cada spec declara o tamanho do buraco que abre.

1. `AUDIT-P3-1-REQUIRED-CHECK` — liga o dente no rigor atual; **não** deixa o CI vermelho.
   Atenção: `scripts/setup-branch-protection.sh:53` já existe e, rodado como está,
   **trava todos os merges** (inclui um check que só dispara em tag).
2. `AUDIT-P3-3-ESLINT-REACT-HOOKS` — remove o erro único; 492 sítios nunca analisados
   entram como `warn`.
3. `AUDIT-P3-2-SMOKE-ESLINT-BLOQUEIA` — **este é o que fica vermelho** (23 problemas).
4. `AUDIT-P3-9-TEMPLATE-E2E-INEXISTENTE` — **Resolvida (2026-09-05).** A referência
   da fonte da verdade já tinha sido corrigida em `52b69b1`; esta passada fechou o
   resíduo versionado (`R-BRAND-8-RITUAIS`), constatou que o `VALIDATOR_BRIEF.md` do
   escopo 3 não existe neste repositório e registrou no spec por que os 17 specs não
   versionados que ainda citam o caminho morto ficaram fora.
5. `AUDIT-P3-8-HOOKS-DORMENTES` — atrito local incremental.
6. `AUDIT-P3-5-FANTASMAS-GATE`, `AUDIT-P3-6-VALIDADOR-PTBR-ARG-POSICIONAL`,
   `AUDIT-P3-7-COVERAGE-E-PERSIST` — independentes entre si.
7. `AUDIT-P3-4-E2E-NO-CI` — smoke em PR + suíte noturna; expõe ~35 falhas reais.

### Fase 3 — ligar ou remover o que está construído

Seis recomendam **LIGAR**, duas **REMOVER**, uma é mista.

| Sprint | Recomendação |
|---|---|
| `AUDIT-P2-9-SETTINGS-SOBRE-DUPLICADO` | LIGAR — contém a atribuição **CC BY 4.0** das trilhas do Recap, hoje não satisfeita no app. Obrigação de licença, não estética. |
| `AUDIT-P2-2-CALENDAR-AUTOSYNC-TOGGLE` | LIGAR — expõe a chave que falta; a sprint R-INT-2 inteira depende dela. |
| `AUDIT-P2-1-SPOTIFY-YOUTUBE-ENTRADA` | LIGAR — YouTube é 100% wiring; Spotify espera credencial do dono. |
| `AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO` | LIGAR o agendamento — hoje a UI promete o que o código não faz. |
| `AUDIT-P2-4-STATS-PIPELINE` | LIGAR — os 4 arquivos são contrato com o repositório irmão. |
| `AUDIT-P2-7-SYNCSTATUS-M15` | LIGAR — feedback central do modelo de sync. |
| `AUDIT-P2-8-BOTAOMARCAR-SF3` | LIGAR — o caso de uso primário de R-SF-3 não existe na UI. |
| `AUDIT-P2-5-TOGGLE-MORTO-CONQUISTAS` | REMOVER — UI que mente. |
| `AUDIT-P2-10-ORFAOS-LIMPEZA` | Misto — 3 remover, 2 preservar. Um item exige decisão do dono. |

### Fase 4 — higiene

`AUDIT-P4-1-DEPS-SDK54` primeiro (risco de build nativo real), depois em qualquer ordem:
`P4-2` (4 linhas), `P4-3`, `P4-4`, `P4-5`, `P4-6`, `P4-7`, `P4-8`, `P4-9`.

## Decisões que dependem do dono

Nenhuma destas pode ser resolvida no código:

1. ~~**`ROADMAP.md`/`CHANGELOG.md`**~~ — **decidido em 2026-07-29: descontinuados.**
   Não recriar; o rastreamento vive em `docs/sprints/`. As versões antigas seguem no
   bundle da release privada. `AUDIT-P0-1`.
2. **Branch protection** — ligar `quality-gate` como required é ação no GitHub, não commit.
   `AUDIT-P3-1`.
3. **Credencial do Spotify** — a chave não existe nem no `env.json.example`. `AUDIT-P2-1`.
4. **Benchmark C2 (`>=45fps` no device)** — bloqueia R-BRAND-4…9 independentemente do
   commit do glifo. `AUDIT-P0-2`.
5. **Timeout de re-lock da biometria** — default proposto 60 s. `AUDIT-P1-6`.
6. **`FiltrosBar`** — removê-la sela uma porta de produto (os 5 filtros de conquista
   nunca ganharam controle de usuário). `AUDIT-P2-10`.
7. **`app/todo.tsx`** — 6 símbolos não usados formam uma feature desplugada; deletar ou
   religar é decisão de produto. `AUDIT-P3-2`.
8. **Verificação OAuth do Google (`R-SEC-1`)** — pendência humana já registrada no
   `STATE.md:325`, bloqueia o escopo real do Drive. `AUDIT-P2-3`.

## Correções que a materialização fez no diagnóstico

Registradas porque contradizem afirmações anteriores e não devem ser reintroduzidas:

- **Finanças não é código morto.** `M35-spec.md:79-80` diz literalmente "**Não apagar**
  componentes auxiliares de finanças — ficam disponíveis para retomada futura".
- **Stats agregadas têm leitor.** Não são lidas por nenhuma tela, mas são contrato
  declarado com o repositório irmão (`CONTRACT-MOBILE-BACKEND.md` §5.28–5.31).
- **`OuroborosLogo` é trabalho ativo**, não órfão — `R-BRAND-9-MIGRACAO-spec.md:165-175`
  já é dona da decisão.
- **`ROADMAP.md`/`CHANGELOG.md` não estão perdidos** — sobrevivem no bundle git da release privada `arquivo-2026-07-28` (antes: branch local).
- **`r-ci-e2e-web` está 0 commits à frente** — não há código a recuperar ali, só a spec.
- **Reduce-motion cobre 1 de 45 arquivos com `MotiView`**, não 11 — dos 11 "cobertos",
  10 usam primitivos Reanimated crus.
- **`.github/dependabot.yml` já tem `ignore`**, mas só para `react-native`/`expo` puros,
  não para a família `expo-*`.
- **`BOOT_HOOKS` registra 15 hooks**; o cabeçalho de `reagendamento.ts:5-11` diz 5 e
  lista 6.
- **`js-yaml` é falso positivo** — só entra via toolchain; o vault usa `yaml@2.8.3`, limpo.

## Rastreabilidade

Relatórios de origem, por frente, fora do repositório (diretório de trabalho da sessão):
`00-mapa-estrutural`, `01-build-testes`, `02-mocks-placeholders`, `03-nao-integrado`,
`04-integracoes`, `05-roadmap-fantasma`, `06-bugs`, `07-testes`, `08-seguranca`,
`09-ui-conformidade`, `CATALOGO-CONSOLIDADO`.

> **Atualizado em 2026-09-05.** Os specs desta onda **estão versionados** — 46
> arquivos `AUDIT-*.md`, incluindo este índice, aparecem em `git ls-files
> docs/sprints/`. O restante de `docs/sprints/` segue fora do controle de versão
> **por decisão de compliance** (só o conjunto aprovado vai ao público), e não por
> falta de execução. Nunca use `git add docs/sprints/`: em 2026-07-28 esse comando
> vazou 883 specs internos ao repositório público.
