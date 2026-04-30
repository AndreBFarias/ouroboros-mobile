# ADR 0004 — Mobile Só Captura, Desktop Processa

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Tentação de espelhar tudo do desktop no Mobile. Resultado típico: dois
Apps medianos.

## Decisão

Mobile = entrada de dados. Edição em massa, relatórios, pipelines de
finanças = desktop. Mobile lê `vault/.ouroboros/cache/*.json` gerado
pelo desktop.

## Consequências

- Escopo Mobile drasticamente menor → qualidade maior
- Backend permanece source of truth
- Sem duplicação de lógica
- Mobile sem dados se desktop nunca rodou — empty state explica
