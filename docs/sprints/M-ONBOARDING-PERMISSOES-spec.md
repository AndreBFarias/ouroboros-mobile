# Sprint J1 — M-ONBOARDING-PERMISSOES

```
DEPENDE:    H3 (escolha de pasta no onboarding já em fluxo similar)
BLOQUEIA:   I-FOTO, I-VIDEO, I-AUDIO, I-SCANNER, I-CICLO (sexoDeclarado)
ESTIMATIVA: ~3h
STATUS:     [todo]
```

## §1 Achado

Onboarding atual pede **apenas storage**. Câmera, microfone, notificações,
location e sexoDeclarado (para inferência ciclo) ficam para on-demand
ou nunca. UX ruim: usuário nega no momento da feature sem entender contexto.

## §2 Tarefa concreta

1. **Adicionar campo `sexoDeclarado`** em `useOnboarding`:

   ```ts
   interface OnboardingPessoa {
     nome: string;
     foto: string | null;
     sexoDeclarado: 'masculino' | 'feminino' | 'nao-binario' | 'prefiro-nao-dizer' | null;
   }
   ```

   Pergunta no Frame 1 (após escolher casal/amigos/sozinho): seletor
   de sexo para pessoa_a (sempre) e pessoa_b (se duo).

2. **Adicionar campo `permissoes`** em `useOnboarding`:

   ```ts
   interface PermissoesOnboarding {
     storage: boolean;       // sempre obrigatório
     camera: boolean;        // default ON
     microfone: boolean;     // default ON
     notificacoes: boolean;  // default ON
     localizacao: boolean;   // default OFF
   }
   ```

3. **Inserir Frame 2.5** em `app/onboarding.tsx` (entre "tudo pronto"
   e `handleConcluir`):

   ```
   Heading: Permissões
   Sub: Para a melhor experiência, libere o acesso a:

   [Toggle ON]  Câmera         "Para tirar fotos e escanear documentos"
   [Toggle ON]  Microfone      "Para gravar áudios no diário"
   [Toggle ON]  Notificações   "Para alarmes e lembretes"
   [Toggle OFF] Localização    "Para detectar bairro nos eventos"

   [Botão "Continuar"]
   ```

4. **Lógica do "Continuar"**:
   - Para cada toggle ON, chamar `requestPermissions` correspondente
     na ordem (câmera → mic → notif → location).
   - Persistir resultado em `useOnboarding.permissoes` (`true` se
     concedida, `false` se negada).
   - Frame final mostra resumo: "X permissões concedidas".

5. **Criar `app/settings/permissoes.tsx`**:
   - Lista status atual (concedida/negada/não-pedida).
   - Botão "Abrir configurações do sistema" para cada negada.
   - Plug em `app/settings/index.tsx` via `<LinkSubTela>`.

6. **Tests**:
   - `tests/lib/stores/onboarding.test.ts` — adicionar cases para
     `sexoDeclarado` e `permissoes`.
   - `tests/app/onboarding.test.tsx` — Frame 2.5 renderiza, toggles
     funcionam, "Continuar" chama requests.

7. **E2E**: `tests/e2e/playwright/m-onboarding-permissoes.e2e.ts` —
   Gauntlet web mocka cada `requestPermission` retornando granted.

## §3 Restrições

- Anonimato Regra −1.
- PT-BR sentence case + acentuação completa nas explicações de cada
  permissão.
- TS strict.
- Reatividade: trocar permissão em settings atualiza
  `useOnboarding.permissoes`.
- Comentários sem acento.

## §4 Verificação

```bash
npm test --silent -- --testPathPattern="(onboarding|permissoes)"
./scripts/smoke.sh
```

## §5 Validação Gauntlet OU adb

**Gauntlet** (Nível A): mock `requestPermissions` retorna granted.
PNGs:
- `A-onboarding-permissoes-frame.png` (5 cards visíveis)
- `A-onboarding-permissoes-resumo.png` (resumo final)
- `A-settings-permissoes.png` (sub-tela settings)

**adb** (validação humana obrigatória — request real):

```bash
adb shell pm clear com.ouroboros.mobile
adb shell am start -n com.ouroboros.mobile/.MainActivity
# Avançar onboarding até Frame 2.5.
# Tap "Continuar" — sistema pede 4 permissões em sequência.
# Conceder todas.
adb shell dumpsys package com.ouroboros.mobile | grep -E "CAMERA|RECORD_AUDIO|POST_NOTIFICATIONS|ACCESS_FINE_LOCATION" | head -10
# Esperado: 4 permissões com 'granted=true'.
```

## §6 Commit

```
feat: j1 onboarding-permissoes 5 cards + sexoDeclarado + settings sub-tela
```

## §7 Decisões

- **5 cards (storage + 4)**: storage já está implícito em H3 (escolha
  de pasta), os outros 4 são opt-in com defaults sensatos.
- **Localização default OFF**: feature optativa, evita request
  desnecessário.
- **Resumo final** em vez de redirect cego: usuário sabe o que ficou.
- **Settings sub-tela**: usuário pode trocar depois sem reinstalar.
