# AUDIT-P4-3-FEATURES-CANONICAS-SYNC — reconciliar FEATURES-CANONICAS.md com o estado real de HC, Spotify, YouTube e Drive

```
STATUS:     materializada 2026-07-28 (achado da auditoria de 2026-07-28)
PRIORIDADE: média (documento declarado fonte de verdade única pelo
            arquivo de regras da raiz; leitor que confie nele decide
            errado)
DEPENDE:    nenhuma
ORIGEM:     achado [P4-3]/[IN-06] da auditoria de 2026-07-28. Confirmado
            nesta materialização lendo docs/FEATURES-CANONICAS.md linhas
            368-497 e src/components/screens/IntegracoesScreen.tsx
            linhas 1-30 e 495-625, e conferindo a ausência do pacote
            react-native-health-connect em node_modules/ e package.json.
```

## Problema (documento fonte-de-verdade desatualizado em pelo menos duas seções)

`docs/FEATURES-CANONICAS.md` se declara explicitamente (linha 3-4)
"Mapa funcional consolidado do projeto. Fonte de verdade única sobre o
que o app faz." O arquivo de regras da raiz reforça: toda sprint que introduz,
modifica ou remove feature deve atualizar este arquivo no mesmo commit,
e o validador recusa sprint sem essa atualização. Duas seções ficaram
para trás.

**Seção 3.7 (linha 373) — pacote de Health Connect removido:**

```md
### 3.7 Integração Health Connect Android — Q17 (Onda Q, 2026-05-13)
...
- Pacote: `react-native-health-connect@^3.5.0` via Expo Config Plugin.
```

Confirmado que este pacote não existe mais no projeto:

```bash
$ ls node_modules/react-native-health-connect
No such file or directory
$ grep -n "react-native-health-connect" package.json app.json
# 0 ocorrencias
$ grep -n "connect-client" modules/health-connect/android/build.gradle
59:  implementation "androidx.health.connect:connect-client:1.1.0"
```

O projeto hoje usa uma **bridge nativa Kotlin própria**
(`modules/health-connect/`, dependência
`androidx.health.connect:connect-client:1.1.0`, plugin
`modules/health-connect/app.plugin.js`), não o pacote npm de terceiros
citado no documento.

**Seção 3.8 (linhas 484-489) — Spotify/YouTube/Drive descritos como
placeholder quando já tem estado real:**

```md
### 3.8 Hub de Integrações — R-INT-1 (2026-05-16)
...
  - **Spotify** (R-INT-4 futura) — placeholder, badge "Em breve",
    desabilitado.
  - **YouTube** (R-INT-4 futura) — placeholder, badge "Em breve",
    desabilitado.
  - **Google Drive** (futura) — placeholder, badge "Em breve",
    desabilitado.
```

Isso descreve um estado que já mudou duas vezes: R-INT-4 (datada
2026-05-17 nos comentários do próprio código) entregou OAuth PKCE real
para Spotify e YouTube, e R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO fez o mesmo
para Drive. `IntegracoesScreen.tsx:520-625` mostra os três descritores
computando `estado: 'conectado'` ou `'desconectado'` a partir do estado
real das contas (não mais um `estado: 'em_breve'` fixo):

```tsx
// IntegracoesScreen.tsx:574-582 -- o proprio comentario admite a mudanca
// R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO: Drive deixa de ser placeholder. O
// upload reusa o OAuth Google (mesmo store do Calendar) + o ZIP de
// backup local. Estado:
//   - sem conta Google -> desconectado (conectar em /settings/contas-google).
//   - com conta Google  -> conectado; statusTexto reflete o toggle de
//     backup automatico (default OFF).
```

Curiosamente, o **próprio `IntegracoesScreen.tsx`** tem o mesmo tipo de
drift em miniatura: seu comentário de cabeçalho (linhas 18, 22, 25)
ainda descreve "Google Drive (placeholder) -- futura, 'Em breve'" e
"badge 'Em breve' para placeholders", desatualizado em relação ao
próprio corpo do arquivo, que 550 linhas abaixo já implementa o estado
real. Ou seja, o drift documental não é exclusivo do
`FEATURES-CANONICAS.md` — é um padrão recorrente de comentário que não
acompanha o código.

Confirmadas nesta auditoria pelo menos três mudanças de comportamento
que alteraram a realidade sem atualizar `FEATURES-CANONICAS.md`: a
substituição do pacote de Health Connect pela bridge própria, R-INT-4
(Spotify/YouTube OAuth) e R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (Drive).

Nota de precisão: mesmo após esta sprint corrigir o texto, o card de
Spotify/YouTube no Hub ainda navega para a mesma tela de detalhe de
Health Connect (não existe rota dedicada `/settings/spotify` nem
`/settings/youtube`) — esse é um achado funcional separado (fora do
escopo documental desta sprint), não inventar aqui que a integração
está 100% completa.

## Escopo (mínimo)

1. Atualizar a seção 3.7 (linha 373): substituir a referência ao pacote
   npm de terceiros por descrição da bridge nativa própria
   (`modules/health-connect/`, Kotlin,
   `androidx.health.connect:connect-client:1.1.0`, plugin
   `modules/health-connect/app.plugin.js`).
2. Atualizar a seção 3.8 (linhas 484-489): trocar a descrição
   "placeholder, badge Em breve, desabilitado" pelo estado real —
   Spotify e YouTube com OAuth PKCE entregue (R-INT-4), cards mostrando
   conectado/desconectado, mas sem rota de conexão dedicada ainda
   (mencionar essa limitação real, sem inflar o que falta); Google
   Drive com backup manual funcional ("Fazer agora"/"Restaurar", R-INT-5).
3. Corrigir também o comentário de cabeçalho de
   `src/components/screens/IntegracoesScreen.tsx` (linhas 18, 22, 25),
   já que ele expõe o mesmo tipo de drift em miniatura e será lido por
   quem for editar a tela no futuro.
4. Adicionar ao topo do `FEATURES-CANONICAS.md` um bloco de changelog
   no mesmo padrão já usado no arquivo (ex.: linhas 6-9, "R-AUDIT-CI-GATES
   (2026-07-11) — sem mudança de feature"), registrando esta
   reconciliação datada 2026-07-28.
5. Propor (sem implementar nesta sprint) um mecanismo preventivo leve:
   um check que, ao detectar diff em `src/lib/integracoes/**` ou
   `modules/health-connect/**` sem diff correspondente em
   `docs/FEATURES-CANONICAS.md` no mesmo PR, emita aviso — cuidado
   para não repetir o defeito já catalogado do
   `check_roadmap_fantasmas.py` (sai com exit code que o `smoke.sh`
   engole silenciosamente): o script precisa sair com código correto e
   ser chamado dentro de um `if` com `else` explícito.
6. NÃO-objetivo: não alterar o código de `IntegracoesScreen.tsx` além
   do comentário do item 3; não finalizar o wiring de conexão de
   Spotify/YouTube (achado funcional separado); não implementar o
   script de checagem preventiva do item 5 nesta sprint (fica como
   proposta para sprint futura com ID próprio).

## Proof-of-work

```bash
grep -n "react-native-health-connect" docs/FEATURES-CANONICAS.md   # 0 ocorrencias
grep -n "connect-client" docs/FEATURES-CANONICAS.md                 # >=1 ocorrencia
grep -n "Em breve" docs/FEATURES-CANONICAS.md                       # spotify/youtube/drive nao aparecem mais como tal
git diff docs/FEATURES-CANONICAS.md                                 # revisao humana do diff antes de commitar
./scripts/smoke.sh                                                  # verde (script valida presenca de atualizacao do arquivo)
```

Sprint documental, sem código de UI tocado — dispensa caso E2E novo.

## Commit

```
docs: audit-p4-3-features-canonicas-sync reconcilia hc bridge nativa e estado real de spotify youtube drive
```
