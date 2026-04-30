# ADR 0014 — Vault Mobile em Pasta Dedicada (`~/Protocolo-Ouroboros/`)

```
Status:     Aceito
Data:       2026-04-29
Sprint:     M03 + M00.docs (formaliza decisão tomada durante setup do Syncthing)
Supersedes: docs/CONTEXTO.md §4 referência original a `~/Controle de Bordo`
```

## Contexto

O `CONTEXTO.md` original especificava `~/Controle de Bordo/` como
Vault físico do app Mobile. Esse path era também o Vault humano de
Obsidian do dono do projeto, contendo notas pessoais, planos
financeiros, conceitos e centenas de arquivos `.md` editados a mão.

Ao configurar o Syncthing para parear desktop e celular durante a
M03, ficou claro que misturar o output do Mobile com as notas
humanas no mesmo diretório criava problemas concretos:

- Risco de Mobile sobrescrever ou deletar arquivo humano por bug.
- Backend `protocolo-ouroboros` precisaria filtrar arquivos para
  ignorar conteúdo humano.
- Conflitos do Syncthing entre 2 celulares e desktop ficariam
  difíceis de auditar (qual lado é a fonte de verdade pra cada
  arquivo?).
- Backup independente das duas fontes impossível.

## Decisão

O Vault físico do app Mobile passa a ser **`~/Protocolo-Ouroboros/`**,
uma pasta nova e dedicada exclusivamente ao app:

- Sincronizada via Syncthing entre desktop Pop!_OS e Android.
- Estrutura interna controlada pelo Mobile e pelo Backend.
- Vault humano do Obsidian permanece intocado em
  `~/Controle de Bordo/`.

## Estrutura canônica

```
~/Protocolo-Ouroboros/
├── daily/                    # humor diário
│   └── 2026-04-29.md
├── eventos/                  # eventos com lugar
│   └── 2026-04-29-cafe.md
├── inbox/
│   ├── financeiro/
│   │   ├── pix/              # share intent de PIX
│   │   ├── extrato/
│   │   ├── exame/
│   │   └── nota/
│   ├── mente/
│   │   ├── humor/            # alternativo a daily/
│   │   └── diario/           # diário emocional
│   └── saude/
│       └── ciclo/            # ciclo menstrual (M14.5, opt-in)
├── treinos/                  # sessões de treino
│   └── 2026-04-29-rotina-b.md
├── medidas/                  # medidas corporais
│   └── 2026-04-29.md
├── marcos/                   # timeline gentil
├── tarefas/                  # to-do leve (M17, opt-in)
├── alarmes/                  # alarmes pessoais (M16, opt-in)
├── contadores/               # dias sem X (M18, opt-in)
├── assets/                   # fotos, áudio, GIFs, capas
└── .ouroboros/
    └── cache/
        ├── humor-heatmap.json     # gerado pelo backend
        └── financas-cache.json    # gerado pelo backend
```

Mobile **nunca** toca em pastas fora dessa estrutura. Vault humano em
`~/Controle de Bordo/` continua sendo do usuário.

## Configuração do Syncthing

- **Pasta sincronizada**: `~/Protocolo-Ouroboros/` (apenas).
- **Tipo**: Send & Receive nos dois lados.
- **Versionamento**: Simple, 5 cópias por arquivo, 4 dias retidos.
- **Ignorar permissões**: Sim (Android não tem POSIX permissions).
- **Compressão**: desligada (LAN e arquivos pequenos).
- **Apresentador**: Sim (útil para parear terceiro device futuro).

## Identificadores reconhecidos

- Desktop Pop!_OS: `Nitro-5-Pop-OS` (`R3EEVHP`)
- Celular Android: `Note13-Andre` (`CKA4XYE`)

## Consequências

### Positivas

- **Isolamento**: Vault humano nunca corre risco de bug do Mobile.
- **Backup independente**: cada Vault tem ciclo de backup próprio.
- **Schema rígido**: backend pode validar estrutura sem se preocupar
  com arquivos humanos arbitrários.
- **Auditoria simples**: qualquer mudança em `~/Protocolo-Ouroboros/`
  veio do Mobile ou do Backend, ponto.

### Negativas

- **Migração necessária**: usuários existentes (a mãe deste projeto)
  precisam parear nova pasta no Syncthing. Documentado no
  `HOW_TO_RESUME.md` e na seção de instalação do `README.md`.
- **Spell-check do Obsidian**: notas em `~/Controle de Bordo/` não
  ganham resumos automáticos do Mobile. Trade-off aceito.

## Verificação

```bash
# No desktop
ls ~/Protocolo-Ouroboros/                    # estrutura canônica
ls ~/Controle\ de\ Bordo/                    # apenas conteúdo humano
diff <(ls ~/Protocolo-Ouroboros/) <(ls ~/Controle\ de\ Bordo/)
# espera: paths divergem completamente
```

## Referências

- Script de seed: `scripts/seed_vault_demo.sh` (cria estrutura)
- ADR predecessor: ADR-0001 (Vault em Markdown puro)
- ADR predecessor: ADR-0002 (Sync delegado ao Syncthing)
- `docs/CONTEXTO.md` §4 atualizado citando este ADR
