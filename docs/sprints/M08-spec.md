# Sprint M08 — Share Intent Receiver (Tela 17)

```
DEPENDE:    M00.5 fechada (deepLink listener registrado em app/_layout)
            + M02 (Vault Bridge) + M03 (Onboarding e identidade dinâmica)
BLOQUEIA:   Flow 1 (PIX em <5s) e qualquer captura passiva pós-MVP
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Permitir que o Ouroboros apareça como destino no share sheet do Android
quando outro app (banco, galeria, gerenciador de arquivos) compartilha
PDF ou imagem. A activity recebe o arquivo, exibe a Tela 17 num modal
transparente, classifica o tipo, monta o path canônico em
`inbox/financeiro/...` e salva. O app principal nunca abre por
completo; o usuário volta para o app de origem em menos de 5
segundos.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/share-receive.tsx`
  — Rota modal exclusiva da Tela 17. Recebe URI via param e renderiza
  o formulário de salvamento com header simples sem bottom tabs.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/share/intent.ts`
  — Helpers de leitura do intent (URI, mime type, nome de arquivo
  sugerido) com base em `expo-intent-launcher` e `expo-sharing`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/share/categorias.ts`
  — Mapa entre chip selecionado e pasta de destino:
  - `pix` → `inbox/financeiro/pix/`
  - `extrato` → `inbox/financeiro/extrato/`
  - `nota` → `inbox/financeiro/nota/`
  - `exame` → `inbox/saude/exame/`
  - `receita` → `inbox/saude/receita/`
  - `garantia` → `inbox/casa/garantia/`
  - `contrato` → `inbox/casa/contrato/`
  - `outro` → `inbox/outros/`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/inbox_arquivo.ts`
  — Schema zod genérico `InboxArquivoSchema` para `.md` companion
  de qualquer arquivo recebido via share. Campos:
  ```ts
  tipo: 'inbox_arquivo'
  subtipo: enum dos 8 acima
  data: ISO 8601
  autor: PessoaAutor
  arquivo: string  // path relativo
  mime_type: string
  tamanho_bytes: number
  origem: string  // app de onde veio (ex: 'com.nu.production')
  revisar: boolean
  ```
  Schema específico financeiro (`inbox/financeiro/pix`) reaproveita
  campos extras (`valor`, `destino`, `categoria`); para isso usar o
  `FinanceiroPixSchema` em sprint sucessora se demanda surgir.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/share/path-resolver.ts`
  — Função `resolverDestino(categoria, mimeType, agora) => string`
  que devolve o path canônico (`inbox/<area>/<sub>/YYYY-MM-DD-HHmmss.<ext>`).
  Trata colisão verificando existência via SAF e oferecendo
  renomear automaticamente com sufixo `-1`, `-2`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/ShareReceiver.tsx`
  — Componente da tela completa: preview, ChipGroup categoria, path
  display em cyan mono caption, ChipGroup pessoa, botões Salvar
  (green) e Cancelar (muted). Variante de conflito amarela exibida
  inline.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/PreviewArquivo.tsx`
  — Renderiza o preview do arquivo recebido: thumbnail PDF (placeholder
  com ícone), preview de imagem ou primeiras 5 linhas de texto.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/share/path-resolver.test.ts`
  — Testes unitários: categorização, formatação de timestamp em UTC-3,
  comportamento de conflito (`-1`, `-2`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/share/categorias.test.ts`
  — Testes do mapa categoria → pasta.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — Adicionar `intentFilters` para `image/*` e `application/pdf` em
  `android.intentFilters` com `action.SEND` e `category.DEFAULT`.
  Configurar a activity como `singleTask` para evitar duplicação.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — Registrar a rota `share-receive` como modal sem header global.
  Detecção do intent já é feita pelo `useDeepLinkListener` da M00.5;
  esta sprint **estende** o handler em
  `src/lib/boot/deepLink.ts` para reconhecer
  `action.SEND` e rotear com URI + mime type.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/deepLink.ts`
  — Estender handler para `action.SEND` com URI extraída.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/schemas/index.ts`
  — Re-exportar `InboxArquivoSchema` e `InboxArquivoMeta`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — Adicionar entradas em `VAULT_FOLDERS`: `inboxFinanceiroExtrato`,
  `inboxFinanceiroNota`, `inboxSaudeExame`, `inboxSaudeReceita`,
  `inboxCasaGarantia`, `inboxCasaContrato`, `inboxOutros`. Atualizar
  o tipo `VaultFolderKey` automaticamente via `as const`.

## 3. APIs reutilizáveis

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — `formatDateYmdHm`, `VAULT_FOLDERS`. Criar função nova
  `inboxFinanceiroPath(subtipo, date)` no mesmo padrão.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/writer.ts`
  — `writeVaultFile` para a parte de metadata `.md` que acompanha
  o anexo binário. O binário em si vai via
  `StorageAccessFramework.copyAsync` (não passa por `writer.ts`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/permissions.ts`
  — `getVaultRoot()` para obter o URI raiz já autorizado no
  onboarding. Se ausente, mostrar fallback de erro pedindo abrir o
  app principal antes.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/ui/index.ts`
  — `Screen`, `Header`, `Button`, `Chip`, `ChipGroup`, `PersonAvatar`,
  `Toast`, `useToast`. Estética da Tela 17 herda de graça.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/pessoa.ts`
  — `usePessoa()` para identificar a pessoa ativa default.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — `light` no botão Salvar; `error` no banner de conflito quando
  o usuário escolhe substituir.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`, esta sprint pluga:

- **Tab/Rota:** rota modal raiz `/share-receive` registrada em
  `app/_layout.tsx` com `presentation: 'modal'` + `headerShown: false`.
  Não entra no navigator de tabs (é fluxo passivo).
- **Schema:** `InboxArquivoSchema` exportado via
  `src/lib/schemas/index.ts`.
- **Store:** consome `usePessoa` (pessoa ativa default no chip).
  Não cria store novo.
- **app.json:** `android.intentFilters` para `image/*` e
  `application/pdf`. Activity `singleTask`.
- **Boot hook:** estende `deepLink.ts` da M00.5 para reconhecer
  `action.SEND`.
- **FAB:** sem mudança.
- **Settings:** sem dependência direta. Subtipos novos
  (`receita`, `garantia`, `contrato`) ficam visíveis assim que
  qualquer share ativa o flow.

## 4. Restrições

- **Regra −1** (Anonimato): zero referência a IA, zero nomes reais
  hardcoded. Detalhes em `CLAUDE.md` e `VALIDATOR_BRIEF.md` §1.1.
- Sem emojis em código, docs ou commits.
- Strings de UI em **Sentence case com acentuação completa PT-BR**
  (ADR-0013 revogou a regra original de "lowercase intencional").
  Exemplos canônicos desta tela: `"Tipo detectado"`,
  `"Destino no inbox"`, `"Salvar"`, `"Cancelar"`,
  `"Já existe um arquivo com nome similar."`,
  `"Renomear automaticamente"`, `"Substituir"`.
- `accessibilityLabel` sem acento (convenção screen reader).
- Comentários em código `.ts`/`.tsx` sem acento.
- Mensagens de commit sem acento.
- TypeScript strict — sem `any`, sem `@ts-ignore` sem justificativa.
- Imports via alias `@/*`.
- A activity de share **nunca** abre a Stack principal do app. O
  preview e o salvamento acontecem dentro do modal e fecham via
  `router.dismissAll()` + `Linking` para devolver foco ao app de
  origem.
- Toast verde "Salvo." é sempre o último frame visível antes da
  activity fechar.
- Zero rede. Toda persistência é local via SAF.

## 5. Procedimento sugerido

1. Configurar `intentFilters` em `app.json` para `image/*` e
   `application/pdf` com `action.SEND` e `category.DEFAULT`.
2. Adicionar a rota modal `share-receive` em `app/_layout.tsx` com
   `presentation: 'modal'` e detecção de deep link inicial.
3. Criar `src/lib/share/intent.ts` para extrair URI do arquivo
   recebido, mime type e nome sugerido.
4. Criar `src/lib/share/categorias.ts` com mapa estático
   `categoria => pasta` e tipo derivado.
5. Criar `src/lib/share/path-resolver.ts` com `resolverDestino()`
   verificando existência via `StorageAccessFramework.getInfoAsync`
   antes de devolver o path final.
6. Implementar `src/components/screens/PreviewArquivo.tsx` com 3
   modos (PDF / imagem / texto) baseados em mime type.
7. Implementar `src/components/screens/ShareReceiver.tsx` consumindo
   preview, ChipGroup categoria, path display dinâmico em cyan mono
   caption, ChipGroup pessoa, botões Salvar/Cancelar. Banner de
   conflito amarelo aparece em estado dedicado.
8. Salvar fluxo: copiar binário via
   `StorageAccessFramework.copyAsync` para o destino + escrever
   `.md` companion via `writeVaultFile` com schema financeiro.
9. Toast `Salvo.` (verde, haptic light) e `router.dismissAll()`.
10. Fluxo de cancelamento: `router.dismissAll()` sem persistir.
11. Escrever testes para `path-resolver` e `categorias`.

## 6. Verificação runtime-real

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m08-export && rm -rf /tmp/m08-export
```

Todos exit 0. Validação de share intent real exige Nível B (emulador)
ou Nível C (celular físico) com permissão explícita.

## 7. Commit

```
feat: m08 share intent receiver tela 17 captura passiva pix
```

## 8. Checkpoint visual

Política de 3 níveis (`VALIDATOR_BRIEF.md` §1.9):

- **Nível A (Chrome web):** valida o layout do modal, ChipGroup,
  path display dinâmico em cyan, banner de conflito amarelo.
  `./run.sh --web` + claude-in-chrome MCP. Não cobre o intent real.
- **Nível B (emulador Android):** valida a ativação via share
  sheet. Disparar share de um PDF do app `Files` para o Ouroboros e
  verificar que a Tela 17 abre como modal transparente. Capturar
  via `adb shell screencap`.
- **Nível C (celular físico):** **só com permissão explícita**.
  Validar share real do app do banco para o Ouroboros, com PDF de
  PIX. Tempo total alvo do tap "Compartilhar" no banco até toast
  "Salvo." abaixo de 5 segundos. Capturar `docs/sprints/M08-screenshots/`.

## 9. Definição de Pronto

- [ ] Share sheet do Android lista "Ouroboros" para `image/*` e
      `application/pdf`.
- [ ] Tap no Ouroboros abre Tela 17 como modal transparente
      (não abre Stack principal).
- [ ] `<PreviewArquivo>` renderiza PDF (placeholder ícone),
      imagem (preview) ou texto (5 linhas).
- [ ] ChipGroup categoria funcional com 8 subtipos.
- [ ] Path display em cyan mono caption atualiza dinamicamente.
- [ ] ChipGroup pessoa default na ativa.
- [ ] Cópia do binário **em foreground** com indicador de
      progresso (toast `"Salvando..."` e botão Salvar disabled).
- [ ] Salvar gera `.md` companion via `InboxArquivoSchema` +
      copia binário para pasta canônica.
- [ ] Banner de conflito amarelo com 3 opções (renomear, substituir,
      cancelar) funcional.
- [ ] Toast verde `"Salvo."` antes de fechar; `router.dismissAll()`.
- [ ] Smoke + tests + tsc + expo export OK.
- [ ] Tempo total tap-no-banco → toast: < 5 s no celular físico.

## 10. Decisões tomadas

- **Cópia foreground com indicador:** SAF `copyAsync` síncrono
  dentro do handler do botão Salvar. Toast `"Salvando..."` no início,
  toast `"Salvo."` ao final. Sem fire-and-forget — perda de permissão
  do app de origem é risco real.
- **Granularidade de pastas:** `inbox/<area>/<subtipo>/` é a forma
  final. Áreas: `financeiro`, `saude`, `casa`, `outros`. Subtipos
  por área conforme tabela de `categorias.ts`.
- **Schema genérico `InboxArquivoSchema`:** não-financeiros usam
  esse schema com `subtipo` discriminando. Schemas específicos
  (PIX com valor, nota com OCR) ficam para M09 que usa
  `FinanceiroNotaSchema` próprio.
- **Listener de URL como hook reusável (M00.5):** nesta sprint
  estendemos o handler da M00.5 para `action.SEND`; nunca duplicamos
  registro de listener.

Sprint pronta para execução sem perguntas pendentes.
