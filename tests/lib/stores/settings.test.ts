import { useSettings } from '@/lib/stores/settings';

describe('useSettings', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
  });

  describe('defaults', () => {
    it('somVibracao tem trigger off e demais on', () => {
      const s = useSettings.getState();
      expect(s.somVibracao.humor).toBe(true);
      expect(s.somVibracao.vitoria).toBe(true);
      expect(s.somVibracao.trigger).toBe(false);
      expect(s.somVibracao.fab).toBe(true);
      expect(s.somVibracao.alarme).toBe(true);
    });

    it('lembretes default todos inativos com horarios sensatos', () => {
      const s = useSettings.getState();
      expect(s.lembretes.medicacao.ativo).toBe(false);
      expect(s.lembretes.medicacao.horario).toBe('09:00');
      expect(s.lembretes.treino.ativo).toBe(false);
      expect(s.lembretes.treino.horario).toBe('18:00');
      expect(s.lembretes.humor.ativo).toBe(false);
      expect(s.lembretes.humor.horario).toBe('21:00');
    });

    it('pessoa default ativa = pessoa_a, vault compartilhado, sozinho', () => {
      const s = useSettings.getState();
      expect(s.pessoa.ativa).toBe('pessoa_a');
      expect(s.pessoa.vaultCompartilhado).toBe(true);
      expect(s.pessoa.tipoCompanhia).toBe('sozinho');
    });

    it('sync default nao-uso, scanner 12mp', () => {
      const s = useSettings.getState();
      expect(s.sync.metodo).toBe('nao-uso');
      expect(s.sync.qualidadeScanner).toBe('12mp');
    });

    it('todos os featureToggles comecam off', () => {
      const s = useSettings.getState();
      expect(s.featureToggles.cicloMenstrual).toBe(false);
      expect(s.featureToggles.alarmePessoal).toBe(false);
      expect(s.featureToggles.todoLeve).toBe(false);
      expect(s.featureToggles.contadorDiasSem).toBe(false);
      expect(s.featureToggles.calendarioConquistas).toBe(false);
      expect(s.featureToggles.widgetHomescreen).toBe(false);
      expect(s.featureToggles.widgetMostraNome).toBe(false);
    });

    it('privacidade default tudo off', () => {
      const s = useSettings.getState();
      expect(s.privacidade.biometriaAbrir).toBe(false);
      expect(s.privacidade.ocultarTranscricoes).toBe(false);
    });

    it('midia default cap 4 e audio permitido', () => {
      const s = useSettings.getState();
      expect(s.midia.capPorRegistro).toBe(4);
      expect(s.midia.permitirAudio).toBe(true);
    });
  });

  describe('mutators', () => {
    it('setFeatureToggle muda apenas a chave alvo', () => {
      useSettings.getState().setFeatureToggle('cicloMenstrual', true);
      const s = useSettings.getState();
      expect(s.featureToggles.cicloMenstrual).toBe(true);
      // outros toggles seguem off
      expect(s.featureToggles.alarmePessoal).toBe(false);
      expect(s.featureToggles.todoLeve).toBe(false);
    });

    it('setFeatureToggle aceita widgetMostraNome (sub-toggle M20)', () => {
      useSettings.getState().setFeatureToggle('widgetMostraNome', true);
      expect(useSettings.getState().featureToggles.widgetMostraNome).toBe(true);
      // toggle principal segue off por opt-in independente
      expect(useSettings.getState().featureToggles.widgetHomescreen).toBe(false);
    });

    it('setSomVibracao trigger=true ligavel pelo usuario', () => {
      useSettings.getState().setSomVibracao('trigger', true);
      expect(useSettings.getState().somVibracao.trigger).toBe(true);
    });

    it('setLembrete merge parcial preserva chaves nao tocadas', () => {
      useSettings.getState().setLembrete('medicacao', { ativo: true });
      const s = useSettings.getState();
      expect(s.lembretes.medicacao.ativo).toBe(true);
      // horario nao foi tocado
      expect(s.lembretes.medicacao.horario).toBe('09:00');
    });

    it('setLembrete pode trocar horario tambem', () => {
      useSettings
        .getState()
        .setLembrete('treino', { ativo: true, horario: '06:30' });
      const s = useSettings.getState();
      expect(s.lembretes.treino.ativo).toBe(true);
      expect(s.lembretes.treino.horario).toBe('06:30');
    });

    it('setPessoa.tipoCompanhia aceita duo', () => {
      useSettings.getState().setPessoa('tipoCompanhia', 'duo');
      expect(useSettings.getState().pessoa.tipoCompanhia).toBe('duo');
    });

    it('setSync metodo aceita syncthing e obsidian-sync', () => {
      useSettings.getState().setSync('metodo', 'syncthing');
      expect(useSettings.getState().sync.metodo).toBe('syncthing');
      useSettings.getState().setSync('metodo', 'obsidian-sync');
      expect(useSettings.getState().sync.metodo).toBe('obsidian-sync');
    });

    it('setMidia.capPorRegistro aceita numero arbitrario', () => {
      useSettings.getState().setMidia('capPorRegistro', 8);
      expect(useSettings.getState().midia.capPorRegistro).toBe(8);
    });

    it('setPrivacidade.biometriaAbrir liga gate', () => {
      useSettings.getState().setPrivacidade('biometriaAbrir', true);
      expect(useSettings.getState().privacidade.biometriaAbrir).toBe(true);
    });
  });

  describe('reset', () => {
    it('resetar volta tudo ao default', () => {
      useSettings.getState().setFeatureToggle('cicloMenstrual', true);
      useSettings.getState().setSomVibracao('trigger', true);
      useSettings.getState().setSync('metodo', 'syncthing');
      useSettings.getState().setMidia('capPorRegistro', 12);

      useSettings.getState().resetar();

      const s = useSettings.getState();
      expect(s.featureToggles.cicloMenstrual).toBe(false);
      expect(s.somVibracao.trigger).toBe(false);
      expect(s.sync.metodo).toBe('nao-uso');
      expect(s.midia.capPorRegistro).toBe(4);
    });
  });
});
