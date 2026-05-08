# Sprint G5 — M-GAUNTLET-RETROATIVO-AUDIT

```
DEPENDE:    HEAD em 9c385b3 (RELATORIO 2026-05-08 já existe)
BLOQUEIA:   APK preview (Bloco P) — sprint sem PNG não fecha (BRIEF §1.9.2)
ESTIMATIVA: ~3h
STATUS:     [todo]
```

## 1. Objetivo

Capturar PNGs reais retroativos para as 22+ sprints golden-zebra fechadas
sem evidência visual (pasta vazia ou `.gitkeep`). A auditoria visual
2026-05-08 já documentou inline; esta sprint **persiste em disco** os PNGs
em `docs/sprints/<id>-screenshots-gauntlet/`.

## 2. Entregáveis

### Arquivos novos (PNGs)

Para cada sprint UI listada em `docs/auditoria-2026-05-08/RELATORIO.md`
sem PNG real, capturar 1-3 PNGs em
`docs/sprints/<sprint-id>-screenshots-gauntlet/` cobrindo:

- Estado vazio (empty)
- Estado preenchido (golden) quando aplicável
- Erro ou edge case quando trivial

Lista mínima (22 sprints):
H1, I-HUMOR, I-DIARIO, I-EVENTO, I-FOTO, I-AUDIO, I-VIDEO, I-FRASE,
I-TAREFA, I-ALARME, I-CONTADOR, I-CICLO, I-EXERCICIO, I-SCANNER,
I-DEVICES, I-AGENDA, K1, K2, K3, K4, K5, L1, L2, N1, N2, O1.

### Arquivos modificados

- `VALIDATOR_BRIEF.md` §1.9.2 (nova subseção): "Sprint não fecha sem
  PNG real, não basta `.gitkeep`."
- `scripts/check_pngs_sprints.sh` (novo) — opcional: script que valida
  pasta de screenshots-gauntlet contém >0 arquivos `.png` reais.

## 3. APIs reutilizáveis

- `./gauntlet.sh` (boot canônico).
- `claude-in-chrome` MCP (`computer screenshot save_to_disk`).

## 4. Restrições

Cada PNG ≤ 100KB (otimizado por compressão). Total esperado ~6-8 MB no
repo. Considerar `.gitignore` do diretório `node_modules/` está OK,
imagens não.

## 5. Validação

Smoke + verificação manual:
```bash
for d in docs/sprints/*-screenshots-gauntlet; do
  count=$(ls "$d"/*.png 2>/dev/null | wc -l)
  [[ $count -eq 0 ]] && echo "VAZIO: $d"
done
```

## 6. Procedimento

1. Subir Gauntlet.
2. Para cada sprint, navegar e capturar via `computer screenshot save_to_disk`.
3. Mover/renomear PNGs para `docs/sprints/<id>-screenshots-gauntlet/`.
4. Verificar checksum / tamanho.
5. Commit batch.

## 7. Verificação

Smoke + script de verificação.

## 8. Commit

```
docs: m-gauntlet-retroativo-audit pngs reais 22 sprints golden-zebra
```

## 9. Checkpoint visual

Esta sprint **é** a captura de PNG. Não precisa screenshot adicional.

### Checklist

- [ ] `STATE.md`, `CHANGELOG.md`.
- [ ] `VALIDATOR_BRIEF.md` §1.9.2 nova.
- [ ] `scripts/check_pngs_sprints.sh` (opcional).

## 10. Dúvidas em aberto

Nenhuma.
