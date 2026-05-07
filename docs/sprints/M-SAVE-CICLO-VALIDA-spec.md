# Sprint I-CICLO — M-SAVE-CICLO-VALIDA

```
DEPENDE:    H1, H2, H3, J1 (sexoDeclarado em onboarding)
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~2h (inclui inferência de pessoa)
STATUS:     [todo]
```

> Padrão template + lógica específica de inferência.

## §1 Achado

Dois bugs combinados:

1. **Save falha** (causa raiz comum H1).
2. **Inferência de pessoa**: se homem casal com mulher tenta marcar
   ciclo por ela, programa não infere. Hoje exige seleção manual de
   `autor`. UX ruim.

## §2 Tarefa

- **Writer**: `src/lib/vault/ciclo.ts` — `vaultUriJoin`. Path
  `markdown/ciclo-YYYY-MM-DD.md`. Schema `ciclo_menstrual.ts`: `data`,
  `fase`, `intensidade_fluxo`, `sintomas[]`, `autor`.
- **Caller**: `app/ciclo/novo.tsx` — try/catch+timeout. **Inferência
  de autor**:
  ```ts
  const sexoA = useOnboarding((s) => s.sexoDeclarado.pessoa_a);
  const sexoB = useOnboarding((s) => s.sexoDeclarado.pessoa_b);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);

  function autorPadrao(): 'pessoa_a' | 'pessoa_b' | null {
    if (tipoCompanhia === 'sozinho') {
      return sexoA === 'feminino' || sexoA === 'nao-binario' ? 'pessoa_a' : null;
    }
    if (tipoCompanhia === 'casal' || tipoCompanhia === 'amigos') {
      const femA = sexoA === 'feminino';
      const femB = sexoB === 'feminino';
      if (femA && !femB) return 'pessoa_a';
      if (femB && !femA) return 'pessoa_b';
      // Ambas femininas OU nenhuma: pede seleção manual.
      return null;
    }
    return null;
  }
  ```
  Se `autorPadrao() === null`, mostra seletor explícito. Caso
  contrário, pré-seleciona mas permite trocar.

- **MenuLateral seção Utilitários (após K2)**: esconde "Ciclo" se
  ambos `sexoDeclarado` são `'masculino'`.

- **Tests**: `tests/lib/ciclo/inferencia.test.ts` — 6 combinações
  (M+M, M+F, F+M, F+F, M+sozinho, F+sozinho).

- **E2E**: `tests/e2e/playwright/m-save-ciclo.e2e.ts`.

- **Screenshots**: `A-ciclo-inferido-pessoa-b.png`,
  `A-ciclo-pede-selecao.png`.

## §5 Validação adb

```bash
# Cenário 1: homem casal com mulher (Sam M, Ana F)
adb shell pm clear com.ouroboros.mobile
# Onboarding com sexoDeclarado.
# Tap Ciclo → Novo. Esperado: autor=pessoa_b (Ana) pré-selecionado.
adb shell run-as com.ouroboros.mobile cat /sdcard/Documents/Ouroboros/markdown/ciclo-*.md
# Cenário 2: 2 homens (Sam M, João M)
# Esperado: item "Ciclo" oculto no MenuLateral.
```

## §6 Commit

```
feat: i-ciclo save ciclo valida + inferencia autor por sexo onboarding
```

## §7 Decisões

- **Inferência só com 1 pessoa feminina**: ambígua se ambas são
  femininas (mãe + filha, casal lésbico) → pede seleção manual.
- **`'nao-binario'` conta como elegível** para inferência se solo:
  respeita autonomia do usuário.
- **Esconde no menu se ambos masculino**: UX limpa, evita feature
  irrelevante.
