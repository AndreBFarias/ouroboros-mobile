import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Trava a allowlist de classes que o RemoteViews aceita inflar.
//
// Layout de widget NAO e' inflado pelo app: quem infla e' o launcher, num
// processo alheio, atraves de RemoteViews. E o RemoteViews aplica um filtro
// no LayoutInflater que so' deixa passar classe anotada com @RemoteView:
//
//     private static final LayoutInflater.Filter INFLATER_FILTER =
//             (clazz) -> clazz.isAnnotationPresent(RemoteViews.RemoteView.class);
//
// `android.view.View` cru NAO tem a anotacao. Usa-lo — o idioma mais comum
// de divisor de 1dp em layout normal — faz o launcher levantar
//
//     InflateException: Class not allowed to be inflated android.view.View
//
// e desenhar "Nao e' possivel carregar o widget" no lugar da peca inteira.
//
// Medido em 2026-09-05 num Redmi Note 13 (HyperOS): os TRES layouts de
// widget do modulo usavam <View> como divisor e como espacador, e nenhum
// deles jamais inflou no aparelho. O defeito e' invisivel em tudo o que
// roda antes: compila, empacota, o provider entrega o RemoteViews sem
// excecao, e `dumpsys appwidget` mostra o binding saudavel. So o logcat do
// launcher acusa. Trocar por FrameLayout resolve — FrameLayout e' anotado e
// aceita background, layout_weight, margens e id do mesmo jeito.
//
// Comentarios sem acentuacao, como os demais testes de config nativa.

const DIR_LAYOUTS = join(
  __dirname,
  '../../modules/widget-homescreen/android/src/main/res/layout'
);

// Classes anotadas com @RemoteView no framework. A anotacao e' @Inherited,
// entao subclasse de classe anotada tambem passa (Button estende TextView),
// mas a lista aqui e' explicita de proposito: incluir uma classe nova deve
// ser decisao consciente de quem escreve o layout, nao efeito colateral.
const CLASSES_PERMITIDAS = new Set([
  // ViewGroups
  'AdapterViewFlipper',
  'FrameLayout',
  'GridLayout',
  'GridView',
  'LinearLayout',
  'ListView',
  'RelativeLayout',
  'StackView',
  'ViewFlipper',
  // Widgets
  'AnalogClock',
  'Button',
  'Chronometer',
  'ImageButton',
  'ImageView',
  'ProgressBar',
  'TextClock',
  'TextView',
  // Adicionados a partir da API 31
  'CheckBox',
  'RadioButton',
  'RadioGroup',
  'Switch',
]);

// So' os `widget_*.xml` viajam por RemoteViews. `activity_*.xml` e' inflado
// pelo proprio app, num LayoutInflater sem filtro, e pode usar EditText.
const arquivosDeWidget = readdirSync(DIR_LAYOUTS)
  .filter((nome) => nome.startsWith('widget_') && nome.endsWith('.xml'))
  .sort();

function tagsDe(caminho: string): string[] {
  const xml = readFileSync(caminho, 'utf8');
  const semComentarios = xml.replace(/<!--[\s\S]*?-->/g, '');
  const achadas = semComentarios.match(/<([A-Za-z][A-Za-z0-9_.]*)/g) ?? [];
  return achadas.map((t) => t.slice(1));
}

describe('layouts de widget — allowlist do RemoteViews', () => {
  it('existe pelo menos um layout de widget para vigiar', () => {
    // Guard contra o teste virar no-op se a pasta for movida ou renomeada.
    expect(arquivosDeWidget.length).toBeGreaterThan(0);
  });

  it.each(arquivosDeWidget)(
    '%s so usa classes que o RemoteViews infla',
    (nome) => {
      const proibidas = tagsDe(join(DIR_LAYOUTS, nome)).filter(
        (tag) => !CLASSES_PERMITIDAS.has(tag)
      );
      expect(proibidas).toEqual([]);
    }
  );

  it.each(arquivosDeWidget)(
    '%s nao usa <View> cru como divisor ou espacador',
    (nome) => {
      // Caso nomeado a parte porque e' o unico que ja aconteceu, e o que a
      // mensagem de erro precisa explicar sem obrigar a ler a allowlist.
      const tags = tagsDe(join(DIR_LAYOUTS, nome));
      expect(tags).not.toContain('View');
    }
  );
});
