# Sprint L2 — M-RECAP-CALENDARIO-UNIFICAR

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~3h
ADR:        0021
STATUS:     [todo]
```

## §1 Achado

Decisão durável dono 2026-05-06: Recap (`app/recap.tsx`) e Calendário
de Conquistas (`app/calendario.tsx`) **exibem o mesmo objetivo** —
agregação de conquistas por período. Unificar.

## §2 Tarefa

1. **`RecapScreen.tsx`** ganha state `modo: 'lista' | 'calendario'`:

   ```tsx
   const [modo, setModo] = useState<'lista' | 'calendario'>('lista');
   ```

2. **Header com toggle** entre os 2 modos:
   - Modo "Lista": exibe `RecapSecaoConquistas`, `Crises`, `Evolucoes`,
     `Tarefas`, `Numeros` (atual).
   - Modo "Calendário": novo `RecapModoCalendario.tsx` com heatmap
     mensal + lista de conquistas do dia selecionado.

3. **`RecapModoCalendario.tsx`** (novo):
   - Migra lógica de `app/calendario.tsx` (Calendário de Conquistas).
   - Reusa `useConquistas` + `react-native-calendars` (locale PT-BR
     já registrado em M37.1.1).

4. **Apagar `app/calendario.tsx`** e remover do `MenuLateral`
   item "Calendário" (estava em "Opcionais"/"Utilitários").

5. **ADR-0021** em
   `docs/ADRs/0021-recap-calendario-unificado.md`. Status: Aceito.
   Justificativa: ambos exibem mesma abstração (conquistas em
   período); 2 telas geravam ambiguidade no menu.

6. **Atualizar `docs/ADRs/INDEX.md`**.

7. **Atualizar `docs/FEATURES-CANONICAS.md`** §X (Recap) consolidando
   §Y (Calendário Conquistas).

8. **Tests**: `tests/components/screens/RecapScreen.test.tsx` —
   toggle entre modos preserva conquistas + cada modo render correto.

## §3 Restrições

- Anonimato.
- PT-BR sentence case.
- Reanimated (não moti) no toggle visual — risco residual A28.

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="(Recap|Calendario)"
./scripts/smoke.sh
```

## §5 Validação Gauntlet

PNGs:
- `A-recap-modo-lista.png` (modo padrão)
- `A-recap-modo-calendario.png` (toggle ativado)
- `A-menu-lateral-sem-calendario.png` (item removido)

## §6 Commit

```
feat: l2 recap-calendario-unificar 2 modos + adr-0021
```

## §7 Decisões

- **Toggle no header** vs layout fixo (calendário em cima + lista
  embaixo): toggle dá modo claro + foco; layout fixo divide atenção.
- **Default "Lista"**: mais informação por scroll, melhor para audit
  rápido.
- **Calendário usa heatmap mensal** (não calendar grid puro): mais
  compacto + visual de densidade.
