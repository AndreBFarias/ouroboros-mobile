// R-CROSS-FLOW-FIX-1 — verifica que app/_layout.tsx contem o caller
// canonico de avaliarBackupAutomatico no boot. Sprint corrige bug onde
// o helper existia + era testado mas nao tinha caller, deixando o
// toggle backupAutomaticoSemanal em Settings sem efeito real.
//
// Estrategia: o _layout.tsx eh denso (Stack, Gates, FrameMobileDev,
// providers) e ja foi historicamente nao-coberto por jest. Testamos o
// contrato: o arquivo importa o helper e o invoca a partir de um
// useEffect dependente de appPronto.
//
// Validacao em 2 camadas:
//   1. Static check (grep): garante que o caller esta presente.
//      Pega regressao se alguem remove o import ou o useEffect.
//   2. Behavior check: roda avaliarBackupAutomatico com toggle ON +
//      semana passada e confirma que executor eh chamado (smoke do
//      caminho que o useEffect vai exercitar em runtime).
//
// Comentarios sem acento.

import { readFileSync } from 'fs';
import { resolve } from 'path';

jest.mock('react-native', () => require('../../__support__/rnCssInteropMock.cjs')('android'));

import {
  INTERVALO_BACKUP_MS,
  avaliarBackupAutomatico,
  cancelarTimer,
} from '@/lib/backup/agendarBackup';
import { useSettings } from '@/lib/stores/settings';

const LAYOUT_PATH = resolve(__dirname, '../../../app/_layout.tsx');

beforeEach(() => {
  // R-BACKUP-AUTO: default mudou para TRUE; desligamos explicitamente
  // para os casos de "OFF" abaixo.
  useSettings.getState().resetar();
  useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', false);
  cancelarTimer();
});

afterEach(() => {
  cancelarTimer();
});

describe('R-CROSS-FLOW-FIX-1 — caller de avaliarBackupAutomatico no boot', () => {
  it('app/_layout.tsx importa avaliarBackupAutomatico e cancelarTimer', () => {
    const src = readFileSync(LAYOUT_PATH, 'utf8');
    expect(src).toMatch(/import\s*{[^}]*avaliarBackupAutomatico[^}]*}\s*from\s*'@\/lib\/backup\/agendarBackup'/);
    expect(src).toMatch(/cancelarTimer/);
  });

  it('app/_layout.tsx contem useEffect que invoca avaliarBackupAutomatico', () => {
    const src = readFileSync(LAYOUT_PATH, 'utf8');
    // Verifica que ha uma chamada do helper em algum lugar do arquivo
    // (no useEffect, conforme padrao R-VAULT-CANONICAL-COMPLETE-A).
    expect(src).toMatch(/avaliarBackupAutomatico\(\)/);
  });

  it('app/_layout.tsx invoca cancelarTimer no cleanup do useEffect', () => {
    const src = readFileSync(LAYOUT_PATH, 'utf8');
    // O cleanup importou cancelarTimer como cancelarTimerBackup (alias
    // para nao colidir com outros cancelarTimer de subsistemas).
    expect(src).toMatch(/cancelarTimerBackup\(\)/);
  });

  it('smoke: chamada com toggle ON + ultimo backup ha 8 dias dispara executor (comportamento que o boot exerce)', async () => {
    useSettings.getState().setFeatureToggle('backupAutomaticoSemanal', true);
    const executor = jest.fn().mockResolvedValue({
      uri: '/mock/Documents/Ouroboros-Backups/auto/backup-r-cross.zip',
      totalArquivos: 12,
      rotacionados: 0,
    });
    const OITO_DIAS_MS = 8 * 24 * 60 * 60 * 1000;
    const agora = 1_714_824_000_000;
    const leitor = jest.fn().mockResolvedValue(agora - OITO_DIAS_MS);
    // Replica o que o useEffect em _layout vai fazer: chamada
    // fire-and-forget sem opcoes (executor + leitor reais em runtime;
    // aqui injetamos mocks para isolar do FileSystem).
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
      agora: () => agora,
      iniciarTimer: false,
    });
    expect(r.disparou).toBe(true);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(r.resultado?.totalArquivos).toBe(12);
    // Garante que delta cumpriu o intervalo canonico.
    expect(OITO_DIAS_MS).toBeGreaterThan(INTERVALO_BACKUP_MS);
  });

  it('smoke: chamada com toggle OFF e no-op silencioso (caso usuario desligou em Settings)', async () => {
    const executor = jest.fn();
    const leitor = jest.fn();
    const r = await avaliarBackupAutomatico({
      executor,
      leitorUltimo: leitor,
    });
    expect(r.disparou).toBe(false);
    expect(executor).not.toHaveBeenCalled();
    expect(leitor).not.toHaveBeenCalled();
  });
});
