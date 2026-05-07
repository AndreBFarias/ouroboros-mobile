# Sprint N1 — M-MOTI-AUDIT-RUNTIME

```
DEPENDE:    nada
BLOQUEIA:   N2
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## §1 Achado

Após A28 (lazy require + OnboardingGuard + Reanimated puro nos 4
componentes do boot path), restam **38 componentes** com `<MotiView>`/
`<MotiText>` no projeto. Risco residual: alguns podem crashar com
mesma causa raiz que `FrameAnim` (`<MotiView>` + `translateX/Y/scale`
+ Reanimated 4 + New Arch emite transform string em frames intermediários).

## §2 Tarefa

1. **Listar 38 componentes** via grep:

   ```bash
   grep -rln "from 'moti'" src/ app/ --include="*.tsx"
   ```

2. **Para cada**, identificar:
   - **Prop animada** (translateX, translateY, scale, opacity, height,
     width, rotation, backgroundColor)
   - **Trigger** (mount imediato, state change, gesture, prop change)
   - **Tela onde monta** (boot screen? overlay global? rota
     específica?)
   - **Risco**:
     - **Alto**: transform-related em mount imediato em boot path /
       overlay global.
     - **Médio**: transform-related em mount de rota específica.
     - **Baixo**: opacity-only ou mount em interação (ex: chip
       pressionado).

3. **Output** em `docs/sprints/M-MOTI-AUDIT-RUNTIME-output.md`:

   ```md
   # Audit moti runtime — 38 componentes priorizados

   ## Risco ALTO (migrar preventivamente em N2)
   1. `Toast.tsx` — translateX + opacity em mount → `[ALTO]`
   2. ...

   ## Risco MÉDIO (migrar se field test detectar crash)
   ...

   ## Risco BAIXO (manter, migrar em v1.1 via M-BUNDLE-DIET-MOTI-REPLACE)
   ...
   ```

4. **Não tocar código nesta sprint** — apenas audit + output.

## §3 Restrições

- Read-only no codebase. Output em arquivo .md novo.
- Anonimato.

## §4 Verificação

```bash
ls docs/sprints/M-MOTI-AUDIT-RUNTIME-output.md
wc -l docs/sprints/M-MOTI-AUDIT-RUNTIME-output.md  # >= 80 linhas
```

## §5 Validação

Não aplicável (sprint documental).

## §6 Commit

```
docs: n1 audit moti runtime 38 componentes priorizados por risco
```

## §7 Decisões

- **Audit estática** (grep + análise manual) em vez de instrumentação
  runtime: mais rápido e cobre o universo. Confiabilidade ~85%.
- **3 níveis de risco**: alto/médio/baixo. Baixo descopado para v1.1.
