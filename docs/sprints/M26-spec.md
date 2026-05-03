# Sprint M26 — Refatorar 4 rotas modais com Screen opaco e index=0 direto

```
DEPENDE:    M25 (OuroborosLoader disponível para fundo opcional)
BLOQUEIA:   M27 (menu lateral espera rotas modais funcionando)
ESTIMATIVA: 3h
```

## 1. Objetivo

Eliminar a "tela infinita preta" relatada pelo usuário ao abrir
captura (humor-rapido, diario-emocional, eventos, scanner). Hoje cada
rota renderiza apenas `<BottomSheet index={-1}>` sem nada por trás;
quando o `expand()` falha (Armadilha A17 — bottom-sheet + Reanimated
4 + React 19), o usuário vê só backdrop preto. Solução: envolver cada
rota em `<Screen padded={false}>` opaco e abrir o sheet com
`index={0}` direto (sem `useEffect` + expand).

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/humor-rapido.tsx`
  — envolver `<BottomSheet>` em `<Screen padded={false}>`. Trocar
  `index={-1}` + `useEffect expand()` por `index={0}` direto. Atrás
  do sheet renderizar `<OuroborosLoader compacto />` centralizado
  como conteúdo de fundo.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/diario-emocional.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/eventos.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/scanner.tsx`
  — já usa `<Screen>` no nível externo, mas precisa garantir que se
  o ScannerSheet falhar internamente, fundo continua opaco. Auditar
  e ajustar se necessário.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/_layout.tsx`
  — registrar 4 rotas com:
  ```tsx
  <Stack.Screen
    name="humor-rapido"
    options={{
      presentation: 'transparentModal',
      contentStyle: { backgroundColor: '#14151a' },
      animation: 'fade_from_bottom',
    }}
  />
  ```
  Fazer mesmo para `diario-emocional`, `eventos`, `scanner`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/humor-rapido.test.tsx`
  — adicionar teste: render contém `<Screen>` E `<BottomSheet>`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/diario-emocional.test.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/app/eventos.test.tsx`
  — idem.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/VALIDATOR_BRIEF.md`
  — § 4 ganha entrada A18:
  > **A18.** `<BottomSheet>` raiz sem `<Screen>` por trás cria
  > "tela infinita preta" quando `expand()` falha (Armadilha A17
  > recorre). Sempre envolver rota modal em `<Screen padded={false}>`
  > + `index={0}` direto (não `-1` + useEffect).

### Arquivos NÃO modificados

- `src/components/ui/BottomSheet.tsx` — wrapper continua igual.
- `src/components/screens/ScannerSheet.tsx` — só auditoria, sem mudança.

## 3. APIs reutilizáveis

- `<Screen padded={false}>` em `src/components/ui/Screen.tsx`.
- `<BottomSheet>` em `src/components/ui/BottomSheet.tsx`.
- `<OuroborosLoader compacto />` (M25).
- `useRouter` para fechar via `onChange={idx => idx===-1 && router.back()}`.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Rotas modais raiz:** seção 1.1 — 4 rotas com `presentation:
  'transparentModal'` + `contentStyle.backgroundColor` em
  `app/_layout.tsx`.
- **VALIDATOR_BRIEF Armadilhas:** seção 1.4 — adicionar A18.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR.
- TS strict.
- **Não trocar** o snap point default das 4 telas (continuam SHEET_70
  / SHEET_60 etc. existentes).
- Loader compacto atrás é puramente visual (não absorve toque) —
  envolver em `<View pointerEvents="none">`.
- Se sheet inicia em `index={0}`, o pan-down-to-close continua
  funcionando para fechar.

## 5. Procedimento sugerido

1. Editar `app/humor-rapido.tsx`:
   ```tsx
   return (
     <Screen padded={false}>
       <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
         <OuroborosLoader compacto />
       </View>
       <BottomSheet
         ref={sheetRef}
         snapPoints={SHEET_70}
         index={0}
         enablePanDownToClose
         onChange={(idx) => { if (idx === -1) router.back(); }}
       >
         {/* ScrollView + form (igual ao atual) */}
       </BottomSheet>
     </Screen>
   );
   ```
2. Repetir para `diario-emocional.tsx`, `eventos.tsx`.
3. Auditar `scanner.tsx` — se já tem `<Screen>` envolvendo, só
   garantir que `<ScannerSheet>` não crashe deixando fundo preto.
4. Editar `app/_layout.tsx`: adicionar 4 `<Stack.Screen>` com
   `presentation: 'transparentModal'`.
5. Atualizar `VALIDATOR_BRIEF.md` § 4 com A18.
6. Atualizar testes para cobrir presença de `<Screen>` + `<BottomSheet>`.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m26-export && rm -rf /tmp/m26-export

# Manual web:
./run.sh --web
# Navegar para humor-rapido, diario-emocional, eventos, scanner.
# Cada uma: fundo Dracula visivel se sheet falhar; sheet abre na primeira tentativa.
```

## 7. Commit

```
fix: m26 sheets de captura com screen opaco e index zero direto
```

## 8. Checkpoint visual

4 screenshots Nível A em `docs/sprints/M26-screenshots/`:
- `A-humor-sheet-opaco.png`
- `A-diario-sheet-opaco.png`
- `A-eventos-sheet-opaco.png`
- `A-scanner-sheet-opaco.png`

Cada um mostrando fundo Dracula com OuroborosLoader visível atrás do
sheet (intencional — feedback visual mesmo se sheet falhar).

## 9. Decisões tomadas

- **`presentation: 'transparentModal'`**: garante que o root Stack
  fundo (#282a36) não vaze; `contentStyle.backgroundColor` força
  bg-page (#14151a) opaco.
- **`index={0}` direto vs `-1` + expand**: elimina Armadilha A17
  (race entre montagem e useEffect). Sheet abre no momento exato
  que rota monta.
- **OuroborosLoader atrás do sheet**: feedback visual de marca; se
  Reanimated falhar (hipotético), usuário vê pelo menos o logo.
- **Não tocar nos schemas / handlers**: M26 é puramente UX/render.
- **Eventos e Scanner herdam mesma decisão**: consistência.

Sprint pronta para execução sem perguntas pendentes.
