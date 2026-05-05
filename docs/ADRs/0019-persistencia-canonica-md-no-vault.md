# ADR 0019 — Persistência canônica em `.md` individual no Vault

```
Status:     Aceito
Data:       2026-05-05
Sprint:     M37.1.2 (refundação v1.0)
Depende:    ADR-0001 (Vault em Markdown Puro)
            ADR-0014 (Vault Mobile em Pasta Dedicada)
            ADR-0017 (Mídia em Formato Original com .md Companion)
```

## Contexto

A v1.0 herdou de ADR-0001 a regra "Vault em Markdown puro": cada
registro vira `.md` com frontmatter YAML + corpo em Markdown.
ADR-0017 estendeu para mídia binária (fotos, áudios, vídeos,
PDFs) com `.md` companion no mesmo diretório.

Com a sprint M37.1 (Google Calendar OAuth + leitura de agenda)
foi introduzido um **cache JSON único** por pessoa em
`media/cache/agenda-<pessoa>.json` armazenando 30 dias de
eventos. Em auditoria com o dono em 2026-05-05, identificamos
que isso quebra a invariante "tudo o que o usuário vê no app é
`.md` individual no Vault".

Essa mesma auditoria revelou outras 2 exceções históricas:
- `.ouroboros/cache/humor-heatmap.json` (M10).
- `.ouroboros/cache/financas-cache.json` (M14).

A diferença qualitativa entre os 3:
- Os 2 caches em `.ouroboros/cache/` são **agregações readonly
  geradas pelo backend Python** (não criadas pelo usuário no
  Mobile, não editáveis no Mobile, somente reidratadas a cada
  sincronização do desktop). São pré-computações de leitura,
  não dados primários.
- O cache de agenda do Google Calendar é um **espelho remoto de
  dado primário consultável pelo usuário**. Apesar de não ser
  criado no Mobile, é exibido como registro do usuário e pode
  ser sujeito a operações (ler, listar, eventualmente editar
  via M37.2).

## Decisão

1. **Dados primários do usuário no Vault são persistidos como
   `.md` individual** com frontmatter validado por zod (ADR-0009):
   - Criados pelo usuário no Mobile (humor, diário, evento,
     marco, medida, exercício, ciclo, alarme, tarefa, contador,
     nota financeira, frase, devices index).
   - Espelhados de fonte externa mas exibidos como registro do
     usuário (eventos do Google Calendar via M37.1.2).
2. **Binários originais** (foto, áudio, vídeo, PDF, GIF de
   exercício, anexo de nota) seguem ADR-0017: ficam em `media/`
   ou `assets/` em formato original, com `.md` companion no
   mesmo diretório carregando metadata + ref ao binário.
3. **Exceções legítimas** — agregações readonly geradas pelo
   backend Python e nunca editadas pelo Mobile — ficam em
   `.ouroboros/cache/*.json`. Lista canônica:
   - `humor-heatmap.json` (M10).
   - `financas-cache.json` (M14).
   - Outros caches futuros gerados pelo backend SEGUEM esse
     padrão (`.ouroboros/cache/<nome>.json`) e DEVEM ser
     readonly do ponto de vista do Mobile.
4. **Qualquer cache mutável criado pelo Mobile** que tenha
   relação com dado do usuário **deve ser `.md` individual**, não
   JSON único. Isso aplica retroativamente ao cache de agenda
   M37.1: descopado para M37.1.2 reorganizar como
   `agenda/<pessoa>/YYYY-MM-DD-<eventId>.md`.

## Justificativa

- **Sincing arquivo-a-arquivo**: Syncthing (canal canônico —
  ADR-0002) propaga mudanças por arquivo. Um JSON único de N
  itens é reescrito inteiro a cada mudança, gerando reupload
  total e potencial conflito massivo. N arquivos `.md`
  pequenos sincam só os deltas.
- **Inspecionabilidade**: o usuário pode abrir qualquer `.md`
  num editor (Obsidian, VS Code, vim) e ler seus dados sem o
  app rodando. Cumpre o princípio "Vault é seu, app é
  ferramenta" (BRIEFING §1).
- **Backup/restore unificado**: o ZIP de M-EXPORT-COMPLETO
  trata `.md` byte-a-byte com sha256. Cache JSON requeria
  caminho especial.
- **Conflito isolado**: dois devices editando eventos
  diferentes não geram conflito; mesmo evento gera arquivo de
  conflict resolution único (ADR-0014 + M38 com suffix
  deviceId).
- **Consistência conceitual**: 1 padrão para "registro
  primário", 1 padrão para "binário original com companion", 1
  padrão para "cache readonly de backend". Sem
  meio-termo.

## Consequências

### Positivas

- Padrão único reduz superfície de bugs e manutenção.
- Backups, exports, sincronização e migrações ganham um único
  caminho.
- Cada feature nova segue um template testável (`writeVaultFile`
  + zod schema + reader que lista por extensão).

### Negativas

- Mais arquivos no filesystem. Eventos de 1 ano podem gerar
  ~365 `.md` por pessoa em `agenda/`. Escalável até ~10k
  arquivos por diretório no FS Linux/Android (limite prático
  do FS comum, bem abaixo dos limites teóricos ext4/F2FS).
- Listagem de pasta com muitos arquivos pode ser lenta em
  rotações antigas — mitigado por subdivisão hierárquica
  futura (`agenda/<pessoa>/YYYY-MM/<dia>-<id>.md`) se a
  performance ficar crítica. Por ora a estrutura plana é OK.

### Neutras

- Custo de I/O: N escritas pequenas em vez de 1 grande. Em SSD
  e flash NAND é equivalente; em HDD seria pior, mas o alvo é
  Android (flash).

## Alternativas consideradas

### A — Manter cache JSON único por feature

**Rejeitado.** Razão única: viola o princípio "Vault é seu". O
JSON é opaco para o usuário, não diff-friendly em Syncthing,
não survivable a edição manual.

### B — SQLite local

**Rejeitado.** Razão: opacidade total para o usuário,
incompatível com Syncthing arquivo-a-arquivo (banco fica em
arquivo único; conflito de schema entre devices vira bug
catastrófico), inverte a posição do projeto de "app é
ferramenta sobre arquivos do usuário" para "app é dono dos
dados".

### C — Cache JSON único + auditoria periódica gerando `.md`

**Rejeitado.** Razão: dois fontes de verdade. Inconsistência
inevitável.

## Referências cruzadas

- ADR-0001 — Vault em Markdown puro (fundação).
- ADR-0002 — Sync delegado ao Syncthing/Obsidian Sync.
- ADR-0014 — Vault Mobile em pasta dedicada.
- ADR-0017 — Mídia em formato original com `.md` companion.
- ADR-0018 — OAuth Google (referência ao cache de M37.1 que é
  descopado por este ADR).
