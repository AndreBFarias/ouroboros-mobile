# Sprint M38 — Conflict resolution para 4 dispositivos via deviceId no slug

```
DEPENDE:    M22 (vault canônico estabelecido)
BLOQUEIA:   nenhuma (paralela com M37/M39)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Resolver conflitos de Syncthing entre 4 nós (2 desktops + 2 celulares)
substituindo o pattern atual `-pessoa_<a|b>.md` (que cobre só 2
dispositivos por pessoa) por `-<deviceId>.md`. Cada dispositivo gera
seu próprio ID curto na primeira execução e o usa como sufixo de
arquivo quando colide.

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/util/deviceId.ts`
  ```ts
  const KEY = 'ouroboros.device.id';

  export async function getDeviceId(): Promise<string> {
    const cached = await SecureStore.getItemAsync(KEY);
    if (cached) return cached;
    const novo = `ouro-${randomShort()}`;
    await SecureStore.setItemAsync(KEY, novo);
    return novo;
  }

  function randomShort(): string {
    const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    }
    return out;
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/devicesIndex.ts`
  — helpers para ler/escrever `inbox/_devices.md`:
  ```yaml
  ---
  tipo: devices_index
  registro:
    ouro-abc123:
      nome_amigavel: celular-andre
      pessoa: pessoa_a
      primeira_atividade: 2026-05-02T09:00:00-03:00
      ultima_atividade: 2026-05-02T18:30:00-03:00
    ouro-def456:
      nome_amigavel: desktop-andre
      ...
  ---
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/dispositivos.tsx`
  — sub-tela em Settings: lista os 4 deviceIds + nome amigável
  editável + última atividade.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/util/deviceId.test.ts`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/vault/devicesIndex.test.ts`

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/humor/saveHumor.ts`
  — substituir pattern `-pessoa_<x>.md` por `-${deviceId}.md`. Aceitar
  arquivos legados sem suffix (backward-compat: se não há colisão,
  usa nome canônico sem sufixo).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/diario/saveDiario.ts`
  — mesmo padrão.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/eventos/saveEvento.ts`
  — mesmo padrão.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/tarefas.ts`
  — `criarTarefa` usa deviceId.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/contadores.ts`
  — colisões de slug usam deviceId (não sufixo random).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/vault/alarmes.ts`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/boot/reagendamento.ts`
  — boot hook `atualizarDeviceIndex()` que escreve no
  `inbox/_devices.md` registro do dispositivo atual (primeira/última
  atividade).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/index.tsx`
  — adicionar `<LinkSubTela>` "Dispositivos pareados" → `/settings/dispositivos`.

### Arquivos NÃO modificados

- Schemas (deviceId é detalhe de naming de arquivo, não de
  conteúdo).
- `usePessoa` (autor continua sendo `pessoa_a`/`pessoa_b`).

## 3. APIs reutilizáveis

- `expo-secure-store` para deviceId.
- `Math.random` para ID curto (não criptográfico — é só ID de
  arquivo).
- `writeVaultFile` existente.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Boot hook:** `atualizarDeviceIndex` adicionado a `BOOT_HOOKS`.
- **Sub-rota nova:** `/settings/dispositivos`.
- **Vault:** `inbox/_devices.md` é arquivo novo; backend ETL ignora.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais. `nome_amigavel` aceita
  string livre (digitada pelo usuário).
- Sentence case + acentuação PT-BR.
- TS strict.
- DeviceId **persistente** — gerado uma vez, nunca regenera.
- Backward-compat: arquivos legados `-pessoa_a.md` continuam sendo
  lidos (helpers de read não filtram por sufixo).
- Helpers de save **só usam deviceId quando há colisão**: caminho
  feliz mantém nome canônico (`daily/2026-05-02.md`).

## 5. Procedimento sugerido

1. Criar `getDeviceId()` + teste.
2. Criar `devicesIndex.ts` (read/write `inbox/_devices.md`).
3. Atualizar 6 writers (humor, diario, evento, tarefa, contador,
   alarme) para usar deviceId em colisão.
4. Criar boot hook `atualizarDeviceIndex` + plug em `BOOT_HOOKS`.
5. Criar sub-tela `/settings/dispositivos` com lista + edição.
6. Plugar link em Settings.
7. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m38-export && rm -rf /tmp/m38-export

# Manual cross-device (requer 2 celulares OU emulador + celular):
# 1. Salvar humor 09:00 no celular A: cria daily/2026-05-02.md
# 2. Salvar humor 09:00 no celular B (mesma pessoa): cria
#    daily/2026-05-02-ouro-XXX.md
# 3. Após sync Syncthing: ambos arquivos coexistem
# 4. Settings > Dispositivos pareados: lista 2 deviceIds
```

## 7. Commit

```
feat: m38 conflict resolution 4 nos via device id e index
```

## 8. Checkpoint visual

2 screenshots Nível A em `docs/sprints/M38-screenshots/`:
- `A-settings-dispositivos.png` — lista de deviceIds com nomes.
- `A-edicao-nome-dispositivo.png` — modal de edição de nome amigável.

## 9. Decisões tomadas

- **DeviceId 6 chars alfanuméricos**: 36^6 = 2.1 bi combinações;
  zero risco de colisão entre 4 nós.
- **Nome amigável editável**: usuário pode renomear para
  "celular-andre", "desktop-vitoria" para clareza.
- **`inbox/_devices.md` único**: arquivo cresce com 4 entradas;
  Syncthing merge resolve via timestamp `ultima_atividade` (last-write-wins
  por subkey).
- **Backward-compat**: arquivos `-pessoa_a.md` legados são lidos.
  M38 só altera o **futuro** padrão de naming.
- **DeviceId não criptográfico**: é só identificador de arquivo,
  não secret.

Sprint pronta para execução sem perguntas pendentes.
