# Sprint M29 — Settings v2: vibração simples + features default ON + sync removido

```
DEPENDE:    M28 (nomes reais consolidados)
BLOQUEIA:   M30 (alarmes consomem novo shape de vibração)
ESTIMATIVA: 4h
```

## 1. Objetivo

Refatorar `useSettings` para shape v2: 3 toggles de vibração + 1
mestre, remover seção `lembretes` (vira parte de Alarmes em M30),
remover seleção de método sync e qualidade scanner (sempre máxima).
Defaults de `featureToggles` viram **todos true** para o app não
nascer vazio.

## 2. Entregáveis

### Arquivos modificados

- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/stores/settings.ts`
  — shape v2, chave nova `ouroboros.settings.v2`. Migração one-shot
  do v1 (lê valor antigo se existir, mapeia conservador, salva v2):
  ```ts
  interface SettingsState {
    somVibracao: {
      geral: boolean;       // default true (mestre)
      despertar: boolean;   // default true (alarmes)
      conquista: boolean;   // default true (vitorias)
      botoes: boolean;      // default true (humor/fab/trigger)
    };
    pessoa: { ... };        // mantido
    featureToggles: {
      cicloMenstrual: boolean;        // default TRUE
      alarmePessoal: boolean;         // default TRUE
      todoLeve: boolean;              // default TRUE
      contadorDiasSem: boolean;       // default TRUE
      calendarioConquistas: boolean;  // default TRUE
      widgetHomescreen: boolean;      // default TRUE
      widgetMostraNome: boolean;      // default false (privacidade)
    };
    privacidade: { ... };   // mantido
    midia: { ... };         // mantido
    // REMOVIDOS:
    //   lembretes (M30 absorve em alarmes pré-cadastrados)
    //   sync (sempre Syncthing-ready implicitamente)
    //   sync.qualidadeScanner (sempre maxima)
    setSomVibracao, setPessoa, setFeatureToggle, setPrivacidade, setMidia, resetar
    // REMOVIDOS: setSync, setLembrete (não mais existentes)
  }
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/src/lib/haptics.ts`
  — refatorar contextuais:
  ```ts
  function tomVibracaoLigado(chave: 'despertar' | 'conquista' | 'botoes'): boolean {
    const sv = useSettings.getState().somVibracao;
    if (!sv.geral) return false;  // mestre off => tudo off
    return sv[chave];
  }
  haptics.humor   = botoes
  haptics.vitoria = conquista
  haptics.trigger = botoes
  haptics.fab     = botoes
  haptics.alarme  = despertar
  ```
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/app/settings/index.tsx`
  — reescrever:
  - Remove `<SecaoLembretes>`, `<SecaoSync>`, `<SelectorQualidade>`.
  - `<SecaoSomVibracao>`: 4 toggles (geral, despertar, conquista,
    botoes). Quando `geral` é off, demais 3 ficam disabled e cinza.
  - `<SecaoFeatures>`: reordenada (Tarefas / Alarmes / Contadores /
    Ciclo / Calendário / Widget).
  - Adiciona `<LinkSubTela>` "Reinicializar pasta do Vault" que chama
    `inicializarVaultCanonico()` + toast "Pasta verificada.".
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/stores/settings.test.ts`
  — atualizar: shape v2, defaults true, migração v1→v2.
- `/home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/tests/lib/haptics.test.ts`
  — atualizar mapeamento.

### Arquivos NÃO modificados

- `src/lib/services/notificacoesLembretes.ts` — sprint M30 deprecia
  totalmente (lembretes viram alarmes). Por ora, hook continua
  existindo mas não é mais consumido pela UI.
- `src/components/screens/MiniFinanceiroScreen.tsx` — M35 trata.

## 3. APIs reutilizáveis

- `secureStorage` adapter para persistência v2.
- Migração: `persist({ migrate: (state, version) => ..., version: 2 })`
  do zustand.

## 3.5 Integração ao projeto

Conforme `docs/sprints/INTEGRATION-CONTRACT.md`:

- **Stores:** `useSettings` shape v2 (revisão maior). Atualizar
  CONTRACT seção 1.5 com novo shape.
- **Sprints opt-in:** continuam consumindo `featureToggles[chave]`,
  mas agora todas estão `true` por default. Sem mudança de API.

## 4. Restrições

- **Regra −1**: zero IA, zero nomes reais.
- Sentence case + acentuação PT-BR.
- TS strict.
- **Migração v1→v2 não pode crashar** se SecureStore tiver dados v1
  parciais. Função `migrate` retorna estado v2 válido sempre,
  preenchendo defaults.
- Não tocar em `pessoa.tipoCompanhia` ou `pessoa.vaultCompartilhado`
  (continuam relevantes).

## 5. Procedimento sugerido

1. Criar nova versão de `useSettings`:
   ```ts
   const DEFAULT_STATE_V2 = {
     somVibracao: { geral: true, despertar: true, conquista: true, botoes: true },
     pessoa: { ativa: 'pessoa_a', vaultCompartilhado: true, tipoCompanhia: 'sozinho' },
     featureToggles: { cicloMenstrual: true, alarmePessoal: true, todoLeve: true,
       contadorDiasSem: true, calendarioConquistas: true,
       widgetHomescreen: true, widgetMostraNome: false },
     privacidade: { biometriaAbrir: false, ocultarTranscricoes: false },
     midia: { capPorRegistro: 4, permitirAudio: true },
   };

   export const useSettings = create(
     persist(
       (set) => ({ ...DEFAULT_STATE_V2, ...mutators }),
       {
         name: 'ouroboros.settings.v2',
         storage: createJSONStorage(() => secureStorage),
         version: 2,
         migrate: (persistedState: any, version: number) => {
           if (version === 0 || version === 1) {
             // mapeia v1 antigos → v2 conservador
             const sv = persistedState?.somVibracao ?? {};
             return {
               ...DEFAULT_STATE_V2,
               somVibracao: {
                 geral: true,
                 despertar: sv.alarme ?? true,
                 conquista: sv.vitoria ?? true,
                 botoes: sv.humor ?? sv.fab ?? true,
               },
               // ignora lembretes (M30 trata)
               // ignora sync (não existe mais)
             };
           }
           return persistedState as SettingsState;
         },
       }
     )
   );
   ```
2. Refatorar `haptics.ts` com novo mapeamento.
3. Reescrever `app/settings/index.tsx` removendo seções e adaptando
   restantes.
4. Atualizar testes.

## 6. Verificação runtime-real

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros

./scripts/check_anonimato.sh
npx tsc --noEmit
npm test --silent
./scripts/smoke.sh
npx expo export --platform android --output-dir /tmp/m29-export && rm -rf /tmp/m29-export

# Manual web:
./run.sh --web
# Settings: 5 seções (Som, Pessoa, Features, Privacidade, Sobre)
# Toggle "Vibração geral" off: 3 toggles abaixo ficam disabled
# Features: todos os toggles ON por default
```

## 7. Commit

```
refactor: m29 settings v2 vibracao simples features default on sync removido
```

## 8. Checkpoint visual

3 screenshots Nível A em `docs/sprints/M29-screenshots/`:
- `A-vibracao-mestre-on.png` — geral on, 3 toggles ativos.
- `A-vibracao-mestre-off.png` — geral off, 3 toggles disabled.
- `A-features-default-on.png` — todas as features visíveis.

## 9. Decisões tomadas

- **Migração one-shot v1 → v2**: lê valor antigo se existir, mapeia
  conservador (não perde a intenção do usuário). Após migração, v1
  é descartado pelo zustand persist.
- **`somVibracao.geral` é mestre**: simplifica UX. Off desabilita
  todas as outras visualmente.
- **Defaults `true` para features**: app nasce cheio. Usuário
  desliga o que não quer (mais descoberta de funcionalidade).
- **`widgetMostraNome` continua `false`**: privacidade reforçada
  por default (mostra só inicial).
- **Lembretes não migram**: viram alarmes em M30. Migração de dados
  acontece em `migrarLembretesParaAlarmes()` que M30 implementa.

Sprint pronta para execução sem perguntas pendentes.
