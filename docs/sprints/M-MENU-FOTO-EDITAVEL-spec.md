# Sprint K3 — M-MENU-FOTO-EDITAVEL

```
DEPENDE:    nada
BLOQUEIA:   [BUILD APK PREVIEW]
ESTIMATIVA: ~1h
STATUS:     [todo]
```

## §1 Achado

Dono quer que tap na foto/nome do `CabecalhoPessoa` no MenuLateral
abra tela de edição (alterar foto via AvatarPicker + alterar nome via
Input).

## §2 Tarefa

1. Em `src/components/chrome/MenuLateral.tsx`:
   - `CabecalhoPessoa` (linhas 220+) vira `<Pressable>` com `onPress`
     que navega para `/settings/editar-pessoa?pessoa=<pessoaAtiva>`.

2. Verificar se `app/settings/editar-pessoa.tsx` já existe. Se sim,
   ajustar para aceitar query param `?pessoa=...`. Se não, criar:

   ```tsx
   import { useLocalSearchParams } from 'expo-router';

   export default function EditarPessoaScreen() {
     const { pessoa } = useLocalSearchParams<{ pessoa: 'pessoa_a' | 'pessoa_b' }>();
     // AvatarPicker + Input(nome) + botão Salvar.
   }
   ```

3. Save chama `usePessoa.atualizar(pessoa, { nome, foto })`.

4. Tests: `tests/components/chrome/MenuLateral.test.tsx` — tap em
   `CabecalhoPessoa` chama `router.push('/settings/editar-pessoa?...')`.

## §3 Restrições

- Anonimato Regra −1.
- PT-BR sentence case.

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="(MenuLateral|editar-pessoa)"
./scripts/smoke.sh
```

## §5 Validação Gauntlet

PNG sequência:
- `A-menu-cabecalho-pressable.png` (drawer aberto)
- `A-editar-pessoa-form.png` (tela de edição)

## §6 Commit

```
feat: k3 menu foto editavel + tela editar pessoa
```

## §7 Decisões

- **Tap na foto OU no nome**: ambos navegam para edição (mesma `Pressable`
  envolve foto+nome inteiros).
