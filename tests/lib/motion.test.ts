import { springs, timings } from '@/lib/motion';

describe('springs', () => {
  it('subtle tem damping 22 e stiffness 220', () => {
    expect(springs.subtle).toEqual({
      type: 'spring',
      damping: 22,
      stiffness: 220,
    });
  });

  it('default tem damping 18 e stiffness 200', () => {
    expect(springs.default).toEqual({
      type: 'spring',
      damping: 18,
      stiffness: 200,
    });
  });

  it('bouncy tem damping 12 e stiffness 180', () => {
    expect(springs.bouncy).toEqual({
      type: 'spring',
      damping: 12,
      stiffness: 180,
    });
  });

  it('snappy tem damping 26 e stiffness 320', () => {
    expect(springs.snappy).toEqual({
      type: 'spring',
      damping: 26,
      stiffness: 320,
    });
  });

  it('todos os presets sao do tipo spring', () => {
    for (const preset of Object.values(springs)) {
      expect(preset.type).toBe('spring');
    }
  });
});

describe('timings', () => {
  it('fadeOut e timing linear de 180ms', () => {
    expect(timings.fadeOut).toEqual({
      type: 'timing',
      duration: 180,
    });
  });

  it('toastIn e spring (excecao do nome do bucket)', () => {
    expect(timings.toastIn).toEqual({
      type: 'spring',
      damping: 20,
      stiffness: 250,
    });
  });
});
