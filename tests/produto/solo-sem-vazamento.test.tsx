// P2 (2026-09-08) -- trava a regra: com tipoCompanhia 'sozinho',
// nenhuma superficie pode renderizar a palavra "casal", a expressao
// "voces dois" nem o rotulo da segunda pessoa.
//
// Por que este arquivo existe, nas palavras do relatorio que originou
// a decisao: "Sem o teste, regride." A arquitetura de solo ja era
// primeira classe -- o que falhava era o acabamento, e acabamento
// volta a falhar na sprint seguinte quando ninguem o mede.
//
// Duas metades, e a segunda importa tanto quanto a primeira:
//   1. Em 'sozinho', nenhum vazamento.
//   2. Em 'casal', os mesmos elementos APARECEM. Sem este controle
//      positivo, um componente que quebrasse e renderizasse nada
//      passaria a metade de cima por vacuidade.
//
// A varredura le o que foi realmente montado (toJSON da arvore), nao
// o codigo-fonte: inclui texto visivel e tambem accessibilityLabel e
// placeholder, porque vazamento anunciado por leitor de tela vaza
// igual.
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  router: { push: mockPush, replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('@/lib/diario/saveDiario', () => ({
  saveDiario: jest.fn(),
}));

jest.mock('@/lib/eventos/saveEvento', () => ({
  saveEvento: jest.fn(),
}));

jest.mock('@/lib/eventos/localizacao', () => ({
  getBairroAtual: jest.fn(async () => null),
  getBairroAtualDetalhado: jest.fn(async () => ({
    ok: false,
    razao: 'sem_resultado',
  })),
}));

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    granted: false,
  })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/lib/scanner/text-recognition', () => ({
  extrairTexto: jest.fn(async () => ({ texto: '', confianca: 0 })),
}));

jest.mock('@/lib/scanner/saveNota', () => ({
  saveNota: jest.fn(),
  IMAGEM_PENDENTE: 'pendente',
}));

// O heatmap real leria o Vault; aqui so' precisamos que a tela monte.
jest.mock('@/lib/hooks/useHumorHeatmap', () => ({
  __esModule: true,
  useHumorHeatmap: () => ({ cache: null, loading: false, error: null }),
  filtrarCelulasPorPessoa: () => [],
}));

import { useState } from 'react';
import { SeletorPara } from '@/components/ui';
import { SeletorPessoaDestino } from '@/components/todo/SeletorPessoaDestino';
import { MenuLateral } from '@/components/chrome/MenuLateral';
import { MiniHumorScreen } from '@/components/screens/MiniHumorScreen';
import { FiltrosBar } from '@/components/calendario/FiltrosBar';
import { ScannerPreview } from '@/components/screens/ScannerPreview';
import { ToastProvider } from '@/components/ui';
import DiarioEmocional from '../../app/diario-emocional';
import Eventos from '../../app/eventos';
import type { Para } from '@/lib/schemas/para';
import type { TarefaPessoaDestino } from '@/lib/schemas/tarefa';
import { FILTROS_DEFAULT } from '@/lib/conquistas/filtros';
import type { TipoCompanhia } from '@/lib/schemas/companhia';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import { useNavegacao } from '@/lib/stores/navegacao';

// Nome improvavel de aparecer por acaso em copy: se ele surgir na
// arvore, veio mesmo do rotulo de pessoa_b.
const NOME_B = 'Zorvax';
const VAULT_ROOT = 'content://mock/Vault';

// Props textuais que chegam ao usuario por leitor de tela.
const PROPS_DE_TEXTO = [
  'accessibilityLabel',
  'accessibilityHint',
  'placeholder',
  'title',
] as const;

type NoRenderizado =
  | string
  | number
  | null
  | undefined
  | { props?: Record<string, unknown>; children?: unknown }
  | NoRenderizado[];

function coletarTextos(no: NoRenderizado, saida: string[]): void {
  if (no === null || no === undefined) return;
  if (typeof no === 'string') {
    saida.push(no);
    return;
  }
  if (typeof no === 'number') return;
  if (Array.isArray(no)) {
    for (const filho of no) coletarTextos(filho, saida);
    return;
  }
  const props = no.props ?? {};
  for (const chave of PROPS_DE_TEXTO) {
    const valor = props[chave];
    if (typeof valor === 'string') saida.push(valor);
  }
  coletarTextos(no.children as NoRenderizado, saida);
}

function textosRenderizados(
  arvore: ReturnType<ReturnType<typeof render>['toJSON']>
): string[] {
  const saida: string[] = [];
  coletarTextos(arvore as NoRenderizado, saida);
  return saida;
}

const PROIBIDO_EM_SOZINHO: ReadonlyArray<{ nome: string; padrao: RegExp }> = [
  { nome: 'casal', padrao: /casal/i },
  { nome: 'voces dois', padrao: /voc[eê]s dois/i },
  { nome: 'voces (plural)', padrao: /\bvoc[eê]s\b/i },
  { nome: 'rotulo de pessoa_b', padrao: new RegExp(NOME_B, 'i') },
  { nome: 'placeholder Nome_B', padrao: /Nome_B/i },
];

function esperarSemVazamento(textos: string[], superficie: string): void {
  for (const { nome, padrao } of PROIBIDO_EM_SOZINHO) {
    const achados = textos.filter((t) => padrao.test(t));
    if (achados.length > 0) {
      throw new Error(
        `${superficie}: vazamento de "${nome}" em modo sozinho -> ` +
          JSON.stringify(achados)
      );
    }
  }
}

function aplicarCompanhia(tipo: TipoCompanhia): void {
  useOnboarding.getState().setTipoCompanhia(tipo);
  usePessoa.getState().setNome('pessoa_b', NOME_B);
}

function ParaHarness() {
  const [value, setValue] = useState<Para>({ tipo: 'mim' });
  return <SeletorPara value={value} onChange={setValue} />;
}

function DestinoHarness() {
  const [value, setValue] = useState<TarefaPessoaDestino>({ tipo: 'mim' });
  return <SeletorPessoaDestino value={value} onChange={setValue} />;
}

// Cada superficie citada pela auditoria, montada de verdade.
const SUPERFICIES: ReadonlyArray<{
  nome: string;
  render: () => ReturnType<typeof render>;
}> = [
  { nome: 'SeletorPara', render: () => render(<ParaHarness />) },
  { nome: 'SeletorPessoaDestino', render: () => render(<DestinoHarness />) },
  {
    nome: 'MenuLateral',
    render: () => {
      useNavegacao.setState({ menuAberto: true });
      return render(<MenuLateral />);
    },
  },
  {
    nome: 'MiniHumorScreen',
    render: () => render(<MiniHumorScreen />),
  },
  {
    nome: 'FiltrosBar do Recap',
    render: () =>
      render(
        <FiltrosBar
          filtros={FILTROS_DEFAULT}
          onPessoa={() => {}}
          onMes={() => {}}
          onTipoMidia={() => {}}
          onIntensidade={() => {}}
          onBairro={() => {}}
        />
      ),
  },
  {
    nome: 'ScannerPreview',
    render: () =>
      render(
        <ToastProvider>
          <ScannerPreview />
        </ToastProvider>
      ),
  },
  {
    nome: 'Diario emocional',
    render: () =>
      render(
        <ToastProvider>
          <DiarioEmocional />
        </ToastProvider>
      ),
  },
  {
    nome: 'Eventos',
    render: () =>
      render(
        <ToastProvider>
          <Eventos />
        </ToastProvider>
      ),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  useVault.getState().setVaultRoot(VAULT_ROOT);
  useSettings.getState().resetar();
  useOnboarding.getState().resetar();
  usePessoa.getState().setPessoaAtiva('pessoa_a');
  useNavegacao.setState({ menuAberto: false });
});

afterEach(() => {
  useVault.getState().clearVaultRoot();
  usePessoa.getState().setNome('pessoa_b', 'Nome_B');
});

describe('modo sozinho nao vaza a superficie de casal', () => {
  for (const { nome, render: montar } of SUPERFICIES) {
    it(`${nome} nao renderiza casal, voces dois nem o nome de pessoa_b`, () => {
      aplicarCompanhia('sozinho');
      const tree = montar();
      esperarSemVazamento(textosRenderizados(tree.toJSON()), nome);
    });
  }
});

// Controle positivo. Sem ele a suite acima passaria com os componentes
// renderizando nada -- que e' justamente como uma regressao silenciosa
// se pareceria.
describe('controle positivo: em casal a superficie continua inteira', () => {
  it('SeletorPara oferece o parceiro e o destino do casal', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(<ParaHarness />);
    expect(getByLabelText(`chip Para ${NOME_B}`)).toBeTruthy();
    expect(getByLabelText('chip Para o casal')).toBeTruthy();
  });

  it('SeletorPessoaDestino oferece o parceiro e o destino do casal', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(<DestinoHarness />);
    expect(getByLabelText(`chip Para ${NOME_B}`)).toBeTruthy();
    expect(getByLabelText('chip Para o casal')).toBeTruthy();
  });

  it('Diario emocional oferece o chip da segunda pessoa', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(
      <ToastProvider>
        <DiarioEmocional />
      </ToastProvider>
    );
    expect(getByLabelText(`chip ${NOME_B}`)).toBeTruthy();
  });

  it('ScannerPreview oferece o seletor de pessoa', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(
      <ToastProvider>
        <ScannerPreview />
      </ToastProvider>
    );
    expect(getByLabelText(`chip ${NOME_B}`)).toBeTruthy();
  });

  it('FiltrosBar oferece o filtro por pessoa', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(
      <FiltrosBar
        filtros={FILTROS_DEFAULT}
        onPessoa={() => {}}
        onMes={() => {}}
        onTipoMidia={() => {}}
        onIntensidade={() => {}}
        onBairro={() => {}}
      />
    );
    expect(getByLabelText(`chip ${NOME_B}`)).toBeTruthy();
  });

  it('MiniHumorScreen oferece o chip da segunda pessoa', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(<MiniHumorScreen />);
    expect(getByLabelText(`chip ${NOME_B}`)).toBeTruthy();
  });

  it('Eventos oferece o chip da segunda pessoa', () => {
    aplicarCompanhia('casal');
    const { getByLabelText } = render(
      <ToastProvider>
        <Eventos />
      </ToastProvider>
    );
    expect(getByLabelText(`chip ${NOME_B}`)).toBeTruthy();
  });
});

// P3: entre amigos, o mesmo elemento existe com outro rotulo. Nada
// e' removido -- muda o texto que a pessoa le.
describe('modo amigos troca o rotulo, sem esconder nada', () => {
  it('SeletorPara diz "Para todos" e nao "Para o casal"', () => {
    aplicarCompanhia('amigos');
    const { getByLabelText, queryByLabelText } = render(<ParaHarness />);
    expect(getByLabelText('chip Para todos')).toBeTruthy();
    expect(queryByLabelText('chip Para o casal')).toBeNull();
    expect(getByLabelText(`chip Para ${NOME_B}`)).toBeTruthy();
  });

  it('SeletorPessoaDestino diz "Para todos" e nao "Para o casal"', () => {
    aplicarCompanhia('amigos');
    const { getByLabelText, queryByLabelText } = render(<DestinoHarness />);
    expect(getByLabelText('chip Para todos')).toBeTruthy();
    expect(queryByLabelText('chip Para o casal')).toBeNull();
  });

  it('o rodape de privacidade do diario nao diz "voces dois"', () => {
    aplicarCompanhia('amigos');
    const { getByLabelText } = render(
      <ToastProvider>
        <DiarioEmocional />
      </ToastProvider>
    );
    const rodape = getByLabelText('rodape privacidade');
    const textos = textosRenderizados(rodape as never);
    expect(textos.join(' ')).toContain('Ninguém vê além de vocês.');
  });
});
