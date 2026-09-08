// P3 (2026-09-08) -- prova da migracao do legado 'duo' no boot.
//
// A leitura tolerante tem duas metades, e so' as duas juntas fecham o
// caso: `mergeSettingsPersistido` converte o 'duo' gravado no
// SecureStore para 'casal' (senao um valor fora do dominio entraria no
// store), e o BootHook `reconciliarTipoCompanhiaHook` corrige para
// 'amigos' quando essa era a resposta que o onboarding guardou desde
// sempre. Sem a segunda metade, quem respondeu amigos ficaria em casal
// para sempre -- calado, que e' o modo de falha que a P3 existe para
// eliminar.
//
// O hook nao e' exportado individualmente. Reusamos o harness de
// tests/lib/boot/reagendamento-stats.test.ts: filtra BOOT_HOOKS pelo
// nome da funcao e roda so' ele.
//
// Comentarios sem acento (convencao shell/CI).
import { BOOT_HOOKS, reagendarTodosBootHooks } from '@/lib/boot/reagendamento';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';

const ORIGINAL = [...BOOT_HOOKS];

async function rodarSomente(nome: string): Promise<void> {
  const alvo = BOOT_HOOKS.find((h) => h.name === nome);
  if (!alvo) throw new Error(`hook "${nome}" nao esta em BOOT_HOOKS`);
  BOOT_HOOKS.length = 0;
  BOOT_HOOKS.push(alvo);
  await reagendarTodosBootHooks();
}

afterEach(() => {
  BOOT_HOOKS.length = 0;
  BOOT_HOOKS.push(...ORIGINAL);
});

beforeEach(() => {
  useSettings.getState().resetar();
  useOnboarding.getState().resetar();
});

describe('reconciliarTipoCompanhiaHook (P3)', () => {
  it('esta registrado em BOOT_HOOKS', () => {
    expect(
      ORIGINAL.some((h) => h.name === 'reconciliarTipoCompanhiaHook')
    ).toBe(true);
  });

  it('restaura amigos a partir do onboarding depois do legado virar casal', async () => {
    // Estado de uma instalacao anterior a P3: o onboarding sempre
    // guardou 'amigos'; o settings hidratou 'casal' vindo do 'duo'.
    useOnboarding.setState({ tipoCompanhia: 'amigos' });
    useSettings.setState((s) => ({
      pessoa: { ...s.pessoa, tipoCompanhia: 'casal' },
    }));

    await rodarSomente('reconciliarTipoCompanhiaHook');

    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('amigos');
  });

  it('nao mexe quando os dois stores ja concordam (idempotente)', async () => {
    useOnboarding.setState({ tipoCompanhia: 'casal' });
    useSettings.setState((s) => ({
      pessoa: { ...s.pessoa, tipoCompanhia: 'casal' },
    }));

    await rodarSomente('reconciliarTipoCompanhiaHook');
    await rodarSomente('reconciliarTipoCompanhiaHook');

    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('casal');
  });

  it('propaga sozinho quando o onboarding diz sozinho', async () => {
    useOnboarding.setState({ tipoCompanhia: 'sozinho' });
    useSettings.setState((s) => ({
      pessoa: { ...s.pessoa, tipoCompanhia: 'casal' },
    }));

    await rodarSomente('reconciliarTipoCompanhiaHook');

    expect(useSettings.getState().pessoa.tipoCompanhia).toBe('sozinho');
  });
});
