# Q21.b — Issues `etl-contract` no repo sibling Python

> **Tamanho:** Pequeno (1h)
> **Bloqueia v1.0.0?** Não — comunicação cross-repo, paralela ao app.
> **Pré-requisitos:** Q21 entregue (CSV + drift check); gh CLI
> autenticado pra `AndreBFarias/protocolo-ouroboros`.

## Contexto

Q21 entregou `docs/CONTRACT-MOBILE-BACKEND.md` consolidado (22
schemas, 173 campos auditados) + `docs/CONTRACT-MOBILE-BACKEND.csv`
consumível + `scripts/test_contract_drift.sh` no smoke. Mas o spec
original previa **7+ issues** no repo sibling Python (`protocolo-ouroboros`)
documentando o contrato pra o time backend priorizar consumo. Isso
não foi entregue na sessão 2026-05-13 porque envolve massa de issues
externa que merece revisão do dono antes do disparo.

## Objetivo

Abrir 7 issues estruturadas no sibling Python via `gh -R
AndreBFarias/protocolo-ouroboros issue create`, uma por tipo
principal do contrato, com:

- Frontmatter exemplo extraído do MD canônico
- Tabela de campos com tipo Python sugerido (`str`, `int`, `float`,
  `datetime.date`, `Literal[...]`, `list[...]`)
- Path do arquivo no Vault
- Casos de borda (autor inferido vs explícito, ciclo com sintomas
  vazios, mídia sem transcrição, _schema_version ausente)

## Issues a abrir (mínimo)

Cada uma com label `etl-contract`:

1. `[ETL] mobile contract v1: humor — markdown/humor-YYYY-MM-DD.md`
2. `[ETL] mobile contract v1: diario_emocional`
3. `[ETL] mobile contract v1: treino_sessao + rotina_treino + grupo_treino`
4. `[ETL] mobile contract v1: medidas`
5. `[ETL] mobile contract v1: ciclo_menstrual`
6. `[ETL] mobile contract v1: midia (foto/audio/video/documento) + companion`
7. `[ETL] mobile contract v1: marco + evento + agenda`

## Decisões técnicas firmes

- **Não editar código Python.** Apenas issues e templates de doc.
- **Referenciar o CSV** (`docs/CONTRACT-MOBILE-BACKEND.csv` neste
  repo) como fonte canônica machine-readable.
- **Template de body por issue:**

```markdown
## Tipo: <nome>
**Path canônico:** `<glob>`
**Schema TS:** `src/lib/schemas/<nome>.ts`
**Versão atual:** 1

### Frontmatter
| Campo | Tipo TS | Tipo Python sugerido | Required | Notas |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### Caso(s) de borda
- ...

### Referência
- CSV canônico: https://github.com/AndreBFarias/ouroboros-mobile/blob/main/docs/CONTRACT-MOBILE-BACKEND.csv
- MD: https://github.com/AndreBFarias/ouroboros-mobile/blob/main/docs/CONTRACT-MOBILE-BACKEND.md
```

## Proof-of-work esperado

1. **Issues abertas:**
   ```bash
   gh -R AndreBFarias/protocolo-ouroboros issue list --label etl-contract
   # Esperado: 7+ resultados.
   ```

2. **Cada issue tem o template completo + label.**

3. **README do sibling Python atualizado** (opcional) com seção
   "Contrato canônico em sync com Mobile" linkando para os arquivos
   canônicos.

## Critérios de aceite

- [ ] 7+ issues com label `etl-contract` abertas no sibling
- [ ] Cada issue tem path canônico + frontmatter exemplo + tabela
- [ ] Sprint marcada `[ok]` em ROADMAP

## Anti-débito

Quando o backend Python pedir mudança no contrato (renomear campo,
mudar tipo), abrir Q21.x dedicada à migração com bump `_schema_version: 2`.
Não fazer hotfix direto no contrato sem migration plan.
