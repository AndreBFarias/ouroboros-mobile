# Sprint M24 — Resume state e auto-save de rascunhos

```
DEPENDE:    M23 (onboarding finalizado em 3 frames)
BLOQUEIA:   M30 / M31 / M33 (formulários consomem rascunhos)
ESTIMATIVA: 5-6h
```

## 1. Objetivo

Garantir que o app **nunca perca dados em digitação**: cada formulário
auto-salva rascunho a cada 500ms; ao reabrir o app, restaura a última
rota visitada e qualquer rascunho não-persistido. Cobre humor-rapido,
diario-emocional, eventos, ciclo/registrar, alarmes/novo,
contadores/novo, SheetNovaTarefa.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/sessao.ts`
  — store zustand persist com:
  ```ts
  interface SessaoState {
    ultimaRota: string | null;
    rascunhos: {
      humorRapido: HumorParcial | null;
      diarioEmocional: DiarioParcial | null;
      eventos: EventoParcial | null;
      cicloRegistrar: CicloParcial | null;
      alarmesNovo: AlarmeParcial | null;
      contadoresNovo: ContadorParcial | null;
      tarefasNova: TarefaParcial | null;
    };
    permissoesPedidas: {
      storage: boolean;
      notif: boolean;
      camera: boolean;
      mic: boolean;
    };
    atualizadoEm: string;
    setUltimaRota: (rota: string) => void;
    salvarRascunho: <K extends RascunhoKey>(k: K, p: RascunhoTipo<K>) => void;
    limparRascunho: (k: RascunhoKey) => void;
    marcarPermissaoPedida: (k: PermissaoKey) => void;
  }
  ```
  Persistido em SecureStore via `secureStorage` adapter
  (`ouroboros.sessao.v1`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useAutoSaveRascunho.ts`
  — hook genérico:
  ```ts
  function useAutoSaveRascunho<K extends RascunhoKey>(
    chave: K, valor: RascunhoTipo<K>, debounceMs = 500
  ): void
  ```
  debounced internamente.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useUltimaRota.ts`
  — hook que escuta `useNavigation` ou `usePathname` e chama
  `useSessao.setUltimaRota`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/stores/sessao.test.ts`
  — testes do store.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/hooks/useAutoSaveRascunho.test.tsx`
  — teste de debounce e cleanup.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/index.ts`
  — exportar `useSessao`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — adicionar boot hook que após hidratação total chama
  `router.replace(ultimaRota)` quando `ultimaRota` não-modal.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/humor-rapido.tsx`
  — hidratar com `useSessao.rascunhos.humorRapido`; salvar via
  `useAutoSaveRascunho('humorRapido', state)`. Limpar pós-save.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx`
  — idem para `diarioEmocional`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/ciclo/registrar.tsx`
  — idem (`cicloRegistrar`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/alarmes/novo.tsx`
  — idem (`alarmesNovo`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/(tabs)/contadores/novo.tsx`
  — idem (`contadoresNovo`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/todo/SheetNovaTarefa.tsx`
  — idem (`tarefasNova`).

### Arquivos NÃO modificados

- Schemas Zod (rascunhos parciais usam `type Partial<X>`).
- Outros stores (`useVault`, `usePessoa`, `useOnboarding`,
  `useSettings`).

## 3. APIs reutilizáveis

- `secureStorage` adapter em `src/lib/stores/persist.ts`.
- `useHasHydrated` em `src/lib/stores/hydrated.ts`.
- `usePathname()` ou `useSegments()` do `expo-router`.
- `useRouter()` para `router.replace`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Stores barrel:** seção 1.4 — adicionar `useSessao`.
- **Boot hook:** seção 1.7 — restore de rota no `app/_layout.tsx`.
- **Plug em formulários:** cada uma das 7 telas listadas em
  Entregáveis recebe 2 hooks novos (`useAutoSaveRascunho` para
  salvar; `useEffect` para hidratar).

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR.
- TS strict — sem `any`. Tipos discriminados por chave (`K extends
  keyof SessaoState['rascunhos']`).
- Não persistir rascunhos com `dataInicial: undefined` (filtrar).
- **Não restaurar** rotas modais (`humor-rapido`, etc.) — só rotas
  de visualização (`/`, `/(tabs)/...`). Modal aberto de novo seria
  intrusivo.
- Debounce 500ms — evitar overhead de SecureStore write a cada
  keystroke.
- **Armadilha A20 (BRIEF §4)**: SecureStore Android limita ~2KB
  por valor. Rascunhos individuais (humorRapido, alarmesNovo,
  etc.) cabem facilmente. Mas a **soma serializada de todos os 7
  rascunhos** sob a chave única `ouroboros.sessao.v1` pode
  estourar se o usuário tiver textos longos em diário emocional
  (textarea livre). **Mitigações obrigatórias:**
  - Cap por rascunho de texto livre: **2000 caracteres** (truncar
    silenciosamente ao salvar; UI não impede digitar mais, mas
    rascunho só preserva 2000).
  - Antes de cada `setItemAsync`, calcular `JSON.stringify(state).length`
    e logar warning se > 1500 bytes (canário).
  - Se warning persistir, plano-B: dividir em múltiplas chaves
    SecureStore (`ouroboros.sessao.v1.rascunho.diario` etc.) em
    sprint futura M24.x.
- **Após M27**, todos os paths de formulários movem de
  `app/(tabs)/X` para `app/X`. M24 já assume essa migração porque
  bloqueia formulários — atualizar paths ao executar **se M27 já
  rodou** (que é a ordem prevista).

## 5. Procedimento sugerido

1. Criar `useSessao` store + testes.
2. Criar `useAutoSaveRascunho` hook genérico (debounced via setTimeout
   + cleanup).
3. Criar `useUltimaRota` hook usando `useSegments` do expo-router.
4. Editar `app/_layout.tsx`: adicionar `useEffect` pós-hidratação que
   chama `router.replace(ultimaRota)` se rota não for modal e for
   válida.
5. Para cada um dos 7 formulários:
   - Adicionar `const rascunho = useSessao(s => s.rascunhos.X)` no
     topo.
   - `useState` inicial: `useState(() => rascunho ?? defaultValue)`.
   - `useAutoSaveRascunho('X', estadoAtual)`.
   - Pós-save bem-sucedido: `useSessao.getState().limparRascunho('X')`.
6. Testes integration: render formulário com rascunho prévio +
   confirma valor restaurado.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m24-export && rm -rf /tmp/m24-export

# Manual no emulador:
# 1. Abrir humor-rapido, mexer slider humor=4, NÃO salvar, fechar app
# 2. Reabrir app: rota anterior restaurada
# 3. Reabrir humor-rapido: slider humor já em 4
# 4. Salvar; reabrir: humor volta para default 3 (rascunho limpo)
```

## 7. Commit

```
feat: m24 sessao store auto save rascunhos e resume state
```

## 8. Checkpoint visual

2 screenshots Nível A em `docs/sprints/M24-screenshots/`:
- `A-rascunho-restaurado.png` — humor-rapido reaberto com slider em
  valor não-default, mostrando hidratação.
- `A-rota-restaurada.png` — após reload, app abre direto na rota
  anterior (não na home).

## 9. Decisões tomadas

- **SecureStore para rascunhos**: rascunhos contêm dados sensíveis
  (texto livre de diário emocional). SecureStore criptografa.
- **Cap de 2000 caracteres por textarea no rascunho** (vide A20):
  evita estourar o limite ~2KB por valor do EncryptedSharedPreferences
  Android. Truncamento silencioso preserva UX (usuário pode digitar
  mais; só não vai restaurar tudo após reabrir antes de salvar).
- **Canário no `setItemAsync`**: log warning se serialização passar
  de 1500 bytes. Se aparecer em telemetria local (`__DEV__`), plano-B
  é split em chaves múltiplas (sprint M24.x futura).
- **Debounce 500ms**: balanço entre overhead I/O e perda em crash.
- **Limpar rascunho pós-save**: evitar restaurar dados já
  persistidos.
- **Rotas modais não restauradas**: abrir um sheet "automaticamente"
  no boot é intrusivo. Apenas rotas de visualização (Hoje/Memórias/
  Humor/etc.) são restauradas.
- **Migração v1.0-rc1**: `useSessao` é totalmente novo; sem
  migração necessária (default state inicial).
- **Permissões marcadas no store**: evitar pedir várias vezes.
  Quando `permissoesPedidas.notif === true`, não pede de novo (até
  reset manual).
- **Paths de formulários em raiz após M27**: M24 executa após M27
  na ordem prevista; usar `app/<rota>.tsx` (não `(tabs)`).

Sprint pronta para execução sem perguntas pendentes.
