# Sprint M-FIELD-TEST — 7 dias de uso real (humano-only)

```
DEPENDE:    Bloco A + Bloco B + Bloco C completos
BLOQUEIA:   M41 (release v1.0.0)
ESTIMATIVA: 7 dias de calendário (não horas ativas)
PRIORIDADE: bloqueante absoluto antes de release
```

## 1. Achado / motivação

Smoke testa unidades (Jest). Gauntlet testa estrutura visual em
web mock. **Nenhum dos dois testa a EXPERIÊNCIA REAL** de:
- Abrir o app de manhã ao acordar.
- Registrar humor com 1 mão segurando café.
- Tocar enquanto anda.
- Esquecer de registrar e ver como o app reage no dia seguinte.
- Syncthing rodando entre 2 devices reais.
- Bateria, performance, jank em scroll longo.

Sem esse teste, release tem **risco alto de bugs reais escaparem**.

## 2. Objetivo

Plano estruturado de 7 dias de uso real pelo dono do projeto, com
checklist diário em formato curto e log de bugs/desconfortos.

## 3. Entregáveis

### Plano de uso

`docs/field-test-2026-05-XX/PLANO.md` — checklist diário:

```
DIA 1 (segunda):
- [ ] Abrir app ao acordar.
- [ ] Registrar humor matinal.
- [ ] Anotar diário emocional pelo menos 1x.
- [ ] Tirar 1 foto via captura unificada.
- [ ] Notar tempo de boot.
- [ ] Notar qualquer crash, jank, freeze.

DIA 2 (terça):
- [ ] Confirmar sync Syncthing entre 2 devices.
- [ ] Adicionar marco manual.
- [ ] Registrar medida.
- [ ] Notar bugs de cor / contraste em luz natural.

DIA 3-7: continuar uso natural + checklist focado por dia.
```

### Log de bugs

`docs/field-test-2026-05-XX/BUGS.md` — formato:
```
[BUG-N] Severity: alta/média/baixa
Tela: /memoria
Passos: ...
Esperado: ...
Atual: ...
Sub-sprint: M-FIELD-FIX-NN (criada/já criada)
```

### Sprints corretivas geradas

Cada bug crítico vira sub-sprint `M-FIELD-FIX-NN` com spec própria.
Sub-sprints com priority alta entram entre M-FIELD-TEST e M41.

### Veredito final

`docs/field-test-2026-05-XX/VEREDITO.md`:
- (a) APROVADO — pode rodar M41.
- (b) APROVADO COM RESSALVAS — M41 com lista de débitos para v1.0.1.
- (c) REPROVADO — bugs críticos exigem nova sprint maratona antes de M41.

## 4. Verificação

- 7 dias ininterruptos de uso real.
- Mínimo 1 entrada de checklist por dia.
- Todos bugs documentados em formato BUG-N.
- Veredito formal escrito antes de M41 começar.

## 5. Decisões tomadas

- **Bloqueante absoluto**: M41 não inicia sem veredito (a) ou (b).
- **Humano-only**: agente não pode dispatchar isso. Maestro só
  ajuda a documentar bugs encontrados pelo dono.
- **7 dias mínimos**: período menor não captura padrões de uso
  semanais (segunda matinal vs domingo noite).
- **2 devices em uso real** se Syncthing for testado: telefone
  do dono + telefone do outro (casal).
