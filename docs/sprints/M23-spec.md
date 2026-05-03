# Sprint M23 — Onboarding 3 frames (remove Vault SAF e Sync)

```
DEPENDE:    M22 (inicializarVaultCanonico disponível)
BLOQUEIA:   M27 (menu lateral assume onboarding em 3 frames)
ESTIMATIVA: 3-4h
```

## 1. Objetivo

Substituir os 5 frames atuais do onboarding por 3 frames sem fricção:
boas-vindas + nome → companhia + nome do parceiro → tudo pronto. O
botão "Começar" no Frame 2 chama `inicializarVaultCanonico()` (M22)
antes de marcar o onboarding como concluído. Remove totalmente os
Frames antigos de seleção de pasta SAF e de método de sync.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/onboarding.tsx`
  — reduzir state de 5 frames para 3:
  - Frame 0 — Boas-vindas + nome + avatar (mantém atual Frame 0).
  - Frame 1 — Companhia + nome do parceiro + avatar (mantém atual
    Frame 1).
  - Frame 2 — "Tudo pronto, {nomeA}." Botão "Começar" chama
    `await inicializarVaultCanonico()` antes de
    `marcarConcluido()`.
  - Mostrar `<OuroborosLoader compacto />` durante a chamada
    (M25 dependência — se ainda não existir, usar `<ActivityIndicator />`
    placeholder).
  - Toast de erro "Não foi possível criar a pasta. Tente novamente."
    se permissão negada.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/onboarding.ts`
  — remover campos `syncMethod` (não mais consumido). Manter
  `tipoCompanhia` (ainda usado para "sozinho" vs "casal/amigos").
  Bump chave SecureStore: `ouroboros.onboarding.v2`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/stores/onboarding.test.ts`
  — atualizar testes para shape v2 (sem `syncMethod`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/onboarding.test.tsx`
  — atualizar fluxo: 3 frames, botão "Começar" no Frame 2 chama
  `inicializarVaultCanonico` mockado.

### Arquivos NÃO modificados

- `src/lib/vault/permissions.ts` (M22 já criou helper).
- `app/(tabs)/index.tsx` (continua chamando gate de onboarding;
  M27 reorganizará paths).

## 3. APIs reutilizáveis

- `usePessoa.setNome(autor, nome)` — já existe.
- `inicializarVaultCanonico()` — criado em M22.
- `useToast()` — já existe.
- `<AvatarPicker pessoa={...}>` — já existe.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Rota modal raiz:** `/onboarding` continua registrada em
  `app/_layout.tsx` (Stack).
- **Store:** `useOnboarding` — shape v2 sem `syncMethod`.
- **Boot hook:** sem mudança (`useDeepLinkListener` etc. continuam
  carregando).

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded. Nomes vêm de
  `usePessoa.nomes` runtime.
- Sentence case + acentuação PT-BR completa.
- `accessibilityLabel` sem acento.
- Comentários sem acento.
- TS strict.
- **Não** chamar `requestVaultPermission()` antigo (deprecated em
  M22).
- **Não** persistir `syncMethod` (campo removido).

## 5. Procedimento sugerido

1. Editar `useOnboarding`:
   - Remove `syncMethod`, `setSync`.
   - Bump persist key para v2 (migração one-shot ignora dados v1).
2. Reescrever `app/onboarding.tsx`:
   - State: `frame: 0|1|2`.
   - Função `handleConcluir`:
     ```ts
     const handleConcluir = async () => {
       try {
         await inicializarVaultCanonico();
         marcarConcluido();
         router.replace('/');
       } catch {
         toast.show('Não foi possível criar a pasta. Tente novamente.', 'error');
       }
     };
     ```
   - Frame 2 mostra `<OuroborosLoader />` enquanto async roda.
   - Remover componentes `Frame2` (Vault) e `Frame3` (Sync) totalmente.
   - Renomear `Frame4` → `Frame2` (tudo pronto).
3. Atualizar testes:
   - `onboarding.test.ts`: shape v2 sem `syncMethod`.
   - `onboarding.test.tsx`: cobrir os 3 frames + erro de permissão.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m23-export && rm -rf /tmp/m23-export

# Manual no emulador:
# 1. Apagar SecureStore (uninstall + reinstall)
# 2. Abrir app: vai direto para /onboarding
# 3. Frame 0: digitar nome, tirar foto, Continuar
# 4. Frame 1: escolher companhia, digitar nome 2, Continuar
# 5. Frame 2: tap "Começar" -> permissão pedida -> pasta criada -> Tela 01
adb shell ls /sdcard/Documents/Ouroboros/  # espera 12+ subpastas
```

## 7. Commit

```
feat: m23 onboarding 3 frames sem vault saf e sem sync
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M23-screenshots/`:
- `A-frame0-nome.png`
- `A-frame1-companhia.png`
- `A-frame2-tudo-pronto.png`

Comparar com mockup `docs/Ouroboros_24_telas-standalone.html` Tela 24
(considerar que agora são 3 frames, não 4).

## 9. Decisões tomadas

- **Persistência v2 vs migração**: bump simples `v1` → `v2` ignora
  dados v1 (poucos usuários, todos vão refazer onboarding com a
  refundação).
- **`tipoCompanhia` mantido**: ainda usado para esconder toggle
  pessoa quando sozinho (Tela 01, FAB).
- **Erro de permissão tratado dentro do Frame 2**: usuário pode
  tentar de novo sem voltar frames. Se recusou no nível do SO,
  precisa ir em Settings do Android e habilitar manualmente.
- **OuroborosLoader como dependência soft**: M25 ainda não rodou
  quando esta sprint executa em ordem; usar
  `<ActivityIndicator color={colors.purple} />` placeholder por
  enquanto. Substituir após M25.

Sprint pronta para execução sem perguntas pendentes.
