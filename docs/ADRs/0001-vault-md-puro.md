# ADR 0001 — Vault em Markdown Puro

```
Status: Aceito
Data:   Sprint M01 (decisão original)
Sprint: M01
```

## Contexto

Precisamos de storage que sobreviva ao App sumir. SQLite seria mais
rápido, mas opaco — se o App for desinstalado, dado vai junto.

## Decisão

Arquivos `.md` com YAML frontmatter, um por registro, organizados em
pastas por tipo. SQLite usado só como índice volátil (via op-sqlite),
regenerável a partir do filesystem.

## Consequências

- Migração trivial para qualquer App de notas
- Backup = copiar pasta
- Usuário pode editar manualmente no Obsidian se quiser
- Backend desktop já lê esse formato
- I/O mais lento que SQLite — mitigado com cache em memória
- Frontmatter precisa ser validado em runtime (zod)
