import {
  useSettings,
  mergeSettingsPersistido,
} from '@/lib/stores/settings';

// R-RECAP-9b (2026-07-11): regressao do bug "musica do Recap muda por
// default numa instalacao ja existente".
//
// Contexto: o persist config tem `migrate` (so' roda em troca de versao)
// mas antes NAO tinha `merge` custom. Uma instalacao ja-v2 hidrata com o
// merge SHALLOW padrao do zustand, onde o objeto `featureToggles`
// persistido (sem a chave nova `recapMusicaFundo`) SUBSTITUI o default
// inteiro -> `recapMusicaFundo === undefined` -> falsy -> musica muda.
// A decisao do dono e' LIGADA (default true).
//
// Estes testes chamam a funcao REAL `mergeSettingsPersistido` (a mesma
// cabeada em `merge` no persist config), simulando o persistedState
// organico de uma instalacao anterior ao R-RECAP-9. Evita a tautologia de
// replicar o algoritmo no proprio teste.
describe('mergeSettingsPersistido (back-fill de featureToggles - R-RECAP-9b)', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
  });

  // Shape de uma instalacao ja-v2 gravada ANTES do R-RECAP-9: o objeto
  // featureToggles tem as chaves antigas, mas NAO a nova recapMusicaFundo.
  // O usuario tambem havia desligado cicloMenstrual (escolha organica que
  // precisa ser preservada) — e habilitado widgetMostraNome.
  function persistedStateV2Antigo(): Record<string, unknown> {
    return {
      somVibracao: {
        geral: true,
        despertar: true,
        conquista: true,
        botoes: true,
      },
      pessoa: {
        ativa: 'pessoa_a',
        vaultCompartilhado: true,
        tipoCompanhia: 'sozinho',
      },
      featureToggles: {
        // Chaves que existiam quando o usuario instalou. Sem recapMusicaFundo.
        cicloMenstrual: false, // escolha organica do usuario (deve ser preservada)
        alarmePessoal: true,
        todoLeve: true,
        contadorDiasSem: true,
        calendarioConquistas: true,
        widgetHomescreen: true,
        widgetMostraNome: true, // escolha organica do usuario (deve ser preservada)
        mostrarFinancasEmDesenvolvimento: false,
        backupAutomaticoSemanal: true,
        healthConnectSync: false,
        recapAmbientAudio: false,
        recapAudioAnexadoAutoplay: true,
        // recapMusicaFundo AUSENTE de proposito (chave nova do R-RECAP-9).
      },
      privacidade: { biometriaAbrir: false, ocultarTranscricoes: false },
      midia: { capPorRegistro: 4, permitirAudio: true },
      recap: { slideshowIntervaloS: 4 },
    };
  }

  it('back-filla recapMusicaFundo com o default true numa instalacao ja-v2 sem a chave', () => {
    const persistido = persistedStateV2Antigo();
    // Garantia da premissa do teste: a chave realmente nao esta no persistido.
    expect(
      (persistido.featureToggles as Record<string, unknown>).recapMusicaFundo
    ).toBeUndefined();

    const merged = mergeSettingsPersistido(
      persistido,
      useSettings.getState()
    );

    // O fix: a chave nova recebe o default v2 (LIGADA), nao undefined.
    expect(merged.featureToggles.recapMusicaFundo).toBe(true);
  });

  it('preserva escolhas organicas do usuario em chaves nested (persistido vence o default)', () => {
    const merged = mergeSettingsPersistido(
      persistedStateV2Antigo(),
      useSettings.getState()
    );

    // Usuario havia DESLIGADO cicloMenstrual (default e' true): tem que ficar false.
    expect(merged.featureToggles.cicloMenstrual).toBe(false);
    // Usuario havia LIGADO widgetMostraNome (default e' false): tem que ficar true.
    expect(merged.featureToggles.widgetMostraNome).toBe(true);
  });

  it('preserva as acoes do store apos a hidratacao (setFeatureToggle continua funcao)', () => {
    const merged = mergeSettingsPersistido(
      persistedStateV2Antigo(),
      useSettings.getState()
    );

    expect(typeof merged.setFeatureToggle).toBe('function');
    expect(typeof merged.setSomVibracao).toBe('function');
    expect(typeof merged.resetar).toBe('function');
  });

  it('outras chaves novas de featureToggles tambem sao back-filled (fix e geral, nao so recapMusicaFundo)', () => {
    const merged = mergeSettingsPersistido(
      persistedStateV2Antigo(),
      useSettings.getState()
    );

    // hcAutopullBackground/googleCalendarSync/backupDriveAutomatico foram
    // adicionados depois do shape original: recebem o default (false), nao undefined.
    expect(merged.featureToggles.hcAutopullBackground).toBe(false);
    expect(merged.featureToggles.googleCalendarSync).toBe(false);
    expect(merged.featureToggles.backupDriveAutomatico).toBe(false);
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = useSettings.getState();
    expect(mergeSettingsPersistido(null, atual)).toBe(atual);
    expect(mergeSettingsPersistido(undefined, atual)).toBe(atual);
    expect(mergeSettingsPersistido('lixo', atual)).toBe(atual);
    // E mesmo no caminho de guard, a acao continua acessivel.
    expect(typeof mergeSettingsPersistido(null, atual).setFeatureToggle).toBe(
      'function'
    );
  });
});
