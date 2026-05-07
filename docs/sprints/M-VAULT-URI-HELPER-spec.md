# Sprint H1 — M-VAULT-URI-HELPER

```
DEPENDE:    nada (sprint atômica de helper puro)
BLOQUEIA:   H2, H3, todo Bloco I, I-AGENDA
ESTIMATIVA: ~1h
PRIORIDADE: CRÍTICA (raiz do problema)
STATUS:     [todo]
```

## §1 Achado / motivação

Field test do APK `v1.0.0-alpha` (commit `ada414e`) mostrou que TODOS os saves de
features (humor, diário, evento, foto, áudio, frase, tarefa, alarme, contador,
ciclo, exercício, scanner) falham com URIs SAF malformadas. Exemplos
empíricos via screenshot:

```
Falha ao salvar: Call to function 'ExponentFileSystem.writeAsStringAsync' has been rejected.
→ Caused by: java.lang.IllegalArgumentException: Invalid URI:
content://com.android.externalstorage.documents/tree/primary%3AProtocolo-Ouroboros%20/tarefas/2026-05-06-limpar-gatos-mt10.md
                                                                                ↑
                                                                  trailing space encoded
```

```
Falha ao salvar: Call to function 'ExponentFileSystem.copyAsync' has been rejected.
→ Caused by: java.io.IOException: Destination '/tree/primary:Protocolo-Ouroboros /assets/exercicios' directory cannot be created
                                                                              ↑
                                                                espaço LITERAL
```

Lendo `src/lib/vault/permissions.ts:137`:

```ts
const base = vaultRoot.endsWith('/') ? vaultRoot : `${vaultRoot}/`;
```

Não faz `.trim()`. Quando `vaultRoot` retornado pelo SAF picker tem trailing
whitespace (alguns OEMs Android — MIUI, OneUI, HyperOS — devolvem display
name da pasta com espaço), o whitespace contamina toda concatenação subsequente.

Cada writer concatena `${base}${rel}` ou `${vaultRoot}/${rel}` com lógica
ad-hoc espalhada em ~20 arquivos. **Solução canônica: 1 helper único + audit
de uso.**

## §2 Tarefa concreta

1. Editar `src/lib/vault/paths.ts`. Adicionar **no início do arquivo**, após
   imports e antes de qualquer outra export:

   ```ts
   // Helper canônico para concatenação de URIs do Vault. Resolve o
   // problema de trailing whitespace + barras duplas + percent-encoding
   // ofensivo (%20 no fim do tree URI SAF) que vinha contaminando saves
   // em OEMs MIUI/OneUI/HyperOS. Lança erro claro se root ou rel
   // estiverem vazios — sinal de bug em estado anterior do app.
   //
   // Comentarios sem acento (convencao shell/CI).
   export function vaultUriJoin(root: string, rel: string): string {
     const r = root
       .trim()
       .replace(/\s+$/, '')        // trim trailing whitespace
       .replace(/%20+$/, '')       // trim trailing percent-encoded space
       .replace(/\/+$/, '');       // trim trailing slashes
     const s = rel
       .trim()
       .replace(/^\s+/, '')        // trim leading whitespace
       .replace(/^\/+/, '');       // trim leading slashes
     if (!r) {
       throw new Error('vaultUriJoin: root vazio (vault não inicializado?)');
     }
     if (!s) {
       throw new Error('vaultUriJoin: rel vazio');
     }
     return `${r}/${s}`;
   }
   ```

2. Adicionar suite de testes em `tests/lib/vault/paths.test.ts` (ou criar
   se não existir). Cobrir 8+ casos:

   ```ts
   import { vaultUriJoin } from '@/lib/vault/paths';

   describe('vaultUriJoin', () => {
     it('concatena root + rel simples', () => {
       expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', 'humor.md'))
         .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
     });

     it('remove trailing whitespace do root', () => {
       expect(vaultUriJoin('content://...primary:Ouroboros ', 'tarefas/x.md'))
         .toBe('content://...primary:Ouroboros/tarefas/x.md');
     });

     it('remove trailing %20 do root', () => {
       expect(vaultUriJoin('content://...primary:Ouroboros%20', 'tarefas/x.md'))
         .toBe('content://...primary:Ouroboros/tarefas/x.md');
     });

     it('remove trailing slashes do root', () => {
       expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros/', 'humor.md'))
         .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
     });

     it('remove leading slashes do rel', () => {
       expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', '/humor.md'))
         .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
     });

     it('remove leading whitespace do rel', () => {
       expect(vaultUriJoin('file:///sdcard/Documents/Ouroboros', ' humor.md'))
         .toBe('file:///sdcard/Documents/Ouroboros/humor.md');
     });

     it('lança erro com root vazio', () => {
       expect(() => vaultUriJoin('', 'humor.md')).toThrow('vault não inicializado');
     });

     it('lança erro com rel vazio', () => {
       expect(() => vaultUriJoin('file:///sdcard', '')).toThrow('rel vazio');
     });

     it('lança erro com root só whitespace', () => {
       expect(() => vaultUriJoin('   ', 'humor.md')).toThrow('vault não inicializado');
     });

     it('preserva subpaths complexos com slashes intermediários', () => {
       expect(vaultUriJoin('file:///vault', 'inbox/mente/diario/2026-05-06.md'))
         .toBe('file:///vault/inbox/mente/diario/2026-05-06.md');
     });
   });
   ```

3. **NÃO tocar em writers/readers nesta sprint.** A migração para usar
   `vaultUriJoin` acontece em cada sprint do Bloco I (cada feature aplica
   no seu próprio writer/caller).

4. Atualizar `src/lib/vault/index.ts` para re-exportar `vaultUriJoin`.

## §3 Restrições invioláveis

- Anonimato Regra −1.
- PT-BR sentence case + acentuação completa em strings de erro UI (não há
  strings UI nesta sprint — só mensagens de Error que podem ficar em
  PT-BR canônico, mensagem em inglês também aceitável já que são
  developer-facing).
- TS strict 0 erros.
- Sem regressão de testes existentes.
- Comentários sem acento (convenção shell/CI).
- Helper é **puro** — sem side effects, sem state.

## §4 Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros
./scripts/check_anonimato.sh
python3 scripts/check_strings_ui_ptbr.py
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
./scripts/check_gauntlet_leak.sh
npm test --silent -- tests/lib/vault/paths.test.ts
```

Esperado: todos os comandos exit 0. Suite `paths.test.ts` mostra os 10+
casos do `vaultUriJoin` passando.

## §5 Validação Gauntlet OU validação humana

**Validação Gauntlet:** não aplicável (helper puro JS, sem UI).
**Validação humana:** não aplicável.

A validação canônica desta sprint é **Jest unit test** que cobre lógica
exaustivamente. As sprints do Bloco I que CONSOMEM `vaultUriJoin` farão a
validação runtime-real (humana via adb).

## §6 Commit message

```
feat: m-vault-uri-helper helper canonico vaultUriJoin com trim agressivo
```

## §7 Decisões tomadas

- **`%20+$` regex em vez de decode/encode completo**: o problema empírico
  é trailing space encoded como `%20`. Lidar só com esse caso é suficiente
  e seguro. URI decode completo poderia introduzir issues de segurança
  (path traversal via `%2E%2E%2F`).
- **Lança erro em vez de retornar string vazia**: bug-loud > bug-quiet.
  Caller que tenta concatenar com root vazio deve falhar imediatamente
  com mensagem clara, não silenciosamente gravar em URI inválida.
- **Helper em `paths.ts` em vez de novo arquivo**: consolida em um lugar
  já consumido por todos os writers. Re-export via `vault/index.ts` para
  acesso conveniente via `@/lib/vault`.
- **Migração de writers fica para Bloco I**: cada sprint de feature
  audita seu próprio writer + caller, mais granular e validável
  individualmente. Esta sprint H1 é só fundação.
