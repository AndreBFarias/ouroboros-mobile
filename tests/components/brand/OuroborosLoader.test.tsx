// Testes do OuroborosLoader (componente animado). O mock oficial de
// react-native-reanimated (jest.setup.cjs) deixa useSharedValue como
// objeto plano, withTiming retorna toValue, withRepeat e identidade,
// cancelAnimation e NOOP. useAnimatedProps invoca o callback uma vez
// e retorna o resultado direto. createAnimatedComponent e identidade.
//
// Por isso podemos validar:
//   - render basico (modo cheio e modo compacto)
//   - valor final das 4 shared values apos mount (withTiming(toValue)
//     retorna toValue: gs1=360, gs2=-360, gs3=360, flow=490)
//   - cleanup chama cancelAnimation 4 vezes (1 por shared value)
//
// Trick: para inspecionar shared values internas, usamos um spy em
// cancelAnimation que captura os shared values passados no unmount.
// Sao os mesmos objetos que receberam withTiming na mount.
import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { OuroborosLoader } from '@/components/brand/OuroborosLoader';

describe('OuroborosLoader', () => {
  it('renderiza com label de progressbar em modo cheio', () => {
    const tree = render(<OuroborosLoader />);
    const root = tree.getByLabelText('loader ouroboros');
    expect(root).toBeTruthy();
    expect(root.props.style).toMatchObject({ width: 320, height: 320 });
  });

  it('em modo compacto fica 96px e omite wordmark', () => {
    const tree = render(<OuroborosLoader compacto />);
    const root = tree.getByLabelText('loader ouroboros');
    expect(root.props.style).toMatchObject({ width: 96, height: 96 });
    expect(tree.queryByText('OUROBOROS')).toBeNull();
    expect(tree.queryByText('PROTOCOLO')).toBeNull();
  });

  it('aplica rotacao 360 a gs1 (snake principal) apos mount', () => {
    // Spy captura os shared values passados a cancelAnimation no
    // unmount. Sao os mesmos objetos que receberam o withTiming na
    // mount, entao .value reflete o estado final do mock.
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(4);
    // Ordem do cleanup no codigo: g1, g2, g3, flow.
    const sv1 = cancelSpy.mock.calls[0][0] as { value: number };
    expect(sv1.value).toBe(360);
    cancelSpy.mockRestore();
  });

  it('aplica rotacao -360 a gs2 (orbit dotted reverso)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const sv2 = cancelSpy.mock.calls[1][0] as { value: number };
    expect(sv2.value).toBe(-360);
    cancelSpy.mockRestore();
  });

  it('aplica rotacao 360 a gs3 (inner flow ring)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const sv3 = cancelSpy.mock.calls[2][0] as { value: number };
    expect(sv3.value).toBe(360);
    cancelSpy.mockRestore();
  });

  it('aplica offset 490 (perimetro) a gs-flow (stroke-dashoffset)', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    const tree = render(<OuroborosLoader />);
    tree.unmount();
    const svFlow = cancelSpy.mock.calls[3][0] as { value: number };
    expect(svFlow.value).toBe(490);
    cancelSpy.mockRestore();
  });

  // M25.1 + A27 (2026-05-06): em web emite transform string ("rotate
  // (angle cx cy)") para sobreviver ao parser do rn-svg-web. Em
  // native (default do Jest), emite rotation numerica para evitar
  // crash "java.lang.String cannot be cast to ReadableArray" na New
  // Arch (Fabric espera array em transform de SVG, ou rotation prop
  // do react-native-svg). Pivot vem de originX/originY estaticos no
  // <AnimatedG>.
  it('emite rotation numerica para os 3 grupos em native (Jest default)', () => {
    const propsSpy = jest.spyOn(Reanimated, 'useAnimatedProps');
    render(<OuroborosLoader />);
    const cb1 = propsSpy.mock.calls[0][0] as () => { rotation: number };
    const cb2 = propsSpy.mock.calls[1][0] as () => { rotation: number };
    const cb3 = propsSpy.mock.calls[2][0] as () => { rotation: number };
    expect(cb1().rotation).toBe(360);
    expect(cb2().rotation).toBe(-360);
    expect(cb3().rotation).toBe(360);
    propsSpy.mockRestore();
  });

  // Caminho web (transform string para rn-svg-web) coberto por
  // E2E em tests/e2e/playwright/m25-1-* via Gauntlet — Jest aqui
  // nao consegue exercitar requestAnimationFrame + document
  // querySelector do useEffect web sem jsdom completo, e a logica
  // de ramificacao isWeb e simples o suficiente para auditoria
  // visual cobrir.

  // R-CRIT-4: cleanup invoca cancelAnimation 4x mesmo apos varios
  // mount/unmount ciclos. Garante que nao ha leak de worklet entre
  // remounts (sintoma original: loader pos OAuth, pos pull-to-refresh
  // virava estatico porque o cleanup antigo aparentemente nao matava
  // o RAF ou animacao reanimated).
  it('cleanup chama cancelAnimation 4x por mount, idempotente em remount', () => {
    const cancelSpy = jest.spyOn(Reanimated, 'cancelAnimation');
    // ciclo 1
    const tree1 = render(<OuroborosLoader />);
    tree1.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(4);
    // ciclo 2: remount; cancelSpy acumula 4 + 4 = 8
    const tree2 = render(<OuroborosLoader />);
    tree2.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(8);
    // ciclo 3
    const tree3 = render(<OuroborosLoader />);
    tree3.unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(12);
    cancelSpy.mockRestore();
  });

  // R-CRIT-4: UUID por instancia em vez de useId() colidente.
  // Cada loader montado tem data-anim-id unico. Spawn 3 loaders
  // simultaneos e verifica que os 4 atributos data-anim-id de cada
  // sao distintos. Garante: zero colisao quando _layout + tela
  // coexistem com loaders, ou quando uma lista renderiza N loaders.
  it('gera data-anim-id unico por instancia em multiplos loaders (sem colisao)', () => {
    // Mock react-native-svg propaga props ate filhos via wrapper
    // View. Coletamos ids de cada arvore, dedupando para conjunto.
    // O que importa: cada arvore tem 4 ids logicos distintos (g1,
    // g2, g3, flow) e os ids nao colidem entre 3 arvores irmas.
    type ReactTestNode = { props: Record<string, unknown> };
    const idsUnicosPorArvore: Set<string>[] = [];
    for (let i = 0; i < 3; i += 1) {
      const tree = render(<OuroborosLoader />);
      const candidatos = tree.root.findAll(
        (n: ReactTestNode) =>
          !!n.props && typeof n.props['data-anim-id'] === 'string'
      );
      const conjunto = new Set<string>(
        candidatos.map((n: ReactTestNode) => n.props['data-anim-id'] as string)
      );
      idsUnicosPorArvore.push(conjunto);
      tree.unmount();
    }

    // Cada arvore tem 4 ids logicos distintos (g1, g2, g3, flow).
    idsUnicosPorArvore.forEach((set) => {
      expect(set.size).toBe(4);
    });

    // Forma dos ids: prefixo og-(g1|g2|g3|flow)- seguido de UUID.
    idsUnicosPorArvore.forEach((set) => {
      set.forEach((id) => {
        expect(id).toMatch(/^og-(g1|g2|g3|flow)-.+/);
      });
    });

    // Causa raiz: useId() colidia entre arvores irmas. Verificamos
    // que os 12 ids totais (3 arvores x 4) nao tem repeticao.
    const todos = idsUnicosPorArvore.flatMap((s) => Array.from(s));
    const setGlobal = new Set(todos);
    expect(setGlobal.size).toBe(12);

    // Sufixo UUID e distinto entre arvores: se loader A usa
    // og-g1-X, loader B usa og-g1-Y com Y != X. Isso garante
    // que document.querySelector("[data-anim-id='og-g1-X']")
    // em web pega so o no do loader A.
    const sufixosG1 = idsUnicosPorArvore.map((set) => {
      const g1 = Array.from(set).find((id) => id.startsWith('og-g1-'));
      return g1?.replace('og-g1-', '') ?? '';
    });
    const sufixosUnicos = new Set(sufixosG1);
    expect(sufixosUnicos.size).toBe(3);
  });
});
