// Sprint M-AUDIT-MIGUE-RESTORE-SNAPSHOT (S3): proof de simetria
// export -> import -> getState() byte-a-byte para os 3 stores. Garante
// que aplicarSnapshot (no restore) recupera 100% do snapshot serializado
// por gerarSnapshotSettings (no export), com as ressalvas:
//   - vaultRoot NAO entra no snapshot (Q3): preserva o atual do device.
//   - schemaVersion confere antes de aplicar (Q2).
//
// Comentarios sem acento (convencao shell/CI).

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

import { gerarSnapshotSettings } from '@/lib/services/exportarVault';
import { aplicarSnapshot } from '@/lib/services/restaurarVault';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

function settingsRelevantes() {
  const s = useSettings.getState();
  return {
    somVibracao: s.somVibracao,
    pessoa: s.pessoa,
    featureToggles: s.featureToggles,
    privacidade: s.privacidade,
    midia: s.midia,
  };
}

function onboardingRelevante() {
  const o = useOnboarding.getState();
  return {
    done: o.done,
    tipoCompanhia: o.tipoCompanhia,
    sexoDeclarado: o.sexoDeclarado,
    permissoes: o.permissoes,
  };
}

function pessoaRelevante() {
  const p = usePessoa.getState();
  return {
    pessoaAtiva: p.pessoaAtiva,
    filtroPessoa: p.filtroPessoa,
    nomes: p.nomes,
    fotos: p.fotos,
  };
}

describe('snapshot symmetry — export -> aplicarSnapshot -> getState byte-a-byte', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
    useOnboarding.getState().resetar();
    usePessoa.getState().resetar();
  });

  it('estado nao-default: gerarSnapshot -> reset -> aplicarSnapshot recupera 100%', () => {
    // Mexe nos 3 stores para criar estado inequivocamente nao-default.
    useSettings.getState().setSomVibracao('geral', false);
    useSettings.getState().setSomVibracao('botoes', false);
    useSettings.getState().setFeatureToggle('cicloMenstrual', false);
    useSettings
      .getState()
      .setFeatureToggle('mostrarFinancasEmDesenvolvimento', true);
    useSettings.getState().setPrivacidade('biometriaAbrir', true);
    useSettings.getState().setMidia('capPorRegistro', 12);
    useSettings.getState().setMidia('permitirAudio', false);
    useSettings.getState().setPessoa('vaultCompartilhado', false);

    useOnboarding.getState().setTipoCompanhia('amigos');
    useOnboarding.getState().setSexoDeclarado('pessoa_a', 'nao-binario');
    useOnboarding.getState().setSexoDeclarado('pessoa_b', 'feminino');
    useOnboarding.getState().setPermissao('camera', true);
    useOnboarding.getState().setPermissao('notificacoes', true);
    useOnboarding.getState().marcarConcluido();

    usePessoa.getState().setPessoaAtiva('pessoa_b');
    usePessoa.getState().setFiltroPessoa('ambos');
    usePessoa.getState().setNome('pessoa_a', 'Tester A');
    usePessoa.getState().setNome('pessoa_b', 'Tester B');
    usePessoa
      .getState()
      .setFoto('pessoa_a', 'file:///mock/documents/foto-a.jpg');

    // Captura snapshots ANTES (referencia do estado modificado).
    const settingsAntes = settingsRelevantes();
    const onboardingAntes = onboardingRelevante();
    const pessoaAntes = pessoaRelevante();

    // 1) Export: serializa para JSON (round-trip via JSON.stringify
    //    para forcar paridade byte-a-byte que o ZIP gera no produto
    //    real).
    const snap = gerarSnapshotSettings();
    const json = JSON.stringify(snap);
    const reparsed = JSON.parse(json);

    // 2) Reset: zera os 3 stores aos defaults.
    useSettings.getState().resetar();
    useOnboarding.getState().resetar();
    usePessoa.getState().resetar();
    expect(useSettings.getState().somVibracao.geral).toBe(true);
    expect(useOnboarding.getState().done).toBe(false);
    expect(usePessoa.getState().pessoaAtiva).toBe('pessoa_a');

    // 3) Restore: aplica o snapshot serializado (apos roundtrip JSON).
    const r = aplicarSnapshot(reparsed, { confirmado: true });
    expect(r.ok).toBe(true);

    // 4) getState() casa byte-a-byte com o estado original.
    expect(settingsRelevantes()).toEqual(settingsAntes);
    expect(onboardingRelevante()).toEqual(onboardingAntes);
    expect(pessoaRelevante()).toEqual(pessoaAntes);
  });

  it('estado default: snapshot vazio -> aplica -> permanece default', () => {
    const snap = gerarSnapshotSettings();
    const json = JSON.stringify(snap);
    const reparsed = JSON.parse(json);

    const settingsAntes = settingsRelevantes();
    const onboardingAntes = onboardingRelevante();
    const pessoaAntes = pessoaRelevante();

    const r = aplicarSnapshot(reparsed, { confirmado: true });
    expect(r.ok).toBe(true);

    expect(settingsRelevantes()).toEqual(settingsAntes);
    expect(onboardingRelevante()).toEqual(onboardingAntes);
    expect(pessoaRelevante()).toEqual(pessoaAntes);
  });

  it('Q3 (vaultRoot ignorado): snapshot nao contem vaultRoot', () => {
    const snap = gerarSnapshotSettings();
    // vaultRoot vive em SecureStore separado, fora dos 3 stores
    // serializados. A interface SnapshotSettings nao expoe campo
    // vaultRoot — confirma topologia.
    expect(snap).not.toHaveProperty('vaultRoot');
    expect(snap.settings).not.toHaveProperty('vaultRoot');
    expect(snap.onboarding).not.toHaveProperty('vaultRoot');
    expect(snap.pessoa).not.toHaveProperty('vaultRoot');
  });
});
