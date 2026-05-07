# Sprint I2-OAUTH — M-OAUTH-REDIRECT-URI-FIX

```
DEPENDE:    nada (independente de H)
BLOQUEIA:   I-AGENDA (depende OAuth funcionar)
ESTIMATIVA: ~2h
PRIORIDADE: ALTA (bloqueia uso de Google Calendar)
STATUS:     [todo]
```

## §1 Achado

Field test screenshot db6f7bcf: ao tocar "Conectar conta Google" no APK
preview, Google retorna **"Acesso bloqueado: erro de autorização — Erro
400: invalid_request"** para `andre.dsbf@gmail.com`. Mensagem:

> You can't sign in to this app because it doesn't comply with Google's
> OAuth 2.0 policy for keeping apps secure.

Causa típica: `redirect_uri` mismatch. App manda
`ouroboros://oauth-callback`, mas Google Cloud Console NÃO tem o Android
client cadastrado com SHA-1 do keystore EAS preview (preview pode usar
keystore distinto de dev-client/production em alguns setups).

## §2 Tarefa concreta

1. **Auditar `pickClientId()`** em `src/lib/services/googleAuthFlow.ts`:
   - Ramificação atual por `Constants.appOwnership` (`'expo'` | `'standalone'`).
   - Verificar `redirectUri` que `AuthSession.AuthRequest` constrói.
   - Confirmar package detectado (`Application.applicationId`).

2. **Obter SHA-1 do keystore EAS preview**:

   ```bash
   set -a && source .env && set +a
   eas credentials --platform=android --profile=preview
   ```

   Se distinto do production, registrar ambos.

3. **Confirmar no Google Cloud Console** (`andre_farias`,
   project `protocolo-ouroboros`):
   - **OAuth client Web** (`auth.expo.io` proxy para Expo Go) — confirmar existência.
   - **OAuth client Android** com:
     - Package: `com.ouroboros.mobile`
     - SHA-1 dev: `E4:49:C8:B3:B4:89:F9:26:69:AA:31:1C:38:81:43:44:D3:7D:B3:8C` (já registrado)
     - SHA-1 preview: verificar se igual ou diferente
     - SHA-1 production: verificar
   - Adicionar SHA-1 faltantes.

4. **Atualizar `pickClientId()`** se necessário para selecionar client
   correto baseado em runtime.

5. **Atualizar `docs/SETUP-OAUTH-GOOGLE.md`** com SHA-1 cadastrados
   por profile + procedimento de re-registro.

## §3 Restrições

- Anonimato Regra menos um.
- `client_id` continua em `env.json` (gitignored).
- SHA-1 NAO e secret mas dono prefere NAO commitar — listar como string
  literal em `SETUP-OAUTH-GOOGLE.md` e OK (gitignored ou versionado
  conforme politica).
- Comentarios sem acento.

## §4 Verificação runtime-real

```bash
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
```

## §5 Validação humana adb (obrigatória — OAuth real é runtime nativo)

```bash
adb shell pm clear com.ouroboros.mobile
# Onboarding completo + permissoes.
# Tap MenuLateral > Acesso Rapido > Agenda.
# Tap "Conectar conta Google".
# Esperado: WebBrowser abre prompt Google login real (nao Erro 400).
# Aceitar escopo calendar.events.readonly.
# Voltar ao app: agenda preenche com eventos reais.
adb logcat -d -v threadtime | grep -iE "oauth|google|invalid_request" | head -10
```

Capturar:
- `B-google-oauth-success.png` (prompt real OAuth + agenda preenchida)
- `B-agenda-com-eventos.png`

## §6 Commit message

```
fix: i2-oauth redirect uri sha-1 keystore preview cadastrado
```

## §7 Decisões tomadas

- **SHA-1 cadastrado por profile**: cada keystore EAS distinto exige
  cadastro proprio no Google Cloud Console (limitacao Android OAuth).
- **Documentacao em `SETUP-OAUTH-GOOGLE.md`**: historico duravel +
  trilha de auditoria se novo dev-client/production forem regenerados.
