# ADR 0015 — Identidade de Pessoas em Runtime com Nome e Foto

```
Status:     Aceito
Data:       2026-04-29
Sprint:     M03 + M03.2 (foto de perfil) + M00.docs (formalização)
Estende:    ADR-0011 (PESSOA_A / PESSOA_B genéricos)
```

## Contexto

A ADR-0011 estabeleceu que código nunca contém nome real de pessoa,
usando sempre os identificadores genéricos `pessoa_a` e `pessoa_b`,
com mapeamento para nomes feito em `src/config/pessoas.config.ts`
versionado. Isso resolveu o problema de _hardcoded names_ no código,
mas deixou ambiguidades operacionais:

1. **Nome no config versionado x runtime**: se o config versionado
   tem `Nome_A` / `Nome_B` genéricos, o app sempre mostra esses
   placeholders. Para personalizar, o usuário precisa editar o
   arquivo, fazer commit e instalar de novo. Inviável.
2. **Foto de perfil**: requisito surgido no checkpoint visual M01.5
   ("permitir que o user adicione sua foto de perfil"). Foto não
   cabe em config TS (binário grande, não versionável).
3. **Adaptabilidade a outros usuários**: o app deve funcionar para
   qualquer casal sem trocar código. Edição de nomes pelo próprio
   usuário no app é o caminho.

## Decisão

A identidade de pessoas vive em **dois níveis**:

### Nível 1 — Código (sempre genérico)

`src/lib/schemas/pessoa.ts`:

```ts
export const PessoaIdSchema = z.enum(['pessoa_a', 'pessoa_b', 'ambos']);
export type PessoaId = z.infer<typeof PessoaIdSchema>;

export const PessoaAutorSchema = z.enum(['pessoa_a', 'pessoa_b']);
export type PessoaAutor = z.infer<typeof PessoaAutorSchema>;
```

Cores fixas (em `src/config/pessoas.config.ts` versionado, defaults
genéricos):

```ts
export const PESSOAS_CONFIG: Record<PessoaId, PessoaConfig> = {
  pessoa_a: { nome: 'Nome_A', inicial: 'A', cor: '#bd93f9' },
  pessoa_b: { nome: 'Nome_B', inicial: 'B', cor: '#ff79c6' },
  ambos:    { nome: 'Ambos',  inicial: 'AB', cor: '#bd93f9' },
};
```

### Nível 2 — Runtime (preenchido pelo usuário, persistido em SecureStore)

`src/lib/stores/pessoa.ts`:

```ts
interface PessoaStore {
  pessoaAtiva: PessoaAutor;
  filtroPessoa: PessoaId;
  nomes: Record<PessoaAutor, string>;             // editável
  fotos: Record<PessoaAutor, string | null>;       // URI local de foto
  // ... actions
}
```

Persiste em SecureStore via `secureStorage` adapter
(`src/lib/stores/persist.ts`), chave `ouroboros.pessoa.v1`.

### Onboarding

A Sprint M03 implementou:

- **Frame 0**: `<AvatarPicker pessoa="pessoa_a">` + `<Input>` de nome.
- **Frame 1** (se duo): `<AvatarPicker pessoa="pessoa_b">` + `<Input>`
  de nome do parceiro.

Fotos copiadas para `${documentDirectory}avatars/<pessoa>-<timestamp>.jpg`
para URIs estáveis entre sessões e cache do `<Image>` invalidado a
cada troca.

### Lookup runtime

Helper `nomeDe(pessoa)` em `src/lib/stores/pessoa.ts`:

```ts
export function nomeDe(pessoa: PessoaId): string {
  if (pessoa === 'ambos') return PESSOAS_CONFIG.ambos.nome;
  const { nomes } = usePessoa.getState();
  return nomes[pessoa] ?? PESSOAS_CONFIG[pessoa].nome;
}
```

Toda renderização de UI consome `nomeDe()`, nunca acessa o config
diretamente.

## Frontmatter dos `.md`

Continua usando identificador genérico:

```yaml
---
tipo: humor
data: 2026-04-29
autor: pessoa_a              # nunca o nome real
---
```

Backend resolve para nome real via `mappings/pessoas.yaml` (ver
ADR-0011 e Sprint MOB-bridge-1).

## Validação automática

`scripts/check_anonimato.sh` continua bloqueando nomes reais em
qualquer arquivo `.ts/.tsx/.md` versionado. SecureStore fica fora do
versionamento, então nomes reais ali não disparam o check.

## Consequências

### Positivas

- **Adaptável a qualquer casal**: app funciona sem editar código.
- **Identidade no app sem expor no repositório**: fortalece Regra −1.
- **Fotos localmente**: zero rede, zero upload.
- **URIs estáveis**: timestamp no path invalida cache do `<Image>` ao
  trocar foto.
- **Ativação dinâmica**: usuário sozinho pode adicionar segunda
  pessoa depois nos Settings (M15).

### Negativas

- **Foto perdida ao desinstalar**: SecureStore + `documentDirectory`
  são wipados. Mitigação: backup futuro via export ZIP do Vault
  (planejado em M15 — Settings).
- **Sync entre 2 celulares**: nome de pessoa_b está em SecureStore
  local, não no Vault. Cada celular configura individualmente. Foto
  idem. Trade-off aceito; alternativa (sync via Vault) exporia foto a
  apps com permissão de leitura do diretório.

## Migração / Compatibilidade

Onboarding M03 oferece reset ("Resetar onboarding") via storybook
durante dev. Em produção (M15 Settings) terá toggle "Editar nomes e
fotos" + botão "Adicionar segunda pessoa" se sozinho.

## Referências

- ADR-0011 — Pessoa A/B genéricos (predecessor direto).
- Sprint M03 — Onboarding com identidade dinâmica.
- Sprint M03.2 — Foto de perfil com AvatarPicker.
- Sprint M03.5 — Timestamp no path da foto.
- `src/components/ui/AvatarPicker.tsx`
- `src/components/ui/PersonAvatar.tsx`
- `src/lib/stores/pessoa.ts`
