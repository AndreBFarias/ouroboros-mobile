# Sprint M15 — Settings

```
DEPENDE:    M03 (onboarding com identidade dinâmica) + M02 (Vault Bridge)
BLOQUEIA:   M14.5, M16, M17, M18 (todos dependem do toggle de feature em Settings)
ESTIMATIVA: 6-7h
```

## 1. Objetivo

Entregar a **Tela 23 (Settings)**: lista agrupada de toggles e
selects que controla todo o comportamento opcional do app —
notificações, lembretes, identidade de pessoas, sync, qualidade do
scanner, ativação de features opt-in (ciclo menstrual, alarme,
to-do, contador), privacidade (biometria, exportação) e
informações sobre o app. Esta sprint é o ponto de entrada para o
**Lote C completo**: as features M14.5, M16, M17 e M18 só
aparecem no menu lateral quando ativadas aqui. Toggles default
**desativados** para minimizar superfície e respeitar consentimento.

## 2. Entregáveis

### Arquivos novos

- `app/(tabs)/settings/index.tsx` — Tela 23 principal.
- `app/(tabs)/settings/editar-pessoa.tsx` — sub-tela acessada por
  link do bloco "Pessoa" (editar nomes e fotos).
- `app/(tabs)/settings/adicionar-segunda-pessoa.tsx` — sub-tela
  acessada apenas se `tipoCompanhia === 'sozinho'`. Replica frame
  de onboarding M03 para preencher pessoa_b.
- `src/components/settings/SecaoLista.tsx` — wrapper visual de
  agrupamento (header em laranja + cards com toggles/selects/links
  empilhados).
- `src/components/settings/CardStatus.tsx` — card colorido (verde
  sincronizado / amarelo atrasado / vermelho conflito) para bloco
  Sync.
- `src/components/settings/LinkSubTela.tsx` — linha clicável que
  navega para sub-tela com chevron à direita.
- `src/lib/stores/settings.ts` — Zustand store persistido em
  SecureStore com toda a configuração editável. Esquema:

```ts
interface SettingsState {
  somVibracao: {
    humor: boolean;
    vitoria: boolean;
    trigger: boolean;
    fab: boolean;
  };
  lembretes: {
    medicacao: { ativo: boolean; horario: string }; // HH:MM
    treino:    { ativo: boolean; horario: string };
    humor:     { ativo: boolean; horario: string };
  };
  pessoa: {
    ativa: PessoaAutor;
    vaultCompartilhado: boolean;
    tipoCompanhia: 'sozinho' | 'duo';
  };
  sync: {
    metodo: 'syncthing' | 'obsidian-sync' | 'nao-uso';
    qualidadeScanner: '8mp' | '12mp' | 'maxima';
  };
  featureToggles: {
    cicloMenstrual: boolean;
    alarmePessoal: boolean;
    todoLeve: boolean;
    contadorDiasSem: boolean;
  };
  privacidade: {
    biometriaAbrir: boolean;
    ocultarTranscricoes: boolean;
  };
}
```

  Persistência via `secureStorage` adapter (`src/lib/stores/persist.ts`),
  chave `ouroboros.settings.v1`.
- `src/lib/services/exportarVault.ts` — Função
  `exportarVaultZip(): Promise<string | null>` que gera ZIP do Vault
  inteiro via `jszip` ou equivalente nativo, salva em
  `${cacheDirectory}/ouroboros-export-<timestamp>.zip` e retorna o
  URI para `Sharing.shareAsync`.
- `src/lib/services/limparCache.ts` — Função `limparCache()` que
  deleta `${cacheDirectory}/ouroboros-export-*.zip` e qualquer
  arquivo temporário interno.
- `tests/lib/stores/settings.test.ts`
- `tests/components/settings/SecaoLista.test.tsx`
- `tests/components/settings/CardStatus.test.tsx`

### Arquivos modificados

- `src/lib/stores/index.ts` — exportar `useSettings`.
- `app/(tabs)/_layout.tsx` — registrar tab `settings` (ícone
  `Settings` lucide). Tabs condicionais para features opt-in
  (`/ciclo`, `/alarme`, `/todo`, `/contadores`) só aparecem se o
  respectivo toggle estiver ativo.
- `src/lib/stores/pessoa.ts` — expor função `editarFoto(pessoa,
  uri)` reutilizada da M03.2.

## 3. APIs reutilizáveis

- `src/components/ui/Toggle.tsx` — todos os toggles.
- `src/components/ui/Card.tsx` — base do CardStatus.
- `src/components/ui/Header.tsx` — header `"Configurações"` laranja.
- `src/components/ui/Button.tsx` — botões "Forçar sync", "Exportar",
  "Limpar cache", "Adicionar segunda pessoa".
- `src/components/ui/AvatarPicker.tsx` — reusado em editar-pessoa.
- `src/components/ui/Input.tsx` — inputs de nome.
- `src/lib/stores/pessoa.ts` — `usePessoa`, `nomeDe`, `editarFoto`.
- `src/lib/haptics.ts` — `selection` em toggles, `light` em botões.
- `src/lib/motion.ts` — `spring_subtle` na expansão das seções.
- `expo-notifications` — para os 3 lembretes (`schedule` /
  `cancel`).
- `expo-local-authentication` — biometria.
- `expo-sharing` — para o botão Exportar.
- `expo-file-system` — `cacheDirectory`, `documentDirectory`.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**.
- `accessibilityLabel` sem acento.
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict.
- Imports via alias `@/*`.
- **Toggles de feature opt-in default false**. Ativação explícita
  pelo usuário. Quando ativado, a tab/menu correspondente aparece
  imediatamente (sem reload). Ao desativar: tab some, mas dados
  no Vault **permanecem** (não apagar).
- **Botão "Forçar sync"** é no-op informativo na M15 (Syncthing /
  Obsidian Sync rodam fora do app). Ao tocar, mostra toast
  `"Sync gerenciado pelo aplicativo externo."` em muted.
- **CardStatus do Sync**:
  - verde = última verificação <30min atrás.
  - amarelo = entre 30min e 6h.
  - vermelho = >6h ou conflito detectado em
    `~/Protocolo-Ouroboros/.stversions/`.
  - **Apenas leitura** — heurística baseada em mtime da pasta. Sem
    chamar API do Syncthing.
- **Biometria opcional**: se `biometriaAbrir: true`, ao abrir o app
  pede `LocalAuthentication.authenticateAsync` antes de revelar a
  Tela 01. Falha = continua na splash com retry.
- **Exportar dados**: ZIP do Vault inteiro, sem cache. Uso só
  local; share opcional via `Sharing.shareAsync`.
- Não tocar em arquivos fechados de sprints anteriores.

## 5. Estrutura visual da tela

Lista vertical agrupada (cada bloco é uma `SecaoLista`):

1. **Som e vibração**
   - Toggle `"Vibrar ao registrar humor"` → `somVibracao.humor`
   - Toggle `"Vibrar em vitória"` → `somVibracao.vitoria`
   - Toggle `"Vibrar em trigger"` → `somVibracao.trigger`
   - Toggle `"Vibrar ao abrir o FAB"` → `somVibracao.fab`

2. **Lembretes**
   - Linha `"Medicação"` + toggle + time picker (HH:MM)
   - Linha `"Treino"` + toggle + time picker
   - Linha `"Humor diário"` + toggle + time picker

3. **Pessoa**
   - Radio `"Pessoa A ativa"` / `"Pessoa B ativa"`
   - Toggle `"Vault compartilhado"` + nota muted
     `"Ambos veem todos os registros."`
   - LinkSubTela `"Editar nomes e fotos"` →
     `/settings/editar-pessoa`
   - LinkSubTela `"Adicionar segunda pessoa"` (visível só se
     `tipoCompanhia === 'sozinho'`) → `/settings/adicionar-segunda-pessoa`

4. **Sync**
   - CardStatus colorido + path em muted micro
     `"Vault: ~/Protocolo-Ouroboros/"`
   - Botão `"Forçar sync"` (no-op informativo)
   - Selector método (radio Obsidian Sync / Syncthing / Não uso ainda)
   - Selector qualidade scanner (8MP / 12MP / Máxima)

5. **Features opcionais**
   - Toggle `"Acompanhamento do ciclo menstrual"` →
     `featureToggles.cicloMenstrual`
   - Toggle `"Alarme pessoal"` → `featureToggles.alarmePessoal`
   - Toggle `"To-do leve"` → `featureToggles.todoLeve`
   - Toggle `"Contador de dias sem"` → `featureToggles.contadorDiasSem`

6. **Privacidade**
   - Toggle `"Biometria pra abrir"` → `privacidade.biometriaAbrir`
   - Toggle `"Ocultar transcrições na lista"` →
     `privacidade.ocultarTranscricoes`
   - Botão `"Exportar todos meus dados"` → `exportarVaultZip` →
     `Sharing.shareAsync`
   - Botão `"Limpar cache local"` muted → `limparCache` → toast
     `"Cache limpo."`

7. **Sobre**
   - Linha `"Versão"` + valor lido de `app.json` `expo.version`
   - Link `"Ver no GitHub"` purple → abre URL via `Linking`
     (URL definida em `src/config/app.config.ts`)
   - Linha `"Licença: GPL-3.0"`

## 6. Procedimento sugerido

1. Criar `src/lib/stores/settings.ts` com estado inicial e actions
   (toggle individual, set horário, set método de sync etc).
   Persistência em SecureStore. Testes em
   `tests/lib/stores/settings.test.ts`.
2. Implementar componentes auxiliares: `SecaoLista`, `CardStatus`,
   `LinkSubTela`. Testes mínimos de render.
3. Implementar `app/(tabs)/settings/index.tsx`. Render condicional:
   bloco "Adicionar segunda pessoa" só aparece se
   `pessoa.tipoCompanhia === 'sozinho'`.
4. Implementar `app/(tabs)/settings/editar-pessoa.tsx`. Reusa
   `<AvatarPicker>` e `<Input>` da M03. Salva via `usePessoa.set...`.
5. Implementar `app/(tabs)/settings/adicionar-segunda-pessoa.tsx`.
   Mesmo layout do Frame 1 do onboarding, mas como sub-rota; ao
   salvar, atualiza `tipoCompanhia` para `'duo'` e popula
   `pessoa_b` no `usePessoa`.
6. Implementar `src/lib/services/exportarVault.ts`. Iterar pastas
   canônicas (`daily`, `eventos`, `inbox`, `treinos`, `medidas`,
   `marcos`, `tarefas`, `alarmes`, `contadores`, `assets`,
   `.ouroboros/cache`), adicionar ao ZIP, salvar em
   `cacheDirectory`. Testes mock.
7. Implementar `src/lib/services/limparCache.ts`.
8. Conectar lembretes ao `expo-notifications`:
   `scheduleNotificationAsync` no toggle on; `cancelScheduledNotificationAsync`
   no toggle off. Permissão pedida just-in-time.
9. Conectar biometria ao `expo-local-authentication`. Gate no
   `app/_layout.tsx`: se `privacidade.biometriaAbrir`, mostrar
   tela de bloqueio até `authenticateAsync` resolver.
10. Garantir reatividade entre toggles de feature e tabs/menu (Expo
    Router permite render condicional no layout — testar em web e
    em emulador).
11. Rodar smoke + tests + tsc + expo export.

## 7. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m15-export && rm -rf /tmp/m15-export
```

Todos exit 0. Se algum quebrar, parar e reportar.

## 8. Commit

```
feat: m15 settings com toggles features opt-in lembretes biometria e exportar vault
```

## 9. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Default — Nível A (Chrome web):** `./run.sh --web` +
  claude-in-chrome MCP. Validar:
  - Tela inicial com 7 seções renderizadas.
  - Toggle de feature → tab correspondente aparece/some.
  - Sub-rota "Adicionar segunda pessoa" aparece só se sozinho.
  - LinkSubTela "Editar nomes e fotos" navega corretamente.
- **APIs nativas — Nível B (emulador Android):**
  - Biometria via `LocalAuthentication`.
  - `expo-notifications` real com `schedule` + verificação no
    `getAllScheduledNotificationsAsync`.
  - Exportar gerando ZIP no `cacheDirectory`.
- **Final — Nível C (celular físico):** apenas com permissão.
  Validar share intent do ZIP via `Sharing.shareAsync`.

Capturar screenshots em `docs/sprints/M15-screenshots/`. Comparar com
artboard `Tela 23` do `docs/Ouroboros_22_telas-standalone.html`.

## 10. Dúvidas em aberto

- A heurística de status do Sync (verde/amarelo/vermelho) baseia-se
  em mtime da pasta `~/Protocolo-Ouroboros/`. Funciona se Syncthing
  está rodando no celular. Para Obsidian Sync, mesma heurística é
  aplicável? Sugestão: sim, usa mtime independente do método.
- Lembretes recorrentes: usar `weekday` ou disparar diariamente em
  HH:MM? Sugestão: diário recorrente para simplicidade; cada lembrete
  cria 1 schedule.
- Exportar ZIP do Vault inteiro pode ser pesado (gigabytes em
  uso intenso). Adicionar progress feedback? Sugestão: toast
  `"Exportando..."` durante geração; ao concluir, abrir share sheet.
  Sem barra de progresso (mantém UI simples).
