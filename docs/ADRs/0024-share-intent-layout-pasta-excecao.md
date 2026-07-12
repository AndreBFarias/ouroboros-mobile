# ADR 0024 — Share Intent grava em `inbox/` como exceção parcial ao layout-por-tipo

```
Status:     Aceito
Data:       2026-05-08
Sprint:     M-SHARE-INTENT-LAYOUT (G1, derivada da auditoria 2026-05-08
            sobre pendências do plano golden-zebra)
Depende:    ADR-0023 (Vault organizado por tipo de arquivo)
            ADR-0019 (Persistência canônica em .md individual)
Substitui:  parte de ADR-0023 que dizia "todos os .md vão para
            markdown/<prefix><stem>.md". Arquivos recebidos via Share
            Intent (M08) permanecem em `inbox/<area>/<subtipo>/<...>`
            como exceção dedicada à triagem temporária.
```

## Contexto

A sprint H2 (ADR-0023, layout-por-tipo) reorganizou o Vault para que
todo `.md` viva em `markdown/<prefix><stem>.md` e cada binário caia em
sua pasta de extensão (`jpg/`, `m4a/`, `mp4/`, `pdf/`, `gif/`). O boot
hook `migrarVaultLayoutPorTipo` migra o legado por feature
(`daily/`, `eventos/`, `marcos/`, `medidas/`, `media/fotos/`, etc.).

A seção "Achados colaterais" do ADR-0023 (item 1) deixou explícito que o
**Share Intent Receiver (M08)** continuou usando o layout legado
`inbox/<area>/<subtipo>/<data>-<slug>.md` e que sprint dedicada deveria
revisitá-lo. A auditoria 2026-05-08 (`docs/auditoria-2026-05-08/RELATORIO.md`)
materializou esta sprint G1 e exige decisão durável.

Há duas alternativas viáveis:

### Alternativa A — Migrar share intent para `markdown/` com prefixo no slug

Mover destino para `markdown/inbox-<area>-<subtipo>-<data>-<slug>.md` e
binário para `<ext>/inbox-<area>-<subtipo>-<data>-<slug>.<ext>`.

Vantagem: aderência total ao ADR-0023, leitura plana via
`listVaultFolder('markdown/')` cobre 100% dos `.md` do Vault.

Desvantagem: confunde semântica. Arquivos do `inbox/` são por natureza
**triagem temporária** — o usuário ainda vai decidir se vira evento,
diário, conquista ou se descarta. Misturá-los com os 47+ tipos
canônicos definitivos em `markdown/` polui a listagem de "registros
do dia" e complica audit ("quantos arquivos pendentes de triagem
tenho?" passa a exigir filtro por prefixo `inbox-` em vez de
`ls inbox/`).

### Alternativa B — Manter `inbox/` como pasta exceção (escolhida)

`inbox/` permanece com a estrutura legada
`inbox/<area>/<subtipo>/<data>-<slug>.<ext>` + companion `.md` ao
lado do binário. Pasta dedicada à triagem; arquivos saem do `inbox/`
quando o usuário classifica (ação manual, futuro M-INBOX-TRIAGEM
descrito no roadmap), em direção ao destino canônico do ADR-0023.

Vantagem: preserva a semântica "triagem temporária" como conceito
isolado do Vault permanente. Audit de pendências continua trivial
(`ls inbox/financeiro/pix/`). Não força reescrita do `ShareReceiver`
nem do `path-resolver.ts`.

Desvantagem: cria exceção parcial ao ADR-0023, exigindo whitelist
explícita no boot hook para que arquivos do `inbox/financeiro/`,
`inbox/casa/`, `inbox/outros` **não** sejam tratados como legado a
migrar.

## Decisão

**Alternativa B.** `inbox/` é mantido como pasta exceção dedicada à
triagem temporária do Share Intent. Arquivos recebidos via "Compartilhar"
do Android continuam gravados em
`inbox/<area>/<subtipo>/YYYY-MM-DD-HHmmss[-slug].<ext>` + companion
`inbox/<area>/<subtipo>/YYYY-MM-DD-HHmmss[-slug].md`.

### Boot hook — whitelist explícita

`migrarVaultLayoutPorTipo` migra **apenas** os subpaths legados do
`inbox/` que são produzidos por features de domínio diário e não por
share intent:

- `inbox/saude/ciclo/` → `markdown/ciclo-*.md`
- `inbox/mente/diario/` → `markdown/diario-*.md`
- `inbox/_devices.md` → `markdown/_devices.md`

Os subpaths de share intent (`inbox/financeiro/{pix,extrato,nota}`,
`inbox/saude/{exame,receita}`, `inbox/casa/{garantia,contrato}`,
`inbox/outros`) **não são tocados** pelo boot hook. A whitelist é
hoje implícita (boot hook só opera em paths explicitamente listados),
mas esta ADR a torna explícita e testada por regressão em
`tests/lib/boot/migrarVaultLayoutPorTipo-inbox-whitelist.test.ts`.

### Convenção derivada

- Path canônico de share intent permanece resolvido por
  `src/lib/share/path-resolver.ts::resolverDestino`. Zero mudança
  no código de produção.
- Schema `src/lib/schemas/inbox_arquivo.ts` continua representando a
  metadata. Comentário inline aponta para esta ADR.
- `docs/FEATURES-CANONICAS.md` §2.7 substitui a nota "(legado pré-H2;
  sprint dedicada migra share intent para layout-por-tipo)" por
  referência a esta ADR-0024.

### Triagem futura (fora desta sprint)

Quando o usuário classificar um arquivo do `inbox/` como evento,
diário ou conquista, o fluxo de triagem (sprint dedicada futura,
ainda não planejada) é responsável por mover o `.md` (e o binário,
se aplicável) para o destino canônico do ADR-0023:

- Evento → `markdown/evento-<data>-<slug>.md` + binário em `<ext>/`.
- Diário → `markdown/diario-<data>-<HHmm>-<slug>.md`.
- Conquista (marco) → `markdown/marco-<data>-<slug>.md`.

Após triagem bem-sucedida, o arquivo original em `inbox/` é removido.
A semântica "inbox = pendente" fica preservada: presença em `inbox/`
implica triagem pendente; ausência implica classificado ou descartado.

## Consequências

### Positivas

- **Semântica clara**: `inbox/` representa fila de triagem temporária,
  separada do Vault permanente. Audit por estado é trivial.
- **Zero churn no código de produção**: `path-resolver.ts`,
  `ShareReceiver`, `app/share-receive.tsx` permanecem como estão.
  Implementação H2 (`migrarVaultLayoutPorTipo`) já era compatível por
  omissão; ADR formaliza a decisão.
- **Schema preservado**: `inbox_arquivo.ts` continua sendo a fonte de
  verdade; nenhum tipo precisa mudar.

### Negativas

- **Exceção ao princípio "tudo .md em `markdown/`"** do ADR-0023.
  Mitigada pela documentação explícita aqui e pela whitelist no boot
  hook coberta por teste de regressão.
- **Audit "todos os .md do Vault"** passa a exigir varrer
  `markdown/` + `inbox/**/*.md`. Aceito porque `inbox/` é finito por
  design (triagem temporária; arquivos saem de lá rapidamente).

### Mitigações

- Teste de regressão em
  `tests/lib/boot/migrarVaultLayoutPorTipo-inbox-whitelist.test.ts`
  cobre cenário: vault com `inbox/financeiro/pix/<arquivo>.md`,
  `inbox/casa/garantia/<arquivo>.md`, `inbox/outros/<arquivo>.md`
  → boot hook NÃO move nenhum desses para `markdown/`.
- Comentário inline em `src/lib/schemas/inbox_arquivo.ts` referencia
  esta ADR para que sprints futuras não confundam o esquema com o
  layout-por-tipo do ADR-0023.

## Referências

- ADR-0019 (Persistência canônica em `.md` individual no Vault).
- ADR-0023 (Vault organizado por tipo de arquivo) — supersedes parcial.
- Sprint G1 spec: `docs/sprints/M-SHARE-INTENT-LAYOUT-spec.md`.
- Boot hook: `src/lib/boot/migrarVaultLayoutPorTipo.ts`.
- Path resolver share intent: `src/lib/share/path-resolver.ts`.
- Schema metadata: `src/lib/schemas/inbox_arquivo.ts`.
- Tela 17 (`ShareReceiver`): `app/share-receive.tsx`.
- Auditoria origem: `docs/auditoria-2026-05-08/RELATORIO.md`.
