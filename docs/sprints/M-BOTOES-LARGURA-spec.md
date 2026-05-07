# Sprint K5 — M-BOTOES-LARGURA

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## §1 Achado

3 botões com largura visualmente inadequada (screenshots do dono):

1. **"Conectar conta Google"** em `app/agenda.tsx` — estreito (568a5521).
2. **"Abrir agenda"** em `app/settings/contas-google.tsx`.
3. **"Recap"** ("Rec" segundo dono) em `app/index.tsx:154` — estética
   ruim como botão grande.

## §2 Tarefa

1. **`Button.tsx` ganha prop `fullWidth`**:

   ```tsx
   interface ButtonProps {
     // ... outros
     fullWidth?: boolean;
   }

   // No render:
   style={{
     ...estiloBase,
     ...(fullWidth ? { width: '100%' } : {}),
   }}
   ```

2. **Aplicar `fullWidth`**:
   - `app/agenda.tsx` botão "Conectar conta Google"
   - `app/settings/contas-google.tsx` botões "Conectar"/"Abrir agenda"

3. **Botão "Recap" na home** (`app/index.tsx:154`):
   - Atualmente `<Button label="Recap" variant="ghost" />`
   - Mudar para visual mais discreto: ícone calendar + label pequeno
     em `colors.muted`, sem background, alinhado à direita do header.
   - Ou: trocar para `<Pressable>` simples com texto.

4. **Tests**: `tests/components/ui/Button.test.tsx` — case `fullWidth=true`
   aplica `width: '100%'`.

## §3 Restrições

- Anonimato.
- PT-BR sentence case.

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="Button"
./scripts/smoke.sh
```

## §5 Validação Gauntlet

PNGs ANTES vs DEPOIS:
- `A-botao-conectar-google-fullwidth.png`
- `A-botao-abrir-agenda-fullwidth.png`
- `A-botao-recap-home-discreto.png`

## §6 Commit

```
feat: k5 botoes largura full-width conectar+agenda + recap discreto home
```

## §7 Decisões

- **`fullWidth` opt-in (não default)**: alguns botões pequenos
  precisam ficar pequenos (ex: chips, tags). Default é largura
  intrínseca do conteúdo.
- **"Recap" na home discreto**: ADR-010 §2.4 "tipografia que respira" —
  evitar competir visualmente com conteúdo principal.
