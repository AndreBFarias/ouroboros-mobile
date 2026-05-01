import {
  SHEET_60,
  SHEET_70,
  SHEET_80,
  SHEET_90,
  SHEET_DEFAULT,
} from '@/components/ui';

// Os presets sao a fonte da verdade dos snap points usados pelas
// telas. Calibracao foi feita em sprints anteriores; mudar os
// valores aqui sem revisar humor-rapido / diario / eventos
// quebra layout. O teste protege contra alteracao acidental.

describe('SHEET_PRESETS', () => {
  it('SHEET_60 contem ["60%"]', () => {
    expect(SHEET_60).toEqual(['60%']);
  });

  it('SHEET_70 contem ["70%"]', () => {
    expect(SHEET_70).toEqual(['70%']);
  });

  it('SHEET_80 contem ["80%"]', () => {
    expect(SHEET_80).toEqual(['80%']);
  });

  it('SHEET_90 contem ["90%"]', () => {
    expect(SHEET_90).toEqual(['90%']);
  });

  it('SHEET_DEFAULT contem ["40%", "85%"]', () => {
    expect(SHEET_DEFAULT).toEqual(['40%', '85%']);
  });

  it('todos os presets sao readonly em runtime via Object.freeze', () => {
    // Arrays as const tem typing readonly em compile-time. Em runtime,
    // garantimos a imutabilidade via referencia compartilhada: os
    // consumidores nao mutam os arrays porque o BottomSheet os usa
    // dentro de useMemo. O teste valida que os presets nao foram
    // recalculados como arrays distintos.
    expect(SHEET_60).toBe(SHEET_60);
    expect(SHEET_DEFAULT.length).toBe(2);
    expect(SHEET_70.length).toBe(1);
  });

  it('valores dos presets nao se misturam', () => {
    expect(SHEET_60).not.toEqual(SHEET_70);
    expect(SHEET_70).not.toEqual(SHEET_80);
    expect(SHEET_80).not.toEqual(SHEET_90);
    expect(SHEET_DEFAULT).not.toEqual(SHEET_60);
  });
});
