// R-INT-3 (2026-05-16): cobertura do event bus interno do HC sync.
// Garante que subscribe/unsubscribe e mensagemCanonica funcionam
// isoladamente -- sem precisar do sync.ts.
import {
  emitHCSyncFail,
  mensagemCanonica,
  subscribeHCSyncFail,
  __resetHCSyncFailListeners,
  type HCSyncFailEvent,
} from '@/lib/health/eventBus';

beforeEach(() => {
  __resetHCSyncFailListeners();
});

describe('mensagemCanonica', () => {
  it('combina prefixo do tipo com sufixo do motivo (PT-BR acentuado)', () => {
    expect(mensagemCanonica('treino', 'permission_denied')).toBe(
      'Treino salvo localmente. Sem permissão para gravar na Conexão Saúde.'
    );
    expect(mensagemCanonica('peso', 'api_error')).toBe(
      'Peso salvo localmente. Falha ao sincronizar com Conexão Saúde.'
    );
    expect(mensagemCanonica('gordura', 'no_module')).toBe(
      'Medida salva localmente. Conexão Saúde indisponível neste aparelho.'
    );
    expect(mensagemCanonica('menstruacao', 'permission_denied')).toBe(
      'Ciclo salvo localmente. Sem permissão para gravar na Conexão Saúde.'
    );
  });
});

describe('subscribe/unsubscribe', () => {
  it('emit alcanca todos os listeners ativos', () => {
    const eventos1: HCSyncFailEvent[] = [];
    const eventos2: HCSyncFailEvent[] = [];
    subscribeHCSyncFail((e) => eventos1.push(e));
    subscribeHCSyncFail((e) => eventos2.push(e));

    emitHCSyncFail({
      tipo: 'treino',
      motivo: 'api_error',
      mensagem: 'x',
    });

    expect(eventos1).toHaveLength(1);
    expect(eventos2).toHaveLength(1);
  });

  it('unsubscribe remove o listener', () => {
    const eventos: HCSyncFailEvent[] = [];
    const off = subscribeHCSyncFail((e) => eventos.push(e));
    off();

    emitHCSyncFail({
      tipo: 'peso',
      motivo: 'permission_denied',
      mensagem: 'x',
    });

    expect(eventos).toHaveLength(0);
  });

  it('listener com bug nao bloqueia outros listeners', () => {
    const eventos: HCSyncFailEvent[] = [];
    subscribeHCSyncFail(() => {
      throw new Error('listener com bug');
    });
    subscribeHCSyncFail((e) => eventos.push(e));

    emitHCSyncFail({
      tipo: 'menstruacao',
      motivo: 'api_error',
      mensagem: 'x',
    });

    expect(eventos).toHaveLength(1);
  });
});
