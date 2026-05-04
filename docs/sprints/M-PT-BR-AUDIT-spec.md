# Sprint M-PT-BR-AUDIT — Auditoria automatizada de strings UI PT-BR

```
DEPENDE:    nada
BLOQUEIA:   M41 (release final — UI inconsistente em PT-BR sem acento
            é vergonha em produto v1.0)
ESTIMATIVA: 3-4h
PRIORIDADE: alta (regra durável violada por agentes repetidamente)
```

## 1. Achado / motivação

Regra documentada em `CLAUDE.md` Seção "Regra de Linguagem":

> Mensagens de UI no app (botões, toasts, labels) → **Sentence case
> + acentuação PT-BR completa** (revisado em 2026-04-28).

Mas observação empírica de 12+ sprints fechadas em sessões com
agentes mostra que executores **continuam introduzindo strings UI
sem acento ou em snake_case** em batch silencioso. Exemplos
recentes detectados ao acaso:

- "Cancelar" OK, mas "Salvar" às vezes vira "salvar".
- "Música" frequentemente vira "Musica" em E2E + a11y labels.
- "Vídeo" → "Video".
- "Ações" → "Acoes".
- "Não" → "Nao".

Validação visual via Gauntlet pega só o que está em viewport — não
varre TODAS as strings. Smoke (Jest) não checa idioma.

## 2. Objetivo

Implementar **validação automática durante CI** + **hook de pre-
commit local** que detecta:

1. Strings UI sem acento em palavras conhecidas
   (regex amplo + dicionário de palavras canônicas).
2. Strings UI em UPPERCASE sem motivo (não micro-caps reservadas).
3. Strings UI em lowercase quando deveriam ser sentence case
   (primeira letra maiúscula, exceto após ponto).

Cobre `src/`, `app/`, e excluí `tests/`, `scripts/`, `.md` de docs.

## 3. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/check_strings_ui_ptbr.py`
  — Python (sem deps externas):
  ```python
  # Varre src/ e app/ por arquivos .ts/.tsx.
  # Detecta strings literais ('...' ou "...") em contextos UI:
  #   - JSX text node (entre tags)
  #   - prop label="..." | placeholder="..." | title="..."
  #     | accessibilityLabel="..." | message="..." | frase="..."
  # Para cada string detectada:
  #   1. Carrega dicionário de palavras canônicas com acento
  #      (ex: {"nao": "não", "voce": "você", "musica": "música",
  #       "video": "vídeo", "acoes": "ações", ...}).
  #   2. Tokeniza string, verifica se algum token está no
  #      dicionário sem acento.
  #   3. Reporta violação com path:linha:coluna + sugestão.
  # Exit 0 se zero violações; exit 1 com lista se houver.
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/scripts/dicionario_ptbr_canonico.json`
  — dicionário curado com pares `{ sem_acento: com_acento }`. Lista
  inicial sugerida (50+ entradas).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/.husky/pre-commit`
  ou similar — hook que roda
  `python3 scripts/check_strings_ui_ptbr.py` antes de cada commit.
  Bloqueia commit se exit != 0.

### Atualizações em docs

- `VALIDATOR_BRIEF.md` §1.4 — adicionar referência ao novo script
  como check obrigatório no pipeline.
- `CLAUDE.md` Seção "Regra de Linguagem" — listar exemplos
  comuns de violações com correções, e instruir agentes a SEMPRE
  passar strings PT-BR pelo validator antes de submit.
- `HANDOFF-PROMPT.md` — novo bullet em "Restrições invioláveis":
  "Cada agente DEVE rodar `python3 scripts/check_strings_ui_ptbr.py`
  no proof-of-work obrigatoriamente."

### Smoke updated

- `scripts/smoke.sh` — adicionar passo
  `python3 scripts/check_strings_ui_ptbr.py` antes do `npm test`.
  Falha do smoke se violação detectada.

### Sub-sprint corretiva paralela

- `M-PT-BR-RETROFIT` (gerada após este audit) — varre violações
  existentes encontradas pelo primeiro run e materializa fixes em
  batch. Pode ser dispatchada como spec separada ou integrada se
  forem poucas (<20 violações).

## 4. Restrições

- **Regra −1** (anonimato).
- O script DEVE ser idiomático em Python 3.10+ sem deps externas
  (apenas stdlib).
- **NÃO bloquear** strings em contextos legítimos sem acento
  (commit messages, paths, slugs, comentários sem acento por
  convenção). Apenas strings UI.
- **Permitir override** via comentário inline
  `// ptbr-allow: <razao>` para casos genuinos
  (ex: nome próprio "Sao Paulo" sem til quando referência ao slug
  no Vault).

## 5. Verificação

- `python3 scripts/check_strings_ui_ptbr.py` rodado manualmente
  retorna lista de violações atuais (esperado: > 0 — vai gerar
  M-PT-BR-RETROFIT).
- Após retrofit, segundo run retorna exit 0.
- Pre-commit hook bloqueia commit com `feat: x` que tenha string
  "Nao" sem acento em qualquer .tsx novo.

## 6. Decisões tomadas

- **Hook bloqueante**: severidade é alta — qualidade do produto
  v1.0 depende disso.
- **Override por comentário, não por config global**: força
  justificativa caso a caso.
- **Dicionário curado, não NLP**: simples, determinístico,
  zero falsos positivos com palavras técnicas em inglês.
- **Smoke roda primeiro o check**: barreira pre-CI. Se violação,
  smoke falha, agente vê imediatamente.
- **Lista inicial de 50+ palavras**: cobre 80% dos casos comuns
  (não/também/você/ações/atenção/orientação/etc). Cresce com uso.
