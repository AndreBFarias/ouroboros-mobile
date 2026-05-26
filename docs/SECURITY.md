# SECURITY.md — Política de segurança do repositório

Documento de referência para auditoria de segredos, política de
rotação e procedimentos de resposta a incidentes de credenciais
expostas. Vinculado à sprint **R-SEC-5** (M-SEC-SECRET-LEAK-AUDIT).

## 1. Secret scanning

O repositório usa [`gitleaks`](https://github.com/gitleaks/gitleaks)
para detectar credenciais e segredos em commits e no histórico.

### 1.1 Auditar localmente

```bash
# Varre todo o histórico do repositório
gitleaks detect --source . --no-banner

# Modo verbose (mostra cada regra aplicada)
gitleaks detect --source . --no-banner -v

# Sem expor o segredo no log (recomendado para CI)
gitleaks detect --source . --no-banner --redact
```

O critério de sucesso é **zero findings**. Qualquer detecção
positiva precisa ser tratada antes de qualquer merge ou push.

### 1.2 Instalar gitleaks

`gitleaks` é um binário Go sem dependências de sistema. Não
exige `sudo`.

```bash
# Linux x64
GITLEAKS_VERSION="8.18.4"
curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
  -o /tmp/gitleaks.tar.gz
tar -xzf /tmp/gitleaks.tar.gz -C /tmp
chmod +x /tmp/gitleaks
sudo mv /tmp/gitleaks /usr/local/bin/gitleaks   # opcional, instala global
```

Releases oficiais: <https://github.com/gitleaks/gitleaks/releases>.

### 1.3 Hook pre-commit

O hook `hooks/pre-commit` chama `gitleaks protect --staged` antes
de cada commit. Bypass intencional (raro) via `git commit --no-verify`.

O hook degrada graciosamente: se nem `gitleaks` no `PATH` nem
`/tmp/gitleaks` estiverem presentes, emite um aviso e continua —
não bloqueia o commit. A intenção é permitir desenvolvimento em
máquinas sem a ferramenta instalada, sem forçar setup imediato.

## 2. Paths sensíveis (devem permanecer gitignored)

Arquivos abaixo **nunca** podem ser versionados. Validado por
`.gitignore` raiz e auditado por `gitleaks`:

| Path | Conteúdo | Observação |
|---|---|---|
| `.env` | `EXPO_TOKEN` (EAS Build) | Gitignored. Symlink no worktree aponta para main. |
| `env.json` | Google OAuth `client_id` (Expo Auth Session) | Gitignored. Necessário em build EAS via secret. |
| `credentials/` | Keystore Android, certificados | Gitignored. Backup off-repo apenas. |
| `*.keystore`, `*.jks` | Chaves Android nativas | Gitignored por padrão. |
| `~/Protocolo-Ouroboros/` | Vault de dados pessoais | Fora do repo (Syncthing). |

Verificar gitignore:

```bash
grep -E '\.env|env\.json|credentials/|\*\.keystore' .gitignore
```

## 3. Política de rotação em caso de leak

Se `gitleaks detect` reportar um finding positivo, o procedimento
é **rotacionar a credencial real antes de fechar a sprint**.
Apagar o commit do histórico **não basta** — o segredo deve ser
considerado comprometido a partir do momento em que entrou no
working tree.

### 3.1 Procedimento por tipo de segredo

| Tipo | Como rotacionar |
|---|---|
| `EXPO_TOKEN` | Revogar em <https://expo.dev/accounts/_/settings/access-tokens> e gerar novo. Atualizar `.env` local. |
| Google OAuth `client_id` | Revogar em <https://console.cloud.google.com/apis/credentials> e gerar novo client. Atualizar `env.json`. |
| Spotify / YouTube OAuth | Revogar em dashboards respectivos. Atualizar provider config. |
| Android keystore | Gerar nova keystore. Submeter ao Google Play Console como novo upload key (processo de 1-7 dias). |
| Token genérico (AWS, GitHub, etc) | Revogar imediatamente na origem. Auditar logs de uso. |

### 3.2 Documentar o incidente

Após rotação, registrar em `docs/SECURITY-INCIDENTS.md` (criar se
não existir):

- Data da detecção.
- Tipo de credencial (sem valor, sem hash).
- Commit onde foi introduzido (SHA).
- Janela de exposição (push público? quanto tempo?).
- Ações tomadas (rotação, force-push, etc).

## 4. Auditoria periódica

Recomendação: rodar `gitleaks detect --source . --no-banner`
mensalmente, e antes de cada release tagueado. CI deve falhar
o build se a varredura retornar findings.

Última auditoria registrada: **2026-05-19** (R-SEC-5).
Resultado: **0 findings** em 420 commits.

## 5. Vulnerabilidades de dependências (npm audit)

Auditoria via `npm audit`. Critério: zero HIGH/CRITICAL; moderate de
toolchain de build documentadas se não forem removíveis sem breaking.

### 5.1 Estado atual (R-SEC-6, 2026-05-26)

`npm audit` reportou 24 vulnerabilidades (1 low, 22 moderate, 1 high)
no setup (`santuario` → `install.sh`). Tratamento sem subir o SDK
(decisão do dono via AskUserQuestion):

- `npm audit fix` (sem `--force`) corrigiu a HIGH (`fast-uri`
  3.1.0→3.1.2) + `ws` + `@tootallnate/once` via bumps transitivos no lock.
- `overrides` em `package.json` forçaram as versões corrigidas das 3
  raízes restantes, eliminando também a cadeia `@expo/*` derivada:
  - `postcss` → `^8.5.10` (era 8.4.49; XSS GHSA-qx2v-qp2m-jg93).
  - `uuid` → `^11.1.1` (era 7.0.3; buffer bounds GHSA-w5hq-g745-h8pq;
    vivia só em `xcode`, caminho iOS prebuild que este projeto
    Android-only nunca exercita).
  - `brace-expansion@5` → `^5.0.6` (era 5.0.5; DoS GHSA-jxxr-4gwj-5jf2;
    override seletivo `@5` preserva as 1.1.14/2.1.1 não-vulneráveis).

Resultado: **`npm audit` → 0 vulnerabilidades**, mantendo Expo SDK 54.
Validado por `npx tsc --noEmit` (0), `npx expo export --platform android`
(bundle Hermes 8,64 MB, dentro do ADR-0027) e smoke 321 suítes / 3061
testes verde. Sem risco residual.

### 5.2 Por que não subir Expo SDK 56

`npm audit fix --force` instalaria `expo@56` + `expo-splash-screen@56`
(breaking, 2 saltos de major) às vésperas do v1.0.0. Como os overrides
zeraram as vulnerabilidades sem isso, o upgrade fica como débito mapeado
em `docs/sprints/R-INFRA-EXPO-SDK-56-UPGRADE-spec.md` (executar pós-release).

### 5.3 Auditar

```bash
npm audit                 # esperado: found 0 vulnerabilities
```

## 6. Referências

- [`docs/CONTEXTO.md`](CONTEXTO.md) — anonimato e regras de
  privacidade.
- [`hooks/pre-commit`](../hooks/pre-commit) — integração local.
- [`VALIDATOR_BRIEF.md`](../VALIDATOR_BRIEF.md) — invariantes
  do projeto.
- [Gitleaks docs](https://github.com/gitleaks/gitleaks#configuration)
  — configuração avançada (`.gitleaks.toml`).
