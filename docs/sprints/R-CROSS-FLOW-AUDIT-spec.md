# R-CROSS-FLOW-AUDIT — Auditoria de interconexão entre fluxos do app

**Tipo**: audit + fix (correções localizadas conforme achados)
**Prioridade**: P1-high
**Estimativa**: 4-6h
**Tranche**: R-AUDIT (nova, derivada do pedido durável do dono em 2026-05-15)
**Fase**: 2 (UX — bloqueia rc2)

## Fonte canônica

Pedido do dono em 2026-05-15: "precisamos validar pra ver se o app
tá interconectado tipo o problema da camera ou de features que
funcionam no menu x e não no y."

## Objetivo

Auditar **fluxos cruzados** entre features pra detectar quebras
de interconexão: ponto A entrega a, ponto B entrega b, mas A→B
não conecta o que deveria. Lista canônica de fluxos abaixo, todos
percorridos no celular real via ADB+logcat e validados.

## Fluxos canônicos a auditar (12 cenários)

### Captura cruzada

1. **FAB Câmera vs FAB+ Saúde Física**: foto capturada via FAB
   Câmera (Tela Hoje) → aparece em `/galeria`? E na timeline da
   Saúde Física? E no Recap > Memórias?
2. **FAB Câmera vs Reflexão com foto** (R-FAB-2 pós): foto via
   "Reflexão com foto" → companion `.md` referencia foto? Foto
   aparece em `/galeria`?
3. **MicrofoneButton em Reflexão vs Diário** (pós R0): áudio
   gravado no atalho Reflexão → texto transcrito vai pro mesmo
   arquivo `.md` do diário?
4. **Scanner OCR vs Galeria**: nota fiscal escaneada → aparece
   em `/galeria` com tag financeiro?

### Persistência cruzada

5. **Tarefa marcada como concluída na Home vs `/tarefas`**:
   checkbox inline (R-HOME-3) → persiste em `tarefas/<slug>.md`?
   Reabrir `/tarefas` reflete?
6. **Humor registrado vs Recap**: humor de hoje → aparece no Recap
   > Lista do dia + Números (count 1)?
7. **Conquista anexada com foto vs Saúde Física > Evolução**:
   marco com `medidaRef` → aparece como card em Evolução?

### Configuração cruzada

8. **Toggle Health Connect vs sync real**: liga toggle → próximo
   treino salvo → aparece em Samsung Health? (Q17 + R-INT-3)
9. **Onboarding nomes vs telas com nomes**: muda nome em Settings
   → `useNomeDe('pessoa_a')` reativo em todas as telas?
10. **Toggle backup auto (D6) vs scheduler**: liga toggle → boot
    hook agenda? Após 7 dias, dispara?

### Integração com sibling desktop

11. **Mobile escreve .md vs ETL Python lê**: mobile salva humor →
    `protocolo-ouroboros` (Python sibling) consegue ler via ETL?
    Drift contract Q21 (174 campos) cobre tudo?
12. **Frontmatter compatível**: schemas v2 (pós-Onda Q) ainda
    decodificam no parser do sibling? Migração lexical (pós R0)
    preserva backward-compat?

## Entregáveis

### Parte 1 — Relatório auditoria

`docs/auditoria-cross-flow-2026-MM-DD/RELATORIO.md`:
- Tabela com 12 cenários × 4 colunas (cenário / esperado /
  observado / status)
- Status: OK / FAIL / SUSPEITO
- FAILs viram sprints corretivas (anti-débito automático)

### Parte 2 — Correções de FAILs

Para cada FAIL detectado:
- Se cirúrgico (1-2 arquivos): aplica direto nesta sprint
- Se invasivo (3+ arquivos OU regressão de schema): cria sprint
  nova `R-CROSS-FLOW-FIX-<id>` e marca FAIL como "sprint
  derivada"

### Parte 3 — Validação via ADB+logcat

Cada cenário tem comando ADB documentado pra reproduzir + grep
no logcat pra detectar erro silencioso.

### Parte 4 — Cross-repo audit (sibling Python)

Para fluxos 11+12:
- `cd ../protocolo-ouroboros && ./run.sh` (lê do Vault Syncthing)
- Validar que ETL lê todos os tipos novos da Onda Q + Onda R
- Reportar drift de schema (Q21 contract precisa cobrir os campos
  novos)

## Dependências

- **Bloqueia**: F1 (não pode field-testar com bug de interconexão
  ainda desconhecido)
- **Bloqueado por**: R-CRIT-3 (mídia ausente — mesma raiz suspeita
  de vários fluxos)

## OFF-LIMITS

Padrão T1. **Pode tocar**: qualquer arquivo `src/` ou `app/`
para fix cirúrgico (1-2 arquivos por fluxo). Fix invasivo
escala para sprint derivada.

**Atenção sibling**: read-only do `protocolo-ouroboros`. Pode
abrir issues `etl-contract` no GitHub do sibling se houver drift.

## Verificação canônica

```bash
./scripts/smoke.sh
./scripts/test_contract_drift.sh  # 174 campos hoje
# Validacao Nivel C (celular real):
adb shell svc power stayon usb
adb logcat -c
# Percorrer 12 cenarios manualmente
adb logcat -d --pid=$(adb shell pidof com.ouroboros.mobile) | grep -iE "fatal|exception|warn"
# Validacao cross-repo:
cd ../protocolo-ouroboros && ./run.sh  # le do Vault Syncthing
```

## Proof-of-work

1. Relatório `docs/auditoria-cross-flow-2026-MM-DD/RELATORIO.md`
   com 12 cenários classificados.
2. Lista de FAILs corrigidos in-line (arquivos modificados).
3. Lista de FAILs descopados como sprints derivadas (com IDs).
4. Saída `npx jest --silent | tail -5`.
5. Saída `./scripts/smoke.sh`.
6. **Hash do commit (OBRIGATÓRIO)**.
7. Path do worktree + branch.
8. Sibling validation: ETL Python lê todos os tipos atuais sem
   warning de drift.

## Decisões tomadas

- **12 cenários canônicos** — lista exaustiva inicial; descobertas
  novas viram cenário 13, 14, etc.
- **FAILs cirúrgicos in-line; invasivos viram sprint** —
  protocolo anti-débito.
- **Cross-repo é obrigatório** — mobile não está completo se
  desktop não lê o que mobile escreve.
