// AUDIT-P4-4-REDUCE-MOTION-ROLLOUT: testes da funcao pura que escolhe
// entre o preset de spring e a ausencia de movimento.
//
// Por que o teste vive aqui e nao no render dos primitivos: o mock de
// moti em jest.setup.cjs desestrutura e DESCARTA a prop `transition`
// antes de criar o RN.View, entao nenhum assert de render enxergaria a
// mudanca. Editar aquele mock e' NAO-objetivo declarado da sprint (e'
// infra compartilhada por 21 suites de tests/components/ui/). O que da'
// para travar deterministicamente e' o contrato da funcao -- e o
// contrato e' o que os 12 primitivos consomem.
//
// Comentarios sem acento (convencao shell/CI).
import {
  SEM_MOVIMENTO,
  transicaoMovimento,
} from '@/lib/a11y/transicaoMovimento';
import { springs, timings } from '@/lib/motion';

describe('transicaoMovimento', () => {
  const presets = Object.entries(springs);

  it('cobre os 5 presets canonicos de spring', () => {
    // Guarda contra o preset novo que entrar em motion.ts sem passar
    // por aqui: se springs crescer, este numero avisa.
    expect(presets).toHaveLength(5);
  });

  describe('com reducao de movimento LIGADA', () => {
    it.each(presets)('anula o preset %s', (_nome, preset) => {
      expect(transicaoMovimento(true, preset)).toEqual({
        type: 'timing',
        duration: 0,
      });
    });

    it('devolve a mesma constante SEM_MOVIMENTO, nao um objeto novo', () => {
      expect(transicaoMovimento(true, springs.subtle)).toBe(SEM_MOVIMENTO);
    });

    it('tambem anula os presets de timing', () => {
      expect(transicaoMovimento(true, timings.fadeOut)).toBe(SEM_MOVIMENTO);
      expect(transicaoMovimento(true, timings.toastIn)).toBe(SEM_MOVIMENTO);
    });
  });

  describe('com reducao de movimento DESLIGADA', () => {
    // Paridade obrigatoria com o comportamento atual (NAO-objetivo 3 do
    // spec): identidade referencial, nao apenas igualdade estrutural.
    // Um clone estrutural passaria num toEqual e ainda assim mudaria o
    // que o moti recebe entre renders.
    it.each(presets)('devolve o proprio preset %s por referencia', (_n, p) => {
      expect(transicaoMovimento(false, p)).toBe(p);
    });

    it('nunca devolve SEM_MOVIMENTO', () => {
      for (const [, preset] of presets) {
        expect(transicaoMovimento(false, preset)).not.toBe(SEM_MOVIMENTO);
      }
    });
  });

  it('SEM_MOVIMENTO tem duracao zero de fato', () => {
    // duration: 0 e' o que faz o valor animado saltar para o destino.
    // Qualquer valor > 0 reintroduziria movimento perceptivel.
    expect(SEM_MOVIMENTO.duration).toBe(0);
    expect(SEM_MOVIMENTO.type).toBe('timing');
  });
});
