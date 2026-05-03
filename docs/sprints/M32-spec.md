# Sprint M32 — Contador v2: mensagens de apoio + indicador de marcos discretos

```
DEPENDE:    M31 (linha de base estabelecida)
BLOQUEIA:   nenhuma (paralela com M33/M34/M35)
ESTIMATIVA: 2-3h
```

## 1. Objetivo

Adicionar ao detalhe do contador "Dias sem X" (Tela de detalhe
acessada via `app/contadores/[slug].tsx`) **mensagens de apoio
rotativas** baseadas em dias atingidos e **indicador discreto de
marcos** (5d / 30d / 100d / 365d). Tudo em tom sóbrio sem confete,
respeitando ADR-0005 (zero gamificação visual).

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/contadores/mensagens.ts`
  ```ts
  export function mensagemApoio(dias: number): string {
    if (dias === 0) return 'Hoje começa de novo. Sem julgamento.';
    if (dias < 5)   return 'Os primeiros dias pesam mais. Você está aqui.';
    if (dias < 30)  return 'Cada dia conta. Continue um de cada vez.';
    if (dias < 100) return `${dias} dias. Já está virando hábito.`;
    if (dias < 365) return `${dias} dias. Mais do que três meses.`;
    return `${dias} dias. Um ano e contando.`;
  }

  export const MARCOS_DIAS = [5, 30, 100, 365] as const;

  export function marcoAtingido(dias: number): number | null {
    let ultimo: number | null = null;
    for (const m of MARCOS_DIAS) {
      if (dias >= m) ultimo = m;
    }
    return ultimo;
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/contadores/mensagens.test.ts`
  — cobrir 6 faixas (0, 1, 5, 30, 100, 365, 730).

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/contadores/[slug].tsx`
  — após o número grande (linha ~244), adicionar:
  ```tsx
  <Text style={{
    color: colors.muted,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  }}>
    {mensagemApoio(dias)}
  </Text>
  {marcoAtingido(dias) ? (
    <Text style={{
      color: colors.mutedDecor,
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1,
      marginTop: spacing.xs,
    }}>
      {`marco de ${marcoAtingido(dias)} dias`}
    </Text>
  ) : null}
  ```

### Arquivos NÃO modificados

- `src/lib/schemas/contador.ts` — sem mudança no schema. Mensagens
  são derivação client-side, não persistidas.
- `src/components/contadores/CardContador.tsx` (lista) — opcional
  mostrar mensagem; M32 mantém só na tela de detalhe.

## 3. APIs reutilizáveis

- `diasEntre()` em `src/lib/util/diasEntre.ts`.
- `colors.muted`, `colors.mutedDecor`, `spacing` em `tokens.ts`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- Sprint isolada — só toca em arquivos específicos do contador.
- Nenhum ponto canônico do CONTRACT afetado (sem schema novo, sem
  store, sem tab, sem boot hook).

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- **ADR-0005 (sem gamificação)**:
  - Sem badge, sem troféu, sem confete, sem cor de festa.
  - "marco de N dias" em `colors.mutedDecor` (cinza-violeta
    discreto), font-size 11, letter-spacing 1 (estilo "rodapé").
  - Mensagens com tom sóbrio, sem exclamação, sem emojis.
- Sentence case + acentuação PT-BR completa.
- TS strict.

## 5. Procedimento sugerido

1. Criar `src/lib/contadores/mensagens.ts` + teste.
2. Editar `app/contadores/[slug].tsx`: adicionar 2 `<Text>` após o
   número grande (e antes do botão "Resetei").
3. Importar `mensagemApoio`, `marcoAtingido` no topo.
4. Verificar visualmente que tom continua sóbrio.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m32-export && rm -rf /tmp/m32-export
```

## 7. Commit

```
feat: m32 contador mensagens apoio sobrias e marcos discretos
```

## 8. Checkpoint visual

4 screenshots Nível A em `docs/sprints/M32-screenshots/`:
- `A-detalhe-0-dias.png` — "Hoje começa de novo. Sem julgamento."
- `A-detalhe-7-dias.png` — "Cada dia conta. Continue um de cada vez."
  + "marco de 5 dias".
- `A-detalhe-30-dias.png` — "30 dias. Já está virando hábito."
  + "marco de 30 dias".
- `A-detalhe-365-dias.png` — "365 dias. Um ano e contando."
  + "marco de 365 dias".

## 9. Decisões tomadas

- **Função pura `mensagemApoio(dias)`**: derivação client-side,
  sem persistência. Mensagem muda dinamicamente conforme `dias`
  (recalculado em cada render por `useMemo`).
- **6 faixas escalonadas**: 0 (recomeço), <5 (início difícil), <30
  (constância), <100 (hábito), <365 (médio prazo), ≥365 (anos).
- **Marcos como `findLast`-equivalente**: itera os 4 marcos e
  retorna o último alcançado.
- **`marco de N dias` em muted-decor 11dp**: máxima discrição,
  respeita ADR-0005.
- **Nada no schema**: mensagens são client-side; arquivos `.md` no
  Vault continuam sem campo de mensagem (idempotência preservada).

Sprint pronta para execução sem perguntas pendentes.
