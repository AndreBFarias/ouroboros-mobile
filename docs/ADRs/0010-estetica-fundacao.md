# ADR 0010 — Estética Como Fundação, Não Polimento

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Padrão da indústria é construir funcionalidade primeiro, "polir" no
fim. Resultado típico: nunca chega no polimento.

## Decisão

**Componentes base nascem premium na M01.** Springs no lugar de
durations, haptics integrados, padding generoso, cores semânticas
consistentes. Todas as telas seguintes herdam estética de graça.

Cinco princípios inegociáveis (BRIEFING.md Seção 2):

1. Física acima de tempo (springs)
2. Silêncio visual e respiração
3. Hierarquia por contraste, não por borda
4. Micro-interações em momentos específicos
5. Transições com física natural

## Consequências

### Positivas

- Não existe "sprint de polimento futuro" — desnecessária
- LLMs implementando telas seguintes copiam padrão premium dos componentes base
- Dev não tem que pensar em estética em cada tela — o sistema decide

### Negativas

- M01 dura mais (~2x sprint normal) — vale o investimento
