# R-CROSS-FLOW-FIX-2 — Sibling Python ETL ainda lê layout pre-H2

**Tipo**: bug crítico cross-repo
**Prioridade**: P1-high
**Estimativa**: 2-3h (sibling repo)
**Tranche**: R-CROSS-FLOW (derivada de R-CROSS-FLOW-AUDIT)
**Fase**: 2

## Fonte canônica

Auditoria `docs/auditoria-cross-flow-2026-05-16/RELATORIO.md`
cenários 11 e 12. **Mobile migrou para layout-por-tipo (H2,
ADR-0023)** — todo write canônico vai para `markdown/<feature>-*.md`.
**Sibling Python (`/home/andrefarias/Desenvolvimento/protocolo-ouroboros`)
ainda usa SUBPATHS legados** em `src/mobile_cache/*.py`:

```
marcos.py:        SUBPATHS = (("marcos",),)
eventos.py:       SUBPATHS = (("eventos",),)
tarefas.py:       SUBPATHS = (("tarefas",),)
diario_emocional.py: SUBPATHS = (("inbox", "mente", "diario"),)
ciclo.py:         SUBPATHS = (("ciclo",),)
treinos.py:       SUBPATHS = (("treinos",),)
medidas.py:       SUBPATHS = (("medidas",),)
```

Mobile **não escreve** nenhum desses paths há ≥ 10 sprints.
Resultado: `cd ../protocolo-ouroboros && ./run.sh` lê só dados
históricos pre-H2 (vault desktop ainda tem pastas legadas porque
o usuário migrou desktop manualmente meses atrás). **Quaisquer
dados novos do mobile ficam invisíveis para o ETL Python.**

Comprovação: `OUROBOROS_VAULT=~/Protocolo-Ouroboros .venv/bin/python
-m src.mobile_cache` processa só os arquivos legados em
`~/Protocolo-Ouroboros/{daily,eventos,marcos,treinos,inbox}`.
`markdown/` (escrito pelo mobile via Syncthing) é ignorado
silenciosamente — nenhuma warning, nenhuma menção a `markdown/`
em todo `src/mobile_cache/`.

## Solução

**É repo sibling (read-only do nosso ponto de vista).** Esta sprint
gera um **PR no sibling Python** (escopo cross-repo) com:

1. Atualizar `SUBPATHS` em cada `src/mobile_cache/*.py` para incluir
   `("markdown",)` como fallback (ou primário).
2. Atualizar `parse_item` para filtrar por prefixo do filename (ex:
   `if not md.name.startswith("evento-"): return None`).
3. Migração de cache: rodar `./run.sh --full-cycle` no sibling após
   merge.
4. **Não tocar** layout do mobile — H2 é decisão ADR-0023.

## Workaround temporário (Mobile side)

Como alternativa enquanto sibling não acompanha, mobile poderia
escrever **fallback compatibilidade** em paths legados também
(write duplo). MAS isso é trade-off ruim — viola H2/ADR-0023 e
duplica I/O em runtime mobile. **Recomendação durável: fix no
sibling, não no mobile.**

## Aceitação

- `cd ../protocolo-ouroboros && OUROBOROS_VAULT=~/Protocolo-Ouroboros
  .venv/bin/python -m src.mobile_cache` lê arquivos em
  `~/Protocolo-Ouroboros/markdown/` e popula caches normalmente.
- Schema dos JSONs gerados não muda (apenas `vault_root` aponta para
  os items realmente lidos).
- Smoke do sibling continua verde.

## Dependências

- **Bloqueia**: F1 (pipeline Mobile → Desktop não fecha)
- **Bloqueado por**: ADR-0023 (já concluído)

## OFF-LIMITS

**Read-only no mobile.** Toda mudança no sibling Python repo
`/home/andrefarias/Desenvolvimento/protocolo-ouroboros`. Mobile não
pode tocar paths legados pra "compensar" o sibling.

## Verificação canônica

```bash
# No sibling repo:
cd /home/andrefarias/Desenvolvimento/protocolo-ouroboros
OUROBOROS_VAULT=~/Protocolo-Ouroboros .venv/bin/python -m src.mobile_cache
# Caches em ~/Protocolo-Ouroboros/.ouroboros/cache/*.json refletem
# items de markdown/ (humor-, diario-, evento-, etc).
```

## Proof-of-work

1. Diff do sibling Python (cada arquivo `src/mobile_cache/*.py`).
2. Saída do ETL após fix: contagem de items por schema.
3. PR ou commit hash no sibling.
4. Cross-check: 1 humor escrito no mobile (`markdown/humor-2026-05-16-*.md`)
   aparece em `~/Protocolo-Ouroboros/.ouroboros/cache/humor-heatmap.json`.
5. Achados colaterais.
