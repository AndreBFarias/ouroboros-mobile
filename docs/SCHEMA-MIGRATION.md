# Schema Migration — Mapa cross-platform Mobile <-> Desktop ETL

Este documento é a fonte canônica de transformações lexicais
aplicadas em runtime sobre `.md` do Vault para garantir leitura
cruzada entre o app mobile (este repo) e o pipeline desktop sibling
`AndreBFarias/protocolo-ouroboros`.

Mantém-se em sincronia com `src/lib/migration/lexicon.ts` (TS) e
deve ser refletido no equivalente Python do sibling.

## Decisão durável

`.md` antigos no Vault **não são reescritos**. A normalização
acontece em memória ao ler (camada de schema). Escritas novas usam
sempre o vocabulário canônico.

## Tabela de mapeamento — Modo do diário emocional (R0, 2026-05-15)

| Chave no `.md` (legacy) | Chave canônica em runtime | Decisão durável |
|---|---|---|
| `modo: trigger`  | `modo: gatilho`   | ADR-0025 |
| `modo: vitoria`  | `modo: conquista` | ADR-0025 |
| `modo: reflexao` | `modo: reflexao`  | ADR-0025 (sem renomeação) |

### Regras de leitura

1. Parser TS (`DiarioEmocionalModoSchema`) usa `z.preprocess` para
   aceitar legacy e remapear para canônico antes do `z.enum`.
2. Parser sibling (Python) **deve** aplicar a mesma transformação
   antes de emitir registros para análise. Schema deve aceitar os
   cinco valores de input (`trigger`, `vitoria`, `reflexao`,
   `gatilho`, `conquista`) e normalizar para os três canônicos
   (`gatilho`, `conquista`, `reflexao`).
3. Valor desconhecido → erro de validação claro (mensagem inclui
   os valores aceitos).

### Regras de escrita

1. Writers em qualquer plataforma **devem emitir apenas** os
   canônicos `gatilho`, `conquista`, `reflexao`.
2. Não é permitido reescrever `.md` antigo apenas para atualizar a
   chave — write storm + risco Syncthing. O arquivo permanece com
   o valor legado até que o usuário edite manualmente em outro
   contexto.

## Tabela de campos não afetados (estabilidade)

Os campos abaixo permanecem inalterados; reforçar para evitar
mudança acidental:

| Campo | Valor canônico | Observação |
|---|---|---|
| `tipo` | `diario_emocional` | Discriminator do parser; não mudar. |
| `autor` | `pessoa_a` \| `pessoa_b` | ADR-0015 (identidade). |
| `data` | ISO 8601 com hora | Regex em `DiarioEmocionalSchema`. |
| `intensidade` | int 1-5 | Inalterado. |
| `funcionou` | bool, só em `gatilho` | Refine ativo. |
| `midia` | array, ≥1 em `conquista` | Refine ativo (M07.x). |
| `para` | discriminado (mim/outra/casal) | ADR-0017 (companion). |

## Tabela de IDs estáveis (não renomeados nesta sprint)

Estes IDs aparecem em estruturas in-memory e em contratos
cross-platform (widget Android, cache JSON do Recap, ETL desktop).
Renomear exige sprint dedicada com bump de versão de cache:

| ID | Contexto |
|---|---|
| `diario_vitoria` | `ConquistaOrigem` em `src/lib/conquistas/types.ts` |
| `diario_trigger` | `CriseItem.origem` em `src/lib/hooks/useRecap.ts` |
| `evento_positivo` | `EventoMeta.modo === 'positivo'` |
| `evento_negativo` | `EventoMeta.modo === 'negativo'` |

A semântica desses IDs permanece estável. Refinamento posterior
(quando o sibling estiver pronto) pode renomear para
`diario_conquista` e `diario_gatilho` com migração coordenada.

## Versionamento

- **2026-05-15** (R0) — Documento criado. Vocabulário canônico
  fixado: gatilho / conquista / reflexao. ADR-0025.

## Aplicação no sibling Python

Issue `etl-contract` aberta em `AndreBFarias/protocolo-ouroboros`
no mesmo dia desta sprint. O pipeline desktop **deve** aplicar
exatamente o mesmo mapeamento — sem isso, queries cruzadas sobre
o Vault retornam categorias inconsistentes.

Equivalente Python esperado:

```python
DIARIO_MODO_LEGADO_TO_CANONICO = {
    "trigger": "gatilho",
    "vitoria": "conquista",
    "reflexao": "reflexao",
}

def normalizar_diario_modo(valor: str) -> str:
    """Mesmo contrato de src/lib/migration/lexicon.ts."""
    if valor in DIARIO_MODO_LEGADO_TO_CANONICO:
        return DIARIO_MODO_LEGADO_TO_CANONICO[valor]
    if valor in {"gatilho", "conquista", "reflexao"}:
        return valor
    raise ValueError(
        f"modo de diario emocional invalido: '{valor}' "
        f"(esperado: trigger | vitoria | reflexao | gatilho | conquista)"
    )
```
