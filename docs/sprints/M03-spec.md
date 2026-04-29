# Sprint M03 — Onboarding (4 frames + identidade dinâmica)

```
DEPENDE: M02 + fixes m02.1/m02.2 (commit 6f20df2)
SUCEDE: M04 (FAB Radial integrado em capturas reais)
ESTIMATIVA: 3-4 horas
```

## Objetivo

Substituir o modal "Permitir acesso ao Vault" (que hoje vive em
`app/index.tsx` da M02) por um **fluxo de onboarding completo de
4 frames** que coleta:

1. Nome do usuário primário
2. Se há companheiro(a) e como se chama
3. Pasta do Vault (SAF)
4. Serviço de sync utilizado (informativo)

Ao final, persiste tudo em SecureStore (via stores zustand) e
redireciona para a Tela 01 (hoje).

## Princípios

- **Adaptável a qualquer usuário** (Regra −1 reforçada): nomes
  digitados pelo usuário ficam em **storage runtime**; código nunca
  contém nomes reais.
- **Sentence case + acentuação completa PT-BR** em todas as strings
  de UI.
- **Springs em todas as transições** entre frames.
- **Validação inline** (input vazio mostra mensagem `--red` micro
  abaixo do input, sem toast).
- **Saída só por avanço**: cada frame tem botão "Continuar". Frame 1
  só avança com nome digitado. Frame 3 só avança com Vault concedido.

## Entregáveis

### 1. Nova store — `src/lib/stores/onboarding.ts`

Zustand persist via SecureStore (espelho de `usePessoa`):

```ts
interface OnboardingState {
  done: boolean;                                  // marca concluído
  tipoCompanhia: 'sozinho' | 'casal' | 'amigos'; // informativo
  syncMethod: 'syncthing' | 'obsidian_sync' | 'nenhum';
  setTipoCompanhia(t): void;
  setSync(s): void;
  marcarConcluido(): void;
  resetar(): void; // util para teste/debug
}
```

Chave SecureStore: `ouroboros.onboarding.v1`.

### 2. Tela de Onboarding — `app/onboarding.tsx`

Uma única rota com state interno controlando 5 etapas (4 frames de
input + 1 frame de "tudo pronto"). Transições em
`<MotiView from={{ translateX: 412, opacity: 0 }}
animate={{ translateX: 0, opacity: 1 }} transition={springs.default}>`.

**Estrutura de state:**
```tsx
const [frame, setFrame] = useState<0 | 1 | 2 | 3 | 4>(0);
```

**Frame 0 — Boas-vindas + nome (substitui o "Bem-vindo" do PermissaoVaultModal)**

- Header pequeno em laranja: `"Antes de começar"`
- Heading body em fg: `"Como você se chama?"`
- Sub muted: `"Esse nome aparece nos seus registros e na tela inicial.
  Pode trocar depois nos ajustes."`
- `<Input placeholder="Seu nome">` (novo prop `value/onChange` se
  ainda não existe — verificar API atual do Input M01.3).
- `<Button label="Continuar" disabled={nome.trim().length < 1}>`
- Validação inline: se `Continuar` for pressionado com vazio, mostrar
  `<Text>` micro red `"Por favor, digite um nome."` por 2,5s
  (usar `useToast`).

**Frame 1 — Companhia**

- Heading: `"Mais alguém usa este Vault com você?"`
- Sub muted: `"Você pode usar sozinho. Se for compartilhar, tudo o
  que vocês registrarem aparece para os dois."`
- Cards 2 colunas (cartões grandes 140×120, radius 14):
  - `"Sozinho"` (single, default selected)
  - `"Com mais alguém"` (single)
- Se "Com mais alguém" selecionado, expande sub-bloco com
  `<MotiView from={{ height: 0, opacity: 0 }}
   animate={{ height: 'auto', opacity: 1 }}>`:
  - Pergunta: `"Vocês são…"`
  - Chips single-select: `Casal`, `Amigos`. (Apenas informativo;
    não afeta cores nem permissões.)
  - Input `"Como ela(e) se chama?"` → vai para
    `usePessoa.setNome('pessoa_b', valor)`.
  - Botão `Continuar` só habilita com nome válido.
- Se "Sozinho", botão habilita imediatamente.

**Frame 2 — Pasta do Vault**

- Heading: `"Onde fica seu Vault?"`
- Sub muted: `"Aponte uma pasta no seu celular onde os arquivos .md
  vão ficar. Se você usa Obsidian ou Syncthing, escolha a mesma
  pasta usada lá. Se não usa, escolha qualquer pasta local."`
- Card mostrando a pasta atual (se houver):
  - Ícone Folder em cyan
  - Caminho decodificado em mono-medium fg
  - `<Button variant="ghost" label="Trocar pasta">`
- Se não houver pasta:
  - Card vazio com texto muted `"Nenhuma pasta selecionada"`
  - `<Button variant="primary" label="Escolher pasta">`
- Tap em "Escolher pasta" / "Trocar pasta" chama
  `requestVaultPermission()` (já existe em `src/lib/vault/permissions.ts`).
- `Continuar` desabilitado até `vaultRoot != null`.
- **Pós-permissão**: rodar uma checagem soft: se a pasta não tem
  `daily/` e `eventos/` ainda, mostrar info muted
  `"As subpastas necessárias serão criadas automaticamente quando
  você fizer o primeiro registro."` (não é erro; só informa).

**Frame 3 — Serviço de Sync**

- Heading: `"Como você sincroniza entre dispositivos?"`
- Sub muted: `"O Ouroboros não gerencia sincronização: ele apenas
  lê e escreve arquivos na pasta. Se você usa um serviço de sync,
  basta apontar para a mesma pasta nos outros dispositivos."`
- 3 cards verticalmente empilhados:
  1. **Syncthing** (recomendado, mostrado primeiro).
     `"Sincronização P2P entre dispositivos. Recomendado se você
     já tem o Syncthing rodando."`
  2. **Obsidian Sync**.
     `"Serviço pago do Obsidian. Sincroniza pelo servidor da
     Obsidian Inc."`
  3. **Não uso ainda**.
     `"Sem problema. Você pode escolher depois nos ajustes."`
- Tap seleciona (single-select). Estado salvo em
  `useOnboarding.setSync()`.
- `Continuar` habilita após qualquer seleção.

**Frame 4 — Tudo pronto**

- Card grande central com:
  - Ícone Check em verde 64dp
  - Heading: `"Tudo pronto, {nome}."`
  - Sub muted (se sozinho): `"Toque + para começar."`
  - Sub muted (se duo): `"Você e {nome2} estão configurados."`
- `<Button label="Começar">` chama `useOnboarding.marcarConcluido()`
  e `router.replace('/')`.

### 3. Atualizar `app/index.tsx` (Tela 01 - hoje)

- Remover bloco `if (!vaultRoot) return <PermissaoVaultModal>`.
- Adicionar checagem de onboarding no topo:
  ```tsx
  const done = useOnboarding(s => s.done);
  if (!done) return <Redirect href="/onboarding" />;
  ```
- Caso de borda: se `done === true` mas `vaultRoot === null` (raro,
  ex: usuário limpou config), redirect para `/onboarding`.

### 4. Atualizar Header da Tela 01

Header continua mostrando "Hoje", mas agora abaixo do título pode
mostrar `"Bom dia, {nomeDe(pessoaAtiva)}"` em micro muted (opcional;
se ficar denso, deixar para sprint futura).

### 5. Testes

- `tests/lib/stores/onboarding.test.ts` — store novo, persist key,
  reset.
- `tests/components/onboarding/Frame0.test.tsx` — input nome
  validation.
- `tests/components/onboarding/Frame1.test.tsx` — toggle
  sozinho/duo, nome do segundo.
- `tests/components/onboarding/Frame3.test.tsx` — single-select de
  sync.

(Frame 2 envolve SAF que é difícil de mockar; smoke apenas.)

Total esperado: 105 + ~12 = **≥117 testes**.

## Sucesso = (todos verificáveis)

1. Arquivos criados nos paths exatos.
2. `npx tsc --noEmit` exit 0.
3. `./scripts/smoke.sh` OK.
4. `npm test --silent` OK, total ≥ 117.
5. `npx expo export --platform android` exit 0.
6. **Validação visual:** após apagar `~/.claude/.../onboarding`
   storage (ou rodar com Vault novo), app abre direto na tela
   `/onboarding` Frame 0; usuário avança pelos 5 frames; ao tocar
   "Começar" no Frame 4, vai para Tela 01.
7. **Commit:** `feat: m03 onboarding 4 frames com identidade dinamica e escolha de vault`

## Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded. Nomes digitados
  ficam em SecureStore.
- **Sem emojis**.
- **Strings de UI** Sentence case + acentos PT-BR completos.
- **`accessibilityLabel`** sem acento.
- **Comentários** sem acento.
- **TypeScript strict**.
- **Imports** via alias `@/*`.
- **NÃO mexer** em `src/components/ui/*` (M01) — usar componentes
  como estão. Se faltar API (ex: `Input` precisar de `onChangeText`),
  reportar como achado e pedir extensão; **não modificar inline**.
- **NÃO mexer** em `src/lib/motion.ts`, `src/lib/haptics.ts`,
  `src/lib/schemas/pessoa.ts`, `src/config/pessoas.config.ts`.
- Pode estender `src/lib/stores/pessoa.ts` apenas se faltar action
  para setar nome (já existe `setNome`).

## Procedimento Recomendado

1. Criar `src/lib/stores/onboarding.ts` + teste.
2. Criar `app/onboarding.tsx` com state de frame interno + transições
   spring.
3. Implementar Frame 0 (nome) → testar fast refresh no celular.
4. Frame 1 (companhia).
5. Frame 2 (vault) — reutilizar `requestVaultPermission()`.
6. Frame 3 (sync).
7. Frame 4 (feito).
8. Atualizar `app/index.tsx` (gate de onboarding).
9. Validar tsc + tests + export.
10. Commit.

## Conteúdo de Referência

### `src/lib/stores/onboarding.ts`

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/stores/persist';

export type TipoCompanhia = 'sozinho' | 'casal' | 'amigos';
export type SyncMethod = 'syncthing' | 'obsidian_sync' | 'nenhum';

interface OnboardingStore {
  done: boolean;
  tipoCompanhia: TipoCompanhia;
  syncMethod: SyncMethod;
  setTipoCompanhia: (t: TipoCompanhia) => void;
  setSync: (s: SyncMethod) => void;
  marcarConcluido: () => void;
  resetar: () => void;
}

export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      done: false,
      tipoCompanhia: 'sozinho',
      syncMethod: 'nenhum',
      setTipoCompanhia: (tipoCompanhia) => set({ tipoCompanhia }),
      setSync: (syncMethod) => set({ syncMethod }),
      marcarConcluido: () => set({ done: true }),
      resetar: () => set({ done: false, tipoCompanhia: 'sozinho', syncMethod: 'nenhum' }),
    }),
    {
      name: 'ouroboros.onboarding.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
```

### Esqueleto `app/onboarding.tsx`

Ver Procedimento. Use Moti para slide horizontal entre frames:

```tsx
<MotiView
  key={frame}
  from={{ translateX: 412, opacity: 0 }}
  animate={{ translateX: 0, opacity: 1 }}
  exit={{ translateX: -412, opacity: 0 }}
  transition={springs.default}
>
  {/* conteudo do frame */}
</MotiView>
```

Use `<AnimatePresence>` da Moti para gerir saída quando `frame`
muda.

## Critério de Validação

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m03-export && rm -rf /tmp/m03-export
```

Todos exit 0. Após commit, planejador reabre Expo com cache limpo
para forçar primeira execução do onboarding.

## Reporte ao Final

1. Lista de arquivos criados/modificados (paths absolutos).
2. Saída literal de tsc, smoke, npm test, expo export.
3. Quantidade total de testes (≥ 117).
4. Achados (formato `ACHADO: ... | Sugestão: ...`). Em particular,
   se algum componente UI da M01 precisar de prop nova, reportar
   sem modificar.
5. **Faça o commit** com mensagem exata
   `feat: m03 onboarding 4 frames com identidade dinamica e escolha de vault`
   e reporte o hash.
