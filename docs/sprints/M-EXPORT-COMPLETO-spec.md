# Sprint M-EXPORT-COMPLETO — Export ZIP empacota .md + mídias + companion + ADR-meta

```
DEPENDE:    M15 fechada (exportarVaultZip básico)
            + M-VAULT-MD-AUDIT fechada (estrutura confirmada)
            + M39 (companion oficial)
BLOQUEIA:   M41 (release final — usuário precisa poder migrar/backup)
ESTIMATIVA: 2-3h
PRIORIDADE: alta (cumpre promessa "dados portáveis")
```

## 1. Achado / motivação

`exportarVaultZip()` (M15) gera ZIP do Vault, mas não foi auditado
se inclui:

- [ ] Todos os `.md` de todas as 19 subpastas canônicas.
- [ ] Todos os binários (jpg/mp4/mp3/pdf) preservados no formato
      original.
- [ ] Companion `.md` de cada mídia (M34/M39).
- [ ] Cache `.ouroboros/cache/*.json` (humor-heatmap,
      financas-cache, marcos-auto).
- [ ] Subpasta `.ouroboros/` (oculta, contém metadados privados
      do app).
- [ ] **Settings/identidade** (do SecureStore — backup separado em
      `.ouroboros/snapshot-settings.json` no momento do export?).

Não está claro qual o escopo real. Usuário precisa de **backup
completo** que ele possa restaurar em outro dispositivo (e ler em
Obsidian).

## 2. Objetivo

Reescrever (ou auditar + ajustar) `exportarVaultZip()` para
garantir que o ZIP gerado é **fiel ao estado do Vault + config do
app**. Restore deve ser inverso simétrico.

## 3. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/services/restaurarVault.ts`
  — função `restaurarVaultZip(zipPath: string): Promise<{ok, falhas}>`
  que descompacta um ZIP exportado e popula o Vault + SecureStore.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/integration/export-restaure-roundtrip.test.ts`
  — roundtrip: cria estado seed completo → exporta → apaga vault →
  restaura → confirma estado idêntico (md5 de cada arquivo).

### Arquivos modificados

- `src/lib/services/exportarVault.ts` — incluir:
  1. Todos os `.md` de cada subpasta (recursivo).
  2. Todos os binários (preservar bytes exatos).
  3. Todos os companion `.md`.
  4. Cache `.ouroboros/cache/*.json`.
  5. Snapshot da config local em
     `.ouroboros/snapshot-settings.json` — serializa
     `useSettings`, `useOnboarding`, `usePessoa` (sem fotos
     binárias — fotos vão como mídia separada em
     `media/avatares/`).
  6. Manifest `MANIFEST.json` na raiz do ZIP com versão do schema,
     data do export, contagem por subpasta, hash sha256 de cada
     arquivo (para verificação no restore).
- `app/settings/index.tsx` — botão "Importar backup" novo, abre
  document picker para `.zip`, chama `restaurarVaultZip()`,
  mostra resultado.

## 4. Restrições

- **Regra −1** (anonimato).
- **Sentence case + acentuação PT-BR completa** em strings UI:
  "Exportar todos os meus dados", "Importar backup", "Restauração
  concluída.", "Falha ao ler o arquivo zip.".
- TS strict 0.
- ZIP sem compressão excessiva — mantém binários streamable
  (level 1). Tamanho estimado por usuário 1 ano: ~500 MB
  (fotos + áudios).
- **Sem upload na nuvem** — ADR-0007 (privacidade absoluta).
  Export é local-to-local.

## 5. Verificação

- E2E `tests/e2e/playwright/m-export-completo.e2e.ts`:
  - seed Gauntlet com 50 registros + 3 fotos mock + 1 áudio mock.
  - Settings → Exportar → dump em `/tmp/export-test.zip`.
  - Inspect ZIP: `unzip -l` mostra todas as 19 subpastas + cache +
    MANIFEST.
  - Restaurar em vault novo → diff zero contra original.

## 6. Decisões tomadas

- **MANIFEST.json é fonte de verdade** — restore valida cada
  arquivo via sha256 antes de escrever.
- **Snapshot settings em `.ouroboros/`** — não vai para Obsidian
  visível; mantém Vault limpo.
- **Restore é destrutivo opcional**: pergunta antes de sobrescrever
  vault existente. Default: append (cria pasta `restaurado-<data>/`
  e popula lá).
- **Sem encryption no ZIP** — usuário responsável pelo backup
  físico (ADR-0007 confiança no usuário).
