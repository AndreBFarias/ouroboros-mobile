# ADR 0009 — Validação por Anotação Runtime (zod)

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Os `.md` no Vault têm frontmatter YAML que pode ser escrito a mão no
desktop ou por outro App. Não dá para confiar no formato.

## Decisão

Todo schema em `src/lib/schemas/` exporta tipo TS + validador zod.
Leitura do Vault sempre passa por validador. Erro de validação abre
modal "arquivo X tem campo invalido: Y" sem quebrar a UI.

## Consequências

- Robustez contra edição manual mal feita
- Mensagens de erro humanas
- Pequeno overhead de runtime — irrelevante em volumes pessoais
