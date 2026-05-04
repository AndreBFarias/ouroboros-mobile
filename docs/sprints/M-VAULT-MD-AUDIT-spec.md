# Sprint M-VAULT-MD-AUDIT — Confirmar tudo .md + mídias preservadas + Obsidian-friendly

```
DEPENDE:    M22 fechada (vault canônico criado)
            + M34 fechada (companion .md preliminar)
            + M39 (formaliza companion ADR-0017)
BLOQUEIA:   M41 (release final — promessa "Obsidian-compat" precisa
            estar verificada)
ESTIMATIVA: 3-4h
PRIORIDADE: alta (fundamento do projeto — anti-débito)
```

## 1. Achado / motivação

Filosofia do projeto: **"dados são arquivos"** — todo registro do
app vira `.md` no Vault Obsidian, mídias originais preservadas em
pastas dedicadas. Usuário pode abrir o Vault em Obsidian Desktop e
ver/editar tudo.

Auditoria 2026-05-04 levantou dúvida: **é REALMENTE assim em
todos os caminhos?** Cada feature foi entregue em sprint separada,
ninguém validou de ponta a ponta que TUDO escreve `.md` válido +
mídia binária separada + companion.

## 2. Objetivo

Auditar e provar (com testes integrados) que:

1. **Todo registro de UI vira .md no Vault** (humor, diário,
   evento, contador, tarefa, medida, marco, treino, alarme,
   ciclo, frase, foto, vídeo, áudio).
2. **Mídias binárias ficam em `media/<categoria>/<basename>.<ext>`**
   no formato original (jpg/mp4/mp3/pdf/etc.) — nunca convertidas
   nem re-codificadas.
3. **Cada mídia tem `.md` companion** com mesmo basename
   (`media/fotos/2026-05-04-abc.jpg` + `media/fotos/2026-05-04-abc.md`)
   conforme M34 + M39.
4. **Estrutura é navegável em Obsidian Desktop** — links wiki
   `[[medidas/2026-05-04]]`, frontmatter YAML válido,
   sem caracteres proibidos em nome de arquivo.
5. **Settings, toggles, identidade NÃO ficam no Vault** — esses
   são SecureStore/AsyncStorage (config local do app), Vault é
   só para registros de vida do usuário.

## 3. Entregáveis

### Documento de auditoria

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/docs/auditoria-vault-2026-05-04/RELATORIO.md`
  — relatório com tabela:

  | Feature | Sprint | Escreve .md? | Mídia? | Companion? | Obsidian OK? | Status |
  |---|---|---|---|---|---|---|
  | Humor | M05 | sim (`daily/<data>.md`) | n/a | n/a | sim | OK |
  | Diário emocional | M06 | sim (`inbox/mente/diario/`) | áudio opcional | M39 | sim | parcial |
  | ... | ... | ... | ... | ... | ... | ... |

  Cobre as 13 features listadas no §2.

### Testes de integração nova

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/integration/vault-md-completo.test.ts`
  — para cada feature, simula 1 registro completo (input + mídia
  se aplicável) e:
  1. Confirma `.md` criado com frontmatter zod-válido.
  2. Confirma mídia binária no path canônico.
  3. Confirma companion `.md` com mesmo basename.
  4. Confirma frontmatter parseável por YAML strict.
  5. Confirma absence de caracteres proibidos no path
     (`<>:"/\\|?*` em Windows; `:` problemático em Obsidian Mac).

### Helper de validação

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/check_vault_estrutura.sh`
  — script bash que dado um vault path varre tudo e reporta:
  ```
  daily/: 23 .md (todos parseáveis YAML)
  media/fotos/: 12 binários (.jpg, .png) + 12 companion .md (1:1)
  media/audios/: 3 .m4a + 3 .md (1:1 OK)
  media/scanner/: 2 .pdf + 2 .md (1:1 OK)
  ...
  PROBLEMAS: nenhum
  ```

### Possíveis sub-sprints corretivas

Se auditoria revelar features que NÃO escrevem .md ou que escrevem
em path errado, materializar sub-sprint nova `M-VAULT-MD-FIX-<feature>`
com correção isolada. Anti-débito.

## 4. Restrições

- **Regra −1** (anonimato).
- **Sentence case + acentuação PT-BR completa** em strings UI da
  auditoria (relatório, mensagens do script).
- TS strict 0.
- Comparar com **CONTEXTO.md §3** (contrato Mobile↔Backend).

## 5. Verificação

- `./scripts/check_vault_estrutura.sh ~/Protocolo-Ouroboros/`
  retorna exit 0.
- `npm test -- tests/integration/vault-md-completo.test.ts`
  passa com 13 cases (1 por feature).
- Abrir Vault no Obsidian Desktop manualmente: navegação,
  links wiki, frontmatter render OK.

## 6. Decisões tomadas

- **Auditoria é doc + script + testes** — não é refactor de feature
  (cada uma já está bem; queremos PROVA de que tudo se encaixa).
- **Achados viram sub-sprints** — preserva foco da auditoria.
- **Obsidian Desktop é teste manual** — não dá para automatizar
  Obsidian em CI; basta evidência (screenshot/print) no relatório.
