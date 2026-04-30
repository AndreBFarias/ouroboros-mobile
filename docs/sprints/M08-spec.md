# Sprint M08 — Share Intent Receiver (Tela 17)

```
DEPENDE:    M02 (Vault Bridge) + M03 (Onboarding e identidade dinâmica)
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
  — Mapa entre chip selecionado (`pix`, `extrato`, `exame`, `nota`,
  `outro`) e pasta de destino (`inbox/financeiro/pix`,
  `inbox/financeiro/extrato`, `inbox/saude/exame`,
  `inbox/financeiro/nota`, `inbox/outros`).
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
  — Registrar a rota `share-receive` como modal sem header global e
  detectar deep link inicial via `Linking.getInitialURL()`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/paths.ts`
  — Adicionar entradas em `VAULT_FOLDERS`: `inboxFinanceiroExtrato`,
  `inboxFinanceiroNota`, `inboxSaudeExame`, `inboxOutros`. Atualizar
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

## 9. Dúvidas em aberto

- O share sheet pode entregar a URI como conteúdo `content://` que
  exige cópia explícita via SAF antes da activity de origem
  desistir do permission grant. Verificar se a cópia precisa
  acontecer em foreground (com indicador de progresso) ou se pode
  ser fire-and-forget após a Tela 17 fechar.
- Decidir se `inbox/saude/exame/` é mesmo o path final para exames
  médicos ou se passa para `inbox/saude/<subtipo>/` mais granular
  num futuro M14.5 (ciclo).
- Campos do `.md` companion para arquivos não-financeiros: definir
  schema mínimo (`tipo`, `subtipo`, `data`, `autor`, `arquivo_anexo`)
  ou aproveitar schema financeiro genérico.
