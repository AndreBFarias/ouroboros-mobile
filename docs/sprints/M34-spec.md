# Sprint M34 — MenuCapturaVerde na tab Memórias (Foto/Música/Vídeo/Frase)

```
DEPENDE:    M27 (Memórias acessada via menu lateral); M33 (campo `para`)
BLOQUEIA:   M39 (mídia companion .md formaliza estrutura)
ESTIMATIVA: 6-7h
```

## 1. Objetivo

Adicionar à tab Memórias um FAB **verde** à direita inferior que abre
um menu pequeno com 4 ações de captura unificada: Foto, Música, Vídeo,
Frase. Cada captura salva binário no formato original em
`media/<categoria>/<data-rand>.<ext>` mais um `.md` companion (ADR-0017
formaliza em M39; aqui usamos formato preliminar).

## 2. Entregáveis

### Arquivos novos

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/chrome/MenuCapturaVerde.tsx`
  — FAB verde no canto inferior direito + sheet pequeno com 4 ações:
  ```tsx
  <FAB color={colors.green} icon={Plus} onPress={abrirMenu}
    style={{ position: 'absolute', right: spacing.lg, bottom: spacing.xl }} />
  <BottomSheet ref={sheetRef} snapPoints={SHEET_50} index={-1}>
    <MenuItem icone={Image}    label="Foto"   onPress={capturarFoto} />
    <MenuItem icone={Music}    label="Música" onPress={capturarMusica} />
    <MenuItem icone={Video}    label="Vídeo"  onPress={capturarVideo} />
    <MenuItem icone={MessageCircle} label="Frase" onPress={abrirFraseSheet} />
  </BottomSheet>
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/midia/SheetFrase.tsx`
  — sheet 50% com `<Textarea>` para frase + `<SeletorPara>` + botão
  Salvar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarFoto.ts`
  — wrapper `expo-image-picker` (camera+galeria) que salva em
  `media/fotos/` + cria `.md` companion preliminar.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarMusica.ts`
  — wrapper `expo-document-picker` (audio/*) que copia para
  `media/audios/` + `.md` companion.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/capturarVideo.ts`
  — wrapper `expo-image-picker` (mediaTypes vídeo) ou
  `expo-camera`-recorder; salva em `media/videos/` + `.md` companion.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/midia/salvarFrase.ts`
  — escreve só `.md` em `media/frases/<data>-<slug>.md`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/midia/capturarFoto.test.ts`,
  `capturarMusica.test.ts`, `capturarVideo.test.ts`,
  `salvarFrase.test.ts` — cada um cobre escrita binário + companion.

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasScreen.tsx`
  — adicionar `<MenuCapturaVerde />` ao final, sobreposto às tabs.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/hooks/useFotosAgregadas.ts`
  — atualizar para varrer também `media/fotos/`.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/components/screens/MemoriasFotosTab.tsx`
  — adicionar botão inline "Registrar foto" no empty state (atalho
  para `capturarFoto`).
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app.json`
  — verificar permissões `RECORD_AUDIO`, `CAMERA` (já presentes).
  Adicionar nada novo.

### Arquivos NÃO modificados

- M39 (sprint posterior) formaliza ADR-0017 e refatora estrutura
  companion. M34 implementa formato **preliminar** que M39 ratifica.

## 3. APIs reutilizáveis

- `expo-image-picker` — fotos + vídeos.
- `expo-document-picker` — música.
- `expo-file-system/legacy` — `copyAsync`.
- `<BottomSheet>`, `<Textarea>`, `<SeletorPara>`, `<FAB>` existentes.
- Helpers de path em `src/lib/vault/paths.ts` (M22 adicionou
  `mediaFotosPath`, etc.).

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Componente novo:** `MenuCapturaVerde` em `chrome/`.
- **Helpers de captura:** novo grupo `src/lib/midia/`.
- **Schemas:** sem schema novo (companion .md formaliza em M39).
- **Sem mudança em rotas / app.json (permissões já existem).**

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR ("Foto", "Música", "Vídeo",
  "Frase").
- TS strict.
- Companion .md preliminar contém apenas:
  ```yaml
  ---
  tipo: midia_<foto|audio|video|frase>
  arquivo: <basename>
  data: <iso>
  autor: <pessoa>
  para: <SeletorPara value>
  legenda: <opcional>
  ---
  ```
  M39 expande para formato canônico final (ADR-0017).
- Capturas não-bloqueantes: usuário pode cancelar a qualquer hora.
- Limite 6 fotos por sessão de captura (cap herdado de eventos).

## 5. Procedimento sugerido

1. Criar 4 helpers de captura em `src/lib/midia/`.
2. Criar `<SheetFrase>` para frase texto-livre.
3. Criar `<MenuCapturaVerde>` como FAB + sheet pequeno.
4. Plugar em `<MemoriasScreen>`.
5. Atualizar `useFotosAgregadas` para varrer `media/fotos/`.
6. Adicionar botão inline em `MemoriasFotosTab` empty state.
7. Testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m34-export && rm -rf /tmp/m34-export

# Manual emulador:
# 1. Memórias > FAB verde > Foto > câmera abre > tira foto
# 2. media/fotos/ tem .jpg + .md companion
# 3. Voltar para Memórias Fotos tab > foto aparece na galeria
```

## 7. Commit

```
feat: m34 menu captura verde memorias foto musica video frase
```

## 8. Checkpoint visual

5 screenshots Nível A em `docs/sprints/M34-screenshots/`:
- `A-fab-verde-memorias.png` — FAB verde direita.
- `A-menu-aberto.png` — sheet com 4 ações.
- `A-sheet-frase.png` — sheet de frase aberto.
- `A-foto-na-galeria.png` — foto recém-capturada na grid.
- `A-empty-state-com-botao.png` — empty state com "Registrar foto".

## 9. Decisões tomadas

- **Cor verde para captura adicional**: distinção visual do FAB
  purple (menu lateral / navegação) — o verde é dedicado a
  "registro de momento" sóbrio (foto/música/vídeo/frase).
- **FAB direito (não esquerdo)**: contraste com FAB purple esquerdo;
  evita conflito de gestos.
- **`media/frases/` apenas .md**: frase é texto puro, não há
  binário. Companion é o próprio arquivo.
- **Companion preliminar em M34, formal em M39**: M34 entrega UX;
  M39 ratifica formato. Ambas escrevem `.md` na mesma estrutura,
  M39 só estende campos opcionais (transcrição, duração, etc.).
- **Cap 6 fotos por sessão**: herdado de M07 (eventos com fotos).

Sprint pronta para execução sem perguntas pendentes.
