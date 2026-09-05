# AUDIT-P4-10-CHECK-DRIFT-FEATURES-CANONICAS — check preventivo de drift entre código de integrações e FEATURES-CANONICAS.md

```
STATUS:     proposta 2026-09-05 (item 5 do escopo de
            AUDIT-P4-3-FEATURES-CANONICAS-SYNC, que a executou como
            proposta e não como implementação, por NÃO-objetivo próprio)
PRIORIDADE: baixa (é prevenção, não correção; nenhum dado de usuário em
            risco). Só faz sentido depois que AUDIT-P3-1 promover o
            `quality-gate` a required status check — hoje nenhum aviso
            do smoke bloqueia merge.
DEPENDE:    nenhuma tecnicamente. AUDIT-P3-1 (branch protection) é
            pré-requisito de utilidade, não de execução.
ORIGEM:     AUDIT-P4-3-FEATURES-CANONICAS-SYNC. Aquela sprint provou
            drift real de três entregas — a troca do pacote npm de
            Health Connect pela bridge nativa própria, R-INT-4
            (Spotify/YouTube) e R-INT-5 (Drive) — que mudaram o
            comportamento do app sem tocar em
            `docs/FEATURES-CANONICAS.md`.
```

## Problema

`docs/FEATURES-CANONICAS.md` se declara "fonte de verdade única sobre o
que o app faz" e o arquivo de regras da raiz manda atualizá-lo no mesmo
commit de toda sprint que muda feature. Não existe nenhum mecanismo que
verifique isso. A regra é convenção pura, e a auditoria de 2026-07-28
mostrou que a convenção falhou pelo menos três vezes seguidas nas
integrações.

O custo do drift não é estético: quem lê o documento decide errado. Antes
da AUDIT-P4-3, o documento afirmava que o projeto dependia de
`react-native-health-connect@^3.5.0` — pacote que não existe no
`package.json` nem em `node_modules/` — e que Spotify, YouTube e Drive
eram placeholders com badge "Em breve", quando os três já computavam
estado real a partir dos stores.

## Escopo proposto

1. Criar `scripts/check_drift_features.py` (Python 3, sem dependência
   externa, no mesmo estilo de `scripts/check_roadmap_fantasmas.py`).
   Entrada: o diff de um range de commits (`--base`/`--head`, default
   `origin/main...HEAD`). Regra única: se o diff toca
   `src/lib/integracoes/**`, `modules/health-connect/**` ou
   `src/lib/health/**` **e** não toca `docs/FEATURES-CANONICAS.md`,
   emitir aviso nomeando os arquivos que dispararam a regra.
2. Aceitar um escape hatch explícito, no mesmo espírito do
   `// anonimato-allow:`: a linha `features-canonicas-allow: <motivo>` no
   corpo da mensagem de commit ou um `--allow` na chamada silencia o
   aviso. Refatoração interna e correção de bug que não muda
   comportamento visível são casos legítimos e vão acontecer com
   frequência — sem escape hatch, o check vira ruído e é ignorado.
3. Ligar no `scripts/smoke.sh` como aviso **não-bloqueante**, copiando o
   padrão já corrigido do detector de fantasmas (`scripts/smoke.sh`
   linhas 47-66): `set +e` / captura do `rc` / `set -e`, `if` com `else`
   explícito que imprime `AVISO: o check de drift NÃO RODOU (exit $rc)`.
   Esse bloco é o padrão a seguir, não um defeito a evitar — o defeito
   original (um `if` sem `else`, que tornava "sem achados" e "o script
   quebrou" indistinguíveis) já foi corrigido pela AUDIT-P3-5.
4. Documentar o check no `docs/CONTEXTO.md` §5, junto das demais regras
   de trabalho.

## NÃO-objetivos

- Não bloquear merge. O check nasce advisory. Promovê-lo a bloqueante é
  decisão separada, e só faz sentido depois de AUDIT-P3-1.
- Não tentar validar o *conteúdo* do documento — só a presença de diff.
  Qualquer heurística sobre o texto seria falso-positivo garantido.
- Não generalizar para todo `src/`. Começar pelas três pastas onde o
  drift foi medido. Ampliar depois, com evidência.
- Não reaproveitar `check_roadmap_fantasmas.py`. Ele lê
  `FEATURES-CANONICAS.md` como corpus heurístico para classificar sprint
  fantasma (`scripts/check_roadmap_fantasmas.py` linha 59 e o cálculo de
  evidências externas em torno da linha 431); é outro problema, e
  misturar os dois deixaria os dois piores.

## Proof-of-work

```bash
# 1. dispara o aviso: commit que toca integracoes sem tocar o doc
python3 scripts/check_drift_features.py --base <sha_antes> --head <sha_depois>

# 2. nao dispara: mesmo range com o doc incluido no diff

# 3. escape hatch reconhecido
python3 scripts/check_drift_features.py --allow "refatoracao interna"

# 4. smoke imprime o aviso e continua verde (nao-bloqueante)
./scripts/smoke.sh
```

Sprint de infra, sem código de UI tocado — dispensa caso E2E novo.

## Commit

```
chore: audit-p4-10 avisa quando integracao muda sem atualizar features canonicas
```
