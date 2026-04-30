# ADR 0011 — Identidade de Pessoas Genérica (PESSOA_A / PESSOA_B)

```
Status: Aceito (estendido por ADR-0015)
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Versões anteriores deste planejamento misturavam nomes reais hardcoded
no código, schemas, exemplos. Find-and-replace no futuro seria
horrível, e quebrava o princípio de anonimato (regra -1 em
CONTEXTO.md).

## Decisão

Identidades genéricas `pessoa_a` e `pessoa_b` em todo o código. Único
arquivo com nomes reais é `src/config/pessoas.config.ts`. Lookup via
helpers `nomeDe()` e `inicialDe()`. Frontmatter dos `.md` no Vault usa
`autor: pessoa_a` ou `autor: pessoa_b`. Backend desktop espelha o mesmo
config.

## Sucessor

Esta ADR foi **estendida** por ADR-0015 (`0015-pessoas-runtime-foto.md`)
em 2026-04-29. ADR-0015 trata de:

- Nomes editáveis em runtime via SecureStore
- Fotos de perfil persistidas localmente
- Lookup via store, não via config

ADR-0011 continua válida quanto à parte de identificadores genéricos
no código. Para o comportamento completo de identidade no app, ler
ADR-0015 também.

## Consequências

- Adaptar o App para outras pessoas é trocar 1 arquivo
- Find-and-replace nunca mais
- Aliasamento controlado — testes usam `pessoa_a` direto, sem nomes
- Demanda config compatível no protocolo-ouroboros — ADR equivalente
  no backend
