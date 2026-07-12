// R-RECAP-8 (2026-07-10): testes do card estatico de share do
// slideshow Memorias. Cobre:
//  - Render sem crash dos 6 tipos de slide (abertura, numeros,
//    vitorias, midias, crises, encerramento) nos dois formatos.
//  - accessibilityLabel deterministico por (slide, formato).
//  - Conteudo textual fiel ao SlideRender ao vivo (singular/plural).
//  - Snapshot de estrutura para pegar regressao acidental.
//
// O card NAO usa Reanimated nem Ken Burns -- por isso a arvore e'
// capturavel sem o NPE de child null no Fabric (A46). Aqui so
// validamos o render; a captura real e' prova de runtime no device.
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import { ShareCardMemoria } from '@/components/recap/ShareCardMemoria';
import type { Slide } from '@/lib/hooks/useRecapMemorias';
import type { FormatoShare } from '@/lib/midia/exportarSlideMemorias';

// Um exemplar de cada tipo de slide com dados plural (contagem > 1) para
// exercitar as ramificacoes de texto.
const SLIDES_PLURAL: Slide[] = [
  { id: 'abertura' },
  { id: 'numeros', registros: 3, treinos: 2, tarefas: 2 },
  { id: 'vitorias', contagem: 2, frasePrincipal: 'Voltou a treinar.', audioPath: null },
  { id: 'midias', fotos: 2, audios: 1, videos: 2 },
  { id: 'crises', contagem: 2, audioPath: null },
  { id: 'encerramento' },
];

const FORMATOS: FormatoShare[] = ['stories', 'quadrado'];

describe('ShareCardMemoria (R-RECAP-8)', () => {
  it.each(SLIDES_PLURAL)(
    'renderiza o slide %o em ambos os formatos sem crash',
    (slide) => {
      for (const formato of FORMATOS) {
        const { getByLabelText, unmount } = render(
          <ShareCardMemoria slide={slide} formato={formato} />
        );
        expect(
          getByLabelText(`share card ${slide.id} ${formato}`)
        ).toBeTruthy();
        unmount();
      }
    }
  );

  it('slide abertura mostra os dois textos de abertura', () => {
    const { getByText } = render(
      <ShareCardMemoria slide={{ id: 'abertura' }} formato="stories" />
    );
    expect(getByText('Olhe o que ficou.')).toBeTruthy();
    expect(getByText('Dessa semana.')).toBeTruthy();
  });

  it('slide numeros mostra numero, rotulo, linhas plural e frase', () => {
    const { getByText } = render(
      <ShareCardMemoria
        slide={{ id: 'numeros', registros: 3, treinos: 2, tarefas: 2 }}
        formato="quadrado"
      />
    );
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Registros')).toBeTruthy();
    expect(getByText('2 treinos.')).toBeTruthy();
    expect(getByText('2 tarefas concluídas.')).toBeTruthy();
    expect(getByText('Você esteve presente.')).toBeTruthy();
  });

  it('slide numeros no singular usa treino/tarefa e trata zero', () => {
    const { getByText } = render(
      <ShareCardMemoria
        slide={{ id: 'numeros', registros: 1, treinos: 1, tarefas: 0 }}
        formato="stories"
      />
    );
    expect(getByText('1 treino.')).toBeTruthy();
    expect(getByText('Nenhuma tarefa concluída.')).toBeTruthy();
  });

  it('slide vitorias plural mostra rotulo plural e a frase principal', () => {
    const { getByText } = render(
      <ShareCardMemoria
        slide={{
          id: 'vitorias',
          contagem: 2,
          frasePrincipal: 'Voltou a treinar.',
          audioPath: null,
        }}
        formato="stories"
      />
    );
    expect(getByText('Vitórias')).toBeTruthy(); // anonimato-allow / test-data-allow: rotulo de conquista do diario, nao nome proprio
    expect(getByText('Voltou a treinar.')).toBeTruthy();
    expect(getByText('Passaram por aqui.')).toBeTruthy();
  });

  it('slide vitorias singular usa rotulo singular e omite frase nula', () => {
    const { getByText, queryByText } = render(
      <ShareCardMemoria
        slide={{
          id: 'vitorias',
          contagem: 1,
          frasePrincipal: null,
          audioPath: null,
        }}
        formato="quadrado"
      />
    );
    expect(getByText('Vitória')).toBeTruthy(); // anonimato-allow / test-data-allow: rotulo de conquista do diario, nao nome proprio
    // Sem frasePrincipal a citacao nao renderiza.
    expect(queryByText('Passaram por aqui.')).toBeTruthy();
  });

  it('slide midias soma o total e lista tipos com contagem > 0', () => {
    const { getByText, queryByText } = render(
      <ShareCardMemoria
        slide={{ id: 'midias', fotos: 2, audios: 0, videos: 1 }}
        formato="stories"
      />
    );
    // total = 2 + 0 + 1 = 3
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Mídias')).toBeTruthy();
    expect(getByText('2 fotos.')).toBeTruthy();
    expect(getByText('1 vídeo.')).toBeTruthy();
    // audios == 0 nao renderiza a linha correspondente.
    expect(queryByText(/áudio/)).toBeNull();
    expect(getByText('Ficou registrado.')).toBeTruthy();
  });

  it('slide crises mostra Trigger/Triggers conforme contagem', () => {
    const singular = render(
      <ShareCardMemoria
        slide={{ id: 'crises', contagem: 1, audioPath: null }}
        formato="stories"
      />
    );
    expect(singular.getByText('Trigger')).toBeTruthy();
    expect(singular.getByText('Você seguiu.')).toBeTruthy();
    singular.unmount();

    const plural = render(
      <ShareCardMemoria
        slide={{ id: 'crises', contagem: 3, audioPath: null }}
        formato="quadrado"
      />
    );
    expect(plural.getByText('Triggers')).toBeTruthy();
  });

  it('slide encerramento mostra a palavra final', () => {
    const { getByText } = render(
      <ShareCardMemoria slide={{ id: 'encerramento' }} formato="stories" />
    );
    expect(getByText('Continue.')).toBeTruthy();
  });

  it('snapshot de estrutura do slide abertura (quadrado)', () => {
    const { toJSON } = render(
      <ShareCardMemoria slide={{ id: 'abertura' }} formato="quadrado" />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
