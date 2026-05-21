# R-BUNDLE-SIZE-AUDIT — Auditoria do bundle Hermes antes do release v1.0.0

**Tipo:** audit + (possível) infra
**Prioridade:** P2-medium
**Estimativa:** 2-4h (audit) + variável (fixes derivados)
**Fase:** 3 (achado colateral de M-GAUNTLET-DEAD-CODE-V2 re-validação)
**ADR sugerida:** nenhuma na fase audit; pode emergir conforme findings

## Contexto

Re-validação empírica de M-GAUNTLET-DEAD-CODE-V2 em 2026-05-21 (`b6419b4`
fechado há 17 dias) confirmou: leak check passou com **0/6 markers**
vazando no bundle Android Hermes. Mas o bundle cresceu de **8,5 MB
(2026-05-04 pós-fix)** para **9,8 MB (2026-05-21)** — **+1,3 MB em 17
dias**.

Crescimento natural das features entregues no período:
- R-INT-3 Health Connect (pacote react-native-health-connect ~500 KB)
- R-INT-4 Spotify Web API + YouTube Data v3 (clientes OAuth ~200 KB)
- R-VAULT-CANONICAL-COMPLETE A+B (schemas + stats + ZIP exportar)
- Q22.* (transcrição + share intent expandido)
- R-RECAP-4/5/6 (slideshow + Ken Burns + share PNG)
- R-MEDIA-2 (audio anexado)
- R-BACKUP-AUTO (executar backup + restaurar ZIP)
- Onda 3J/3K refactors

O limite hipotético documentado em STATE/BRIEFING histórico foi
**8,85 MB**. Ultrapassamos em ~1 MB. M41 (release v1.0.0) não pode
shipar sem decisão consciente sobre tamanho — APK final ficaria
visivelmente maior, tempo de download mais lento, Hermes mais
demorado em parse na primeira execução.

## Hipóteses técnicas

1. **Pacotes nativos pesados** (react-native-health-connect,
   expo-share-intent, react-native-view-shot) — verificar contribuição
   real.
2. **Bibliotecas JS gordas** (jszip para backup, react-native-calendars,
   moti) — avaliar tree-shake e alternativas.
3. **Dead code não-eliminado** (componentes legacy, hooks deprecated,
   módulos que `M-BUNDLE-DIET` original já visitou em 2026-05-04).
4. **Duplicação de polyfills** (zod, yaml, etc) — pode ter regredido.

## Escopo

### A. Audit (mandatório)

1. Rodar `expo export --platform android --output-dir /tmp/bundle-audit-21`.
2. Tamanho total Hermes + breakdown por chunk:
   ```bash
   du -sh /tmp/bundle-audit-21/_expo/static/js/android/*.hbc
   ```
3. Source-map exploration (se sourcemap habilitado):
   ```bash
   npx source-map-explorer /tmp/bundle-audit-21/_expo/static/js/android/*.hbc.map
   ```
4. Comparar com `M-BUNDLE-DIET` original (commit `91430bd` em
   `docs/auditoria-bundle-2026-05-04/`):
   - quais módulos cresceram mais
   - quais novos módulos foram adicionados
   - candidatos a DCE adicional

### B. Decisão / fix (opcional, conforme findings)

Documentar findings em `docs/auditoria-bundle-2026-05-21/RELATORIO.md`
com tabela de contribuintes e recomendações:

- Pacotes a remover/substituir (se houver)
- Imports tree-shakáveis (mover named imports, dynamic imports)
- Features candidatas a code-splitting
- ADR nova se decisão arquitetural (ex: limite de bundle aumentado para
  10 MB explicitamente)

Se finding for severo (>50% redução possível), sub-sprint
`R-BUNDLE-DIET-V2` é criada com escopo cirúrgico. Senão, fica como
documento durável e M41 segue com limite atualizado.

## OFF-LIMITS

**Pode tocar:**
- `docs/auditoria-bundle-2026-05-21/RELATORIO.md` (novo)
- `docs/auditoria-bundle-2026-05-21/breakdown.txt` (output das ferramentas)
- Editar comentários inline em `metro.config.js` se descobrir oportunidade
  ADICIONAL de DCE (sem mudar comportamento)

**Não pode tocar (na fase audit):**
- Qualquer arquivo em `src/`, `app/`, `tests/` (auditoria é leitura)
- `package.json` (alteração de deps fica para sub-sprint dedicada)
- `app.json`, `babel.config.js`, `metro.config.js` (mudanças significativas)
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md` (orquestrador atualiza)

Se auditoria identificar fix óbvio e cirúrgico (<10 linhas), aplicar e
documentar. Refator amplo → sub-sprint nova.

## Verificação canônica

```bash
./scripts/check_anonimato.sh
./scripts/smoke.sh

# Bundle real
npx expo export --platform android --output-dir /tmp/bundle-audit
du -sh /tmp/bundle-audit/_expo/static/js/android/*.hbc

# Leak check ainda 0/6
./scripts/check_gauntlet_leak.sh
```

## Proof-of-work esperado

1. `docs/auditoria-bundle-2026-05-21/RELATORIO.md` com:
   - Tamanho atual exato e comparação com 8,5 MB de 2026-05-04
   - Top 10 contribuintes de tamanho (módulo + KB)
   - Comparação com M-BUNDLE-DIET original (deltas)
   - 3-5 recomendações priorizadas
2. Output literal das ferramentas em `docs/auditoria-bundle-2026-05-21/breakdown.txt`
3. Decisão durável: limite de bundle revisado ou sub-sprint nova de diet
4. Hash commit no worktree

## Decisão

P2 porque não bloqueia ondas seguintes, mas **deve fechar antes de
M41** (release final). Bundle inflado é UX degradado em download +
primeira execução; release não pode shipar sem decisão consciente.

## Origem

Achado colateral do agente `a86c4c9e918b89331` ao re-validar
M-GAUNTLET-DEAD-CODE-V2 em 2026-05-21. Citado textualmente:
"Bundle inflou +1,3 MB em 17 dias (8,5 MB → 9,8 MB). Não é vazamento
de gauntlet (leak check confirma 0). É consequência natural de
features novas (R-INT-3, R-INT-4, R-VAULT-A, Q22, Onda 3J/3K). Não é
escopo desta sprint, mas mereceria sprint colateral
`R-BUNDLE-SIZE-AUDIT` para identificar contribuições e oportunidades
de DCE adicional antes de M41."
