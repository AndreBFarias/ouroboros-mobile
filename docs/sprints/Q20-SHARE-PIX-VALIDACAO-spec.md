# Q20 — Share Intent Pix/boleto/extrato — validação runtime real

> **Tamanho:** Pequeno (2–4h)
> **Bloqueia v1.0.0?** Não. Candidata a alpha-5 ou direto v1.0.
> **Pré-requisitos:** Q10 (regex classifier) já entregue.

## Contexto

Q10 (commit `7d3332a`) entregou:
- `app.json intentFilters` aceitando `text/plain`, `text/html`,
  `application/octet-stream`.
- `src/lib/share/categorias.ts` com regex classifier de Pix
  (E2E ID), boleto (linha digitável), extrato (banco + saldo).
- Auto-rename `inbox/financeiro/<categoria>/YYYY-MM-DD-<valor>.<ext>`.
- Companion `.md` rico com `categoria/subcategoria/valor/data/contraparte`.

Falta **validar runtime real** no celular: o usuário compartilha um
recibo Pix de outro app (Nubank/Itaú/banco) → Ouroboros aparece no
menu "Compartilhar com..." → seleciona Ouroboros → arquivo salvo
corretamente em `inbox/financeiro/pix/` + companion gerado.

## Objetivo da sprint

Validar end-to-end o fluxo de share intent já implementado. Identificar
e corrigir bugs descobertos (ausência no menu Compartilhar, regex que
não bate Pix de banco X, classificador errôneo).

## Decisões técnicas firmes

- **Sem reescrita.** Apenas validação + fixes pontuais se necessário.
- **Bancos cobertos no teste:** Nubank, Itaú, Bradesco, Santander, Inter,
  C6 Bank (regex já configurada pra esses 6 nomes).
- **Tipo de arquivo testado:** PDF de recibo Pix, PNG de print, MP4 de
  vídeo (não financeiro — controle negativo).
- **Validação no disco** após cada share:
  ```bash
  adb shell run-as com.ouroboros.mobile find \
    /data/user/0/com.ouroboros.mobile/files/Ouroboros/inbox/financeiro/ \
    -type f
  ```

## Arquivos esperados (NENHUM novo)

Mudanças possíveis durante validação (caso seja necessário):
- `src/lib/share/categorias.ts` — ajuste de regex se algum banco
  específico falhar.
- `app.json` — adicionar mimeTypes faltantes se um app específico não
  conseguir abrir Ouroboros via share.

## Proof-of-work esperado

1. **Validar Ouroboros aparece em "Compartilhar via":**
   ```bash
   # Pre: APK alpha-4+ instalado.
   # Abrir Nubank → recibo Pix → Compartilhar
   adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png /tmp/s.png
   # Read /tmp/s.png — confirmar visualmente "Ouroboros" na grade
   ```

2. **Compartilhar recibo Pix Nubank:**
   ```bash
   # Tap Ouroboros no menu → app abre na tela /inbox-pendente
   # Confirma toast "Pix de R$ XX salvo em inbox/financeiro/pix/"
   adb shell run-as com.ouroboros.mobile ls \
     /data/user/0/com.ouroboros.mobile/files/Ouroboros/inbox/financeiro/pix/
   # Deve listar arquivo YYYY-MM-DD-<valor>.pdf
   adb shell run-as com.ouroboros.mobile cat \
     /data/user/0/com.ouroboros.mobile/files/Ouroboros/markdown/<companion-id>.md
   # Frontmatter rico:
   #   tipo: midia_documento
   #   categoria: financeiro
   #   subcategoria: pix
   #   valor: 234.56
   #   data_transacao: 2026-05-13
   #   contraparte: <nome do contraparte se detectado>
   ```

3. **Compartilhar boleto:**
   ```bash
   # Mesmo fluxo com PDF de boleto. Subcategoria deve ser 'boleto'.
   ```

4. **Compartilhar extrato:**
   ```bash
   # Mesmo fluxo com PDF de extrato Nubank.
   # Subcategoria deve ser 'extrato'.
   ```

5. **Controle negativo (vídeo aleatório):**
   ```bash
   # Compartilhar um MP4 de filme.
   # Deve cair em inbox/midia/ (não classificado como financeiro).
   ```

## Critérios de aceite

- [ ] Ouroboros listado em "Compartilhar via" do Nubank
- [ ] Ouroboros listado em "Compartilhar via" do Itaú
- [ ] Pix detectado e classificado em `inbox/financeiro/pix/`
- [ ] Boleto detectado e classificado em `inbox/financeiro/boleto/`
- [ ] Extrato detectado e classificado em `inbox/financeiro/extrato/`
- [ ] Companion `.md` tem `valor`, `data_transacao`, `categoria`,
      `subcategoria` corretos
- [ ] Não financeiro vai para `inbox/midia/` sem confundir
- [ ] Sprint marcada `[ok]` em ROADMAP

## Riscos identificados

| Risco | Mitigação |
|-------|-----------|
| Regex de Pix Nubank não bate Pix Itaú | Coletar 5 amostras reais de cada banco em pasta `tests/fixtures/pix-real/`, escrever teste unitário pra cada amostra |
| MIUI/HyperOS filtra apps no menu Compartilhar | Documentar workaround em ONDA-Q armadilha A38 (se reproduzir) |
| Permissão de leitura externa negada → arquivo vazio | Verificar app.json `READ_MEDIA_*` permissions |

## Anti-débito

Se regex falhar em algum banco específico, a fix sai como Q20.x
imediata (não fica "issue depois"). Listar em
`docs/auditoria-q20/COLATERAIS.md`.
