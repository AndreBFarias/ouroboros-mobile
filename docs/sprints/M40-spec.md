# Sprint M40 — Tela 01 Hoje v2: Recap + status do casal + próximos

```
DEPENDE:    M27 (menu lateral); M30 (alarmes); M31 (tarefas v2);
            M33 (campo `para`); M36 (Recap)
BLOQUEIA:   M41 (release final)
ESTIMATIVA: 4-5h
```

## 1. Objetivo

Reorganizar a Tela 01 (`/`) para ser denser e mais útil: header com
botão "Recap", status do casal (2 cards lado a lado se duo), próximos
alarmes/tarefas com hora, e seções existentes de humor/diário/eventos
agrupadas por hora.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/index.tsx`
  — reescrever:
  ```tsx
  return (
    <Screen>
      <Header
        title="Hoje"
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            {tipoCompanhia === 'sozinho' ? (
              <PersonAvatar pessoa={pessoaAtiva} ... />
            ) : (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <PersonAvatar pessoa="pessoa_a" size="sm" ... />
                <PersonAvatar pessoa="pessoa_b" size="sm" ... />
              </View>
            )}
            <Button label="Recap" variant="ghost"
              onPress={() => router.push('/recap')} />
          </View>
        }
      />
      <ScrollView ...>
        {!ehSozinho ? <SecaoStatusCasal /> : null}
        <SecaoProximos />              {/* M30 alarmes + M31 tarefas hoje */}
        <SecaoHumor humor={humor} ... />
        <SecaoDiariosEventosAgrupado diarios={diarios} eventos={eventos} ... />
        {__DEV__ ? (
          <Button variant="ghost" onPress={onComponentsPress}
            label="Ver storybook de componentes" />
        ) : null}
      </ScrollView>
    </Screen>
  );
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SecaoStatusCasal.tsx`
  — novo componente:
  ```tsx
  // 2 cards lado a lado:
  // [Foto André] André   |   [Foto Vitória] Vitória
  // Humor 4/5            |   Humor — (vazio)
  // Última: 14:30 evento |   Última: 09:15 humor
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SecaoProximos.tsx`
  — novo componente: lê `listarAlarmes(vaultRoot)` filtrando próximas
  4h + `listarTarefas` filtrando alarme hoje. Mostra lista compacta
  com hora à esquerda + título.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/SecaoDiariosEventosAgrupado.tsx`
  — substitui as duas seções separadas (atual SecaoDiarios +
  SecaoEventos) por uma cronológica única, agrupando por hora desc.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useStatusCasal.ts`
  — hook que dado vaultRoot retorna `{ pessoaA: StatusPessoa,
  pessoaB: StatusPessoa | null }` com último humor + última
  atividade.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useProximos.ts`
  — hook agrega alarmes próximos + tarefas com alarme hoje.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/index.test.tsx`
  — atualizar (criar): render por modo (sozinho vs duo).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/screens/SecaoStatusCasal.test.tsx`
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/components/screens/SecaoProximos.test.tsx`

### Arquivos NÃO modificados

- `app/_layout.tsx` (M27 já estabilizou).
- `<FABMenu>` (já é overlay global).

## 3. APIs reutilizáveis

- `useHoje` (existente) — fonte de humor/diários/eventos.
- `useRotuloPessoa` (M28).
- `nomeDe` em `usePessoa`.
- `listarAlarmes`, `listarTarefas` (existentes; M31 expande tarefa
  com alarme).
- `<PersonAvatar>`, `<Button variant="ghost">`, `<Card>`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Sem mudança em rotas, schemas, stores.**
- Reorganização interna da Tela 01 + 2 hooks novos + 3 sub-componentes
  novos.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais hardcoded. Nomes via
  `nomeDe`.
- **ADR-0005 (sem gamificação)**: status do casal mostra dados, não
  julga. Sem comparativo "André está melhor que Vitória".
- Sentence case + acentuação PT-BR.
- TS strict.
- Storybook button só aparece em `__DEV__`.
- Sem regressão dos testes da Tela 01 atual.

## 5. Procedimento sugerido

1. Criar `useStatusCasal` hook (lê último humor de cada pessoa).
2. Criar `useProximos` hook (agrega alarmes 4h + tarefas hoje).
3. Criar 3 sub-componentes (`SecaoStatusCasal`, `SecaoProximos`,
   `SecaoDiariosEventosAgrupado`).
4. Reescrever `app/index.tsx` consumindo tudo.
5. Adicionar botão Recap no header.
6. Gate `__DEV__` no botão storybook.
7. Atualizar testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m40-export && rm -rf /tmp/m40-export

# Manual:
# 1. Sozinho: header só com 1 avatar + botão Recap; sem SecaoStatusCasal
# 2. Duo: 2 avatares pequenos + Recap; SecaoStatusCasal visível
# 3. Tap Recap: navega para /recap
# 4. Próximos alarmes/tarefas hoje aparecem ordenados por hora
```

## 7. Commit

```
feat: m40 home v2 status casal proximos recap header agrupado
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M40-screenshots/`:
- `A-home-sozinho.png` — Tela 01 modo sozinho, 1 avatar + Recap.
- `A-home-duo.png` — Tela 01 modo duo, 2 avatares + status casal.
- `A-home-com-proximos.png` — seção Próximos preenchida com alarmes.

## 9. Decisões tomadas

- **2 avatares pequenos no header** (vs 1 grande): visualiza o casal
  sem ocupar muito espaço. Tap em qualquer avatar abre menu de
  pessoa ativa.
- **Status do casal sem julgamento**: mostra dados (humor, última
  atividade), não compara nem premia.
- **Seção "Próximos" agrega 2 fontes**: alarmes nas próximas 4h +
  tarefas com alarme hoje. Ordenação cronológica.
- **Diários + Eventos agrupados**: timeline única ordenada por hora
  (substitui 2 listas separadas). Cor de borda diferencia
  trigger/vitória/positivo/negativo.
- **`__DEV__` no botão storybook**: usuário final não vê.

Sprint pronta para execução sem perguntas pendentes.
