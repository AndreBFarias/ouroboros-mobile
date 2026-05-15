# AUDIT-T1B3-PICKERS-RESTANTES — Toast em todos os pickers silenciosos

> Sprint anti-débito do achado colateral T1 (2026-05-15).
> Severidade: MÉDIA — degrada UX mas não quebra função.

## 1. Objetivo

Aplicar o padrão de B3 (toast em permissão negada) nos 5 outros
pickers que ficaram fora do escopo de T1.

## 2. Entregáveis

Padrão a aplicar em cada um (similar ao `AvatarPicker.tsx:38–41`):

```tsx
if (!perm.granted) {
  toast.show('Sem permissão de <recurso>.', 'error');
  return;
}
```

Arquivos:

1. **`src/components/eventos/FotosBlock.tsx:38`** — toast "Sem
   permissão de galeria."
2. **`src/lib/eventos/localizacao.ts:30`** — toast "Sem permissão
   de localização."
3. **`src/components/midia/MidiaFotoTab.tsx:83`** — toast "Sem
   permissão de galeria." (escolha de galeria)
4. **`src/components/midia/MidiaFotoTab.tsx:103`** — toast "Sem
   permissão de câmera." (captura de câmera)
5. **`src/lib/midia/adicionarFotoManual.ts:76`** — caller já
   recebe `false`; verificar se o caller exibe toast; se não,
   adicionar lá.

## 3. OFF-LIMITS

Mesma lista de T1.

## 4. Procedimento

1. Importar `useToast` ou helper canônico em cada arquivo.
2. Adicionar toast antes do `return`.
3. Strings em PT-BR com acento completo.
4. 1 teste por arquivo cobrindo o caminho de permissão negada.

## 5. Verificação

```bash
./scripts/smoke.sh                 # >= 1962 testes (5 novos)
```

## 6. Commit

```
fix: t1b3-pickers toast em permissao negada em fotos localizacao midia
```

## 7. Decisões tomadas

- **Strings de toast em PT-BR com acento** (convenção UI).
- **Não criar helper centralizado**: 5 callsites são poucos;
  helper agregaria sem ganho real.
