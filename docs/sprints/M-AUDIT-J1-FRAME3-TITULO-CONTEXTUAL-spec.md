# Sprint S5 — M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL

```
DEPENDE:    HEAD em 9c385b3 + J1 fechada (5900a87)
BLOQUEIA:   APK preview (UX onboarding)
ESTIMATIVA: ~0.5h
STATUS:     [todo]
```

## 1. Objetivo

Frame 3 do onboarding (J1) usa o mesmo texto "Permissões" no eyebrow ALL CAPS
e no H1 grande, redundante. Outros 4 frames usam frase contextual no H1
("Como você se chama?", "Mais alguém usa este Vault com você?",
"Onde salvar seus dados?", "Tudo pronto, <nome>."). Substituir o H1 do
Frame 3 por frase contextual mantendo o eyebrow.

## 2. Entregáveis

### Arquivos modificados

- `app/onboarding.tsx` ou componente `<FramePermissoes>` — alterar H1 de
  `'Permissões'` para frase contextual. Proposta: **`'Libere o que faz sentido pra você.'`**
  (sentence case + sem ponto final em pergunta — aqui é afirmação, mantém
  ponto final).

### Arquivos novos

- `tests/app/onboarding.test.tsx` — adicionar caso que renderiza Frame 3
  e asserta que `getByText('Libere o que faz sentido pra você.')` existe.

## 3. APIs reutilizáveis

- Componente `<TituloFrame eyebrow titulo>` (se existir, padrão dos
  outros 4 frames).

## 4. Restrições

Padrão. Frase deve casar com ADR-0005 (sem motivacional, sem gamificação).

## 5. Validação Gauntlet

PNG do `/onboarding` Frame 3 com novo H1 em
`docs/sprints/M-AUDIT-J1-FRAME3-TITULO-CONTEXTUAL-screenshots-gauntlet/`.

## 6. Procedimento

1. Localizar Frame 3 em `app/onboarding.tsx` (provavelmente bloco
   `frame === 2 &&` ou similar).
2. Alterar H1.
3. Atualizar teste Jest.
4. Validar Gauntlet.

## 7. Verificação

Smoke + tsc + testes.

## 8. Commit

```
fix: m-audit-j1-frame3-titulo-contextual permissoes h1 contextual
```

## 9. Checkpoint visual

1 PNG Gauntlet.

### Checklist

- [ ] `STATE.md` atualizado.
- [ ] `CHANGELOG.md` atualizado.
- [ ] `docs/FEATURES-CANONICAS.md` §1 (onboarding) atualizado.

## 10. Decisão resolvida

H1 do Frame 3: **"Libere o que faz sentido pra você."**

Justificativa:
- Mantém eyebrow "Permissões" (consistente com outros 4 frames).
- Tom respeitoso (ADR-0005 sem motivacional, sem gamificação).
- Implica autonomia — usuário decide quais permissões dar.
- Sentence case + ponto final + acentuação OK.
- Não usa imperativo agressivo ("Libere todas!") nem manipulação ("Para
  uma melhor experiência...").
