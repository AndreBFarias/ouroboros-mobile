# ADR 0012 — Cache Mobile Readonly Gerado pelo Backend

```
Status: Aceito
Data:   2026-04-29
Sprint: M00.docs (formaliza decisão tomada durante M02 + M03)
```

## Contexto

A Tela 21 (Mini Humor) e a Tela 22 (Mini Financeiro) do app Mobile
mostram visualizações agregadas de longo prazo (heatmap de 90 dias e
resumo financeiro semanal). Calcular essas agregações no celular toda
vez seria caro:

- Heatmap de humor: precisa varrer 90 arquivos `.md`, parsear YAML,
  agregar por data e pessoa.
- Mini Financeiro: depende de classificação fina de transações que
  hoje vive no pipeline Python do backend desktop (`protocolo-ouroboros`),
  que tem 21 extratores e regras de categorização maduras.

Replicar essa lógica no Mobile duplicaria código, multiplicaria
manutenção e violaria o princípio "Mobile captura, desktop processa"
(ADR-0004).

## Decisão

O backend desktop (`protocolo-ouroboros`) gera dois arquivos JSON de
cache em `~/Protocolo-Ouroboros/.ouroboros/cache/` durante o
`make sync` (ou `--full-cycle`):

- `humor-heatmap.json` — alimenta Tela 21
- `financas-cache.json` — alimenta Tela 22

O Mobile **só lê** esses arquivos. Nunca escreve. Quando o cache não
existe, mostra empty state explícito: "Rode o pipeline no desktop pra
carregar dados.".

## Schemas

### `humor-heatmap.json`

```json
{
  "schema_version": 1,
  "gerado_em": "2026-04-29T18:00:00-03:00",
  "periodo_dias": 90,
  "pessoas": ["pessoa_a", "pessoa_b"],
  "celulas": [
    {
      "data": "2026-04-28",
      "autor": "pessoa_a",
      "humor": 4,
      "energia": 3,
      "ansiedade": 2,
      "foco": 4
    }
  ],
  "estatisticas": {
    "pessoa_a": {
      "media_humor_30d": 3.4,
      "registros_30d": 22,
      "registros_total": 67
    },
    "pessoa_b": {
      "media_humor_30d": 3.8,
      "registros_30d": 18,
      "registros_total": 54
    }
  }
}
```

### `financas-cache.json`

```json
{
  "schema_version": 1,
  "gerado_em": "2026-04-29T18:00:00-03:00",
  "periodo_referencia": "2026-04-22 a 2026-04-28",
  "gasto_semana": 487.30,
  "gasto_semana_anterior": 612.40,
  "delta_textual": "abaixo da média",
  "top_categorias": [
    { "nome": "mercado", "valor": 187.20, "percentual": 38.4 },
    { "nome": "transporte", "valor": 92.50, "percentual": 19.0 },
    { "nome": "lazer", "valor": 78.40, "percentual": 16.1 },
    { "nome": "saúde", "valor": 64.10, "percentual": 13.2 },
    { "nome": "outros", "valor": 65.10, "percentual": 13.3 }
  ],
  "ultimas_transacoes": [
    {
      "data": "2026-04-28T14:32:00-03:00",
      "autor": "pessoa_a",
      "tipo": "despesa",
      "valor": 87.40,
      "destino": "mercado luiza",
      "categoria": "mercado"
    }
  ]
}
```

## Consequências

### Positivas

- **Performance previsível** no Mobile: leitura de 1 JSON ≪ scan de
  90 arquivos.
- **Lógica única** de categorização no backend Python.
- **Compatibilidade com offline**: o cache fica no Vault sincronizado;
  Mobile lê sem rede mesmo se backend estiver offline.
- **Versionamento**: campo `schema_version` permite evoluir sem
  quebrar Mobile antigo.

### Negativas

- **Latência de atualização**: dado só aparece no Mobile depois de
  rodar pipeline no desktop. Empty state explica.
- **Schema cruzado**: mudanças no shape obrigam ADR cruzado entre
  Mobile e Backend.

## Compromissos

- Toda mudança de schema vira ADR sucessor com `Status: Supersedes
  ADR-0012`.
- Mobile valida com zod o JSON lido. Schema inválido cai em empty
  state com erro explícito ("Cache em formato desconhecido. Rode o
  pipeline atualizado.").
- Backend deve garantir atomic write (escreve em `.tmp` e move) para
  evitar Mobile ler JSON parcial.

## Referências

- Sprint Mobile dependente: M10 (Mini Humor), M14 (Mini Financeiro)
- Sprint Backend correspondente: MOB-bridge-2 em
  `docs/sprints/backend/MOB-bridge-2-spec.md`
- ADR predecessor: ADR-0004 (Mobile só captura, desktop processa)
