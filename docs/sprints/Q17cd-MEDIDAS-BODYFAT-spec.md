# Q17.c.d — Campo `gordura` em MedidasSchema + hook `escreverBodyFatEmHC`

> **Tamanho:** Pequeno (1h)
> **Bloqueia v1.0.0?** Não — extensão opcional do schema medidas.
> **Pré-requisitos:** Q17.c.b entregue (hook HC peso plugado em
> `escreverMedida`).

## Contexto

`src/lib/health/sync.ts` exporta `escreverBodyFatEmHC(percentage,
data)` desde Q17.b, mas `MedidasSchema` (`src/lib/schemas/medidas.ts`)
**não tem campo gordura corporal**. As 9 medidas canônicas atuais
são `peso`, `cintura`, `peito`, `braco_esq/dir`, `coxa_esq/dir`,
`barriga`, `quadril` — todas geométricas. Q17.c.b plugou apenas
`escreverPesoEmHC`; `escreverBodyFatEmHC` ficou órfão.

Pedido do dono é coerente: balança inteligente reporta peso +
gordura juntos via HC; faz sentido o app capturar ambos.

## Objetivo

1. Adicionar campo `gordura: MedidaNumerica.optional()` no `MedidasSchema`
   (`gordura` representa percentual 0..100, não medida geométrica).
2. UI da tela de novo medida (`app/medidas/novo.tsx`) ganha um campo
   adicional pra digitar gordura corporal (% body fat).
3. `escreverMedida` em `vault/medidas.ts` ganha branch best-effort
   chamando `escreverBodyFatEmHC(parsed.data.gordura, dataDate)`
   quando o toggle está ligado e o campo está definido.
4. Audit `MEDIDAS_CAMPOS`, `LABEL_POR_CAMPO`, `MEDIDA_UNIDADE_LABEL`
   pra incluir `gordura` (label "Gordura corporal", unidade "%").

## Decisões técnicas firmes

- **Tipo separado** pra gordura. O `MedidaNumerica` atual valida
  `0..500` (cobre kg, cm). Gordura % vai validar `0..100`. Vou criar
  `MedidaPercentual = z.number().min(0).max(100).optional()`.
- **Renderização separada na tela 12** porque a unidade ("%") difere
  do resto ("kg" ou "cm").
- **Best-effort HC.** Mesma garantia das outras escritas: falha em
  HC não bloqueia save local.
- **Retro-compat:** medidas antigas sem campo `gordura` parseiam OK
  (campo é `.optional()`).

## Arquivos a modificar

- `src/lib/schemas/medidas.ts`
  - Adicionar `MedidaPercentual` e campo `gordura`.
  - Incluir `gordura` em `MEDIDAS_CAMPOS` (ordem canônica).
  - Atualizar `LABEL_POR_CAMPO` / `MEDIDA_UNIDADE_LABEL`.
- `src/lib/vault/medidas.ts`
  - No `escreverMedida`, após o sync de peso, adicionar branch
    similar pra `escreverBodyFatEmHC` condicional ao toggle e ao
    campo presente.
- `app/medidas/novo.tsx`
  - Renderizar input adicional com unidade "%", validação 0..100,
    teclado numérico.
- `tests/lib/schemas/medidas.test.ts` (se existir; ver caminho)
  - 2 testes novos: aceita gordura optional, rejeita gordura > 100.

## Proof-of-work esperado

1. **Schema novo passa testes:**
   ```bash
   npx jest tests/lib/schemas/medidas.test.ts --silent
   # Esperado: testes existentes verdes + 2 novos cobrindo gordura.
   ```

2. **UI mostra campo:**
   ```bash
   # Menu → Saúde Física → Registrar medida
   # Preencher peso + gordura, salvar
   # Verificar no Vault: frontmatter contém `gordura: 18.5`
   ```

3. **HC recebe BodyFatRecord** (validação live celular):
   ```bash
   # Pré: HC conectado + toggle on + permission BodyFat concedida
   # Após save da medida, abrir HC nativo do Android
   # Esperado: leitura "Percentual de gordura corporal" visível
   ```

## Critérios de aceite

- [ ] `MedidasSchema.gordura` aceita 0..100 optional
- [ ] `MEDIDAS_CAMPOS` inclui `gordura` em ordem canônica
- [ ] Form `app/medidas/novo.tsx` mostra input "%" pra gordura
- [ ] `escreverMedida` dispara `escreverBodyFatEmHC` best-effort
- [ ] Contract MD §5.5 atualizado (medidas) — drift check verde
- [ ] Sprint `[ok]` em ROADMAP

## Anti-débito

Quando o app suportar fontes externas de gordura (e.g. balança Xiaomi
exportando via HC), abrir Q17.c.d.b cobrindo o reader inverso (HC →
Vault, espelhando `sincronizarPesoDeHC`).
