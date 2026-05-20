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

## 5. Referências

- [`docs/CONTEXTO.md`](CONTEXTO.md) — anonimato e regras de
  privacidade.
- [`hooks/pre-commit`](../hooks/pre-commit) — integração local.
- [`VALIDATOR_BRIEF.md`](../VALIDATOR_BRIEF.md) — invariantes
  do projeto.
- [Gitleaks docs](https://github.com/gitleaks/gitleaks#configuration)
  — configuração avançada (`.gitleaks.toml`).
