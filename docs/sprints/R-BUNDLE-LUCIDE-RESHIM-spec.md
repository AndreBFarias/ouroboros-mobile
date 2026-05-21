# R-BUNDLE-LUCIDE-RESHIM — Fix bypass do shim lucide em app/index.tsx + ESLint guard

**Tipo:** fix (regressão tree-shake)
**Prioridade:** P1-high
**Estimativa:** ~1h
**Fase:** 3 (achado top da auditoria R-BUNDLE-SIZE-AUDIT)
**ADR sugerida:** nenhuma (extensão operacional de `src/lib/icons.ts`)

## Contexto

Auditoria `R-BUNDLE-SIZE-AUDIT` (`docs/auditoria-bundle-2026-05-21/`)
identificou que `lucide-react-native` regrediu o tree-shake e
contribuiu **+1305 KB raw** ao bundle Android Hermes em 17 dias
(crescimento de 8,5 MB → 10,23 MB total).

Causa raiz: **`app/index.tsx:29`** importa o ícone `Sparkles` direto do
pacote root:

```ts
import { Sparkles } from 'lucide-react-native';
```

O projeto tem `src/lib/icons.ts` — shim canônico que re-exporta apenas
os ícones efetivamente usados, permitindo Metro/Hermes tree-shake
agressivo. O bypass em `app/index.tsx` deixa o módulo de barrel inteiro
do lucide reachable, vazando ~1305 KB.

Ganho estimado pelo agente: **-650 KB Hermes** (bundle volta para
~9,58 MB). Fix < 10 linhas de código.

## Hipotese técnica

`src/lib/icons.ts` já exporta o conjunto canônico de ícones. Basta:

1. Mover o import de `Sparkles` para `@/lib/icons` (adicionar export se
   necessário).
2. Adicionar regra ESLint `no-restricted-imports` banindo o pacote root
   `'lucide-react-native'` em `src/` e `app/` (exceto no próprio
   `src/lib/icons.ts`).

## Escopo

### A. Investigação obrigatória (grep pré-fix)

```bash
# Confirmar Sparkles ainda usado em app/index.tsx:29
grep -n "Sparkles" app/index.tsx
# Confirmar shape do shim icons
head -80 src/lib/icons.ts
grep -c "Sparkles" src/lib/icons.ts || echo "ausente — adicionar export"
# Outros bypasses do lucide root (auditoria)
grep -rn "from 'lucide-react-native'" src/ app/ tests/ --include="*.ts" --include="*.tsx" | grep -v "src/lib/icons.ts"
# Esperado: 1 match (app/index.tsx:29). Se houver mais, fix abrangente.
```

### B. Fix cirúrgico

1. Se `Sparkles` não está em `src/lib/icons.ts`, adicionar export.
2. Em `app/index.tsx:29`, trocar:
   ```ts
   // Antes
   import { Sparkles } from 'lucide-react-native';
   // Depois
   import { Sparkles } from '@/lib/icons';
   ```
3. Confirmar que comportamento visual não muda (mesma fonte do ícone).
4. **Audit transversal:** corrigir todos os outros bypasses encontrados
   no grep (se houver, deve ser cobertura completa).

### C. ESLint guard durável

Em `eslint.config.js`, adicionar regra `no-restricted-imports` para
`src/` e `app/`:

```js
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'lucide-react-native',
        message: 'Importe de @/lib/icons (shim de tree-shake). Bypass quebra bundle Hermes (R-BUNDLE-LUCIDE-RESHIM 2026-05-21).',
      }],
    }],
  },
}
```

Override apenas em `src/lib/icons.ts` (file pattern específico permite
o import root).

### D. Validação de ganho

Após fix:

```bash
npx expo export --platform android --output-dir /tmp/bundle-pos-reshim
du -sh /tmp/bundle-pos-reshim/_expo/static/js/android/*.hbc
```

Esperado: bundle reduz de **10,23 MB → ~9,58 MB** (-650 KB, -6,4%).

Se ganho < 400 KB → investigar outros bypasses não detectados pelo grep.

## OFF-LIMITS

**Pode tocar:**
- `app/index.tsx` (linha 29)
- `src/lib/icons.ts` (se precisar adicionar export `Sparkles`)
- `eslint.config.js` (regra `no-restricted-imports`)
- Outros consumidores SE auditoria revelar mais bypasses (lista
  completa de paths a tocar deve aparecer no proof-of-work)

**Não pode tocar:**
- `package.json` (não remover lucide-react-native — outras integrações)
- Schemas, stores, hooks de domínio
- `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `STATE.md`, `VALIDATOR_BRIEF.md`, `Checkpoint.md` (orquestrador)

## Verificação canônica

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
./scripts/smoke.sh

# Sanity 3 runs
for i in 1 2 3; do npm test --silent 2>&1 | grep "Test Suites:" | tail -1; done

# Bundle pos-fix
npx expo export --platform android --output-dir /tmp/bundle-pos-reshim
du -sh /tmp/bundle-pos-reshim/_expo/static/js/android/*.hbc

# Confirmar ESLint pega bypass novo
echo "import { Heart } from 'lucide-react-native';" > /tmp/test-eslint.tsx
npx eslint /tmp/test-eslint.tsx 2>&1 | head
# Esperado: erro de no-restricted-imports
rm /tmp/test-eslint.tsx

# Leak gauntlet ainda 0/6
./scripts/check_gauntlet_leak.sh
```

## Proof-of-work esperado

1. Lista completa de bypasses encontrados (grep audit).
2. Diff (<20 linhas total esperado: app/index.tsx + icons.ts + eslint.config.js).
3. Output `du -sh` antes/depois do bundle Hermes.
4. Smoke verde + 3 runs sanity verde.
5. ESLint bloqueando import bypass novo (validação empírica).
6. Hash commit no worktree.
7. Achados colaterais.

## Decisão

**P1-high** porque:
- Pré-requisito de M41 (release v1.0.0).
- Fix cirúrgico (<10 LOC) com ganho desproporcional (-650 KB).
- ESLint guard previne regressão futura (sem custo runtime).
- Anti-débito: bypass detectado por auditoria deve fechar imediato.

## Origem

Achado #1 (top contribuinte) do agente `a11c0952c5c0470b7` ao executar
`R-BUNDLE-SIZE-AUDIT`. Citado textualmente:
"`R-BUNDLE-LUCIDE-RESHIM` (P1-high, ~1h): trocar `app/index.tsx:29`
de `import { Sparkles } from 'lucide-react-native'` para `from '@/lib/icons'`.
Adicionar regra ESLint `no-restricted-imports` banindo o pacote root.
Fix <10 LOC. Ganho estimado: -650 KB Hermes (bundle volta para ~9,58 MB)."
