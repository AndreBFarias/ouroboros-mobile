# Q21 — Unificação Mobile↔Backend para facilitar ETL Python

> **Tamanho:** Médio (1 dia)
> **Bloqueia v1.0.0?** Não. Pode rodar paralela.
> **Pré-requisitos:** Q12 (`_schema_version: 1` em todos writers)
> entregue.

## Contexto

Pedido do dono (sessão 2026-05-12):

> "Outra coisa agora com o app sendo real, dá pra planejar a parte de
> uma nova integração com o projeto original. Desenvolver sprints pra
> 'unificar' no sentido facilitar a vida do etl do outro lado."

Repositório sibling: `~/Desenvolvimento/protocolo-ouroboros` (Python
ETL). Hoje ele lê `.md` files com frontmatter mas pode estar lendo
formatos divergentes entre tipos (ex.: ciclo usa snake_case `data_inicio`
mas treino usa camelCase `dataInicio`). Q12 padronizou `_schema_version`
mas ainda há divergências de naming/encoding.

## Objetivo da sprint

Auditar **todos** os schemas Mobile (`src/lib/schemas/`) e gerar
documento canônico `docs/CONTRACT-MOBILE-BACKEND.md` (já existe via
Q12, vai ser revisado e completado) que liste **cada chave de cada
frontmatter** com:

- Nome exato no `.md`
- Tipo TypeScript / Python
- Required / optional
- Versão atual `_schema_version`
- Histórico de mudanças (migrations passadas)

Espelhar via issues no repo sibling Python para o time backend
priorizar consumo.

## Decisões técnicas firmes

- **Não editar o repo Python diretamente.** Apenas docs no Mobile +
  issues no sibling via `gh -R protocolo-ouroboros issue create`.
- **Schema version bump não acontece nesta sprint.** Permanece v1.
- **Tooling:** script `scripts/exportar_contrato.py` (Python) que lê
  cada `src/lib/schemas/*.ts` e gera CSV/JSON canônico.

## Arquivos a criar/modificar

### Novos

1. `docs/CONTRACT-MOBILE-BACKEND.md` — versão consolidada e auditada.
2. `docs/CONTRACT-MOBILE-BACKEND.csv` — formato consumível por Python.
3. `scripts/exportar_contrato.py` — gerador automatizado.
4. `scripts/test_contract_drift.sh` — script CI que detecta drift entre
   schema TS atual e doc canônico (alerta se schema mudou e doc não).

### Modificações

- `scripts/smoke.sh` — adicionar chamada a `test_contract_drift.sh`
  como check leve (warning, não fail).

### Issues abertas no sibling (`protocolo-ouroboros`)

Mínimo 7 issues, uma por tipo principal:

1. `[ETL] mobile contract v1: humor_rapido — humor-YYYY-MM-DD.md`
2. `[ETL] mobile contract v1: diario_emocional — diario-...md`
3. `[ETL] mobile contract v1: treino_sessao — treino-...md`
4. `[ETL] mobile contract v1: medida — medida-...md`
5. `[ETL] mobile contract v1: ciclo_menstrual — ciclo-...md`
6. `[ETL] mobile contract v1: midia_audio/foto/video/documento`
7. `[ETL] mobile contract v1: marco — marco-...md`

Cada issue tem:
- Frontmatter exemplo
- Tabela de campos com tipo Python sugerido
- Path do arquivo no Vault
- Caso(s) de borda (autor inferido vs explícito, ciclo com sintomas
  vazios, mídia sem transcricao)

## Proof-of-work esperado

1. **Gerar contrato:**
   ```bash
   python3 scripts/exportar_contrato.py > docs/CONTRACT-MOBILE-BACKEND.csv
   wc -l docs/CONTRACT-MOBILE-BACKEND.csv
   # Esperado: 100+ linhas (todos campos de todos schemas)
   ```

2. **Drift check passa:**
   ```bash
   ./scripts/test_contract_drift.sh
   # Saída: "OK: contrato em sync com schemas (N campos auditados)"
   ```

3. **Issues criadas no sibling:**
   ```bash
   gh -R AndreBFarias/protocolo-ouroboros issue list --label etl-contract
   # Esperado: 7+ issues abertas
   ```

4. **Smoke continua verde com check novo:**
   ```bash
   ./scripts/smoke.sh
   ```

## Critérios de aceite

- [ ] `docs/CONTRACT-MOBILE-BACKEND.md` lista todos os 19 schemas
- [ ] CSV gerado consumível por pandas/csv lib
- [ ] Script Python `exportar_contrato.py` roda sem erro
- [ ] Drift check identifica mudança de schema TS (testado adicionando
      campo dummy e revertendo)
- [ ] 7+ issues abertas no repo `protocolo-ouroboros` com label
      `etl-contract`
- [ ] Smoke verde
- [ ] Sprint `[ok]` em ROADMAP

## Anti-débito

Quando o ETL Python pedir mudança no contrato (ex.: "renomear campo
X para Y"), abrir Q21.x dedicada à migração com `_schema_version: 2`.
Não fazer hotfix direto.
