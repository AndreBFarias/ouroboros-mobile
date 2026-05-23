# R-INFRA-WORKTREE-BOOTSTRAP-ENV-JSON — Robustecer bootstrap de worktree (symlinks obrigatórios)

**Tipo**: infra (robustecer bootstrap + diagnóstico)
**Prioridade**: P2-medium
**Estimativa**: 30min
**Fase**: 3 (DX)
**Origem**: ressalva validador na sprint PASSOS (2026-05-22). Bootstrap incompleto em worktree custou ~3min de validação investigando anomalia de smoke que era apenas symlink `env.json`/`.env` ausentes. Segunda vez que essa anomalia aparece em ondas recentes.

## Contexto

`scripts/bootstrap-worktree.sh` (Sprint r-infra-worktree-bootstrap, 2026-05-17) já existe e cria symlinks idempotentes para `node_modules`, `env.json` e `.env`. `hooks/post-checkout` dispara o script em branch checkout. `scripts/smoke.sh` linhas 13-15 também chama o bootstrap como fallback.

Mesmo assim, em certos cenários os symlinks `env.json` e `.env` ficam ausentes no worktree, levando a 6 suítes Jest "falsamente vermelhas" (`googleAuth`, `calendarApi`, `spotify`, `youtube`, `googleAuthFlow`, `agenda`) porque o `tsconfig.json` resolve `env.json` no root e cai em arquivo ausente.

Hipóteses de raiz (a investigar):

1. Worktree criado via harness Claude Code direto (sem `git worktree add` no shell) pode pular o hook `post-checkout`.
2. `smoke.sh` linha 14 chama bootstrap com `> /dev/null 2>&1 || true` — silencia diagnóstico se origem ausente.
3. Bootstrap atual usa `exit 0` em todos branches falhos (lições "no-op silencioso" enraizadas) — não distingue "fora de worktree" (legítimo) de "worktree mas origem ausente" (anomalia que merece ruído).

## Escopo (touches autorizados)

**Arquivos a modificar:**

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/bootstrap-worktree.sh` — endurecer validações + diagnóstico claro
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/smoke.sh` — opcionalmente remover supressão `2>&1` do bootstrap (ou trocar por captura em log) para que erros apareçam
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md` — §3 (Convenções de Estrutura) ou §4 (Armadilhas) com lição "bootstrap symlinks 3 obrigatórios" (nova armadilha A38 ou nota em §3)

**Arquivos a criar:** nenhum.

**Arquivos NÃO a tocar:**

- `hooks/post-checkout` (lógica de disparo já está correta; problema é robustez do bootstrap em si)
- Qualquer arquivo em `src/`, `app/`, `modules/`
- Testes Jest existentes
- `package.json`, `tsconfig.json`, `metro.config.js`

## Acceptance criteria

1. **AC-1 — Cobertura completa.** `scripts/bootstrap-worktree.sh` cria (ou tenta criar) os 3 symlinks: `node_modules`, `env.json`, `.env`. Comportamento atual já cobre os 3 — confirmar via re-leitura ou ampliar se algum está condicional.
2. **AC-2 — Diagnóstico ruidoso quando anômalo.** Se rodando em worktree (`$TOPLEVEL` contém `.claude/worktrees/`) e a origem de `env.json` no main repo NÃO existe, o script emite mensagem clara em stderr (`ERRO: env.json ausente no main repo em <path>; impossível criar symlink`) e retorna exit code != 0. Mesma regra para `node_modules`. `.env` permanece opcional (gitignored, pode legitimamente não existir).
3. **AC-3 — Idempotência preservada.** Rodar `./scripts/bootstrap-worktree.sh` duas vezes seguidas em worktree saudável retorna exit 0 sem alterar nada nem emitir AVISO.
4. **AC-4 — No-op fora de worktree.** Fora de `.claude/worktrees/`, script continua exit 0 silencioso (compatibilidade com hook post-checkout no main repo).
5. **AC-5 — Smoke propaga diagnóstico.** `scripts/smoke.sh` chama bootstrap de forma que falhas de validação (AC-2) virem visíveis ao operador — seja removendo `2>&1`, seja capturando em `/tmp/bootstrap-worktree.log` com aviso no stdout principal se exit != 0.
6. **AC-6 — Lição registrada.** `VALIDATOR_BRIEF.md` ganha entrada documentando os 3 symlinks obrigatórios + como diagnosticar (ex: "rode `ls -la node_modules env.json .env` no worktree; se algum é arquivo real ou ausente, rode bootstrap manualmente").

## Invariantes a preservar

- **Regra −1 (Anonimato).** Mensagens shell sem nome de IA. Sem acento em código `.sh` (convenção shell/CI, já documentada no script).
- **Regra de Linguagem.** Spec PT-BR com acentuação completa; script shell sem acento; VALIDATOR_BRIEF com acentuação completa.
- **Não quebrar workflow main repo.** Bootstrap deve continuar no-op silencioso quando `TOPLEVEL` não contém `.claude/worktrees/`. Hook `post-checkout` dispara em todo branch checkout do main; não pode poluir output.
- **Não introduzir dependência nova.** Apenas bash builtins + `git`, `ln`, `[[`, `cd` (já em uso).
- **Smoke determinístico.** Mudança em `smoke.sh` não pode aumentar tempo significativamente (<100ms overhead aceitável).

## Plano de implementação

### Passo 1 — Investigação (5min)

1.1 Re-ler `scripts/bootstrap-worktree.sh` linhas 47-68 com atenção: confirmar que branch `env.json` (linhas 57-62) NÃO tem ramo "else" — se origem ausente, script segue sem emitir nada, deixando worktree quebrado em silêncio.

1.2 Investigar via grep se algum outro lugar do projeto chama `bootstrap-worktree.sh` (CI, agentes, makefiles). Se sim, mapear chamadores antes de mudar API.

```bash
grep -rn "bootstrap-worktree" --include='*.sh' --include='*.md' --include='*.yml' --include='*.json'
```

1.3 Decidir: manter exit 0 sempre (compatibilidade total) e usar mensagem stderr para sinalizar, OU mudar para exit != 0 quando worktree + origem ausente. Hipótese de planejamento: **mudar para exit != 0 só quando dentro de worktree** (linha 31 já garante isolamento); fora de worktree continua exit 0.

### Passo 2 — Endurecer `bootstrap-worktree.sh` (10min)

2.1 Adicionar variável de controle `ERROS=0` no topo do escopo de worktree.

2.2 Bloco `node_modules` (linhas 47-54): se `$MAIN_REPO/node_modules` não existe E ainda não há symlink local, incrementar `ERROS` e emitir `ERRO: ...` em stderr (em vez de `AVISO`, que sugere recoverable).

2.3 Bloco `env.json` (linhas 57-62): adicionar ramo `else` quando `$MAIN_REPO/env.json` não existe. Incrementar `ERROS`, emitir `ERRO: env.json ausente no main repo em $MAIN_REPO; jest e tsc vão falhar` em stderr.

2.4 Bloco `.env` (linhas 65-68): manter comportamento atual (opcional, gitignored). Se origem ausente, no-op silencioso.

2.5 Após verificação de integridade (linhas 71-75), se `ERROS > 0`, `exit 1`; senão `exit 0`.

2.6 Atualizar bloco de comentário do topo (linhas 1-19) com nota: "Sprint r-infra-worktree-bootstrap-env-json (2026-05-22): exit != 0 dentro de worktree se symlink obrigatório (node_modules, env.json) não pôde ser criado."

### Passo 3 — Ajustar `smoke.sh` (5min)

3.1 Trocar linhas 13-15 para capturar saída do bootstrap em `/tmp/bootstrap-worktree.log` e emitir aviso visível se exit != 0:

```bash
if [[ -f scripts/bootstrap-worktree.sh ]]; then
  if ! bash scripts/bootstrap-worktree.sh > /tmp/bootstrap-worktree.log 2>&1; then
    echo "AVISO: bootstrap-worktree.sh sinalizou erro - veja /tmp/bootstrap-worktree.log"
    cat /tmp/bootstrap-worktree.log >&2
  fi
fi
```

3.2 Comentário acima atualizado mencionando a sprint nova.

### Passo 4 — Documentar em VALIDATOR_BRIEF (5min)

4.1 Localizar §3 (Convenções de Estrutura) ou §4 (Armadilhas Conhecidas) — usar grep linha 454 e 488. Decidir local com base no padrão: armadilhas A1-A37 já existem em §4 conforme MEMORY.md. Provável adicionar **A38 — Bootstrap de worktree incompleto**.

4.2 Conteúdo da A38:

```markdown
### A38 — Bootstrap incompleto de worktree (env.json/.env/node_modules ausentes)

**Sintoma:** Jest falha em 6 suítes (`googleAuth`, `calendarApi`, `spotify`, `youtube`, `googleAuthFlow`, `agenda`) com mensagens "Cannot find module 'env.json'" ou erros de resolução yaml.

**Causa:** worktree criado via API interna do harness Claude Code não dispara `hooks/post-checkout`, deixando os 3 symlinks obrigatórios (`node_modules`, `env.json`, `.env`) ausentes.

**Diagnóstico:** `ls -la node_modules env.json .env` no root do worktree. Se algum é arquivo real ou ausente, rode `bash scripts/bootstrap-worktree.sh` manualmente.

**Fix permanente:** Sprint R-INFRA-WORKTREE-BOOTSTRAP-ENV-JSON (2026-05-22) endureceu o bootstrap para exit != 0 em worktree quando símbolo obrigatório não pode ser criado, e smoke.sh agora propaga o erro.

**Histórico:** R-CRIT-4, T1B3, T1B6, sprint PASSOS — 10+ ocorrências antes do fix.
```

### Passo 5 — Validação local (5min)

5.1 Em main repo:
```bash
./scripts/bootstrap-worktree.sh && echo "exit=$?"
```
Esperado: exit 0 silencioso.

5.2 Criar worktree de teste, simular ausência de env.json:
```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
git worktree add .claude/worktrees/test-bootstrap
cd .claude/worktrees/test-bootstrap
rm -f env.json node_modules .env 2>/dev/null
bash scripts/bootstrap-worktree.sh
echo "exit=$?"
```
Esperado: 3 symlinks criados, exit 0, mensagens `OK: ...`.

5.3 Simular ausência de origem:
```bash
mv ../../../env.json ../../../env.json.bkp
rm -f env.json
bash scripts/bootstrap-worktree.sh
echo "exit=$?"
mv ../../../env.json.bkp ../../../env.json
```
Esperado: exit 1, stderr `ERRO: env.json ausente no main repo ...`.

5.4 Smoke no worktree:
```bash
./scripts/smoke.sh 2>&1 | head -20
```
Esperado: bootstrap silencioso quando ok; aviso visível quando bootstrap falha.

5.5 Limpar worktree de teste:
```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
git worktree remove .claude/worktrees/test-bootstrap
```

## Aritmética

- Arquivo alvo principal: `scripts/bootstrap-worktree.sh`
- Linhas atuais: 77L (medido em 2026-05-22)
- Delta esperado: +15 a +25L (variável `ERROS`, ramos `else` em `env.json`/`node_modules`, exit condicional, comentário de cabeçalho).
- Linhas projetadas após mudança: 92-102L.
- Meta: <120L (mantém legível, monolítico, sem necessidade de extração).

- Arquivo alvo secundário: `scripts/smoke.sh`
- Linhas atuais: 56L.
- Delta esperado: +5 a +8L (substituir bloco de 3L por bloco de ~8L com captura de log).
- Linhas projetadas: 61-64L.
- Meta: <80L.

- Arquivo alvo terciário: `VALIDATOR_BRIEF.md`
- Delta esperado: +20 a +30L (nova armadilha A38 com sintoma, causa, fix, histórico).

**Total geral:** ~40-65L delta líquido em 3 arquivos. Bate com estimativa "~30-50L delta em 1-2 arquivos" do prompt (BRIEF é doc, conta separado).

## Testes

- Não há suítes Jest específicas para bash scripts; validação é manual (Passo 5).
- Baseline esperado de Jest após sprint: **mesmo** baseline pré-PASSOS (sem regressão). Se PASSOS deixou baseline em 1126/130, manter 1126/130. Se as 6 suítes citadas eram "falsamente vermelhas" no worktree mas verdes no main, então no main devem permanecer verdes; no worktree, após bootstrap correto, também verdes.
- Adicionar checklist em proof-of-work: "Rodei `npm test` em worktree fresh com bootstrap aplicado; baseline igual ao main."

## Proof-of-work esperado

- Diff final dos 3 arquivos (`scripts/bootstrap-worktree.sh`, `scripts/smoke.sh`, `VALIDATOR_BRIEF.md`).
- Saída literal dos 4 cenários do Passo 5 (5.1, 5.2, 5.3, 5.4), com `exit=N` capturado.
- Confirmação de que worktree de teste foi limpo (`git worktree list` sem `test-bootstrap`).
- Acentuação periférica: rodar `python3 scripts/check_strings_ui_ptbr.py` (smoke já cobre), sem novas violações.
- Anonimato: `./scripts/check_anonimato.sh` exit 0 nos 3 arquivos modificados.
- Hipótese verificada (lição 4): grep confirmou que `bootstrap-worktree.sh`, `smoke.sh` e `hooks/post-checkout` existem com paths absolutos citados; confirmou que `MAIN_REPO=$(cd ../../.. && pwd)` é a lógica atual de resolução do main repo a partir do worktree.

## Riscos e não-objetivos

- **Risco 1 — Quebrar CI/agentes externos.** Se algum CI chama `bootstrap-worktree.sh` esperando exit 0 incondicional, exit 1 novo pode quebrá-lo. Mitigação: Passo 1.2 (grep antes), e exit 1 apenas dentro de worktree (linha 31 já isola).
- **Risco 2 — Hook post-checkout disparar erro visível no main repo.** Mitigação: linha 31 garante no-op silencioso fora de worktree. Hook continua exit 0 (tolerante a falhas por design).
- **Risco 3 — Diagnóstico ainda insuficiente.** Se o problema original foi "harness Claude Code não roda hooks", então mesmo bootstrap robusto não dispara automaticamente em worktree novo. Mitigação fora de escopo: documentar na A38 que "se você criou worktree e Jest cai em 6 suítes, rode manualmente `bash scripts/bootstrap-worktree.sh` antes de qualquer outra coisa".
- **Não-objetivo:** alterar `hooks/post-checkout` (já correto). Se necessário forçar disparo programático em harness, é sprint separada.
- **Não-objetivo:** mexer em `tsconfig.json` para não depender de `env.json` (fora de escopo; é integração estrutural com Google OAuth).
- **Não-objetivo:** investigar por que o harness Claude Code pula hooks (fora de controle do projeto).

## Referências

- BRIEF: `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md` (§4 Armadilhas A1-A37; nova A38 a ser adicionada)
- Sprint precedente: `docs/sprints/R-INFRA-GAUNTLET-WORKTREE-SYMLINK-spec.md` (sprint irmã sobre Gauntlet em worktree; complementar mas não sobreposta — esta sprint trata symlinks de bootstrap, aquela trata `require.context` do expo-router)
- Sprint original do bootstrap: `r-infra-worktree-bootstrap` (commit 2026-05-17) — base que esta sprint endurece
- Sprint original do fallback no smoke: `r-infra-worktree-env-symlink` (2026-05-21, citada em `smoke.sh` linha 9)
- Histórico do problema: MEMORY.md entrada `feedback_audit_pre_dispatch.md` + sprint PASSOS (2026-05-22) — origem direta deste spec
- Lição operacional: `~/.claude/CLAUDE.md` GUIDE §4 "Execução Focada em Objetivos" — critério de sucesso: bootstrap nunca mais aceita worktree quebrado em silêncio.
