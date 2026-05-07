# ADR 0022 — Vault em pasta escolhida pelo usuário

```
Status:     Aceito
Data:       2026-05-06
Sprint:     M-VAULT-PASTA-NAO-HARDCODED (H3, plano end-to-end golden-zebra v1.0.0)
Depende:    ADR-0014 (Vault Mobile em Pasta Dedicada)
            ADR-0016 (Vault Auto-criado em /sdcard/Documents/Ouroboros sem SAF)
Substitui:  parte de ADR-0014 e ADR-0016 que assumiam pasta única
            hardcoded `/sdcard/Documents/Ouroboros/`. A pasta agora
            é escolhida pelo usuário durante o onboarding.
```

## Contexto

Até H2 do plano golden-zebra, `src/lib/vault/permissions.ts` mantinha:

```ts
const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const VAULT_URI = `file://${VAULT_PATH}`;

export async function inicializarVaultCanonico() {
  await pedirPermissaoStorage();
  await garantirSubpastas(VAULT_URI);
  const writable = await probeVaultWritable(VAULT_URI);
  if (!writable) {
    // OEM agressivo (MIUI, OneUI, HyperOS) bloqueou write em
    // /sdcard/Documents/. Cai em SAF picker.
    const safUri = await requestVaultPermission();
    // ...
  }
  // ...
}
```

A função força tentar `/sdcard/Documents/Ouroboros/` na primeira
execução, sem perguntar ao usuário onde salvar. Isso traz três
problemas concretos:

1. **Usuário não escolhe na primeira tentativa.** Só ganha agência
   no fallback, depois que o probe já falhou. Ruim para usuários
   avançados que já têm um Vault Obsidian estabelecido em outra
   pasta e querem reutilizá-lo.

2. **Hardcode "Ouroboros" assume nome.** Se o usuário já tem
   `~/Vault-pessoal/` no Obsidian e quer compartilhar, o hardcode
   não permite escolher "use essa pasta que já existe".

3. **Sem trocar pasta depois.** Settings v2 (M29) tinha apenas
   "Reinicializar pasta do Vault" que recriava a estrutura no
   path canônico, mas não permitia mudar para outra pasta.

A decisão durável do dono do projeto em 2026-05-06 é: **o onboarding
pergunta**, e o Settings ganha sub-tela `/settings/vault` com a
opção de trocar a qualquer momento.

## Decisão

### 1. Onboarding pergunta no Frame 2 "Onde salvar seus dados?"

Frames novos:

- Frame 0: Como você se chama?
- Frame 1: Mais alguém usa este Vault com você?
- **Frame 2 (novo): Onde salvar seus dados?**
- Frame 3: Tudo pronto.

Frame 2 oferece dois cards verticais:

```
[Card] Sugestão: Documents/Ouroboros
         "Pasta dedicada visível no seu file manager.
          Fácil de sincronizar com Obsidian ou Syncthing."
         /sdcard/Documents/Ouroboros/
         [Botão "Usar essa"]

[Card] Outra pasta
         "Escolher manualmente onde salvar (por exemplo, a pasta
          de outro Vault Obsidian que você já usa)."
         [Botão "Escolher"]
```

- "Usar essa" → `pedirPermissaoStorage()` (Intent MANAGE_EXTERNAL_STORAGE
  no Android 11+, PermissionsAndroid em <11) +
  `inicializarVaultEscolhido(sugestaoVaultUriDefault())`.
- "Escolher" → `requestVaultPermission()` abre o SAF picker,
  retorna a URI escolhida, e em seguida
  `inicializarVaultEscolhido(uriEscolhida)`.

Se o probe write+read+delete falhar (OEM agressivo bloqueando o
path sugerido), exibimos toast e mantemos o usuário no Frame 2
para tentar "Outra pasta".

### 2. API de inicialização aceita URI parâmetro

```ts
// Antes (hardcode):
export async function inicializarVaultCanonico(): Promise<ResultadoInicializacao>;

// Depois (H3, ADR-0022):
export async function inicializarVaultEscolhido(
  uri: string
): Promise<ResultadoInicializacao>;

export function sugestaoVaultPathDefault(): string;
export function sugestaoVaultUriDefault(): string;
```

`inicializarVaultEscolhido(uri)` recebe a URI já decidida pelo
caller. Cria as 8 subpastas canônicas (H2 layout-por-tipo), roda
probe, persiste o vaultRoot. Lança erro descritivo se URI vazia
ou se probe falhar.

`sugestaoVaultPathDefault()` retorna `/sdcard/Documents/Ouroboros/`
como sugestão pura — não como hardcode da única pasta possível.

### 3. Settings ganha sub-tela `/settings/vault`

Acessível via Settings → Vault. Mostra:

- **Pasta atual**: `vaultRoot` truncado se longo (ellipsizeMode middle).
- **Botão "Trocar pasta do Vault"**: dispara diálogo de aviso
  inline ("Os dados ficam na pasta antiga. Mova manualmente se
  quiser levar o histórico junto, ou exporte um backup pela tela
  anterior antes de trocar.") com botões Cancelar/Continuar. Se
  Continuar, abre SAF picker via `requestVaultPermission()` +
  `inicializarVaultEscolhido(uri)`.
- **Botão "Reinicializar pasta"**: recria as 8 subpastas
  canônicas no `vaultRoot` atual, sem mudar de pasta.

Substitui o link "Reinicializar pasta do Vault" que ficava
inline na seção Pessoa do Settings principal.

### 4. Trocar pasta NÃO move dados automaticamente

Trade-off explícito no diálogo. Razões:

- Migração SAF↔SAF é cara (precisa copiar arquivo a arquivo,
  com permissões em ambas as pastas).
- Usuário pode preferir manter histórico antigo intocado.
- Já existe fluxo manual via Privacidade → "Exportar todos os
  meus dados" + "Importar backup" que cobre a migração quando
  desejada.

## Consequências

### Positivas

- **Autonomia do usuário**: escolha desde a primeira tela, sem
  precisar passar por fallback.
- **Vault Obsidian compartilhado é viável**: usuário avançado
  pode apontar para `~/Documents/MeuVault/` direto, sem fricção.
- **Settings ganha controle**: trocar pasta sem reset total do
  app, com aviso explícito sobre dados antigos.
- **API limpa**: `inicializarVaultEscolhido(uri)` é função pura
  — recebe entrada, faz mkdir + probe + persist, retorna estado.
  Sem decisão implícita de "qual pasta tentar primeiro".

### Negativas

- **Onboarding 1 frame mais longo**: 4 frames em vez de 3. Frame
  novo é simples (2 cards verticais + 1 sub) mas adiciona um
  passo. Mitigado pelo fato de que o Frame 2 substitui o tap
  silencioso de "Começar" como gatilho do SAF picker — antes o
  usuário descobria a pergunta só se o probe falhasse.
- **`VaultBootGate` (app/_layout.tsx) precisa fallback**: quando
  o usuário concluiu onboarding mas vaultRoot está null (pasta
  apagada manualmente entre sessões), tentamos primeiro
  `loadVaultRoot()` do SecureStore, e em último caso caímos na
  sugestão default + permissão. Se falhar, toast direciona o
  usuário a Settings/Vault para escolher de novo.
- **Migração de testes**: `tests/lib/vault/permissions-init.test.ts`,
  `tests/app/onboarding.test.tsx`, `tests/app/settings/index.test.tsx`,
  `tests/integration/export-restaure-roundtrip.test.ts` precisaram
  ajustar mocks de `inicializarVaultCanonico` → `inicializarVaultEscolhido`.

## Verificação

```bash
cd ~/Desenvolvimento/Protocolo-Mob-Ouroboros

# Anonimato + PT-BR
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py

# TypeScript strict
npx tsc --noEmit

# Jest verde
npm test --silent

# Smoke + leak Gauntlet
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh
```

## Referências

- ADR-0014 (Vault Mobile em Pasta Dedicada) — supersedes parcial.
- ADR-0016 (Vault Auto-criado em /sdcard/Documents/Ouroboros sem SAF) —
  supersedes parcial; auto-criação só acontece quando o usuário
  escolhe a sugestão default.
- ADR-0023 (Vault organizado por tipo de arquivo) — H2, pré-requisito
  do `garantirSubpastas` em layout-por-tipo.
- Sprint H1 (`vaultUriJoin`) — sanitização de URI usada por
  `garantirSubpastas` para evitar trailing-space SAF (A29).
- Sprint H3 spec: `docs/sprints/M-VAULT-PASTA-NAO-HARDCODED-spec.md`.
