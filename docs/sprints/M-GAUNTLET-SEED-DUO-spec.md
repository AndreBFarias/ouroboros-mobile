# Sprint M-GAUNTLET-SEED-DUO — Seed Gauntlet seta tipoCompanhia em useSettings

```
DEPENDE:    M29 (useSettings.pessoa.tipoCompanhia canônico)
            + M-GAUNTLET-AUDITORIA fechada
BLOQUEIA:   nenhuma (nice-to-have de DX)
ESTIMATIVA: 0,5h
PRIORIDADE: baixa
STATUS:     [todo]
```

## 1. Achado (validação visual M33 2026-05-04)

`__gauntlet.seed({ nomeA, nomeB })` seta `useOnboarding.tipoCompanhia
= 'casal'` mas NÃO seta `useSettings.pessoa.tipoCompanhia = 'duo'`.

Componentes que leem do canônico atual (`useSettings.pessoa.
tipoCompanhia`, ex: `<SeletorPara>` da M33, `<SeletorPessoaDestino>`
da M31) renderizam como modo `'sozinho'` mesmo após seed em modo
casal — invisíveis na validação visual.

Testes Jest cobrem corretamente (138 suítes verde) porque o teste
unitário monta o componente com `useSettings` mockado em
`'duo'`. Validação visual via Gauntlet é que falha.

## 2. Solução

`src/lib/dev/gauntlet.ts::aplicarSeed(opts)`:
- Quando `nomeB` não-null: `useSettings.setState({ pessoa: { ...pessoaAtual, tipoCompanhia: 'duo' } })`.
- Quando `nomeB` null: `tipoCompanhia: 'sozinho'`.

Mesma lógica para `setNomes()`.

## 3. Verificação

```bash
./gauntlet.sh
# Em browser:
# window.__gauntlet.seed({ nomeA: 'Alex', nomeB: 'Sam' });
# location.href = '/eventos';
# Esperado: chips "Para mim / Para Sam / Para o casal" visíveis.
```

Sprint pronta. Aritmética esperada: 1257 + 1-2 testes do seed.
