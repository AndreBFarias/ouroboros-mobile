# ADR 0016 — Vault Auto-criado em `/sdcard/Documents/Ouroboros/` sem SAF Interativo

```
Status:     Aceito
Data:       2026-05-02
Sprint:     M22 (refundação v1.0)
Estende:    ADR-0014 (Vault Mobile em Pasta Dedicada)
```

## Contexto

A v1.0.0 publicada em 2026-05-02 falhou no uso real porque o
onboarding pedia ao usuário escolher manualmente uma pasta via
Storage Access Framework (SAF) na Tela 24 Frame 2. Quando o usuário
não completou esse passo (cancelou, escolheu pasta inválida, ou
desistiu), `useVault.vaultRoot` ficava `null` para sempre. Toda a
captura ativa (humor, diário, eventos, ciclo, tarefas, contadores,
alarmes) silenciosamente deixava de persistir — sem mensagem de erro
visível, sem fallback.

Adicionalmente, o Frame 3 perguntava qual método de sync (Syncthing /
Obsidian Sync / Não uso ainda), gerando atrito desnecessário: o app
não gerencia sync, apenas escreve arquivos numa pasta. Quem
sincroniza é o usuário externamente.

ADR-0014 estabeleceu `~/Protocolo-Ouroboros/` como pasta canônica do
Mobile, mas não definiu **como** o app cria essa pasta no Android nem
**quando** pede permissão de armazenamento.

## Decisão

O app **auto-cria** o Vault no caminho canônico
`/sdcard/Documents/Ouroboros/` na primeira execução, **sem perguntar
ao usuário**:

- **Pasta canônica desktop**: `~/Protocolo-Ouroboros/` (ADR-0014
  mantido).
- **Pasta canônica Android**: `/sdcard/Documents/Ouroboros/`.
- **Sync**: Syncthing externo configurado pelo usuário aponta uma
  pasta para a outra. O app não gerencia.
- **Onboarding**: removido o Frame de Vault SAF e o Frame de Sync.
  Onboarding fica em 3 frames (boas-vindas+nome → companhia →
  pronto).

### Permissões Android

- **Android < 11 (API 23-29)**: `WRITE_EXTERNAL_STORAGE` via
  `PermissionsAndroid.request()` na primeira execução.
- **Android ≥ 11 (API 30+)**: `MANAGE_EXTERNAL_STORAGE` via Intent
  `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`.

Como o APK é distribuído **fora da Play Store** (GitHub Releases
direto), `MANAGE_EXTERNAL_STORAGE` é aceitável. A Play Store
rejeitaria essa permissão para apps sem caso de uso de gestão de
arquivos justificado, mas o canal de distribuição manual não tem essa
restrição.

### Estrutura criada na primeira execução

```
/sdcard/Documents/Ouroboros/
├── daily/
├── eventos/
├── inbox/
│   ├── mente/diario/
│   ├── saude/ciclo/
│   ├── arquivos/
│   └── _devices.md         # index deviceId → nome (M38)
├── marcos/
├── treinos/
├── exercicios/
├── medidas/
├── alarmes/
├── tarefas/
├── contadores/
├── media/
│   ├── fotos/
│   ├── audios/
│   ├── videos/
│   ├── frases/
│   ├── avatares/
│   └── scanner/
└── .ouroboros/cache/       # gerado por backend futuro
```

Helper `inicializarVaultCanonico()` em
`src/lib/vault/permissions.ts` faz `mkdir` recursivo idempotente. O
helper `garantirSubpastas()` é chamado em cada save — se Syncthing
ou usuário apagar pasta acidentalmente, ela é recriada na próxima
escrita.

### Configuração do Syncthing

O usuário configura **uma vez**, fora do app:

- Pasta no celular: `/sdcard/Documents/Ouroboros/`.
- Pasta no desktop: `~/Protocolo-Ouroboros/`.
- Tipo: Send & Receive em todos os 4 nós (2 desktops + 2 celulares).
- Versionamento: Simple, 5 cópias por arquivo, 4 dias retidos.
- Ignorar permissões: Sim (Android não tem POSIX).
- Compressão: desligada.

Identificadores Syncthing (canônicos):

- Desktop André: `Nitro-5-Pop-OS` (`R3EEVHP`)
- Desktop Vitória: a definir
- Celular André: `Note13-Andre` (`CKA4XYE`)
- Celular Vitória: a definir

## Estrutura de arquivos onde a decisão vive

- `src/lib/vault/permissions.ts` — `inicializarVaultCanonico()`,
  `garantirSubpastas()`, helpers de permissão por API.
- `app/onboarding.tsx` — 3 frames sem Vault/Sync.
- `app.json` — permissões `WRITE_EXTERNAL_STORAGE`,
  `READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`.

## Consequências

### Positivas

- Onboarding em 3 frames sem fricção. Usuário entra direto no app.
- Zero risco de Vault `null` causando perda silenciosa de dados.
- Pasta canônica única e previsível para Syncthing.
- Backend ETL Python (projeto independente) pode apontar para
  `~/Protocolo-Ouroboros/` no desktop sem ambiguidade.

### Negativas

- `MANAGE_EXTERNAL_STORAGE` é permissão poderosa. Justificada porque
  o app precisa criar e gerenciar uma estrutura de pastas inteira
  para Syncthing externo funcionar. Documentado em onboarding e
  Settings (link "Reinicializar pasta do Vault" se algo der errado).
- App fica bloqueado para Play Store. Aceito (distribuição manual
  GitHub Releases é a única via desde sempre).

## Migração da v1.0.0-rc1

Zero usuários reais — a v1.0.0-rc1 nunca chegou ao usuário final por
causa exatamente desse bug. Migração é apenas: rebuild do APK e
reinstall.

## Verificação

```bash
# No celular após onboarding
adb shell ls /sdcard/Documents/Ouroboros/
# espera ver as 19 subpastas canonicas (9 raiz + 3 inbox + 6 media + 1 cache)

# No desktop após Syncthing pareado
ls ~/Protocolo-Ouroboros/
# espera ver as mesmas subpastas após primeiro sync
```

## Referências

- ADR-0014 — Vault Mobile em Pasta Dedicada (path canônico desktop)
- ADR-0002 — Sync Delegado ao Syncthing/Obsidian Sync
- Sprint M22 — implementa este ADR
- Sprint M23 — onboarding 3 frames consumindo este helper
