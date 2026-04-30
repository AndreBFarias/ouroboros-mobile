# ADR 0008 — Tema Custom em tokens.ts, Não Material 3

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Material 3 do Android tem dynamic color, theming engine, componentes
opinativos.

## Decisão

**Rejeitar Material 3 inteiro.** Tema Dracula custom em `tokens.ts` +
NativeWind. Gluestack-ui usado só pelos primitivos (modais, sheets,
gestos), com tema sobrescrito.

## Rationale

Identidade visual é parte da experiência. Usuário quer Dracula, mono
font, sobriedade. Material 3 trazendo arredondamentos, sombras e cores
do Android puxariam o App para "outro App generic android" — exatamente
o que queremos evitar.

## Consequências

- Identidade visual preservada e independente da versão do Android
- Tema único compartilhado entre todos os componentes
- Trabalho extra para sobrescrever defaults do gluestack-ui — pago uma
  vez na M01
- Componentes do Material 3 (date picker nativo, sheet do sistema) não
  são reutilizados; substituídos por implementações próprias
